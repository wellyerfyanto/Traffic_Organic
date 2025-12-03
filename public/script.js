// ==================== GLOBAL VARIABLES ====================
let proxyRefreshInterval = null;
let currentProxyStats = null;
let systemStatusInterval = null;

// ==================== DOM LOADED ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌱 Pure Organic Traffic Bot Frontend Loaded');
    
    // Initialize proxy type selection
    initializeProxyTypeSelection();
    
    // Load initial data
    loadSystemStatus();
    updateLiveProxyStats();
    checkLoopStatus();
    
    // Setup periodic updates
    setupPeriodicUpdates();
    
    // Setup event listeners
    setupEventListeners();
    
    // Add CSS for enhanced UI
    addEnhancedStyles();
});

// ==================== SETUP FUNCTIONS ====================
function setupPeriodicUpdates() {
    // Update proxy stats every 30 seconds
    proxyRefreshInterval = setInterval(updateLiveProxyStats, 30000);
    
    // Update loop status every minute
    setInterval(checkLoopStatus, 60000);
    
    // Update system status every 2 minutes
    systemStatusInterval = setInterval(loadSystemStatus, 120000);
    
    // Auto-refresh proxy details every 10 seconds (for fast updates)
    setInterval(refreshProxyDetails, 10000);
    
    console.log('🔄 Periodic updates configured');
}

function setupEventListeners() {
    // Auto-refresh proxy stats on window focus
    window.addEventListener('focus', updateLiveProxyStats);
    
    // Enter key in target URL field
    const targetUrlInput = document.getElementById('targetUrl');
    if (targetUrlInput) {
        targetUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                startPureOrganic();
            }
        });
    }
    
    // Form validation
    setupFormValidation();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl + R to refresh all
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            refreshAllData();
        }
        // Ctrl + S to start session
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            startPureOrganic();
        }
    });
}

function initializeProxyTypeSelection() {
    const proxyOptions = document.querySelectorAll('.proxy-option input[type="radio"]');
    proxyOptions.forEach(option => {
        option.addEventListener('change', function() {
            updateProxySelectionUI(this.value);
            updateProxyRecommendation(this.value);
        });
    });
    
    // Set default selection
    updateProxySelectionUI('fresh');
}

function updateProxySelectionUI(selectedType) {
    const proxyCards = document.querySelectorAll('.proxy-card');
    proxyCards.forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`input[value="${selectedType}"] + .proxy-card`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
}

function updateProxyRecommendation(proxyType) {
    const recommendation = document.getElementById('proxyRecommendation');
    if (!recommendation) {
        const container = document.querySelector('.form-group:has(.proxy-options)');
        if (container) {
            const recDiv = document.createElement('div');
            recDiv.id = 'proxyRecommendation';
            recDiv.className = 'proxy-recommendation';
            container.appendChild(recDiv);
        }
    }
    
    const messages = {
        'fresh': '✅ Recommended: Fastest proxies, auto-refresh every 5 minutes',
        'web': '🌐 Web Gateway: Stable but slower, good for fallback',
        'vpn': '🛡️ VPN Extensions: Most reliable but limited quantity'
    };
    
    if (recommendation) {
        recommendation.textContent = messages[proxyType] || 'Select proxy type';
    }
}

function setupFormValidation() {
    const forms = document.querySelectorAll('input[type="url"], input[type="number"]');
    forms.forEach(input => {
        input.addEventListener('blur', function() {
            validateInput(this);
        });
    });
}

function validateInput(input) {
    if (input.type === 'url' && input.value) {
        try {
            new URL(input.value);
            input.classList.remove('invalid');
            input.classList.add('valid');
        } catch (e) {
            input.classList.remove('valid');
            input.classList.add('invalid');
            showNotification('❌ Invalid URL format', 'error');
        }
    }
    
    if (input.type === 'number') {
        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 100;
        const value = parseInt(input.value);
        
        if (value < min || value > max) {
            input.classList.remove('valid');
            input.classList.add('invalid');
            showNotification(`Value must be between ${min} and ${max}`, 'warning');
        } else {
            input.classList.remove('invalid');
            input.classList.add('valid');
        }
    }
}

function addEnhancedStyles() {
    const styles = `
        <style>
            /* Enhanced Styles */
            .proxy-card.selected {
                border-color: #27ae60;
                background: linear-gradient(135deg, #e8f6f3 0%, #d5f4e6 100%);
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(39, 174, 96, 0.2);
            }
            
            .proxy-recommendation {
                margin-top: 10px;
                padding: 10px 15px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #3498db;
                font-size: 0.9rem;
                color: #2c3e50;
            }
            
            .proxy-stats-enhanced {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 15px;
                padding: 20px;
                margin: 20px 0;
                color: white;
            }
            
            .proxy-type-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .proxy-type-item {
                background: rgba(255, 255, 255, 0.15);
                padding: 10px;
                border-radius: 10px;
                text-align: center;
                backdrop-filter: blur(10px);
            }
            
            .proxy-type-label {
                font-size: 0.8rem;
                opacity: 0.9;
                margin-bottom: 5px;
            }
            
            .proxy-type-value {
                font-size: 1.5rem;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .proxy-type-sub {
                font-size: 0.75rem;
                opacity: 0.8;
            }
            
            .status-indicator {
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-right: 8px;
            }
            
            .status-good { background: #27ae60; }
            .status-warning { background: #f39c12; }
            .status-critical { background: #e74c3c; }
            .status-unknown { background: #7f8c8d; }
            
            .btn-loading {
                position: relative;
                pointer-events: none;
                opacity: 0.8;
            }
            
            .btn-loading:after {
                content: '';
                position: absolute;
                width: 20px;
                height: 20px;
                top: 50%;
                left: 50%;
                margin: -10px 0 0 -10px;
                border: 2px solid transparent;
                border-top-color: white;
                border-radius: 50%;
                animation: button-spinner 0.8s linear infinite;
            }
            
            @keyframes button-spinner {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .notification.proxy-update {
                background: linear-gradient(135deg, #3498db 0%, #2c3e50 100%);
                border-left: 5px solid #27ae60;
            }
            
            .proxy-refresh-btn {
                margin-left: 10px;
                padding: 2px 8px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 3px;
                color: white;
                cursor: pointer;
                font-size: 0.8rem;
                transition: background 0.3s;
            }
            
            .proxy-refresh-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            input.valid {
                border-color: #27ae60;
                background: #e8f6f3;
            }
            
            input.invalid {
                border-color: #e74c3c;
                background: #fadbd8;
            }
            
            .proxy-speed-indicator {
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                margin-top: 5px;
                overflow: hidden;
            }
            
            .proxy-speed-bar {
                height: 100%;
                background: #27ae60;
                transition: width 0.5s;
            }
            
            .proxy-speed-fast { background: #27ae60; }
            .proxy-speed-medium { background: #f39c12; }
            .proxy-speed-slow { background: #e74c3c; }
            
            .proxy-source-badge {
                display: inline-block;
                font-size: 0.7rem;
                padding: 2px 6px;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.2);
                margin-left: 5px;
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

// ==================== PROXY MANAGEMENT ====================
async function updateLiveProxyStats() {
    try {
        const response = await fetch('/api/proxies/status');
        const result = await response.json();
        
        if (result.success) {
            currentProxyStats = result;
            displayEnhancedProxyStats(result);
            updateProxyCount(result);
            updateProxyTypeDistribution(result);
            checkProxyHealth(result);
        } else {
            showNotification('❌ Failed to load proxy stats', 'error');
        }
    } catch (error) {
        console.error('Error loading proxy stats:', error);
        const statsContainer = document.getElementById('liveProxyStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="proxy-stat-item error">
                    <div class="proxy-stat-label">Connection Error</div>
                    <div class="proxy-stat-value">❌</div>
                    <small>Check server connection</small>
                </div>
            `;
        }
    }
}

function displayEnhancedProxyStats(proxyData) {
    const statsContainer = document.getElementById('liveProxyStats');
    if (!statsContainer) return;
    
    const activeFresh = proxyData.freshProxies?.length || 0;
    const activeWeb = proxyData.webProxies?.length || 0;
    const activeVPN = proxyData.vpnExtensions?.length || 0;
    const total = proxyData.stats?.totalWorking || 0;
    const successRate = proxyData.stats?.successRate || 0;
    
    // Get proxy type distribution
    const typeDistribution = proxyData.stats?.fresh?.byType || {};
    const typeDetails = Object.entries(typeDistribution).map(([type, count]) => 
        `${type}:${count}`
    ).join(', ') || 'none';
    
    const statsHTML = `
        <div class="proxy-stats-enhanced">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: white;"><i class="fas fa-network-wired"></i> Live Proxy Network</h3>
                <button class="proxy-refresh-btn" onclick="forceRefreshProxies()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
            
            <div class="proxy-type-stats">
                <div class="proxy-type-item">
                    <div class="proxy-type-label">🆕 Fresh Proxies</div>
                    <div class="proxy-type-value">${activeFresh}</div>
                    <div class="proxy-speed-indicator">
                        <div class="proxy-speed-bar ${getSpeedClass(activeFresh, 20, 10)}" 
                             style="width: ${Math.min((activeFresh/50)*100, 100)}%"></div>
                    </div>
                    <div class="proxy-type-sub">${typeDetails}</div>
                </div>
                
                <div class="proxy-type-item">
                    <div class="proxy-type-label">🌐 Web Gateways</div>
                    <div class="proxy-type-value">${activeWeb}</div>
                    <div class="proxy-speed-indicator">
                        <div class="proxy-speed-bar ${getSpeedClass(activeWeb, 10, 5)}" 
                             style="width: ${Math.min((activeWeb/25)*100, 100)}%"></div>
                    </div>
                    <div class="proxy-type-sub">${activeWeb >= 10 ? 'Excellent' : activeWeb >= 5 ? 'Good' : 'Low'} coverage</div>
                </div>
                
                <div class="proxy-type-item">
                    <div class="proxy-type-label">🛡️ VPN Extensions</div>
                    <div class="proxy-type-value">${activeVPN}</div>
                    <div class="proxy-speed-indicator">
                        <div class="proxy-speed-bar ${getSpeedClass(activeVPN, 5, 3)}" 
                             style="width: ${Math.min((activeVPN/10)*100, 100)}%"></div>
                    </div>
                    <div class="proxy-type-sub">Browser extensions</div>
                </div>
                
                <div class="proxy-type-item">
                    <div class="proxy-type-label">📊 Overall Health</div>
                    <div class="proxy-type-value">${total}</div>
                    <div class="proxy-speed-indicator">
                        <div class="proxy-speed-bar ${getSpeedClass(total, 30, 15)}" 
                             style="width: ${Math.min((total/85)*100, 100)}%"></div>
                    </div>
                    <div class="proxy-type-sub">${successRate.toFixed(1)}% success rate</div>
                </div>
            </div>
            
            ${proxyData.stats?.lastUpdate ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <small style="opacity: 0.8;">
                        <i class="fas fa-clock"></i> Last update: ${formatTimeSince(proxyData.stats.lastUpdate)} ago
                        ${proxyData.stats.successRate ? ` • Success rate: ${proxyData.stats.successRate.toFixed(1)}%` : ''}
                    </small>
                </div>
            ` : ''}
        </div>
    `;
    
    statsContainer.innerHTML = statsHTML;
    
    // Update last refresh time
    const refreshElement = document.getElementById('proxyLastRefresh');
    if (refreshElement) {
        refreshElement.innerHTML = `
            <i class="fas fa-sync-alt"></i> Auto-refresh every 30s
            <br>
            <small>Last refresh: ${new Date().toLocaleTimeString()}</small>
        `;
    }
}

function getSpeedClass(count, excellentThreshold, goodThreshold) {
    if (count >= excellentThreshold) return 'proxy-speed-fast';
    if (count >= goodThreshold) return 'proxy-speed-medium';
    return 'proxy-speed-slow';
}

function updateProxyTypeDistribution(proxyData) {
    const distribution = proxyData.stats?.fresh?.byType || {};
    const typeContainer = document.getElementById('proxyTypeDistribution');
    
    if (!typeContainer) {
        const statsCard = document.querySelector('.proxy-stats-card');
        if (statsCard) {
            const div = document.createElement('div');
            div.id = 'proxyTypeDistribution';
            div.className = 'proxy-type-distribution';
            statsCard.appendChild(div);
        }
    } else {
        let html = '<h4><i class="fas fa-layer-group"></i> Proxy Type Distribution</h4><div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">';
        
        Object.entries(distribution).forEach(([type, count]) => {
            html += `
                <div style="background: rgba(52, 152, 219, 0.2); padding: 8px 15px; border-radius: 20px; font-size: 0.9rem;">
                    <span style="font-weight: bold;">${type.toUpperCase()}</span>
                    <span style="margin-left: 5px; background: #3498db; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem;">${count}</span>
                </div>
            `;
        });
        
        html += '</div>';
        typeContainer.innerHTML = html;
    }
}

function checkProxyHealth(proxyData) {
    const total = proxyData.stats?.totalWorking || 0;
    const successRate = proxyData.stats?.successRate || 0;
    
    if (total < 5) {
        showNotification('⚠️ Low proxy count! Some features may not work properly.', 'warning', 10000);
    } else if (successRate < 10) {
        showNotification('⚠️ Low proxy success rate. Consider refreshing proxies.', 'warning', 10000);
    } else if (total >= 20 && successRate >= 20) {
        showNotification('✅ Proxy network is healthy and ready!', 'success', 3000);
    }
}

function refreshProxyDetails() {
    if (!currentProxyStats) return;
    
    // Update timers and live data
    const lastUpdate = currentProxyStats.stats?.lastUpdate;
    if (lastUpdate) {
        const elements = document.querySelectorAll('.proxy-last-update');
        elements.forEach(el => {
            el.textContent = formatTimeSince(lastUpdate);
        });
    }
}

function formatTimeSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffHour > 0) return `${diffHour}h ${diffMin % 60}m ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    if (diffSec > 30) return `${diffSec}s ago`;
    return 'Just now';
}

function updateProxyCount(proxyData) {
    const totalProxies = proxyData.stats?.totalWorking || 0;
    const countElement = document.getElementById('liveProxyCount');
    if (countElement) {
        const successRate = proxyData.stats?.successRate || 0;
        const status = totalProxies >= 20 ? 'good' : totalProxies >= 10 ? 'warning' : 'critical';
        countElement.innerHTML = `
            <span class="status-indicator status-${status}"></span>
            ${totalProxies} active
            <small style="opacity: 0.8; margin-left: 5px;">(${successRate.toFixed(0)}% success)</small>
        `;
    }
}

async function forceRefreshProxies() {
    const refreshBtn = document.querySelector('.proxy-refresh-btn');
    const originalHtml = refreshBtn?.innerHTML;
    
    try {
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;
        }
        
        const response = await fetch('/api/proxies/refresh', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Proxies refreshed successfully!', 'success');
            updateLiveProxyStats();
            
            // Show update details
            setTimeout(() => {
                const newTotal = result.stats?.totalWorking || 0;
                const oldTotal = currentProxyStats?.stats?.totalWorking || 0;
                const difference = newTotal - oldTotal;
                
                if (difference > 0) {
                    showNotification(`📈 Found ${difference} new working proxies!`, 'proxy-update');
                }
            }, 500);
        } else {
            showNotification(`❌ Failed to refresh proxies: ${result.error}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Network error: ${error.message}`, 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.innerHTML = originalHtml;
            refreshBtn.disabled = false;
        }
    }
}

// ==================== ORGANIC SESSION FUNCTIONS ====================
async function startPureOrganic() {
    const targetUrl = document.getElementById('targetUrl')?.value;
    const searchEngine = document.getElementById('searchEngine')?.value;
    const proxyType = document.querySelector('input[name="proxyType"]:checked')?.value;
    const maxKeywords = document.getElementById('maxKeywords')?.value;
    const deviceType = document.getElementById('deviceType')?.value;
    
    // Validation
    if (!targetUrl) {
        showNotification('❌ Please enter target URL', 'error');
        document.getElementById('targetUrl')?.focus();
        return;
    }
    
    if (!proxyType) {
        showNotification('❌ Please select proxy type', 'error');
        return;
    }
    
    // Validate URL format
    try {
        new URL(targetUrl);
    } catch (error) {
        showNotification('❌ Invalid URL format. Please include http:// or https://', 'error');
        document.getElementById('targetUrl')?.focus();
        return;
    }
    
    const startBtn = document.querySelector('button[onclick="startPureOrganic()"]');
    if (!startBtn) return;
    
    const originalText = startBtn.innerHTML;
    
    try {
        startBtn.classList.add('btn-loading');
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Organic Session...';
        
        // Determine search engine
        let finalSearchEngine = searchEngine;
        if (searchEngine === 'random') {
            finalSearchEngine = Math.random() > 0.5 ? 'google' : 'bing';
        }
        
        // Check proxy availability
        const proxyCount = currentProxyStats?.stats?.totalWorking || 0;
        if (proxyCount < 3 && proxyType !== 'web') {
            const confirmDirect = confirm(`Only ${proxyCount} proxies available. Session may use direct connection. Continue?`);
            if (!confirmDirect) {
                throw new Error('Session cancelled by user');
            }
        }
        
        const formData = {
            targetUrl: targetUrl,
            profiles: 1,
            deviceType: deviceType,
            proxyType: proxyType,
            maxKeywords: parseInt(maxKeywords) || 3,
            enableSubUrl: true,
            searchEngine: finalSearchEngine,
            enableDirectFallback: true
        };
        
        const response = await fetch('/api/start-organic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(
                `✅ Pure organic session started via ${finalSearchEngine.toUpperCase()}!`,
                'success'
            );
            
            // Show success animation
            animateFlowDiagram();
            
            // Update UI with session info
            updateSessionStartUI(result.sessionId, targetUrl, finalSearchEngine);
            
            // Redirect to monitoring after delay
            setTimeout(() => {
                window.location.href = '/monitoring';
            }, 3000);
            
        } else {
            showNotification(`❌ Error: ${result.error}`, 'error');
            
            // If proxy error, suggest web proxy
            if (result.error.includes('proxy') || result.error.includes('Proxy')) {
                setTimeout(() => {
                    showNotification('💡 Try using "Web Proxy" type for more reliable connection', 'info', 5000);
                }, 2000);
            }
        }
        
    } catch (error) {
        showNotification(`❌ Network error: ${error.message}`, 'error');
    } finally {
        startBtn.classList.remove('btn-loading');
        startBtn.disabled = false;
        startBtn.innerHTML = originalText;
    }
}

function updateSessionStartUI(sessionId, targetUrl, searchEngine) {
    const sessionInfo = document.getElementById('sessionStartInfo');
    if (!sessionInfo) {
        const container = document.querySelector('.config-section');
        if (container) {
            const div = document.createElement('div');
            div.id = 'sessionStartInfo';
            div.className = 'session-start-info';
            container.appendChild(div);
        }
    }
    
    const infoDiv = document.getElementById('sessionStartInfo');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 15px; border-radius: 10px; margin-top: 20px; animation: slideIn 0.5s ease;">
                <h4 style="margin: 0 0 10px 0;"><i class="fas fa-rocket"></i> Session Launched!</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.9rem;">
                    <div>
                        <strong>Session ID:</strong>
                        <div style="font-family: monospace; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 5px; margin-top: 5px;">${sessionId.substring(0, 20)}...</div>
                    </div>
                    <div>
                        <strong>Target:</strong>
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 5px;">${targetUrl}</div>
                    </div>
                    <div>
                        <strong>Search Engine:</strong>
                        <div style="margin-top: 5px;"><i class="fas fa-search"></i> ${searchEngine.toUpperCase()}</div>
                    </div>
                </div>
                <div style="margin-top: 10px; text-align: center;">
                    <a href="/monitoring" style="color: white; text-decoration: underline; font-weight: bold;">
                        <i class="fas fa-external-link-alt"></i> Go to Monitoring
                    </a>
                </div>
            </div>
        `;
    }
}

function animateFlowDiagram() {
    const steps = document.querySelectorAll('.flow-step');
    steps.forEach((step, index) => {
        step.classList.remove('active');
        setTimeout(() => {
            step.classList.add('active');
            
            // Add checkmark when completed
            setTimeout(() => {
                const checkmark = document.createElement('div');
                checkmark.className = 'step-checkmark';
                checkmark.innerHTML = '<i class="fas fa-check"></i>';
                checkmark.style.cssText = 'position: absolute; right: 20px; color: #27ae60; font-size: 1.2rem;';
                step.appendChild(checkmark);
            }, 500);
        }, index * 800);
    });
    
    // Reset after animation
    setTimeout(() => {
        steps.forEach(step => {
            step.classList.remove('active');
            const checkmark = step.querySelector('.step-checkmark');
            if (checkmark) checkmark.remove();
        });
    }, 6000);
}

// ==================== KEYWORD ANALYSIS ====================
async function analyzeKeywords() {
    const targetUrl = document.getElementById('targetUrl')?.value;
    
    if (!targetUrl) {
        showNotification('❌ Please enter target URL', 'error');
        return;
    }
    
    const analyzeBtn = document.querySelector('button[onclick="analyzeKeywords()"]');
    if (!analyzeBtn) return;
    
    const originalText = analyzeBtn.innerHTML;
    
    try {
        analyzeBtn.classList.add('btn-loading');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        
        const response = await fetch('/api/analyze-keywords', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetUrl })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showKeywordAnalysisModal(result);
            showNotification('✅ Keyword analysis complete!', 'success');
            
            // Update form with suggested keywords count
            const keywordsInput = document.getElementById('maxKeywords');
            if (keywordsInput && result.keywords) {
                const suggestedCount = Math.min(5, result.keywords.length);
                keywordsInput.value = suggestedCount;
                showNotification(`💡 Suggested ${suggestedCount} keywords based on analysis`, 'info', 3000);
            }
        } else {
            showNotification(`❌ Analysis failed: ${result.error}`, 'error');
        }
        
    } catch (error) {
        showNotification(`❌ Network error: ${error.message}`, 'error');
    } finally {
        analyzeBtn.classList.remove('btn-loading');
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalText;
    }
}

function showKeywordAnalysisModal(data) {
    // Remove existing modal
    const existingModal = document.getElementById('keywordModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div class="modal-overlay" id="keywordModal">
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-search"></i> Keyword Analysis Results</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="analysis-stats">
                        <div class="stat-item">
                            <div class="stat-label">Target URL</div>
                            <div class="stat-value" style="font-size: 0.9rem;">${data.targetUrl}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Keywords</div>
                            <div class="stat-value">${data.keywords?.length || 0}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Content Keywords</div>
                            <div class="stat-value">${data.stats?.contentKeywords || 0}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Success Rate</div>
                            <div class="stat-value">${data.success ? '✅' : '❌'}</div>
                        </div>
                    </div>
                    
                    ${data.keywords && data.keywords.length > 0 ? `
                        <div class="keywords-list">
                            <h4><i class="fas fa-key"></i> Top Keywords for Organic Traffic:</h4>
                            <div class="keywords-grid">
                                ${data.keywords.slice(0, 15).map((keyword, index) => `
                                    <div class="keyword-tag" style="position: relative;">
                                        <span class="keyword-rank">#${index + 1}</span>
                                        <span class="keyword-text">${keyword}</span>
                                        <button class="keyword-use-btn" onclick="useSingleKeyword('${keyword}')" 
                                                style="position: absolute; right: 10px; background: none; border: none; color: white; cursor: pointer;">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                            <h4><i class="fas fa-chart-bar"></i> Recommendation</h4>
                            <p>For best results, use 3-5 keywords per session. Mix primary and secondary keywords.</p>
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                <button class="btn btn-primary" onclick="useKeywordsForSession(3)">
                                    <i class="fas fa-play"></i> Use Top 3 Keywords
                                </button>
                                <button class="btn btn-secondary" onclick="useKeywordsForSession(5)">
                                    <i class="fas fa-play"></i> Use Top 5 Keywords
                                </button>
                            </div>
                        </div>
                    ` : '<p class="no-data">No keywords found. Try a different URL or check connectivity.</p>'}
                    
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="useKeywordsForSession(${Math.min(5, data.keywords?.length || 3)})">
                            <i class="fas fa-play-circle"></i> Start Session with These Keywords
                        </button>
                        <button class="btn btn-outline" onclick="closeModal()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add modal styles if not exists
    if (!document.querySelector('#modalStyles')) {
        const modalStyles = `
            <style id="modalStyles">
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                }
                .modal {
                    background: white;
                    border-radius: 15px;
                    max-width: 900px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: modalSlideIn 0.3s ease;
                }
                @keyframes modalSlideIn {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .modal-header {
                    padding: 20px 30px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 {
                    margin: 0;
                    color: #2c3e50;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 2rem;
                    color: #7f8c8d;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                }
                .modal-close:hover {
                    background: #f8f9fa;
                    color: #e74c3c;
                }
                .modal-body {
                    padding: 30px;
                }
                .analysis-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 10px;
                }
                .stat-item {
                    text-align: center;
                }
                .stat-label {
                    font-size: 0.9rem;
                    color: #7f8c8d;
                    margin-bottom: 5px;
                }
                .stat-value {
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: #2c3e50;
                    word-break: break-all;
                }
                .keywords-list h4 {
                    margin-bottom: 15px;
                    color: #2c3e50;
                }
                .keywords-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 30px;
                }
                .keyword-tag {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: transform 0.3s ease;
                    position: relative;
                }
                .keyword-tag:hover {
                    transform: translateY(-3px);
                }
                .keyword-rank {
                    background: rgba(255, 255, 255, 0.2);
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.9rem;
                }
                .keyword-text {
                    flex: 1;
                    font-weight: 500;
                }
                .keyword-use-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                .keyword-use-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                .modal-footer {
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    gap: 15px;
                    justify-content: flex-end;
                }
                .no-data {
                    text-align: center;
                    padding: 20px;
                    color: #7f8c8d;
                    font-style: italic;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', modalStyles);
    }
}

function closeModal() {
    const modal = document.getElementById('keywordModal');
    if (modal) {
        modal.style.animation = 'modalSlideOut 0.3s ease forwards';
        setTimeout(() => modal.remove(), 300);
    }
}

function useSingleKeyword(keyword) {
    const keywordInput = document.createElement('input');
    keywordInput.type = 'hidden';
    keywordInput.name = 'selectedKeywords[]';
    keywordInput.value = keyword;
    document.querySelector('form').appendChild(keywordInput);
    
    showNotification(`✅ Added keyword: "${keyword}"`, 'success', 2000);
}

function useKeywordsForSession(count = 3) {
    closeModal();
    
    // Update keywords count in form
    const keywordsInput = document.getElementById('maxKeywords');
    if (keywordsInput) {
        keywordsInput.value = count;
        showNotification(`✅ Set to use ${count} keywords`, 'success');
    }
    
    // Start session
    setTimeout(() => {
        startPureOrganic();
    }, 1000);
}

// ==================== AUTO-LOOP FUNCTIONS ====================
async function startOrganicAutoLoop() {
    const targetUrl = document.getElementById('targetUrl')?.value;
    const interval = document.getElementById('organicInterval')?.value;
    const maxSessions = document.getElementById('organicMaxSessions')?.value;
    const autoLoopEnabled = document.getElementById('organicAutoLoop')?.checked;
    
    if (!autoLoopEnabled) {
        showNotification('❌ Please enable auto-loop first', 'error');
        return;
    }
    
    if (!targetUrl) {
        showNotification('❌ Please enter target URL', 'error');
        return;
    }
    
    if (interval < 15) {
        showNotification('❌ Minimum interval is 15 minutes for natural pattern', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auto-loop/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                interval: parseInt(interval) * 60 * 1000,
                maxSessions: parseInt(maxSessions),
                targetUrl: targetUrl,
                organicOnly: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(
                `✅ Organic auto-loop started! Interval: ${interval} minutes`,
                'success'
            );
            
            // Update UI
            updateAutoLoopUI(true, interval, maxSessions, targetUrl);
            checkLoopStatus();
        } else {
            showNotification(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Network error: ${error.message}`, 'error');
    }
}

function updateAutoLoopUI(enabled, interval, maxSessions, targetUrl) {
    const loopStatus = document.getElementById('autoLoopStatus');
    if (loopStatus) {
        loopStatus.innerHTML = `
            <div style="background: ${enabled ? '#d5f4e6' : '#fadbd8'}; padding: 20px; border-radius: 10px; border-left: 5px solid ${enabled ? '#27ae60' : '#e74c3c'};">
                <h3 style="margin: 0 0 10px 0; color: ${enabled ? '#27ae60' : '#e74c3c'};">
                    ${enabled ? '🔄 Auto-Loop Active' : '⏸️ Auto-Loop Paused'}
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">Status</div>
                        <div style="font-size: 1.2rem; font-weight: 700; color: ${enabled ? '#27ae60' : '#e74c3c'};">${enabled ? 'RUNNING' : 'STOPPED'}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">Interval</div>
                        <div style="font-size: 1.2rem; font-weight: 700; color: #2c3e50;">${interval} min</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">Max Sessions</div>
                        <div style="font-size: 1.2rem; font-weight: 700; color: #2c3e50;">${maxSessions}</div>
                    </div>
                </div>
                ${targetUrl ? `
                    <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 10px;">
                        <i class="fas fa-bullseye"></i> Target: ${targetUrl}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

async function stopAutoLoop() {
    if (!confirm('Are you sure you want to stop the organic auto-loop?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/auto-loop/stop', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('⏹️ Auto-loop stopped', 'success');
            updateAutoLoopUI(false);
            checkLoopStatus();
        }
    } catch (error) {
        showNotification(`❌ Network error: ${error.message}`, 'error');
    }
}

async function checkLoopStatus() {
    try {
        const response = await fetch('/api/auto-loop/status');
        const result = await response.json();
        
        if (result.success) {
            displayLoopStatus(result);
        }
    } catch (error) {
        console.error('Error checking loop status:', error);
    }
}

function displayLoopStatus(data) {
    const statusDiv = document.getElementById('autoLoopStatus');
    
    if (!statusDiv) return;
    
    const isEnabled = data.config?.enabled || false;
    const activeSessions = data.activeSessions || 0;
    const maxSessions = data.config?.maxSessions || 3;
    const interval = (data.config?.interval || 2700000) / 60000;
    const targetUrl = data.config?.targetUrl || '';
    
    const statusColor = isEnabled ? '#27ae60' : '#e74c3c';
    const statusText = isEnabled ? '🟢 RUNNING' : '🔴 STOPPED';
    const statusBg = isEnabled ? '#d5f4e6' : '#fadbd8';
    
    statusDiv.innerHTML = `
        <div style="background: ${statusBg}; padding: 20px; border-radius: 10px; border-left: 5px solid ${statusColor};">
            <h3 style="margin: 0 0 10px 0; color: ${statusColor};">
                ${isEnabled ? '🔄 Organic Auto-Loop Status' : '⏹️ Auto-Loop Status'}
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
                <div style="text-align: center;">
                    <div style="font-size: 0.9rem; color: #7f8c8d;">Status</div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: ${statusColor};">${statusText}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.9rem; color: #7f8c8d;">Active Sessions</div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: #2c3e50;">
                        ${activeSessions}/${maxSessions}
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.9rem; color: #7f8c8d;">Interval</div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: #2c3e50;">${interval} min</div>
                </div>
            </div>
            <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 10px;">
                <i class="fas fa-info-circle"></i> 
                ${isEnabled ? 
                    `Next session will start automatically in ${interval} minutes` : 
                    'Auto-loop is paused. Start manually or enable auto-loop.'
                }
                ${targetUrl ? `<br><i class="fas fa-bullseye"></i> Target: ${targetUrl}` : ''}
            </div>
        </div>
    `;
}

// ==================== SYSTEM FUNCTIONS ====================
async function testSystem() {
    const testBtn = document.querySelector('button[onclick="testSystem()"]');
    if (!testBtn) return;
    
    const originalText = testBtn.innerHTML;
    
    try {
        testBtn.classList.add('btn-loading');
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing System...';
        
        const response = await fetch('/api/test-puppeteer');
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ System test passed! Bot is ready.', 'success');
            
            // Show test details
            setTimeout(() => {
                showNotification(`🔧 Chrome path: ${result.chromePath}`, 'info', 5000);
            }, 1000);
        } else {
            showNotification(`❌ System test failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Test error: ${error.message}`, 'error');
    } finally {
        testBtn.classList.remove('btn-loading');
        testBtn.disabled = false;
        testBtn.innerHTML = originalText;
    }
}

async function loadSystemStatus() {
    try {
        const response = await fetch('/api/system/health');
        const result = await response.json();
        
        if (result.success) {
            displayEnhancedSystemStatus(result);
        }
    } catch (error) {
        console.error('Error loading system status:', error);
        displaySystemStatusError();
    }
}

function displayEnhancedSystemStatus(data) {
    const statusDiv = document.getElementById('systemStatus');
    
    if (!statusDiv) return;
    
    const uptime = Math.floor(data.system?.uptime || 0);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const sessions = data.sessions || {};
    const proxies = data.proxies || {};
    
    const memoryUsage = Math.round(data.system?.memory?.heapUsed?.replace('MB', '') || 0);
    const memoryStatus = memoryUsage > 500 ? 'critical' : memoryUsage > 300 ? 'warning' : 'good';
    
    const proxyStatus = proxies.total >= 20 ? 'good' : proxies.total >= 10 ? 'warning' : 'critical';
    const sessionStatus = sessions.running > 0 ? 'good' : sessions.total > 0 ? 'warning' : 'unknown';
    
    statusDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
            <div style="text-align: center;">
                <div style="font-size: 0.9rem; color: #7f8c8d;">Uptime</div>
                <div style="font-size: 1.3rem; font-weight: 700; color: #2c3e50;">
                    ${hours}h ${minutes}m
                </div>
                <small style="color: #7f8c8d;">Server running</small>
            </div>
            
            <div style="text-align: center;">
                <div style="font-size: 0.9rem; color: #7f8c8d;">Memory Usage</div>
                <div style="font-size: 1.3rem; font-weight: 700; color: ${memoryStatus === 'critical' ? '#e74c3c' : memoryStatus === 'warning' ? '#f39c12' : '#27ae60'};">
                    ${memoryUsage}MB
                </div>
                <small style="color: #7f8c8d;">
                    <span class="status-indicator status-${memoryStatus}"></span>
                    ${memoryStatus === 'critical' ? 'High' : memoryStatus === 'warning' ? 'Normal' : 'Good'}
                </small>
            </div>
            
            <div style="text-align: center;">
                <div style="font-size: 0.9rem; color: #7f8c8d;">Active Sessions</div>
                <div style="font-size: 1.3rem; font-weight: 700; color: #27ae60;">
                    ${sessions.running || 0}/${sessions.total || 0}
                </div>
                <small style="color: #7f8c8d;">
                    <span class="status-indicator status-${sessionStatus}"></span>
                    ${sessions.running > 0 ? 'Active' : 'Idle'}
                </small>
            </div>
            
            <div style="text-align: center;">
                <div style="font-size: 0.9rem; color: #7f8c8d;">Active Proxies</div>
                <div style="font-size: 1.3rem; font-weight: 700; color: #3498db;">
                    ${proxies.total || 0}
                </div>
                <small style="color: #7f8c8d;">
                    <span class="status-indicator status-${proxyStatus}"></span>
                    ${proxies.successRate ? proxies.successRate.toFixed(1) + '% success' : 'Checking...'}
                </small>
            </div>
        </div>
        
        <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 10px; text-align: center;">
            <div style="display: inline-flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
                <small style="color: #7f8c8d;">
                    <i class="fas fa-server"></i> Node ${data.system?.nodeVersion || 'N/A'}
                </small>
                <small style="color: #7f8c8d;">
                    <i class="fas fa-desktop"></i> ${data.system?.platform || 'N/A'}
                </small>
                <small style="color: #7f8c8d;">
                    <i class="fas fa-sync-alt"></i> Proxy refresh: 5m
                </small>
                <small style="color: #7f8c8d;">
                    <i class="fas fa-heartbeat"></i> Health checks: ON
                </small>
            </div>
            
            ${data.autoLoop?.enabled ? `
                <div style="margin-top: 10px; padding: 10px; background: #d5f4e6; border-radius: 5px;">
                    <small>
                        <i class="fas fa-sync-alt"></i> Auto-loop: <strong>ACTIVE</strong> 
                        (${data.autoLoop.interval/60000} min intervals)
                    </small>
                </div>
            ` : ''}
        </div>
    `;
}

function displaySystemStatusError() {
    const statusDiv = document.getElementById('systemStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div style="color: #e74c3c; text-align: center; padding: 20px; background: #fadbd8; border-radius: 10px;">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <div style="margin-top: 10px; font-weight: bold;">Cannot connect to server</div>
                <div style="margin-top: 5px; font-size: 0.9rem;">
                    Check if the server is running and accessible
                </div>
                <button onclick="retrySystemStatus()" 
                        style="margin-top: 15px; padding: 8px 20px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-redo"></i> Retry Connection
                </button>
            </div>
        `;
    }
}

function retrySystemStatus() {
    loadSystemStatus();
    showNotification('🔄 Retrying connection...', 'info');
}

function refreshStatus() {
    loadSystemStatus();
    updateLiveProxyStats();
    checkLoopStatus();
    showNotification('🔄 Status refreshed', 'info');
}

function refreshAllData() {
    loadSystemStatus();
    updateLiveProxyStats();
    checkLoopStatus();
    showNotification('🔄 All data refreshed', 'success');
}

// ==================== NAVIGATION FUNCTIONS ====================
function goToMonitoring() {
    // Save current settings to localStorage
    const settings = {
        targetUrl: document.getElementById('targetUrl')?.value,
        searchEngine: document.getElementById('searchEngine')?.value,
        proxyType: document.querySelector('input[name="proxyType"]:checked')?.value,
        maxKeywords: document.getElementById('maxKeywords')?.value,
        deviceType: document.getElementById('deviceType')?.value
    };
    
    localStorage.setItem('trafficBotSettings', JSON.stringify(settings));
    window.location.href = '/monitoring';
}

async function clearAllSessions() {
    if (!confirm('Are you sure you want to stop and clear ALL sessions?\nThis action cannot be undone.')) {
        return;
    }
    
    const clearBtn = document.querySelector('button[onclick="clearAllSessions()"]');
    const originalText = clearBtn?.innerHTML;
    
    try {
        if (clearBtn) {
            clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
            clearBtn.disabled = true;
        }
        
        const response = await fetch('/api/clear-sessions', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('🧹 All sessions cleared!', 'success');
            refreshStatus();
        } else {
            showNotification(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Network error: ${error.message}`, 'error');
    } finally {
        if (clearBtn) {
            clearBtn.innerHTML = originalText;
            clearBtn.disabled = false;
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => {
        notif.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notif.remove(), 300);
    });
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 1.2rem;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <div>${message}</div>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#27ae60' : 
                     type === 'error' ? '#e74c3c' : 
                     type === 'warning' ? '#f39c12' : 
                     type === 'proxy-update' ? 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)' : 
                     '#3498db'};
        color: white;
        border-radius: 10px;
        z-index: 10000;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        border-left: 5px solid ${type === 'success' ? '#2ecc71' : 
                               type === 'error' ? '#c0392b' : 
                               type === 'warning' ? '#e67e22' : 
                               '#2980b9'};
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // Add close button for longer notifications
    if (duration > 10000) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 8px;
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.onclick = () => notification.remove();
        notification.appendChild(closeBtn);
    }
    
    // Add to container
    const container = document.getElementById('notificationContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationContainer';
        newContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
        document.body.appendChild(newContainer);
        newContainer.appendChild(notification);
    } else {
        container.appendChild(notification);
    }
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
    
    return notification;
}

// Animation styles
const animationStyles = `
    <style>
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes modalSlideOut {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-50px); opacity: 0; }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
        
        .slide-in {
            animation: slideIn 0.5s ease;
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    </style>
`;

// Add animation styles to head
if (!document.querySelector('#animationStyles')) {
    document.head.insertAdjacentHTML('beforeend', animationStyles);
}

// ==================== INITIAL LOAD ENHANCEMENTS ====================
// Load saved settings
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    const savedSettings = localStorage.getItem('trafficBotSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.targetUrl) document.getElementById('targetUrl').value = settings.targetUrl;
            if (settings.searchEngine) document.getElementById('searchEngine').value = settings.searchEngine;
            if (settings.proxyType) {
                const radio = document.querySelector(`input[value="${settings.proxyType}"]`);
                if (radio) radio.checked = true;
            }
            if (settings.maxKeywords) document.getElementById('maxKeywords').value = settings.maxKeywords;
            if (settings.deviceType) document.getElementById('deviceType').value = settings.deviceType;
        } catch (e) {
            console.log('Could not load saved settings');
        }
    }
    
    // Add proxy type info tooltips
    addProxyTooltips();
});

function addProxyTooltips() {
    const proxyCards = document.querySelectorAll('.proxy-card');
    const tooltips = {
        'fresh': '🆕 Fresh proxies from multiple sources, auto-refresh every 5 minutes. Best for speed.',
        'web': '🌐 Web proxy gateways, stable but slower. Good backup option.',
        'vpn': '🛡️ VPN browser extensions, most reliable but limited quantity.'
    };
    
    proxyCards.forEach(card => {
        const type = card.querySelector('h3').textContent.toLowerCase().replace(' proxy', '');
        card.title = tooltips[type] || '';
        
        // Add info icon
        const infoIcon = document.createElement('i');
        infoIcon.className = 'fas fa-info-circle';
        infoIcon.style.cssText = 'position: absolute; top: 10px; right: 10px; color: #3498db; font-size: 0.9rem; opacity: 0.7;';
        card.appendChild(infoIcon);
    });
}

// Performance monitoring
let performanceLog = [];
function logPerformance(operation, duration) {
    performanceLog.push({ operation, duration, timestamp: Date.now() });
    
    // Keep only last 100 entries
    if (performanceLog.length > 100) {
        performanceLog.shift();
    }
    
    // Log slow operations
    if (duration > 1000) {
        console.warn(`Slow operation: ${operation} took ${duration}ms`);
    }
}

// Export for debugging
window.trafficBotDebug = {
    getPerformanceLog: () => performanceLog,
    clearPerformanceLog: () => performanceLog = [],
    forceRefresh: refreshAllData,
    testProxy: forceRefreshProxies,
    getSettings: () => ({
        targetUrl: document.getElementById('targetUrl')?.value,
        proxyType: document.querySelector('input[name="proxyType"]:checked')?.value
    })
};

console.log('🚀 Pure Organic Traffic Bot Frontend initialized successfully');