// Batch Controller for managing multiple sessions
class BatchController {
    constructor() {
        this.batches = new Map();
        this.activeSessions = new Map();
        this.maxConcurrent = 5;
        this.maxTotal = 1000;
        this.stats = {
            totalBatches: 0,
            totalSessions: 0,
            completedSessions: 0,
            failedSessions: 0,
            runningBatches: 0
        };
        
        console.log('✅ Batch Controller initialized');
    }
    
    // Create new batch
    createBatch(config) {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        const batch = {
            id: batchId,
            config: {
                ...config,
                totalSessions: Math.min(config.totalSessions || 10, this.maxTotal),
                concurrentSessions: Math.min(config.concurrentSessions || 3, this.maxConcurrent)
            },
            sessions: [],
            status: 'pending',
            created: new Date().toISOString(),
            started: null,
            completed: null,
            stats: {
                total: 0,
                pending: 0,
                running: 0,
                completed: 0,
                failed: 0
            }
        };
        
        // Generate session configs
        for (let i = 0; i < batch.config.totalSessions; i++) {
            const sessionConfig = this.generateSessionConfig(batch.config, i);
            batch.sessions.push({
                id: `session_${batchId}_${i}`,
                config: sessionConfig,
                status: 'pending',
                attempts: [],
                results: []
            });
        }
        
        batch.stats.total = batch.sessions.length;
        batch.stats.pending = batch.sessions.length;
        
        this.batches.set(batchId, batch);
        this.stats.totalBatches++;
        
        console.log(`📦 Batch ${batchId} created: ${batch.sessions.length} sessions`);
        return batchId;
    }
    
    // Generate unique session config
    generateSessionConfig(batchConfig, index) {
        // Rotate proxy types
        const proxyTypes = ['vpn', 'fresh', 'web'];
        const proxyType = proxyTypes[index % proxyTypes.length];
        
        // Randomize device if needed
        let deviceType = batchConfig.deviceType;
        if (deviceType === 'random') {
            deviceType = Math.random() > 0.5 ? 'desktop' : 'mobile';
        }
        
        // Generate unique user agent
        const userAgent = this.getRandomUserAgent(deviceType);
        
        return {
            targetUrl: batchConfig.targetUrl,
            proxyType: batchConfig.proxyType === 'random' ? proxyType : batchConfig.proxyType,
            deviceType: deviceType,
            searchEngine: batchConfig.searchEngine || 'google',
            keywordMode: batchConfig.keywordMode || 'auto',
            customKeywords: batchConfig.customKeywords || [],
            maxKeywords: batchConfig.maxKeywords || 3,
            userAgent: userAgent,
            requireCompletion: true,
            maxRetries: 3,
            retryDelay: 5000
        };
    }
    
    // Get random user agent
    getRandomUserAgent(deviceType) {
        const desktopAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ];
        
        const mobileAgents = [
            'Mozilla/5.0 (Linux; Android 14; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        ];
        
        const agents = deviceType === 'mobile' ? mobileAgents : desktopAgents;
        return agents[Math.floor(Math.random() * agents.length)];
    }
    
    // Start batch execution
    async startBatch(batchId, botManager) {
        const batch = this.batches.get(batchId);
        if (!batch) {
            throw new Error('Batch not found');
        }
        
        batch.status = 'running';
        batch.started = new Date().toISOString();
        this.stats.runningBatches++;
        
        console.log(`🚀 Starting batch ${batchId}: ${batch.sessions.length} sessions`);
        
        // Start initial sessions
        await this.startNextSessions(batchId, botManager);
        
        return batchId;
    }
    
    // Start next available sessions
    async startNextSessions(batchId, botManager) {
        const batch = this.batches.get(batchId);
        if (!batch || batch.status !== 'running') return;
        
        // Count currently running sessions
        const runningCount = batch.sessions.filter(s => s.status === 'running').length;
        const availableSlots = batch.config.concurrentSessions - runningCount;
        
        if (availableSlots <= 0) return;
        
        // Find pending sessions
        const pendingSessions = batch.sessions.filter(s => s.status === 'pending');
        
        // Start available sessions
        for (let i = 0; i < Math.min(availableSlots, pendingSessions.length); i++) {
            this.executeSession(batchId, pendingSessions[i].id, botManager);
        }
    }
    
    // Execute individual session
    async executeSession(batchId, sessionId, botManager) {
        const batch = this.batches.get(batchId);
        if (!batch) return;
        
        const session = batch.sessions.find(s => s.id === sessionId);
        if (!session) return;
        
        session.status = 'running';
        session.startedAt = new Date().toISOString();
        batch.stats.running++;
        batch.stats.pending--;
        
        this.activeSessions.set(sessionId, { batchId, session });
        
        console.log(`▶️  Starting session ${sessionId} in batch ${batchId}`);
        
        try {
            if (!botManager || !botManager.startOrganicSession) {
                throw new Error('Bot manager not available');
            }
            
            // Record attempt
            session.attempts.push({
                attempt: session.attempts.length + 1,
                time: new Date().toISOString(),
                config: { ...session.config },
                status: 'started'
            });
            
            // Start session
            const result = await botManager.startOrganicSession(session.config);
            
            session.attempts[session.attempts.length - 1].status = 'success';
            session.attempts[session.attempts.length - 1].result = result;
            
            // Monitor session completion
            this.monitorSession(batchId, sessionId, botManager);
            
        } catch (error) {
            console.error(`❌ Session ${sessionId} failed:`, error.message);
            
            session.attempts.push({
                attempt: session.attempts.length + 1,
                time: new Date().toISOString(),
                error: error.message,
                status: 'failed'
            });
            
            // Handle retry or mark as failed
            await this.handleSessionError(batchId, sessionId, botManager);
        }
    }
    
    // Monitor session progress
    async monitorSession(batchId, sessionId, botManager) {
        const batch = this.batches.get(batchId);
        if (!batch) return;
        
        const session = batch.sessions.find(s => s.id === sessionId);
        if (!session) return;
        
        // Poll session status every 5 seconds
        const checkInterval = setInterval(async () => {
            try {
                // Check if session is still active
                const allSessions = botManager.getAllSessions ? botManager.getAllSessions() : [];
                const currentSession = allSessions.find(s => s.id === sessionId);
                
                if (!currentSession || currentSession.status === 'stopped' || currentSession.status === 'completed') {
                    clearInterval(checkInterval);
                    
                    session.status = 'completed';
                    session.completedAt = new Date().toISOString();
                    batch.stats.running--;
                    batch.stats.completed++;
                    this.stats.completedSessions++;
                    
                    this.activeSessions.delete(sessionId);
                    
                    console.log(`✅ Session ${sessionId} completed in batch ${batchId}`);
                    
                    // Start next session if available
                    await this.startNextSessions(batchId, botManager);
                    
                    // Check if batch is complete
                    this.checkBatchCompletion(batchId);
                }
            } catch (error) {
                console.error(`❌ Error monitoring session ${sessionId}:`, error.message);
                clearInterval(checkInterval);
            }
        }, 5000);
    }
    
    // Handle session error with retry logic
    async handleSessionError(batchId, sessionId, botManager) {
        const batch = this.batches.get(batchId);
        if (!batch) return;
        
        const session = batch.sessions.find(s => s.id === sessionId);
        if (!session) return;
        
        const attemptCount = session.attempts.filter(a => a.status === 'failed').length;
        
        if (attemptCount < session.config.maxRetries) {
            // Retry with different config
            console.log(`🔄 Retrying session ${sessionId} (attempt ${attemptCount + 1})`);
            
            // Update config for retry
            session.config.proxyType = this.rotateProxy(session.config.proxyType);
            session.config.userAgent = this.getRandomUserAgent(session.config.deviceType);
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, session.config.retryDelay));
            
            // Put back in pending queue
            session.status = 'pending';
            batch.stats.running--;
            batch.stats.pending++;
            
            // Try to start again
            await this.startNextSessions(batchId, botManager);
            
        } else {
            // Max retries reached, mark as failed
            session.status = 'failed';
            session.completedAt = new Date().toISOString();
            batch.stats.running--;
            batch.stats.failed++;
            this.stats.failedSessions++;
            
            this.activeSessions.delete(sessionId);
            
            console.log(`❌ Session ${sessionId} failed after ${attemptCount} attempts`);
            
            // Start next session
            await this.startNextSessions(batchId, botManager);
            
            // Check if batch is complete
            this.checkBatchCompletion(batchId);
        }
    }
    
    // Rotate proxy type for retry
    rotateProxy(currentProxy) {
        const proxies = ['vpn', 'fresh', 'web'];
        const currentIndex = proxies.indexOf(currentProxy);
        return proxies[(currentIndex + 1) % proxies.length];
    }
    
    // Check if batch is complete
    checkBatchCompletion(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch) return;
        
        const remainingSessions = batch.sessions.filter(s => 
            s.status === 'pending' || s.status === 'running'
        );
        
        if (remainingSessions.length === 0) {
            batch.status = 'completed';
            batch.completed = new Date().toISOString();
            this.stats.runningBatches--;
            
            console.log(`🎉 Batch ${batchId} completed: ${batch.stats.completed} successful, ${batch.stats.failed} failed`);
        }
    }
    
    // Stop batch
    stopBatch(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch) return false;
        
        batch.status = 'stopped';
        batch.completed = new Date().toISOString();
        
        // Mark all running sessions as stopped
        batch.sessions.forEach(session => {
            if (session.status === 'running') {
                session.status = 'stopped';
                session.completedAt = new Date().toISOString();
                batch.stats.running--;
                batch.stats.failed++;
            }
        });
        
        this.stats.runningBatches--;
        
        console.log(`⏹️ Batch ${batchId} stopped`);
        return true;
    }
    
    // Get batch status
    getBatchStatus(batchId) {
        const batch = this.batches.get(batchId);
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
                attempts: s.attempts.length,
                startedAt: s.startedAt,
                completedAt: s.completedAt
            }))
        };
    }
    
    // Get all batches
    getAllBatches() {
        const batches = [];
        for (const [batchId, batch] of this.batches) {
            batches.push({
                id: batch.id,
                status: batch.status,
                config: batch.config,
                stats: batch.stats,
                created: batch.created,
                started: batch.started,
                completed: batch.completed
            });
        }
        return batches;
    }
    
    // Get system stats
    getStats() {
        return {
            ...this.stats,
            activeBatches: this.batches.size,
            activeSessions: this.activeSessions.size
        };
    }
}

module.exports = BatchController;
