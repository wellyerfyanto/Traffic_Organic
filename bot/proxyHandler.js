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
    
    // ✅ SUMBER PROXY REAL-TIME (Update setiap 10-30 menit)
    this.proxySources = [
      // ========== HTTP/HTTPS PROXIES ==========
      'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_format=protocolipport&format=text',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
      'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
      'https://raw.githubusercontent.com/roosterkid/openproxylist/main/ALL_HTTP.txt',
      
      // ========== SOCKS5 PROXIES ==========
      'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_format=socks5&format=text',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt',
      'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
      'https://raw.githubusercontent.com/roosterkid/openproxylist/main/ALL_SOCKS5.txt',
      
      // ========== MIXED PROXIES ==========
      'https://www.proxy-list.download/api/v1/get?type=http',
      'https://www.proxy-list.download/api/v1/get?type=https',
      'https://www.proxy-list.download/api/v1/get?type=socks4',
      'https://www.proxy-list.download/api/v1/get?type=socks5',
      'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc',
      'https://raw.githubusercontent.com/roosterkid/openproxylist/main/ALL.txt',
      
      // ========== REAL-TIME PROXY CHECKERS ==========
      'http://pubproxy.com/api/proxy?limit=10&format=txt',
      'https://openproxy.space/list/http',
      'https://openproxy.space/list/socks5',
    ];
    
    // ✅ WEB PROXY GATEWAYS (10+ Active)
    this.webProxyGateways = [
      { name: 'CroxyProxy', url: 'https://www.croxyproxy.com/', working: true, method: 'web_gateway' },
      { name: 'CroxyProxy Premium', url: 'https://www.croxyproxypremium.com/', working: true, method: 'web_gateway' },
      { name: 'ProxySite', url: 'https://www.proxysite.com/', working: true, method: 'web_gateway' },
      { name: 'HideMyAss', url: 'https://www.hidemyass.com/web-proxy', working: true, method: 'web_gateway' },
      { name: 'KProxy', url: 'https://www.kproxy.com/', working: true, method: 'web_gateway' },
      { name: 'Proxy4Free', url: 'https://www.proxy4free.com/', working: true, method: 'web_gateway' },
      { name: 'FreeProxy', url: 'https://freeproxy.win/', working: true, method: 'web_gateway' },
      { name: 'Hidester', url: 'https://hidester.com/proxy/', working: true, method: 'web_gateway' },
      { name: 'Whoer', url: 'https://whoer.net/webproxy', working: true, method: 'web_gateway' },
      { name: 'VPNBook', url: 'https://www.vpnbook.com/webproxy', working: true, method: 'web_gateway' },
      { name: 'Anonymouse', url: 'https://anonymouse.org/cgi-bin/anon-www.cgi/', working: true, method: 'web_gateway' },
      { name: 'Megaproxy', url: 'https://www.megaproxy.com/freesurf/', working: true, method: 'web_gateway' },
    ];
    
    // ✅ VPN EXTENSIONS (Updated)
    this.vpnExtensions = [
      { name: 'Hola VPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'Touch VPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'SetupVPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'Betternet', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'ZenMate', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'UrbanVPN', type: 'extension', working: true, method: 'browser_extension' },
      { name: 'Hotspot Shield', type: 'extension', working: true, method: 'browser_extension' },
    ];
    
    // Configuration
    this.config = {
      maxFreshProxies: 100,
      maxWebProxies: 25,
      testTimeout: 15000, // 15 seconds timeout
      rotationInterval: 5 * 60 * 1000, // 5 menit auto-refresh
      minProxySpeed: 8000, // 8 seconds max
      testConcurrency: 5,
      minWorkingProxies: 10,
      retryAttempts: 3
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
        
        // Gunakan cache jika kurang dari 30 menit
        if (now - cacheTime < 30 * 60 * 1000) {
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
        freshProxies: this.freshProxies,
        webProxies: this.webProxies,
        lastUpdate: this.lastUpdate,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Saved ${this.freshProxies.length} proxies to cache`);
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
      return 'http'; // default
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
      
      // Parse different formats
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
            continue; // Skip invalid format
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
          // Additional IP validation
          const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
          if (ipPattern.test(proxyObj.host) || proxyObj.host.includes('.') || proxyObj.host.includes(':')) {
            proxies.push(proxyObj);
          }
        }
      } catch (error) {
        continue; // Skip parsing errors
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

  // ==================== PROXY TESTING ====================
  async testProxyWithPuppeteer(proxy) {
    const startTime = Date.now();
    
    // Skip if recently tested and failed
    if (proxy.lastTested && proxy.testResult === 'failed') {
      const timeSinceTest = Date.now() - new Date(proxy.lastTested).getTime();
      if (timeSinceTest < 5 * 60 * 1000) { // 5 minutes
        return false;
      }
    }
    
    try {
      console.log(`  Testing proxy: ${proxy.host}:${proxy.port} (${proxy.type})`);
      
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
          '--window-size=1280,720'
        ],
        timeout: this.config.testTimeout,
        ignoreHTTPSErrors: true
      });
      
      const page = await browser.newPage();
      
      // Set reasonable timeouts
      await page.setDefaultNavigationTimeout(this.config.testTimeout);
      await page.setDefaultTimeout(this.config.testTimeout);
      
      // Test multiple sites
      const testUrls = [
        'https://httpbin.org/ip',
        'https://api.ipify.org?format=json',
        'https://www.google.com/gen_204' // Google no-content page
      ];
      
      let success = false;
      for (const testUrl of testUrls) {
        try {
          await page.goto(testUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
          });
          
          // Check if proxy is working
          if (testUrl.includes('httpbin.org')) {
            const content = await page.content();
            if (content.includes('origin')) {
              success = true;
              break;
            }
          } else {
            // For other URLs, just check if page loaded
            success = true;
            break;
          }
        } catch (e) {
          continue; // Try next URL
        }
      }
      
      const responseTime = Date.now() - startTime;
      await browser.close();
      
      if (success && responseTime < this.config.minProxySpeed) {
        proxy.working = true;
        proxy.responseTime = responseTime;
        proxy.lastTested = new Date();
        proxy.testResult = 'success';
        console.log(`    ✅ Working (${responseTime}ms)`);
        return true;
      }
      
    } catch (error) {
      proxy.working = false;
      proxy.testResult = error.message;
      proxy.lastTested = new Date();
      console.log(`    ❌ Failed: ${error.message}`);
    }
    
    proxy.working = false;
    return false;
  }

  // ==================== BATCH TESTING ====================
  async testProxyBatch(proxies) {
    console.log(`🧪 Testing ${proxies.length} proxies...`);
    
    const results = [];
    const batchSize = this.config.testConcurrency;
    
    for (let i = 0; i < proxies.length; i += batchSize) {
      const batch = proxies.slice(i, i + batchSize);
      const batchPromises = batch.map(proxy => 
        this.testProxyWithPuppeteer(proxy).then(success => {
          if ((i + batch.indexOf(proxy) + 1) % 10 === 0) {
            const workingCount = results.filter(p => p.working).length;
            console.log(`  Progress: ${i + batch.indexOf(proxy) + 1}/${proxies.length}, ${workingCount} working`);
          }
          return proxy;
        })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
      
      // Delay between batches
      if (i + batchSize < proxies.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const workingProxies = results.filter(p => p.working);
    console.log(`✅ Testing complete: ${workingProxies.length}/${proxies.length} working proxies`);
    
    return workingProxies;
  }

  // ==================== FETCH PROXIES FROM MULTIPLE SOURCES ====================
  async fetchProxiesFromSources() {
    console.log('🌐 Fetching proxies from multiple sources...');
    
    const allProxies = [];
    const successfulSources = [];
    
    // Shuffle sources for better distribution
    const shuffledSources = [...this.proxySources].sort(() => Math.random() - 0.5);
    
    for (const [index, source] of shuffledSources.entries()) {
      try {
        console.log(`  📥 [${index + 1}/${shuffledSources.length}] Fetching from: ${this.getSourceName(source)}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(source, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        
        // Small delay between sources
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
      totalSources: shuffledSources.length
    };
  }

  // ==================== WEB PROXY TESTING ====================
  async testWebProxies() {
    console.log('🌐 Testing web proxies...');
    
    const workingWebProxies = [];
    
    for (const webProxy of this.webProxyGateways) {
      try {
        console.log(`  Testing web proxy: ${webProxy.name}`);
        
        // Quick test if URL is accessible
        const response = await fetch(webProxy.url, {
          method: 'HEAD',
          timeout: 10000,
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
          console.log(`    ❌ ${webProxy.name} returned status: ${response.status}`);
        }
      } catch (error) {
        webProxy.working = false;
        console.log(`    ❌ ${webProxy.name} error: ${error.message}`);
      }
      
      // Delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return workingWebProxies;
  }

  // ==================== MAIN UPDATE METHOD ====================
  async updateAllProxies() {
    console.log('🔄 PROXY: Updating all proxy lists...');
    
    try {
      const startTime = Date.now();
      
      // 1. Try to load from cache first
      if (this.loadCache() && this.freshProxies.length >= this.config.minWorkingProxies) {
        console.log('📁 Using cached proxies');
        return {
          success: true,
          fromCache: true,
          stats: this.stats,
          proxies: {
            fresh: this.freshProxies,
            web: this.webProxies,
            vpn: this.vpnExtensions
          }
        };
      }
      
      // 2. Fetch fresh proxies
      const fetchedData = await this.fetchProxiesFromSources();
      
      if (fetchedData.proxies.length === 0) {
        throw new Error('No proxies found from any source');
      }
      
      // 3. Test fresh proxies
      const testedFreshProxies = await this.testProxyBatch(fetchedData.proxies);
      
      // 4. Test web proxies
      const testedWebProxies = await this.testWebProxies();
      
      // 5. Update collections
      this.freshProxies = testedFreshProxies
        .sort((a, b) => a.responseTime - b.responseTime)
        .slice(0, this.config.maxFreshProxies);
      
      this.webProxies = testedWebProxies.slice(0, this.config.maxWebProxies);
      this.lastUpdate = new Date();
      
      // 6. Update stats
      this.stats.totalFetched = fetchedData.proxies.length;
      this.stats.totalWorking = this.freshProxies.length + this.webProxies.length;
      this.stats.lastSuccessRate = (this.stats.totalWorking / fetchedData.proxies.length) * 100;
      this.stats.lastFetchTime = Date.now() - startTime;
      
      // 7. Save to cache
      this.saveCache();
      
      console.log('✅ PROXY UPDATE COMPLETE:');
      console.log(`   🆕 Fresh Proxies: ${this.freshProxies.length}`);
      console.log(`   🌐 Web Proxies: ${this.webProxies.length}`);
      console.log(`   🛡️  VPN Extensions: ${this.vpnExtensions.filter(p => p.working).length}`);
      console.log(`   📊 Success Rate: ${this.stats.lastSuccessRate.toFixed(2)}%`);
      console.log(`   ⏱️  Fetch Time: ${this.stats.lastFetchTime}ms`);
      
      return {
        success: true,
        fromCache: false,
        stats: this.stats,
        proxies: {
          fresh: this.freshProxies,
          web: this.webProxies,
          vpn: this.vpnExtensions
        }
      };
      
    } catch (error) {
      console.error('❌ PROXY UPDATE FAILED:', error.message);
      
      // Fallback: If no proxies, use direct connection
      if (this.freshProxies.length === 0 && this.webProxies.length === 0) {
        console.log('⚠️  No proxies available, using direct connection mode');
        this.webProxies = this.webProxyGateways.slice(0, 5); // Use first 5 as fallback
      }
      
      return {
        success: false,
        error: error.message,
        stats: this.stats
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
      console.log(`⚠️  No ${proxyType} proxies available, trying fallback...`);
      
      // Try different types in order
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
      console.log('⚠️  No proxies available, using direct connection');
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

  // ==================== AUTO UPDATE SYSTEM ====================
  startAutoUpdate() {
    console.log('🔄 PROXY: Starting auto-update system (every 5 minutes)...');
    
    // Clear existing interval
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
    }
    
    // Initial update
    this.updateAllProxies();
    
    // Scheduled updates
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

  getProxyStats() {
    const stats = this.getAllActiveProxies();
    
    return {
      total: stats.stats.totalWorking,
      fresh: stats.stats.fresh.working,
      web: stats.stats.web.working,
      vpn: stats.stats.vpn.working,
      successRate: stats.stats.successRate,
      lastUpdate: stats.stats.lastUpdate,
      byType: stats.stats.fresh.byType,
      fastestProxies: stats.stats.fresh.fastest
    };
  }

  // ==================== CLEANUP ====================
  cleanup() {
    this.stopAutoUpdate();
    
    // Clean up old proxies (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.freshProxies = this.freshProxies.filter(p => {
      if (p.fetchedAt && new Date(p.fetchedAt).getTime() < oneHourAgo && !p.working) {
        return false;
      }
      return true;
    });
    
    console.log('🧹 PROXY: Cleanup completed');
  }

  // ==================== FALLBACK PROXY SYSTEM ====================
  getFallbackProxies() {
    // Return some hardcoded reliable proxies as fallback
    const fallbackProxies = [
      { host: '45.77.56.113', port: 3128, type: 'http', source: 'fallback', working: true },
      { host: '138.197.157.60', port: 8080, type: 'http', source: 'fallback', working: true },
      { host: '165.227.36.231', port: 80, type: 'http', source: 'fallback', working: true },
      { host: '159.203.61.169', port: 8080, type: 'http', source: 'fallback', working: true },
      { host: '104.236.248.219', port: 3128, type: 'http', source: 'fallback', working: true }
    ];
    
    return fallbackProxies.map(p => ({
      ...p,
      url: this.buildProxyUrl(p)
    }));
  }

  // ==================== HEALTH CHECK ====================
  async healthCheck() {
    try {
      const stats = this.getAllActiveProxies();
      const totalWorking = stats.stats.totalWorking;
      
      if (totalWorking < this.config.minWorkingProxies) {
        console.log(`⚠️ PROXY HEALTH: Low proxy count (${totalWorking}), forcing refresh...`);
        await this.updateAllProxies();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ PROXY HEALTH CHECK FAILED:', error.message);
      return false;
    }
  }

  // ==================== QUICK TEST ====================
  async quickTest() {
    console.log('🧪 Quick testing proxy system...');
    
    try {
      // Test a few random proxies
      const testProxies = this.freshProxies
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      let workingCount = 0;
      for (const proxy of testProxies) {
        const isWorking = await this.testProxyWithPuppeteer(proxy);
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