// Test script untuk proxy dengan VPN
const ProxyHandler = require('./bot/proxyHandler');

async function testProxySystem() {
  console.log('🧪 Testing Proxy System with VPN Support 2025...');
  
  const proxyHandler = new ProxyHandler();
  
  try {
    console.log('1. Initializing proxy system...');
    await proxyHandler.initialize();
    
    console.log('2. Getting active proxies...');
    const proxies = proxyHandler.getAllActiveProxies();
    
    console.log('\n📊 TEST RESULTS:');
    console.log('================');
    console.log(`✅ Fresh Proxies: ${proxies.freshProxies.length}`);
    console.log(`✅ Web Proxies: ${proxies.webProxies.length}`);
    console.log(`✅ VPN Proxies: ${proxies.vpnProxies.length}`);
    console.log(`📈 Total Working: ${proxies.stats.totalWorking}`);
    console.log(`🎯 Success Rate: ${proxies.stats.successRate?.toFixed(2)}%`);
    
    if (proxies.freshProxies.length > 0) {
      console.log('\n🚀 Top 5 Fastest Fresh Proxies:');
      proxies.freshProxies.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i+1}. ${p.host}:${p.port} (${p.type}) - ${p.responseTime}ms`);
      });
    }
    
    if (proxies.vpnProxies.length > 0) {
      console.log('\n🔒 Working VPN Proxies:');
      proxies.vpnProxies.slice(0, 5).forEach((p, i) => {
        const premium = p.isPremium ? '⭐ PREMIUM' : 'FREE';
        console.log(`   ${i+1}. ${p.name} - ${p.host}:${p.port} (${p.country}) - ${p.responseTime}ms ${premium}`);
      });
      
      // Show VPN by country
      const vpnByCountry = {};
      proxies.vpnProxies.forEach(vpn => {
        const country = vpn.country || 'Unknown';
        vpnByCountry[country] = (vpnByCountry[country] || 0) + 1;
      });
      
      console.log('\n🌍 VPN by Country:');
      Object.entries(vpnByCountry).forEach(([country, count]) => {
        console.log(`   ${country}: ${count} VPNs`);
      });
    }
    
    // Test proxy selection for all types
    console.log('\n🎯 Testing Proxy Selection:');
    const testSessionId = 'test-session-' + Date.now();
    
    const proxyTypes = ['fresh', 'web', 'vpn', 'direct'];
    for (const type of proxyTypes) {
      try {
        const selected = proxyHandler.getProxyForSession(testSessionId, type);
        if (selected.isDirect) {
          console.log(`   ${type.toUpperCase()}: Direct connection (no proxy)`);
        } else {
          const vpnInfo = selected.isVPN ? `[VPN: ${selected.country}]` : '';
          console.log(`   ${type.toUpperCase()}: ${selected.name || selected.host}:${selected.port} ${vpnInfo} (${selected.responseTime}ms)`);
        }
      } catch (error) {
        console.log(`   ${type.toUpperCase()}: ERROR - ${error.message}`);
      }
    }
    
    // Quick functionality test
    console.log('\n🧪 Quick Functionality Test:');
    const quickTest = await proxyHandler.quickTest();
    console.log(`   Quick Test: ${quickTest.success ? '✅ PASSED' : '❌ FAILED'}`);
    if (quickTest.freshProxies > 0) {
      console.log(`   Working Fresh Proxies: ${quickTest.freshProxies}`);
    }
    if (quickTest.webProxies > 0) {
      console.log(`   Working Web Proxies: ${quickTest.webProxies}`);
    }
    
    // Show cache status
    console.log('\n💾 Cache Status:');
    const stats = proxyHandler.getStats();
    console.log(`   Last Update: ${stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : 'Never'}`);
    console.log(`   Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log(`   Initialized: ${stats.isInitialized ? '✅ Yes' : '❌ No'}`);
    
    console.log('\n🎉 Proxy system test completed successfully!');
    console.log('\n👉 NEXT: Run "npm start" to start the server');
    
  } catch (error) {
    console.error('❌ Proxy system test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    proxyHandler.cleanup();
  }
}

// Run test
if (require.main === module) {
  testProxySystem().then(() => {
    console.log('\n🧪 All tests completed');
    process.exit(0);
  }).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = testProxySystem;