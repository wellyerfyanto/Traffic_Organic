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

# 4. Create test-keywords.html in public
echo "📝 Creating test files..."
cat > public/test-keywords.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>🔍 Test Keywords Integration</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .test-section {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .result {
            background: #f8f9fa;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #4361ee;
            border-radius: 3px;
        }
        .btn {
            padding: 10px 20px;
            background: #4361ee;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        .btn:hover {
            background: #3a0ca3;
        }
        .success { color: green; }
        .error { color: red; }
        pre {
            background: #2b2b2b;
            color: #f8f8f2;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Test Keywords Integration</h1>
        <p>Test manual dan auto keyword modes</p>
        
        <div class="test-section">
            <h3>Test 1: Auto Mode (Default)</h3>
            <button class="btn" onclick="testAuto()">Test Auto Keywords</button>
        </div>
        
        <div class="test-section">
            <h3>Test 2: Manual Mode</h3>
            <input type="text" id="testKeywords" 
                   value="crypto, blockchain, bitcoin, trading, news" 
                   style="width: 100%; padding: 10px; margin: 10px 0;">
            <button class="btn" onclick="testManual()">Test Manual Keywords</button>
        </div>
        
        <div id="results"></div>
    </div>
    
    <script>
    async function testAuto() {
        const response = await fetch('/api/start-organic', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                targetUrl: 'https://cryptoajah.blogspot.com',
                proxyType: 'vpn',
                deviceType: 'desktop',
                searchEngine: 'google',
                keywordMode: 'auto',
                maxKeywords: 5
            })
        });
        
        const result = await response.json();
        showResult('Auto Mode Result:', result);
    }
    
    async function testManual() {
        const keywords = document.getElementById('testKeywords').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
        
        const response = await fetch('/api/start-organic', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                targetUrl: 'https://cryptoajah.blogspot.com',
                proxyType: 'vpn',
                deviceType: 'desktop',
                searchEngine: 'google',
                keywordMode: 'manual',
                customKeywords: keywords,
                maxKeywords: 5
            })
        });
        
        const result = await response.json();
        showResult('Manual Mode Result:', result);
    }
    
    function showResult(title, data) {
        const results = document.getElementById('results');
        const status = data.success ? 
            `<span class="success">✅ SUCCESS</span>` : 
            `<span class="error">❌ FAILED: ${data.error || 'Unknown error'}</span>`;
        
        results.innerHTML = `
            <div class="result">
                <h3>${title} ${status}</h3>
                <p><strong>Keyword Mode:</strong> ${data.config?.keywordMode || 'auto'}</p>
                <p><strong>Keywords:</strong> ${data.config?.customKeywords?.join(', ') || 'Auto analysis'}</p>
                <details>
                    <summary>Show Full Response</summary>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </details>
            </div>
        `;
    }
    </script>
</body>
</html>
EOF
echo "✅ Created test-keywords.html"

# 5. Copy existing HTML files to public
echo "🌐 Setting up UI files..."
if [ -f "index.html" ]; then
    cp index.html public/
    echo "✅ Copied index.html to public/"
fi

if [ -f "monitoring.html" ]; then
    cp monitoring.html public/
    echo "✅ Copied monitoring.html to public/"
fi

# 6. Create .env file from template if doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env file from template..."
    if [ -f "_.env.txt" ]; then
        cp _.env.txt .env
        echo "✅ Created .env from _.env.txt"
    else
        echo "PORT=3000" > .env
        echo "NODE_ENV=development" >> .env
        echo "SESSION_SECRET=organic-traffic-bot-secret-2025" >> .env
        echo "✅ Created new .env file"
    fi
fi

# 7. Set permissions
echo "🔒 Setting permissions..."
chmod +x setup.sh
chmod +x test-proxy.js

# 8. Clean up any lock files
echo "🧹 Cleaning up..."
rm -f package-lock.json 2>/dev/null || true
rm -f yarn.lock 2>/dev/null || true

echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================="
echo "Next steps:"
echo "1. Check structure: node check-structure.js"
echo "2. Test proxy system: node test-proxy.js"
echo "3. Test keywords: open http://localhost:3000/test-keywords.html"
echo "4. Start server: npm start"
echo "5. Open dashboard: http://localhost:3000/monitoring"
echo ""
echo "For Railway deployment:"
echo "- Set NODE_ENV=production"
echo "- Set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser"