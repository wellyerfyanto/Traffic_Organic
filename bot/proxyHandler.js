const fetch = require('node-fetch');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class ProxyHandler {
  constructor() {
    this.freshProxies = [];    // IP:Port proxy list
    this.webProxies = [];      // Web proxy gateway list
    this.vpnExtensions = [];   // Browser VPN extensions
    this.lastUpdate = null;
    this.sessionRotation = new Map();
    this.autoUpdateInterval = null;
    
    // ✅ SUMBER PROXY REAL-TIME (Hanya 5 terbaik)
    this.proxySources = [
      'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_format=protocolipport&format=text&timeout=10000',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
      'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
      'https://www.proxy-list.download/api/v1/get?type=http',
      'https://proxylist.geonode.com/api/proxy-list?limit=50&page=1&sort_by=lastChecked&sort_type=desc'
    ];
    
    // ✅ WEB PROXY GATEWAYS (5 Active)
    this.webProxyGateways = [
      { name: 'CroxyProxy', url: 'https://www.croxyproxy.com/', working: true, method: 'web_gateway' },
      { name: 'ProxySite', url: 'https://www.proxysite.com/', working: true, method: 'web_gateway' },
      { name: 'HideMyAss', url: 'https://www.hidemyass.com/web-proxy', working: true, method: 'web_gateway' },
      { name: 'KProxy', url: 'https://www.kproxy.com/', working: true, method: 'web_gateway' },
      { name: 'Hidester', url: 'https://hidester.com/proxy/', working: true, method: 'web_gateway' }
    ];
    
    // ✅ VPN EXTENSIONS (5 saja)
    this.vpnExtensions = [
      { name: 'Hola VPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'Touch VPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'SetupVPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'Betternet', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'ZenMate', type: 'extension', working: true, method: 'browser_extension' }
    ];
    
    // Configuration OPTIMIZED
    this.config = {
      maxFreshProxies: 30,
      maxWebProxies: 10,
      testTimeout: 10000,
      rotationInterval: 30 * 60 * 1000, // 30 MENIT
      minProxySpeed: 5000,
      testConcurrency: 3,
      minWorkingProxies: 5,
      retryAttempts: 2
    };
    
    // Stats
    this.stats = {
      totalFetched: 0,
      totalWorking: 0,
      lastSuccessRate: 0,
      lastFetchTime: null
    };
    
    // Backup cache file
    this.cacheFile = path.join(__dirname, '..', 'data', 'proxy-cache.json');
    this.ensureCacheDirectory();
  }

  // ==================== UTILITY METHODS ====================
  ensureCacheDirectory() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        const cacheTime = new Date(data.lastUpdate).getTime();
        const now = Date.now();
        
        // Gunakan cache jika kurang dari 15 menit
        if (now - cacheTime < 15 * 60 * 1000) {
          this.freshProxies = data.freshProxies || [];
          this.webProxies = data.webProxies || [];
          this.lastUpdate = data.lastUpdate;
          console.log(`📁 Loaded ${this.freshProxies.length} proxies from cache`);
          return true;
        }
      }
    } catch (error) {
      console.log('⚠️ Cache load error:', error.message);
    }
    return false;
  }

  saveCache() {
    try {
      const cacheData = {
        freshProxies: this.freshProxies.filter(p => p.working).slice(0, 20), // Hanya simpan yang working
        webProxies: this.webProxies.filter(p => p.working).slice(0, 5),
        lastUpdate: this.lastUpdate,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Saved ${cacheData.freshProxies.length} working proxies to cache`);
    } catch (error) {
      console.log('⚠️ Cache save error:', error.message);
    }
  }

  detectProxyType(proxyString) {
    proxyString = proxyString.toLowerCase();
    
    if (proxyString.includes('socks5') || proxyString.includes(':1080')) {
      return 'socks5';
    } else if (proxyString.includes('socks4')) {
      return 'socks4';
    } else if (proxyString.includes('https') || proxyString.includes(':443')) {
      return 'https';
    } else if (proxyString.includes('http') || proxyString.includes(':80') || proxyString.includes(':8080') || proxyString.includes(':3128')) {
      return 'http';
    } else {
      return 'http';
    }
  }

  parseProxyList(text, source) {
    const proxies = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('[')) continue;
      
      // Remove non-ASCII characters
      const cleanLine = trimmed.replace(/[^\x00-\x7F]/g, '');
      
      let proxyObj = {
        raw: cleanLine,
        source: this.getSourceName(source),
        fetchedAt: new Date(),
        working: false,
        tested: false,
        lastTested: null,
        responseTime: null,
        testResult: null,
        useCount: 0
      };
      
      try {
        // Format: protocol://ip:port
        if (cleanLine.includes('://')) {
          const url = new URL(cleanLine);
          proxyObj.protocol = url.protocol.replace(':', '');
          proxyObj.host = url.hostname;
          proxyObj.port = parseInt(url.port) || (proxyObj.protocol === 'https' ? 443 : 80);
          
          if (url.username || url.password) {
            proxyObj.username = url.username;
            proxyObj.password = url.password;
          }
        } 
        // Format: ip:port or ip:port:user:pass
        else {
          const parts = cleanLine.split(':');
          if (parts.length >= 2) {
            proxyObj.host = parts[0].trim();
            proxyObj.port = parseInt(parts[1].trim());
            
            if (parts.length >= 4) {
              proxyObj.username = parts[2].trim();
              proxyObj.password = parts[3].trim();
            }
          } else {
            continue;
          }
        }
        
        // Detect type if not set
        if (!proxyObj.protocol) {
          proxyObj.type = this.detectProxyType(cleanLine);
          proxyObj.protocol = proxyObj.type;
        } else {
          proxyObj.type = proxyObj.protocol;
        }
        
        // Build URL
        proxyObj.url = this.buildProxyUrl(proxyObj);
        
        // Validate
        if (proxyObj.host && proxyObj.port > 0 && proxyObj.port <= 65535) {
          const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
          if (ipPattern.test(proxyObj.host) || proxyObj.host.includes('.') || proxyObj.host.includes(':')) {
            proxies.push(proxyObj);
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return proxies;
  }

  buildProxyUrl(proxy) {
    if (proxy.url) return proxy.url;
    
    const protocol = proxy.protocol || 'http';
    const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
    
    switch (proxy.type) {
      case 'socks5':
        return `socks5://${auth}${proxy.host}:${proxy.port}`;
      case 'socks4':
        return `socks4://${auth}${proxy.host}:${proxy.port}`;
      case 'https':
        return `https://${auth}${proxy.host}:${proxy.port}`;
      default:
        return `http://${auth}${proxy.host}:${proxy.port}`;
    }
  }

  // ==================== MEMORY CLEANUP METHODS ====================
  clearMemoryCache() {
    console.log('🧹 Clearing memory cache...');
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Hapus proxy yang tidak aktif
    this.freshProxies = this.freshProxies.filter(proxy => {
      // Hapus jika tidak working DAN sudah lama
      if (!proxy.working) {
        if (proxy.lastTested && new Date(proxy.lastTested).getTime() < oneHourAgo) {
          return false;
        }
      }
      
      // Hapus proxy yang terlalu lambat
      if (proxy.responseTime && proxy.responseTime > 8000) {
        return false;
      }
      
      return true;
    });
    
    // Reset stats
    this.stats.totalFetched = this.freshProxies.length;
    this.stats.totalWorking = this.freshProxies.filter(p => p.working).length;
    
    // Force garbage collection jika tersedia
    if (global.gc) {
      global.gc();
    }
    
    console.log(`✅ Memory cache cleared. Active proxies: ${this.stats.totalWorking}`);
  }

  // ==================== QUICK PROXY TEST ====================
  async quickProxyTest(proxy) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://httpbin.org/ip', {
        signal: controller.signal,
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const responseTime = Date.now() - startTime;
        proxy.working = true;
        proxy.responseTime = responseTime;
        proxy.lastTested = new Date();
        proxy.testResult = 'success';
        return true;
      }
    } catch (error) {
      // Skip logging untuk efisiensi
    }
    
    proxy.working = false;
    proxy.lastTested = new Date();
    return false;
  }

  // ==================== OPTIMIZED BATCH TESTING ====================
  async testProxyBatchOptimized(proxies) {
    console.log(`🧪 Quick testing ${proxies.length} proxies...`);
    
    const results = [];
    const batchSize = 3;
    
    for (let i = 0; i < proxies.length; i += batchSize) {
      const batch = proxies.slice(i, i + batchSize);
      const batchPromises = batch.map(proxy => 
        this.quickProxyTest(proxy).then(success => proxy)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
      
      // Hapus reference untuk GC
      batch.length = 0;
      
      // Progress update
      if ((i + batchSize) % 15 === 0) {
        const workingCount = results.filter(p => p.working).length;
        console.log(`  Progress: ${Math.min(i + batchSize, proxies.length)}/${proxies.length}, ${workingCount} working`);
      }
    }
    
    const workingProxies = results.filter(p => p.working);
    console.log(`✅ Quick test complete: ${workingProxies.length}/${proxies.length} working`);
    
    return workingProxies.sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999));
  }

  // ==================== FETCH PROXIES FROM LIMITED SOURCES ====================
  async fetchProxiesFromSources() {
    console.log('🌐 Fetching proxies from 5 sources...');
    
    const allProxies = [];
    const successfulSources = [];
    
    for (const [index, source] of this.proxySources.entries()) {
      try {
        console.log(`  📥 [${index + 1}/5] Fetching from: ${this.getSourceName(source)}`);
        
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
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        const proxies = this.parseProxyList(text, source);
        
        console.log(`    ✅ Got ${proxies.length} proxies`);
        allProxies.push(...proxies);
        successfulSources.push(source);
        
        // Delay antar sources
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        continue;
      }
    }
    
    // Remove duplicates
    const uniqueProxies = this.removeDuplicateProxies(allProxies);
    console.log(`  🔄 After deduplication: ${uniqueProxies.length} unique proxies`);
    
    return {
      proxies: uniqueProxies,
      successfulSources: successfulSources.length,
      totalSources: this.proxySources.length
    };
  }

  // ==================== WEB PROXY TESTING ====================
  async testWebProxies() {
    console.log('🌐 Testing web proxies...');
    
    const workingWebProxies = [];
    
    for (const webProxy of this.webProxyGateways) {
      try {
        const response = await fetch(webProxy.url, {
          method: 'HEAD',
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.status === 200 || response.status === 403 || response.status === 301 || response.status === 302) {
          webProxy.working = true;
          webProxy.lastChecked = new Date();
          workingWebProxies.push(webProxy);
          console.log(`    ✅ ${webProxy.name} is accessible`);
        } else {
          webProxy.working = false;
        }
      } catch (error) {
        webProxy.working = false;
      }
      
      // Delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return workingWebProxies;
  }

  // ==================== MAIN UPDATE METHOD (OPTIMIZED) ====================
  async updateAllProxies() {
    console.log('🔄 PROXY: Updating proxy list (30min interval)...');
    
    try {
      const startTime = Date.now();
      
      // 1. Clear memory cache dulu
      this.clearMemoryCache();
      
      // 2. Load dari cache jika masih fresh (< 15 menit)
      if (this.loadCache() && this.freshProxies.length >= this.config.minWorkingProxies) {
        const cacheTime = new Date(this.lastUpdate).getTime();
        const now = Date.now();
        
        if (now - cacheTime < 15 * 60 * 1000) {
          console.log('📁 Using fresh cache');
          return {
            success: true,
            fromCache: true,
            stats: this.stats,
            proxies: {
              fresh: this.freshProxies.slice(0, 20),
              web: this.webProxies.slice(0, 5),
              vpn: this.vpnExtensions.filter(p => p.working).slice(0, 3)
            }
          };
        }
      }
      
      // 3. Fetch dari 5 sumber saja
      const fetchedData = await this.fetchProxiesFromSources();
      
      if (fetchedData.proxies.length === 0) {
        console.log('⚠️ No new proxies found, using existing');
        return {
          success: true,
          fromCache: true,
          stats: this.stats,
          proxies: {
            fresh: this.freshProxies.slice(0, 15),
            web: this.webProxies.slice(0, 3),
            vpn: this.vpnExtensions.filter(p => p.working).slice(0, 2)
          }
        };
      }
      
      // 4. Quick test
      const testedFreshProxies = await this.testProxyBatchOptimized(fetchedData.proxies);
      
      // 5. Simpan hanya yang working
      this.freshProxies = testedFreshProxies.slice(0, this.config.maxFreshProxies);
      this.lastUpdate = new Date();
      
      // 6. Update stats
      this.stats.totalFetched = fetchedData.proxies.length;
      this.stats.totalWorking = this.freshProxies.length;
      this.stats.lastSuccessRate = (this.stats.totalWorking / fetchedData.proxies.length) * 100;
      this.stats.lastFetchTime = Date.now() - startTime;
      
      // 7. Save to cache (hanya yang working)
      this.saveCache();
      
      // 8. Clear memory lagi
      this.clearMemoryCache();
      
      console.log('✅ PROXY UPDATE COMPLETE:');
      console.log(`   🆕 Fresh Proxies: ${this.freshProxies.length}`);
      console.log(`   📊 Success Rate: ${this.stats.lastSuccessRate.toFixed(2)}%`);
      console.log(`   ⏱️  Fetch Time: ${this.stats.lastFetchTime}ms`);
      console.log(`   💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      
      return {
        success: true,
        fromCache: false,
        stats: this.stats,
        proxies: {
          fresh: this.freshProxies,
          web: this.webProxies.slice(0, 3),
          vpn: this.vpnExtensions.filter(p => p.working).slice(0, 2)
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
          vpn: this.vpnExtensions.filter(p => p.working)
        }
      };
    }
  }

  // ==================== PROXY SELECTION ====================
  getProxyForSession(sessionId, proxyType = 'fresh') {
    let proxyList = [];
    
    switch (proxyType.toLowerCase()) {
      case 'fresh':
        proxyList = this.freshProxies.filter(p => p.working);
        break;
      case 'web':
        proxyList = this.webProxies.filter(p => p.working);
        break;
      case 'vpn':
        proxyList = this.vpnExtensions.filter(p => p.working);
        break;
      default:
        proxyList = this.freshProxies.filter(p => p.working);
    }
    
    // Fallback logic
    if (proxyList.length === 0) {
      console.log(`⚠️ No ${proxyType} proxies available, trying fallback...`);
      
      const fallbackOrder = ['fresh', 'web', 'vpn'];
      for (const type of fallbackOrder) {
        if (type !== proxyType) {
          const fallbackList = this.getProxiesByType(type);
          if (fallbackList.length > 0) {
            proxyList = fallbackList;
            console.log(`   Using fallback: ${type} proxies`);
            break;
          }
        }
      }
    }
    
    if (proxyList.length === 0) {
      console.log('⚠️ No proxies available, using direct connection');
      return {
        type: 'direct',
        url: 'direct',
        puppeteerArgs: this.getDirectConnectionArgs(),
        isDirect: true,
        name: 'Direct Connection'
      };
    }
    
    // Round-robin selection
    const sessionCount = this.sessionRotation.get(sessionId) || 0;
    const proxyIndex = sessionCount % proxyList.length;
    const selectedProxy = proxyList[proxyIndex];
    
    // Update rotation
    this.sessionRotation.set(sessionId, sessionCount + 1);
    
    // Update usage stats
    if (selectedProxy.useCount) {
      selectedProxy.useCount++;
    } else {
      selectedProxy.useCount = 1;
    }
    selectedProxy.lastUsed = new Date();
    
    console.log(`🎯 Selected ${proxyType} proxy for session ${sessionId}: ${selectedProxy.name || selectedProxy.host}`);
    
    return {
      ...selectedProxy,
      puppeteerArgs: this.getPuppeteerProxyArgs(selectedProxy)
    };
  }

  getProxiesByType(type) {
    switch (type) {
      case 'fresh': return this.freshProxies.filter(p => p.working);
      case 'web': return this.webProxies.filter(p => p.working);
      case 'vpn': return this.vpnExtensions.filter(p => p.working);
      default: return [];
    }
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
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-notifications',
      '--disable-popup-blocking'
    ];
    
    if (proxy.url && proxy.url !== 'direct') {
      baseArgs.push(`--proxy-server=${proxy.url}`);
      
      if (proxy.username && proxy.password) {
        baseArgs.push(`--proxy-auth=${proxy.username}:${proxy.password}`);
      }
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
      '--disable-web-security',
      '--window-size=1280,720',
      '--disable-blink-features=AutomationControlled'
    ];
  }

  // ==================== AUTO UPDATE SYSTEM ====================
  startAutoUpdate() {
    console.log('🔄 PROXY: Starting auto-update system (every 30 minutes)...');
    
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
    }
    
    this.updateAllProxies();
    
    this.autoUpdateInterval = setInterval(async () => {
      console.log('🔄 PROXY: Scheduled auto-update...');
      try {
        await this.updateAllProxies();
      } catch (error) {
        console.error('❌ Auto-update failed:', error.message);
      }
    }, this.config.rotationInterval);
  }

  stopAutoUpdate() {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = null;
      console.log('⏹️ PROXY: Auto-update stopped');
    }
  }

  // ==================== STATISTICS & MONITORING ====================
  getAllActiveProxies() {
    const workingFresh = this.freshProxies.filter(p => p.working);
    const workingWeb = this.webProxies.filter(p => p.working);
    const workingVPN = this.vpnExtensions.filter(p => p.working);
    
    const byType = {};
    workingFresh.forEach(proxy => {
      const type = proxy.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    return {
      freshProxies: workingFresh,
      webProxies: workingWeb,
      vpnExtensions: workingVPN,
      stats: {
        totalWorking: workingFresh.length + workingWeb.length + workingVPN.length,
        fresh: {
          total: this.freshProxies.length,
          working: workingFresh.length,
          byType: byType,
          fastest: workingFresh.sort((a, b) => a.responseTime - b.responseTime).slice(0, 5)
        },
        web: {
          total: this.webProxies.length,
          working: workingWeb.length
        },
        vpn: {
          total: this.vpnExtensions.length,
          working: workingVPN.length
        },
        successRate: this.stats.lastSuccessRate,
        lastUpdate: this.lastUpdate,
        nextUpdate: this.autoUpdateInterval ? 
          new Date(Date.now() + this.config.rotationInterval) : null
      }
    };
  }

  // ==================== UTILITY METHODS ====================
  removeDuplicateProxies(proxies) {
    const seen = new Set();
    return proxies.filter(proxy => {
      const key = proxy.url || `${proxy.host}:${proxy.port}:${proxy.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        return true;
      }
      return false;
    });
  }

  getSourceName(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '').split('.')[0];
    } catch {
      return url.substring(0, 30);
    }
  }

  // ==================== CLEANUP ====================
  cleanup() {
    this.stopAutoUpdate();
    this.clearMemoryCache();
    
    console.log('🧹 PROXY: Cleanup completed');
  }

  // ==================== QUICK TEST ====================
  async quickTest() {
    console.log('🧪 Quick testing proxy system...');
    
    try {
      const testProxies = this.freshProxies
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      let workingCount = 0;
      for (const proxy of testProxies) {
        const isWorking = await this.quickProxyTest(proxy);
        if (isWorking) workingCount++;
      }
      
      console.log(`✅ Quick test: ${workingCount}/${testProxies.length} proxies working`);
      return workingCount > 0;
    } catch (error) {
      console.error('❌ Quick test failed:', error.message);
      return false;
    }
  }
}

module.exports = ProxyHandler;