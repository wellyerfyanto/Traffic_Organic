// ==================== TRAFFIC GENERATOR 2025 (ENHANCED WITH PROFILES & GOOGLE LOGIN) ====================
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const fs = require('fs');

// Apply plugins
puppeteer.use(StealthPlugin());
puppeteer.use(RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: process.env.TWO_CAPTCHA_TOKEN || ''
  },
  visualFeedback: true
}));

class TrafficGenerator {
    constructor() {
        this.activeSessions = new Map();
        this.sessionLogs = new Map();
        
        // Lazy initialization
        this.proxyHandler = null;
        this.botHandler = null;
        this.KeywordAnalyzer = null;
        this.ProxyHandlerClass = null;
        this.profileManager = null;
        this.googleAuthManager = null;
        
        this.activeProfiles = new Map(); // sessionId -> profileId
        this.autoRestartEnabled = true;
        this.botDetectionCount = 0;
        this.totalSessions = 0;
        this.successfulSessions = 0;
        this.failedGoogleAttempts = new Map();
        
        console.log('✅ Traffic Generator 2025 constructed (Enhanced with Profiles & Google Login)');
    }

    async initialize() {
        console.log('🔄 Initializing TrafficGenerator components...');
        
        try {
            // Load components
            this.ProxyHandlerClass = require('./proxyHandler');
            this.botHandler = new (require('./botHandler'))();
            this.KeywordAnalyzer = require('./keywordAnalyzer');
            
            // Load new modules
            this.profileManager = new (require('./profileManager'))();
            this.googleAuthManager = new (require('./googleAuth'))();
            
            // Initialize proxy handler
            this.proxyHandler = new this.ProxyHandlerClass();
            if (this.proxyHandler.initialize) {
                await this.proxyHandler.initialize();
                console.log('✅ ProxyHandler initialized');
            }
            
            console.log('🎉 TrafficGenerator fully initialized');
            return true;
            
        } catch (error) {
            console.error('❌ TrafficGenerator initialization failed:', error.message);
            this.createFallbackHandlers();
            return false;
        }
    }

    // ==================== USER AGENT MANAGEMENT ====================
    getRandomUserAgent(deviceType, customAgent = null) {
        if (customAgent && customAgent.length > 20) {
            return customAgent;
        }
        
        const desktopAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ];
        
        const mobileAgents = [
            'Mozilla/5.0 (Linux; Android 14; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 13; SM-G781B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        ];
        
        const agents = deviceType === 'mobile' ? mobileAgents : desktopAgents;
        return agents[Math.floor(Math.random() * agents.length)];
    }

    // ==================== ENHANCED BROWSER LAUNCH WITH SESSION PROFILE ====================
    async launchBrowserWithProxy(sessionId, config) {
        try {
            console.log(`🚀 Launching browser for session ${sessionId.substring(0, 8)}...`);
            
            const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
            const userAgent = this.getRandomUserAgent(config.deviceType, config.userAgent);
            
            // Base args for all browsers
            const args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=site-per-process,IsolateOrigins,site-per-process',
                `--window-size=${config.deviceType === 'mobile' ? 375 : 1920},${config.deviceType === 'mobile' ? 667 : 1080}`,
                '--disable-blink-features=AutomationControlled',
                '--disable-software-rasterizer',
                '--disable-logging',
                '--disable-default-apps',
                '--disable-translate',
                '--disable-extensions',
                `--user-agent=${userAgent}`,
                '--enable-features=WebRtcHideLocalIpsWithMdns',
                '--disable-features=TranslateUI',
                '--disable-component-update'
            ];
            
            // Create unique Chrome profile for this session
            if (config.useProfile !== false && this.profileManager) {
                const profile = await this.profileManager.createSessionProfile(sessionId, config.deviceType);
                if (profile) {
                    args.push(`--user-data-dir=${profile.path}`);
                    this.activeProfiles.set(sessionId, profile.id);
                    console.log(`👤 Created unique Chrome profile: ${profile.id}`);
                }
            }
            
            // Get proxy if needed
            if (config.proxyType && config.proxyType !== 'direct') {
                try {
                    const proxy = this.proxyHandler.getProxyForSession(sessionId, config.proxyType);
                    
                    if (proxy && proxy.host && proxy.host !== 'direct') {
                        const proxyUrl = `${proxy.protocol || 'http'}://${proxy.host}:${proxy.port}`;
                        args.push(`--proxy-server=${proxyUrl}`);
                        console.log(`🔗 Using proxy: ${proxyUrl}`);
                    } else {
                        console.log('⚠️ No proxy available, using direct connection');
                    }
                } catch (proxyError) {
                    console.log(`⚠️ Proxy error: ${proxyError.message}, using direct connection`);
                }
            }
            
            const launchOptions = {
                headless: "new",
                args: args,
                executablePath: chromePath,
                ignoreHTTPSErrors: true,
                timeout: 180000,
                defaultViewport: null
            };
            
            console.log(`📄 Chrome path: ${chromePath}`);
            console.log(`🤖 User Agent: ${userAgent.substring(0, 60)}...`);
            
            const browser = await puppeteer.launch(launchOptions);
            console.log('✅ Browser launched with unique session profile');
            return browser;
            
        } catch (error) {
            console.error(`❌ Browser launch failed: ${error.message}`);
            
            // Fallback to direct connection without profile
            if (config.proxyType !== 'direct') {
                console.log('🔄 Retrying with direct connection...');
                config.proxyType = 'direct';
                return this.launchBrowserWithProxy(sessionId, config);
            }
            
            throw error;
        }
    }

    // ==================== START ORGANIC SESSION (UPDATED) ====================
    async startOrganicSession(config) {
        const sessionId = `organic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const keywordSource = config.keywordMode === 'manual' ? 'MANUAL' : 'AUTO';
    
        this.log(sessionId, 'SESSION_INIT', 
            `Starting session | Keywords: ${keywordSource} | Device: ${config.deviceType}`);
    
        this.totalSessions++;
    
        // Apply Google-specific settings
        if (config.searchEngine === 'google') {
            config.googleMultiplier = 2.5;
            config.maxKeywords = Math.min(config.maxKeywords || 5, 3);
            config.googleDomain = this.getRandomGoogleDomain();
            this.log(sessionId, 'GOOGLE_DOMAIN', `Using: ${config.googleDomain}`);
        }
        
        if (!config.proxyType) config.proxyType = 'vpn';
        if (!config.useProfile) config.useProfile = true;
        
        this.sessionLogs.set(sessionId, []);
        this.activeSessions.set(sessionId, {
            id: sessionId,
            config: config,
            status: 'running',
            startTime: new Date(),
            currentStep: 0,
            isOrganic: true,
            googleAttempts: 0,
            googleSuccess: 0,
            userAgent: this.getRandomUserAgent(config.deviceType, config.userAgent),
            proxyInfo: config.proxyType,
            searchEngine: config.searchEngine,
            keywords: config.customKeywords || [],
            keywordMode: config.keywordMode || 'auto',
            botDetectionCount: 0,
            timeMultiplier: this.getSessionTimeMultiplier(sessionId),
            requireCompletion: config.requireCompletion || false,
            googleAccountId: config.googleAccount || null,
            useProfile: config.useProfile
        });

        this.log(sessionId, 'SESSION_STARTED', 
            `Session started | Engine: ${config.searchEngine} | Proxy: ${config.proxyType} | Profile: ${config.useProfile}`);
        
        // Execute session
        this.executeSession(sessionId, config).then(() => {
            this.successfulSessions++;
            this.log(sessionId, 'SESSION_COMPLETED', 'Session completed successfully');
        }).catch(error => {
            this.log(sessionId, 'SESSION_ERROR', `Session failed: ${error.message}`);
            this.stopSession(sessionId);
        });

        return sessionId;
    }

    // ==================== EXECUTE SESSION (WITH GOOGLE LOGIN) ====================
    async executeSession(sessionId, config) {
        let browser = null;
        let page = null;
        const session = this.activeSessions.get(sessionId);
        const timeMultiplier = session.timeMultiplier || 1.0;
        const googleMultiplier = config.searchEngine === 'google' ? 2.5 : 1.0;
        
        try {
            // Step 1: Launch Browser with unique profile
            browser = await this.launchBrowserWithProxy(sessionId, config);
            page = await browser.newPage();
            await this.setupPage(page, sessionId, config);

            // Step 2: Google Account Login (if configured)
            if (config.googleAccount && config.googleAccount !== 'none' && this.googleAuthManager) {
                let account = null;
                
                if (config.googleAccount === 'random') {
                    account = this.googleAuthManager.getAccountForSession(sessionId, 'random');
                } else if (config.googleAccount.startsWith('acc_')) {
                    // Get specific account (would need account lookup implementation)
                    account = null; // Would implement account lookup
                }
                
                if (account) {
                    this.log(sessionId, 'GOOGLE_LOGIN', `Attempting login with: ${account.email.substring(0, 15)}...`);
                    const loginSuccess = await this.googleAuthManager.loginToGoogle(page, account);
                    
                    if (loginSuccess) {
                        session.googleAccount = account.email;
                        this.activeSessions.set(sessionId, session);
                        this.log(sessionId, 'GOOGLE_LOGIN_SUCCESS', 'Google account login successful');
                    } else {
                        this.log(sessionId, 'GOOGLE_LOGIN_FAILED', 'Google account login failed, continuing without');
                    }
                }
            }

            // Step 3: Get Keywords
            let keywords = [];
            
            if (config.keywordMode === 'manual' && config.customKeywords && config.customKeywords.length > 0) {
                keywords = config.customKeywords.slice(0, config.maxKeywords || 3);
                this.log(sessionId, 'KEYWORDS_MANUAL', 
                    `Using ${keywords.length} manual keywords`);
            } else {
                this.log(sessionId, 'KEYWORD_ANALYSIS', 'Analyzing target...');
                const analyzer = new this.KeywordAnalyzer();
                const analysis = await analyzer.analyze(config.targetUrl);
                
                if (!analysis.success || analysis.keywords.length === 0) {
                    keywords = ['crypto', 'bitcoin', 'blockchain', 'trading', 'news']
                        .slice(0, config.maxKeywords || 3);
                } else {
                    keywords = analysis.keywords.slice(0, config.maxKeywords || 3);
                }
                
                this.log(sessionId, 'KEYWORDS_READY', 
                    `Using ${keywords.length} auto keywords`);
            }
            
            // Clean keywords (remove site: operators)
            keywords = keywords.map(k => this.cleanKeywordForGoogle(k));
            session.keywords = keywords;
            this.activeSessions.set(sessionId, session);

            // Step 4: Execute Search for Each Keyword
            let completedKeywords = 0;
            
            for (let i = 0; i < keywords.length; i++) {
                if (!this.isSessionActive(sessionId)) break;
                
                const keyword = keywords[i];
                this.log(sessionId, 'KEYWORD_START', 
                    `[${i+1}/${keywords.length}] Searching: "${keyword}"`);

                try {
                    if (config.searchEngine === 'google') {
                        await this.performGoogleSearch(page, sessionId, keyword, googleMultiplier);
                    } else {
                        await this.performRegularSearch(page, sessionId, keyword, config.searchEngine, timeMultiplier);
                    }
                    
                    const targetClicked = await this.clickTargetFromSearch(page, sessionId, config.targetUrl, 
                        config.searchEngine === 'google' ? googleMultiplier : timeMultiplier);
                    
                    if (targetClicked) {
                        await this.performExtendedActivities(page, sessionId, config, 
                            config.searchEngine === 'google' ? googleMultiplier : timeMultiplier);
                        completedKeywords++;
                        
                        if (i < keywords.length - 1) {
                            await page.goBack();
                            await page.waitForTimeout((5000 + Math.random() * 5000) * timeMultiplier);
                        }
                    }
                    
                } catch (keywordError) {
                    this.log(sessionId, 'KEYWORD_ERROR', 
                        `Keyword "${keyword}" failed: ${keywordError.message}`);
                    
                    // If Google block detected, try bypass
                    if (keywordError.message.includes('Google block') && this.googleAuthManager) {
                        this.log(sessionId, 'GOOGLE_BLOCK', 'Attempting to bypass Google block...');
                        await this.googleAuthManager.bypassGoogleBlock(page, sessionId);
                    }
                    
                    if (config.requireCompletion) {
                        throw new Error(`Keyword "${keyword}" failed: ${keywordError.message}`);
                    }
                }
                
                if (i < keywords.length - 1) {
                    await page.waitForTimeout((10000 + Math.random() * 10000) * timeMultiplier);
                }
            }

            // Check completion
            if (config.requireCompletion && completedKeywords < keywords.length) {
                throw new Error(`Only ${completedKeywords}/${keywords.length} keywords completed`);
            }

            this.log(sessionId, 'SESSION_COMPLETE', 
                `Completed ${completedKeywords}/${keywords.length} searches via ${config.searchEngine}`);

        } catch (error) {
            this.log(sessionId, 'SESSION_FLOW_ERROR', `Error: ${error.message}`);
            throw error;
        } finally {
            if (browser) {
                try {
                    await browser.close();
                    this.log(sessionId, 'BROWSER_CLOSED', 'Browser closed');
                } catch (closeError) {}
            }
            this.stopSession(sessionId);
        }
    }

    // ==================== GOOGLE SEARCH (ENHANCED) ====================
    async performGoogleSearch(page, sessionId, keyword, multiplier = 2.5) {
        try {
            // Clean keyword
            const cleanKeyword = this.cleanKeywordForGoogle(keyword);
            
            // Prepare Google URL
            const params = new URLSearchParams({
                q: cleanKeyword,
                hl: 'en',
                gl: 'us',
                gws_rd: 'cr',
                pws: '0',
                ie: 'UTF-8',
                oe: 'UTF-8',
                safe: 'active'
            });
            
            const googleDomain = this.getRandomGoogleDomain();
            const searchUrl = `${googleDomain}/search?${params.toString()}`;
            
            this.log(sessionId, 'GOOGLE_SEARCH', 
                `Searching: "${cleanKeyword}" via ${googleDomain}`);
            
            // Add human-like delay
            await page.waitForTimeout(3000 + Math.random() * 5000);
            
            // Navigate with retry logic
            let retryCount = 0;
            const maxRetries = 2;
            
            while (retryCount <= maxRetries) {
                try {
                    await page.goto(searchUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout: 60000 * multiplier
                    });
                    
                    // Check for Google block
                    const pageContent = await page.content();
                    const lowerContent = pageContent.toLowerCase();
                    
                    if (lowerContent.includes('captcha') || 
                        lowerContent.includes('unusual traffic') ||
                        lowerContent.includes('denied access') ||
                        lowerContent.includes('automated queries')) {
                        throw new Error('Google block detected');
                    }
                    
                    // Wait for search results
                    await page.waitForSelector('#search, div.g, .srg', { timeout: 30000 * multiplier })
                        .catch(() => this.log(sessionId, 'NO_RESULTS', 'Search results not found'));
                    
                    // Scroll slightly
                    await page.evaluate(() => {
                        window.scrollBy(0, 300);
                    });
                    
                    // Update session stats
                    const session = this.activeSessions.get(sessionId);
                    if (session) {
                        session.googleAttempts = (session.googleAttempts || 0) + 1;
                        session.googleSuccess = (session.googleSuccess || 0) + 1;
                        this.activeSessions.set(sessionId, session);
                    }
                    
                    this.log(sessionId, 'GOOGLE_SUCCESS', 
                        `Search completed (Attempt ${session?.googleAttempts || 1})`);
                    
                    return true;
                    
                } catch (navError) {
                    retryCount++;
                    
                    if (retryCount > maxRetries) {
                        throw navError;
                    }
                    
                    this.log(sessionId, 'GOOGLE_RETRY', 
                        `Retry ${retryCount}/${maxRetries}: ${navError.message}`);
                    
                    await page.waitForTimeout(10000 * multiplier);
                    
                    // Try bypass on retry
                    if (this.googleAuthManager) {
                        await this.googleAuthManager.bypassGoogleBlock(page, sessionId);
                    }
                }
            }
            
        } catch (error) {
            this.log(sessionId, 'GOOGLE_FAILED', `Failed: ${error.message}`);
            
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.googleAttempts = (session.googleAttempts || 0) + 1;
                this.activeSessions.set(sessionId, session);
            }
            
            throw error;
        }
    }

    // ==================== CLEAN KEYWORD FOR GOOGLE ====================
    cleanKeywordForGoogle(keyword) {
        // Hapus operator Google yang mencurigakan
        const suspiciousOperators = [
            'site:', 'intitle:', 'inurl:', 'intext:', 'filetype:',
            'cache:', 'related:', 'info:', 'define:'
        ];
        
        let cleanKeyword = keyword;
        
        suspiciousOperators.forEach(op => {
            if (cleanKeyword.toLowerCase().includes(op)) {
                // Ambil hanya kata setelah operator
                const parts = cleanKeyword.split(op);
                cleanKeyword = parts[1] || parts[0];
            }
        });
        
        // Bersihkan tanda kurung dan karakter khusus
        cleanKeyword = cleanKeyword
            .replace(/[\[\](){}]/g, '')
            .replace(/["']/g, '')
            .trim();
        
        // Jika keyword terlalu pendek, tambahkan kata umum
        if (cleanKeyword.length < 3) {
            cleanKeyword = 'crypto news';
        }
        
        return cleanKeyword;
    }

    // ==================== PAGE SETUP (UPDATED) ====================
    async setupPage(page, sessionId, config) {
        const timeMultiplier = this.activeSessions.get(sessionId).timeMultiplier || 1.0;
        const isGoogle = config.searchEngine === 'google';
        
        await page.setDefaultTimeout(60000 * (isGoogle ? 2.5 : timeMultiplier));
        await page.setDefaultNavigationTimeout(90000 * (isGoogle ? 2.5 : timeMultiplier));
        
        const userAgent = this.getRandomUserAgent(config.deviceType, config.userAgent);
        await page.setUserAgent(userAgent);
        
        await page.setViewport({ 
            width: config.deviceType === 'mobile' ? 375 : 1920, 
            height: config.deviceType === 'mobile' ? 667 : 1080 
        });

        // Setup request interception
        await page.setRequestInterception(true);
        
        page.on('request', (request) => {
            const url = request.url();
            
            // Block tracking and bot detection services
            const blockedPatterns = [
                'google-analytics.com',
                'googletagmanager.com',
                'doubleclick.net',
                'googleadservices.com',
                'fingerprintjs',
                'botd',
                'datadome'
            ];
            
            const shouldBlock = blockedPatterns.some(pattern => url.includes(pattern));
            
            if (shouldBlock) {
                request.abort();
            } else {
                request.continue();
            }
        });
        
        this.log(sessionId, 'PAGE_SETUP', 'Page setup complete');
    }

    // ==================== HELPER METHODS ====================
    getRandomGoogleDomain() {
        const domains = [
            'https://www.google.com',
            'https://www.google.co.id',
            'https://www.google.co.uk',
            'https://www.google.com.au',
            'https://www.google.de',
            'https://www.google.fr'
        ];
        return domains[Math.floor(Math.random() * domains.length)];
    }

    getSessionTimeMultiplier(sessionId) {
        const hash = this.hashString(sessionId);
        const level = hash % 3;
        
        const multipliers = {
            0: { min: 1.0, max: 1.8 },
            1: { min: 1.8, max: 2.5 },
            2: { min: 2.5, max: 3.5 }
        };
        
        const range = multipliers[level] || multipliers[1];
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

    async clickTargetFromSearch(page, sessionId, targetUrl, multiplier = 1.0) {
        try {
            const targetDomain = new URL(targetUrl).hostname.replace('www.', '');
            
            await page.waitForSelector('a', { timeout: 10000 * multiplier });
            
            const searchLinks = await page.$$eval('a', anchors => 
                anchors
                  .filter(a => a.href && a.textContent.trim().length > 5)
                  .map(a => ({
                    href: a.href,
                    text: a.textContent.trim().substring(0, 100)
                  }))
            );
            
            const targetLinks = searchLinks.filter(link => 
                link.href.includes(targetDomain)
            );
            
            let linkToClick = null;
            
            if (targetLinks.length > 0) {
                linkToClick = targetLinks[Math.floor(Math.random() * targetLinks.length)];
            } else if (searchLinks.length > 0 && Math.random() < 0.7) {
                linkToClick = searchLinks[Math.floor(Math.random() * searchLinks.length)];
            } else {
                this.log(sessionId, 'NO_LINKS_FOUND', 'No suitable links found');
                return false;
            }
            
            await page.evaluate((href) => {
                const link = document.querySelector(`a[href="${href}"]`);
                if (link) link.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, linkToClick.href);
            
            await page.waitForTimeout((1000 + Math.random() * 2000) * multiplier);
            await page.click(`a[href="${linkToClick.href}"]`);
            
            await page.waitForNavigation({ 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 * multiplier 
            }).catch(() => {
                this.log(sessionId, 'NAVIGATION_TIMEOUT', 'Navigation timeout');
            });
            
            this.log(sessionId, 'LINK_CLICKED', 
                `Clicked: "${linkToClick.text.substring(0, 50)}..."`);
            
            await page.waitForTimeout((2000 + Math.random() * 3000) * multiplier);
            return true;
            
        } catch (error) {
            this.log(sessionId, 'CLICK_ERROR', `Error clicking link: ${error.message}`);
            return false;
        }
    }

    async performExtendedActivities(page, sessionId, config, multiplier = 1.0) {
        this.log(sessionId, 'EXTENDED_ACTIVITIES', 'Starting extended activities');
        
        const activities = [
            {
                name: 'SCROLL',
                action: async () => {
                    await page.evaluate(() => {
                        window.scrollBy({ top: 500, behavior: 'smooth' });
                    });
                    await page.waitForTimeout(2000 * multiplier);
                    await page.evaluate(() => {
                        window.scrollBy({ top: 800, behavior: 'smooth' });
                    });
                },
                baseTime: 10000
            },
            {
                name: 'READING',
                action: async () => {
                    await page.waitForTimeout(15000 * multiplier);
                },
                baseTime: 15000
            }
        ];
        
        const selectedActivities = activities
            .sort(() => Math.random() - 0.5)
            .slice(0, 1 + Math.floor(Math.random() * 2));
        
        for (const activity of selectedActivities) {
            if (!this.isSessionActive(sessionId)) break;
            
            try {
                const session = this.activeSessions.get(sessionId);
                session.currentStep = activity.name;
                this.activeSessions.set(sessionId, session);
                
                await activity.action();
                
                this.log(sessionId, `${activity.name}_COMPLETE`, 'Activity completed');
                await page.waitForTimeout((2000 + Math.random() * 4000) * multiplier);
                
            } catch (error) {
                this.log(sessionId, `${activity.name}_ERROR`, `Activity error: ${error.message}`);
            }
        }
    }

    // ==================== REGULAR SEARCH ====================
    async performRegularSearch(page, sessionId, keyword, searchEngine, multiplier = 1.0) {
        try {
            let searchUrl;
            
            switch(searchEngine.toLowerCase()) {
                case 'bing':
                    searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}`;
                    break;
                case 'duckduckgo':
                    searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(keyword)}`;
                    break;
                default:
                    searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}`;
            }
            
            this.log(sessionId, 'SEARCH_START', 
                `Searching via ${searchEngine}: "${keyword}"`);
            
            await page.goto(searchUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000 * multiplier
            });
            
            await page.waitForSelector('a', { timeout: 15000 * multiplier })
                .catch(() => this.log(sessionId, 'NO_LINKS', 'No links found'));
            
            await page.waitForTimeout((3000 + Math.random() * 4000) * multiplier);
            
            this.log(sessionId, 'SEARCH_COMPLETE', `${searchEngine} search completed`);
            return true;
            
        } catch (error) {
            this.log(sessionId, 'SEARCH_ERROR', `${searchEngine} search failed: ${error.message}`);
            throw error;
        }
    }

    // ==================== CORE METHODS ====================
    createFallbackHandlers() {
        console.log('⚠️ Creating fallback handlers...');
        
        this.proxyHandler = {
            getProxyForSession: (sessionId, proxyType) => ({
                name: 'Direct Connection',
                host: 'direct',
                port: 0,
                type: 'direct',
                protocol: 'direct',
                isDirect: true,
                isVPN: false,
                working: true,
                responseTime: 100,
                puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                displayName: 'Direct Connection'
            }),
            getAllActiveProxies: () => ({
                freshProxies: [],
                webProxies: [],
                vpnProxies: [],
                stats: { totalWorking: 0 }
            })
        };
        
        this.botHandler = {
            handleDetection: async () => 0
        };
        
        this.KeywordAnalyzer = class {
            async analyze() {
                return {
                    success: true,
                    keywords: ['crypto', 'blockchain', 'bitcoin', 'trading', 'news']
                };
            }
        };
        
        this.profileManager = {
            createSessionProfile: async () => null,
            cleanupSessionProfile: async () => true
        };
        
        this.googleAuthManager = {
            loginToGoogle: async () => false,
            getAccountForSession: () => null,
            bypassGoogleBlock: async () => false
        };
    }

    log(sessionId, step, message) {
        const timestamp = new Date().toLocaleString('id-ID');
        const logEntry = { timestamp, step, message };
        
        if (this.sessionLogs.has(sessionId)) {
            const logs = this.sessionLogs.get(sessionId);
            logs.push(logEntry);
            if (logs.length > 500) logs.splice(0, 100);
        }
        
        console.log(`[${timestamp}] [${sessionId.substring(0, 8)}] ${step}: ${message}`);
    }

    stopSession(sessionId) {
        if (this.activeSessions.has(sessionId)) {
            const session = this.activeSessions.get(sessionId);
            session.status = 'stopped';
            session.endTime = new Date();
            this.activeSessions.set(sessionId, session);
            
            // Cleanup Chrome profile
            if (this.activeProfiles.has(sessionId) && this.profileManager) {
                const profileId = this.activeProfiles.get(sessionId);
                this.profileManager.cleanupSessionProfile(profileId);
                this.activeProfiles.delete(sessionId);
            }
            
            this.log(sessionId, 'SESSION_STOPPED', 'Session stopped and profile cleaned');
        }
    }

    isSessionActive(sessionId) {
        const session = this.activeSessions.get(sessionId);
        return session && session.status === 'running';
    }

    getAllSessions() {
        const sessions = [];
        for (const [sessionId, session] of this.activeSessions) {
            sessions.push({
                id: sessionId,
                status: session.status,
                startTime: session.startTime,
                endTime: session.endTime,
                config: session.config,
                googleAttempts: session.googleAttempts || 0,
                googleSuccess: session.googleSuccess || 0,
                botDetectionCount: session.botDetectionCount || 0,
                googleAccount: session.googleAccount || null,
                useProfile: session.useProfile || false
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

    getStats() {
        return {
            totalSessions: this.totalSessions,
            successfulSessions: this.successfulSessions,
            activeSessions: Array.from(this.activeSessions.values()).filter(s => s.status === 'running').length,
            botDetectionCount: this.botDetectionCount,
            activeProfiles: this.activeProfiles.size
        };
    }
}

module.exports = TrafficGenerator;