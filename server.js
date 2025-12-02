const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'organic-traffic-bot-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Import bot modules
const TrafficGenerator = require('./bot/trafficGenerator');
const botManager = new TrafficGenerator();

// Enhanced error handling untuk Puppeteer
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
});

// AUTO-LOOP CONFIG dengan Pure Organic Mode
const AUTO_LOOP_CONFIG = {
  enabled: process.env.AUTO_LOOP === 'true' || true,
  interval: parseInt(process.env.LOOP_INTERVAL) || 45 * 60 * 1000, // 45 menit default
  maxSessions: parseInt(process.env.MAX_SESSIONS) || 3,
  targetUrl: process.env.DEFAULT_TARGET_URL || 'https://cryptoajah.blogspot.com',
  retryCount: 0,
  maxRetries: 3,
  healthCheckInterval: 60000, // Check kesehatan setiap 1 menit
  maxSessionDuration: 20 * 60 * 1000, // 20 menit maksimal per session
  searchEngines: ['google', 'bing'], // Pencarian bergantian
  proxyRefreshInterval: 10 * 60 * 1000, // ⭐ AUTO-PROXY REFRESH 10 MENIT
  minProxyCount: 20 // Minimal proxy aktif
  timeMultiplierEnabled: true
};

let autoLoopInterval = null;
let sessionHealthCheckInterval = null;
let proxyRefreshInterval = null;

// ==================== AUTO-PROXY REFRESH SYSTEM ====================
function startProxyAutoRefresh() {
  if (proxyRefreshInterval) {
    clearInterval(proxyRefreshInterval);
  }

  proxyRefreshInterval = setInterval(async () => {
    try {
      console.log('🔄 AUTO-PROXY: Refreshing all proxies (10 minute cycle)...');
      await botManager.proxyHandler.updateAllProxies();
      
      const proxyStats = botManager.proxyHandler.getAllActiveProxies();
      const totalProxies = 
        (proxyStats.webProxies?.filter(p => p.working).length || 0) +
        (proxyStats.freshProxies?.length || 0) +
        (proxyStats.vpnExtensions?.length || 0);
      
      console.log(`✅ AUTO-PROXY: Refreshed! Total active proxies: ${totalProxies}`);
      
      // Log detailed stats
      console.log(`📊 Web Proxies: ${proxyStats.webProxies?.filter(p => p.working).length || 0}/25`);
      console.log(`📊 Fresh Proxies: ${proxyStats.freshProxies?.length || 0}/50`);
      console.log(`📊 VPN Extensions: ${proxyStats.vpnExtensions?.length || 0}/10`);
      
    } catch (error) {
      console.error('❌ AUTO-PROXY: Refresh failed:', error.message);
    }
  }, AUTO_LOOP_CONFIG.proxyRefreshInterval);
}

// ==================== PURE ORGANIC AUTO-LOOP ====================
function startAutoLooping() {
  if (autoLoopInterval) {
    clearInterval(autoLoopInterval);
  }

  autoLoopInterval = setInterval(async () => {
    try {
      const activeSessions = botManager.getAllSessions().filter(s => s.status === 'running');
      
      if (activeSessions.length < AUTO_LOOP_CONFIG.maxSessions) {
        console.log(`🔄 AUTO-LOOP: Starting PURE organic session (${activeSessions.length + 1}/${AUTO_LOOP_CONFIG.maxSessions})`);
        
        const sessionConfig = {
          profileCount: 1,
          targetUrl: AUTO_LOOP_CONFIG.targetUrl,
          deviceType: Math.random() > 0.5 ? 'desktop' : 'mobile',
          isAutoLoop: true,
          proxyType: 'fresh',
          isOrganic: true, // ⭐ HARUS ORGANIC
          maxKeywords: 3,
          enableSubUrl: true,
          searchEngine: AUTO_LOOP_CONFIG.searchEngines[Math.floor(Math.random() * 2)]
          enableTimeMultiplier: AUTO_LOOP_CONFIG.timeMultiplierEnabled
        };

        await botManager.startOrganicSession(sessionConfig);
        
        AUTO_LOOP_CONFIG.retryCount = 0;
        console.log(`✅ AUTO-LOOP: Pure organic session started via ${sessionConfig.searchEngine}`);
      }
    } catch (error) {
      console.error('❌ AUTO-LOOP: Error starting session:', error.message);
      AUTO_LOOP_CONFIG.retryCount++;
      
      if (AUTO_LOOP_CONFIG.retryCount >= AUTO_LOOP_CONFIG.maxRetries) {
        console.error('🚨 AUTO-LOOP: Max retries reached, pausing auto-loop');
        AUTO_LOOP_CONFIG.enabled = false;
        clearInterval(autoLoopInterval);
      }
    }
  }, AUTO_LOOP_CONFIG.interval);
}

// ==================== SESSION HEALTH CHECK ====================
function startSessionHealthCheck() {
  if (sessionHealthCheckInterval) {
    clearInterval(sessionHealthCheckInterval);
  }

  sessionHealthCheckInterval = setInterval(() => {
    try {
      const sessions = botManager.getAllSessions();
      const now = Date.now();
      let cleanedCount = 0;
      
      sessions.forEach(session => {
        if (session.status === 'running') {
          const sessionDuration = now - new Date(session.startTime).getTime();
          
          if (sessionDuration > AUTO_LOOP_CONFIG.maxSessionDuration) {
            console.log(`🕒 HEALTH CHECK: Stopping session ${session.id} (exceeded ${AUTO_LOOP_CONFIG.maxSessionDuration/60000} minutes)`);
            botManager.stopSession(session.id);
            cleanedCount++;
          }
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`🧹 HEALTH CHECK: Cleaned ${cleanedCount} old sessions`);
      }
      
    } catch (error) {
      console.error('❌ HEALTH CHECK: Error:', error.message);
    }
  }, AUTO_LOOP_CONFIG.healthCheckInterval);
}

// ==================== START ALL SYSTEMS ====================
console.log('🚀 Starting PURE Organic Traffic Bot...');

// Start proxy auto-refresh (Wajib dijalankan)
console.log('🔄 AUTO-PROXY: Starting 10-minute auto-refresh system');
startProxyAutoRefresh();

// Start auto-loop jika enabled
if (AUTO_LOOP_CONFIG.enabled) {
  console.log('🔄 AUTO-LOOP: System starting with PURE organic-only mode');
  startAutoLooping();
}

// Start health check system
console.log('🏥 HEALTH CHECK: Starting session health monitoring');
startSessionHealthCheck();

// ==================== ROUTES ====================

// Static pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitoring.html'));
});

// ==================== API ROUTES ====================

// PURE ORGANIC SESSION
app.post('/api/start-organic', async (req, res) => {
  try {
    const { targetUrl, profiles, deviceType, proxyType, maxKeywords, enableSubUrl, searchEngine } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Target URL is required'
      });
    }

    if (!proxyType) {
      return res.status(400).json({
        success: false,
        error: 'Proxy type is REQUIRED.'
      });
    }

    const sessionConfig = {
      profileCount: parseInt(profiles) || 1,
      targetUrl: targetUrl,
      deviceType: deviceType || 'desktop',
      proxyType: proxyType,
      isOrganic: true,
      maxKeywords: parseInt(maxKeywords) || 5,
      enableSubUrl: enableSubUrl || false,
      searchEngine: searchEngine || 'google'
    };

    console.log(`🌱 Starting PURE ORGANIC session to ${targetUrl} via ${sessionConfig.searchEngine}`);

    const sessionId = await botManager.startOrganicSession(sessionConfig);
    
    res.json({ 
      success: true, 
      sessionId,
      message: `Pure organic session started via ${sessionConfig.searchEngine}`
    });
  } catch (error) {
    console.error('❌ Error starting organic session:', error.message);
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// KEYWORD ANALYSIS
app.post('/api/analyze-keywords', async (req, res) => {
  try {
    const { targetUrl } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Target URL is required'
      });
    }

    const analyzer = new (require('./bot/keywordAnalyzer'))();
    const result = await analyzer.analyze(targetUrl);
    
    res.json({ 
      success: true, 
      ...result 
    });
  } catch (error) {
    console.error('Error analyzing keywords:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// SESSION MANAGEMENT
app.get('/api/session-logs/:sessionId', (req, res) => {
  try {
    const logs = botManager.getSessionLogs(req.params.sessionId);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error getting session logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/all-sessions', (req, res) => {
  try {
    const sessions = botManager.getAllSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error getting all sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stop-session/:sessionId', (req, res) => {
  try {
    botManager.stopSession(req.params.sessionId);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error('Error stopping session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stop-all-sessions', (req, res) => {
  try {
    botManager.stopAllSessions();
    res.json({ success: true, message: 'All sessions stopped' });
  } catch (error) {
    console.error('Error stopping all sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clear-sessions', (req, res) => {
  try {
    botManager.clearAllSessions();
    res.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AUTO-LOOP MANAGEMENT
app.post('/api/auto-loop/start', (req, res) => {
  try {
    const { interval, maxSessions, targetUrl } = req.body;
    
    AUTO_LOOP_CONFIG.enabled = true;
    AUTO_LOOP_CONFIG.interval = interval || AUTO_LOOP_CONFIG.interval;
    AUTO_LOOP_CONFIG.maxSessions = maxSessions || AUTO_LOOP_CONFIG.maxSessions;
    AUTO_LOOP_CONFIG.targetUrl = targetUrl || AUTO_LOOP_CONFIG.targetUrl;
    
    startAutoLooping();
    
    res.json({
      success: true,
      message: `Pure organic auto-loop started with ${AUTO_LOOP_CONFIG.interval/60000} minute intervals`,
      config: AUTO_LOOP_CONFIG
    });
  } catch (error) {
    console.error('Error starting auto-loop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auto-loop/stop', (req, res) => {
  try {
    AUTO_LOOP_CONFIG.enabled = false;
    if (autoLoopInterval) {
      clearInterval(autoLoopInterval);
      autoLoopInterval = null;
    }
    
    res.json({
      success: true,
      message: 'Auto-looping stopped'
    });
  } catch (error) {
    console.error('Error stopping auto-loop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auto-loop/status', (req, res) => {
  try {
    const activeSessions = botManager.getAllSessions().filter(s => s.status === 'running');
    
    res.json({
      success: true,
      config: AUTO_LOOP_CONFIG,
      activeSessions: activeSessions.length,
      totalSessions: botManager.getAllSessions().length,
      healthCheck: {
        enabled: true,
        interval: AUTO_LOOP_CONFIG.healthCheckInterval,
        maxSessionDuration: AUTO_LOOP_CONFIG.maxSessionDuration
      }
    });
  } catch (error) {
    console.error('Error getting auto-loop status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PROXY MANAGEMENT
app.get('/api/proxies/status', async (req, res) => {
  try {
    const proxies = botManager.proxyHandler.getAllActiveProxies();
    res.json({ 
      success: true, 
      ...proxies 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/proxies/refresh', async (req, res) => {
  try {
    await botManager.proxyHandler.updateAllProxies();
    const proxies = botManager.proxyHandler.getAllActiveProxies();
    
    res.json({ 
      success: true, 
      message: 'All proxies refreshed successfully',
      ...proxies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SYSTEM TEST
app.get('/api/test-puppeteer', async (req, res) => {
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--window-size=1920,1080'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      ignoreDefaultArgs: ['--disable-extensions'],
      timeout: 60000
    });
    
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(30000);
    
    await page.goto('https://example.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    
    const title = await page.title();
    await browser.close();
    
    res.json({ 
      success: true, 
      message: 'Puppeteer test successful',
      title: title
    });
  } catch (error) {
    console.error('Puppeteer test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// SYSTEM HEALTH
app.get('/api/system/health', (req, res) => {
  try {
    const sessions = botManager.getAllSessions();
    const activeSessions = sessions.filter(s => s.status === 'running');
    const memoryUsage = process.memoryUsage();
    const proxyStats = botManager.proxyHandler.getAllActiveProxies();
    
    const totalProxies = 
      (proxyStats.webProxies?.filter(p => p.working).length || 0) +
      (proxyStats.freshProxies?.length || 0) +
      (proxyStats.vpnExtensions?.length || 0);
    
    res.json({
      success: true,
      system: {
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
        },
        nodeVersion: process.version,
        platform: process.platform
      },
      sessions: {
        total: sessions.length,
        running: activeSessions.length,
        stopped: sessions.filter(s => s.status === 'stopped').length,
        error: sessions.filter(s => s.status === 'error').length
      },
      proxies: {
        total: totalProxies,
        web: proxyStats.webProxies?.filter(p => p.working).length || 0,
        fresh: proxyStats.freshProxies?.length || 0,
        vpn: proxyStats.vpnExtensions?.length || 0,
        lastUpdate: proxyStats.lastUpdate
      },
      autoLoop: AUTO_LOOP_CONFIG,
      healthCheck: {
        enabled: true,
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const activeSessions = botManager.getAllSessions().filter(s => s.status === 'running');
  const memoryUsage = process.memoryUsage();
  const proxyStats = botManager.proxyHandler.getAllActiveProxies();
  
  const totalProxies = 
    (proxyStats.webProxies?.filter(p => p.working).length || 0) +
    (proxyStats.freshProxies?.length || 0) +
    (proxyStats.vpnExtensions?.length || 0);
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    system: {
      uptime: Math.round(process.uptime()) + 's',
      memory: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
    },
    traffic: {
      mode: 'PURE_ORGANIC',
      sessions: activeSessions.length,
      maxSessions: AUTO_LOOP_CONFIG.maxSessions
    },
    proxies: {
      total: totalProxies,
      refresh: 'every_10_minutes',
      lastUpdate: proxyStats.lastUpdate
    },
    healthCheck: {
      enabled: true,
      maxSessionDuration: AUTO_LOOP_CONFIG.maxSessionDuration
    }
  });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `API endpoint not found: ${req.method} ${req.originalUrl}` 
  });
});

app.use((req, res) => {
  if (req.url.startsWith('/api/')) {
    res.status(404).json({ 
      success: false, 
      error: 'API endpoint not found' 
    });
  } else {
    res.status(404).send(`
      <html>
        <head><title>404 - Page Not Found</title></head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <a href="/">Go to Home Page</a>
        </body>
      </html>
    `);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Puppeteer path: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'default'}`);
  console.log(`🌱 Mode: PURE ORGANIC TRAFFIC ONLY`);
  console.log(`🔄 Auto-loop: ${AUTO_LOOP_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`⏰ Auto-loop interval: ${AUTO_LOOP_CONFIG.interval/60000} minutes`);
  console.log(`📈 Max sessions: ${AUTO_LOOP_CONFIG.maxSessions}`);
  console.log(`🎯 Target URL: ${AUTO_LOOP_CONFIG.targetUrl}`);
  console.log(`🔍 Search Engines: ${AUTO_LOOP_CONFIG.searchEngines.join(', ')}`);
  console.log(`🔄 Proxy Auto-Refresh: ENABLED (every 10 minutes)`);
  console.log(`⏱️ Max session duration: ${AUTO_LOOP_CONFIG.maxSessionDuration/60000} minutes`);
});

// Handle graceful shutdown
function gracefulShutdown(signal) {
  return () => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    // Stop auto-loop
    if (autoLoopInterval) {
      clearInterval(autoLoopInterval);
      autoLoopInterval = null;
    }
    
    // Stop health check
    if (sessionHealthCheckInterval) {
      clearInterval(sessionHealthCheckInterval);
      sessionHealthCheckInterval = null;
    }
    
    // Stop proxy refresh
    if (proxyRefreshInterval) {
      clearInterval(proxyRefreshInterval);
      proxyRefreshInterval = null;
    }
    
    // Stop all sessions
    botManager.stopAllSessions();
    
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('⏰ Could not close connections in time, forcing shutdown');
      process.exit(1);
    }, 10000);
  };
}

process.on('SIGINT', gracefulShutdown('SIGINT'));
process.on('SIGTERM', gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION')();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});
