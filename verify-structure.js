const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying project structure...\n');

const baseDir = __dirname;
console.log(`Base directory: ${baseDir}`);
console.log(`Current working directory: ${process.cwd()}\n`);

console.log('📁 Directory listing:');
const files = fs.readdirSync(baseDir);
files.forEach(file => {
  const filePath = path.join(baseDir, file);
  const stats = fs.statSync(filePath);
  console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
});

console.log('\n📁 Bot directory:');
const botDir = path.join(baseDir, 'bot');
if (fs.existsSync(botDir)) {
  const botFiles = fs.readdirSync(botDir);
  botFiles.forEach(file => {
    console.log(`  📄 ${file}`);
  });
} else {
  console.log('  ❌ Bot directory does not exist!');
}

console.log('\n📁 Public directory:');
const publicDir = path.join(baseDir, 'public');
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  publicFiles.forEach(file => {
    console.log(`  📄 ${file}`);
  });
} else {
  console.log('  ❌ Public directory does not exist!');
}

console.log('\n✅ Verification complete!');
