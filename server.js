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

// ==================== GOOGLE ACCOUNTS MANAGER ====================
const fs = require('fs').promises;  // ✅ Gunakan fs.promises
const path = require('path');
const crypto = require('crypto');

class GoogleAccountsManager {
    constructor() {
        this.accountsFile = path.join(__dirname, 'data', 'google-accounts.json');
        this.templatesDir = path.join(__dirname, 'chrome_templates');
        this.init();
    }

    async init() {
        try {
            // Buat direktori parent jika belum ada
            const accountsDir = path.dirname(this.accountsFile);
            
            // Gunakan fs.promises.mkdir dengan recursive
            await fs.mkdir(accountsDir, { recursive: true });
            await fs.mkdir(this.templatesDir, { recursive: true });
            
            // Periksa apakah file accounts ada
            try {
                await fs.access(this.accountsFile);
                console.log('✅ Google accounts file exists');
            } catch {
                // File tidak ada, buat baru
                await this.saveAccounts([]);
                console.log('📄 Created new Google accounts file');
            }
            
            console.log('✅ Google Accounts Manager initialized');
        } catch (error) {
            console.error('❌ GoogleAccountsManager init error:', error.message);
        }
    }

    // Helper untuk check file exists
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Encrypt password
    encryptPassword(password) {
        try {
            const iv = crypto.randomBytes(16);
            const key = crypto.createHash('sha256')
                .update(process.env.ENCRYPTION_KEY || 'organic-traffic-bot-2025')
                .digest();
            
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(password, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return {
                iv: iv.toString('hex'),
                data: encrypted
            };
        } catch (error) {
            console.error('❌ Encryption error:', error.message);
            return null;
        }
    }

    // Decrypt password
    decryptPassword(encrypted) {
        try {
            if (!encrypted || !encrypted.iv || !encrypted.data) {
                return null;
            }
            
            const key = crypto.createHash('sha256')
                .update(process.env.ENCRYPTION_KEY || 'organic-traffic-bot-2025')
                .digest();
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, 
                Buffer.from(encrypted.iv, 'hex'));
            
            let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('❌ Decryption error:', error.message);
            return null;
        }
    }

    async loadAccounts() {
        try {
            if (await this.fileExists(this.accountsFile)) {
                const data = await fs.readFile(this.accountsFile, 'utf8');
                return JSON.parse(data);
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading accounts:', error.message);
            return [];
        }
    }

    async saveAccounts(accounts) {
        try {
            await fs.writeFile(this.accountsFile, JSON.stringify(accounts, null, 2));
            return true;
        } catch (error) {
            console.error('❌ Error saving accounts:', error.message);
            return false;
        }
    }

    async addAccount(email, password, accountType = 'personal', has2FA = false, backupCodes = []) {
        try {
            const accounts = await this.loadAccounts();
            
            // Check if email already exists
            if (accounts.some(acc => acc.email === email)) {
                throw new Error('Account already exists');
            }

            const account = {
                id: crypto.randomBytes(8).toString('hex'),
                email: email,
                password: this.encryptPassword(password),
                accountType: accountType,
                has2FA: has2FA,
                backupCodes: backupCodes,
                status: 'active',
                created: new Date().toISOString(),
                lastUsed: null,
                usageCount: 0,
                successRate: 100,
                lastError: null
            };

            accounts.push(account);
            await this.saveAccounts(accounts);
            
            console.log(`✅ Added Google account: ${email}`);
            
            return {
                id: account.id,
                email: account.email,
                accountType: account.accountType,
                status: account.status
            };
        } catch (error) {
            console.error('❌ Error adding account:', error.message);
            throw error;
        }
    }

    async removeAccount(accountId) {
        try {
            const accounts = await this.loadAccounts();
            const filtered = accounts.filter(acc => acc.id !== accountId);
            
            if (filtered.length < accounts.length) {
                await this.saveAccounts(filtered);
                console.log(`✅ Removed Google account ID: ${accountId}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error removing account:', error.message);
            return false;
        }
    }

    async updateAccount(accountId, updates) {
        try {
            const accounts = await this.loadAccounts();
            const index = accounts.findIndex(acc => acc.id === accountId);
            
            if (index !== -1) {
                accounts[index] = { ...accounts[index], ...updates };
                await this.saveAccounts(accounts);
                return accounts[index];
            }
            return null;
        } catch (error) {
            console.error('❌ Error updating account:', error.message);
            return null;
        }
    }

    async getAccountCredentials(accountId) {
        try {
            const accounts = await this.loadAccounts();
            const account = accounts.find(acc => acc.id === accountId);
            
            if (!account) return null;
            
            const password = this.decryptPassword(account.password);
            
            if (!password) {
                console.error(`❌ Failed to decrypt password for account: ${account.email}`);
                return null;
            }
            
            return {
                email: account.email,
                password: password,
                has2FA: account.has2FA,
                backupCodes: account.backupCodes
            };
        } catch (error) {
            console.error('❌ Error getting credentials:', error.message);
            return null;
        }
    }

    async getRandomAccount() {
        try {
            const accounts = await this.loadAccounts();
            const activeAccounts = accounts.filter(acc => 
                acc.status === 'active' && !acc.has2FA
            );
            
            if (activeAccounts.length === 0) return null;
            
            // Sort by least recently used
            activeAccounts.sort((a, b) => {
                const dateA = a.lastUsed ? new Date(a.lastUsed) : new Date(0);
                const dateB = b.lastUsed ? new Date(b.lastUsed) : new Date(0);
                return dateA - dateB;
            });
            
            return activeAccounts[0];
        } catch (error) {
            console.error('❌ Error getting random account:', error.message);
            return null;
        }
    }

    async incrementUsage(accountId, success = true) {
        try {
            const accounts = await this.loadAccounts();
            const index = accounts.findIndex(acc => acc.id === accountId);
            
            if (index !== -1) {
                const account = accounts[index];
                account.usageCount = (account.usageCount || 0) + 1;
                account.lastUsed = new Date().toISOString();
                
                // Update success rate
                const total = account.usageCount;
                const successes = (account.successRate || 100) * (total - 1) + (success ? 100 : 0);
                account.successRate = successes / total;
                
                // Mark as suspicious if success rate < 30%
                if (account.successRate < 30 && total > 5) {
                    account.status = 'suspicious';
                    console.log(`⚠️ Account ${account.email} marked as suspicious (success rate: ${account.successRate.toFixed(1)}%)`);
                }
                
                await this.saveAccounts(accounts);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error incrementing usage:', error.message);
            return false;
        }
    }

    async getTemplates() {
        try {
            if (await this.fileExists(this.templatesDir)) {
                const templates = await fs.readdir(this.templatesDir);
                return templates.filter(t => !t.startsWith('.'));
            }
            return [];
        } catch (error) {
            console.error('❌ Error getting templates:', error.message);
            return [];
        }
    }

    async createTemplate(templateName) {
        try {
            const templatePath = path.join(this.templatesDir, templateName);
            await fs.mkdir(templatePath, { recursive: true });
            
            // Create basic template info
            const templateInfo = {
                name: templateName,
                path: templatePath,
                created: new Date().toISOString(),
                description: 'Chrome profile template for Google login'
            };
            
            const infoFile = path.join(templatePath, 'template-info.json');
            await fs.writeFile(infoFile, JSON.stringify(templateInfo, null, 2));
            
            console.log(`✅ Created template: ${templateName}`);
            
            return {
                success: true,
                template: templateName,
                path: templatePath,
                instructions: `Open Chrome with: chrome.exe --user-data-dir="${templatePath}"\nLogin to Google account, then close browser.`
            };
        } catch (error) {
            console.error('❌ Error creating template:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Initialize manager
const googleAccountsManager = new GoogleAccountsManager();
            
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
    const accounts = await googleAccountsManager.loadAccounts();
    res.json({
      success: true,
      accounts: accounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        accountType: acc.accountType,
        status: acc.status,
        created: acc.created,
        lastUsed: acc.lastUsed,
        usageCount: acc.usageCount,
        successRate: acc.successRate,
        has2FA: acc.has2FA
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

    const backupCodesArray = backupCodes ? 
      backupCodes.split(',').map(code => code.trim()).filter(code => code) : [];
    
    const result = await googleAccountsManager.addAccount(
      email, 
      password, 
      accountType || 'personal',
      has2FA || false,
      backupCodesArray
    );
    
    res.json({ success: true, account: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/google-accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await googleAccountsManager.removeAccount(id);
    res.json({ success: success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/google-accounts/templates', async (req, res) => {
  try {
    const templates = await googleAccountsManager.getTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/google-accounts/templates/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const templatePath = await googleAccountsManager.createTemplate(name);
    
    res.json({
      success: true,
      template: name,
      path: templatePath,
      instructions: `Open Chrome with: chrome.exe --user-data-dir="${templatePath}"`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/google-accounts/test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const credentials = await googleAccountsManager.getAccountCredentials(id);
    
    if (!credentials) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    
    const puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2' });
      
      await page.type('input[type="email"]', credentials.email);
      await page.click('#identifierNext');
      await page.waitForTimeout(2000);
      
      await page.type('input[type="password"]', credentials.password);
      await page.click('#passwordNext');
      await page.waitForTimeout(5000);
      
      const url = page.url();
      const success = url.includes('myaccount.google.com') || 
                     url.includes('accounts.google.com/signin/v2/challenge/pwd');
      
      await browser.close();
      
      await googleAccountsManager.updateAccount(id, {
        status: success ? 'active' : 'failed',
        lastError: success ? null : 'Login failed',
        lastUsed: new Date().toISOString()
      });
      
      res.json({ 
        success: true, 
        testResult: success ? 'Login successful' : 'Login failed',
        requires2FA: url.includes('challenge/totp')
      });
      
    } catch (error) {
      await browser.close();
      throw error;
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/google-accounts/test-all', async (req, res) => {
  try {
    const accounts = await googleAccountsManager.loadAccounts();
    const results = [];
    
    for (const account of accounts) {
      try {
        const credentials = await googleAccountsManager.getAccountCredentials(account.id);
        
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email);
        
        results.push({
          email: account.email,
          status: emailValid ? 'valid' : 'invalid',
          hasPassword: !!credentials.password
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

['public', 'bot', 'data', 'chrome_profiles', 'chrome_templates'].forEach(dir => {
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
