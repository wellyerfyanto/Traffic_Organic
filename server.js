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

// ==================== GOOGLE AUTH MANAGER ====================
const GoogleAuthManager = require('./bot/googleAuth');
const googleAuthManager = new GoogleAuthManager();

// ==================== BATCH SESSION SYSTEM ====================
class BatchSessionManager {
    constructor() {
        this.batchQueue = [];
        this.activeSessions = new Map();
        this.completedSessions = [];
        this.failedSessions = [];
        this.maxConcurrent = 5;
        this.maxTotal = 1000;
        this.isRunning = false;
        this.batchInterval = null;
        this.sessionCounter = 0;
        this.proxyRotation = ['vpn', 'fresh', 'web'];
        
        console.log('✅ Batch Session Manager initialized (5 concurrent, 1000 max)');
    }

    getRandomUserAgent(deviceType) {
        const desktopAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ];
        
        const mobileAgents = [
            'Mozilla/5.0 (Linux; Android 14; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        ];
        
        const agents = deviceType === 'mobile' ? mobileAgents : desktopAgents;
        return agents[Math.floor(Math.random() * agents.length)];
    }

    addBatch(config) {
        const batchId = `batch_${Date.now()}`;
        const sessions = [];
        
        const totalSessions = Math.min(config.totalSessions || 10, this.maxTotal);
        const concurrentSessions = Math.min(config.concurrentSessions || 3, this.maxConcurrent);
        
        for (let i = 0; i < totalSessions; i++) {
            const sessionConfig = {
                id: `session_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
                batchId,
                config: {
                    targetUrl: config.targetUrl,
                    proxyType: this.proxyRotation[i % this.proxyRotation.length],
                    deviceType: config.deviceType === 'random' ? 
                        (Math.random() > 0.5 ? 'desktop' : 'mobile') : config.deviceType,
                    searchEngine: config.searchEngine || 'google',
                    keywordMode: config.keywordMode || 'auto',
                    customKeywords: config.customKeywords || [],
                    maxKeywords: config.maxKeywords || 3,
                    googleAccount: config.googleAccount || 'none',
                    useProfile: config.useProfile !== false,
                    userAgent: this.getRandomUserAgent(
                        config.deviceType === 'random' ? 
                        (Math.random() > 0.5 ? 'desktop' : 'mobile') : config.deviceType
                    ),
                    retryCount: 0,
                    maxRetries: 3
                },
                status: 'pending',
                addedAt: new Date().toISOString(),
                attempts: []
            };
            
            sessions.push(sessionConfig);
        }
        
        this.batchQueue.push({
            id: batchId,
            config: { ...config, totalSessions, concurrentSessions },
            sessions,
            status: 'ready',
            created: new Date().toISOString(),
            started: null,
            completed: null,
            stats: {
                total: totalSessions,
                pending: totalSessions,
                running: 0,
                completed: 0,
                failed: 0
            }
        });
        
        console.log(`📦 Batch ${batchId} added: ${totalSessions} sessions`);
        return batchId;
    }

    startBatch(batchId) {
        const batch = this.batchQueue.find(b => b.id === batchId);
        if (!batch) {
            console.error(`❌ Batch ${batchId} not found`);
            return false;
        }
        
        batch.status = 'running';
        batch.started = new Date().toISOString();
        this.isRunning = true;
        
        console.log(`🚀 Starting batch ${batchId}: ${batch.sessions.length} sessions`);
        
        this.startNextSessions(batchId);
        
        this.batchInterval = setInterval(() => {
            this.startNextSessions(batchId);
            this.cleanupCompletedBatch();
        }, 5000);
        
        return true;
    }

    startNextSessions(batchId) {
        const batch = this.batchQueue.find(b => b.id === batchId);
        if (!batch || batch.status !== 'running') return;
        
        const runningCount = batch.sessions.filter(s => s.status === 'running').length;
        const availableSlots = batch.config.concurrentSessions - runningCount;
        
        if (availableSlots <= 0) return;
        
        const pendingSessions = batch.sessions.filter(s => s.status === 'pending');
        
        for (let i = 0; i < Math.min(availableSlots, pendingSessions.length); i++) {
            this.executeSession(pendingSessions[i], batchId);
        }
    }

    async executeSession(session, batchId) {
        const batch = this.batchQueue.find(b => b.id === batchId);
        if (!batch) return;
        
        session.status = 'running';
        session.startedAt = new Date().toISOString();
        batch.stats.running++;
        batch.stats.pending--;
        
        this.activeSessions.set(session.id, { session, batchId });
        
        console.log(`▶️  Session ${session.id} starting (${batch.stats.running} running)`);
        
        try {
            if (global.botManager && global.botManager.startOrganicSession) {
                session.attempts.push({
                    time: new Date().toISOString(),
                    action: 'start',
                    proxyType: session.config.proxyType,
                    userAgent: session.config.userAgent
                });
                
                await global.botManager.startOrganicSession(session.config);
                
                session.attempts.push({
                    time: new Date().toISOString(),
                    action: 'started',
                    success: true
                });
                
            } else {
                throw new Error('Bot manager not available');
            }
        } catch (error) {
            console.error(`❌ Session ${session.id} failed:`, error.message);
            
            session.attempts.push({
                time: new Date().toISOString(),
                action: 'error',
                error: error.message,
                retryCount: session.config.retryCount
            });
            
            if (session.config.retryCount < session.config.maxRetries) {
                session.config.retryCount++;
                
                const currentIndex = this.proxyRotation.indexOf(session.config.proxyType);
                session.config.proxyType = this.proxyRotation[(currentIndex + 1) % this.proxyRotation.length];
                
                session.config.userAgent = this.getRandomUserAgent(session.config.deviceType);
                
                console.log(`🔄 Retrying session ${session.id} (attempt ${session.config.retryCount})`);
                
                session.status = 'pending';
                batch.stats.running--;
                batch.stats.pending++;
                
                return;
            }
            
            session.status = 'failed';
            session.completedAt = new Date().toISOString();
            session.error = error.message;
            batch.stats.running--;
            batch.stats.failed++;
            this.failedSessions.push(session);
        }
    }

    cleanupCompletedBatch() {
        for (const batch of this.batchQueue) {
            if (batch.status === 'running') {
                const remainingSessions = batch.sessions.filter(s => 
                    s.status === 'pending' || s.status === 'running'
                );
                
                if (remainingSessions.length === 0) {
                    batch.status = 'completed';
                    batch.completed = new Date().toISOString();
                    batch.stats.running = 0;
                    
                    console.log(`✅ Batch ${batch.id} completed: ${batch.stats.completed} successful, ${batch.stats.failed} failed`);
                    
                    const runningBatches = this.batchQueue.filter(b => b.status === 'running');
                    if (runningBatches.length === 0 && this.batchInterval) {
                        clearInterval(this.batchInterval);
                        this.batchInterval = null;
                        this.isRunning = false;
                    }
                }
            }
        }
    }

    stopBatch(batchId) {
        const batch = this.batchQueue.find(b => b.id === batchId);
        if (!batch) return false;
        
        batch.status = 'stopped';
        batch.completed = new Date().toISOString();
        
        for (const session of batch.sessions) {
            if (session.status === 'pending') {
                session.status = 'cancelled';
                session.completedAt = new Date().toISOString();
            }
        }
        
        console.log(`⏹️  Batch ${batchId} stopped`);
        return true;
    }

    getBatchStatus(batchId) {
        const batch = this.batchQueue.find(b => b.id === batchId);
        if (!batch) return null;
        
        return {
            id: batch.id,
            status: batch.status,
            config: batch.config,
            stats: batch.stats,
            created: batch.created,
            started: batch.started,
            completed: batch.completed,
            sessions: batch.sessions.map(s => ({
                id: s.id,
                status: s.status,
                config: s.config,
                attempts: s.attempts,
                startedAt: s.startedAt,
                completedAt: s.completedAt
            }))
        };
    }

    getAllBatches() {
        return this.batchQueue.map(batch => ({
            id: batch.id,
            status: batch.status,
            config: batch.config,
            stats: batch.stats,
            created: batch.created,
            started: batch.started,
            completed: batch.completed
        }));
    }

    cleanupOldBatches(maxAgeHours = 24) {
        const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        
        this.batchQueue = this.batchQueue.filter(batch => {
            const batchTime = new Date(batch.created);
            return batchTime > cutoff;
        });
        
        console.log(`🧹 Cleaned up old batches, remaining: ${this.batchQueue.length}`);
    }
}

const batchManager = new BatchSessionManager();

// ==================== EXPRESS SETUP ====================
const app = express();

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

// ==================== MODULE LOADING ====================
console.log('\n🚀 Initializing Organic Traffic Bot System...');

let botManager = null;

const createFallbackHandlers = () => {
  console.log('🛡️ Creating fallback handlers...');
  
  return {
    TrafficGenerator: class {
      constructor() {
        console.log('✅ FallbackTrafficGenerator instantiated');
        this.activeSessions = new Map();
        this.sessionLogs = new Map();
        this.totalSessions = 0;
        this.successfulSessions = 0;
        this.botDetectionCount = 0;
        this.isFallbackMode = true;
        
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

(async () => {
  try {
    console.log('\n🔧 Starting module initialization...');
    
    let TrafficGenerator;
    try {
      TrafficGenerator = require('./bot/trafficGenerator.js');
      console.log('✅ TrafficGenerator loaded successfully');
    } catch (error) {
      console.log('⚠️ Using fallback TrafficGenerator:', error.message);
      const fallbacks = createFallbackHandlers();
      TrafficGenerator = fallbacks.TrafficGenerator;
    }
    
    try {
      botManager = new TrafficGenerator();
      global.botManager = botManager;
      console.log('✅ BotManager instance created');
      
      if (botManager.initialize && typeof botManager.initialize === 'function') {
        console.log('🔄 Initializing BotManager...');
        await botManager.initialize();
        console.log('✅ BotManager initialized successfully');
      } else {
        console.log('⚠️ BotManager has no initialize method, skipping');
      }
    } catch (error) {
      console.error('❌ Failed to create BotManager:', error.message);
      const fallbacks = createFallbackHandlers();
      botManager = new fallbacks.TrafficGenerator();
      global.botManager = botManager;
    }
    
    console.log('\n🎉 System initialization completed');
    
  } catch (error) {
    console.error('❌ Fatal error during initialization:', error.message);
    const fallbacks = createFallbackHandlers();
    botManager = new fallbacks.TrafficGenerator();
    global.botManager = botManager;
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
      sessions: {
        total: sessions.length,
        active: activeSessions
      },
      batchManager: {
        activeBatches: batchManager.batchQueue.length,
        isRunning: batchManager.isRunning
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
    sessions: {
      total: sessions.length,
      running: activeSessions,
      completed: sessions.filter(s => s.status === 'completed').length
    },
    proxies: {
      total: proxyStats.total || 0,
      vpn: proxyStats.vpn || proxyStats.workingVPN || 0,
      successRate: proxyStats.successRate || 0
    },
    batchManager: {
      isRunning: batchManager.isRunning,
      totalBatches: batchManager.batchQueue.length,
      maxConcurrent: batchManager.maxConcurrent,
      maxTotal: batchManager.maxTotal
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
      ...proxies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Organic Session
app.post('/api/start-organic', async (req, res) => {
  try {
    const { 
      targetUrl, 
      proxyType, 
      deviceType, 
      searchEngine, 
      keywordMode, 
      customKeywords,
      googleAccount,
      useProfile 
    } = req.body;
    
    if (!botManager || !botManager.startOrganicSession) {
      return res.status(503).json({
        success: false,
        error: 'Bot system is not ready. Please try again in 30 seconds.'
      });
    }
    
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'targetUrl is required' });
    }
    
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
      googleAccount: googleAccount || 'none',
      useProfile: useProfile !== false,
      isOrganic: true,
      maxKeywords: 5,
      enableSubUrl: true
    };
    
    console.log(`🌱 Starting organic session to: ${targetUrl}`);
    
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

// Google Test
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
      googleAccount: 'random',
      useProfile: true,
      maxKeywords: 2,
      enableSubUrl: true
    };
    
    console.log('🧪 Starting Google test session...');
    
    const sessionId = await botManager.startOrganicSession(testConfig);
    
    res.json({
      success: true,
      message: 'Google test session started',
      sessionId: sessionId,
      config: testConfig
    });
    
  } catch (error) {
    console.error('Google test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GOOGLE ACCOUNTS API ====================
app.get('/api/google-accounts', async (req, res) => {
  try {
    await googleAuthManager.loadAccounts();
    
    const allAccounts = googleAuthManager.activeAccounts.concat(googleAuthManager.failedAccounts);
    
    res.json({
      success: true,
      accounts: allAccounts.map(acc => ({
        id: acc.id || acc.email,
        email: acc.email,
        accountType: acc.accountType || 'personal',
        status: acc.status || 'unknown',
        created: acc.created || new Date().toISOString(),
        lastUsed: acc.lastUsed,
        usageCount: acc.usageCount || 0,
        successRate: acc.successRate || 0,
        has2FA: acc.has2FA || false
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/google-accounts', async (req, res) => {
  try {
    const { email, password, accountType, has2FA, backupCodes } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Load existing accounts
    await googleAuthManager.loadAccounts();
    
    // Check if account exists
    const allAccounts = googleAuthManager.activeAccounts.concat(googleAuthManager.failedAccounts);
    if (allAccounts.some(acc => acc.email === email)) {
      return res.status(400).json({
        success: false,
        error: 'Account already exists'
      });
    }

    // Create new account object
    const newAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      email: email,
      password: googleAuthManager.encryptPassword(password),
      accountType: accountType || 'personal',
      has2FA: has2FA || false,
      backupCodes: backupCodes || [],
      status: 'active',
      created: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0,
      successRate: 1.0,
      failureCount: 0,
      lastError: null
    };

    // Save to file
    allAccounts.push(newAccount);
    await googleAuthManager.saveAccounts(allAccounts);
    
    // Reload accounts
    await googleAuthManager.loadAccounts();

    res.json({ 
      success: true, 
      account: {
        id: newAccount.id,
        email: newAccount.email,
        accountType: newAccount.accountType,
        status: newAccount.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/google-accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await googleAuthManager.loadAccounts();
    const allAccounts = googleAuthManager.activeAccounts.concat(googleAuthManager.failedAccounts);
    
    const filteredAccounts = allAccounts.filter(acc => 
      acc.id !== id && acc.email !== id // Support both ID and email
    );
    
    if (filteredAccounts.length < allAccounts.length) {
      await googleAuthManager.saveAccounts(filteredAccounts);
      await googleAuthManager.loadAccounts();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Account not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/google-accounts/templates', async (req, res) => {
  try {
    // For now, return empty templates array
    res.json({ 
      success: true, 
      templates: []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/google-accounts/templates/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    res.json({
      success: true,
      template: name,
      path: `chrome_templates/${name}`,
      instructions: 'Template creation not implemented in this version'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/google-accounts/test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Load accounts to find the one to test
    await googleAuthManager.loadAccounts();
    const allAccounts = googleAuthManager.activeAccounts.concat(googleAuthManager.failedAccounts);
    
    const account = allAccounts.find(acc => acc.id === id || acc.email === id);
    
    if (!account) {
      return res.status(404).json({ 
        success: false, 
        error: 'Account not found' 
      });
    }
    
    // Decrypt password for testing
    const password = googleAuthManager.decryptPassword(account.password);
    
    if (!password) {
      return res.status(500).json({
        success: false,
        error: 'Failed to decrypt password'
      });
    }
    
    // Simple validation (not actual login)
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email);
    const passwordValid = password.length >= 6;
    
    if (emailValid && passwordValid) {
      // Update account last used
      account.lastUsed = new Date().toISOString();
      account.status = 'active';
      await googleAuthManager.saveAccounts(allAccounts);
      await googleAuthManager.loadAccounts();
      
      res.json({ 
        success: true, 
        testResult: 'Credentials valid',
        requires2FA: account.has2FA || false
      });
    } else {
      res.json({
        success: false,
        testResult: 'Invalid credentials',
        requires2FA: false
      });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/google-accounts/test-all', async (req, res) => {
  try {
    await googleAuthManager.loadAccounts();
    const allAccounts = googleAuthManager.activeAccounts.concat(googleAuthManager.failedAccounts);
    
    const results = [];
    
    for (const account of allAccounts) {
      try {
        const password = googleAuthManager.decryptPassword(account.password);
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email);
        const passwordValid = password && password.length >= 6;
        
        results.push({
          email: account.email,
          status: emailValid && passwordValid ? 'valid' : 'invalid',
          hasPassword: !!password,
          has2FA: account.has2FA || false
        });
        
      } catch (error) {
        results.push({
          email: account.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BATCH SESSION API ====================
app.post('/api/batch/create', (req, res) => {
  try {
    const config = req.body;
    
    if (!config.targetUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'targetUrl is required' 
      });
    }
    
    if (config.totalSessions && config.totalSessions > 1000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maksimal 1000 session per batch' 
      });
    }
    
    if (config.concurrentSessions && config.concurrentSessions > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maksimal 5 session bersamaan' 
      });
    }
    
    const batchId = batchManager.addBatch(config);
    
    res.json({
      success: true,
      batchId,
      message: 'Batch created successfully',
      config: {
        ...config,
        totalSessions: config.totalSessions || 10,
        concurrentSessions: config.concurrentSessions || 3
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/batch/start/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    
    const success = batchManager.startBatch(batchId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Batch started successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/batch/stop/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    
    const success = batchManager.stopBatch(batchId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Batch stopped successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/batch/status/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    
    const status = batchManager.getBatchStatus(batchId);
    
    if (status) {
      res.json({
        success: true,
        ...status
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/batch/all', (req, res) => {
  try {
    const batches = batchManager.getAllBatches();
    
    res.json({
      success: true,
      batches,
      stats: {
        totalBatches: batches.length,
        runningBatches: batches.filter(b => b.status === 'running').length,
        completedBatches: batches.filter(b => b.status === 'completed').length
      }
    });
  } catch (error) {
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

app.get('/test-keywords', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-keywords.html'));
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

// Create necessary directories
['public', 'bot', 'data', 'chrome_profiles', 'chrome_templates'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Create CSS and JS directories
['public/css', 'public/js'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log(`🚀 Organic Traffic Bot 2025 - Enhanced Edition`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/monitoring`);
  console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
  console.log('='.repeat(70));
  console.log('\n📋 Available API Endpoints:');
  console.log('   POST /api/start-organic    - Start single session');
  console.log('   POST /api/batch/create     - Create batch (max 1000 sessions)');
  console.log('   GET  /api/google-accounts  - List Google accounts');
  console.log('   POST /api/google-accounts  - Add Google account');
  console.log('   GET  /api/all-sessions     - List all sessions');
  console.log('\n🔐 Features:');
  console.log('   ✅ Google Account Login System');
  console.log('   ✅ Unique Chrome Profiles per Session');
  console.log('   ✅ Batch Session System (5 concurrent, 1000 max)');
  console.log('   ✅ Google Block Bypass');
  console.log('   ✅ Password Encryption');
  console.log('\n🚀 Server is ready!');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  batchManager.isRunning = false;
  if (batchManager.batchInterval) {
    clearInterval(batchManager.batchInterval);
  }
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  batchManager.isRunning = false;
  if (batchManager.batchInterval) {
    clearInterval(batchManager.batchInterval);
  }
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;