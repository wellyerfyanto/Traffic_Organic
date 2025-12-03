#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing Pure Organic Traffic Bot structure...\n');

// Get current directory
const currentDir = process.cwd();
console.log(`📁 Current directory: ${currentDir}`);

// List all files
console.log('\n📄 Listing all files in current directory:');
const files = fs.readdirSync(currentDir);
files.forEach(file => {
  const filePath = path.join(currentDir, file);
  const stats = fs.statSync(filePath);
  console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
});

// Create directories if they don't exist
const directories = ['bot', 'public', 'data'];
directories.forEach(dir => {
  const dirPath = path.join(currentDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}/`);
  }
});

// Check if bot files are in root and need to be moved
const botFilesToMove = [
  'proxyHandler.js',
  'botHandler.js', 
  'keywordAnalyzer.js',
  'trafficGenerator.js'
];

console.log('\n🔄 Moving bot files to bot/ directory:');
botFilesToMove.forEach(file => {
  const sourcePath = path.join(currentDir, file);
  const destPath = path.join(currentDir, 'bot', file);
  
  if (fs.existsSync(sourcePath)) {
    // Read the file content
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Write to bot directory
    fs.writeFileSync(destPath, content);
    console.log(`  ✅ Moved ${file} to bot/`);
    
    // Keep original file as backup
    fs.renameSync(sourcePath, sourcePath + '.bak');
    console.log(`    (Backup kept as ${file}.bak)`);
  } else {
    console.log(`  ⚠️  ${file} not found in root`);
  }
});

// Check if frontend files need to be moved
const frontendFiles = [
  'index.html',
  'style.css',
  'script.js',
  'monitoring.html'
];

console.log('\n🔄 Moving frontend files to public/ directory:');
frontendFiles.forEach(file => {
  const sourcePath = path.join(currentDir, file);
  const destPath = path.join(currentDir, 'public', file);
  
  if (fs.existsSync(sourcePath)) {
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destPath, content);
    console.log(`  ✅ Moved ${file} to public/`);
  } else {
    console.log(`  ⚠️  ${file} not found in root`);
  }
});

// Fix Dockerfile name
if (fs.existsSync('Dockerfile.txt') && !fs.existsSync('Dockerfile')) {
  fs.renameSync('Dockerfile.txt', 'Dockerfile');
  console.log('🐳 Renamed Dockerfile.txt to Dockerfile');
}

// Fix railway.toml name
if (fs.existsSync('railway.toml.txt') && !fs.existsSync('railway.toml')) {
  fs.renameSync('railway.toml.txt', 'railway.toml');
  console.log('🚂 Renamed railway.toml.txt to railway.toml');
}

// Create .env from template if doesn't exist
if (fs.existsSync('_.env.txt') && !fs.existsSync('.env')) {
  fs.copyFileSync('_.env.txt', '.env');
  console.log('⚙️  Created .env from template');
}

// Update test-proxy.js to use correct path
const testProxyPath = path.join(currentDir, 'test-proxy.js');
if (fs.existsSync(testProxyPath)) {
  let content = fs.readFileSync(testProxyPath, 'utf8');
  // Update require path
  content = content.replace(
    "const ProxyHandler = require('./bot/proxyHandler');",
    "const ProxyHandler = require('./bot/proxyHandler');"
  );
  fs.writeFileSync(testProxyPath, content);
  console.log('🧪 Updated test-proxy.js with correct path');
}

// Create a simple test file to verify module loading
const testModulePath = path.join(currentDir, 'test-module-loading.js');
const testContent = `
console.log('🧪 Testing module loading...');

try {
  const path = require('path');
  const fs = require('fs');
  
  console.log('📁 Current directory:', process.cwd());
  console.log('📁 __dirname:', __dirname);
  
  // Test loading from bot directory
  console.log('\\n🔍 Testing bot module loading:');
  
  const botDir = path.join(__dirname, 'bot');
  console.log('Bot directory exists:', fs.existsSync(botDir));
  
  if (fs.existsSync(botDir)) {
    const botFiles = fs.readdirSync(botDir);
    console.log('Bot files:', botFiles);
    
    // Try to load each module
    const modules = ['proxyHandler', 'botHandler', 'keywordAnalyzer', 'trafficGenerator'];
    
    for (const moduleName of modules) {
      const modulePath = path.join(botDir, \`\${moduleName}.js\`);
      console.log(\`\\n🔍 Testing \${moduleName}:\`);
      console.log(\`  Path: \${modulePath}\`);
      console.log(\`  Exists: \${fs.existsSync(modulePath)}\`);
      
      if (fs.existsSync(modulePath)) {
        try {
          const module = require(modulePath);
          console.log(\`  ✅ \${moduleName} loaded successfully\`);
        } catch (error) {
          console.log(\`  ❌ Error loading \${moduleName}: \${error.message}\`);
        }
      }
    }
  }
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
`;

fs.writeFileSync(testModulePath, testContent);
console.log('🧪 Created test-module-loading.js');

console.log('\n' + '='.repeat(50));
console.log('✅ FIX COMPLETE!');
console.log('='.repeat(50));
console.log('\n📋 Next steps:');
console.log('   1. Run: node test-module-loading.js');
console.log('   2. If modules load, run: npm start');
console.log('   3. If still errors, check bot/ directory exists');
console.log('   4. Ensure all .js files are in bot/ directory');
console.log('\n📁 Expected structure:');
console.log('   /bot');
console.log('     ├── proxyHandler.js');
console.log('     ├── botHandler.js');
console.log('     ├── keywordAnalyzer.js');
console.log('     └── trafficGenerator.js');
console.log('   /public');
console.log('     ├── index.html');
console.log('     ├── style.css');
console.log('     ├── script.js');
console.log('     └── monitoring.html');
console.log('   server.js');
console.log('   package.json');
console.log('\n🚀 To start: node server.js');