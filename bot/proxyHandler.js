// ==================== PROXY HANDLER - SIMPLE VERSION ====================
// NO 'File' OBJECT USAGE - COMPATIBLE WITH NODE.JS

const fs = require('fs');
const path = require('path');

class ProxyHandler {
  constructor() {
    console.log('🔄 Simple ProxyHandler initialized');
    this.proxies = [];
    this.workingProxies = [];
    this.vpnProxies = [];
    this.webProxies = [];
    this.isInitialized = false;
  }

  async initialize() {
    console.log('🚀 Initializing simple proxy system...');
    
    try {
      // Load from cache jika ada
      await this.loadFromCache();
      
      // Jika belum ada proxy, buat beberapa mock
      if (this.proxies.length === 0) {
        this.createMockProxies();
      }
      
      this.isInitialized = true;
      console.log(`✅ Simple proxy system ready: ${this.proxies.length} proxies`);
      return true;
    } catch (error) {
      console.error('❌ Proxy initialization failed:', error.message);
      this.createMockProxies();
      return false;
    }
  }

  async loadFromCache() {
    try {
      const cacheFile = path.join(__dirname, '..', 'data', 'proxy-cache.json');
      
      // Gunakan fs.existsSync, bukan File
      if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile, 'utf8');
        const cache = JSON.parse(data);
        this.proxies = cache.proxies || [];
        this.vpnProxies = cache.vpnProxies || [];
        console.log(`📁 Loaded ${this.proxies.length} proxies from cache`);
        return true;
      }
      return false;
    } catch (error) {
      console.log('⚠️ Cache load error:', error.message);
      return false;
    }
  }

  createMockProxies() {
    console.log('🔄 Creating mock proxies for testing...');
    
    // Fresh proxies
    this.proxies = [
      { 
        host: 'proxy1.example.com', 
        port: 8080, 
        type: 'http', 
        country: 'US',
        working: true,
        responseTime: 100,
        name: 'HTTP Proxy 1',
        protocol: 'http'
      },
      { 
        host: 'proxy2.example.com', 
        port: 3128, 
        type: 'https', 
        country: 'UK',
        working: true,
        responseTime: 150,
        name: 'HTTPS Proxy 1',
        protocol: 'https'
      },
      { 
        host: 'proxy3.example.com', 
        port: 1080, 
        type: 'socks5', 
        country: 'DE',
        working: true,
        responseTime: 200,
        name: 'SOCKS5 Proxy 1',
        protocol: 'socks5'
      }
    ];
    
    // VPN proxies
    this.vpnProxies = [
      {
        host: 'vpn-gateway.com',
        port: 1080,
        type: 'socks5',
        protocol: 'socks5',
        country: 'US',
        working: true,
        responseTime: 300,
        name: 'US VPN Gateway',
        isVPN: true
      }
    ];
    
    // Web proxies
    this.webProxies = [
      {
        name: 'CroxyProxy',
        url: 'https://www.croxyproxy.com/',
        working: true,
        encodeUrl: true
      }
    ];
    
    console.log(`✅ Created ${this.proxies.length} mock proxies`);
  }

  getProxyForSession(sessionId, proxyType = 'fresh') {
    console.log(`🎯 Getting ${proxyType} proxy for session: ${sessionId.substring(0, 8)}`);
    
    let proxyList = [];
    
    switch(proxyType) {
      case 'fresh':
        proxyList = this.proxies.filter(p => p.working);
        break;
      case 'vpn':
        proxyList = this.vpnProxies.filter(p => p.working);
        break;
      case 'web':
        proxyList = this.webProxies.filter(p => p.working);
        break;
      case 'direct':
        return this.getDirectConnection();
      default:
        proxyList = this.proxies.filter(p => p.working);
    }
    
    if (proxyList.length === 0) {
      console.log('⚠️ No proxies available, using direct connection');
      return this.getDirectConnection();
    }
    
    // Pilih proxy secara random
    const selectedProxy = proxyList[Math.floor(Math.random() * proxyList.length)];
    const proxyUrl = `${selectedProxy.protocol || 'http'}://${selectedProxy.host}:${selectedProxy.port}`;
    
    const result = {
      ...selectedProxy,
      puppeteerArgs: selectedProxy.host === 'direct' ? 
        this.getDirectConnectionArgs() : 
        [`--proxy-server=${proxyUrl}`],
      isDirect: selectedProxy.host === 'direct',
      displayName: selectedProxy.name || `${selectedProxy.host}:${selectedProxy.port}`
    };
    
    console.log(`✅ Selected: ${result.displayName} (${result.responseTime}ms)`);
    return result;
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
      '--disable-gpu'
    ];
  }

  getAllActiveProxies() {
    const workingFresh = this.proxies.filter(p => p.working);
    const workingVPN = this.vpnProxies.filter(p => p.working);
    const workingWeb = this.webProxies.filter(p => p.working);
    
    return {
      freshProxies: workingFresh,
      webProxies: workingWeb,
      vpnProxies: workingVPN,
      stats: {
        totalWorking: workingFresh.length + workingVPN.length + workingWeb.length,
        fresh: {
          total: this.proxies.length,
          working: workingFresh.length,
          byType: {},
          fastest: workingFresh.slice(0, 3)
        },
        web: {
          total: this.webProxies.length,
          working: workingWeb.length
        },
        vpn: {
          total: this.vpnProxies.length,
          working: workingVPN.length,
          byCountry: {}
        },
        successRate: 100,
        lastUpdate: new Date().toISOString()
      }
    };
  }

  async updateAllProxies() {
    console.log('🔄 Updating proxy list (mock)...');
    
    // Simulasi update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: 'Proxy update completed (mock)',
      stats: {
        totalWorking: this.proxies.filter(p => p.working).length
      }
    };
  }

  cleanup() {
    console.log('🧹 Cleaning up proxy handler');
  }

  getStats() {
    return {
      totalProxies: this.proxies.length,
      workingProxies: this.proxies.filter(p => p.working).length,
      vpnProxies: this.vpnProxies.length,
      lastUpdate: new Date().toISOString(),
      isInitialized: this.isInitialized
    };
  }
}

// EKSPOR YANG BENAR
module.exports = ProxyHandler;
