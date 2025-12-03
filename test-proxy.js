// Test script untuk proxy baru
const ProxyHandler = require('./bot/proxyHandler');

async function testProxySystem() {
  console.log('🧪 Testing Proxy System...');
  
  const proxyHandler = new ProxyHandler();
  
  try {
    console.log('1. Testing proxy fetch...');
    const result = await proxyHandler.updateAllProxies();
    
    console.log('2. Getting active proxies...');
    const proxies = proxyHandler.getAllActiveProxies();
    
    console.log('📊 TEST RESULTS:');
    console.log('================');
    console.log(`Success: ${result.success}`);
    console.log(`Fresh Proxies: ${proxies.freshProxies.length}`);
    console.log(`Web Proxies: ${proxies.webProxies.length}`);
    console.log(`VPN Extensions: ${proxies.vpnExtensions.length}`);
    console.log(`Total Working: ${proxies.stats.totalWorking}`);
    console.log(`Success Rate: ${proxies.stats.successRate?.toFixed(2)}%`);
    
    if (proxies.freshProxies.length > 0) {
      console.log('\n✅ Top 5 fastest proxies:');
      proxies.freshProxies.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i+1}. ${p.host}:${p.port} (${p.type}) - ${p.responseTime}ms`);
      });
    }
    
    if (proxies.webProxies.length > 0) {
      console.log('\n🌐 Active Web Proxies:');
      proxies.webProxies.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i+1}. ${p.name} - ${p.url}`);
      });
    }
    
    // Test proxy selection
    console.log('\n🎯 Testing proxy selection...');
    const testSessionId = 'test-session-' + Date.now();
    
    const proxyTypes = ['fresh', 'web', 'vpn'];
    for (const type of proxyTypes) {
      try {
        const selected = proxyHandler.getProxyForSession(testSessionId, type);
        console.log(`   ${type.toUpperCase()}: ${selected.name || selected.host}:${selected.port || 'N/A'}`);
      } catch (error) {
        console.log(`   ${type.toUpperCase()}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Proxy system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Proxy system test failed:', error.message);
    console.error(error.stack);
  } finally {
    proxyHandler.cleanup();
  }
}

// Run test
if (require.main === module) {
  testProxySystem().then(() => {
    console.log('\n🧪 Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = testProxySystem;