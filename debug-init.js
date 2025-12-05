console.log('🧪 DEBUG: Testing ProxyHandler Initialization Flow\n');

async function debug() {
  try {
    // 1. Load Module
    console.log('1. Loading module...');
    const ProxyHandler = require('./bot/proxyHandler');
    console.log('   ✅ Module loaded\n');

    // 2. Create Instance
    console.log('2. Creating instance...');
    const handler = new ProxyHandler();
    console.log(`   ✅ Instance created: ${handler.constructor.name}\n`);

    // 3. Check initial state
    console.log('3. Checking pre-init state...');
    console.log(`   - isInitialized: ${handler.isInitialized}`);
    console.log(`   - freshProxies count: ${handler.freshProxies ? handler.freshProxies.length : 'N/A'}\n`);

    // 4. Initialize
    console.log('4. Calling initialize()...');
    const initResult = await handler.initialize();
    console.log(`   ✅ initialize() returned: ${initResult}`);
    console.log(`   - isInitialized now: ${handler.isInitialized}`);
    console.log(`   - freshProxies count now: ${handler.freshProxies.length}\n`);

    // 5. Test a core method
    console.log('5. Testing getProxyForSession...');
    const testProxy = handler.getProxyForSession('debug-session', 'fresh');
    console.log(`   ✅ Method called successfully. Proxy type: ${testProxy.type}`);

    console.log('\n🎉 All tests passed! The ProxyHandler is working correctly.');

  } catch (error) {
    console.error('\n💥 DEBUG FAILED:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n🔧 This error is the root cause. Please share the full output above.');
  }
}

debug();