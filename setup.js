#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Pure Organic Traffic Bot...');

// Create directories
const directories = ['bot', 'public', 'data'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Move bot files to bot directory
const botFiles = ['proxyHandler.js', 'botHandler.js', 'keywordAnalyzer.js', 'trafficGenerator.js'];
botFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const dest = path.join('bot', file);
    fs.copyFileSync(file, dest);
    console.log(`✅ Moved ${file} to bot/`);
  }
});

// Copy public files
const publicFiles = ['index.html', 'style.css', 'script.js', 'monitoring.html'];
publicFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const dest = path.join('public', file);
    fs.copyFileSync(file, dest);
    console.log(`✅ Copied ${file} to public/`);
  }
});

// Create default .env if not exists
if (!fs.existsSync('.env')) {
  const envContent = `# ==================== SERVER CONFIG ====================
NODE_ENV=development
PORT=3000
SESSION_SECRET=organic-traffic-bot-secure-key-2025-change-this

# ==================== TARGET CONFIG ====================
DEFAULT_TARGET_URL=https://cryptoajah.blogspot.com

# ==================== AUTO-LOOP CONFIG ====================
AUTO_LOOP=true
LOOP_INTERVAL=2700000
MAX_SESSIONS=3

# ==================== PROXY CONFIG ====================
PROXY_REFRESH_INTERVAL=300000
MIN_PROXY_COUNT=10
ENABLE_DIRECT_FALLBACK=true

# ==================== ORGANIC TRAFFIC CONFIG ====================
MAX_KEYWORDS_PER_SESSION=5
SEARCH_ENGINE_ROTATION=true

# ==================== PUPPETEER CONFIG ====================
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ==================== SECURITY ====================
ENABLE_PROXY_ROTATION=true
MAX_RETRIES=3
ENABLE_BOT_HANDLER=true
ENABLE_TIME_MULTIPLIER=true`;
  
  fs.writeFileSync('.env', envContent);
  console.log('✅ Created .env file');
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
  }
}

// Create test script
const testScript = `const ProxyHandler = require('./bot/proxyHandler');

async function test() {
  console.log('🧪 Testing system...');
  
  try {
    const handler = new ProxyHandler();
    
    // Try to load from cache first
    if (handler.loadCache()) {
      console.log(\`✅ Loaded \${handler.freshProxies.length} proxies from cache\`);
    }
    
    // Quick test
    const stats = handler.getAllActiveProxies();
    console.log(\`📊 Current proxy stats:\`);
    console.log(\`  Total working: \${stats.stats.totalWorking}\`);
    console.log(\`  Fresh proxies: \${stats.stats.fresh.working}\`);
    console.log(\`  Web proxies: \${stats.stats.web.working}\`);
    
    if (stats.stats.totalWorking > 0) {
      console.log('✅ System is ready!');
    } else {
      console.log('⚠️  No proxies available, need to fetch new ones');
      const result = await handler.updateAllProxies();
      console.log(\`Update result: \${result.success ? '✅' : '❌'}\`);
    }
    
    handler.cleanup();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();`;

fs.writeFileSync('test-system.js', testScript);
console.log('✅ Created test-system.js');

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('  1. Edit .env file with your configuration');
console.log('  2. Run: npm start');
console.log('  3. Open browser to: http://localhost:3000');
console.log('  4. Test system with: node test-system.js');