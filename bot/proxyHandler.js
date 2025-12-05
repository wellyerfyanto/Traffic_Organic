// ==================== PROXY HANDLER (FULL FEATURES) ====================
// Fixed for Node.js 18+ - No 'File' object usage
// ==================== FIX FOR NODE.JS - FILE IS NOT DEFINED ====================
// Stub untuk objek File yang tidak ada di Node.js
if (typeof global.File === 'undefined') {
    global.File = class File {
        constructor(blobParts, fileName, options) {
            this.name = fileName;
            this.size = blobParts.reduce((acc, part) => acc + (part.length || 0), 0);
            this.type = options?.type || '';
            this.lastModified = options?.lastModified || Date.now();
        }
        
        slice(start, end, contentType) {
            return new File([], '', { type: contentType || '' });
        }
        
        text() {
            return Promise.resolve('');
        }
        
        arrayBuffer() {
            return Promise.resolve(new ArrayBuffer(0));
        }
        
        stream() {
            const { Readable } = require('stream');
            return Readable.from([]);
        }
    };
}

// Stub untuk Blob jika belum ada
if (typeof global.Blob === 'undefined') {
    global.Blob = class Blob {
        constructor(blobParts, options) {
            this.size = blobParts.reduce((acc, part) => acc + (part.length || 0), 0);
            this.type = options?.type || '';
        }
        
        slice(start, end, contentType) {
            return new Blob([], { type: contentType || '' });
        }
        
        text() {
            return Promise.resolve('');
        }
        
        arrayBuffer() {
            return Promise.resolve(new ArrayBuffer(0));
        }
    };
}
const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

// ==================== DYNAMIC IMPORTS ====================
let fetch;
try {
    if (typeof global.fetch !== 'undefined') {
        fetch = global.fetch;
        console.log('✅ Using native fetch');
    } else {
        fetch = require('node-fetch');
        console.log('✅ Using node-fetch');
    }
} catch (error) {
    console.log('⚠️ Using node-fetch as fallback');
    fetch = require('node-fetch');
}

// Dynamic import untuk proxy agents
let SocksProxyAgent = null;
let HttpsProxyAgent = null;

try {
    const socks = require('socks-proxy-agent');
    SocksProxyAgent = socks.SocksProxyAgent || socks;
    console.log('✅ SocksProxyAgent loaded');
} catch (error) {
    console.log('⚠️ socks-proxy-agent not available, using mock');
    SocksProxyAgent = class MockSocksProxyAgent {
        constructor(url) {
            this.url = url;
        }
    };
}

try {
    const https = require('https-proxy-agent');
    HttpsProxyAgent = https.HttpsProxyAgent || https;
    console.log('✅ HttpsProxyAgent loaded');
} catch (error) {
    console.log('⚠️ https-proxy-agent not available, using mock');
    HttpsProxyAgent = class MockHttpsProxyAgent {
        constructor(url) {
            this.url = url;
        }
    };
}

// Other dependencies
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cheerio = require('cheerio');

class ProxyHandler {
    constructor() {
        // ==================== PROXY POOLS ====================
        this.freshProxies = [];    // IP:Port proxies (HTTP/HTTPS/SOCKS)
        this.webProxies = [];      // Web gateway proxies
        this.vpnProxies = [];      // VPN proxies
        this.lastUpdate = null;
        this.sessionRotation = new Map();
        this.autoUpdateInterval = null;
        this.healthCheckInterval = null;
        this.isInitialized = false;
        
        // ==================== PROXY SOURCES ====================
        this.proxySources = [
            'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_format=protocolipport&format=text&timeout=10000&ssl=yes',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks4&timeout=10000&country=all',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=10000&country=all',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt'
        ];
        
        // ==================== WEB PROXY GATEWAYS ====================
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
            }
        ];
        
        // ==================== VPN SOURCES ====================
        this.vpnSources = [
            {
                name: 'Free VPN Gateways',
                type: 'socks5',
                endpoints: [
                    { host: 'gateway.socks5.net', port: 1080, country: 'US' },
                    { host: 'free.vpnserver.com', port: 1080, country: 'NL' }
                ]
            },
            {
                name: 'Public VPN HTTP',
                type: 'http',
                endpoints: [
                    { host: 'vpn-public-http1.proxy', port: 8080, country: 'DE' },
                    { host: 'free-http-vpn.net', port: 80, country: 'SG' }
                ]
            }
        ];
        
        // ==================== CONFIGURATION ====================
        this.config = {
            maxFreshProxies: 50,
            maxWebProxies: 5,
            maxVPNProxies: 10,
            testTimeout: 40000,
            rotationInterval: 30 * 60 * 1000,
            minProxySpeed: 40000,
            testConcurrency: 3,
            minWorkingProxies: 5,
            vpnTestTimeout: 45000,
            cacheTTL: 30 * 60 * 1000,
            healthCheckInterval: 5 * 60 * 1000,
            proxyTestSites: [
                'https://httpbin.org/ip',
                'https://api.ipify.org?format=json',
                'https://ipinfo.io/json'
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
        
        console.log('🔄 ProxyHandler initialized');
    }

    // ==================== INITIALIZATION ====================
    async initialize() {
        if (this.isInitialized) {
            console.log('✅ Proxy system already initialized');
            return true;
        }
        
        console.log('🚀 Initializing proxy system...');
        
        try {
            // Load dari cache
            const cacheLoaded = await this.loadCache();
            
            if (!cacheLoaded || this.freshProxies.length < this.config.minWorkingProxies) {
                console.log('🔄 Cache insufficient or expired, updating...');
                await this.updateAllProxies();
            } else {
                console.log(`📁 Using cached proxies: ${this.freshProxies.length} fresh`);
            }
            
            // Start auto systems
            this.startAutoUpdate();
            this.startHealthCheck();
            
            this.isInitialized = true;
            console.log('✅ Proxy system fully initialized');
            return true;
            
        } catch (error) {
            console.error('❌ Proxy initialization failed:', error.message);
            
            // Fallback to mock proxies
            this.createFallbackProxies();
            this.isInitialized = true;
            return false;
        }
    }

    // ==================== CACHE MANAGEMENT ====================
    async ensureCacheDirectory() {
        try {
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) {
                await fsp.mkdir(dataDir, { recursive: true });
            }
        } catch (error) {
            console.log('⚠️ Cache directory error:', error.message);
        }
    }

    async loadCache() {
        try {
            if (!fs.existsSync(this.cacheFile)) {
                console.log('📁 No cache file found');
                return false;
            }
            
            const data = JSON.parse(await fsp.readFile(this.cacheFile, 'utf8'));
            const cacheTime = new Date(data.lastUpdate).getTime();
            const now = Date.now();
            
            if (now - cacheTime < this.config.cacheTTL) {
                this.freshProxies = data.freshProxies || [];
                this.webProxies = data.webProxies || [];
                this.vpnProxies = data.vpnProxies || [];
                this.lastUpdate = data.lastUpdate;
                
                this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
                this.stats.vpnCount = this.vpnProxies.length;
                
                console.log(`📁 Loaded from cache: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN`);
                return true;
            }
            
            console.log('📁 Cache expired');
            return false;
            
        } catch (error) {
            console.log('⚠️ Cache load error:', error.message);
            return false;
        }
    }

    async saveCache() {
        try {
            const workingFresh = this.freshProxies
                .filter(p => p.working && p.responseTime && p.responseTime < this.config.minProxySpeed)
                .slice(0, 30);
            
            const workingWeb = this.webProxies
                .filter(p => p.working)
                .slice(0, 3);
            
            const workingVPN = this.vpnProxies
                .filter(p => p.working && p.responseTime && p.responseTime < this.config.vpnTestTimeout)
                .slice(0, 5);
            
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
            
            await fsp.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
            console.log(`💾 Saved cache: ${workingFresh.length} fresh, ${workingVPN.length} VPN`);
            
        } catch (error) {
            console.log('⚠️ Cache save error:', error.message);
        }
    }

    // ==================== FALLBACK SYSTEM ====================
    createFallbackProxies() {
        console.log('🔄 Creating fallback proxy list...');
        
        // Fresh proxies fallback
        this.freshProxies = [
            { 
                host: '45.77.56.113', port: 3128, type: 'http', protocol: 'http',
                country: 'US', working: true, responseTime: 200,
                name: 'US HTTP Proxy', source: 'fallback'
            },
            { 
                host: '209.97.150.167', port: 8080, type: 'http', protocol: 'http',
                country: 'UK', working: true, responseTime: 250,
                name: 'UK HTTP Proxy', source: 'fallback'
            },
            { 
                host: '185.199.229.156', port: 7492, type: 'socks5', protocol: 'socks5',
                country: 'CA', working: true, responseTime: 300,
                name: 'CA SOCKS5 Proxy', source: 'fallback', isVPN: false
            }
        ];
        
        // VPN proxies fallback
        this.vpnProxies = [
            {
                host: 'vpn-gateway.socks5.net',
                port: 1080,
                type: 'socks5',
                protocol: 'socks5',
                country: 'US',
                working: true,
                responseTime: 350,
                name: 'US VPN Gateway',
                source: 'fallback',
                isVPN: true
            },
            {
                host: 'free-vpn-gateway.com',
                port: 1080,
                type: 'socks5',
                protocol: 'socks5',
                country: 'NL',
                working: true,
                responseTime: 400,
                name: 'NL VPN Gateway',
                source: 'fallback',
                isVPN: true
            }
        ];
        
        // Web proxies
        this.webProxies = this.webProxyGateways.map(gateway => ({
            ...gateway,
            working: true,
            lastChecked: new Date().toISOString()
        }));
        
        this.lastUpdate = new Date().toISOString();
        this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
        this.stats.vpnCount = this.vpnProxies.length;
        
        console.log(`✅ Created fallback: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN`);
    }

    // ==================== PROXY FETCHING ====================
    async fetchProxiesFromSources() {
        console.log('🌐 Fetching proxies from sources...');
        
        const allProxies = [];
        const sourceResults = {};
        
        const fetchPromises = this.proxySources.map(async (source, index) => {
            const sourceName = this.getSourceName(source);
            
            try {
                console.log(`  📥 [${index + 1}/${this.proxySources.length}] ${sourceName}`);
                
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                
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
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
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
        
        const results = await Promise.allSettled(fetchPromises);
        
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                allProxies.push(...result.value);
            }
        });
        
        this.stats.sourceSuccess = sourceResults;
        this.stats.totalFetched = allProxies.length;
        
        const uniqueProxies = this.removeDuplicateProxies(allProxies);
        console.log(`  🔄 Unique proxies: ${uniqueProxies.length}/${allProxies.length}`);
        
        return uniqueProxies;
    }

    parseProxyList(text, source) {
        const proxies = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
            
            const cleanLine = trimmed.replace(/[^\x00-\x7F]/g, '');
            
            const patterns = [
                /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/,
                /(\w+):\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/
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
                    useCount: 0,
                    lastUsed: null,
                    successCount: 0,
                    failCount: 0,
                    isVPN: false
                };
                
                if (match[1] && match[2]) {
                    proxyObj.host = match[1];
                    proxyObj.port = parseInt(match[2]);
                    
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
                    country: endpoint.country || 'Unknown',
                    fetchedAt: new Date().toISOString()
                };
                
                discoveredVPNs.push(vpnObj);
            }
        }
        
        console.log(`🔍 Discovered ${discoveredVPNs.length} VPN endpoints`);
        return discoveredVPNs;
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
            
            const testedSoFar = Math.min(i + batchSize, proxies.length);
            const workingCount = results.length;
            if (testedSoFar % 50 === 0 || testedSoFar === proxies.length) {
                console.log(`  📊 Progress: ${testedSoFar}/${proxies.length}, Working: ${workingCount}`);
            }
            
            if (i + batchSize < proxies.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
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
            
            if (proxy.host && proxy.host !== 'direct') {
                if (proxy.type === 'socks5' || proxy.type === 'socks4') {
                    const proxyUrl = `${proxy.type}://${proxy.host}:${proxy.port}`;
                    
                    if (SocksProxyAgent && typeof SocksProxyAgent === 'function') {
                        options.agent = new SocksProxyAgent(proxyUrl);
                    }
                } else {
                    const proxyUrl = `${proxy.protocol || 'http'}://${proxy.host}:${proxy.port}`;
                    
                    if (HttpsProxyAgent && typeof HttpsProxyAgent === 'function') {
                        options.agent = new HttpsProxyAgent(proxyUrl);
                    }
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
                
                return true;
            }
        } catch (error) {
            // Skip logging
        }
        
        proxy.working = false;
        proxy.lastTested = new Date().toISOString();
        proxy.failCount = (proxy.failCount || 0) + 1;
        
        if (proxy.failCount > 5) {
            this.removeProxy(proxy);
        }
        
        return false;
    }

    // ==================== VPN TESTING ====================
    async testVPNProxies(vpnList) {
        console.log('🔒 Testing VPN proxies...');
        
        const workingVPNs = [];
        const batchSize = 2;
        
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
            
            const testedSoFar = Math.min(i + batchSize, vpnList.length);
            if (testedSoFar % 5 === 0 || testedSoFar === vpnList.length) {
                console.log(`  📊 VPN Progress: ${testedSoFar}/${vpnList.length}, Working: ${workingVPNs.length}`);
            }
            
            if (i + batchSize < vpnList.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
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
            let agent = null;
            
            if (vpn.type === 'socks5') {
                const proxyUrl = `socks5://${vpn.host}:${vpn.port}`;
                
                if (SocksProxyAgent && typeof SocksProxyAgent === 'function') {
                    agent = new SocksProxyAgent(proxyUrl);
                }
            } else {
                const proxyUrl = `http://${vpn.host}:${vpn.port}`;
                
                if (HttpsProxyAgent && typeof HttpsProxyAgent === 'function') {
                    agent = new HttpsProxyAgent(proxyUrl);
                }
            }
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.config.vpnTestTimeout);
            
            const fetchOptions = {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
            
            if (agent) {
                fetchOptions.agent = agent;
            }
            
            const response = await fetch(testUrl, fetchOptions);
            
            clearTimeout(timeout);
            
            if (response.ok) {
                const data = await response.json();
                const responseTime = Date.now() - startTime;
                
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
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return workingWebProxies;
    }

    // ==================== MAIN UPDATE METHOD ====================
    async updateAllProxies() {
        console.log('🔄 UPDATING ALL PROXIES...');
        
        const startTime = Date.now();
        
        try {
            // 1. Fetch proxies
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
            
            // 2. Test fresh proxies
            console.log('🧪 Testing fresh proxies...');
            const testedFreshProxies = await this.testProxyBatchOptimized(fetchedProxies);
            
            // 3. Test web proxies
            console.log('🌐 Testing web proxies...');
            const workingWebProxies = await this.testWebProxies();
            
            // 4. Discover and test VPNs
            console.log('🔒 Discovering and testing VPNs...');
            const discoveredVPNs = await this.discoverVPNEndpoints();
            const workingVPNs = await this.testVPNProxies(discoveredVPNs);
            
            // 5. Update pools
            const existingWorking = this.freshProxies.filter(p => p.working);
            this.freshProxies = [
                ...testedFreshProxies,
                ...existingWorking
            ].slice(0, this.config.maxFreshProxies);
            
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
            
            // 8. Clean up
            this.cleanupMemory();
            
            console.log('\n🎉 PROXY UPDATE COMPLETE:');
            console.log(`   🆕 Fresh Proxies: ${this.freshProxies.length}`);
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
        
        if (proxyList.length === 0) {
            console.log('⚠️ No proxies available, using direct connection');
            return this.getDirectConnection();
        }
        
        const sessionCount = this.sessionRotation.get(sessionId) || 0;
        
        const sortedProxies = [...proxyList].sort((a, b) => {
            if (a.responseTime !== b.responseTime) {
                return (a.responseTime || 9999) - (b.responseTime || 9999);
            }
            return (a.useCount || 0) - (b.useCount || 0);
        });
        
        const selectedIndex = sessionCount % sortedProxies.length;
        const selectedProxy = sortedProxies[selectedIndex];
        
        selectedProxy.useCount = (selectedProxy.useCount || 0) + 1;
        selectedProxy.lastUsed = new Date().toISOString();
        this.sessionRotation.set(sessionId, sessionCount + 1);
        
        let displayName;
        if (selectedProxy.isVPN) {
            displayName = `${selectedProxy.name} (${selectedProxy.country})`;
        } else if (selectedProxy.host === 'direct') {
            displayName = 'Direct Connection';
        } else {
            displayName = `${selectedProxy.host}:${selectedProxy.port}`;
        }
        
        console.log(`🎯 Selected ${selectedType} for ${sessionId.substring(0, 8)}: ${displayName} (${selectedProxy.responseTime}ms)`);
        
        const proxyUrl = `${selectedProxy.protocol || 'http'}://${selectedProxy.host}:${selectedProxy.port}`;
        
        return {
            ...selectedProxy,
            puppeteerArgs: selectedProxy.host === 'direct' ? 
                this.getDirectConnectionArgs() : 
                [`--proxy-server=${proxyUrl}`, ...this.getDirectConnectionArgs()],
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
            working: true,
            responseTime: 0,
            puppeteerArgs: this.getDirectConnectionArgs(),
            displayName: 'Direct Connection'
        };
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
            '--window-size=1280,720'
        ];
    }

    // ==================== AUTO UPDATE SYSTEM ====================
    startAutoUpdate() {
        console.log('🔄 Starting auto-update system (every 30 minutes)...');
        
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
        }
        
        if (this.freshProxies.length < this.config.minWorkingProxies) {
            setTimeout(() => {
                this.updateAllProxies().catch(console.error);
            }, 5000);
        }
        
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
                
                if (workingCount < this.config.minWorkingProxies) {
                    console.log(`⚠️ Low proxy count, refreshing...`);
                    await this.updateAllProxies();
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
        
        this.freshProxies = this.freshProxies.filter(proxy => {
            if (proxy.working) {
                if (proxy.lastUsed && new Date(proxy.lastUsed).getTime() < oneDayAgo) {
                    return false;
                }
                return true;
            }
            
            if (proxy.lastTested && new Date(proxy.lastTested).getTime() < oneHourAgo) {
                return false;
            }
            
            if (proxy.responseTime && proxy.responseTime > 10000) {
                return false;
            }
            
            if (proxy.failCount && proxy.failCount > 10) {
                return false;
            }
            
            return true;
        });
        
        this.freshProxies = this.freshProxies.slice(0, this.config.maxFreshProxies);
        this.vpnProxies = this.vpnProxies.slice(0, this.config.maxVPNProxies);
        
        this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
        this.stats.vpnCount = this.vpnProxies.length;
        
        console.log(`✅ Memory cleaned: ${this.stats.totalWorking} fresh, ${this.stats.vpnCount} VPN active`);
    }

    removeProxy(proxy) {
        const freshIndex = this.freshProxies.findIndex(p => 
            p.host === proxy.host && p.port === proxy.port
        );
        if (freshIndex !== -1) {
            this.freshProxies.splice(freshIndex, 1);
        }
        
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
        
        const byType = {};
        workingFresh.forEach(proxy => {
            const type = proxy.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });
        
        const fastest = [...workingFresh]
            .sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999))
            .slice(0, 5);
        
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

// ==================== EXPORT ====================
module.exports = ProxyHandler;
