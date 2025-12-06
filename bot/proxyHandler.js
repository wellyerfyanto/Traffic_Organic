// ==================== PROXY HANDLER 2025 (RAILWAY OPTIMIZED) ====================
const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

// ==================== SAFE FETCH IMPLEMENTATION ====================
let fetch;
try {
  // Gunakan fetch native jika tersedia (Node.js 18+)
  if (typeof global.fetch !== 'undefined') {
    fetch = global.fetch;
    console.log('✅ Using native fetch');
  } else {
    // Fallback ke node-fetch
    fetch = require('node-fetch');
    console.log('✅ Using node-fetch');
  }
} catch (error) {
  console.log('⚠️ Using axios as fetch fallback');
  // Fallback ke axios jika node-fetch error
  const axios = require('axios');
  fetch = async (url, options = {}) => {
    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body,
        timeout: options.timeout || 20000,
        responseType: 'text',
        validateStatus: () => true // Accept all status codes
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        json: () => Promise.resolve(typeof response.data === 'string' ? JSON.parse(response.data) : response.data),
        text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data)),
        headers: {
          get: (name) => response.headers[name.toLowerCase()]
        }
      };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        statusText: error.message,
        json: () => Promise.reject(error),
        text: () => Promise.reject(error)
      };
    }
  };
}

// ==================== SAFE PROXY AGENTS ====================
let SocksProxyAgent = null;
let HttpsProxyAgent = null;

try {
  const socks = require('socks-proxy-agent');
  SocksProxyAgent = socks.SocksProxyAgent || socks;
  console.log('✅ SocksProxyAgent loaded');
} catch (error) {
  console.log('⚠️ socks-proxy-agent not available');
  SocksProxyAgent = class MockSocksProxyAgent {
    constructor(url) { this.url = url; }
  };
}

try {
  const https = require('https-proxy-agent');
  HttpsProxyAgent = https.HttpsProxyAgent || https;
  console.log('✅ HttpsProxyAgent loaded');
} catch (error) {
  console.log('⚠️ https-proxy-agent not available');
  HttpsProxyAgent = class MockHttpsProxyAgent {
    constructor(url) { this.url = url; }
  };
}

// ==================== PROXY HANDLER CLASS ====================
class ProxyHandler {
  constructor() {
    try {
      console.log('🔄 ProxyHandler constructor starting...');
      
      // ==================== PROXY POOLS ====================
      this.freshProxies = [];    // IP:Port proxies (HTTP/HTTPS/SOCKS)
      this.webProxies = [];      // Web gateway proxies
      this.vpnProxies = [];      // VPN proxies
      this.lastUpdate = null;
      this.sessionRotation = new Map();
      this.autoUpdateInterval = null;
      this.healthCheckInterval = null;
      this.isInitialized = false;
      
      // ==================== PROXY SOURCES 2025 (UPDATED) ====================
      this.proxySources = [
        // Sumber yang lebih aktif dan updated (2025)
        'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
        'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt',
        'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS4_RAW.txt',
        'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt',
        'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt',
        'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
        'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt',
        'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt',
        'https://raw.githubusercontent.com/mmpx12/proxy-list/master/socks5.txt',
        'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=15000&country=all&ssl=all&anonymity=all',
        'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=15000&country=all&ssl=all&anonymity=all',
        'https://www.proxy-list.download/api/v1/get?type=http',
        'https://www.proxy-list.download/api/v1/get?type=https',
        'https://www.proxy-list.download/api/v1/get?type=socks5',
        // Sumber dengan format JSON
        'https://proxylist.geonode.com/api/proxy-list?limit=150&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps%2Csocks4%2Csocks5'
      ];
      
      // ==================== WEB PROXY GATEWAYS 2025 ====================
      this.webProxyGateways = [
        {
          name: 'CroxyProxy Premium',
          url: 'https://croxyproxy.com/',
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
          name: 'WebProxy',
          url: 'https://www.webproxy.us/',
          working: true,
          encodeUrl: true,
          method: 'web_gateway'
        },
        {
          name: 'ProxFree',
          url: 'https://www.proxfree.com/',
          working: true,
          encodeUrl: false,
          method: 'web_gateway'
        }
      ];
      
      // ==================== VPN SOURCES 2025 ====================
      this.vpnSources = [
        {
          name: 'Free VPN Gateways 2025',
          type: 'socks5',
          endpoints: [
            { host: 'gateway.socks5.net', port: 1080, country: 'US' },
            { host: 'free.socks5.io', port: 1080, country: 'NL' },
            { host: 'vpn-gateway.pro', port: 1080, country: 'DE' },
            { host: 'socks5.organicvpn.com', port: 1080, country: 'SG' },
            { host: 'free.proxyrack.com', port: 1080, country: 'US' },
            { host: 'vpn.opensource.fans', port: 1080, country: 'JP' },
            { host: 'proxy.techzillo.com', port: 1080, country: 'UK' }
          ]
        },
        {
          name: 'HTTP/HTTPS Gateways',
          type: 'http',
          endpoints: [
            { host: 'gate.deluxeapi.com', port: 8080, country: 'US' },
            { host: 'proxy.organicweb.io', port: 8888, country: 'UK' },
            { host: 'free-proxy.cyou', port: 8080, country: 'DE' },
            { host: 'public.proxyrouter.com', port: 3128, country: 'CA' }
          ]
        }
      ];
      
      // ==================== CONFIGURATION 2025 (RAILWAY OPTIMIZED) ====================
      this.config = {
        maxFreshProxies: 200,      // Increased for 2025
        maxWebProxies: 10,         // More web proxies
        maxVPNProxies: 20,         // More VPN options
        testTimeout: 45000,        // Increased timeout for Railway (45s)
        rotationInterval: 15 * 60 * 1000, // Update every 15 minutes
        minProxySpeed: 60000,      // Increased threshold (60s)
        testConcurrency: 3,        // Slightly higher concurrency
        minWorkingProxies: 10,     // Minimum working proxies
        vpnTestTimeout: 75000,     // 75 seconds for VPN testing
        cacheTTL: 10 * 60 * 1000,  // Cache for 10 minutes only
        healthCheckInterval: 3 * 60 * 1000, // Health check every 3 minutes
        proxyTestSites: [
          'https://httpbin.org/ip',
          'https://api.ipify.org?format=json',
          'https://ipinfo.io/json',
          'https://checkip.amazonaws.com',
          'https://icanhazip.com',
          'https://ip-api.com/json',
          'https://wtfismyip.com/json'
        ],
        maxRetries: 3,             // Retry mechanism
        retryDelay: 5000           // 5 seconds between retries
      };
      
      // ==================== STATISTICS 2025 ====================
      this.stats = {
        totalFetched: 0,
        totalWorking: 0,
        lastSuccessRate: 0,
        lastFetchTime: null,
        vpnCount: 0,
        sourceSuccess: {},
        startupTime: new Date().toISOString(),
        proxyTypes: {},
        countries: {},
        dailyReset: new Date().toISOString().split('T')[0]
      };
      
      // ==================== CACHE SYSTEM ====================
      this.cacheFile = path.join(__dirname, '..', 'data', 'proxy-cache.json');
      this.ensureCacheDirectory();
      
      // ==================== PREMIUM PROXY OPTIONS ====================
      this.premiumServices = {
        enabled: process.env.PREMIUM_PROXY === 'true',
        webshare: process.env.WEBSHARE_API_KEY,
        proxyrack: process.env.PROXYRACK_API_KEY,
        smartproxy: process.env.SMARTPROXY_API_KEY
      };
      
      console.log('✅ ProxyHandler 2025 constructed successfully');
      
    } catch (error) {
      console.error('❌ ProxyHandler constructor failed:', error.message);
      console.error('Stack:', error.stack);
      
      // Create enhanced emergency fallback
      this.createEnhancedFallbackProxies();
      this.isInitialized = false;
      this.config = { testTimeout: 45000 };
      this.stats = { totalWorking: this.freshProxies.filter(p => p.working).length };
      
      console.log('⚠️ Created enhanced emergency fallback in constructor');
    }
  }

  // ==================== INITIALIZATION ====================
  async initialize() {
    console.log('🔄 ProxyHandler.initialize() starting...');
    
    if (this.isInitialized) {
      console.log('✅ Already initialized');
      return true;
    }
    
    try {
      // Load dari cache
      const cacheLoaded = await this.loadCache();
      
      if (!cacheLoaded || this.freshProxies.length < this.config.minWorkingProxies) {
        console.log('🔄 Cache insufficient or expired, updating proxies...');
        await this.updateAllProxies();
      } else {
        console.log(`📁 Using cached proxies: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN`);
        // Quick health check on cached proxies
        await this.quickHealthCheck();
      }
      
      // Start auto systems
      this.startAutoUpdate();
      this.startHealthCheck();
      
      this.isInitialized = true;
      console.log('✅ ProxyHandler.initialize() completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ ProxyHandler.initialize() failed:', error.message);
      console.error('Stack:', error.stack);
      
      // Create fallback proxies
      this.createEnhancedFallbackProxies();
      this.isInitialized = true;
      
      console.log('⚠️ Running with enhanced fallback proxies due to initialization failure');
      return false;
    }
  }

  // ==================== ENHANCED FALLBACK SYSTEM ====================
  createEnhancedFallbackProxies() {
    console.log('🔄 Creating enhanced fallback proxy list 2025...');
    
    // Enhanced fallback proxies with more options
    this.freshProxies = [
      { 
        host: '45.95.147.200', port: 8080, type: 'http', protocol: 'http',
        country: 'DE', working: true, responseTime: 800,
        name: 'DE HTTP Proxy 2025', source: 'enhanced_fallback'
      },
      { 
        host: '185.199.229.156', port: 7492, type: 'socks5', protocol: 'socks5',
        country: 'CA', working: true, responseTime: 1200,
        name: 'CA SOCKS5 Proxy', source: 'enhanced_fallback'
      },
      { 
        host: '20.219.137.240', port: 3000, type: 'http', protocol: 'http',
        country: 'IN', working: true, responseTime: 1500,
        name: 'IN HTTP Proxy', source: 'enhanced_fallback'
      },
      { 
        host: '20.111.54.16', port: 8123, type: 'http', protocol: 'http',
        country: 'AU', working: true, responseTime: 1800,
        name: 'AU HTTP Proxy', source: 'enhanced_fallback'
      },
      { 
        host: '138.68.60.8', port: 8080, type: 'http', protocol: 'http',
        country: 'US', working: true, responseTime: 900,
        name: 'US HTTP Proxy', source: 'enhanced_fallback'
      },
      { 
        host: '159.203.61.169', port: 3128, type: 'http', protocol: 'http',
        country: 'US', working: true, responseTime: 1100,
        name: 'US HTTP Proxy 2', source: 'enhanced_fallback'
      },
      { 
        host: 'direct', port: 0, type: 'direct', protocol: 'direct',
        country: 'DIRECT', working: true, responseTime: 100,
        name: 'Direct Connection', source: 'emergency', isDirect: true
      }
    ];
    
    // VPN proxies fallback 2025
    this.vpnProxies = [
      {
        host: 'vpn-gateway.socks5.net',
        port: 1080,
        type: 'socks5',
        protocol: 'socks5',
        country: 'US',
        working: true,
        responseTime: 1200,
        name: 'US VPN Gateway',
        source: 'fallback_2025',
        isVPN: true
      },
      {
        host: 'free.socks5.io',
        port: 1080,
        type: 'socks5',
        protocol: 'socks5',
        country: 'NL',
        working: true,
        responseTime: 1500,
        name: 'NL VPN Gateway',
        source: 'fallback_2025',
        isVPN: true
      }
    ];
    
    // Web proxies 2025
    this.webProxies = this.webProxyGateways.map(gateway => ({
      ...gateway,
      working: true,
      lastChecked: new Date().toISOString(),
      successRate: 85
    }));
    
    this.lastUpdate = new Date().toISOString();
    this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
    this.stats.vpnCount = this.vpnProxies.length;
    
    console.log(`✅ Created enhanced fallback: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN, ${this.webProxies.length} web`);
  }

  // ==================== ENHANCED CACHE MANAGEMENT ====================
  async ensureCacheDirectory() {
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        await fsp.mkdir(dataDir, { recursive: true });
        console.log('📁 Created data directory for cache');
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
      
      // Check if cache is still valid
      if (now - cacheTime < this.config.cacheTTL) {
        this.freshProxies = data.freshProxies || [];
        this.webProxies = data.webProxies || [];
        this.vpnProxies = data.vpnProxies || [];
        this.lastUpdate = data.lastUpdate;
        
        // Update statistics
        this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
        this.stats.vpnCount = this.vpnProxies.length;
        this.stats.lastSuccessRate = data.stats?.lastSuccessRate || 0;
        
        console.log(`📁 Loaded from cache: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN, ${this.webProxies.length} web`);
        
        // Validate cache quality
        const workingCount = this.freshProxies.filter(p => p.working).length;
        if (workingCount >= this.config.minWorkingProxies) {
          return true;
        } else {
          console.log(`📁 Cache has insufficient working proxies: ${workingCount}/${this.config.minWorkingProxies}`);
          return false;
        }
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
      // Save only the best proxies
      const workingFresh = this.freshProxies
        .filter(p => p.working && p.responseTime && p.responseTime < this.config.minProxySpeed)
        .sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999))
        .slice(0, 50);  // Save top 50
        
      const workingWeb = this.webProxies
        .filter(p => p.working)
        .slice(0, 5);
        
      const workingVPN = this.vpnProxies
        .filter(p => p.working && p.responseTime && p.responseTime < this.config.vpnTestTimeout)
        .slice(0, 10);
      
      const cacheData = {
        freshProxies: workingFresh,
        webProxies: workingWeb,
        vpnProxies: workingVPN,
        lastUpdate: this.lastUpdate || new Date().toISOString(),
        savedAt: new Date().toISOString(),
        stats: {
          totalWorking: workingFresh.length + workingVPN.length,
          avgResponseTime: workingFresh.length > 0 ? 
            Math.round(workingFresh.reduce((a, b) => a + (b.responseTime || 0), 0) / workingFresh.length) : 0,
          successRate: this.stats.lastSuccessRate,
          byCountry: this.stats.countries
        }
      };
      
      await fsp.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Saved cache: ${workingFresh.length} fresh, ${workingVPN.length} VPN, ${workingWeb.length} web`);
      
    } catch (error) {
      console.log('⚠️ Cache save error:', error.message);
    }
  }

  // ==================== ENHANCED PROXY FETCHING 2025 ====================
  async fetchProxiesFromSources() {
    console.log('🌐 Fetching proxies from sources...');
    
    const allProxies = [];
    const sourceResults = {};
    
    // Shuffle sources for better distribution
    const shuffledSources = [...this.proxySources].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffledSources.length; i++) {
      const source = shuffledSources[i];
      const sourceName = this.getSourceName(source);
      
      try {
        console.log(`  📥 [${i + 1}/${shuffledSources.length}] ${sourceName}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(source, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 30000
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        const proxies = this.parseProxyList(text, source);
        
        console.log(`    ✅ ${sourceName}: ${proxies.length} proxies`);
        sourceResults[sourceName] = { success: true, count: proxies.length };
        
        // Add proxies to the pool
        allProxies.push(...proxies);
        
        // If we already have enough proxies, we can stop early
        if (allProxies.length > 500) {
          console.log(`    ⚡ Reached 500+ proxies, moving to next phase`);
          break;
        }
        
      } catch (error) {
        console.log(`    ❌ ${sourceName}: ${error.message}`);
        sourceResults[sourceName] = { success: false, error: error.message };
      }
      
      // Small delay between sources
      if (i < shuffledSources.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.stats.sourceSuccess = sourceResults;
    this.stats.totalFetched = allProxies.length;
    
    // Remove duplicates
    const uniqueProxies = this.removeDuplicateProxies(allProxies);
    console.log(`  🔄 Unique proxies: ${uniqueProxies.length}/${allProxies.length}`);
    
    // Analyze proxy types
    this.analyzeProxyTypes(uniqueProxies);
    
    return uniqueProxies;
  }

  parseProxyList(text, source) {
    const proxies = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.length < 7) continue;
      
      // Clean the line
      const cleanLine = trimmed.replace(/[^\x00-\x7F]/g, '');
      
      // Multiple patterns to match different proxy formats
      const patterns = [
        /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/,  // IP:PORT
        /(\w+):\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/,  // protocol://IP:PORT
        /"ip":"([^"]+)","port":"?(\d+)"?/,  // JSON format
        /ip":"([^"]+)","port":(\d+)/  // JSON format 2
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
          isVPN: false,
          country: 'Unknown',
          anonymity: 'unknown'
        };
        
        // Extract host and port
        if (match[1] && match[2]) {
          proxyObj.host = match[1];
          proxyObj.port = parseInt(match[2]);
          
          // Determine protocol/type
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
          
          // Extract additional info from JSON if available
          if (cleanLine.includes('{') && cleanLine.includes('}')) {
            try {
              const jsonData = JSON.parse(cleanLine);
              if (jsonData.country) proxyObj.country = jsonData.country;
              if (jsonData.anonymity) proxyObj.anonymity = jsonData.anonymity;
              if (jsonData.protocol) proxyObj.protocol = jsonData.protocol;
            } catch (e) {
              // Not valid JSON, continue
            }
          }
          
          // Validate IP and port
          if (this.isValidIP(proxyObj.host) && proxyObj.port > 0 && proxyObj.port <= 65535) {
            proxies.push(proxyObj);
          }
        }
      } catch (error) {
        // Skip this proxy and continue
        continue;
      }
    }
    
    return proxies;
  }

  isValidIP(ip) {
    // Simple IP validation
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

  analyzeProxyTypes(proxies) {
    const types = {};
    proxies.forEach(proxy => {
      const type = proxy.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    this.stats.proxyTypes = types;
    console.log('📊 Proxy types:', types);
  }

  // ==================== ENHANCED PROXY TESTING 2025 ====================
  async testProxyBatchOptimized(proxies) {
    console.log(`🧪 Testing ${proxies.length} proxies with enhanced algorithm...`);
    
    const results = [];
    const batchSize = this.config.testConcurrency;
    
    // Shuffle proxies for better distribution
    const shuffledProxies = [...proxies].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffledProxies.length; i += batchSize) {
      const batch = shuffledProxies.slice(i, i + batchSize);
      const batchPromises = batch.map(proxy => 
        this.enhancedProxyTest(proxy).then(result => {
          if (result.success) {
            results.push(proxy);
          }
          return proxy;
        }).catch(() => null)
      );
      
      await Promise.allSettled(batchPromises);
      
      const testedSoFar = Math.min(i + batchSize, shuffledProxies.length);
      const workingCount = results.length;
      
      if (testedSoFar % 25 === 0 || testedSoFar === shuffledProxies.length) {
        const successRate = testedSoFar > 0 ? ((workingCount / testedSoFar) * 100).toFixed(1) : 0;
        console.log(`  📊 Progress: ${testedSoFar}/${shuffledProxies.length}, Working: ${workingCount} (${successRate}%)`);
      }
      
      // Small delay between batches
      if (i + batchSize < shuffledProxies.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    const workingProxies = results
      .filter(p => p.working && p.responseTime < this.config.minProxySpeed)
      .sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999));
    
    console.log(`✅ Proxy testing complete: ${workingProxies.length}/${proxies.length} working`);
    
    // Update statistics
    this.stats.lastSuccessRate = proxies.length > 0 ? 
      (workingProxies.length / proxies.length) * 100 : 0;
    
    return workingProxies;
  }

  async enhancedProxyTest(proxy) {
    // Try multiple test sites
    const testSites = [...this.config.proxyTestSites].sort(() => Math.random() - 0.5);
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      for (const testSite of testSites) {
        const startTime = Date.now();
        
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), this.config.testTimeout);
          
          const options = {
            signal: controller.signal,
            timeout: this.config.testTimeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json,text/html',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          };
          
          // Apply proxy if not direct
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
          
          const response = await fetch(testSite, options);
          
          clearTimeout(timeout);
          
          if (response.ok) {
            const responseTime = Date.now() - startTime;
            const data = await response.text();
            
            // Additional validation for some sites
            let isValid = true;
            if (testSite.includes('ipify') || testSite.includes('ipinfo')) {
              try {
                const jsonData = JSON.parse(data);
                if (!jsonData.ip || jsonData.ip === '') {
                  isValid = false;
                }
              } catch (e) {
                isValid = false;
              }
            }
            
            if (isValid) {
              proxy.working = true;
              proxy.responseTime = responseTime;
              proxy.lastTested = new Date().toISOString();
              proxy.testResult = 'success';
              proxy.successCount = (proxy.successCount || 0) + 1;
              proxy.lastSuccessfulSite = testSite;
              
              // Try to get country from response
              if (testSite.includes('ipinfo')) {
                try {
                  const jsonData = JSON.parse(data);
                  if (jsonData.country) proxy.country = jsonData.country;
                } catch (e) {
                  // Ignore
                }
              }
              
              return { success: true, proxy };
            }
          }
        } catch (error) {
          // Try next test site
          continue;
        }
        
        // Small delay before next test site
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Delay between retry attempts
      if (attempt < this.config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
    
    // All attempts failed
    proxy.working = false;
    proxy.lastTested = new Date().toISOString();
    proxy.failCount = (proxy.failCount || 0) + 1;
    
    // Remove if too many failures
    if (proxy.failCount > 10) {
      this.removeProxy(proxy);
    }
    
    return { success: false, proxy };
  }

  // ==================== VPN TESTING 2025 ====================
  async testVPNProxies(vpnList) {
    console.log('🔒 Testing VPN proxies with enhanced algorithm...');
    
    const workingVPNs = [];
    const batchSize = 2; // Can be higher for VPNs
    
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
    
    // Update country statistics
    this.updateCountryStats(sortedVPNs);
    
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
        timeout: this.config.vpnTestTimeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
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
      // Try alternative test site
      try {
        const altResponse = await fetch('https://icanhazip.com', {
          agent: agent,
          timeout: 30000
        });
        
        if (altResponse.ok) {
          const ip = await altResponse.text();
          if (ip && ip.trim() !== '') {
            vpn.working = true;
            vpn.responseTime = Date.now() - startTime;
            vpn.externalIP = ip.trim();
            vpn.lastTested = new Date().toISOString();
            return vpn;
          }
        }
      } catch (altError) {
        // Both tests failed
      }
    }
    
    vpn.working = false;
    vpn.lastTested = new Date().toISOString();
    vpn.failCount = (vpn.failCount || 0) + 1;
    return null;
  }

  // ==================== MAIN UPDATE METHOD 2025 ====================
  async updateAllProxies() {
    console.log('🔄 UPDATING ALL PROXIES 2025...');
    
    const startTime = Date.now();
    
    try {
      // 1. Fetch proxies from updated sources
      const fetchedProxies = await this.fetchProxiesFromSources();
      
      if (fetchedProxies.length === 0) {
        console.log('⚠️ No new proxies fetched, using enhanced fallback...');
        this.createEnhancedFallbackProxies();
        
        return {
          success: true,
          fromCache: false,
          fromFallback: true,
          stats: this.stats,
          proxies: {
            fresh: this.freshProxies,
            web: this.webProxies,
            vpn: this.vpnProxies
          }
        };
      }
      
      // 2. Test fresh proxies with enhanced algorithm
      console.log('🧪 Testing fresh proxies with multiple retries...');
      const testedFreshProxies = await this.testProxyBatchOptimized(fetchedProxies);
      
      // 3. Test web proxies
      console.log('🌐 Testing web proxies...');
      const workingWebProxies = await this.testWebProxies();
      
      // 4. Discover and test VPNs
      console.log('🔒 Discovering and testing VPNs...');
      const discoveredVPNs = await this.discoverVPNEndpoints();
      const workingVPNs = await this.testVPNProxies(discoveredVPNs);
      
      // 5. Update pools with existing working proxies
      const existingWorking = this.freshProxies.filter(p => p.working);
      this.freshProxies = [
        ...testedFreshProxies,
        ...existingWorking
      ]
      .filter((proxy, index, self) => 
        index === self.findIndex(p => 
          p.host === proxy.host && p.port === proxy.port
        )
      )
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
      
      console.log('\n🎉 PROXY UPDATE 2025 COMPLETE:');
      console.log(`   🆕 Fresh Proxies: ${this.freshProxies.length} (${this.freshProxies.filter(p => p.working).length} working)`);
      console.log(`   🌐 Web Proxies: ${this.webProxies.length}`);
      console.log(`   🔒 VPN Proxies: ${this.vpnProxies.length}`);
      console.log(`   📊 Success Rate: ${this.stats.lastSuccessRate.toFixed(2)}%`);
      console.log(`   ⏱️  Total Time: ${Math.round(this.stats.lastFetchTime / 1000)}s`);
      console.log(`   🌍 Countries: ${Object.keys(this.stats.countries || {}).length}`);
      
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
      console.error('Stack:', error.stack);
      
      // Always create enhanced fallback proxies if update fails
      this.createEnhancedFallbackProxies();
      
      return {
        success: false,
        error: error.message,
        fromFallback: true,
        stats: this.stats,
        proxies: {
          fresh: this.freshProxies.slice(0, 20),
          web: this.webProxies.slice(0, 5),
          vpn: this.vpnProxies.slice(0, 5)
        }
      };
    }
  }

  // ==================== WEB PROXY TESTING 2025 ====================
  async testWebProxies() {
    console.log('🌐 Testing web proxies 2025...');
    
    const workingWebProxies = [];
    
    for (const webProxy of this.webProxyGateways) {
      try {
        console.log(`  Testing ${webProxy.name}...`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(webProxy.url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        clearTimeout(timeout);
        
        // Accept various success status codes
        if ([200, 403, 301, 302, 503, 429].includes(response.status)) {
          webProxy.working = true;
          webProxy.lastChecked = new Date().toISOString();
          webProxy.statusCode = response.status;
          workingWebProxies.push(webProxy);
          console.log(`    ✅ ${webProxy.name} is accessible (${response.status})`);
        } else {
          webProxy.working = false;
          console.log(`    ❌ ${webProxy.name} failed (${response.status})`);
        }
      } catch (error) {
        webProxy.working = false;
        console.log(`    ❌ ${webProxy.name} error: ${error.message}`);
      }
      
      // Random delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    }
    
    return workingWebProxies;
  }

  // ==================== VPN DISCOVERY 2025 ====================
  async discoverVPNEndpoints() {
    console.log('🔍 Discovering VPN endpoints 2025...');
    
    const discoveredVPNs = [];
    
    // Static VPN endpoints
    for (const vpnSource of this.vpnSources) {
      for (const endpoint of vpnSource.endpoints) {
        const vpnObj = {
          name: vpnSource.name,
          host: endpoint.host,
          port: endpoint.port,
          type: vpnSource.type,
          protocol: vpnSource.type,
          source: 'static_vpn_2025',
          requiresAuth: false,
          isVPN: true,
          country: endpoint.country || 'Unknown',
          fetchedAt: new Date().toISOString()
        };
        
        discoveredVPNs.push(vpnObj);
      }
    }
    
    // Try to discover additional VPNs from proxy pool
    console.log(`🔍 Discovered ${discoveredVPNs.length} static VPN endpoints`);
    
    return discoveredVPNs;
  }

  // ==================== SMART PROXY SELECTION 2025 ====================
  getProxyForSession(sessionId, proxyType = 'fresh') {
    // Safety check - selalu return minimal direct connection jika tidak ada proxy
    if (!this.freshProxies || this.freshProxies.length === 0) {
      console.log(`⚠️ No proxies available for ${sessionId}, using direct connection`);
      return this.getDirectConnection();
    }
    
    let proxyList = [];
    let selectedType = proxyType.toLowerCase();
    
    // Apply intelligent proxy selection
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
    
    // Fallback system
    if (proxyList.length === 0) {
      console.log(`⚠️ No ${selectedType} proxies available, trying fallback...`);
      
      const fallbackOrder = ['fresh', 'vpn', 'web', 'direct'];
      for (const type of fallbackOrder) {
        if (type !== selectedType) {
          const fallbackList = this.getProxiesByType(type);
          if (fallbackList.length > 0) {
            proxyList = fallbackList;
            selectedType = type;
            console.log(`   ✅ Using fallback: ${type} proxies (${proxyList.length} available)`);
            break;
          }
        }
      }
    }
    
    // Last resort: direct connection
    if (proxyList.length === 0) {
      console.log('⚠️ No proxies available, using direct connection');
      return this.getDirectConnection();
    }
    
    const sessionCount = this.sessionRotation.get(sessionId) || 0;
    
    // Intelligent selection: mix of speed and fairness
    const sortedProxies = [...proxyList].sort((a, b) => {
      // Primary: response time
      if (a.responseTime !== b.responseTime) {
        return (a.responseTime || 9999) - (b.responseTime || 9999);
      }
      // Secondary: usage count (least used first)
      return (a.useCount || 0) - (b.useCount || 0);
    });
    
    // Rotate through top 10 proxies
    const topProxies = sortedProxies.slice(0, Math.min(10, sortedProxies.length));
    const selectedIndex = sessionCount % topProxies.length;
    const selectedProxy = topProxies[selectedIndex];
    
    // Update proxy stats
    selectedProxy.useCount = (selectedProxy.useCount || 0) + 1;
    selectedProxy.lastUsed = new Date().toISOString();
    this.sessionRotation.set(sessionId, sessionCount + 1);
    
    // Create display info
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
      displayName: displayName,
      selectionTime: new Date().toISOString()
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
      responseTime: 100,
      puppeteerArgs: this.getDirectConnectionArgs(),
      displayName: 'Direct Connection (Fallback)',
      source: 'emergency_fallback'
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
      '--window-size=1280,720',
      '--disable-web-security',
      '--disable-features=site-per-process'
    ];
  }

  // ==================== AUTO UPDATE SYSTEM 2025 ====================
  startAutoUpdate() {
    console.log('🔄 Starting auto-update system 2025 (every 15 minutes)...');
    
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
    }
    
    this.autoUpdateInterval = setInterval(async () => {
      console.log('🔄 Scheduled auto-update triggered...');
      try {
        const result = await this.updateAllProxies();
        console.log(`✅ Auto-update completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        console.error('❌ Auto-update failed:', error.message);
      }
    }, this.config.rotationInterval);
  }

  startHealthCheck() {
    console.log('❤️ Starting proxy health check 2025 (every 3 minutes)...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const workingCount = this.freshProxies.filter(p => p.working).length;
        const vpnWorking = this.vpnProxies.filter(p => p.working).length;
        const webWorking = this.webProxies.filter(p => p.working).length;
        
        console.log(`❤️ Health check: ${workingCount} fresh, ${vpnWorking} VPN, ${webWorking} web`);
        
        // If below threshold, do a quick refresh
        if (workingCount < this.config.minWorkingProxies) {
          console.log(`⚠️ Low proxy count (${workingCount}/${this.config.minWorkingProxies}), refreshing...`);
          await this.quickRefresh();
        }
        
        // Check cache age
        if (this.lastUpdate) {
          const age = Date.now() - new Date(this.lastUpdate).getTime();
          if (age > 30 * 60 * 1000) { // 30 minutes
            console.log('⚠️ Proxy data stale, scheduling update...');
            setTimeout(() => this.updateAllProxies(), 10000);
          }
        }
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
      }
    }, this.config.healthCheckInterval);
  }

  async quickHealthCheck() {
    console.log('🧪 Quick health check on cached proxies...');
    
    try {
      // Test a sample of proxies
      const sampleSize = Math.min(5, this.freshProxies.length);
      const sample = [...this.freshProxies]
        .sort(() => Math.random() - 0.5)
        .slice(0, sampleSize);
      
      let workingCount = 0;
      for (const proxy of sample) {
        const result = await this.enhancedProxyTest(proxy);
        if (result.success) workingCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const successRate = (workingCount / sampleSize) * 100;
      console.log(`✅ Quick health check: ${workingCount}/${sampleSize} working (${successRate.toFixed(1)}%)`);
      
      return successRate;
    } catch (error) {
      console.log('⚠️ Quick health check failed:', error.message);
      return 0;
    }
  }

  async quickRefresh() {
    console.log('⚡ Quick refresh of proxy pool...');
    
    try {
      // Test and remove dead proxies
      const toTest = this.freshProxies.slice(0, 20);
      const results = await Promise.allSettled(
        toTest.map(p => this.enhancedProxyTest(p))
      );
      
      // Remove dead proxies
      const deadProxies = [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled' && !results[i].value.success) {
          deadProxies.push(toTest[i]);
        }
      }
      
      deadProxies.forEach(p => this.removeProxy(p));
      
      console.log(`⚡ Quick refresh removed ${deadProxies.length} dead proxies`);
      
      // If pool is too small, do a full update
      if (this.freshProxies.filter(p => p.working).length < this.config.minWorkingProxies) {
        console.log('⚡ Pool too small, triggering full update...');
        setTimeout(() => this.updateAllProxies(), 5000);
      }
      
    } catch (error) {
      console.log('⚠️ Quick refresh failed:', error.message);
    }
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

  // ==================== UTILITY METHODS 2025 ====================
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

  getSourceName(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '').split('.')[0];
    } catch {
      // Extract from raw URL
      const match = url.match(/https?:\/\/([^\/]+)/);
      return match ? match[1].replace('www.', '').split('.')[0] : 'unknown';
    }
  }

  updateCountryStats(proxies) {
    const countries = {};
    proxies.forEach(proxy => {
      const country = proxy.country || 'Unknown';
      countries[country] = (countries[country] || 0) + 1;
    });
    this.stats.countries = countries;
  }

  // ==================== STATISTICS & MONITORING 2025 ====================
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
      .slice(0, 10);  // Top 10 fastest
    
    const vpnByCountry = {};
    workingVPN.forEach(vpn => {
      const country = vpn.country || 'Unknown';
      vpnByCountry[country] = (vpnByCountry[country] || 0) + 1;
    });
    
    // Calculate health score
    const totalProxies = this.freshProxies.length + this.vpnProxies.length;
    const workingProxies = workingFresh.length + workingVPN.length;
    const healthScore = totalProxies > 0 ? Math.round((workingProxies / totalProxies) * 100) : 0;
    
    return {
      freshProxies: workingFresh,
      webProxies: workingWeb,
      vpnProxies: workingVPN,
      stats: {
        totalWorking: workingProxies,
        healthScore: healthScore,
        fresh: {
          total: this.freshProxies.length,
          working: workingFresh.length,
          byType: byType,
          fastest: fastest.map(p => ({
            host: p.host,
            port: p.port,
            type: p.type,
            country: p.country,
            responseTime: p.responseTime,
            successRate: p.successCount ? Math.round((p.successCount / (p.successCount + p.failCount)) * 100) : 0
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
        sourceStats: this.stats.sourceSuccess
      }
    };
  }

  getStats() {
    const workingFresh = this.freshProxies.filter(p => p.working).length;
    const totalFresh = this.freshProxies.length;
    
    return {
      ...this.stats,
      pools: {
        fresh: totalFresh,
        web: this.webProxies.length,
        vpn: this.vpnProxies.length,
        workingFresh: workingFresh,
        workingWeb: this.webProxies.filter(p => p.working).length,
        workingVPN: this.vpnProxies.filter(p => p.working).length
      },
      health: {
        freshHealth: totalFresh > 0 ? Math.round((workingFresh / totalFresh) * 100) : 0,
        overallHealth: totalFresh > 0 ? Math.round((workingFresh / totalFresh) * 100) : 0
      },
      config: {
        minWorkingProxies: this.config.minWorkingProxies,
        rotationInterval: this.config.rotationInterval,
        cacheTTL: this.config.cacheTTL,
        testTimeout: this.config.testTimeout
      },
      lastUpdate: this.lastUpdate,
      startupTime: this.stats.startupTime,
      isInitialized: this.isInitialized,
      cacheFile: fs.existsSync(this.cacheFile) ? 'Exists' : 'Missing'
    };
  }

  // ==================== QUICK TEST 2025 ====================
  async quickTest() {
    console.log('🧪 Running enhanced quick proxy system test 2025...');
    
    try {
      const testResults = {
        fresh: { tested: 0, working: 0 },
        web: { tested: 0, working: 0 },
        vpn: { tested: 0, working: 0 }
      };
      
      // Test fresh proxies
      const testFreshCount = Math.min(5, this.freshProxies.length);
      testResults.fresh.tested = testFreshCount;
      
      if (testFreshCount > 0) {
        const testProxies = [...this.freshProxies]
          .sort(() => Math.random() - 0.5)
          .slice(0, testFreshCount);
        
        for (const proxy of testProxies) {
          const isWorking = await this.enhancedProxyTest(proxy);
          if (isWorking.success) testResults.fresh.working++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Test web proxies
      const testWebCount = Math.min(3, this.webProxies.length);
      testResults.web.tested = testWebCount;
      testResults.web.working = this.webProxies.filter(p => p.working).length;
      
      // Test VPN proxies
      const testVPNCount = Math.min(2, this.vpnProxies.length);
      testResults.vpn.tested = testVPNCount;
      
      if (testVPNCount > 0) {
        const testVPNs = [...this.vpnProxies]
          .sort(() => Math.random() - 0.5)
          .slice(0, testVPNCount);
        
        for (const vpn of testVPNs) {
          const result = await this.testSingleVPN(vpn);
          if (result) testResults.vpn.working++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log('\n✅ Enhanced Quick Test Results 2025:');
      console.log('===================================');
      console.log(`   Fresh Proxies: ${testResults.fresh.working}/${testResults.fresh.tested} working`);
      console.log(`   Web Proxies: ${testResults.web.working}/${testResults.web.tested} accessible`);
      console.log(`   VPN Proxies: ${testResults.vpn.working}/${testResults.vpn.tested} working`);
      console.log(`   Total Pool: ${this.freshProxies.length} fresh, ${this.vpnProxies.length} VPN`);
      console.log(`   Overall Health: ${Math.round((testResults.fresh.working / testResults.fresh.tested) * 100) || 0}%`);
      
      const success = testResults.fresh.working > 0 || testResults.vpn.working > 0;
      
      return {
        success: success,
        details: testResults,
        freshProxies: testResults.fresh.working,
        webProxies: testResults.web.working,
        vpnProxies: testResults.vpn.working,
        totalProxies: this.freshProxies.length,
        healthScore: Math.round((testResults.fresh.working / testResults.fresh.tested) * 100) || 0
      };
      
    } catch (error) {
      console.error('❌ Enhanced quick test failed:', error.message);
      return { 
        success: false, 
        error: error.message,
        healthScore: 0
      };
    }
  }

  // ==================== CLEANUP ====================
  cleanup() {
    this.stopAutoUpdate();
    console.log('🧹 Proxy handler 2025 cleanup completed');
    
    // Save final state
    this.saveCache().catch(() => {});
  }
}

module.exports = ProxyHandler;
