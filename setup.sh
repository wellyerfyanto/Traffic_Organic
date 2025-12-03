#!/bin/bash

echo "🚀 SETUP ORGANIC TRAFFIC BOT 2025"
echo "=================================="

# 1. Install Node.js dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p bot public data

# 3. Move bot files to bot/ directory if they exist
echo "🔧 Organizing bot files..."
if [ -f "proxyHandler.js" ]; then
    mv proxyHandler.js bot/
    echo "✅ Moved proxyHandler.js to bot/"
fi

if [ -f "trafficGenerator.js" ]; then
    mv trafficGenerator.js bot/
    echo "✅ Moved trafficGenerator.js to bot/"
fi

if [ -f "keywordAnalyzer.js" ]; then
    mv keywordAnalyzer.js bot/
    echo "✅ Moved keywordAnalyzer.js to bot/"
fi

if [ -f "botHandler.js" ]; then
    mv botHandler.js bot/
    echo "✅ Moved botHandler.js to bot/"
fi

# 4. Create .env file if doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env file..."
    cat > .env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=organic-traffic-bot-secret-2025-change-this

# Puppeteer Configuration
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Auto-loop Configuration
AUTO_LOOP=true
LOOP_INTERVAL=2700000
MAX_SESSIONS=3
DEFAULT_TARGET_URL=https://cryptoajah.blogspot.com

# VPN Configuration (Optional)
ENABLE_PREMIUM_VPN=false
# NORDVPN_USERNAME=your_username_here
# NORDVPN_PASSWORD=your_password_here
EOF
    echo "✅ Created .env file"
fi

# 5. Create basic public files
echo "🌐 Creating UI files..."
mkdir -p public

# Create index.html
cat > public/index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Organic Traffic Bot</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; }
        .btn { padding: 12px 24px; margin: 10px; background: #4361ee; color: white; 
               border: none; border-radius: 5px; cursor: pointer; text-decoration: none; 
               display: inline-block; }
        .btn:hover { background: #3a0ca3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Organic Traffic Bot</h1>
        <p>Advanced traffic generation with VPN proxy system</p>
        <div style="margin: 40px 0;">
            <a href="/monitoring" class="btn">📊 Go to Dashboard</a>
            <a href="/health" class="btn">❤️ Health Check</a>
        </div>
        <div style="margin-top: 50px; color: #666;">
            <p>System is starting up... Please wait a few seconds.</p>
            <div id="status">Checking system status...</div>
        </div>
    </div>
    <script>
        async function checkStatus() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                document.getElementById('status').innerHTML = 
                    \`✅ System is running | \${data.environment} | Uptime: \${data.system?.uptime || '0'}s\`;
            } catch (error) {
                document.getElementById('status').innerHTML = 
                    '⏳ System is starting up... Refresh in 5 seconds';
                setTimeout(() => location.reload(), 5000);
            }
        }
        checkStatus();
        setInterval(checkStatus, 10000);
    </script>
</body>
</html>
EOF

echo "✅ Created index.html"

# 6. Set permissions
echo "🔒 Setting permissions..."
chmod +x setup.sh
chmod +x test-proxy.js

# 7. Clean up any lock files
echo "🧹 Cleaning up..."
rm -f package-lock.json
rm -f yarn.lock

echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================="
echo "Next steps:"
echo "1. Check structure: node check-structure.js"
echo "2. Test proxy system: node test-proxy.js"
echo "3. Start server: npm start"
echo "4. Open browser: http://localhost:3000"
echo ""
echo "For Railway deployment:"
echo "- Set NODE_ENV=production"
echo "- Set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser"