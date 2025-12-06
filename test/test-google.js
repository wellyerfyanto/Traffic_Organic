// Test Google stealth mode
const TrafficGenerator = require('./bot/trafficGenerator');

async function testGoogleStealth() {
  console.log('🧪 Testing Google Stealth Mode...\n');
  
  const generator = new TrafficGenerator();
  
  try {
    await generator.initialize();
    
    console.log('✅ Generator initialized');
    console.log('🚀 Starting Google stealth test session...\n');
    
    const sessionId = await generator.startOrganicSession({
      targetUrl: 'https://cryptoajah.blogspot.com',
      proxyType: 'vpn',
      deviceType: 'desktop',
      searchEngine: 'google',
      keywordMode: 'auto',
      maxKeywords: 2,
      enableSubUrl: true
    });
    
    console.log(`📝 Session ID: ${sessionId}`);
    console.log('\n📊 Monitoring session (will auto-stop in 60 seconds)...\n');
    
    // Monitor for 60 seconds
    let elapsed = 0;
    const monitor = setInterval(() => {
      const session = generator.activeSessions.get(sessionId);
      if (session) {
        console.log(`⏱️  ${elapsed}s - Status: ${session.status} | Google attempts: ${session.googleAttempts || 0}`);
        
        if (session.googleAttempts >= 2) {
          console.log('✅ Google searches completed successfully!');
          clearInterval(monitor);
          generator.stopSession(sessionId);
          process.exit(0);
        }
      }
      
      elapsed += 5;
      if (elapsed >= 60) {
        console.log('⏰ Test timeout reached');
        clearInterval(monitor);
        generator.stopSession(sessionId);
        process.exit(0);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testGoogleStealth().catch(console.error);
}

module.exports = testGoogleStealth;