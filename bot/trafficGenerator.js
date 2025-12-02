const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
puppeteer.use(StealthPlugin());
puppeteer.use(RecaptchaPlugin({
  provider: { id: '2captcha', token: process.env.TWO_CAPTCHA_TOKEN || 'YOUR_API_KEY' }
}));

const ProxyHandler = require('./proxyHandler');

// USER AGENTS TERBARU DARI MULTIPLE BROWSER
const MODERN_USER_AGENTS = {
    desktop: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0'
    ],
    mobile: [
        'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 14; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
    ]
};

class TrafficGenerator {
  constructor() {
    this.activeSessions = new Map();
    this.sessionLogs = new Map();
    this.proxyHandler = new ProxyHandler();
    this.autoRestartEnabled = true;
    this.botDetectionCount = 0;
    
    // Force initial proxy refresh
    this.proxyHandler.updateAllProxies().catch(console.error);
    
    this.KeywordAnalyzer = require('./keywordAnalyzer');
    this.BotHandler = require('./botHandler');
    this.botHandler = new this.BotHandler();
  }

  // ==================== BOT DETECTION HANDLER ====================
  async handleBotDetection(page, sessionId, context = 'unknown') {
    this.botDetectionCount++;
    this.log(sessionId, 'BOT_DETECTED', `Bot detected in ${context}. Count: ${this.botDetectionCount}`);
    
    // Gunakan bot handler
    const detectionCount = await this.botHandler.handleDetection(page, context);
    
    this.log(sessionId, 'BOT_HANDLED', `Bot detection handled. Total detections: ${detectionCount}`);
  }

  // ==================== LAUNCH BROWSER DENGAN PROXY ====================
  async launchBrowser(sessionId, config) {
    try {
      this.log(sessionId, 'BROWSER_LAUNCH', 'Launching browser with proxy...');
      
      // Dapatkan proxy untuk session
      const proxy = this.proxyHandler.getProxyForSession(sessionId, config.proxyType);
      const timeMultiplier = this.proxyHandler.getSessionTimeMultiplier(sessionId);
      
      // Setup args dengan proxy
      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        `--user-agent=${this.getRandomUserAgent(config.deviceType)}`,
        ...proxy.puppeteerArgs
      ];
      
      // Tambahkan extra stealth args
      const stealthArgs = [
        '--disable-webgl',
        '--disable-3d-apis',
        '--disable-reading-from-canvas',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio'
      ];
      
      args.push(...stealthArgs);
      
      const launchOptions = {
        headless: "new",
        args: args,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        ignoreHTTPSErrors: true,
        timeout: 180000, // 3 menit timeout
        defaultViewport: null
      };
      
      // Apply session time multiplier ke semua timeout
      config.timeMultiplier = timeMultiplier;
      
      const browser = await puppeteer.launch(launchOptions);
      
      // Setup bot detection handler
      const pages = await browser.pages();
      if (pages[0]) {
        await this.setupBotDetectionHandlers(pages[0], sessionId);
      }
      
      this.log(sessionId, 'BROWSER_LAUNCH_SUCCESS', 
        `Browser launched with ${proxy.type} proxy. Time multiplier: ${timeMultiplier}x`);
      return browser;
      
    } catch (error) {
      this.log(sessionId, 'BROWSER_LAUNCH_ERROR', `Browser launch failed: ${error.message}`);
      throw error;
    }
  }

  async setupBotDetectionHandlers(page, sessionId) {
    // Intercept requests untuk deteksi bot
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      // Block resource tertentu yang digunakan untuk bot detection
      const blockedResources = [
        'google-analytics.com',
        'googletagmanager.com',
        'doubleclick.net',
        'fingerprintjs',
        'botd',
        'datadome',
        'cloudflare',
        'recaptcha',
        'hcaptcha'
      ];
      
      const url = request.url();
      const shouldBlock = blockedResources.some(resource => url.includes(resource));
      
      if (shouldBlock) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Evaluate script untuk bypass detection
    await page.evaluateOnNewDocument(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'id'],
      });
      
      // Override chrome runtime
      window.chrome = {
        runtime: {},
      };
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
  }

  // ==================== SETUP PAGE DENGAN TIME MULTIPLIER ====================
  async setupPage(page, sessionId, config) {
    const timeMultiplier = config.timeMultiplier || 1.0;
    
    // Apply time multiplier ke semua timeout
    await page.setDefaultTimeout(30000 * timeMultiplier);
    await page.setDefaultNavigationTimeout(45000 * timeMultiplier);
    
    const userAgent = this.getRandomUserAgent(config.deviceType);
    await page.setUserAgent(userAgent);
    
    await page.setViewport({ 
      width: config.deviceType === 'mobile' ? 375 : 1280, 
      height: config.deviceType === 'mobile' ? 667 : 720 
    });
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-CH-UA': '"Google Chrome";v="121", "Chromium";v="121", "Not=A?Brand";v="99"',
      'Sec-CH-UA-Mobile': config.deviceType === 'mobile' ? '?1' : '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Add console listener untuk deteksi
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('bot') || text.includes('captcha') || text.includes('block')) {
        this.handleBotDetection(page, sessionId, 'console');
      }
    });
    
    page.on('error', (error) => {
      this.log(sessionId, 'PAGE_ERROR', `Page error: ${error.message}`);
    });
  }

  // ==================== ORGANIC SEARCH DENGAN BOT HANDLING ====================
  async performSearch(page, sessionId, keyword, searchEngine) {
    const session = this.activeSessions.get(sessionId);
    const timeMultiplier = session?.config?.timeMultiplier || 1.0;
    
    try {
      const searchUrl = searchEngine === 'google' 
        ? `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=us&hl=en`
        : `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&cc=us`;
      
      this.log(sessionId, 'SEARCH_NAVIGATE', 
        `Navigating to ${searchEngine}: "${keyword}" (Time multiplier: ${timeMultiplier}x)`);
      
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle0',
        timeout: 45000 * timeMultiplier 
      });
      
      // Cek halaman untuk deteksi bot
      const pageContent = await page.content();
      if (pageContent.includes('captcha') || pageContent.includes('robot') || 
          pageContent.includes('unusual traffic')) {
        await this.handleBotDetection(page, sessionId, 'search_page');
        await page.waitForTimeout(5000 * timeMultiplier);
        await page.reload({ waitUntil: 'networkidle0' });
      }
      
      // Human-like delay dengan multiplier
      await page.waitForTimeout((3000 + Math.random() * 4000) * timeMultiplier);
      
      // Scroll dengan variasi
      await this.humanLikeScroll(page, sessionId, timeMultiplier);
      
      // Random reading time
      await page.waitForTimeout((2000 + Math.random() * 3000) * timeMultiplier);
      
      this.log(sessionId, 'SEARCH_COMPLETE', 
        `Search completed on ${searchEngine} with ${timeMultiplier}x time multiplier`);
      
    } catch (error) {
      this.log(sessionId, 'SEARCH_ERROR', `Search failed: ${error.message}`);
      
      if (error.message.includes('Timeout') || error.message.includes('navigation')) {
        await this.handleBotDetection(page, sessionId, 'search_timeout');
      }
      
      throw error;
    }
  }

  // ==================== HUMAN-LIKE SCROLL DENGAN MULTIPLIER ====================
  async humanLikeScroll(page, sessionId, timeMultiplier = 1.0) {
    try {
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const maxScroll = pageHeight - viewportHeight;

      if (maxScroll <= 0) return;

      const scrollPattern = [0.1, 0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.8, 0.2];
      
      for (const ratio of scrollPattern) {
        const scrollTo = Math.floor(ratio * maxScroll);
        
        await page.evaluate((scrollPos) => {
          window.scrollTo({
            top: scrollPos,
            behavior: 'smooth'
          });
        }, scrollTo);
        
        // Apply time multiplier pada delay
        const pauseTime = (800 + Math.random() * 2200) * timeMultiplier;
        await page.waitForTimeout(pauseTime);
        
        // Occasionally scroll back
        if (Math.random() < 0.3) {
          const backScroll = Math.max(0, scrollTo - 100);
          await page.evaluate((scrollPos) => {
            window.scrollTo({
              top: scrollPos,
              behavior: 'smooth'
            });
          }, backScroll);
          
          await page.waitForTimeout((500 + Math.random() * 1000) * timeMultiplier);
        }
        
        // Random mouse movement
        if (Math.random() < 0.4) {
          await page.mouse.move(
            Math.random() * 500,
            Math.random() * 300,
            { steps: 10 + Math.random() * 20 }
          );
        }
      }
    } catch (error) {
      this.log(sessionId, 'SCROLL_ERROR', `Scroll simulation error: ${error.message}`);
    }
  }

  // ==================== EXTENDED ACTIVITIES DENGAN MULTIPLIER ====================
  async performExtendedActivities(page, sessionId, config) {
    const timeMultiplier = config.timeMultiplier || 1.0;
    
    this.log(sessionId, 'EXTENDED_ACTIVITIES', 
      `Starting extended activities (Time multiplier: ${timeMultiplier}x)`);
    
    const activities = [
      {
        name: 'DEEP_SCROLL',
        action: async () => await this.humanLikeScroll(page, sessionId, timeMultiplier),
        baseTime: 30000
      },
      {
        name: 'CONTENT_READING',
        action: async () => await this.simulateRealisticReading(page, sessionId, config.deviceType, timeMultiplier),
        baseTime: 45000
      },
      {
        name: 'INTERNAL_NAVIGATION',
        action: async () => {
          if (config.enableSubUrl) {
            await this.exploreRelatedLinks(page, sessionId, timeMultiplier);
          }
        },
        baseTime: 35000
      },
      {
        name: 'INTERACTION_SIMULATION',
        action: async () => {
          await this.simulateTextSelection(page, sessionId);
          await this.performMicroInteractions(page, sessionId);
          if (config.deviceType === 'mobile') {
            await this.simulateTouchInteractions(page, sessionId);
          } else {
            await this.simulateMouseMovements(page, sessionId, config.deviceType);
          }
        },
        baseTime: 25000
      }
    ];
    
    // Pilih 2-4 aktivitas secara acak
    const selectedActivities = activities
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 3));
    
    for (const activity of selectedActivities) {
      if (!this.isSessionActive(sessionId)) break;
      
      try {
        const session = this.activeSessions.get(sessionId);
        session.currentStep = activity.name;
        this.activeSessions.set(sessionId, session);
        
        // Apply time multiplier
        const activityTime = activity.baseTime * timeMultiplier;
        
        await Promise.race([
          activity.action(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Activity ${activity.name} timeout`)), activityTime)
          )
        ]);
        
        this.log(sessionId, `${activity.name}_COMPLETE`, 
          `Extended activity completed (${Math.round(activityTime/1000)}s)`);
        
        // Random delay antar aktivitas
        await page.waitForTimeout((2000 + Math.random() * 4000) * timeMultiplier);
        
      } catch (error) {
        this.log(sessionId, `${activity.name}_ERROR`, `Activity error: ${error.message}`);
      }
    }
  }

  // ==================== UTILITY METHODS ====================
  getRandomUserAgent(deviceType) {
    const agents = MODERN_USER_AGENTS[deviceType] || MODERN_USER_AGENTS.desktop;
    return agents[Math.floor(Math.random() * agents.length)];
  }

  // [Method-method lain tetap sama dengan penambahan timeMultiplier di delay]
  
  async simulateRealisticReading(page, sessionId, deviceType, timeMultiplier = 1.0) {
    try {
      const totalDuration = (30000 + Math.random() * 30000) * timeMultiplier;
      const startTime = Date.now();
      
      while (Date.now() - startTime < totalDuration) {
        const scrollAmount = 100 + Math.random() * 200;
        await page.evaluate((amount) => {
          window.scrollBy({ top: amount, behavior: 'smooth' });
        }, scrollAmount);
        
        const pauseTime = (1000 + Math.random() * 3000) * timeMultiplier;
        await page.waitForTimeout(pauseTime);
        
        if (Math.random() < 0.2) {
          await page.mouse.move(
            Math.random() * 500,
            Math.random() * 300,
            { steps: 5 + Math.random() * 10 }
          );
        }
      }
    } catch (error) {
      this.log(sessionId, 'READING_ERROR', `Reading simulation error: ${error.message}`);
    }
  }

  // [Method lainnya tetap dengan penambahan timeMultiplier]

  // ==================== PURE ORGANIC SESSION ====================
  async startOrganicSession(config) {
    const sessionId = `organic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.log(sessionId, 'ORGANIC_INIT', 'Starting PURE organic session (NO DIRECT TRAFFIC)');
    
    // Validate config
    if (!config.searchEngine) {
      config.searchEngine = Math.random() > 0.5 ? 'google' : 'bing';
    }
    
    if (!config.proxyType) {
      throw new Error('Proxy type is REQUIRED for organic traffic');
    }

    try {
      // Setup proxy untuk session
      const proxy = this.proxyHandler.getProxyForSession(sessionId, config.proxyType);
      config.selectedProxy = proxy;
      config.timeMultiplier = this.proxyHandler.getSessionTimeMultiplier(sessionId);
      
    } catch (proxyError) {
      this.log(sessionId, 'PROXY_SETUP_FAILED', `Proxy setup failed: ${proxyError.message}`);
      throw proxyError;
    }

    this.sessionLogs.set(sessionId, []);
    this.activeSessions.set(sessionId, {
      id: sessionId,
      config: config,
      status: 'running',
      startTime: new Date(),
      currentStep: 0,
      isAutoLoop: config.isAutoLoop || false,
      isOrganic: true,
      restartCount: 0,
      maxRestarts: config.maxRestarts || 3,
      userAgent: this.getRandomUserAgent(config.deviceType),
      proxyInfo: config.selectedProxy || null,
      retryCount: 0,
      searchEngine: config.searchEngine,
      keywords: [],
      timeMultiplier: config.timeMultiplier
    });

    this.log(sessionId, 'ORGANIC_STARTED', 
      `Pure organic session started | Device: ${config.deviceType} | Proxy: ${config.proxyType} | Search: ${config.searchEngine} | Time Multiplier: ${config.timeMultiplier}x`
    );
    
    // Execute organic flow
    this.executePureOrganicFlow(sessionId, config).catch(error => {
      this.log(sessionId, 'ORGANIC_ERROR', `Organic flow failed: ${error.message}`);
      this.stopSession(sessionId);
    });

    return sessionId;
  }

  // ==================== PURE ORGANIC FLOW ====================
  async executePureOrganicFlow(sessionId, config) {
    let browser = null;
    let page = null;
    
    try {
      // Step 1: Launch Browser
      browser = await this.launchBrowser(sessionId, config);
      page = await browser.newPage();
      await this.setupPage(page, sessionId, config);

      // Step 2: Keyword Analysis
      this.log(sessionId, 'KEYWORD_ANALYSIS', 'Analyzing target for keywords...');
      const analyzer = new this.KeywordAnalyzer();
      const analysis = await analyzer.analyze(config.targetUrl);
      
      if (!analysis.success || analysis.keywords.length === 0) {
        throw new Error('No keywords found for organic traffic');
      }
      
      const keywords = analysis.keywords.slice(0, config.maxKeywords || 5);
      this.log(sessionId, 'KEYWORDS_READY', 
        `Using ${keywords.length} keywords: ${keywords.join(', ')}`
      );

      // Update session dengan keywords
      const session = this.activeSessions.get(sessionId);
      session.keywords = keywords;
      this.activeSessions.set(sessionId, session);

      // Step 3: Organic Search Loop
      for (let i = 0; i < keywords.length; i++) {
        if (!this.isSessionActive(sessionId)) break;
        
        const keyword = keywords[i];
        this.log(sessionId, 'KEYWORD_START', 
          `[${i+1}/${keywords.length}] Searching: "${keyword}" via ${config.searchEngine}`
        );

        // Step 3A: Search via Search Engine
        await this.performSearch(page, sessionId, keyword, config.searchEngine);
        
        // Step 3B: Click target from search results
        const targetClicked = await this.clickTargetFromSearch(page, sessionId, config.targetUrl);
        
        if (targetClicked) {
          // Step 3C: Extended Activities on target
          await this.performExtendedActivities(page, sessionId, config);
          
          // Step 3D: Return to search engine for next keyword
          if (i < keywords.length - 1) {
            this.log(sessionId, 'RETURN_TO_SEARCH', 'Returning to search engine...');
            await page.goBack();
            await page.waitForTimeout((3000 + Math.random() * 3000) * config.timeMultiplier);
            
            // Occasionally switch search engine for variety
            if (Math.random() < 0.3) {
              config.searchEngine = config.searchEngine === 'google' ? 'bing' : 'google';
              this.log(sessionId, 'SWITCH_SEARCH', `Switched to ${config.searchEngine}`);
            }
          }
        } else {
          this.log(sessionId, 'TARGET_MISSED', `Target not found for: "${keyword}"`);
        }
        
        // Delay between keywords
        if (i < keywords.length - 1) {
          await page.waitForTimeout((8000 + Math.random() * 7000) * config.timeMultiplier);
        }
      }

      this.log(sessionId, 'ORGANIC_COMPLETE', 
        `Completed ${keywords.length} organic searches via ${config.searchEngine}`
      );

    } catch (error) {
      this.log(sessionId, 'ORGANIC_FLOW_ERROR', `Organic flow error: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
          this.log(sessionId, 'BROWSER_CLOSED', 'Browser closed');
        } catch (closeError) {
          this.log(sessionId, 'BROWSER_CLOSE_ERROR', `Error closing browser: ${closeError.message}`);
        }
      }
    }
  }

  // ==================== SESSION MANAGEMENT ====================
  isSessionActive(sessionId) {
    const session = this.activeSessions.get(sessionId);
    return session && session.status === 'running';
  }

  log(sessionId, step, message) {
    const timestamp = new Date().toLocaleString('id-ID');
    const logEntry = { timestamp, step, message };
    
    if (this.sessionLogs.has(sessionId)) {
      const logs = this.sessionLogs.get(sessionId);
      logs.push(logEntry);
      if (logs.length > 500) {
        logs.splice(0, 100);
      }
    }
    
    console.log(`[${sessionId}] ${step}: ${message}`);
  }

  stopSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.status = 'stopped';
      session.endTime = new Date();
      this.log(sessionId, 'SESSION_STOPPED', 'Session stopped');
    }
  }

  getSessionLogs(sessionId) {
    return this.sessionLogs.get(sessionId) || [];
  }

  getAllSessions() {
    const sessions = [];
    for (const [sessionId, session] of this.activeSessions) {
      sessions.push({
        id: sessionId,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        currentStep: session.currentStep,
        config: session.config,
        isAutoLoop: session.isAutoLoop,
        isOrganic: session.isOrganic,
        restartCount: session.restartCount,
        userAgent: session.userAgent,
        proxyInfo: session.proxyInfo,
        searchEngine: session.searchEngine,
        keywords: session.keywords || [],
        timeMultiplier: session.timeMultiplier || 1.0
      });
    }
    return sessions;
  }

  stopAllSessions() {
    for (const [sessionId] of this.activeSessions) {
      this.stopSession(sessionId);
    }
    this.log('SYSTEM', 'ALL_SESSIONS_STOPPED', 'All sessions stopped');
  }

  clearAllSessions() {
    this.activeSessions.clear();
    this.sessionLogs.clear();
    this.log('SYSTEM', 'ALL_SESSIONS_CLEARED', 'All sessions and logs cleared');
  }

  // [Method lainnya dari file asli yang tidak disebutkan di sini tetap ada]
}

module.exports = TrafficGenerator;