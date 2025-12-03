const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// Railway environment detection
const isRailway = process.env.NODE_ENV === 'production';

// Set Puppeteer executable path for Railway
if (isRailway) {
  process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';
  process.env.CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/google-chrome-stable';
  
  console.log(`🚂 Railway environment detected`);
  console.log(`🔧 Chrome path: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  console.log(`🔧 Chrome exists: ${fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)}`);
}

const app = express();
// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// ==================== SESSION CONFIG ====================
app.use(session({
  secret: process.env.SESSION_SECRET || 'organic-traffic-bot-secure-key-2025-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// ==================== ERROR HANDLING ====================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

// ==================== BOT MODULES LOADING ====================
console.log('🚀 Loading bot modules...');

let botManager = null;
let ProxyHandler = null;
let KeywordAnalyzer = null;
let BotHandler = null;

try {
  // Load modules with version check
  const puppeteer = require('puppeteer');
  console.log(`✅ Puppeteer v${puppeteer.version} loaded`);
  
  // Load bot modules - FIX PATH
  ProxyHandler = require('./bot/proxyHandler');
  KeywordAnalyzer = require('./bot/keywordAnalyzer');
  BotHandler = require('./bot/botHandler');
  
  // Load TrafficGenerator
  const TrafficGenerator = require('./bot/trafficGenerator');
  botManager = new TrafficGenerator();
  
  console.log('✅ All bot modules loaded successfully');
} catch (error) {
  console.error('❌ Error loading bot modules:', error.message);
  console.log('⚠️  Running in API-only mode (bot features disabled)');
  
  // Create mock bot manager for API compatibility
  botManager = {
    getAllSessions: () => [],
    getSessionLogs: () => [],
    stopSession: () => {},
    stopAllSessions: () => {},
    clearAllSessions: () => {},
    proxyHandler: {
      getAllActiveProxies: () => ({ freshProxies: [], vpnExtensions: [], stats: { totalWorking: 0 } }),
      updateAllProxies: () => Promise.resolve({ success: false })
    }
  };
}

// ==================== AUTO-LOOP CONFIG ====================
const AUTO_LOOP_CONFIG = {
  enabled: process.env.AUTO_LOOP === 'true' || false,
  interval: parseInt(process.env.LOOP_INTERVAL) || 45 * 60 * 1000,
  maxSessions: parseInt(process.env.MAX_SESSIONS) || 3,
  targetUrl: process.env.DEFAULT_TARGET_URL || 'https://cryptoajah.blogspot.com',
  retryCount: 0,
  maxRetries: 3,
  healthCheckInterval: 60000,
  maxSessionDuration: 30 * 60 * 1000,
  searchEngines: ['google', 'bing'],
  proxyRefreshInterval: 10 * 60 * 1000,
  minProxyCount: 10
};

let autoLoopInterval = null;
let sessionHealthCheckInterval = null;
let proxyRefreshInterval = null;

// ==================== AUTO-SYSTEMS MANAGEMENT ====================
function startProxyAutoRefresh() {
  if (proxyRefreshInterval) {
    clearInterval(proxyRefreshInterval);
  }

  if (botManager && botManager.proxyHandler) {
    proxyRefreshInterval = setInterval(async () => {
      try {
        console.log('🔄 AUTO-PROXY: Refreshing all proxies (10 minute cycle)...');
        await botManager.proxyHandler.updateAllProxies();
        
        const proxyStats = botManager.proxyHandler.getAllActiveProxies();
        const totalProxies = 
          (proxyStats.freshProxies?.length || 0) +
          (proxyStats.vpnExtensions?.length || 0);
        
        console.log(`✅ AUTO-PROXY: Refreshed! Total active proxies: ${totalProxies}`);
      } catch (error) {
        console.error('❌ AUTO-PROXY: Refresh failed:', error.message);
      }
    }, AUTO_LOOP_CONFIG.proxyRefreshInterval);
    
    console.log('🔄 AUTO-PROXY: System started (10 minute refresh)');
  }
}

function startAutoLooping() {
  if (autoLoopInterval) {
    clearInterval(autoLoopInterval);
  }

  if (!AUTO_LOOP_CONFIG.enabled || !botManager) {
    console.log('⚠️  AUTO-LOOP: Disabled or bot manager not available');
    return;
  }

  console.log(`🔄 AUTO-LOOP: System starting with ${AUTO_LOOP_CONFIG.interval/60000} minute intervals`);
  
  autoLoopInterval = setInterval(async () => {
    try {
      const activeSessions = botManager.getAllSessions().filter(s => s.status === 'running');
      
      if (activeSessions.length < AUTO_LOOP_CONFIG.maxSessions) {
        console.log(`🔄 AUTO-LOOP: Starting organic session (${activeSessions.length + 1}/${AUTO_LOOP_CONFIG.maxSessions})`);
        
        const sessionConfig = {
          profileCount: 1,
          targetUrl: AUTO_LOOP_CONFIG.targetUrl,
          deviceType: Math.random() > 0.5 ? 'desktop' : 'mobile',
          isAutoLoop: true,
          proxyType: 'fresh',
          isOrganic: true,
          maxKeywords: 3,
          enableSubUrl: true,
          searchEngine: AUTO_LOOP_CONFIG.searchEngines[Math.floor(Math.random() * 2)],
          enableBotDetection: true,
          timeMultiplierEnabled: true
        };

        await botManager.startOrganicSession(sessionConfig);
        
        AUTO_LOOP_CONFIG.retryCount = 0;
        console.log(`✅ AUTO-LOOP: Session started via ${sessionConfig.searchEngine}`);
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

function startSessionHealthCheck() {
  if (sessionHealthCheckInterval) {
    clearInterval(sessionHealthCheckInterval);
  }

  sessionHealthCheckInterval = setInterval(() => {
    try {
      if (!botManager) return;
      
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

// Start systems if bot manager is available
if (botManager) {
  startProxyAutoRefresh();
  
  if (AUTO_LOOP_CONFIG.enabled) {
    startAutoLooping();
  }
  
  startSessionHealthCheck();
} else {
  console.log('⚠️  Bot features disabled, running API-only mode');
}

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

    if (!botManager) {
      return res.status(503).json({
        success: false,
        error: 'Bot system is not available. Check server logs.'
      });
    }

    const sessionConfig = {
      profileCount: parseInt(profiles) || 1,
      targetUrl: targetUrl,
      deviceType: deviceType || 'desktop',
      proxyType: proxyType || 'fresh',
      isOrganic: true,
      maxKeywords: parseInt(maxKeywords) || 5,
      enableSubUrl: enableSubUrl || false,
      searchEngine: searchEngine || 'google',
      enableBotDetection: true,
      timeMultiplierEnabled: true
    };

    console.log(`🌱 Starting PURE ORGANIC session to ${targetUrl} via ${sessionConfig.searchEngine}`);

    const sessionId = await botManager.startOrganicSession(sessionConfig);
    
    res.json({ 
      success: true, 
      sessionId,
      message: `Pure organic session started via ${sessionConfig.searchEngine}`,
      config: sessionConfig
    });
  } catch (error) {
    console.error('❌ Error starting organic session:', error.message);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    if (!KeywordAnalyzer) {
      return res.status(503).json({
        success: false,
        error: 'Keyword analyzer not available'
      });
    }

    const analyzer = new KeywordAnalyzer();
    const result = await analyzer.analyze(targetUrl);
    
    res.json({ 
      success: true, 
      ...result 
    });
  } catch (error) {
    console.error('❌ Error analyzing keywords:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// SESSION MANAGEMENT
app.get('/api/session-logs/:sessionId', (req, res) => {
  try {
    if (!botManager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Bot system not available' 
      });
    }
    
    const logs = botManager.getSessionLogs(req.params.sessionId);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('❌ Error getting session logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/all-sessions', (req, res) => {
  try {
    if (!botManager) {
      return res.json({ success: true, sessions: [] });
    }
    
    const sessions = botManager.getAllSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('❌ Error getting all sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stop-session/:sessionId', (req, res) => {
  try {
    if (!botManager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Bot system not available' 
      });
    }
    
    botManager.stopSession(req.params.sessionId);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error('❌ Error stopping session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stop-all-sessions', (req, res) => {
  try {
    if (!botManager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Bot system not available' 
      });
    }
    
    botManager.stopAllSessions();
    res.json({ success: true, message: 'All sessions stopped' });
  } catch (error) {
    console.error('❌ Error stopping all sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clear-sessions', (req, res) => {
  try {
    if (!botManager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Bot system not available' 
      });
    }
    
    botManager.clearAllSessions();
    res.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
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
    
    if (targetUrl) {
      AUTO_LOOP_CONFIG.targetUrl = targetUrl;
    }
    
    startAutoLooping();
    
    res.json({
      success: true,
      message: `Pure organic auto-loop started with ${AUTO_LOOP_CONFIG.interval/60000} minute intervals`,
      config: AUTO_LOOP_CONFIG
    });
  } catch (error) {
    console.error('❌ Error starting auto-loop:', error);
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
      message: 'Auto-loop stopped'
    });
  } catch (error) {
    console.error('❌ Error stopping auto-loop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auto-loop/status', (req, res) => {
  try {
    const activeSessions = botManager ? 
      botManager.getAllSessions().filter(s => s.status === 'running').length : 0;
    
    res.json({
      success: true,
      config: AUTO_LOOP_CONFIG,
      activeSessions: activeSessions,
      totalSessions: botManager ? botManager.getAllSessions().length : 0,
      healthCheck: {
        enabled: true,
        interval: AUTO_LOOP_CONFIG.healthCheckInterval,
        maxSessionDuration: AUTO_LOOP_CONFIG.maxSessionDuration
      }
    });
  } catch (error) {
    console.error('❌ Error getting auto-loop status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PROXY MANAGEMENT
app.get('/api/proxies/status', async (req, res) => {
  try {
    if (!botManager || !botManager.proxyHandler) {
      return res.json({ 
        success: true, 
        freshProxies: [],
        vpnExtensions: [],
        stats: { totalWorking: 0 },
        lastUpdate: null,
        message: 'Proxy handler not available'
      });
    }
    
    const proxies = botManager.proxyHandler.getAllActiveProxies();
    res.json({ 
      success: true, 
      ...proxies 
    });
  } catch (error) {
    console.error('❌ Error getting proxy status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/proxies/refresh', async (req, res) => {
  try {
    if (!botManager || !botManager.proxyHandler) {
      return res.status(503).json({ 
        success: false, 
        error: 'Proxy handler not available' 
      });
    }
    
    await botManager.proxyHandler.updateAllProxies();
    const proxies = botManager.proxyHandler.getAllActiveProxies();
    
    res.json({ 
      success: true, 
      message: 'Proxies refreshed successfully',
      ...proxies
    });
  } catch (error) {
    console.error('❌ Error refreshing proxies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SYSTEM TEST
app.get('/api/test-puppeteer', async (req, res) => {
  try {
    const puppeteer = require('puppeteer');
    
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';
    console.log(`Testing Puppeteer with Chrome at: ${chromePath}`);
    
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
        '--window-size=1920,1080'
      ],
      executablePath: chromePath,
      ignoreHTTPSErrors: true,
      timeout: 60000
    });
    
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(30000);
    
    await page.goto('https://httpbin.org/ip', { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    
    const content = await page.content();
    const title = await page.title();
    await browser.close();
    
    res.json({ 
      success: true, 
      message: 'Puppeteer test successful',
      title: title,
      chromePath: chromePath,
      hasContent: content.includes('origin'),
      contentLength: content.length
    });
  } catch (error) {
    console.error('❌ Puppeteer test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      chromePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// SYSTEM HEALTH
app.get('/api/system/health', (req, res) => {
  try {
    const sessions = botManager ? botManager.getAllSessions() : [];
    const activeSessions = sessions.filter(s => s.status === 'running');
    const memoryUsage = process.memoryUsage();
    
    const proxyStats = botManager && botManager.proxyHandler ? 
      botManager.proxyHandler.getAllActiveProxies() : { freshProxies: [], vpnExtensions: [] };
    
    const totalProxies = 
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
        platform: process.platform,
        chromePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        chromeExists: fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH || '')
      },
      sessions: {
        total: sessions.length,
        running: activeSessions.length,
        stopped: sessions.filter(s => s.status === 'stopped').length,
        error: sessions.filter(s => s.status === 'error').length
      },
      proxies: {
        total: totalProxies,
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
    console.error('❌ Error getting system health:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const activeSessions = botManager ? 
    botManager.getAllSessions().filter(s => s.status === 'running').length : 0;
  const memoryUsage = process.memoryUsage();
  
  const proxyStats = botManager && botManager.proxyHandler ? 
    botManager.proxyHandler.getAllActiveProxies() : { freshProxies: [], vpnExtensions: [] };
  
  const totalProxies = 
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
      sessions: activeSessions,
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
  console.error('❌ Unhandled error:', error);
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
  console.log(`🔧 Puppeteer path: ${process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'}`);
  console.log(`🌱 Mode: PURE ORGANIC TRAFFIC ONLY`);
  console.log(`🔄 Auto-loop: ${AUTO_LOOP_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`⏰ Auto-loop interval: ${AUTO_LOOP_CONFIG.interval/60000} minutes`);
  console.log(`📈 Max sessions: ${AUTO_LOOP_CONFIG.maxSessions}`);
  console.log(`🎯 Target URL: ${AUTO_LOOP_CONFIG.targetUrl}`);
  console.log(`🔍 Search Engines: ${AUTO_LOOP_CONFIG.searchEngines.join(', ')}`);
  console.log(`🔄 Proxy Auto-Refresh: ${botManager ? 'ENABLED (every 10 minutes)' : 'DISABLED'}`);
  console.log(`⏱️ Max session duration: ${AUTO_LOOP_CONFIG.maxSessionDuration/60000} minutes`);
  console.log(`📁 Public directory: ${path.join(__dirname, 'public')}`);
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
    if (botManager) {
      botManager.stopAllSessions();
    }
    
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

module.exports = app;
