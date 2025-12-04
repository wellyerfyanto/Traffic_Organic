const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// ==================== DEBUG: CHECK STRUCTURE FIRST ====================
console.log('🔍 DEBUG: Checking project structure...');
console.log('Current directory:', __dirname);
console.log('CWD:', process.cwd());

try {
  const files = fs.readdirSync(__dirname);
  console.log('Root files:', files.filter(f => f.endsWith('.js')));

  const botDir = path.join(__dirname, 'bot');
  if (fs.existsSync(botDir)) {
    const botFiles = fs.readdirSync(botDir);
    console.log('Bot files:', botFiles);
  } else {
    console.log('❌ Bot directory not found! Creating...');
    fs.mkdirSync(botDir, { recursive: true });
  }
} catch (err) {
  console.log('Error checking structure:', err.message);
}

// Railway environment detection
const isRailway = process.env.NODE_ENV === 'production';

// Set Puppeteer executable path for Railway
if (isRailway) {
  process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
  process.env.CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';
  console.log(`🚂 Railway environment detected`);
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

// ==================== ROBUST MODULE LOADING ====================
console.log('🚀 Loading bot modules...');

let botManager = null;
let ProxyHandler = null;
let KeywordAnalyzer = null;
let BotHandler = null;
let TrafficGenerator = null;

try {
  // Try to load Puppeteer
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
    console.log(`✅ Puppeteer v${puppeteer.version} loaded`);
  } catch (error) {
    console.log('⚠️ Standard puppeteer not available, trying puppeteer-core...');
    try {
      puppeteer = require('puppeteer-core');
      console.log('✅ Using puppeteer-core with system Chrome');
    } catch (coreError) {
      console.log('⚠️ puppeteer-core also not available:', coreError.message);
      throw new Error('Puppeteer is required but not installed. Run: npm install puppeteer');
    }
  }

  console.log('\n📦 Loading bot modules from bot/ directory...');

  // Create bot directory if it doesn't exist
  const botDir = path.join(__dirname, 'bot');
  if (!fs.existsSync(botDir)) {
    console.log(`Creating bot directory: ${botDir}`);
    fs.mkdirSync(botDir, { recursive: true });
  }

  // List files in bot directory
  const botFiles = fs.readdirSync(botDir);
  console.log(`Files in bot/: ${botFiles.join(', ')}`);

  // ==================== FIXED: SIMPLIFIED MODULE LOADING ====================
  // Load modules dengan error handling yang lebih baik
  const loadModule = (moduleName) => {
    const possiblePaths = [
      path.join(botDir, moduleName),
      path.join(__dirname, moduleName)
    ];
    
    for (const modulePath of possiblePaths) {
      if (fs.existsSync(modulePath)) {
        try {
          console.log(`Loading ${moduleName} from: ${modulePath}`);
          return require(modulePath);
        } catch (error) {
          console.error(`Error loading ${moduleName} from ${modulePath}:`, error.message);
        }
      }
    }
    
    return null;
  };

  // Load semua modul
  ProxyHandler = loadModule('./bot/proxyHandler.js');
  KeywordAnalyzer = loadModule('./bot/keywordAnalyzer.js');
  BotHandler = loadModule('./bot/botHandler.js');
  TrafficGenerator = loadModule('./bot/trafficGenerator.js');

  if (!ProxyHandler) {
    console.error('❌ CRITICAL: proxyHandler.js not loaded');
    throw new Error('proxyHandler.js not found or failed to load');
  }

  if (!TrafficGenerator) {
    console.error('❌ CRITICAL: trafficGenerator.js not loaded');
    throw new Error('trafficGenerator.js not found or failed to load');
  }

  console.log('\n🎉 All bot modules loaded successfully!');

  // Initialize bot manager
  try {
    botManager = new TrafficGenerator();
    console.log('✅ BotManager initialized');
    
    // Initialize proxy handler - TIDAK langsung di constructor
    setTimeout(async () => {
      if (botManager.proxyHandler && botManager.proxyHandler.initialize) {
        try {
          await botManager.proxyHandler.initialize();
          console.log('✅ Proxy system ready');
        } catch (err) {
          console.error('❌ Proxy system initialization failed:', err.message);
        }
      }
    }, 3000); // Delay initialization
    
  } catch (error) {
    console.error('❌ Failed to initialize BotManager:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }

} catch (error) {
  console.error('❌ CRITICAL Error loading bot modules:', error.message);
  console.error('Stack trace:', error.stack);

  // Create mock bot manager for API compatibility
  console.log('⚠️ Creating mock bot manager for API-only mode');
  botManager = {
    getAllSessions: () => [],
    getSessionLogs: () => [],
    stopSession: () => {},
    stopAllSessions: () => {},
    clearAllSessions: () => {},
    startOrganicSession: () => Promise.resolve('mock-session-id-' + Date.now()),
    getStats: () => ({
      totalSessions: 0,
      successfulSessions: 0,
      activeSessions: 0,
      botDetectionCount: 0,
      sessionLogsCount: 0
    }),
    proxyHandler: {
      getAllActiveProxies: () => ({
        freshProxies: [],
        webProxies: [],
        vpnProxies: [],
        stats: {
          totalWorking: 0,
          fresh: { total: 0, working: 0, byType: {}, fastest: [] },
          web: { total: 0, working: 0 },
          vpn: { total: 0, working: 0, premium: 0, byCountry: {} },
          successRate: 0,
          lastUpdate: null,
          nextUpdate: null
        }
      }),
      updateAllProxies: () => Promise.resolve({ 
        success: false, 
        error: 'Proxy handler not available',
        proxies: { fresh: [], web: [], vpn: [] }
      }),
      cleanup: () => {},
      startAutoUpdate: () => {},
      stopAutoUpdate: () => {},
      initialize: () => Promise.resolve()
    }
  };

  console.log('⚠️ Running in API-only mode (bot features disabled)');
}

// ==================== AUTO-LOOP CONFIG (UPDATED) ====================
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
  proxyRefreshInterval: 30 * 60 * 1000,
  minProxyCount: 5,
  enableDirectFallback: true
};

let autoLoopInterval = null;
let sessionHealthCheckInterval = null;
let proxyRefreshInterval = null;

// ==================== CLEANUP FUNCTIONS ====================
function cleanupAllIntervals() {
  console.log('🧹 Cleaning up all intervals...');
  [autoLoopInterval, sessionHealthCheckInterval, proxyRefreshInterval].forEach(interval => {
    if (interval) clearInterval(interval);
  });
  autoLoopInterval = null;
  sessionHealthCheckInterval = null;
  proxyRefreshInterval = null;
}

// ==================== START ALL SYSTEMS ====================
console.log('🚀 Starting PURE Organic Traffic Bot...');

// Create necessary directories
const dirs = ['data', 'public', 'bot'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created ${dir} directory`);
  }
});

// Start systems if bot manager is available
if (botManager && botManager.proxyHandler) {
  console.log('\n⚙️ Initializing systems...');

  // Start proxy refresh after delay
  setTimeout(() => {
    if (botManager.proxyHandler && botManager.proxyHandler.updateAllProxies) {
      console.log('🔄 Starting initial proxy refresh...');
      botManager.proxyHandler.updateAllProxies().then(result => {
        if (result.success) {
          console.log('✅ Proxy refresh successful');
          console.log(`   Working proxies: ${result.stats.totalWorking}`);
          console.log(`   VPN proxies: ${result.stats.vpnCount}`);
        } else {
          console.log('⚠️ Proxy refresh failed:', result.error);
        }
      }).catch(error => {
        console.error('❌ Proxy refresh error:', error.message);
      });
    }
  }, 5000);

  console.log('✅ All systems started');
} else {
  console.log('⚠️ Bot features disabled, running API-only mode');
}

// ==================== GRACEFUL SHUTDOWN ====================
function setupGracefulShutdown(server) {
  let isShuttingDown = false;

  const gracefulShutdown = (signal) => {
    return () => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      cleanupAllIntervals();

      if (botManager) {
        try {
          botManager.stopAllSessions();
          console.log('✅ All bot sessions stopped');
          
          if (botManager.proxyHandler && botManager.proxyHandler.cleanup) {
            botManager.proxyHandler.cleanup();
            console.log('✅ Proxy handler cleaned up');
          }
        } catch (error) {
          console.error('❌ Error stopping bot sessions:', error.message);
        }
      }

      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('⏰ Could not close connections in time, forcing shutdown');
        process.exit(1);
      }, 15000);
    };
  };

  process.on('SIGINT', gracefulShutdown('SIGINT'));
  process.on('SIGTERM', gracefulShutdown('SIGTERM'));
  console.log('✅ Graceful shutdown handlers registered');
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

    if (!botManager || !botManager.startOrganicSession) {
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
      timeMultiplierEnabled: true,
      enableDirectFallback: true
    };

    console.log(`🌱 Starting PURE ORGANIC session to ${targetUrl} via ${sessionConfig.searchEngine} with proxy type: ${sessionConfig.proxyType}`);

    const sessionId = await botManager.startOrganicSession(sessionConfig);

    res.json({
      success: true,
      sessionId,
      message: `Pure organic session started via ${sessionConfig.searchEngine} with ${sessionConfig.proxyType} proxy`,
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
    if (!botManager || !botManager.getSessionLogs) {
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
    if (!botManager || !botManager.getAllSessions) {
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
    if (!botManager || !botManager.stopSession) {
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
    if (!botManager || !botManager.stopAllSessions) {
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
    if (!botManager || !botManager.clearAllSessions) {
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

    // Start auto-loop
    if (autoLoopInterval) clearInterval(autoLoopInterval);

    autoLoopInterval = setInterval(async () => {
      try {
        const activeSessions = botManager && botManager.getAllSessions ? 
          botManager.getAllSessions().filter(s => s.status === 'running') : [];

        if (activeSessions.length < AUTO_LOOP_CONFIG.maxSessions) {
          console.log(`🔄 AUTO-LOOP: Starting organic session`);

          const sessionConfig = {
            profileCount: 1,
            targetUrl: AUTO_LOOP_CONFIG.targetUrl,
            deviceType: Math.random() > 0.5 ? 'desktop' : 'mobile',
            isAutoLoop: true,
            proxyType: ['fresh', 'vpn', 'web'][Math.floor(Math.random() * 3)], // Random proxy type
            isOrganic: true,
            maxKeywords: 3,
            enableSubUrl: true,
            searchEngine: AUTO_LOOP_CONFIG.searchEngines[Math.floor(Math.random() * 2)],
            enableBotDetection: true,
            timeMultiplierEnabled: true,
            enableDirectFallback: AUTO_LOOP_CONFIG.enableDirectFallback
          };

          if (botManager && botManager.startOrganicSession) {
            await botManager.startOrganicSession(sessionConfig);
          }
        }
      } catch (error) {
        console.error('❌ AUTO-LOOP: Error starting session:', error.message);
      }
    }, AUTO_LOOP_CONFIG.interval);

    res.json({
      success: true,
      message: `Pure organic auto-loop started with ${AUTO_LOOP_CONFIG.interval / 60000} minute intervals`,
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
    cleanupAllIntervals();

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
    const activeSessions = botManager && botManager.getAllSessions ?
      botManager.getAllSessions().filter(s => s.status === 'running').length : 0;

    res.json({
      success: true,
      config: AUTO_LOOP_CONFIG,
      activeSessions: activeSessions,
      totalSessions: botManager ? botManager.getAllSessions().length : 0
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
        webProxies: [],
        vpnProxies: [],
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

    const result = await botManager.proxyHandler.updateAllProxies();
    const proxies = botManager.proxyHandler.getAllActiveProxies();

    res.json({
      success: result.success,
      message: result.success ? 'Proxies refreshed successfully' : 'Proxy refresh failed',
      ...proxies,
      updateResult: result
    });
  } catch (error) {
    console.error('❌ Error refreshing proxies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SYSTEM TEST
app.get('/api/test-puppeteer', async (req, res) => {
  try {
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch {
      puppeteer = require('puppeteer-core');
    }

    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
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
    const sessions = botManager && botManager.getAllSessions ? botManager.getAllSessions() : [];
    const activeSessions = sessions.filter(s => s.status === 'running');
    const memoryUsage = process.memoryUsage();

    const proxyStats = botManager && botManager.proxyHandler ?
      botManager.proxyHandler.getAllActiveProxies() : {
        freshProxies: [],
        webProxies: [],
        vpnProxies: [],
        stats: {
          totalWorking: 0,
          fresh: { total: 0, working: 0, byType: {}, fastest: [] },
          web: { total: 0, working: 0 },
          vpn: { total: 0, working: 0, premium: 0, byCountry: {} },
          successRate: 0,
          lastUpdate: null
        }
      };

    const totalProxies = proxyStats.stats?.totalWorking || 0;

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
        fresh: proxyStats.stats?.fresh?.working || 0,
        web: proxyStats.stats?.web?.working || 0,
        vpn: proxyStats.stats?.vpn?.working || 0,
        vpnPremium: proxyStats.stats?.vpn?.premium || 0,
        vpnCountries: proxyStats.stats?.vpn?.byCountry || {},
        lastUpdate: proxyStats.stats?.lastUpdate,
        successRate: proxyStats.stats?.successRate || 0
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
  const sessions = botManager && botManager.getAllSessions ? 
    botManager.getAllSessions() : [];
  const activeSessions = sessions.filter(s => s.status === 'running').length;
  const memoryUsage = process.memoryUsage();

  const proxyStats = botManager && botManager.proxyHandler ?
    botManager.proxyHandler.getAllActiveProxies() : {
      freshProxies: [],
      webProxies: [],
      vpnProxies: []
    };

  const totalProxies = proxyStats.stats?.totalWorking || 0;

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
      fresh: proxyStats.stats?.fresh?.working || 0,
      web: proxyStats.stats?.web?.working || 0,
      vpn: proxyStats.stats?.vpn?.working || 0,
      refresh: 'every_30_minutes',
      lastUpdate: proxyStats.stats?.lastUpdate,
      successRate: proxyStats.stats?.successRate || 0
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
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Puppeteer path: ${process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'}`);
  console.log(`🌱 Mode: PURE ORGANIC TRAFFIC ONLY`);
  console.log(`🔄 Auto-loop: ${AUTO_LOOP_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`📊 Monitoring: http://localhost:${PORT}/monitoring`);
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});

// Setup graceful shutdown handler
setupGracefulShutdown(server);

module.exports = app;
