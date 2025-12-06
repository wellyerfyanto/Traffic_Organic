// ==================== TRAFFIC GENERATOR 2025 (GOOGLE STEALTH OPTIMIZED) ====================
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const UserAgent = require('user-agents');

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
        
        this.autoRestartEnabled = true;
        this.botDetectionCount = 0;
        this.totalSessions = 0;
        this.successfulSessions = 0;
        this.failedGoogleAttempts = new Map();
        
        console.log('✅ TrafficGenerator 2025 (Google Optimized) constructed');
    }

    async initialize() {
        console.log('🔄 Initializing TrafficGenerator components...');
        
        try {
            this.ProxyHandlerClass = require('./proxyHandler');
            this.botHandler = new (require('./botHandler'))();
            this.KeywordAnalyzer = require('./keywordAnalyzer');
            
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

    // ==================== ENHANCED GOOGLE SEARCH METHODS ====================
    async startOrganicSession(config) {
        const sessionId = `organic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const keywordSource = config.keywordMode === 'manual' ? 'MANUAL' : 'AUTO';
    
        this.log(sessionId, 'ORGANIC_INIT', 
            `Starting session (Keywords: ${keywordSource}) | Google Stealth: ENABLED`);
    
        this.totalSessions++;
    
        // Apply Google-specific settings
        if (config.searchEngine === 'google') {
            config.googleMultiplier = parseFloat(process.env.GOOGLE_DELAY_MULTIPLIER) || 2.5;
            config.maxKeywords = Math.min(config.maxKeywords || 5, 
                parseInt(process.env.GOOGLE_MAX_KEYWORDS) || 3);
            
            // Randomize Google domain
            config.googleDomain = this.getRandomGoogleDomain();
            this.log(sessionId, 'GOOGLE_DOMAIN', `Using Google domain: ${config.googleDomain}`);
        }
        
        if (!config.proxyType) config.proxyType = 'vpn'; // Default to VPN for Google
        
        try {
            await this.setupAndTestProxiesForSession(sessionId, config);
        } catch (proxyError) {
            this.log(sessionId, 'PROXY_SETUP_FAILED', `Proxy setup failed: ${proxyError.message}`);
            config.proxyType = 'direct';
            config.selectedProxy = null;
        }

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
            userAgent: this.getStealthUserAgent(config.deviceType),
            proxyInfo: config.selectedProxy || null,
            searchEngine: config.searchEngine,
            keywords: config.customKeywords || [],
            keywordMode: config.keywordMode || 'auto',
            botDetectionCount: 0,
            timeMultiplier: this.getSessionTimeMultiplier(sessionId),
            googleSafeMode: true
        });

        this.log(sessionId, 'ORGANIC_STARTED', 
            `Session started | Engine: ${config.searchEngine} | Proxy: ${config.proxyType} | Google Stealth: ACTIVE`
        );
        
        this.executePureOrganicFlow(sessionId, config).then(() => {
            this.successfulSessions++;
            this.log(sessionId, 'ORGANIC_COMPLETED', 'Session completed successfully');
        }).catch(error => {
            this.log(sessionId, 'ORGANIC_ERROR', `Session failed: ${error.message}`);
            this.stopSession(sessionId);
        });

        return sessionId;
    }

    async executePureOrganicFlow(sessionId, config) {
        let browser = null;
        let page = null;
        const session = this.activeSessions.get(sessionId);
        const timeMultiplier = session.timeMultiplier || 1.0;
        const googleMultiplier = config.googleMultiplier || 2.0;
        
        try {
            // Step 1: Launch Browser with Google Optimizations
            browser = await this.launchGoogleOptimizedBrowser(sessionId, config);
            page = await browser.newPage();
            await this.setupGoogleOptimizedPage(page, sessionId, config);

            // Step 2: Keyword Analysis
            let keywords = [];
            
            if (config.keywordMode === 'manual' && config.customKeywords && config.customKeywords.length > 0) {
                keywords = config.customKeywords.slice(0, config.maxKeywords || 3);
                this.log(sessionId, 'KEYWORDS_MANUAL', 
                    `Using ${keywords.length} manual keywords: ${keywords.join(', ')}`);
            } else {
                this.log(sessionId, 'KEYWORD_ANALYSIS', 'Analyzing target for keywords...');
                const analyzer = new this.KeywordAnalyzer();
                const analysis = await analyzer.analyze(config.targetUrl);
                
                if (!analysis.success || analysis.keywords.length === 0) {
                    keywords = ['crypto', 'bitcoin', 'blockchain', 'trading', 'news']
                        .slice(0, config.maxKeywords || 3);
                } else {
                    keywords = analysis.keywords.slice(0, config.maxKeywords || 3);
                }
                
                this.log(sessionId, 'KEYWORDS_READY', 
                    `Using ${keywords.length} auto keywords: ${keywords.join(', ')}`);
            }
            
            session.keywords = keywords;
            this.activeSessions.set(sessionId, session);

            // Step 3: Organic Search Loop
            for (let i = 0; i < keywords.length; i++) {
                if (!this.isSessionActive(sessionId)) break;
                
                const keyword = keywords[i];
                this.log(sessionId, 'KEYWORD_START', 
                    `[${i+1}/${keywords.length}] Searching: "${keyword}" via ${config.searchEngine}`);

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
                    
                    if (i < keywords.length - 1) {
                        await page.goBack();
                        await page.waitForTimeout((5000 + Math.random() * 5000) * 
                            (config.searchEngine === 'google' ? googleMultiplier : timeMultiplier));
                    }
                }
                
                if (i < keywords.length - 1) {
                    await page.waitForTimeout((10000 + Math.random() * 10000) * 
                        (config.searchEngine === 'google' ? googleMultiplier : timeMultiplier));
                }
            }

            this.log(sessionId, 'ORGANIC_COMPLETE', 
                `Completed ${keywords.length} searches via ${config.searchEngine}`);

        } catch (error) {
            this.log(sessionId, 'ORGANIC_FLOW_ERROR', `Error: ${error.message}`);
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

    // ==================== GOOGLE-OPTIMIZED BROWSER LAUNCH ====================
    async launchGoogleOptimizedBrowser(sessionId, config) {
        try {
            this.log(sessionId, 'BROWSER_LAUNCH', 'Launching Google-optimized browser...');
            
            const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
            const proxy = this.proxyHandler.getProxyForSession(sessionId, config.proxyType);
            
            // Enhanced args for Google
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
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-component-update',
                '--disable-domain-reliability',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-crash-reporter',
                `--user-agent=${this.getStealthUserAgent(config.deviceType)}`,
                ...(proxy.puppeteerArgs || [])
            ];

            // Add proxy args if not direct
            if (!proxy.isDirect) {
                args.push(`--proxy-server=${proxy.protocol || 'http'}://${proxy.host}:${proxy.port}`);
            }

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
            this.log(sessionId, 'BROWSER_LAUNCH_SUCCESS', 'Google-optimized browser launched');
            return browser;
            
        } catch (error) {
            this.log(sessionId, 'BROWSER_LAUNCH_ERROR', `Failed: ${error.message}`);
            
            if (config.proxyType !== 'direct') {
                this.log(sessionId, 'RETRY_NO_PROXY', 'Retrying without proxy...');
                config.proxyType = 'direct';
                return this.launchGoogleOptimizedBrowser(sessionId, config);
            }
            
            throw error;
        }
    }

    async setupGoogleOptimizedPage(page, sessionId, config) {
        const timeMultiplier = this.activeSessions.get(sessionId).timeMultiplier || 1.0;
        const isGoogle = config.searchEngine === 'google';
        
        await page.setDefaultTimeout(60000 * (isGoogle ? 2.5 : timeMultiplier));
        await page.setDefaultNavigationTimeout(90000 * (isGoogle ? 2.5 : timeMultiplier));
        
        const userAgent = this.getStealthUserAgent(config.deviceType);
        await page.setUserAgent(userAgent);
        
        await page.setViewport({ 
            width: config.deviceType === 'mobile' ? 375 : 1920, 
            height: config.deviceType === 'mobile' ? 667 : 1080 
        });

        // Google-specific headers
        const headers = {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-CH-UA': '"Chromium";v="121", "Google Chrome";v="121", "Not:A-Brand";v="99"',
            'Sec-CH-UA-Mobile': config.deviceType === 'mobile' ? '?1' : '?0',
            'Sec-CH-UA-Platform': '"Windows"',
            'Sec-CH-UA-Platform-Version': '"10.0.0"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': isGoogle ? 'none' : 'cross-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'DNT': '1'
        };

        // Add random referrer for Google
        if (isGoogle) {
            const referrers = [
                'https://www.facebook.com',
                'https://twitter.com',
                'https://www.reddit.com',
                'https://www.bing.com',
                'https://duckduckgo.com',
                'https://www.youtube.com',
                'https://www.linkedin.com'
            ];
            headers['Referer'] = referrers[Math.floor(Math.random() * referrers.length)];
        }

        await page.setExtraHTTPHeaders(headers);

        // Apply advanced anti-detection scripts for Google
        if (isGoogle) {
            await this.applyGoogleAntiDetection(page);
        }

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
                'googlesyndication.com',
                'gstatic.com/lv/ty',
                'fingerprintjs',
                'botd',
                'datadome',
                'perimeterx',
                'recaptcha',
                'hcaptcha',
                'cloudflare',
                'akamai',
                'incapsula'
            ];
            
            const shouldBlock = blockedPatterns.some(pattern => url.includes(pattern));
            
            if (shouldBlock) {
                request.abort();
            } else {
                request.continue();
            }
        });
        
        // Enhanced console listener for Google
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('captcha') || text.includes('robot') || 
                text.includes('automated') || text.includes('suspicious')) {
                this.log(sessionId, 'GOOGLE_WARNING', `Console warning: ${text.substring(0, 100)}`);
                this.handleBotDetection(page, sessionId, 'google_console');
            }
        });
        
        page.on('response', async (response) => {
            if (response.url().includes('google.com')) {
                const status = response.status();
                if (status === 429 || status === 503 || (status >= 400 && status < 500)) {
                    this.log(sessionId, 'GOOGLE_BLOCK', `Google block detected: HTTP ${status}`);
                    await this.handleGoogleBlock(page, sessionId);
                }
            }
        });
        
        this.log(sessionId, 'PAGE_SETUP_COMPLETE', 'Google-optimized page setup complete');
    }

    async applyGoogleAntiDetection(page) {
        await page.evaluateOnNewDocument(() => {
            // ========== COMPREHENSIVE ANTI-DETECTION ==========
            
            // 1. Webdriver override
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
                configurable: true
            });
            
            // 2. Chrome object
            window.chrome = {
                runtime: {},
                loadTimes: () => ({
                    requestTime: 0,
                    startLoadTime: 0,
                    commitLoadTime: 0,
                    finishDocumentLoadTime: 0,
                    firstPaintTime: 0,
                    firstPaintAfterLoadTime: 0,
                    navigationType: 'Reload',
                    wasFetchedViaSpdy: false,
                    wasNpnNegotiated: true,
                    npnNegotiatedProtocol: 'h2',
                    wasAlternateProtocolAvailable: false,
                    connectionInfo: 'http/1.1'
                }),
                csi: () => ({
                    onloadT: 0,
                    pageT: 0,
                    startE: 0,
                    tran: 15
                }),
                app: {
                    isInstalled: false,
                    InstallState: {
                        DISABLED: 'disabled',
                        INSTALLED: 'installed',
                        NOT_INSTALLED: 'not_installed'
                    },
                    RunningState: {
                        CANNOT_RUN: 'cannot_run',
                        READY_TO_RUN: 'ready_to_run',
                        RUNNING: 'running'
                    }
                }
            };
            
            // 3. Plugins simulation
            const makePlugin = (name, filename, description) => ({
                0: { type: "application/x-google-chrome-pdf" },
                description: description,
                filename: filename,
                length: 1,
                name: name
            });
            
            const pluginArray = [
                makePlugin('Chrome PDF Plugin', 'internal-pdf-viewer', 'Portable Document Format'),
                makePlugin('Chrome PDF Viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', 'Portable Document Format'),
                makePlugin('Native Client', 'internal-nacl-plugin', 'Native Client Executable'),
                makePlugin('Portable Native Client', 'internal-pnacl-plugin', 'Portable Native Client Executable')
            ];
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => pluginArray,
                configurable: true
            });
            
            // 4. MimeTypes simulation
            Object.defineProperty(navigator, 'mimeTypes', {
                get: () => [
                    {
                        type: "application/pdf",
                        suffixes: "pdf",
                        description: "Portable Document Format",
                        enabledPlugin: pluginArray[0]
                    }
                ],
                configurable: true
            });
            
            // 5. Languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'id'],
                configurable: true
            });
            
            // 6. Hardware concurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8,
                configurable: true
            });
            
            // 7. Device memory
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
                configurable: true
            });
            
            // 8. Permissions API
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                if (parameters.name === 'geolocation') {
                    return Promise.resolve({ state: 'denied' });
                }
                return originalQuery(parameters);
            };
            
            // 9. WebGL vendor/renderer
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return 'Intel Inc.';
                if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                if (parameter === 3415) return 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics, OpenGL 4.1)';
                return getParameter.call(this, parameter);
            };
            
            // 10. Canvas fingerprinting protection
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type, encoderOptions) {
                const context = this.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, this.width, this.height);
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        // Add minimal noise
                        imageData.data[i] += Math.floor(Math.random() * 3) - 1;
                        imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
                        imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
                    }
                    context.putImageData(imageData, 0, 0);
                }
                return originalToDataURL.call(this, type, encoderOptions);
            };
            
            // 11. AudioContext fingerprinting
            if (window.AudioContext) {
                const originalGetChannelData = AnalyserNode.prototype.getChannelData;
                AnalyserNode.prototype.getChannelData = function() {
                    const result = originalGetChannelData.apply(this, arguments);
                    for (let i = 0; i < result.length; i++) {
                        result[i] += (Math.random() * 0.00001) - 0.000005;
                    }
                    return result;
                };
            }
            
            // 12. Screen properties
            Object.defineProperty(screen, 'width', { 
                get: () => 1920,
                configurable: true
            });
            Object.defineProperty(screen, 'height', { 
                get: () => 1080,
                configurable: true
            });
            Object.defineProperty(screen, 'availWidth', { 
                get: () => 1920,
                configurable: true
            });
            Object.defineProperty(screen, 'availHeight', { 
                get: () => 1040,
                configurable: true
            });
            Object.defineProperty(screen, 'colorDepth', { 
                get: () => 24,
                configurable: true
            });
            Object.defineProperty(screen, 'pixelDepth', { 
                get: () => 24,
                configurable: true
            });
            
            // 13. Timezone
            Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
                get: function() {
                    return () => ({
                        locale: 'en-US',
                        timeZone: 'America/New_York',
                        calendar: 'gregory',
                        numberingSystem: 'latn'
                    });
                },
                configurable: true
            });
            
            // 14. History API
            Object.defineProperty(history, 'length', {
                get: () => Math.floor(Math.random() * 10) + 2,
                configurable: true
            });
            
            // 15. Performance API
            if (window.performance) {
                const originalNow = performance.now;
                performance.now = function() {
                    return originalNow.call(this) + Math.random() * 10;
                };
                
                const originalGetEntries = performance.getEntries;
                performance.getEntries = function() {
                    const entries = originalGetEntries.call(this);
                    return entries.map(entry => ({
                        ...entry,
                        duration: entry.duration + Math.random() * 5
                    }));
                };
            }
            
            // 16. Battery API (if exists)
            if (navigator.getBattery) {
                const originalGetBattery = navigator.getBattery;
                navigator.getBattery = function() {
                    return Promise.resolve({
                        charging: true,
                        chargingTime: 0,
                        dischargingTime: Infinity,
                        level: 0.85
                    });
                };
            }
            
            // 17. Connection API
            if (navigator.connection) {
                Object.defineProperty(navigator.connection, 'downlink', {
                    get: () => 10 + Math.random() * 50,
                    configurable: true
                });
                Object.defineProperty(navigator.connection, 'rtt', {
                    get: () => 50 + Math.random() * 100,
                    configurable: true
                });
            }
            
            console.log('✅ Anti-detection scripts loaded');
        });
    }

    // ==================== GOOGLE SEARCH IMPLEMENTATION ====================
    async performGoogleSearch(page, sessionId, keyword, multiplier = 2.5) {
        try {
            // 1. Prepare Google URL with random parameters
            const params = new URLSearchParams({
                q: keyword,
                hl: this.getRandomGoogleLanguage(),
                gl: this.getRandomGoogleCountry(),
                gws_rd: 'cr',
                pws: '0',
                gfe_rd: 'cr',
                ie: 'UTF-8',
                oe: 'UTF-8',
                safe: 'active'
            });
            
            // Add random search filters occasionally
            if (Math.random() < 0.3) {
                const filters = ['qdr:d', 'qdr:h', 'qdr:w', 'qdr:m', 'tbs:qdr:d'];
                params.append('tbs', filters[Math.floor(Math.random() * filters.length)]);
            }
            
            const googleDomain = this.getRandomGoogleDomain();
            const searchUrl = `${googleDomain}/search?${params.toString()}`;
            
            this.log(sessionId, 'GOOGLE_SEARCH', 
                `Searching: "${keyword}" (${googleDomain}) | Delay: ${multiplier}x`);
            
            // 2. Navigate with human-like behavior
            await page.goto(searchUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000 * multiplier,
                referer: 'https://www.google.com'
            });
            
            // 3. Check for Google CAPTCHA/Block
            await this.checkGoogleBlock(page, sessionId);
            
            // 4. Perform human-like interactions
            await this.simulateGoogleHumanBehavior(page, sessionId, multiplier);
            
            // 5. Wait for results
            await page.waitForSelector('#search', { timeout: 30000 * multiplier })
                .catch(() => this.log(sessionId, 'NO_SEARCH_RESULTS', 'Search results not found'));
            
            // 6. Update session stats
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.googleAttempts = (session.googleAttempts || 0) + 1;
                session.googleSuccess = (session.googleSuccess || 0) + 1;
                this.activeSessions.set(sessionId, session);
            }
            
            this.log(sessionId, 'GOOGLE_SEARCH_SUCCESS', 
                `Search completed successfully (Attempt ${session?.googleAttempts || 1})`);
            
            return true;
            
        } catch (error) {
            this.log(sessionId, 'GOOGLE_SEARCH_ERROR', `Failed: ${error.message}`);
            
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.googleAttempts = (session.googleAttempts || 0) + 1;
                this.activeSessions.set(sessionId, session);
                
                // Mark as Google block if too many failures
                if (session.googleAttempts > 3) {
                    this.failedGoogleAttempts.set(sessionId, 
                        (this.failedGoogleAttempts.get(sessionId) || 0) + 1);
                    
                    if (this.failedGoogleAttempts.get(sessionId) > 2) {
                        this.log(sessionId, 'GOOGLE_BLOCKED', 
                            `Google block detected for session, switching to Bing`);
                        throw new Error('Google block - switch search engine');
                    }
                }
            }
            
            // Retry with different parameters
            await page.waitForTimeout(10000 * multiplier);
            return false;
        }
    }

    async simulateGoogleHumanBehavior(page, sessionId, multiplier) {
        try {
            // 1. Initial random mouse movement
            await page.mouse.move(
                Math.random() * 500,
                Math.random() * 300,
                { steps: 10 + Math.random() * 20 }
            );
            await page.waitForTimeout((500 + Math.random() * 1000) * multiplier);
            
            // 2. Scroll in human pattern
            const scrollPatterns = [
                { amount: 200, pause: 800 },
                { amount: 400, pause: 1200 },
                { amount: -100, pause: 400 }, // Scroll back
                { amount: 600, pause: 1500 },
                { amount: 300, pause: 1000 }
            ];
            
            for (const pattern of scrollPatterns) {
                await page.evaluate((amount) => {
                    window.scrollBy({
                        top: amount,
                        behavior: 'smooth'
                    });
                }, pattern.amount);
                
                await page.waitForTimeout((pattern.pause + Math.random() * 500) * multiplier);
                
                // Random mouse movements during scroll
                if (Math.random() < 0.4) {
                    await page.mouse.move(
                        Math.random() * 800,
                        Math.random() * 600,
                        { steps: 5 + Math.random() * 10 }
                    );
                }
            }
            
            // 3. Random clicks on page elements (not links)
            if (Math.random() < 0.3) {
                const elements = await page.$$('button, div, span');
                if (elements.length > 0) {
                    const randomElement = elements[Math.floor(Math.random() * elements.length)];
                    await randomElement.click();
                    await page.waitForTimeout((1000 + Math.random() * 2000) * multiplier);
                    await page.keyboard.press('Escape'); // Close any popup
                }
            }
            
            // 4. Typing simulation in search box
            if (Math.random() < 0.2) {
                await page.click('textarea[type="search"]');
                await page.waitForTimeout((500 + Math.random() * 1000) * multiplier);
                
                // Type random characters and delete
                const randomChars = 'test hello world search';
                for (const char of randomChars) {
                    await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
                }
                await page.waitForTimeout((800 + Math.random() * 1200) * multiplier);
                
                // Delete and retype
                await page.keyboard.press('Backspace', { delay: 50 });
                await page.keyboard.press('Enter');
            }
            
            this.log(sessionId, 'HUMAN_BEHAVIOR', 'Human behavior simulation complete');
            
        } catch (error) {
            this.log(sessionId, 'BEHAVIOR_SIM_ERROR', `Behavior simulation error: ${error.message}`);
        }
    }

    async checkGoogleBlock(page, sessionId) {
        try {
            const pageContent = await page.content();
            const lowerContent = pageContent.toLowerCase();
            
            // Check for common Google block indicators
            const blockIndicators = [
                'captcha',
                'robot',
                'automated',
                'suspicious',
                'unusual traffic',
                'denied access',
                'please try again',
                'confirm you are human',
                'recaptcha',
                '429 too many requests',
                '503 service'
            ];
            
            for (const indicator of blockIndicators) {
                if (lowerContent.includes(indicator)) {
                    this.log(sessionId, 'GOOGLE_BLOCK_DETECTED', 
                        `Detected: ${indicator.toUpperCase()}`);
                    
                    // Try to solve CAPTCHA if plugin available
                    if (indicator.includes('captcha') || indicator.includes('recaptcha')) {
                        await this.solveGoogleCaptcha(page, sessionId);
                    }
                    
                    // Wait longer if blocked
                    await page.waitForTimeout(15000);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            this.log(sessionId, 'BLOCK_CHECK_ERROR', `Error checking block: ${error.message}`);
            return false;
        }
    }

    async solveGoogleCaptcha(page, sessionId) {
        try {
            this.log(sessionId, 'CAPTCHA_SOLVING', 'Attempting to solve CAPTCHA...');
            
            // Try to use recaptcha plugin if available
            if (page.solveRecaptchas) {
                await page.solveRecaptchas();
                this.log(sessionId, 'CAPTCHA_SOLVED', 'CAPTCHA solved via plugin');
                await page.waitForTimeout(5000);
                return true;
            }
            
            // Alternative: try to reload page
            await page.reload({ waitUntil: 'networkidle2' });
            await page.waitForTimeout(10000);
            
            this.log(sessionId, 'CAPTCHA_RELOAD', 'Reloaded page to bypass CAPTCHA');
            return false;
            
        } catch (error) {
            this.log(sessionId, 'CAPTCHA_ERROR', `CAPTCHA solving error: ${error.message}`);
            return false;
        }
    }

    async handleGoogleBlock(page, sessionId) {
        try {
            this.log(sessionId, 'HANDLING_GOOGLE_BLOCK', 'Applying Google block recovery strategies...');
            
            // 1. Clear cookies
            const cookies = await page.cookies();
            for (const cookie of cookies) {
                if (cookie.domain.includes('google')) {
                    await page.deleteCookie(cookie);
                }
            }
            
            // 2. Change user agent
            const newUA = this.getStealthUserAgent('desktop');
            await page.setUserAgent(newUA);
            
            // 3. Change viewport
            await page.setViewport({
                width: 1366 + Math.floor(Math.random() * 200),
                height: 768 + Math.floor(Math.random() * 200)
            });
            
            // 4. Wait extended time
            await page.waitForTimeout(30000);
            
            // 5. Go to Google home instead of search
            await page.goto('https://www.google.com/ncr', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            this.log(sessionId, 'GOOGLE_BLOCK_RECOVERED', 'Recovery strategies applied');
            
        } catch (error) {
            this.log(sessionId, 'BLOCK_RECOVERY_ERROR', `Recovery error: ${error.message}`);
        }
    }

    // ==================== REGULAR SEARCH (NON-GOOGLE) ====================
    async performRegularSearch(page, sessionId, keyword, searchEngine, multiplier = 1.0) {
        try {
            let searchUrl;
            
            switch(searchEngine.toLowerCase()) {
                case 'bing':
                    searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&cc=us`;
                    break;
                case 'duckduckgo':
                    searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(keyword)}`;
                    break;
                case 'yahoo':
                    searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(keyword)}`;
                    break;
                case 'yandex':
                    searchUrl = `https://yandex.com/search/?text=${encodeURIComponent(keyword)}`;
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
            return false;
        }
    }

    // ==================== UTILITY METHODS ====================
    getStealthUserAgent(deviceType) {
        // Use user-agents library for realistic UAs
        const userAgent = new UserAgent({
            deviceCategory: deviceType === 'mobile' ? 'mobile' : 'desktop',
            platform: deviceType === 'mobile' ? 'Android' : 'Win32'
        });
        
        return userAgent.toString();
    }

    getRandomGoogleDomain() {
        const domains = [
            'https://www.google.com',
            'https://www.google.co.id',
            'https://www.google.co.uk',
            'https://www.google.ca',
            'https://www.google.com.au',
            'https://www.google.de',
            'https://www.google.fr',
            'https://www.google.es',
            'https://www.google.it',
            'https://www.google.com.sg'
        ];
        return domains[Math.floor(Math.random() * domains.length)];
    }

    getRandomGoogleLanguage() {
        const languages = ['en', 'id', 'es', 'fr', 'de', 'it', 'pt', 'ru'];
        return languages[Math.floor(Math.random() * languages.length)];
    }

    getRandomGoogleCountry() {
        const countries = ['us', 'id', 'gb', 'ca', 'au', 'de', 'fr', 'es', 'it'];
        return countries[Math.floor(Math.random() * countries.length)];
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

    // ==================== EXISTING METHODS (MINIMAL CHANGES) ====================
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
    }

    async setupAndTestProxiesForSession(sessionId, config) {
        if (!this.proxyHandler) {
            throw new Error('Proxy handler not available');
        }
        
        const proxyType = config.proxyType || 'vpn';
        
        try {
            const selectedProxy = this.proxyHandler.getProxyForSession(sessionId, proxyType);
            
            if (!selectedProxy) {
                throw new Error(`No available ${proxyType} proxies`);
            }

            this.log(sessionId, 'PROXY_SELECTED', 
                `Selected: ${selectedProxy.displayName || selectedProxy.host}`);
            config.selectedProxy = selectedProxy;

        } catch (error) {
            this.log(sessionId, 'PROXY_ERROR', `Proxy setup failed: ${error.message}`);
            throw error;
        }
    }

    async clickTargetFromSearch(page, sessionId, targetUrl, multiplier = 1.0) {
        // Implementation remains similar but with multiplier
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

    async handleBotDetection(page, sessionId, context) {
        this.botDetectionCount++;
        const session = this.activeSessions.get(sessionId);
        session.botDetectionCount = (session.botDetectionCount || 0) + 1;
        this.activeSessions.set(sessionId, session);
        
        this.log(sessionId, 'BOT_DETECTED', `Bot detected in ${context}. Count: ${this.botDetectionCount}`);
        
        if (this.botHandler && this.botHandler.handleDetection) {
            await this.botHandler.handleDetection(page, context);
        }
        
        this.log(sessionId, 'BOT_HANDLED', 'Bot detection handled');
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
            this.log(sessionId, 'SESSION_STOPPED', 'Session stopped');
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
                botDetectionCount: session.botDetectionCount || 0
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
            googleBlocks: Array.from(this.failedGoogleAttempts.values()).reduce((a, b) => a + b, 0)
        };
    }
}

module.exports = TrafficGenerator;