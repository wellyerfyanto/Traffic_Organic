const fetch = require('node-fetch');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class ProxyHandler {
  constructor() {
    this.freshProxies = [];    // IP:Port proxy list berbagai jenis
    this.vpnExtensions = [];   // Browser VPN extensions
    this.lastUpdate = null;
    this.sessionRotation = new Map(); // Session-based proxy rotation
    
    // Interval tracker
    this.autoUpdateInterval = null;
    
    // SUMBER PROXY MULTI-JENIS (SOCKS, HTTPS, HTTP)
    this.proxySources = [
      // SOCKS5 proxies
      'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt',
      'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
      
      // HTTPS proxies
      'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/https.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/https.txt',
      
      // HTTP proxies  
      'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
      'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt',
      'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
      
      // SOCKS4 proxies
      'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks4.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks4.txt',
      
      // Mixed proxies
      'https://raw.githubusercontent.com/roosterkid/openproxylist/main/ALL_RAW.txt',
      'https://api.proxyscrape.com/v2/?request=getproxies&protocol=all',
      'https://www.proxy-list.download/api/v1/get?type=http',
      'https://www.proxy-list.download/api/v1/get?type=https',
      'https://www.proxy-list.download/api/v1/get?type=socks4',
      'https://www.proxy-list.download/api/v1/get?type=socks5'
    ];
    
    // VPN EXTENSIONS UPDATE
    this.vpnExtensions = [
      { name: 'Hola VPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'Touch VPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'SetupVPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'Betternet', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'ZenMate', type: 'extension', working: true, method: 'browser_extension' }
    ];
    
    // Configuration
    this.config = {
      maxFreshProxies: 100,
      testTimeout: 10000,
      rotationInterval: 10 * 60 * 1000, // 10 menit
      minProxySpeed: 5000,
      sessionTimeMultiplier: { // Perkalian waktu berdasarkan session
        low: { min: 1.0, max: 1.5 },
        medium: { min: 1.5, max: 2.0 },
        high: { min: 2.0, max: 3.0 }
      }
    };
  }

  // ==================== DETECT PROXY TYPE ====================
  detectProxyType(proxyString) {
    if (proxyString.includes('socks5://') || proxyString.includes(':1080') || proxyString.toLowerCase().includes('socks5')) {
      return 'socks5';
    } else if (proxyString.includes('socks4://') || proxyString.toLowerCase().includes('socks4')) {
      return 'socks4';
    } else if (proxyString.includes('https://') || proxyString.includes(':443')) {
      return 'https';
    } else if (proxyString.includes('http://') || proxyString.includes(':80') || proxyString.includes(':8080')) {
      return 'http';
    } else if (proxyString.includes(':3128') || proxyString.includes(':3129')) {
      return 'http';
    } else if (proxyString.includes(':1080')) {
      return 'socks';
    } else {
      // Default check by pattern
      const parts = proxyString.split(':');
      if (parts.length >= 2) {
        const port = parseInt(parts[1]);
        if ([1080, 1081, 1082, 1083].includes(port)) return 'socks5';
        if ([1084, 1085].includes(port)) return 'socks4';
        if ([443, 8443].includes(port)) return 'https';
        if ([80, 8080, 3128, 3129, 8081].includes(port)) return 'http';
      }
      return 'http'; // default
    }
  }

  // ==================== PARSE PROXY LIST ====================
  parseProxyList(text, source) {
    const proxies = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
      
      // Format yang didukung:
      // 1. ip:port
      // 2. protocol://ip:port
      // 3. protocol://user:pass@ip:port
      // 4. ip:port:user:pass
      
      let proxyObj = {
        raw: trimmed,
        source: this.getSourceName(source),
        fetchedAt: new Date(),
        working: false,
        tested: false
      };
      
      // Parse berdasarkan format
      if (trimmed.includes('://')) {
        // Format dengan protocol
        try {
          const url = new URL(trimmed);
          proxyObj.protocol = url.protocol.replace(':', '');
          proxyObj.host = url.hostname;
          proxyObj.port = url.port || (proxyObj.protocol === 'https' ? 443 : 80);
          
          if (url.username || url.password) {
            proxyObj.username = url.username;
            proxyObj.password = url.password;
          }
          
          proxyObj.type = this.detectProxyType(trimmed);
          proxyObj.url = trimmed;
        } catch (e) {
          continue;
        }
      } else {
        // Format ip:port atau ip:port:user:pass
        const parts = trimmed.split(':');
        
        if (parts.length >= 2) {
          proxyObj.host = parts[0];
          proxyObj.port = parseInt(parts[1]);
          
          if (parts.length >= 4) {
            proxyObj.username = parts[2];
            proxyObj.password = parts[3];
          }
          
          proxyObj.type = this.detectProxyType(trimmed);
          proxyObj.url = this.buildProxyUrl(proxyObj);
        } else {
          continue;
        }
      }
      
      // Validasi
      if (proxyObj.host && proxyObj.port > 0 && proxyObj.port <= 65535) {
        proxies.push(proxyObj);
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

  // ==================== TEST PROXY WITH PUPPETEER ====================
  async testProxyWithPuppeteer(proxy) {
    const startTime = Date.now();
    
    try {
      // Test proxy menggunakan Puppeteer
      const browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=site-per-process',
          `--proxy-server=${proxy.url}`,
          '--window-size=1920,1080'
        ],
        timeout: this.config.testTimeout
      });
      
      const page = await browser.newPage();
      
      // Set timeout untuk proxy test
      await page.setDefaultNavigationTimeout(this.config.testTimeout);
      
      // Test dengan halaman yang ringan
      await page.goto('https://httpbin.org/ip', { 
        waitUntil: 'domcontentloaded',
        timeout: 8000 
      });
      
      const content = await page.content();
      const responseTime = Date.now() - startTime;
      
      await browser.close();
      
      // Cek jika response valid
      if (content.includes('origin') && responseTime < this.config.testTimeout) {
        proxy.working = true;
        proxy.responseTime = responseTime;
        proxy.lastTested = new Date();
        proxy.testResult = 'success';
        return true;
      }
      
    } catch (error) {
      proxy.working = false;
      proxy.testResult = error.message;
    }
    
    return false;
  }

  // ==================== BATCH TEST PROXIES ====================
  async testProxyBatch(proxies, batchSize = 10) {
    console.log(`🧪 Testing ${proxies.length} proxies in batches of ${batchSize}...`);
    
    const results = [];
    const totalBatches = Math.ceil(proxies.length / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const startIdx = batch * batchSize;
      const endIdx = Math.min(startIdx + batchSize, proxies.length);
      const batchProxies = proxies.slice(startIdx, endIdx);
      
      console.log(`  Batch ${batch + 1}/${totalBatches} (${startIdx + 1}-${endIdx})`);
      
      const batchPromises = batchProxies.map(async (proxy, idx) => {
        const proxyIndex = startIdx + idx;
        const success = await this.testProxyWithPuppeteer(proxy);
        
        if ((proxyIndex + 1) % 5 === 0 || proxyIndex + 1 === proxies.length) {
          const workingCount = results.filter(p => p.working).length;
          console.log(`    Tested ${proxyIndex + 1}/${proxies.length}, ${workingCount} working`);
        }
        
        return proxy;
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
      
      // Delay antar batch
      if (batch < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const workingCount = results.filter(p => p.working).length;
    console.log(`✅ Testing complete: ${workingCount}/${results.length} working proxies`);
    
    return results;
  }

  // ==================== UPDATE ALL PROXIES ====================
  async updateAllProxies() {
    console.log('🔄 PROXY: Updating all proxy sources...');
    
    try {
      const startTime = Date.now();
      const allProxies = [];
      const successfulSources = [];
      
      // Fetch dari semua sumber
      for (const [index, source] of this.proxySources.entries()) {
        try {
          console.log(`  📥 Fetching from source ${index + 1}: ${this.getSourceName(source)}`);
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(source, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
          
          // Delay antar source
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.log(`    ❌ Failed: ${error.message}`);
        }
      }
      
      if (allProxies.length === 0) {
        throw new Error('No proxies found from any source');
      }
      
      // Remove duplicates
      const uniqueProxies = this.removeDuplicateProxies(allProxies);
      console.log(`  🔄 After deduplication: ${uniqueProxies.length} unique proxies`);
      
      // Test proxies
      const testedProxies = await this.testProxyBatch(uniqueProxies);
      
      // Sort by response time
      const workingProxies = testedProxies
        .filter(p => p.working)
        .sort((a, b) => a.responseTime - b.responseTime)
        .slice(0, this.config.maxFreshProxies);
      
      this.freshProxies = workingProxies;
      this.lastUpdate = new Date();
      
      console.log(`✅ PROXY UPDATE: ${workingProxies.length} working proxies ready`);
      this.logProxyStats();
      
      return {
        success: true,
        totalFound: allProxies.length,
        working: workingProxies.length,
        sourcesUsed: successfulSources.length,
        updateTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ PROXY UPDATE FAILED:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== GET PROXY FOR SESSION ====================
  getProxyForSession(sessionId, proxyType = 'fresh') {
    let proxyList = [];
    
    switch (proxyType.toLowerCase()) {
      case 'fresh':
        proxyList = this.freshProxies.filter(p => p.working);
        break;
      case 'vpn':
        proxyList = this.vpnExtensions.filter(p => p.working);
        break;
      default:
        proxyList = this.freshProxies.filter(p => p.working);
    }
    
    if (proxyList.length === 0) {
      throw new Error(`No working ${proxyType} proxies available`);
    }
    
    // Session-based rotation dengan round-robin
    const sessionCount = this.sessionRotation.get(sessionId) || 0;
    const proxyIndex = sessionCount % proxyList.length;
    const selectedProxy = proxyList[proxyIndex];
    
    // Update session rotation
    this.sessionRotation.set(sessionId, sessionCount + 1);
    
    // Update proxy stats
    selectedProxy.lastUsed = new Date();
    selectedProxy.usedBy = sessionId;
    selectedProxy.useCount = (selectedProxy.useCount || 0) + 1;
    
    console.log(`🎯 Selected ${proxyType} proxy for session ${sessionId}: ${selectedProxy.url}`);
    
    return {
      ...selectedProxy,
      puppeteerArgs: this.getPuppeteerProxyArgs(selectedProxy)
    };
  }

  getPuppeteerProxyArgs(proxy) {
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
      '--window-size=1920,1080'
    ];
    
    if (proxy.url) {
      args.push(`--proxy-server=${proxy.url}`);
      
      // Add authentication if available
      if (proxy.username && proxy.password) {
        args.push(`--proxy-auth=${proxy.username}:${proxy.password}`);
      }
    }
    
    return args;
  }

  // ==================== SESSION TIME MULTIPLIER ====================
  getSessionTimeMultiplier(sessionId) {
    // Generate multiplier berdasarkan session ID untuk variasi waktu
    const hash = this.hashString(sessionId);
    const level = hash % 3; // 0=low, 1=medium, 2=high
    
    const multipliers = this.config.sessionTimeMultiplier;
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

  // ==================== UTILITY METHODS ====================
  removeDuplicateProxies(proxies) {
    const seen = new Set();
    const unique = [];
    
    for (const proxy of proxies) {
      const key = proxy.url || `${proxy.host}:${proxy.port}:${proxy.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(proxy);
      }
    }
    
    return unique;
  }

  getSourceName(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '').split('.')[0];
    } catch {
      return url.substring(0, 20);
    }
  }

  logProxyStats() {
    const stats = this.getAllActiveProxies();
    
    console.log('📊 ========== PROXY STATISTICS ==========');
    console.log(`   🆕 Fresh Proxies: ${stats.fresh.working}/${stats.fresh.total}`);
    
    // Group by type
    const byType = {};
    stats.fresh.proxies.forEach(p => {
      byType[p.type] = (byType[p.type] || 0) + 1;
    });
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`      ${type.toUpperCase()}: ${count}`);
    });
    
    console.log(`   🛡️  VPN Extensions: ${stats.vpn.working}/${stats.vpn.total}`);
    console.log(`   📈 Total Working: ${stats.totalWorking}`);
    console.log(`   ⏰ Last Update: ${this.lastUpdate ? this.lastUpdate.toLocaleTimeString() : 'Never'}`);
    console.log('📊 ======================================');
  }

  // ==================== AUTO UPDATE MANAGEMENT ====================
  startAutoUpdate() {
    console.log('🔄 PROXY: Starting auto-update system (every 10 minutes)...');
    
    // Clear existing interval first
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
    }
    
    // Initial update
    this.updateAllProxies();
    
    // Schedule updates
    this.autoUpdateInterval = setInterval(() => {
      console.log('🔄 PROXY: Scheduled auto-update...');
      this.updateAllProxies();
    }, this.config.rotationInterval);
    
    console.log('✅ PROXY: Auto-update system started');
  }

  stopAutoUpdate() {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = null;
      console.log('🛑 PROXY: Auto-update stopped');
    }
  }

  // ==================== CLEANUP METHOD ====================
  cleanup() {
    console.log('🧹 PROXY: Cleaning up proxy handler...');
    
    // Stop auto-update interval
    this.stopAutoUpdate();
    
    // Clear all proxies
    this.freshProxies = [];
    this.vpnExtensions = [];
    this.sessionRotation.clear();
    
    console.log('✅ PROXY: Cleanup completed');
  }

  // ==================== PUBLIC METHODS ====================
  getAllActiveProxies() {
    return {
      freshProxies: this.freshProxies.filter(p => p.working),
      vpnExtensions: this.vpnExtensions.filter(p => p.working),
      stats: {
        totalWorking: this.freshProxies.filter(p => p.working).length + 
                     this.vpnExtensions.filter(p => p.working).length,
        fresh: {
          total: this.freshProxies.length,
          working: this.freshProxies.filter(p => p.working).length,
          proxies: this.freshProxies.filter(p => p.working).map(p => ({
            host: p.host,
            port: p.port,
            type: p.type,
            speed: p.responseTime || 'Unknown'
          }))
        },
        vpn: {
          total: this.vpnExtensions.length,
          working: this.vpnExtensions.filter(p => p.working).length
        }
      },
      lastUpdate: this.lastUpdate
    };
  }
}

module.exports = ProxyHandler;