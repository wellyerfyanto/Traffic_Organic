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

// ==================== SESSION CONFIGURATION ====================
let sessionConfig = {
  secret: process.env.SESSION_SECRET || 'organic-traffic-bot-' + Date.now(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  },
  name: 'organic_traffic_sid'
};

// ==================== EXPRESS SETUP ====================
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use(session(sessionConfig));

// ==================== AUTO-LOOP SYSTEM ====================
let autoLoop = {
  enabled: false,
  intervalMinutes: 30,
  maxSessions: 3,
  targetUrl: process.env.DEFAULT_TARGET_URL || 'https://cryptoajah.blogspot.com',
  proxyType: 'vpn',
  deviceType: 'desktop',
  searchEngine: 'google',
  keywordMode: 'auto',
  loopInterval: null,
  lastRun: null,
  nextRun: null,
  sessionsStarted: 0,
  isRunning: false
};

// Convert minutes to milliseconds
const minutesToMs = (minutes) => minutes * 60 * 1000;

// Enhanced Start Auto-loop Function
const startAutoLoop = async () => {
  if (autoLoop.loopInterval) {
    clearInterval(autoLoop.loopInterval);
    autoLoop.loopInterval = null;
  }

  if (!autoLoop.enabled || !botManager) {
    console.log('⏸️ Auto-loop disabled or botManager not ready');
    autoLoop.isRunning = false;
    return;
  }

  const intervalMs = minutesToMs(autoLoop.intervalMinutes);
  
  console.log('🔁 Starting auto-loop system...');
  console.log(`   Target: ${autoLoop.targetUrl}`);
  console.log(`   Interval: ${autoLoop.intervalMinutes} minutes (${intervalMs}ms)`);
  console.log(`   Max Sessions: ${autoLoop.maxSessions}`);
  console.log(`   Proxy Type: ${autoLoop.proxyType}`);
  console.log(`   Google Stealth: ENABLED`);

  autoLoop.isRunning = true;
  
  // Function to execute one loop iteration
  const runLoopIteration = async () => {
    try {
      // Check current active sessions
      const allSessions = botManager.getAllSessions ? botManager.getAllSessions() : [];
      const activeSessions = allSessions.filter(s => s && s.status === 'running').length;
      
      if (activeSessions >= autoLoop.maxSessions) {
        console.log(`⏸️ Max sessions (${autoLoop.maxSessions}) reached, skipping auto-loop`);
        autoLoop.nextRun = new Date(Date.now() + intervalMs);
        return;
      }
      
      console.log('🔄 Auto-loop: Starting new session...');
      autoLoop.lastRun = new Date();
      autoLoop.nextRun = new Date(Date.now() + intervalMs);
      
      const sessionConfig = {
        targetUrl: autoLoop.targetUrl,
        proxyType: autoLoop.proxyType,
        deviceType: autoLoop.deviceType || (Math.random() > 0.5 ? 'desktop' : 'mobile'),
        searchEngine: autoLoop.searchEngine || (Math.random() > 0.5 ? 'google' : 'bing'),
        keywordMode: autoLoop.keywordMode || 'auto',
        isAutoLoop: true,
        maxKeywords: 3,
        enableSubUrl: true,
        googleStealth: true
      };
      
      if (botManager.startOrganicSession) {
        const sessionId = await botManager.startOrganicSession(sessionConfig);
        autoLoop.sessionsStarted++;
        console.log(`✅ Auto-loop session started: ${sessionId ? sessionId.substring(0, 12) + '...' : 'unknown'}`);
        console.log(`   Total auto sessions: ${autoLoop.sessionsStarted}`);
        console.log(`   Next run in: ${autoLoop.intervalMinutes} minutes`);
        
        // Log session details
        console.log(`   Config: ${JSON.stringify(sessionConfig, null, 2)}`);
      } else {
        console.log('❌ botManager.startOrganicSession not available');
      }
    } catch (error) {
      console.error('❌ Auto-loop error:', error.message);
      console.error('Stack:', error.stack);
      autoLoop.nextRun = new Date(Date.now() + intervalMs);
    }
  };

  // Run immediately
  console.log('🏃 Auto-loop: First run starting now...');
  await runLoopIteration();
  
  // Set interval for subsequent runs
  autoLoop.loopInterval = setInterval(async () => {
    await runLoopIteration();
  }, intervalMs);
  
  console.log(`✅ Auto-loop started with ${autoLoop.intervalMinutes} minute interval`);
};

// Stop Auto-loop Function
const stopAutoLoop = () => {
  if (autoLoop.loopInterval) {
    clearInterval(autoLoop.loopInterval);
    autoLoop.loopInterval = null;
    autoLoop.isRunning = false;
    console.log('⏹️ Auto-loop stopped');
  }
};

// ==================== MODULE LOADING ====================
console.log('\n🚀 Initializing Organic Traffic Bot System with Google Stealth...');

let botManager = null;

// Create comprehensive fallback handlers
const createFallbackHandlers = () => {
  console.log('🛡️ Creating fallback handlers...');
  
  return {
    // Fallback TrafficGenerator
    TrafficGenerator: class {
      constructor() {
        console.log('✅ FallbackTrafficGenerator instantiated');
        this.activeSessions = new Map();
        this.sessionLogs = new Map();
        this.totalSessions = 0;
        this.successfulSessions = 0;
        this.botDetectionCount = 0;
        this.isFallbackMode = true;
        
        // Create fallback proxy handler
        this.proxyHandler = {
          getProxyForSession: () => ({
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
              '--disable-dev-shm-usage'
            ],
            displayName: 'Direct Connection (Fallback)',
            name: 'Direct Connection'
          }),
          getAllActiveProxies: () => ({
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
          }),
          updateAllProxies: () => Promise.resolve({
            success: true,
            message: 'Fallback handler - using direct connection'
          })
        };
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
    }
  };
};

// Main module loading routine
(async () => {
  try {
    console.log('\n🔧 Starting module initialization with Google Stealth...');
    
    // Try to load actual modules
    let TrafficGenerator;
    try {
      // Load the enhanced Google-stealth traffic generator
      TrafficGenerator = require('./bot/trafficGenerator.js');
      console.log('✅ Google-Stealth TrafficGenerator loaded successfully');
    } catch (error) {
      console.log('⚠️ Using fallback TrafficGenerator:', error.message);
      const fallbacks = createFallbackHandlers();
      TrafficGenerator = fallbacks.TrafficGenerator;
    }
    
    // Create botManager
    try {
      botManager = new TrafficGenerator();
      console.log('✅ BotManager instance created');
      
      // Initialize botManager
      if (botManager.initialize && typeof botManager.initialize === 'function') {
        console.log('🔄 Initializing BotManager with Google Stealth...');
        await botManager.initialize();
        console.log('✅ BotManager initialized successfully with Google anti-detection');
      } else {
        console.log('⚠️ BotManager has no initialize method, skipping');
      }
    } catch (error) {
      console.error('❌ Failed to create BotManager:', error.message);
      const fallbacks = createFallbackHandlers();
      botManager = new fallbacks.TrafficGenerator();
    }
    
    console.log('\n🎉 System initialization completed with Google Stealth Mode');
    
    // Start auto-loop if enabled via environment
    if (process.env.AUTO_LOOP === 'true') {
      setTimeout(() => {
        autoLoop.enabled = true;
        startAutoLoop();
      }, 10000);
    }
    
  } catch (error) {
    console.error('❌ Fatal error during initialization:', error.message);
    const fallbacks = createFallbackHandlers();
    botManager = new fallbacks.TrafficGenerator();
  }
})();

// ==================== ROUTES & API ENDPOINTS ====================

// Health Check
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
      googleStealth: true,
      sessions: {
        total: sessions.length,
        active: activeSessions
      }
    }
  });
});

// System Health
app.get('/api/system/health', (req, res) => {
  const sessions = botManager ? botManager.getAllSessions() : [];
  const activeSessions = sessions.filter(s => s && s.status === 'running').length;
  
  const proxyStats = botManager && botManager.proxyHandler ? 
    (botManager.proxyHandler.getAllActiveProxies ? 
      botManager.proxyHandler.getAllActiveProxies().stats : 
      { total: 0, vpn: 0, successRate: 0 }) : 
    { total: 0, vpn: 0, successRate: 0 };
  
  res.json({
    success: true,
    googleStealth: true,
    sessions: {
      total: sessions.length,
      running: activeSessions,
      completed: sessions.filter(s => s.status === 'completed').length
    },
    proxies: {
      total: proxyStats.total || 0,
      vpn: proxyStats.vpn || proxyStats.workingVPN || 0,
      successRate: proxyStats.successRate || 0
    }
  });
});

// Proxy Status
app.get('/api/proxies/status', (req, res) => {
  try {
    if (!botManager || !botManager.proxyHandler) {
      return res.json({
        success: true,
        status: 'initializing',
        googleStealth: true,
        freshProxies: [],
        webProxies: [],
        vpnProxies: [],
        stats: {
          totalWorking: 0,
          fresh: { total: 0, working: 0 },
          web: { total: 0, working: 0 },
          vpn: { total: 0, working: 0 },
          successRate: 0,
          lastUpdate: null
        }
      });
    }
    
    const proxies = botManager.proxyHandler.getAllActiveProxies ? 
      botManager.proxyHandler.getAllActiveProxies() : 
      { freshProxies: [], webProxies: [], vpnProxies: [], stats: {} };
    
    res.json({
      success: true,
      status: 'ready',
      googleStealth: true,
      ...proxies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Organic Session
app.post('/api/start-organic', async (req, res) => {
  try {
    const { targetUrl, proxyType, deviceType, searchEngine, keywordMode, customKeywords, googleStealth } = req.body;
    
    if (!botManager || !botManager.startOrganicSession) {
      return res.status(503).json({
        success: false,
        error: 'Bot system is not ready. Please try again in 30 seconds.'
      });
    }
    
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'targetUrl is required' });
    }
    
    // Validate customKeywords format
    let validatedKeywords = [];
    if (keywordMode === 'manual' && customKeywords && Array.isArray(customKeywords)) {
      validatedKeywords = customKeywords
        .filter(k => typeof k === 'string' && k.trim().length > 0)
        .map(k => k.trim())
        .slice(0, 10);
    }
    
    const sessionConfig = {
      targetUrl,
      proxyType: proxyType || 'fresh',
      deviceType: deviceType || 'desktop',
      searchEngine: searchEngine || 'google',
      keywordMode: keywordMode || 'auto',
      customKeywords: validatedKeywords,
      isOrganic: true,
      maxKeywords: 5,
      enableSubUrl: true,
      googleStealth: googleStealth !== false // Enable by default
    };
    
    console.log(`🌱 Starting organic session to: ${targetUrl}`);
    if (searchEngine === 'google') {
      console.log(`   Google Stealth: ${googleStealth !== false ? 'ENABLED' : 'DISABLED'}`);
    }
    
    const sessionId = await botManager.startOrganicSession(sessionConfig);
    
    res.json({
      success: true,
      sessionId,
      message: 'Organic session started successfully',
      config: sessionConfig
    });
  } catch (error) {
    console.error('❌ Error starting organic session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Session Management
app.get('/api/all-sessions', (req, res) => {
  try {
    const sessions = botManager ? botManager.getAllSessions() : [];
    res.json({ success: true, sessions, googleStealth: true });
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

app.post('/api/stop-all-sessions', (req, res) => {
  try {
    if (!botManager || !botManager.stopAllSessions) {
      return res.status(503).json({ success: false, error: 'Bot system not available' });
    }
    botManager.stopAllSessions();
    res.json({ success: true, message: 'All sessions stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Proxy Refresh
app.post('/api/proxies/refresh', async (req, res) => {
  try {
    if (!botManager || !botManager.proxyHandler || !botManager.proxyHandler.updateAllProxies) {
      return res.status(503).json({ success: false, error: 'Proxy system not available' });
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

// Google Stealth Test
app.post('/api/test-google', async (req, res) => {
  try {
    if (!botManager || !botManager.startOrganicSession) {
      return res.status(503).json({ 
        success: false, 
        error: 'Bot system not ready' 
      });
    }
    
    const testConfig = {
      targetUrl: 'https://cryptoajah.blogspot.com',
      proxyType: 'vpn',
      deviceType: 'desktop',
      searchEngine: 'google',
      keywordMode: 'auto',
      isAutoLoop: false,
      maxKeywords: 2,
      enableSubUrl: true,
      googleStealth: true
    };
    
    console.log('🧪 Starting Google stealth test session...');
    
    const sessionId = await botManager.startOrganicSession(testConfig);
    
    res.json({
      success: true,
      message: 'Google stealth test session started',
      sessionId: sessionId,
      config: testConfig
    });
    
  } catch (error) {
    console.error('Google stealth test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUTO-LOOP API ENDPOINTS ====================
app.get('/api/auto-loop/status', (req, res) => {
  const nextRunIn = autoLoop.nextRun ? Math.max(0, autoLoop.nextRun - Date.now()) : 0;
  const nextRunMinutes = Math.round(nextRunIn / 60000);
  
  res.json({
    success: true,
    googleStealth: true,
    config: {
      enabled: autoLoop.enabled,
      intervalMinutes: autoLoop.intervalMinutes,
      maxSessions: autoLoop.maxSessions,
      targetUrl: autoLoop.targetUrl,
      proxyType: autoLoop.proxyType,
      deviceType: autoLoop.deviceType,
      searchEngine: autoLoop.searchEngine,
      keywordMode: autoLoop.keywordMode,
      isRunning: autoLoop.isRunning,
      lastRun: autoLoop.lastRun,
      nextRun: autoLoop.nextRun
    },
    stats: {
      sessionsStarted: autoLoop.sessionsStarted,
      isRunning: autoLoop.isRunning,
      nextRunIn: nextRunIn,
      nextRunInMinutes: nextRunMinutes
    }
  });
});

// Control Auto-loop
app.post('/api/auto-loop/control', async (req, res) => {
  try {
    const { action, config } = req.body;
    
    console.log(`🔄 Auto-loop control: ${action}`, config || '');
    
    switch (action) {
      case 'start':
        if (config) {
          // Validate and update config
          if (config.intervalMinutes !== undefined) {
            if (config.intervalMinutes < 1) {
              return res.status(400).json({ success: false, error: 'Interval must be at least 1 minute' });
            }
            autoLoop.intervalMinutes = parseInt(config.intervalMinutes);
          }
          if (config.targetUrl) autoLoop.targetUrl = config.targetUrl;
          if (config.maxSessions) autoLoop.maxSessions = parseInt(config.maxSessions);
          if (config.proxyType) autoLoop.proxyType = config.proxyType;
          if (config.deviceType) autoLoop.deviceType = config.deviceType;
          if (config.searchEngine) autoLoop.searchEngine = config.searchEngine;
          if (config.keywordMode) autoLoop.keywordMode = config.keywordMode;
        }
        
        autoLoop.enabled = true;
        await startAutoLoop();
        break;
        
      case 'stop':
        autoLoop.enabled = false;
        stopAutoLoop();
        break;
        
      case 'update':
        if (config) {
          // Update config without restarting
          if (config.intervalMinutes !== undefined) {
            if (config.intervalMinutes < 1) {
              return res.status(400).json({ success: false, error: 'Interval must be at least 1 minute' });
            }
            autoLoop.intervalMinutes = parseInt(config.intervalMinutes);
          }
          if (config.targetUrl) autoLoop.targetUrl = config.targetUrl;
          if (config.maxSessions) autoLoop.maxSessions = parseInt(config.maxSessions);
          if (config.proxyType) autoLoop.proxyType = config.proxyType;
          if (config.deviceType) autoLoop.deviceType = config.deviceType;
          if (config.searchEngine) autoLoop.searchEngine = config.searchEngine;
          if (config.keywordMode) autoLoop.keywordMode = config.keywordMode;
          
          // Restart with new interval if running
          if (autoLoop.isRunning) {
            await startAutoLoop();
          }
        }
        break;
        
      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    res.json({
      success: true,
      message: `Auto-loop ${action}ed`,
      config: {
        enabled: autoLoop.enabled,
        intervalMinutes: autoLoop.intervalMinutes,
        maxSessions: autoLoop.maxSessions,
        targetUrl: autoLoop.targetUrl,
        proxyType: autoLoop.proxyType,
        deviceType: autoLoop.deviceType,
        searchEngine: autoLoop.searchEngine,
        keywordMode: autoLoop.keywordMode,
        isRunning: autoLoop.isRunning
      }
    });
    
  } catch (error) {
    console.error('❌ Auto-loop control error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test auto-loop endpoint
app.post('/api/test-auto-loop', async (req, res) => {
  try {
    console.log('🧪 Testing auto-loop system...');
    
    if (!botManager || !botManager.startOrganicSession) {
      return res.status(503).json({ 
        success: false, 
        error: 'Bot system not ready' 
      });
    }
    
    const testConfig = {
      targetUrl: 'https://cryptoajah.blogspot.com',
      proxyType: 'vpn',
      deviceType: 'desktop',
      searchEngine: 'google',
      keywordMode: 'auto',
      isAutoLoop: true,
      maxKeywords: 2,
      enableSubUrl: true,
      googleStealth: true
    };
    
    console.log('Starting test session with config:', testConfig);
    
    const sessionId = await botManager.startOrganicSession(testConfig);
    
    res.json({
      success: true,
      message: 'Test auto-loop session started',
      sessionId: sessionId,
      config: testConfig
    });
    
  } catch (error) {
    console.error('Test auto-loop error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STATIC ROUTES ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitoring.html'));
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 3000;

// Create directories if needed
['public', 'bot', 'data'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log(`🚀 Organic Traffic Bot 2025 - Google Stealth Edition`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/monitoring`);
  console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
  console.log('='.repeat(70));
  console.log('\n📋 Available API Endpoints:');
  console.log('   POST /api/start-organic    - Start organic session');
  console.log('   POST /api/test-google      - Test Google stealth');
  console.log('   GET  /api/all-sessions     - List all sessions');
  console.log('   POST /api/proxies/refresh  - Refresh proxy pool');
  console.log('   GET  /api/auto-loop/status - Check auto-loop status');
  console.log('   POST /api/auto-loop/control- Control auto-loop');
  console.log('\n✅ Server is ready with Google Stealth Mode!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopAutoLoop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopAutoLoop();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
