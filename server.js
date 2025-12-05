const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// ==================== RAILWAY ENVIRONMENT DETECTION ====================
const isRailway = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const isProduction = isRailway || process.env.NODE_ENV === 'production';
console.log(`🚂 Environment: ${isProduction ? 'PRODUCTION (Railway)' : 'DEVELOPMENT'}`);
console.log(`📊 Platform: ${process.platform}, Node: ${process.version}`);

// ==================== SESSION STORE CONFIGURATION (CRITICAL FOR RAILWAY) ====================
let sessionStore = null;
let sessionConfig = {};

// Priority 1: Use Redis if available (Railway provides REDIS_URL)
if (isProduction && process.env.REDIS_URL) {
  try {
    console.log('🔗 Attempting to configure Redis session store...');
    // Try different import styles
    let RedisStore, createClient;
    try {
      const redisModule = require('connect-redis');
      RedisStore = redisModule.default || redisModule;
      const redisClientModule = require('redis');
      createClient = redisClientModule.createClient;
    } catch (err) {
      console.log('⚠️ Standard redis imports failed, trying fallback...');
      RedisStore = require('connect-redis');
      createClient = require('redis').createClient;
    }
    
    const redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
      }
    });
    
    redisClient.on('error', (err) => console.log('Redis Client Error:', err.message));
    redisClient.on('connect', () => console.log('✅ Redis connected successfully'));
    
    redisClient.connect().catch(err => {
      console.log('⚠️ Redis connection failed, falling back to MemoryStore:', err.message);
    });
    
    sessionStore = new RedisStore({ client: redisClient });
    console.log('✅ Redis session store configured');
  } catch (error) {
    console.error('❌ Redis setup failed:', error.message);
    // Fall through to memory store
  }
}

// Priority 2: Fallback to MemoryStore ONLY for development
if (!sessionStore && !isProduction) {
  console.log('⚠️ Using MemoryStore for development (NOT FOR PRODUCTION)');
  sessionStore = new session.MemoryStore();
}

// Priority 3: Last resort - file-based session store for Railway without Redis
if (!sessionStore && isProduction) {
  console.log('⚠️ Creating file-based session store fallback for Railway');
  const sessionFileStore = require('session-file-store')(session);
  const sessionsDir = path.join(__dirname, 'data', 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }
  sessionStore = new sessionFileStore({
    path: sessionsDir,
    ttl: 86400, // 24 hours
    retries: 1
  });
}

// Session configuration
sessionConfig = {
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'railway-fallback-secret-change-in-production-' + Date.now(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  },
  name: 'organic_traffic_sid'
};

// ==================== EXPRESS SETUP ====================
const app = express();

// Security middleware (adjusted for Railway)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Apply session middleware
app.use(session(sessionConfig));

// ==================== ROBUST MODULE LOADING SYSTEM ====================
console.log('\n🚀 Initializing Organic Traffic Bot System...');

let botManager = null;
let ProxyHandler = null;
let moduleLoadStatus = {
  proxyHandler: 'pending',
  trafficGenerator: 'pending',
  botManager: 'pending'
};

// Create comprehensive fallback handlers
const createFallbackHandlers = () => {
  console.log('🛡️ Creating comprehensive fallback handlers...');
  
  // Fallback ProxyHandler
  const FallbackProxyHandler = class {
    constructor() {
      console.log('✅ FallbackProxyHandler instantiated');
      this.freshProxies = [
        { 
          host: 'direct', 
          port: 0, 
          type: 'direct', 
          protocol: 'direct',
          working: true, 
          responseTime: 100,
          source: 'fallback',
          name: 'Direct Connection',
          isDirect: true,
          isVPN: false,
          country: 'LOCAL'
        }
      ];
      this.webProxies = [];
      this.vpnProxies = [];
      this.isInitialized = true;
      this.config = { testTimeout: 30000 };
      this.stats = { totalWorking: 1, lastUpdate: new Date().toISOString() };
    }
    
    async initialize() { 
      console.log('✅ FallbackProxyHandler initialized');
      return true; 
    }
    
    getProxyForSession(sessionId, proxyType = 'direct') {
      return {
        host: 'direct',
        port: 0,
        type: 'direct',
        protocol: 'direct',
        isDirect: true,
        isVPN: false,
        working: true,
        responseTime: 100,
        puppeteerArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        displayName: 'Direct Connection (Fallback)',
        name: 'Direct Connection'
      };
    }
    
    getAllActiveProxies() {
      return {
        freshProxies: this.freshProxies.filter(p => p.working),
        webProxies: this.webProxies.filter(p => p.working),
        vpnProxies: this.vpnProxies.filter(p => p.working),
        stats: {
          totalWorking: 1,
          fresh: { total: 1, working: 1, byType: { direct: 1 }, fastest: [] },
          web: { total: 0, working: 0 },
          vpn: { total: 0, working: 0, byCountry: {} },
          successRate: 100,
          lastUpdate: this.stats.lastUpdate
        }
      };
    }
    
    updateAllProxies() {
      return Promise.resolve({
        success: true,
        message: 'Fallback handler - using direct connection',
        stats: this.stats,
        proxies: {
          fresh: this.freshProxies,
          web: this.webProxies,
          vpn: this.vpnProxies
        }
      });
    }
    
    getStats() {
      return {
        ...this.stats,
        pools: {
          fresh: 1,
          web: 0,
          vpn: 0,
          workingFresh: 1,
          workingWeb: 0,
          workingVPN: 0
        }
      };
    }
  };

  // Fallback TrafficGenerator
  const FallbackTrafficGenerator = class {
    constructor() {
      console.log('✅ FallbackTrafficGenerator instantiated');
      this.activeSessions = new Map();
      this.sessionLogs = new Map();
      this.proxyHandler = new FallbackProxyHandler();
      this.totalSessions = 0;
      this.successfulSessions = 0;
      this.botDetectionCount = 0;
      this.isFallbackMode = true;
    }
    
    async initialize() {
      console.log('✅ FallbackTrafficGenerator initialized');
      return true;
    }
    
    async startOrganicSession(config) {
      this.totalSessions++;
      const sessionId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.activeSessions.set(sessionId, {
        id: sessionId,
        config: config,
        status: 'running',
        startTime: new Date(),
        isFallback: true,
        proxyInfo: { host: 'direct', type: 'direct' }
      });
      
      console.log(`✅ Fallback session started: ${sessionId}`);
      
      // Simulate session completion after delay
      setTimeout(() => {
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.status = 'completed';
          session.endTime = new Date();
          this.successfulSessions++;
        }
      }, 30000);
      
      return sessionId;
    }
    
    getAllSessions() {
      const sessions = [];
      for (const [sessionId, session] of this.activeSessions) {
        sessions.push({
          id: sessionId,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          config: session.config,
          isFallback: true
        });
      }
      return sessions;
    }
    
    getSessionLogs(sessionId) {
      return this.sessionLogs.get(sessionId) || [];
    }
    
    stopSession(sessionId) {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.status = 'stopped';
        session.endTime = new Date();
      }
    }
    
    stopAllSessions() {
      for (const [sessionId, session] of this.activeSessions) {
        session.status = 'stopped';
        session.endTime = new Date();
      }
    }
    
    clearAllSessions() {
      this.activeSessions.clear();
      this.sessionLogs.clear();
    }
    
    getStats() {
      return {
        totalSessions: this.totalSessions,
        successfulSessions: this.successfulSessions,
        activeSessions: Array.from(this.activeSessions.values()).filter(s => s.status === 'running').length,
        botDetectionCount: this.botDetectionCount,
        isFallbackMode: true
      };
    }
  };

  return {
    ProxyHandler: FallbackProxyHandler,
    TrafficGenerator: FallbackTrafficGenerator
  };
};

// Enhanced module loader with detailed diagnostics
const loadModuleSafely = async (moduleName, modulePath, isCritical = false) => {
  console.log(`\n📦 Loading ${moduleName} from: ${modulePath}`);
  
  const startTime = Date.now();
  const possiblePaths = [
    path.join(__dirname, modulePath),
    path.join(__dirname, 'bot', moduleName),
    path.join(process.cwd(), 'bot', moduleName)
  ];
  
  let loadedModule = null;
  let loadError = null;
  
  for (const tryPath of possiblePaths) {
    try {
      if (!fs.existsSync(tryPath)) {
        console.log(`   🔍 Path not found: ${tryPath}`);
        continue;
      }
      
      console.log(`   🔍 Attempting to load from: ${path.relative(process.cwd(), tryPath)}`);
      
      // Clear require cache for this module
      delete require.cache[require.resolve(tryPath)];
      
      loadedModule = require(tryPath);
      const loadTime = Date.now() - startTime;
      
      console.log(`   ✅ ${moduleName} loaded successfully in ${loadTime}ms`);
      moduleLoadStatus[moduleName === 'proxyHandler.js' ? 'proxyHandler' : 'trafficGenerator'] = 'loaded';
      
      return loadedModule;
    } catch (error) {
      loadError = error;
      console.log(`   ❌ Failed to load from ${tryPath}: ${error.message}`);
      
      // Check for specific error types
      if (error.message.includes('SyntaxError')) {
        console.log(`   🔧 Syntax error detected in ${moduleName}`);
      }
      if (error.message.includes('Cannot find module')) {
        console.log(`   🔍 Module not found at path`);
      }
    }
  }
  
  // If we get here, all paths failed
  if (isCritical && !loadedModule) {
    console.error(`❌ CRITICAL: Failed to load ${moduleName} from all possible paths`);
    console.error(`Last error: ${loadError?.message || 'Unknown error'}`);
    
    if (loadError?.stack) {
      console.error(`Stack trace:\n${loadError.stack.substring(0, 500)}...`);
    }
  }
  
  return null;
};

// Main module loading routine
(async () => {
  try {
    console.log('\n🔧 Starting module initialization sequence...');
    
    // Load ProxyHandler first (most critical)
    const proxyHandlerModule = await loadModuleSafely('proxyHandler.js', './bot/proxyHandler.js', true);
    
    if (proxyHandlerModule) {
      ProxyHandler = proxyHandlerModule;
      console.log('✅ ProxyHandler class loaded successfully');
    } else {
      console.log('⚠️ Using fallback ProxyHandler');
      const fallbacks = createFallbackHandlers();
      ProxyHandler = fallbacks.ProxyHandler;
    }
    
    // Load TrafficGenerator
    const trafficGeneratorModule = await loadModuleSafely('trafficGenerator.js', './bot/trafficGenerator.js', false);
    
    let TrafficGenerator;
    if (trafficGeneratorModule) {
      TrafficGenerator = trafficGeneratorModule;
      console.log('✅ TrafficGenerator class loaded successfully');
    } else {
      console.log('⚠️ Using fallback TrafficGenerator');
      const fallbacks = createFallbackHandlers();
      TrafficGenerator = fallbacks.TrafficGenerator;
    }
    
    // Create and initialize botManager
    try {
      if (TrafficGenerator) {
        console.log('\n🤖 Creating BotManager instance...');
        botManager = new TrafficGenerator();
        moduleLoadStatus.botManager = 'created';
        console.log('✅ BotManager instance created');
        
        // Initialize botManager asynchronously
        setTimeout(async () => {
          try {
            if (botManager.initialize && typeof botManager.initialize === 'function') {
              console.log('🔄 Initializing BotManager...');
              await botManager.initialize();
              console.log('✅ BotManager initialized successfully');
              moduleLoadStatus.botManager = 'initialized';
              
              // Check proxy handler status
              if (botManager.proxyHandler) {
                console.log(`✅ ProxyHandler attached: ${botManager.proxyHandler.constructor?.name || 'Unknown'}`);
              } else {
                console.log('⚠️ BotManager.proxyHandler is null or undefined');
            }
            } else {
              console.log('⚠️ BotManager has no initialize method, skipping');
            }
          } catch (initError) {
            console.error('❌ BotManager.initialize() failed:', initError.message);
            moduleLoadStatus.botManager = 'failed';
          }
        }, 3000); // Delay initialization
      }
    } catch (error) {
      console.error('❌ Failed to create BotManager:', error.message);
      const fallbacks = createFallbackHandlers();
      botManager = new fallbacks.TrafficGenerator();
      moduleLoadStatus.botManager = 'fallback';
    }
    
    console.log('\n📊 Module Load Status:');
    console.log(`   - ProxyHandler: ${moduleLoadStatus.proxyHandler}`);
    console.log(`   - TrafficGenerator: ${moduleLoadStatus.trafficGenerator}`);
    console.log(`   - BotManager: ${moduleLoadStatus.botManager}`);
    console.log('\n🎉 Module loading sequence completed');
    
  } catch (error) {
    console.error('❌ Fatal error during module loading:', error.message);
    console.error('Stack:', error.stack);
    
    // Create absolute minimal fallback
    const fallbacks = createFallbackHandlers();
    ProxyHandler = fallbacks.ProxyHandler;
    botManager = new fallbacks.TrafficGenerator();
    
    console.log('⚠️ Running in full fallback mode');
  }
})();

// ==================== API MIDDLEWARE FOR STATUS CHECK ====================
app.use('/api/*', (req, res, next) => {
  // Skip health check endpoints
  if (req.path.includes('/health') || req.path.includes('/proxies/status')) {
    return next();
  }
  
  if (!botManager && req.method !== 'GET') {
    return res.status(503).json({
      success: false,
      error: 'Bot system is initializing. Please wait...',
      retryAfter: 30
    });
  }
  next();
});

// ==================== ROUTES & API ENDPOINTS ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitoring.html'));
});

// Deep Health Check Endpoint
app.get('/health/deep', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      railway: !!process.env.RAILWAY_ENVIRONMENT,
      production: isProduction
    },
    system: {
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
      }
    },
    modules: moduleLoadStatus,
    botManager: {
      available: !!botManager,
      type: botManager?.constructor?.name || 'N/A',
      isFallback: botManager?.isFallbackMode || false
    },
    session: {
      store: sessionStore?.constructor?.name || 'MemoryStore',
      secure: sessionConfig.cookie?.secure || false
    }
  };
  
  // Add proxy info if available
  if (botManager && botManager.proxyHandler) {
    try {
      const proxyInfo = botManager.proxyHandler.getAllActiveProxies();
      healthData.proxies = {
        total: proxyInfo.stats.totalWorking,
        fresh: proxyInfo.stats.fresh.working,
        vpn: proxyInfo.stats.vpn.working,
        web: proxyInfo.stats.web.working
      };
    } catch (error) {
      healthData.proxies = { error: error.message };
    }
  }
  
  res.json(healthData);
});

// Standard Health Check
app.get('/health', (req, res) => {
  const sessions = botManager ? botManager.getAllSessions() : [];
  const activeSessions = sessions.filter(s => s && s.status === 'running').length;
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    system: {
      uptime: Math.floor(process.uptime()),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    },
    app: {
      mode: botManager?.isFallbackMode ? 'FALLBACK' : 'NORMAL',
      sessions: {
        total: sessions.length,
        active: activeSessions
      },
      proxies: botManager && botManager.proxyHandler ? 'AVAILABLE' : 'INITIALIZING'
    }
  });
});

// Proxy Status Endpoint
app.get('/api/proxies/status', async (req, res) => {
  try {
    if (!botManager || !botManager.proxyHandler) {
      return res.json({
        success: true,
        status: 'initializing',
        message: 'Proxy system is starting up. Please wait a moment.',
        freshProxies: [],
        webProxies: [],
        vpnProxies: [],
        stats: {
          totalWorking: 0,
          fresh: { total: 0, working: 0, byType: {}, fastest: [] },
          web: { total: 0, working: 0 },
          vpn: { total: 0, working: 0, byCountry: {} },
          successRate: 0,
          lastUpdate: null
        }
      });
    }
    
    const proxies = botManager.proxyHandler.getAllActiveProxies();
    res.json({
      success: true,
      status: 'ready',
      ...proxies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: isProduction ? undefined : error.stack
    });
  }
});

// Start Organic Session - UPDATED WITH KEYWORD MODE
app.post('/api/start-organic', async (req, res) => {
  try {
    const { 
      targetUrl, 
      proxyType, 
      deviceType, 
      searchEngine, 
      keywordMode,       // 'auto' atau 'manual'
      customKeywords     // array of keywords jika manual
    } = req.body;
    
    if (!botManager || !botManager.startOrganicSession) {
      return res.status(503).json({
        success: false,
        error: 'Bot system is not ready. Please try again in 30 seconds.',
        status: 'initializing'
      });
    }
    
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'targetUrl is required'
      });
    }
    
    // Validate customKeywords format jika ada
    let validatedKeywords = [];
    if (keywordMode === 'manual' && customKeywords && Array.isArray(customKeywords)) {
      validatedKeywords = customKeywords
        .filter(k => typeof k === 'string' && k.trim().length > 0)
        .map(k => k.trim())
        .slice(0, 10); // Limit to 10 keywords max
    }
    
    const sessionConfig = {
      targetUrl: targetUrl,
      proxyType: proxyType || 'fresh',
      deviceType: deviceType || 'desktop',
      searchEngine: searchEngine || 'google',
      keywordMode: keywordMode || 'auto',      // TAMBAH INI
      customKeywords: validatedKeywords,       // TAMBAH INI
      isOrganic: true,
      maxKeywords: 5,
      enableSubUrl: true
    };
    
    console.log(`🌱 Starting organic session to: ${targetUrl}`);
    console.log(`   Keyword Mode: ${sessionConfig.keywordMode}`);
    console.log(`   Custom Keywords: ${sessionConfig.customKeywords?.length || 0} provided`);
    
    const sessionId = await botManager.startOrganicSession(sessionConfig);
    
    res.json({
      success: true,
      sessionId,
      message: 'Organic session started successfully',
      config: sessionConfig
    });
  } catch (error) {
    console.error('❌ Error starting organic session:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: isProduction ? undefined : error.stack
    });
  }
});

// Session Management
app.get('/api/all-sessions', (req, res) => {
  try {
    const sessions = botManager ? botManager.getAllSessions() : [];
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stop-session/:sessionId', (req, res) => {
  try {
    if (!botManager || !botManager.stopSession) {
      return res.status(503).json({ success: false, error: 'Bot system not available' });
    }
    botManager.stopSession(req.params.sessionId);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Proxy Refresh
app.post('/api/proxies/refresh', async (req, res) => {
  try {
    if (!botManager || !botManager.proxyHandler || !botManager.proxyHandler.updateAllProxies) {
      return res.status(503).json({
        success: false,
        error: 'Proxy system not available'
      });
    }
    
    console.log('🔄 Manual proxy refresh requested');
    const result = await botManager.proxyHandler.updateAllProxies();
    
    res.json({
      success: result.success !== false,
      message: result.message || 'Proxy refresh completed',
      stats: result.stats,
      proxies: result.proxies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Puppeteer
app.get('/api/test-puppeteer', async (req, res) => {
  try {
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch {
      puppeteer = require('puppeteer-core');
    }
    
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
    console.log(`Testing Puppeteer with: ${chromePath}`);
    
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      executablePath: chromePath
    });
    
    const page = await browser.newPage();
    await page.goto('https://httpbin.org/ip', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const content = await page.content();
    await browser.close();
    
    res.json({
      success: true,
      message: 'Puppeteer test successful',
      chromePath,
      hasContent: content.includes('origin')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      chromePath: process.env.PUPPETEER_EXECUTABLE_PATH
    });
  }
});

// Auto-loop Status
app.get('/api/auto-loop/status', (req, res) => {
  res.json({
    success: true,
    config: {
      enabled: false,
      maxSessions: 3,
      targetUrl: process.env.DEFAULT_TARGET_URL || 'https://cryptoajah.blogspot.com'
    },
    activeSessions: botManager ? botManager.getAllSessions().filter(s => s.status === 'running').length : 0
  });
});

// 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: isProduction ? undefined : error.message,
    path: req.path
  });
});

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 3000;

// Create necessary directories
const dirs = ['data', 'public', 'bot', 'data/sessions'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    } catch (err) {
      console.log(`⚠️ Could not create directory ${dir}: ${err.message}`);
    }
  }
});

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 Organic Traffic Bot 2025 - Railway Optimized`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔧 Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/monitoring`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
  console.log(`🔍 Deep Health: http://localhost:${PORT}/health/deep`);
  console.log('='.repeat(60));
  console.log('\n📋 Initialization will continue in the background...');
  console.log('   Proxy system may take 30-60 seconds to fully initialize.\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('⏰ Force shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;