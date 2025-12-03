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
  process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
  process.env.CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';
  
  console.log(`🚂 Railway environment detected`);
  console.log(`🔧 Chrome path: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
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

// ==================== SET GLOBAL EVENT LISTENER LIMITS ====================
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);

// ==================== IMPROVED ERROR HANDLING ====================
// Remove existing listeners first
process.removeAllListeners('unhandledRejection');
process.removeAllListeners('uncaughtException');

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Don't exit, just log
});

process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error.message);
  console.error(error.stack);
  // Don't exit immediately, let the app try to recover
});

// ==================== IMPROVED MODULE LOADING ====================
console.log('🚀 Loading bot modules...');

let botManager = null;
let ProxyHandler = null;
let KeywordAnalyzer = null;
let BotHandler = null;

// Improved module loader with fallbacks
const loadModuleSafely = (moduleName) => {
  console.log(`🔍 Attempting to load: ${moduleName}`);
  
  const baseDir = __dirname;
  const possiblePaths = [
    // Primary paths (for Docker/Railway)
    path.join(baseDir, 'bot', `${moduleName}.js`),
    path.join(baseDir, 'bot', moduleName),
    
    // Fallback paths
    path.join(baseDir, `${moduleName}.js`),
    path.join(baseDir, moduleName),
    
    // Relative paths
    `./bot/${moduleName}.js`,
    `./bot/${moduleName}`,
    `./${moduleName}.js`,
    `./${moduleName}`,
    
    // For direct execution
    path.join(process.cwd(), 'bot', `${moduleName}.js`),
    path.join(process.cwd(), 'bot', moduleName),
    path.join(process.cwd(), `${moduleName}.js`),
  ];

  for (const modulePath of possiblePaths) {
    try {
      console.log(`   Trying: ${modulePath}`);
      if (fs.existsSync(modulePath.replace(/\.js$/, '') + '.js') || fs.existsSync(modulePath)) {
        const module = require(modulePath);
        console.log(`✅ Successfully loaded ${moduleName} from: ${modulePath}`);
        return module;
      }
    } catch (error) {
      // Continue to next path
      if (error.code !== 'MODULE_NOT_FOUND') {
        console.log(`   ⚠️ Error loading from ${modulePath}: ${error.message}`);
      }
    }
  }
  
  throw new Error(`Could not load ${moduleName} from any path`);
};

try {
  // Try to load Puppeteer
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
    console.log(`✅ Puppeteer v${puppeteer.version} loaded`);
  } catch (error) {
    console.log('⚠️ Standard puppeteer not available, trying puppeteer-core...');
    puppeteer = require('puppeteer-core');
    console.log('✅ Using puppeteer-core with system Chrome');
  }

  // Load bot modules with safe loader
  console.log('\n📦 Loading bot modules...');
  
  ProxyHandler = loadModuleSafely('proxyHandler');
  console.log('✅ ProxyHandler loaded');
  
  KeywordAnalyzer = loadModuleSafely('keywordAnalyzer');
  console.log('✅ KeywordAnalyzer loaded');
  
  BotHandler = loadModuleSafely('botHandler');
  console.log('✅ BotHandler loaded');
  
  const TrafficGenerator = loadModuleSafely('trafficGenerator');
  console.log('✅ TrafficGenerator loaded');
  
  // Initialize bot manager
  botManager = new TrafficGenerator();
  console.log('✅ BotManager initialized');
  
  console.log('\n🎉 All bot modules loaded successfully!');
  
} catch (error) {
  console.error('❌ Error loading bot modules:', error.message);
  console.error('Full error:', error);
  console.log('⚠️  Running in API-only mode (bot features disabled)');
  
  // Create mock bot manager for API compatibility
  botManager = {
    getAllSessions: () => [],
    getSessionLogs: () => [],
    stopSession: () => {},
    stopAllSessions: () => {},
    clearAllSessions: () => {},
    startOrganicSession: () => Promise.resolve('mock-session-id'),
    proxyHandler: {
      getAllActiveProxies: () => ({ 
        freshProxies: [], 
        webProxies: [], 
        vpnExtensions: [], 
        stats: { totalWorking: 0 } 
      }),
      updateAllProxies: () => Promise.resolve({ success: false }),
      cleanup: () => {}
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
  proxyRefreshInterval: 5 * 60 * 1000, // 5 minutes
  minProxyCount: 10,
  enableDirectFallback: true // Allow direct connection if no proxies
};

let autoLoopInterval = null;
let sessionHealthCheckInterval = null;
let proxyRefreshInterval = null;

// ==================== CLEANUP FUNCTIONS ====================
function cleanupAllIntervals() {
  console.log('🧹 Cleaning up all intervals...');
  
  const intervals = [autoLoopInterval, sessionHealthCheckInterval, proxyRefreshInterval];
  intervals.forEach((interval, index) => {
    if (interval) {
      clearInterval(interval);
      const names = ['autoLoopInterval', 'sessionHealthCheckInterval', 'proxyRefreshInterval'];
      console.log(`✅ Cleared ${names[index]}`);
    }
  });
  
  autoLoopInterval = null;
  sessionHealthCheckInterval = null;
  proxyRefreshInterval = null;
  
  // Cleanup bot manager if exists
  if (botManager && botManager.proxyHandler && botManager.proxyHandler.cleanup) {
    try {
      botManager.proxyHandler.cleanup();
      console.log('✅ Cleaned up proxyHandler');
    } catch (error) {
      console.error('❌ Error cleaning proxyHandler:', error.message);
    }
  }
}

// ==================== IMPROVED AUTO-SYSTEMS MANAGEMENT ====================
function startProxyAutoRefresh() {
  // Clean up any existing interval first
  if (proxyRefreshInterval) {
    clearInterval(proxyRefreshInterval);
    proxyRefreshInterval = null;
  }

  if (botManager && botManager.proxyHandler) {
    console.log('🔄 AUTO-PROXY: Starting auto-refresh system (every 5 minutes)...');
    
    // Initial refresh
    setTimeout(() => {
      botManager.proxyHandler.updateAllProxies().catch(err => {
        console.error('❌ Initial proxy refresh failed:', err.message);
      });
    }, 5000);
    
    // Scheduled refresh
    proxyRefreshInterval = setInterval(async () => {
      try {
        console.log('🔄 AUTO-PROXY: Scheduled refresh...');
        const result = await botManager.proxyHandler.updateAllProxies();
        
        const proxyStats = botManager.proxyHandler.getAllActiveProxies();
        const totalProxies = proxyStats.stats.totalWorking;
        
        console.log(`✅ AUTO-PROXY: Refreshed! Total working proxies: ${totalProxies}`);
        
        // If too few proxies, try again sooner
        if (totalProxies < AUTO_LOOP_CONFIG.minProxyCount) {
          console.log(`⚠️  AUTO-PROXY: Low proxy count (${totalProxies}), forcing extra refresh...`);
          setTimeout(() => {
            botManager.proxyHandler.updateAllProxies().catch(console.error);
          }, 60000);
        }
      } catch (error) {
        console.error('❌ AUTO-PROXY: Refresh failed:', error.message);
      }
    }, AUTO_LOOP_CONFIG.proxyRefreshInterval);
  } else {
    console.log('⚠️  AUTO-PROXY: Bot manager or proxy handler not available');
  }
}

function startAutoLooping() {
  // Clean up any existing interval first
  if (autoLoopInterval) {
    clearInterval(autoLoopInterval);
    autoLoopInterval = null;
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
          timeMultiplierEnabled: true,
          enableDirectFallback: AUTO_LOOP_CONFIG.enableDirectFallback
        };

        await botManager.startOrganicSession(sessionConfig);
        
        AUTO_LOOP_CONFIG.retryCount = 0;
        console.log(`✅ AUTO-LOOP: Session started via ${sessionConfig.searchEngine}`);
      } else {
        console.log(`⏸️  AUTO-LOOP: Max sessions reached (${activeSessions.length}/${AUTO_LOOP_CONFIG.maxSessions})`);
      }
    } catch (error) {
      console.error('❌ AUTO-LOOP: Error starting session:', error.message);
      AUTO_LOOP_CONFIG.retryCount++;
      
      if (AUTO_LOOP_CONFIG.retryCount >= AUTO_LOOP_CONFIG.maxRetries) {
        console.error('🚨 AUTO-LOOP: Max retries reached, pausing auto-loop');
        AUTO_LOOP_CONFIG.enabled = false;
        cleanupAllIntervals();
      }
    }
  }, AUTO_LOOP_CONFIG.interval);
}

function startSessionHealthCheck() {
  // Clean up any existing interval first
  if (sessionHealthCheckInterval) {
    clearInterval(sessionHealthCheckInterval);
    sessionHealthCheckInterval = null;
  }

  sessionHealthCheckInterval = setInterval(() => {
    try {
      if (!botManager) return;
      
      const sessions = botManager.getAllSessions();
      const now = Date.now();
      let cleanedCount = 0;
      let zombieCount = 0;
      
      sessions.forEach(session => {
        if (session.status === 'running') {
          const sessionDuration = now - new Date(session.startTime).getTime();
          
          // Check for zombie sessions (> 45 minutes)
          if (sessionDuration > AUTO_LOOP_CONFIG.maxSessionDuration * 1.5) {
            console.log(`🧟 HEALTH CHECK: Stopping zombie session ${session.id} (${Math.round(sessionDuration/60000)} minutes)`);
            botManager.stopSession(session.id);
            zombieCount++;
          }
          // Check for old sessions
          else if (sessionDuration > AUTO_LOOP_CONFIG.maxSessionDuration) {
            console.log(`🕒 HEALTH CHECK: Stopping old session ${session.id} (${Math.round(sessionDuration/60000)} minutes)`);
            botManager.stopSession(session.id);
            cleanedCount++;
          }
        }
      });
      
      if (cleanedCount > 0 || zombieCount > 0) {
        console.log(`🧹 HEALTH CHECK: Cleaned ${cleanedCount} old + ${zombieCount} zombie sessions`);
      }
      
      // Log memory usage
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // > 500MB
        console.log(`⚠️  HEALTH CHECK: High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
      }
      
    } catch (error) {
      console.error('❌ HEALTH CHECK: Error:', error.message);
    }
  }, AUTO_LOOP_CONFIG.healthCheckInterval);
}

// ==================== START ALL SYSTEMS ====================
console.log('🚀 Starting PURE Organic Traffic Bot...');

// Create necessary directories
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data directory');
}

// Check bot directory
const botDir = path.join(__dirname, 'bot');
if (!fs.existsSync(botDir)) {
  fs.mkdirSync(botDir, { recursive: true });
  console.log('📁 Created bot directory');
}

// Check public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('📁 Created public directory');
}

// Log current directory structure
console.log('\n📁 Current directory structure:');
try {
  const files = fs.readdirSync(__dirname);
  console.log('Root files:', files.filter(f => fs.statSync(path.join(__dirname, f)).isFile()));
  
  if (fs.existsSync(botDir)) {
    const botFiles = fs.readdirSync(botDir);
    console.log('Bot files:', botFiles);
  }
  
  if (fs.existsSync(publicDir)) {
    const publicFiles = fs.readdirSync(publicDir);
    console.log('Public files:', publicFiles);
  }
} catch (error) {
  console.log('Could not read directory structure:', error.message);
}

// Start systems if bot manager is available
if (botManager) {
  console.log('\n⚙️  Initializing systems...');
  
  setTimeout(() => {
    startProxyAutoRefresh();
    
    if (AUTO_LOOP_CONFIG.enabled) {
      setTimeout(() => {
        startAutoLooping();
      }, 10000); // Start after proxy refresh
    }
    
    startSessionHealthCheck();
    
    console.log('✅ All systems started');
  }, 3000); // Delay to ensure everything loaded
} else {
  console.log('⚠️  Bot features disabled, running API-only mode');
}

// ==================== IMPROVED GRACEFUL SHUTDOWN HANDLER ====================
function setupGracefulShutdown(server) {
  // Remove existing listeners to prevent duplicates
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  
  let isShuttingDown = false;
  
  const gracefulShutdown = (signal) => {
    return () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      // Cleanup all intervals
      cleanupAllIntervals();
      
      // Stop all bot sessions
      if (botManager) {
        try {
          botManager.stopAllSessions();
          console.log('✅ All bot sessions stopped');
        } catch (error) {
          console.error('❌ Error stopping bot sessions:', error.message);
        }
      }
      
      // Close server
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force shutdown after 15 seconds
      setTimeout(() => {
        console.error('⏰ Could not close connections in time, forcing shutdown');
        process.exit(1);
      }, 15000);
    };
  };
  
  // Set up new listeners
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
      timeMultiplierEnabled: true,
      enableDirectFallback: true
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
        webProxies: [],
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
    const sessions = botManager ? botManager.getAllSessions() : [];
    const activeSessions = sessions.filter(s => s.status === 'running');
    const memoryUsage = process.memoryUsage();
    
    const proxyStats = botManager && botManager.proxyHandler ? 
      botManager.proxyHandler.getAllActiveProxies() : { 
        freshProxies: [], 
        webProxies: [], 
        vpnExtensions: [] 
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
  const activeSessions = botManager ? 
    botManager.getAllSessions().filter(s => s.status === 'running').length : 0;
  const memoryUsage = process.memoryUsage();
  
  const proxyStats = botManager && botManager.proxyHandler ? 
    botManager.proxyHandler.getAllActiveProxies() : { 
      freshProxies: [], 
      webProxies: [], 
      vpnExtensions: [] 
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
      refresh: 'every_5_minutes',
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
  console.log(`⏰ Auto-loop interval: ${AUTO_LOOP_CONFIG.interval/60000} minutes`);
  console.log(`📈 Max sessions: ${AUTO_LOOP_CONFIG.maxSessions}`);
  console.log(`🎯 Target URL: ${AUTO_LOOP_CONFIG.targetUrl}`);
  console.log(`🔍 Search Engines: ${AUTO_LOOP_CONFIG.searchEngines.join(', ')}`);
  console.log(`🔄 Proxy Auto-Refresh: ${botManager ? 'ENABLED (every 5 minutes)' : 'DISABLED'}`);
  console.log(`⏱️ Max session duration: ${AUTO_LOOP_CONFIG.maxSessionDuration/60000} minutes`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`📊 Monitoring: http://localhost:${PORT}/monitoring`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Setup graceful shutdown handler
setupGracefulShutdown(server);

module.exports = app;