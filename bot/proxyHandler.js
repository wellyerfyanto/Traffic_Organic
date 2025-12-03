// ==================== PROXY HANDLER 2025 (FIXED FOR NODE 18+) ====================
// Gunakan fetch native Node.js 18+ atau fallback ke node-fetch
let fetch;
try {
  // Coba gunakan fetch native Node.js 18+
  fetch = global.fetch || require('node-fetch');
} catch (error) {
  console.log('⚠️ Using node-fetch as fallback');
  fetch = require('node-fetch');
}

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Gunakan dynamic import untuk socks-proxy-agent dan https-proxy-agent
let SocksProxyAgent, HttpsProxyAgent;
try {
  const socks = require('socks-proxy-agent');
  const https = require('https-proxy-agent');
  SocksProxyAgent = socks.SocksProxyAgent || socks;
  HttpsProxyAgent = https.HttpsProxyAgent || https;
} catch (error) {
  console.log('⚠️ Proxy agents not available, continuing without...');
  SocksProxyAgent = class MockAgent {};
  HttpsProxyAgent = class MockAgent {};
}

const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class ProxyHandler2025 {
    constructor() {
        // ==================== PROXY POOLS ====================
        this.freshProxies = [];    // IP:Port proxies (HTTP/HTTPS/SOCKS)
        this.webProxies = [];      // Web gateway proxies
        this.vpnProxies = [];      // VPN proxies (SOCKS5/HTTP with VPN providers)
        this.lastUpdate = null;
        this.sessionRotation = new Map();
        this.autoUpdateInterval = null;
        this.healthCheckInterval = null;
        this.isInitialized = false;
        
        // ==================== VERIFIED PROXY SOURCES 2025 ====================
        this.proxySources = [
            // Free API dengan update harian
            'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_format=protocolipport&format=text&timeout=10000&ssl=yes',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks4&timeout=10000&country=all',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=10000&country=all',
            
            // Sumber GitHub yang aktif
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
            'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
            'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt',
            'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt',
            'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
            'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
            'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks4.txt',
            'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt',
            
            // API premium (gratis tier)
            'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps%2Csocks4%2Csocks5',
            'https://www.proxy-list.download/api/v1/get?type=https',
            'https://www.proxy-list.download/api/v1/get?type=http',
            'https://www.proxy-list.download/api/v1/get?type=socks4',
            'https://www.proxy-list.download/api/v1/get?type=socks5'
        ];
        
        // ==================== ACTIVE WEB PROXY GATEWAYS 2025 ====================
        this.webProxyGateways = [
            {
                name: 'CroxyProxy',
                url: 'https://www.croxyproxy.com/',
                working: true,
                encodeUrl: true,
                method: 'web_gateway'
            },
            {
                name: 'ProxySite',
                url: 'https://www.proxysite.com/',
                working: true,
                encodeUrl: true,
                method: 'web_gateway'
            },
            {
                name: 'HideMe',
                url: 'https://hide.me/en/proxy',
                working: true,
                encodeUrl: false,
                method: 'web_gateway'
            },
            {
                name: 'Hidester',
                url: 'https://hidester.com/proxy/',
                working: true,
                encodeUrl: true,
                method: 'web_gateway'
            },
            {
                name: 'Proxyium',
                url: 'https://www.proxyium.com/',
                working: true,
                encodeUrl: true,
                method: 'web_gateway'
            },
            {
                name: 'ProxyNova',
                url: 'https://www.proxynova.com/web-proxy/',
                working: true,
                encodeUrl: true,
                method: 'web_gateway'
            }
        ];
        
        // ==================== REAL VPN SOURCES 2025 ====================
        this.vpnSources = [
            {
                name: 'Free VPN Gateways',
                type: 'socks5',
                endpoints: [
                    { host: 'gateway.socks5.net', port: 1080, country: 'US' },
                    { host: 'free.vpnserver.com', port: 1080, country: 'NL' },
                    { host: 'socks5.vpngate.net', port: 1080, country: 'JP' },
                    { host: 'public-socks5.proxy', port: 1080, country: 'DE' }
                ]
            },
            {
                name: 'Public VPN HTTP',
                type: 'http',
                endpoints: [
                    { host: 'vpn-public-http1.proxy', port: 8080, country: 'DE' },
                    { host: 'free-http-vpn.net', port: 80, country: 'SG' },
                    { host: 'public.vpnhttp.com', port: 8080, country: 'US' }
                ]
            },
            {
                name: 'Tor Gateways',
                type: 'socks5',
                endpoints: [
                    { host: '127.0.0.1', port: 9050, country: 'TOR' },
                    { host: '127.0.0.1', port: 9150, country: 'TOR' }
                ]
            }
        ];
        
        // ==================== VPN PROVIDER CREDENTIALS ====================
        this.vpnProviders = {
            nordvpn: {
                name: 'NordVPN',
                type: 'socks5',
                endpoints: [
                    { host: 'us.nordvpn.com', port: 1080, country: 'US' },
                    { host: 'nl.nordvpn.com', port: 1080, country: 'NL' },
                    { host: 'jp.nordvpn.com', port: 1080, country: 'JP' },
                    { host: 'uk.nordvpn.com', port: 1080, country: 'UK' },
                    { host: 'de.nordvpn.com', port: 1080, country: 'DE' }
                ],
                requiresAuth: true,
                username: process.env.NORDVPN_USERNAME || '',
                password: process.env.NORDVPN_PASSWORD || ''
            },
            expressvpn: {
                name: 'ExpressVPN',
                type: 'socks5',
                endpoints: [
                    { host: 'socks5.expressvpn.com', port: 1080, country: 'US' }
                ],
                requiresAuth: true,
                username: process.env.EXPRESSVPN_USERNAME || '',
                password: process.env.EXPRESSVPN_PASSWORD || ''
            },
            surfshark: {
                name: 'Surfshark',
                type: 'socks5',
                endpoints: [
                    { host: 'socks5.surfshark.com', port: 1080, country: 'US' }
                ],
                requiresAuth: true,
                username: process.env.SURFSHARK_USERNAME || '',
                password: process.env.SURFSHARK_PASSWORD || ''
            }
        };
        
        // ==================== CONFIGURATION ====================
        this.config = {
            maxFreshProxies: 100,
            maxWebProxies: 10,
            maxVPNProxies: 20,
            testTimeout: 15000,
            rotationInterval: 30 * 60 * 1000,     // 30 menit
            minProxySpeed: 8000,                  // Max 8 detik
            testConcurrency: 5,
            minWorkingProxies: 15,
            vpnTestTimeout: 20000,
            cacheTTL: 30 * 60 * 1000,            // 30 menit cache
            healthCheckInterval: 5 * 60 * 1000,   // 5 menit
            enablePremiumVPN: process.env.ENABLE_PREMIUM_VPN === 'true',
            proxyTestSites: [
                'https://httpbin.org/ip',
                'https://api.ipify.org?format=json',
                'https://ipinfo.io/json',
                'https://api.myip.com'
            ]
        };
        
        // ==================== STATISTICS ====================
        this.stats = {
            totalFetched: 0,
            totalWorking: 0,
            lastSuccessRate: 0,
            lastFetchTime: null,
            vpnCount: 0,
            sourceSuccess: {},
            startupTime: new Date().toISOString()
        };
        
        // ==================== CACHE SYSTEM ====================
        this.cacheFile = path.join(__dirname, '..', 'data', 'proxy-cache.json');
        this.ensureCacheDirectory();
        
        console.log('🔄 ProxyHandler2025 initialized with VPN support');
    }

    // ==================== CORE INITIALIZATION ====================
    async initialize() {
        if (this.isInitialized) {
            console.log('✅ Proxy system already initialized');
            return true;
        }
        
        console.log('🚀 Initializing proxy system with VPN...');
        
        try {
            // 1. Load dari cache
            const cacheLoaded = await this.loadCache();
            
            // 2. Force update jika cache tidak cukup
            if (!cacheLoaded || 
                this.freshProxies.length < this.config.minWorkingProxies || 
                this.vpnProxies.length < 3) {
                console.log('🔄 Cache insufficient or expired, forcing update...');
                await this.updateAllProxies();
            } else {
                console.log(`📁 Using cached proxies: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN`);
            }
            
            // 3. Start auto systems
            this.startAutoUpdate();
            this.startHealthCheck();
            
            this.isInitialized = true;
            console.log('✅ Proxy system fully initialized with auto-update');
            return true;
            
        } catch (error) {
            console.error('❌ Proxy initialization failed:', error.message);
            this.isInitialized = false;
            return false;
        }
    }

    // ==================== CACHE MANAGEMENT ====================
    async ensureCacheDirectory() {
        try {
            const dataDir = path.join(__dirname, '..', 'data');
            await fs.mkdir(dataDir, { recursive: true });
            console.log('📁 Cache directory ensured');
        } catch (error) {
            console.log('⚠️ Cache directory error:', error.message);
        }
    }

    async loadCache() {
        try {
            const cacheExists = await fs.access(this.cacheFile).then(() => true).catch(() => false);
            if (!cacheExists) {
                console.log('📁 No cache file found');
                return false;
            }
            
            const data = JSON.parse(await fs.readFile(this.cacheFile, 'utf8'));
            const cacheTime = new Date(data.lastUpdate).getTime();
            const now = Date.now();
            
            // Gunakan cache jika kurang dari TTL
            if (now - cacheTime < this.config.cacheTTL) {
                this.freshProxies = data.freshProxies || [];
                this.webProxies = data.webProxies || [];
                this.vpnProxies = data.vpnProxies || [];
                this.lastUpdate = data.lastUpdate;
                
                // Update stats
                this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
                this.stats.vpnCount = this.vpnProxies.length;
                
                console.log(`📁 Loaded from cache: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN (${Math.round((now - cacheTime) / 60000)} minutes old)`);
                return true;
            } else {
                console.log('📁 Cache expired, will refresh');
                return false;
            }
            
        } catch (error) {
            console.log('⚠️ Cache load error:', error.message);
            return false;
        }
    }

    async saveCache() {
        try {
            // Filter hanya proxy yang working
            const workingFresh = this.freshProxies
                .filter(p => p.working && p.responseTime && p.responseTime < this.config.minProxySpeed)
                .slice(0, 50);
            
            const workingWeb = this.webProxies
                .filter(p => p.working)
                .slice(0, 5);
            
            const workingVPN = this.vpnProxies
                .filter(p => p.working && p.responseTime && p.responseTime < this.config.vpnTestTimeout)
                .slice(0, 15);
            
            const cacheData = {
                freshProxies: workingFresh,
                webProxies: workingWeb,
                vpnProxies: workingVPN,
                lastUpdate: this.lastUpdate || new Date().toISOString(),
                savedAt: new Date().toISOString(),
                stats: {
                    totalWorking: workingFresh.length + workingVPN.length,
                    avgResponseTime: workingFresh.length > 0 ? 
                        workingFresh.reduce((a, b) => a + (b.responseTime || 0), 0) / workingFresh.length : 0
                }
            };
            
            await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
            console.log(`💾 Saved cache: ${workingFresh.length} fresh, ${workingVPN.length} VPN`);
            
        } catch (error) {
            console.log('⚠️ Cache save error:', error.message);
        }
    }

    // ==================== PROXY FETCHING ====================
    async fetchProxiesFromSources() {
        console.log('🌐 Fetching proxies from sources...');
        
        const allProxies = [];
        const sourceResults = {};
        
        // Fetch dari semua sumber secara parallel dengan timeout
        const fetchPromises = this.proxySources.map(async (source, index) => {
            const sourceName = this.getSourceName(source);
            
            try {
                console.log(`  📥 [${index + 1}/${this.proxySources.length}] ${sourceName}`);
                
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);
                
                const response = await fetch(source, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                clearTimeout(timeout);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const text = await response.text();
                const proxies = this.parseProxyList(text, source);
                
                console.log(`    ✅ ${sourceName}: ${proxies.length} proxies`);
                sourceResults[sourceName] = { success: true, count: proxies.length };
                
                return proxies;
                
            } catch (error) {
                console.log(`    ❌ ${sourceName}: ${error.message}`);
                sourceResults[sourceName] = { success: false, error: error.message };
                return [];
            }
        });
        
        // Tunggu semua fetch selesai
        const results = await Promise.allSettled(fetchPromises);
        
        // Kumpulkan semua proxy
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                allProxies.push(...result.value);
            }
        });
        
        // Update stats
        this.stats.sourceSuccess = sourceResults;
        this.stats.totalFetched = allProxies.length;
        
        // Remove duplicates
        const uniqueProxies = this.removeDuplicateProxies(allProxies);
        console.log(`  🔄 Unique proxies: ${uniqueProxies.length}/${allProxies.length}`);
        
        return uniqueProxies;
    }

    parseProxyList(text, source) {
        const proxies = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.includes('[')) {
                continue;
            }
            
            // Remove non-ASCII characters
            const cleanLine = trimmed.replace(/[^\x00-\x7F]/g, '');
            
            // Pattern matching untuk berbagai format proxy
            const patterns = [
                /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/,  // ip:port
                /(\w+):\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/,  // protocol://ip:port
                /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5}):(\w+):(\w+)/  // ip:port:user:pass
            ];
            
            let match = null;
            for (const pattern of patterns) {
                match = cleanLine.match(pattern);
                if (match) break;
            }
            
            if (!match) continue;
            
            try {
                const proxyObj = {
                    raw: cleanLine,
                    source: this.getSourceName(source),
                    fetchedAt: new Date().toISOString(),
                    working: false,
                    tested: false,
                    lastTested: null,
                    responseTime: null,
                    testResult: null,
                    useCount: 0,
                    lastUsed: null,
                    successCount: 0,
                    failCount: 0,
                    isVPN: false,
                    isPremium: false
                };
                
                // Extract berdasarkan pattern
                if (match[1] && match[2]) {
                    proxyObj.host = match[1];
                    proxyObj.port = parseInt(match[2]);
                    
                    // Cek jika ada auth credentials
                    if (match[3] && match[4] && 
                        !['http', 'https', 'socks4', 'socks5'].includes(match[3].toLowerCase())) {
                        proxyObj.username = match[3];
                        proxyObj.password = match[4];
                    }
                    
                    // Deteksi protocol dari line atau URL
                    if (cleanLine.includes('socks5://')) {
                        proxyObj.protocol = 'socks5';
                        proxyObj.type = 'socks5';
                    } else if (cleanLine.includes('socks4://')) {
                        proxyObj.protocol = 'socks4';
                        proxyObj.type = 'socks4';
                    } else if (cleanLine.includes('https://')) {
                        proxyObj.protocol = 'https';
                        proxyObj.type = 'https';
                    } else {
                        proxyObj.protocol = 'http';
                        proxyObj.type = 'http';
                    }
                    
                    // Build URL
                    proxyObj.url = this.buildProxyUrl(proxyObj);
                    
                    // Validasi
                    if (this.isValidIP(proxyObj.host) && proxyObj.port > 0 && proxyObj.port <= 65535) {
                        proxies.push(proxyObj);
                    }
                }
                
            } catch (error) {
                continue;
            }
        }
        
        return proxies;
    }

    isValidIP(ip) {
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipPattern.test(ip)) return false;
        
        const parts = ip.split('.').map(Number);
        return parts.every(part => part >= 0 && part <= 255);
    }

    buildProxyUrl(proxy) {
        if (proxy.url) return proxy.url;
        
        const protocol = proxy.protocol || 'http';
        const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
        
        return `${protocol}://${auth}${proxy.host}:${proxy.port}`;
    }

    removeDuplicateProxies(proxies) {
        const seen = new Set();
        return proxies.filter(proxy => {
            const key = `${proxy.host}:${proxy.port}:${proxy.type}`;
            if (!seen.has(key)) {
                seen.add(key);
                return true;
            }
            return false;
        });
    }

    // ==================== VPN DISCOVERY ====================
    async discoverVPNEndpoints() {
        console.log('🔍 Discovering VPN endpoints...');
        
        const discoveredVPNs = [];
        
        // 1. Add static VPN sources
        for (const vpnSource of this.vpnSources) {
            for (const endpoint of vpnSource.endpoints) {
                const vpnObj = {
                    name: vpnSource.name,
                    host: endpoint.host,
                    port: endpoint.port,
                    type: vpnSource.type,
                    protocol: vpnSource.type,
                    source: 'static_vpn',
                    requiresAuth: false,
                    isVPN: true,
                    isPremium: false,
                    country: endpoint.country || 'Unknown',
                    fetchedAt: new Date().toISOString()
                };
                
                discoveredVPNs.push(vpnObj);
            }
        }
        
        // 2. Check premium VPN providers jika dienable
        if (this.config.enablePremiumVPN) {
            for (const [providerName, provider] of Object.entries(this.vpnProviders)) {
                if (provider.requiresAuth && (!provider.username || !provider.password)) {
                    console.log(`⚠️ Skipping ${providerName} - credentials missing`);
                    continue;
                }
                
                for (const endpoint of provider.endpoints) {
                    const vpnObj = {
                        name: provider.name,
                        host: endpoint.host,
                        port: endpoint.port,
                        type: provider.type,
                        protocol: provider.type,
                        source: providerName,
                        requiresAuth: provider.requiresAuth,
                        username: provider.username,
                        password: provider.password,
                        isVPN: true,
                        isPremium: true,
                        country: endpoint.country || 'Unknown',
                        fetchedAt: new Date().toISOString()
                    };
                    
                    discoveredVPNs.push(vpnObj);
                }
            }
        }
        
        // 3. Scrape public VPN lists (opsional, bisa di skip jika timeout)
        try {
            const scrapedVPNs = await this.scrapePublicVPNs();
            discoveredVPNs.push(...scrapedVPNs);
        } catch (error) {
            console.log('⚠️ VPN scraping skipped:', error.message);
        }
        
        console.log(`🔍 Discovered ${discoveredVPNs.length} VPN endpoints`);
        return discoveredVPNs;
    }

    async scrapePublicVPNs() {
        const publicVPNs = [];
        
        try {
            // Coba scrape dari free proxy lists yang mungkin mengandung VPN
            const response = await fetch('https://www.socks-proxy.net/', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.ok) {
                const html = await response.text();
                const $ = cheerio.load(html);
                
                // Parse table
                $('#proxylisttable tbody tr').each((i, row) => {
                    const cells = $(row).find('td');
                    if (cells.length >= 7) {
                        const host = $(cells[0]).text().trim();
                        const port = parseInt($(cells[1]).text().trim());
                        const country = $(cells[3]).text().trim();
                        const type = $(cells[4]).text().toLowerCase();
                        
                        // Prioritaskan SOCKS5 (biasanya VPN)
                        if (type.includes('socks5') && host && port) {
                            publicVPNs.push({
                                name: `Public SOCKS5`,
                                host: host,
                                port: port,
                                type: 'socks5',
                                protocol: 'socks5',
                                source: 'scraped',
                                requiresAuth: false,
                                isVPN: true,
                                isPremium: false,
                                country: country,
                                fetchedAt: new Date().toISOString()
                            });
                        }
                    }
                });
                
                console.log(`✅ Scraped ${publicVPNs.length} public SOCKS5 proxies`);
            }
        } catch (error) {
            // Skip jika error
        }
        
        return publicVPNs;
    }

    // ==================== PROXY TESTING ====================
    async testProxyBatchOptimized(proxies) {
        console.log(`🧪 Testing ${proxies.length} proxies...`);
        
        const results = [];
        const batchSize = this.config.testConcurrency;
        
        for (let i = 0; i < proxies.length; i += batchSize) {
            const batch = proxies.slice(i, i + batchSize);
            const batchPromises = batch.map(proxy => 
                this.testSingleProxy(proxy).then(success => {
                    if (success && proxy.working) {
                        results.push(proxy);
                    }
                    return proxy;
                }).catch(() => null)
            );
            
            await Promise.allSettled(batchPromises);
            
            // Progress update
            const testedSoFar = Math.min(i + batchSize, proxies.length);
            const workingCount = results.length;
            if (testedSoFar % 100 === 0 || testedSoFar === proxies.length) {
                console.log(`  📊 Progress: ${testedSoFar}/${proxies.length}, Working: ${workingCount}`);
            }
            
            // Small delay between batches
            if (i + batchSize < proxies.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // Sort by response time
        const workingProxies = results
            .filter(p => p.working && p.responseTime < this.config.minProxySpeed)
            .sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999));
        
        console.log(`✅ Proxy testing complete: ${workingProxies.length}/${proxies.length} working`);
        return workingProxies;
    }

    async testSingleProxy(proxy) {
        const startTime = Date.now();
        const testUrl = this.config.proxyTestSites[Math.floor(Math.random() * this.config.proxyTestSites.length)];
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            
            const options = {
                signal: controller.signal,
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
            
            // Gunakan proxy jika bukan direct
            if (proxy.host && proxy.host !== 'direct') {
                if (proxy.type === 'socks5' || proxy.type === 'socks4') {
                    const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
                    const proxyUrl = `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
                    options.agent = new SocksProxyAgent(proxyUrl);
                } else {
                    const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
                    const proxyUrl = `${proxy.protocol || 'http'}://${auth}${proxy.host}:${proxy.port}`;
                    options.agent = new HttpsProxyAgent(proxyUrl);
                }
            }
            
            const response = await fetch(testUrl, options);
            
            clearTimeout(timeout);
            
            if (response.ok) {
                const responseTime = Date.now() - startTime;
                
                proxy.working = true;
                proxy.responseTime = responseTime;
                proxy.lastTested = new Date().toISOString();
                proxy.testResult = 'success';
                proxy.successCount = (proxy.successCount || 0) + 1;
                
                // Cek jika mendapatkan response yang valid
                const data = await response.text();
                if (data && (data.includes('ip') || data.includes('origin') || data.includes('address'))) {
                    return true;
                }
            }
        } catch (error) {
            // Skip logging untuk efisiensi
        }
        
        proxy.working = false;
        proxy.lastTested = new Date().toISOString();
        proxy.failCount = (proxy.failCount || 0) + 1;
        
        // Hapus proxy yang gagal terus
        if (proxy.failCount > 10) {
            this.removeProxy(proxy);
        }
        
        return false;
    }

    // ==================== VPN TESTING ====================
    async testVPNProxies(vpnList) {
        console.log('🔒 Testing VPN proxies...');
        
        const workingVPNs = [];
        const batchSize = 2; // VPN testing lebih lambat
        
        for (let i = 0; i < vpnList.length; i += batchSize) {
            const batch = vpnList.slice(i, i + batchSize);
            const batchPromises = batch.map(vpn => 
                this.testSingleVPN(vpn).then(result => result)
            );
            
            const results = await Promise.allSettled(batchPromises);
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    workingVPNs.push(result.value);
                }
            });
            
            // Progress update
            const testedSoFar = Math.min(i + batchSize, vpnList.length);
            if (testedSoFar % 5 === 0 || testedSoFar === vpnList.length) {
                console.log(`  📊 VPN Progress: ${testedSoFar}/${vpnList.length}, Working: ${workingVPNs.length}`);
            }
            
            // Delay lebih lama untuk VPN
            if (i + batchSize < vpnList.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Sort by response time
        const sortedVPNs = workingVPNs
            .filter(vpn => vpn.responseTime < this.config.vpnTestTimeout)
            .sort((a, b) => a.responseTime - b.responseTime);
        
        console.log(`✅ VPN testing complete: ${sortedVPNs.length}/${vpnList.length} working`);
        return sortedVPNs;
    }

    async testSingleVPN(vpn) {
        const startTime = Date.now();
        const testUrl = 'https://api.ipify.org?format=json';
        
        try {
            let agent;
            
            if (vpn.type === 'socks5') {
                const auth = vpn.requiresAuth ? `${vpn.username}:${vpn.password}@` : '';
                const proxyUrl = `socks5://${auth}${vpn.host}:${vpn.port}`;
                agent = new SocksProxyAgent(proxyUrl);
            } else {
                const auth = vpn.requiresAuth ? `${vpn.username}:${vpn.password}@` : '';
                const proxyUrl = `http://${auth}${vpn.host}:${vpn.port}`;
                agent = new HttpsProxyAgent(proxyUrl);
            }
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.config.vpnTestTimeout);
            
            const response = await fetch(testUrl, {
                signal: controller.signal,
                agent: agent,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            clearTimeout(timeout);
            
            if (response.ok) {
                const data = await response.json();
                const responseTime = Date.now() - startTime;
                
                // Verifikasi bahwa kita mendapatkan IP yang valid
                if (data.ip && data.ip !== '') {
                    vpn.working = true;
                    vpn.responseTime = responseTime;
                    vpn.externalIP = data.ip;
                    vpn.lastTested = new Date().toISOString();
                    vpn.testResult = 'success';
                    vpn.successCount = (vpn.successCount || 0) + 1;
                    
                    return vpn;
                }
            }
        } catch (error) {
            // Skip logging
        }
        
        vpn.working = false;
        vpn.lastTested = new Date().toISOString();
        vpn.failCount = (vpn.failCount || 0) + 1;
        return null;
    }

    // ==================== WEB PROXY TESTING ====================
    async testWebProxies() {
        console.log('🌐 Testing web proxies...');
        
        const workingWebProxies = [];
        
        for (const webProxy of this.webProxyGateways) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(webProxy.url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                clearTimeout(timeout);
                
                // Status 200, 403, 301, 302 berarti gateway aktif
                if ([200, 403, 301, 302].includes(response.status)) {
                    webProxy.working = true;
                    webProxy.lastChecked = new Date().toISOString();
                    workingWebProxies.push(webProxy);
                    console.log(`    ✅ ${webProxy.name} is accessible`);
                } else {
                    webProxy.working = false;
                }
            } catch (error) {
                webProxy.working = false;
            }
            
            // Delay antar test
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return workingWebProxies;
    }

    // ==================== MAIN UPDATE METHOD ====================
    async updateAllProxies() {
        console.log('🔄 UPDATING ALL PROXIES (Fresh + Web + VPN)...');
        
        const startTime = Date.now();
        
        try {
            // 1. Fetch regular proxies
            const fetchedProxies = await this.fetchProxiesFromSources();
            
            if (fetchedProxies.length === 0) {
                console.log('⚠️ No new proxies fetched, using existing pool');
                return {
                    success: true,
                    fromCache: true,
                    stats: this.stats,
                    proxies: {
                        fresh: this.freshProxies.slice(0, 30),
                        web: this.webProxies.slice(0, 3),
                        vpn: this.vpnProxies.slice(0, 5)
                    }
                };
            }
            
            // 2. Test semua proxy yang difetch
            console.log('🧪 Testing fresh proxies...');
            const testedFreshProxies = await this.testProxyBatchOptimized(fetchedProxies);
            
            // 3. Test web proxies
            console.log('🌐 Testing web proxies...');
            const workingWebProxies = await this.testWebProxies();
            
            // 4. Discover and test VPNs
            console.log('🔒 Discovering and testing VPNs...');
            const discoveredVPNs = await this.discoverVPNEndpoints();
            const workingVPNs = await this.testVPNProxies(discoveredVPNs);
            
            // 5. Update semua pools
            // Gabungkan yang baru dengan yang lama (yang masih working)
            const existingWorking = this.freshProxies.filter(p => p.working);
            this.freshProxies = [
                ...testedFreshProxies,
                ...existingWorking
            ]
            .slice(0, this.config.maxFreshProxies);
            
            this.webProxies = workingWebProxies.slice(0, this.config.maxWebProxies);
            this.vpnProxies = workingVPNs.slice(0, this.config.maxVPNProxies);
            this.lastUpdate = new Date().toISOString();
            
            // 6. Update statistics
            this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
            this.stats.vpnCount = this.vpnProxies.length;
            this.stats.lastSuccessRate = fetchedProxies.length > 0 ? 
                (testedFreshProxies.length / fetchedProxies.length) * 100 : 0;
            this.stats.lastFetchTime = Date.now() - startTime;
            
            // 7. Save to cache
            await this.saveCache();
            
            // 8. Clean up memory
            this.cleanupMemory();
            
            console.log('\n🎉 PROXY UPDATE COMPLETE:');
            console.log(`   🆕 Fresh Proxies: ${this.freshProxies.length} (${this.stats.totalWorking} working)`);
            console.log(`   🌐 Web Proxies: ${this.webProxies.length}`);
            console.log(`   🔒 VPN Proxies: ${this.vpnProxies.length}`);
            console.log(`   📊 Success Rate: ${this.stats.lastSuccessRate.toFixed(2)}%`);
            console.log(`   ⏱️  Total Time: ${this.stats.lastFetchTime}ms`);
            
            return {
                success: true,
                fromCache: false,
                stats: this.stats,
                proxies: {
                    fresh: this.freshProxies,
                    web: this.webProxies,
                    vpn: this.vpnProxies
                }
            };
            
        } catch (error) {
            console.error('❌ PROXY UPDATE FAILED:', error.message);
            
            // Return existing proxies as fallback
            return {
                success: false,
                error: error.message,
                stats: this.stats,
                proxies: {
                    fresh: this.freshProxies.slice(0, 10),
                    web: this.webProxies.slice(0, 3),
                    vpn: this.vpnProxies.slice(0, 3)
                }
            };
        }
    }

    // ==================== SMART PROXY SELECTION ====================
    getProxyForSession(sessionId, proxyType = 'fresh') {
        let proxyList = [];
        let selectedType = proxyType.toLowerCase();
        
        // Pilih pool berdasarkan type
        switch (selectedType) {
            case 'fresh':
                proxyList = this.freshProxies.filter(p => p.working && p.responseTime < this.config.minProxySpeed);
                break;
            case 'web':
                proxyList = this.webProxies.filter(p => p.working);
                break;
            case 'vpn':
                proxyList = this.vpnProxies.filter(p => p.working && p.responseTime < this.config.vpnTestTimeout);
                break;
            case 'direct':
                return this.getDirectConnection();
            default:
                proxyList = this.freshProxies.filter(p => p.working);
                selectedType = 'fresh';
        }
        
        // Jika pool kosong, coba fallback
        if (proxyList.length === 0) {
            console.log(`⚠️ No ${selectedType} proxies available, trying fallback...`);
            
            const fallbackOrder = ['fresh', 'vpn', 'web', 'direct'];
            for (const type of fallbackOrder) {
                if (type !== selectedType) {
                    const fallbackList = this.getProxiesByType(type);
                    if (fallbackList.length > 0) {
                        proxyList = fallbackList;
                        selectedType = type;
                        console.log(`   ✅ Using fallback: ${type} proxies`);
                        break;
                    }
                }
            }
        }
        
        // Jika masih kosong, gunakan direct
        if (proxyList.length === 0) {
            console.log('⚠️ No proxies available, using direct connection');
            return this.getDirectConnection();
        }
        
        // Smart selection: round-robin + performance based
        const sessionCount = this.sessionRotation.get(sessionId) || 0;
        
        // Sort proxies: first by premium status (for VPN), then by response time, then by usage
        const sortedProxies = [...proxyList].sort((a, b) => {
            // Prioritaskan premium VPN
            if (a.isPremium !== b.isPremium) {
                return b.isPremium ? 1 : -1;
            }
            // Kemudian response time
            if (a.responseTime !== b.responseTime) {
                return (a.responseTime || 9999) - (b.responseTime || 9999);
            }
            // Kemudian usage count (kurang dipakai lebih baik)
            return (a.useCount || 0) - (b.useCount || 0);
        });
        
        const selectedIndex = sessionCount % sortedProxies.length;
        const selectedProxy = sortedProxies[selectedIndex];
        
        // Update usage stats
        selectedProxy.useCount = (selectedProxy.useCount || 0) + 1;
        selectedProxy.lastUsed = new Date().toISOString();
        this.sessionRotation.set(sessionId, sessionCount + 1);
        
        // Build display name
        let displayName;
        if (selectedProxy.isVPN) {
            const premiumTag = selectedProxy.isPremium ? '⭐ ' : '';
            displayName = `${premiumTag}${selectedProxy.name} (${selectedProxy.country})`;
        } else if (selectedProxy.host === 'direct') {
            displayName = 'Direct Connection';
        } else {
            displayName = `${selectedProxy.host}:${selectedProxy.port}`;
        }
        
        console.log(`🎯 Selected ${selectedType} for ${sessionId.substring(0, 8)}: ${displayName} (${selectedProxy.responseTime}ms)`);
        
        return {
            ...selectedProxy,
            puppeteerArgs: this.getPuppeteerProxyArgs(selectedProxy),
            isDirect: selectedProxy.host === 'direct',
            actualType: selectedType,
            displayName: displayName
        };
    }

    getProxiesByType(type) {
        switch (type) {
            case 'fresh': 
                return this.freshProxies.filter(p => p.working);
            case 'web': 
                return this.webProxies.filter(p => p.working);
            case 'vpn': 
                return this.vpnProxies.filter(p => p.working);
            default: 
                return [];
        }
    }

    getDirectConnection() {
        return {
            name: 'Direct Connection',
            host: 'direct',
            port: 0,
            type: 'direct',
            protocol: 'direct',
            isDirect: true,
            isVPN: false,
            isPremium: false,
            working: true,
            responseTime: 0,
            puppeteerArgs: this.getDirectConnectionArgs(),
            displayName: 'Direct Connection'
        };
    }

    getPuppeteerProxyArgs(proxy) {
        const baseArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=site-per-process',
            '--window-size=1280,720',
            '--disable-blink-features=AutomationControlled'
        ];
        
        if (proxy.host && proxy.host !== 'direct' && proxy.port) {
            const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
            const protocol = proxy.protocol || 'http';
            const proxyUrl = `${protocol}://${auth}${proxy.host}:${proxy.port}`;
            baseArgs.push(`--proxy-server=${proxyUrl}`);
        }
        
        return baseArgs;
    }

    getDirectConnectionArgs() {
        return [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--window-size=1280,720',
            '--disable-blink-features=AutomationControlled'
        ];
    }

    // ==================== AUTO UPDATE SYSTEM ====================
    startAutoUpdate() {
        console.log('🔄 Starting auto-update system (every 30 minutes)...');
        
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
        }
        
        // Initial update jika belum ada proxies
        if (this.freshProxies.length < this.config.minWorkingProxies || this.vpnProxies.length < 3) {
            setTimeout(() => {
                this.updateAllProxies().catch(console.error);
            }, 5000);
        }
        
        // Scheduled updates
        this.autoUpdateInterval = setInterval(async () => {
            console.log('🔄 Scheduled auto-update triggered...');
            try {
                await this.updateAllProxies();
            } catch (error) {
                console.error('❌ Auto-update failed:', error.message);
            }
        }, this.config.rotationInterval);
    }

    startHealthCheck() {
        console.log('❤️ Starting proxy health check (every 5 minutes)...');
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(async () => {
            try {
                const workingCount = this.freshProxies.filter(p => p.working).length;
                const vpnWorking = this.vpnProxies.filter(p => p.working).length;
                
                console.log(`❤️ Health check: ${workingCount} fresh, ${vpnWorking} VPN working`);
                
                // Jika proxy kurang, refresh
                if (workingCount < this.config.minWorkingProxies || vpnWorking < 3) {
                    console.log(`⚠️ Low proxy count, refreshing...`);
                    await this.updateAllProxies();
                }
                
                // Test random proxies untuk menjaga kesehatan pool
                const testCount = Math.min(10, this.freshProxies.length);
                if (testCount > 0) {
                    const randomProxies = [...this.freshProxies]
                        .sort(() => Math.random() - 0.5)
                        .slice(0, testCount);
                    
                    await this.testProxyBatchOptimized(randomProxies);
                }
                
            } catch (error) {
                console.error('❌ Health check failed:', error.message);
            }
        }, this.config.healthCheckInterval);
    }

    stopAutoUpdate() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
            this.autoUpdateInterval = null;
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        console.log('⏹️ Auto-update and health check stopped');
    }

    // ==================== MEMORY MANAGEMENT ====================
    cleanupMemory() {
        console.log('🧹 Cleaning up proxy pool memory...');
        
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        // Hapus proxy yang tidak working dan sudah lama
        this.freshProxies = this.freshProxies.filter(proxy => {
            // Keep jika working
            if (proxy.working) {
                // Hapus jika terlalu lama tidak dipakai (lebih dari 1 hari)
                if (proxy.lastUsed && new Date(proxy.lastUsed).getTime() < oneDayAgo) {
                    return false;
                }
                return true;
            }
            
            // Hapus jika tidak working DAN sudah lama (lebih dari 1 jam)
            if (proxy.lastTested && new Date(proxy.lastTested).getTime() < oneHourAgo) {
                return false;
            }
            
            // Hapus proxy yang terlalu lambat
            if (proxy.responseTime && proxy.responseTime > 10000) {
                return false;
            }
            
            // Hapus proxy yang sering gagal
            if (proxy.failCount && proxy.failCount > 10) {
                return false;
            }
            
            return true;
        });
        
        // Limit pool sizes
        this.freshProxies = this.freshProxies.slice(0, this.config.maxFreshProxies);
        this.vpnProxies = this.vpnProxies.slice(0, this.config.maxVPNProxies);
        
        // Update stats
        this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
        this.stats.vpnCount = this.vpnProxies.length;
        
        console.log(`✅ Memory cleaned: ${this.stats.totalWorking} fresh, ${this.stats.vpnCount} VPN active`);
    }

    removeProxy(proxy) {
        // Hapus dari freshProxies
        const freshIndex = this.freshProxies.findIndex(p => 
            p.host === proxy.host && p.port === proxy.port
        );
        if (freshIndex !== -1) {
            this.freshProxies.splice(freshIndex, 1);
        }
        
        // Hapus dari vpnProxies
        const vpnIndex = this.vpnProxies.findIndex(p => 
            p.host === proxy.host && p.port === proxy.port
        );
        if (vpnIndex !== -1) {
            this.vpnProxies.splice(vpnIndex, 1);
        }
    }

    // ==================== UTILITY METHODS ====================
    getSourceName(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '').split('.')[0];
        } catch {
            return url.substring(0, 30);
        }
    }

    // ==================== STATISTICS & MONITORING ====================
    getAllActiveProxies() {
        const workingFresh = this.freshProxies.filter(p => p.working);
        const workingWeb = this.webProxies.filter(p => p.working);
        const workingVPN = this.vpnProxies.filter(p => p.working);
        
        // Kategorikan fresh proxies by type
        const byType = {};
        workingFresh.forEach(proxy => {
            const type = proxy.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });
        
        // Dapatkan 5 proxy tercepat
        const fastest = [...workingFresh]
            .sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999))
            .slice(0, 5);
        
        // Group VPNs by country
        const vpnByCountry = {};
        workingVPN.forEach(vpn => {
            const country = vpn.country || 'Unknown';
            vpnByCountry[country] = (vpnByCountry[country] || 0) + 1;
        });
        
        return {
            freshProxies: workingFresh,
            webProxies: workingWeb,
            vpnProxies: workingVPN,
            stats: {
                totalWorking: workingFresh.length + workingWeb.length + workingVPN.length,
                fresh: {
                    total: this.freshProxies.length,
                    working: workingFresh.length,
                    byType: byType,
                    fastest: fastest.map(p => ({
                        host: p.host,
                        port: p.port,
                        type: p.type,
                        responseTime: p.responseTime
                    }))
                },
                web: {
                    total: this.webProxies.length,
                    working: workingWeb.length
                },
                vpn: { 
                    total: this.vpnProxies.length, 
                    working: workingVPN.length,
                    premium: workingVPN.filter(v => v.isPremium).length,
                    byCountry: vpnByCountry
                },
                successRate: this.stats.lastSuccessRate,
                lastUpdate: this.lastUpdate,
                nextUpdate: this.autoUpdateInterval ? 
                    new Date(Date.now() + this.config.rotationInterval).toISOString() : null
            }
        };
    }

    getStats() {
        return {
            ...this.stats,
            pools: {
                fresh: this.freshProxies.length,
                web: this.webProxies.length,
                vpn: this.vpnProxies.length,
                workingFresh: this.freshProxies.filter(p => p.working).length,
                workingWeb: this.webProxies.filter(p => p.working).length,
                workingVPN: this.vpnProxies.filter(p => p.working).length
            },
            config: {
                minWorkingProxies: this.config.minWorkingProxies,
                rotationInterval: this.config.rotationInterval,
                cacheTTL: this.config.cacheTTL
            },
            lastUpdate: this.lastUpdate,
            startupTime: this.stats.startupTime,
            isInitialized: this.isInitialized
        };
    }

    // ==================== QUICK TEST ====================
    async quickTest() {
        console.log('🧪 Running quick proxy system test...');
        
        try {
            // Test fresh proxies
            const testFreshCount = Math.min(5, this.freshProxies.length);
            let freshWorking = 0;
            
            if (testFreshCount > 0) {
                const testProxies = [...this.freshProxies]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, testFreshCount);
                
                for (const proxy of testProxies) {
                    const isWorking = await this.testSingleProxy(proxy);
                    if (isWorking) freshWorking++;
                }
            }
            
            // Test VPN proxies
            const testVPNCount = Math.min(3, this.vpnProxies.length);
            let vpnWorking = 0;
            
            if (testVPNCount > 0) {
                const testVPNs = [...this.vpnProxies]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, testVPNCount);
                
                for (const vpn of testVPNs) {
                    const isWorking = await this.testSingleVPN(vpn);
                    if (isWorking) vpnWorking++;
                }
            }
            
            // Check web proxies
            const webWorking = this.webProxies.filter(p => p.working).length;
            
            console.log(`✅ Quick test results:`);
            console.log(`   Fresh Proxies: ${freshWorking}/${testFreshCount} working`);
            console.log(`   VPN Proxies: ${vpnWorking}/${testVPNCount} working`);
            console.log(`   Web Proxies: ${webWorking}/${this.webProxies.length} working`);
            console.log(`   Total Pool: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN`);
            
            return {
                success: freshWorking > 0 || vpnWorking > 0,
                freshProxies: freshWorking,
                vpnProxies: vpnWorking,
                webProxies: webWorking,
                totalProxies: this.freshProxies.length,
                totalVPN: this.vpnProxies.length
            };
            
        } catch (error) {
            console.error('❌ Quick test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ==================== CLEANUP ====================
    cleanup() {
        this.stopAutoUpdate();
        this.cleanupMemory();
        console.log('🧹 Proxy handler cleanup completed');
    }
}

module.exports = ProxyHandler2025;
