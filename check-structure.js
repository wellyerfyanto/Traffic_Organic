const fs = require('fs');
const path = require('path');

console.log('🔍 CHECKING PROJECT STRUCTURE FOR RAILWAY');
console.log('==========================================\n');

console.log('1. CURRENT DIRECTORY INFO:');
console.log('   - __dirname:', __dirname);
console.log('   - process.cwd():', process.cwd());
console.log('   - Platform:', process.platform);
console.log('   - Node version:', process.version);

console.log('\n2. LISTING ALL FILES AND DIRECTORIES:');
function listAll(dir, level = 0) {
  const prefix = ' '.repeat(level * 2);
  
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          console.log(prefix + '📁 ' + item + '/');
          if (level < 3) { // Limit depth to avoid too much output
            listAll(fullPath, level + 1);
          }
        } else {
          console.log(prefix + '📄 ' + item + ' (' + stat.size + ' bytes)');
        }
      } catch (err) {
        console.log(prefix + '❌ ' + item + ' (error: ' + err.message + ')');
      }
    });
  } catch (err) {
    console.log(prefix + '❌ Cannot read directory:', err.message);
  }
}

listAll(process.cwd());

console.log('\n3. CHECKING CRITICAL BOT FILES:');
const criticalFiles = [
  'proxyHandler.js',
  'botHandler.js',
  'keywordAnalyzer.js',
  'trafficGenerator.js'
];

criticalFiles.forEach(file => {
  console.log(`\n   ${file}:`);
  
  // Check multiple possible locations
  const locations = [
    { path: path.join(process.cwd(), 'bot', file), desc: 'bot/' },
    { path: path.join(process.cwd(), file), desc: 'root' },
    { path: path.join(__dirname, 'bot', file), desc: '__dirname/bot/' },
    { path: path.join(__dirname, file), desc: '__dirname' }
  ];
  
  let found = false;
  locations.forEach(loc => {
    try {
      if (fs.existsSync(loc.path)) {
        const stat = fs.statSync(loc.path);
        console.log(`     ✅ FOUND at ${loc.desc}: ${loc.path} (${stat.size} bytes)`);
        found = true;
      }
    } catch (err) {
      // Ignore errors
    }
  });
  
  if (!found) {
    console.log(`     ❌ NOT FOUND in any location!`);
  }
});

console.log('\n4. CHECKING REQUIRED DIRECTORIES:');
const requiredDirs = ['bot', 'public', 'data'];
requiredDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  const exists = fs.existsSync(dirPath);
  console.log(`   ${dir}/: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (exists) {
    try {
      const files = fs.readdirSync(dirPath);
      console.log(`      Contains: ${files.length > 0 ? files.slice(0, 5).join(', ') : 'empty'}`);
      if (files.length > 5) console.log(`      ... and ${files.length - 5} more files`);
    } catch (err) {
      console.log(`      Error reading: ${err.message}`);
    }
  }
});

console.log('\n5. CHECKING SERVER.JS:');
const serverPath = path.join(process.cwd(), 'server.js');
if (fs.existsSync(serverPath)) {
  const stat = fs.statSync(serverPath);
  console.log(`   ✅ server.js exists: ${serverPath} (${stat.size} bytes)`);
  
  // Read first few lines to check content
  try {
    const content = fs.readFileSync(serverPath, 'utf8').substring(0, 500);
    console.log(`   Preview: ${content.substring(0, 100)}...`);
  } catch (err) {
    console.log(`   Error reading: ${err.message}`);
  }
} else {
  console.log(`   ❌ server.js NOT FOUND at ${serverPath}`);
}

console.log('\n6. ENVIRONMENT CHECK:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('   PORT:', process.env.PORT || 'not set');
console.log('   PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH || 'not set');

console.log('\n==========================================');
console.log('✅ Structure check complete!');
console.log('\nIf bot files are missing, ensure they are in the bot/ directory.');
console.log('Run: mkdir -p bot && mv *.js bot/ (except server.js, package.json)');