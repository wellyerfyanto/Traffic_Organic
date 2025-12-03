const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

// Apply plugins
puppeteer.use(StealthPlugin());
puppeteer.use(RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: process.env.TWO_CAPTCHA_TOKEN || 'YOUR_API_KEY'
  },
  visualFeedback: true
}));
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Enhanced User Agents Database
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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
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
        'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; 2201116SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
    ]
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 10000,
  maxDelay: 60000,
  factor: 2
};

class TrafficGenerator {
    constructor() {
    this.activeSessions = new Map();
    this.sessionLogs = new Map();
    this.proxyHandler = new (require('./proxyHandler'))();
    this.botHandler = new (require('./botHandler'))();
    this.autoRestartEnabled = true;
    this.botDetectionCount = 0;
    this.totalSessions = 0;
    this.successfulSessions = 0;
    
    // TAMBAHKAN INI: Initialize proxy system
    setTimeout(() => {
      if (this.proxyHandler.initialize) {
        this.proxyHandler.initialize().then(() => {
          console.log('✅ TrafficGenerator: Proxy system initialized with VPN');
        }).catch(err => {
          console.error('❌ TrafficGenerator: Proxy init error:', err.message);
        });
      }
    }, 2000);
    
    this.KeywordAnalyzer = require('./keywordAnalyzer');
    
    console.log('✅ TrafficGenerator initialized with VPN support');
  }

  // ==================== PURE ORGANIC SESSION ====================
  async startOrganicSession(config) {
    const sessionId = `organic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.log(sessionId, 'ORGANIC_INIT', 'Starting PURE organic session (NO DIRECT TRAFFIC)');
    this.totalSessions++;
    
    // Validate config
    if (!config.searchEngine) {
      config.searchEngine = Math.random() > 0.5 ? 'google' : 'bing';
    }
    
    if (!config.proxyType) {
      config.proxyType = 'fresh';
    }

    try {
      await this.setupAndTestProxiesForSession(sessionId, config);
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
      botDetectionCount: 0,
      timeMultiplier: this.getSessionTimeMultiplier(sessionId)
    });

    this.log(sessionId, 'ORGANIC_STARTED', 
      `Pure organic session started | Device: ${config.deviceType} | Proxy: ${config.proxyType} | Search: ${config.searchEngine} | Time Multiplier: ${this.activeSessions.get(sessionId).timeMultiplier}x`
    );
    
    // Execute organic flow in background
    this.executePureOrganicFlow(sessionId, config).then(() => {
      this.successfulSessions++;
      this.log(sessionId, 'ORGANIC_COMPLETED', 'Session completed successfully');
    }).catch(error => {
      this.log(sessionId, 'ORGANIC_ERROR', `Organic flow failed: ${error.message}`);
      this.stopSession(sessionId);
    });

    return sessionId;
  }

  // ==================== PURE ORGANIC FLOW ====================
  async executePureOrganicFlow(sessionId, config) {
    let browser = null;
    let page = null;
    const session = this.activeSessions.get(sessionId);
    const timeMultiplier = session.timeMultiplier || 1.0;
    
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

      // Update session with keywords
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
        await this.performSearch(page, sessionId, keyword, config.searchEngine, timeMultiplier);
        
        // Step 3B: Click target from search results
        const targetClicked = await this.clickTargetFromSearch(page, sessionId, config.targetUrl, timeMultiplier);
        
        if (targetClicked) {
          // Step 3C: Extended Activities on target
          await this.performExtendedActivities(page, sessionId, config, timeMultiplier);
          
          // Step 3D: Return to search engine for next keyword
          if (i < keywords.length - 1) {
            this.log(sessionId, 'RETURN_TO_SEARCH', 'Returning to search engine...');
            await page.goBack();
            await page.waitForTimeout((3000 + Math.random() * 3000) * timeMultiplier);
            
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
          await page.waitForTimeout((8000 + Math.random() * 7000) * timeMultiplier);
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
      this.stopSession(sessionId);
    }
  }

  // ==================== CORE METHODS ====================
  async launchBrowser(sessionId, config) {
    try {
      this.log(sessionId, 'BROWSER_LAUNCH', 'Launching browser...');
      
      // Gunakan system Chrome yang sudah diinstall
      const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
      
      // Dapatkan proxy untuk session
      const proxy = this.proxyHandler.getProxyForSession(sessionId, config.proxyType);
      const proxyArgs = this.proxyHandler.getPuppeteerProxyArgs(proxy);
      
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
        '--disable-software-rasterizer',
        '--disable-logging',
        '--disable-default-apps',
        '--disable-translate',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        `--user-agent=${this.getRandomUserAgent(config.deviceType)}`,
        ...proxyArgs
      ];

      const launchOptions = {
        headless: "new",
        args: args,
        executablePath: chromePath,
        ignoreHTTPSErrors: true,
        timeout: 180000,
        defaultViewport: null
      };

      this.log(sessionId, 'CHROME_PATH', `Using Chrome at: ${chromePath}`);
      
      const browser = await puppeteer.launch(launchOptions);
      this.log(sessionId, 'BROWSER_LAUNCH_SUCCESS', 'Browser launched with proxy');
      return browser;
      
    } catch (error) {
      this.log(sessionId, 'BROWSER_LAUNCH_ERROR', `Browser launch failed: ${error.message}`);
      
      // Fallback: try without proxy
      if (config.proxyType !== 'none') {
        this.log(sessionId, 'RETRY_NO_PROXY', 'Retrying browser launch without proxy...');
        config.proxyType = 'none';
        return this.launchBrowser(sessionId, config);
      }
      
      throw error;
    }
  }

  async setupPage(page, sessionId, config) {
    const timeMultiplier = this.activeSessions.get(sessionId).timeMultiplier || 1.0;
    
    // Apply time multiplier to timeouts
    await page.setDefaultTimeout(30000 * timeMultiplier);
    await page.setDefaultNavigationTimeout(45000 * timeMultiplier);
    
    const userAgent = this.getRandomUserAgent(config.deviceType);
    await page.setUserAgent(userAgent);
    
    await page.setViewport({ 
      width: config.deviceType === 'mobile' ? 375 : 1280, 
      height: config.deviceType === 'mobile' ? 667 : 720 
    });

    // Set extra headers untuk terlihat lebih manusiawi
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

    // Setup bot detection handlers
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const blockedResources = [
        'google-analytics.com',
        'googletagmanager.com',
        'doubleclick.net',
        'fingerprintjs',
        'botd',
        'datadome',
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
    
    // Evaluasi script untuk bypass detection
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
      
      // Override permission query
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: (parameters) => {
            return Promise.resolve({ state: 'granted' });
          }
        }
      });
    });

    // Add console listener untuk deteksi bot
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('bot') || text.includes('captcha') || text.includes('block')) {
        this.handleBotDetection(page, sessionId, 'console');
      }
    });
    
    page.on('error', (error) => {
      this.log(sessionId, 'PAGE_ERROR', `Page error: ${error.message}`);
    });
    
    page.on('pageerror', (error) => {
      this.log(sessionId, 'PAGE_CONSOLE_ERROR', `Console error: ${error.message}`);
    });
    
    this.log(sessionId, 'PAGE_SETUP_COMPLETE', 'Page setup completed with bot detection');
  }

  // ==================== ORGANIC SEARCH METHODS ====================
  async performSearch(page, sessionId, keyword, searchEngine, timeMultiplier = 1.0) {
    try {
      const searchUrl = searchEngine === 'google' 
        ? `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=us&hl=en`
        : `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&cc=us`;
      
      this.log(sessionId, 'SEARCH_NAVIGATE', 
        `Navigating to ${searchEngine}: "${keyword}" (Time multiplier: ${timeMultiplier}x)`);
      
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
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

  async clickTargetFromSearch(page, sessionId, targetUrl, timeMultiplier = 1.0) {
    try {
      const targetDomain = new URL(targetUrl).hostname.replace('www.', '');
      const targetPath = new URL(targetUrl).pathname;
      
      // Tunggu hasil pencarian load
      await page.waitForSelector('a', { timeout: 10000 * timeMultiplier });
      
      // Get all links from search results
      const searchLinks = await page.$$eval('a', anchors => 
        anchors
          .filter(a => a.href && a.textContent.trim().length > 5)
          .map(a => ({
            href: a.href,
            text: a.textContent.trim().substring(0, 100),
            isGoogle: a.href.includes('google.com') || a.href.includes('bing.com'),
            isAd: a.parentElement.className.includes('ad') || 
                  a.parentElement.id.includes('ad') ||
                  a.textContent.includes('Ad') ||
                  a.href.includes('doubleclick')
          }))
      );
      
      // Filter: Avoid internal links and ads
      const organicLinks = searchLinks.filter(link => 
        !link.isGoogle && 
        !link.isAd &&
        link.href.includes('http')
      );
      
      // Priority 1: Links to target domain
      const targetLinks = organicLinks.filter(link => 
        link.href.includes(targetDomain) ||
        (targetPath.length > 1 && link.text.toLowerCase().includes(
          targetPath.split('/').pop().replace(/-/g, ' ').substring(0, 20)
        ))
      );
      
      // Priority 2: Relevant links (competitors)
      const relevantLinks = organicLinks.filter(link => 
        !link.href.includes(targetDomain) &&
        link.text.length > 10
      );
      
      let linkToClick = null;
      
      if (targetLinks.length > 0) {
        linkToClick = targetLinks[Math.floor(Math.random() * targetLinks.length)];
        this.log(sessionId, 'TARGET_FOUND', `Found direct target link: ${linkToClick.text.substring(0, 30)}`);
      } else if (relevantLinks.length > 0 && Math.random() < 0.7) {
        linkToClick = relevantLinks[Math.floor(Math.random() * relevantLinks.length)];
        this.log(sessionId, 'COMPETITOR_CLICK', `Clicking competitor link: ${linkToClick.text.substring(0, 30)}`);
      } else {
        this.log(sessionId, 'NO_LINKS_FOUND', 'No suitable links found in search results');
        return false;
      }
      
      // Scroll to link dengan smooth behavior
      await page.evaluate((href) => {
        const link = document.querySelector(`a[href="${href}"]`);
        if (link) {
          link.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, linkToClick.href);
      
      await page.waitForTimeout((1000 + Math.random() * 2000) * timeMultiplier);
      
      // Click link dengan delay human-like
      await page.click(`a[href="${linkToClick.href}"]`);
      await page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 * timeMultiplier 
      }).catch(() => {
        this.log(sessionId, 'NAVIGATION_TIMEOUT', 'Navigation timeout, continuing...');
      });
      
      this.log(sessionId, 'LINK_CLICKED', 
        `Clicked: "${linkToClick.text.substring(0, 50)}..."`
      );
      
      // Tunggu page load
      await page.waitForTimeout((2000 + Math.random() * 3000) * timeMultiplier);
      
      return true;
      
    } catch (error) {
      this.log(sessionId, 'CLICK_ERROR', `Error clicking link: ${error.message}`);
      return false;
    }
  }

  async performExtendedActivities(page, sessionId, config, timeMultiplier = 1.0) {
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
      },
      {
        name: 'MULTI_PAGE_VISIT',
        action: async () => await this.clickMultiplePostLinks(page, sessionId, timeMultiplier),
        baseTime: 50000
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

  // ==================== ACTIVITY SIMULATION METHODS ====================
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
      
      this.log(sessionId, 'READING_COMPLETE', `Finished reading simulation (${Math.round(totalDuration/1000)}s)`);
    } catch (error) {
      this.log(sessionId, 'READING_ERROR', `Reading simulation error: ${error.message}`);
    }
  }

  async exploreRelatedLinks(page, sessionId, timeMultiplier = 1.0) {
    try {
      const relatedLinks = await page.$$eval('a', anchors => 
        anchors
          .filter(a => {
            const href = a.href;
            const text = a.textContent.trim();
            return href && 
                   !href.includes('#') && 
                   !href.startsWith('javascript:') &&
                   !href.includes('mailto:') &&
                   !href.includes('tel:') &&
                   href !== window.location.href &&
                   text.length > 5 &&
                   (href.includes('/blog/') || 
                    href.includes('/article/') || 
                    href.includes('/post/') ||
                    text.toLowerCase().includes('baca') ||
                    text.toLowerCase().includes('selengkapnya') ||
                    text.toLowerCase().includes('read more'));
          })
          .map(a => ({ 
            href: a.href, 
            text: a.textContent.trim().substring(0, 50) 
          }))
      );
      
      if (relatedLinks.length > 0) {
        const linksToExplore = relatedLinks
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(2, relatedLinks.length));
        
        for (const link of linksToExplore) {
          this.log(sessionId, 'EXPLORING_SUBURL', `Opening: ${link.text}...`);
          
          await page.evaluate((href) => {
            const linkElement = document.querySelector(`a[href="${href}"]`);
            if (linkElement) {
              linkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, link.href);
          
          await page.waitForTimeout(1000 * timeMultiplier);
          await page.click(`a[href="${link.href}"]`);
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 * timeMultiplier });
          
          await this.humanLikeScroll(page, sessionId, timeMultiplier);
          await page.waitForTimeout(5000 * timeMultiplier);
          
          await page.goBack();
          await page.waitForTimeout(3000 * timeMultiplier);
        }
      }
    } catch (error) {
      this.log(sessionId, 'EXPLORE_ERROR', `Error exploring links: ${error.message}`);
    }
  }

  async clickMultiplePostLinks(page, sessionId, timeMultiplier = 1.0) {
    try {
      const postLinks = await page.$$eval('a[href]', anchors => 
        anchors
          .filter(a => {
            const href = a.href;
            const text = a.textContent.trim();
            return href && 
                   !href.includes('#') && 
                   !href.startsWith('javascript:') &&
                   !href.includes('mailto:') &&
                   !href.includes('tel:') &&
                   href !== window.location.href &&
                   text.length > 5 &&
                   a.offsetWidth > 0 &&
                   a.offsetHeight > 0 &&
                   (href.includes('/p/') || 
                    href.includes('/post/') || 
                    href.includes('/article/') ||
                    href.includes('/blog/') ||
                    text.length > 10);
          })
          .map(a => ({ 
            href: a.href, 
            text: a.textContent.trim().substring(0, 30) 
          }))
      );

      if (postLinks.length > 0) {
        const linksToOpen = postLinks
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(3, postLinks.length));

        this.log(sessionId, 'POST_LINKS_FOUND', 
          `Found ${postLinks.length} posts, opening ${linksToOpen.length}`);

        for (let i = 0; i < linksToOpen.length; i++) {
          const link = linksToOpen[i];
          this.log(sessionId, 'OPENING_POST', 
            `Opening post ${i+1}/${linksToOpen.length}: ${link.text}`);

          await page.evaluate((href) => {
            const linkElement = document.querySelector(`a[href="${href}"]`);
            if (linkElement) {
              linkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => {
                linkElement.click();
              }, 1000);
            }
          }, link.href);

          await page.waitForTimeout(8000 * timeMultiplier);
          await this.humanLikeScroll(page, sessionId, timeMultiplier);
          await page.waitForTimeout(5000 * timeMultiplier);

          if (i < linksToOpen.length - 1) {
            await page.goBack();
            await page.waitForTimeout(5000 * timeMultiplier);
          }
        }

        this.log(sessionId, 'POSTS_COMPLETE', 
          `Successfully opened ${linksToOpen.length} posts`);
        return true;
      }
      return false;
    } catch (error) {
      this.log(sessionId, 'POSTS_ERROR', `Error with posts: ${error.message}`);
      return false;
    }
  }

  async simulateMouseMovements(page, sessionId, deviceType) {
    if (deviceType !== 'desktop') return;
    
    try {
      const viewport = await page.viewport();
      const movements = [
        { x: 100, y: 200 },
        { x: 300, y: 150 },
        { x: 500, y: 300 },
        { x: 700, y: 250 },
        { x: 900, y: 350 }
      ];
      
      for (const movement of movements) {
        if (movement.x > viewport.width || movement.y > viewport.height) continue;
        
        await page.mouse.move(movement.x, movement.y, { steps: 10 + Math.random() * 20 });
        await page.waitForTimeout(300 + Math.random() * 700);
        
        if (Math.random() < 0.2) {
          await page.mouse.click(movement.x, movement.y, { delay: 100 });
          await page.waitForTimeout(800 + Math.random() * 1200);
        }
      }
    } catch (error) {
      this.log(sessionId, 'MOUSE_ERROR', `Mouse simulation error: ${error.message}`);
    }
  }

  async simulateTouchInteractions(page, sessionId) {
    try {
      const viewport = await page.viewport();
      const tapX = Math.random() * (viewport.width - 100) + 50;
      const tapY = Math.random() * (viewport.height - 100) + 50;
      
      await page.touchscreen.tap(tapX, tapY);
      await page.waitForTimeout(1000);
      
      await page.touchscreen.touchStart(tapX, tapY);
      await page.waitForTimeout(100);
      await page.touchscreen.touchMove(tapX + 100, tapY);
      await page.waitForTimeout(100);
      await page.touchscreen.touchEnd();
      
      this.log(sessionId, 'TOUCH_SIMULATED', 'Touch interactions simulated');
    } catch (error) {
      this.log(sessionId, 'TOUCH_ERROR', `Touch simulation error: ${error.message}`);
    }
  }

  async simulateTextSelection(page, sessionId) {
    try {
      const hasText = await page.evaluate(() => {
        const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span');
        return paragraphs.length > 0;
      });
      
      if (hasText && Math.random() < 0.4) {
        await page.evaluate(() => {
          const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span');
          if (paragraphs.length > 0) {
            const randomPara = paragraphs[Math.floor(Math.random() * paragraphs.length)];
            const range = document.createRange();
            range.selectNodeContents(randomPara);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            randomPara.style.backgroundColor = '#ffffcc';
            setTimeout(() => {
              randomPara.style.backgroundColor = '';
              selection.removeAllRanges();
            }, 1500);
          }
        });
        
        this.log(sessionId, 'TEXT_SELECTED', 'Text selection simulated');
        await page.waitForTimeout(2000);
      }
    } catch (error) {
      this.log(sessionId, 'TEXT_ERROR', `Text selection error: ${error.message}`);
    }
  }

  async performMicroInteractions(page, sessionId) {
    try {
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, .btn, [role="button"]');
        if (buttons.length > 0) {
          const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
          randomButton.style.backgroundColor = '#f0f0f0';
          setTimeout(() => {
            randomButton.style.backgroundColor = '';
          }, 1000);
        }
      });
      
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea');
        if (inputs.length > 0) {
          const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
          randomInput.focus();
          setTimeout(() => {
            randomInput.blur();
          }, 1500);
        }
      });
      
      this.log(sessionId, 'MICRO_INTERACTIONS', 'Micro-interactions performed');
      await page.waitForTimeout(3000);
    } catch (error) {
      this.log(sessionId, 'MICRO_ERROR', `Micro-interactions error: ${error.message}`);
    }
  }

  // ==================== BOT DETECTION HANDLER ====================
  async handleBotDetection(page, sessionId, context = 'unknown') {
    this.botDetectionCount++;
    const session = this.activeSessions.get(sessionId);
    session.botDetectionCount = (session.botDetectionCount || 0) + 1;
    this.activeSessions.set(sessionId, session);
    
    this.log(sessionId, 'BOT_DETECTED', `Bot detected in ${context}. Count: ${this.botDetectionCount}, Session count: ${session.botDetectionCount}`);
    
    // Handle dengan bot handler
    await this.botHandler.handleDetection(page, context);
    
    // Update session
    this.activeSessions.set(sessionId, session);
    
    this.log(sessionId, 'BOT_HANDLED', 'Bot detection handled with strategies');
  }

  // ==================== PROXY MANAGEMENT (UPDATED) ====================
  async setupAndTestProxiesForSession(sessionId, config) {
    const proxyType = config.proxyType || 'fresh';
    
    // ===== PERUBAHAN: Check memory usage =====
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // > 500MB
      this.log(sessionId, 'MEMORY_HIGH', 'Memory usage high, clearing proxy cache');
      if (this.proxyHandler.clearMemoryCache) {
        this.proxyHandler.clearMemoryCache();
      }
    }
    // ===== END PERUBAHAN =====
    
    // Check if proxies need refresh
    const proxyStats = this.proxyHandler.getAllActiveProxies();
    const activeCount = 
      (proxyStats.freshProxies?.length || 0) +
      (proxyStats.vpnExtensions?.length || 0);
    
    // ===== PERUBAHAN: Threshold lebih rendah (dari 10 jadi 3) =====
    if (activeCount < 3) {
      this.log(sessionId, 'PROXY_LOW', `Low proxy count (${activeCount}), refreshing...`);
      await this.proxyHandler.updateAllProxies();
    }
    // ===== END PERUBAHAN =====
    
    try {
      const selectedProxy = this.proxyHandler.getProxyForSession(sessionId, proxyType);
      
      if (!selectedProxy) {
        throw new Error(`No available ${proxyType} proxies after refresh`);
      }

      this.log(sessionId, 'PROXY_SELECTED', `Selected proxy: ${this.getProxyDisplay(selectedProxy)}`);
      config.selectedProxy = selectedProxy;

    } catch (error) {
      this.log(sessionId, 'PROXY_ERROR', `Proxy setup failed: ${error.message}`);
      // Fallback to no proxy
      config.proxyType = 'none';
      config.selectedProxy = null;
      this.log(sessionId, 'PROXY_FALLBACK', 'Falling back to no proxy');
    }
  }

  // ==================== UTILITY METHODS ====================
  getRandomUserAgent(deviceType) {
    const agents = MODERN_USER_AGENTS[deviceType] || MODERN_USER_AGENTS.desktop;
    return agents[Math.floor(Math.random() * agents.length)];
  }

  getSessionTimeMultiplier(sessionId) {
    // Generate multiplier berdasarkan session ID untuk variasi waktu
    const hash = this.hashString(sessionId);
    const level = hash % 3; // 0=low, 1=medium, 2=high
    
    const multipliers = {
      low: { min: 1.0, max: 1.5 },
      medium: { min: 1.5, max: 2.0 },
      high: { min: 2.0, max: 3.0 }
    };
    
    let range;
    switch(level) {
      case 0: range = multipliers.low; break;
      case 1: range = multipliers.medium; break;
      case 2: range = multipliers.high; break;
      default: range = multipliers.medium;
    }
    
    const multiplier = range.min + (Math.random() * (range.max - range.min));
    return parseFloat(multiplier.toFixed(2));
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  getProxyDisplay(proxy) {
    if (proxy.url) return proxy.url;
    if (proxy.host && proxy.port) return `${proxy.host}:${proxy.port}`;
    if (proxy.name) return proxy.name;
    return 'Unknown proxy';
  }

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
    
    console.log(`[${timestamp}] [${sessionId.substring(0, 8)}] ${step}: ${message}`);
  }

  // ==================== SESSION MANAGEMENT ====================
  stopSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.status = 'stopped';
      session.endTime = new Date();
      this.activeSessions.set(sessionId, session);
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
        botDetectionCount: session.botDetectionCount || 0,
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

  getStats() {
    return {
      totalSessions: this.totalSessions,
      successfulSessions: this.successfulSessions,
      activeSessions: Array.from(this.activeSessions.values()).filter(s => s.status === 'running').length,
      botDetectionCount: this.botDetectionCount,
      sessionLogsCount: Array.from(this.sessionLogs.values()).reduce((acc, logs) => acc + logs.length, 0)
    };
  }
}

module.exports = TrafficGenerator;
