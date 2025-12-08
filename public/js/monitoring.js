// ==================== MAIN MONITORING SCRIPT ====================

// Global variables
let selectedProxyType = 'vpn';
let autoRefresh = true;
let refreshInterval;
let lastProxyData = null;
let googleAccountsData = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Monitoring dashboard initialized');
    
    refreshAllData();
    startAutoRefresh();
    
    // Set up form submission
    document.getElementById('sessionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        startSession();
    });
    
    // Set up batch form submission
    document.getElementById('batchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        startBatch();
    });
    
    // Set up Google account form submission
    document.getElementById('addGoogleAccountForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        addGoogleAccount();
    });
    
    // Initialize keyword mode toggles
    toggleKeywordInput();
    document.getElementById('batchKeywordMode').addEventListener('change', function() {
        toggleBatchKeywords();
    });
    
    // Toggle 2FA section
    document.getElementById('has2FA')?.addEventListener('change', function() {
        const section = document.getElementById('backupCodesSection');
        if (section) {
            section.style.display = this.checked ? 'block' : 'none';
        }
    });
    
    // Initialize advanced features
    setTimeout(() => {
        addExportButton();
        initializeCountryFlags();
    }, 2000);
    
    // Global error handling
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Global error:', {msg, url, lineNo, columnNo, error});
        return false;
    };
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });
});

// ==================== SYSTEM FUNCTIONS ====================

// Refresh all data
async function refreshAllData() {
    const refreshBtn = document.querySelector('#refreshIcon');
    refreshBtn.textContent = '🔄';
    
    try {
        await Promise.all([
            fetchSystemHealth(),
            fetchProxyStatus(),
            fetchSessions(),
            fetchBatchStatus()
        ]);
        
        refreshBtn.textContent = '✅';
        document.getElementById('updateTime').textContent = new Date().toLocaleTimeString();
        
        // Reset icon after 2 seconds
        setTimeout(() => {
            refreshBtn.textContent = '🔄';
        }, 2000);
        
    } catch (error) {
        console.error('Refresh error:', error);
        refreshBtn.textContent = '❌';
    }
}

// Fetch system health
async function fetchSystemHealth() {
    try {
        const response = await fetch('/api/system/health');
        const data = await response.json();
        
        if (data.success) {
            // Update system stats
            document.getElementById('activeSessions').textContent = data.sessions.running;
            document.getElementById('totalProxies').textContent = data.proxies.total;
            document.getElementById('vpnCount').textContent = data.proxies.vpn;
            document.getElementById('successRate').textContent = `${data.proxies.successRate?.toFixed(1) || 0}%`;
            
            // Update health bar
            const healthPercent = Math.min(100, 
                (data.proxies.total / 50) * 100 * 0.6 + 
                (data.sessions.running > 0 ? 40 : 0)
            );
            document.getElementById('healthBar').style.width = `${healthPercent}%`;
            
            // Update server status
            const statusBadge = document.getElementById('serverStatus');
            statusBadge.className = 'status-badge ' + 
                (data.sessions.running > 0 ? 'status-online' : 'status-offline');
            statusBadge.textContent = data.sessions.running > 0 ? '✅ ACTIVE' : '⏸️ IDLE';
        }
    } catch (error) {
        console.error('Health fetch error:', error);
    }
}

// Fetch proxy status
async function fetchProxyStatus() {
    try {
        const response = await fetch('/api/proxies/status');
        const data = await response.json();
        
        // Store proxy data globally
        lastProxyData = data;
        
        if (data.success) {
            // Update proxy stats
            const statsHtml = `
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-label">Fresh</div>
                        <div class="stat-value">${data.stats?.fresh?.working || data.freshProxies?.length || 0}</div>
                        <small>${data.stats?.fresh?.total || data.freshProxies?.length || 0} total</small>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">VPN</div>
                        <div class="stat-value">${data.stats?.vpn?.working || data.vpnProxies?.length || 0}</div>
                        <small>${data.stats?.vpn?.total || data.vpnProxies?.length || 0} total</small>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Web</div>
                        <div class="stat-value">${data.stats?.web?.working || data.webProxies?.length || 0}</div>
                        <small>${data.stats?.web?.total || data.webProxies?.length || 0} total</small>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Last Update</div>
                        <div class="stat-value" style="font-size: 1.2rem;">
                            ${data.stats?.lastUpdate ? formatTimeAgo(data.stats.lastUpdate) : 'Never'}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('proxyStats').innerHTML = statsHtml;
            
            // Update VPN details
            updateVPNDetails(data.vpnProxies);
            
            // Update fastest proxies
            updateFastestProxies(data.stats?.fresh?.fastest);
            
            // Update proxy text areas if modal is open
            if (document.getElementById('proxyDetailsModal').style.display === 'flex') {
                updateProxyTextAreas();
            }
            if (document.getElementById('proxyListModal').style.display === 'flex') {
                updateAllProxiesText();
            }
        }
    } catch (error) {
        console.error('Proxy fetch error:', error);
    }
}

// Fetch active sessions
async function fetchSessions() {
    try {
        const response = await fetch('/api/all-sessions');
        const data = await response.json();
        
        if (data.success) {
            updateSessionsTable(data.sessions);
        }
    } catch (error) {
        console.error('Sessions fetch error:', error);
    }
}

// ==================== GOOGLE ACCOUNTS FUNCTIONS ====================

// Show Google accounts modal
function showGoogleAccountsModal() {
    document.getElementById('googleAccountsModal').style.display = 'flex';
    switchGoogleTab('accounts');
    loadGoogleAccounts();
}

// Close Google accounts modal
function closeGoogleAccountsModal() {
    document.getElementById('googleAccountsModal').style.display = 'none';
}

// Switch Google tab
function switchGoogleTab(tab) {
    // Remove active class from all tabs
    document.querySelectorAll('#googleAccountsModal .proxy-tab').forEach(t => {
        t.classList.remove('active');
    });
    
    // Remove active class from all content
    document.querySelectorAll('#googleAccountsModal .proxy-tab-content').forEach(c => {
        c.classList.remove('active');
    });
    
    // Add active class to clicked tab
    event.target.classList.add('active');
    
    // Show selected content
    const contentId = 'google' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab';
    document.getElementById(contentId).classList.add('active');
    
    // Load data if needed
    if (tab === 'accounts') {
        loadGoogleAccounts();
    } else if (tab === 'templates') {
        loadTemplates();
    }
}

// Load Google accounts
async function loadGoogleAccounts() {
    try {
        const response = await fetch('/api/google-accounts');
        const data = await response.json();
        
        if (data.success) {
            googleAccountsData = data.accounts;
            renderGoogleAccountsTable(data.accounts);
            updateGoogleAccountSelection(data.accounts);
        } else {
            document.getElementById('googleAccountsBody').innerHTML = 
                '<tr><td colspan="5">Error: ' + (data.error || 'Failed to load') + '</td></tr>';
        }
    } catch (error) {
        console.error('Failed to load Google accounts:', error);
        document.getElementById('googleAccountsBody').innerHTML = 
            '<tr><td colspan="5">Error connecting to server. Please check console.</td></tr>';
    }
}

// Render Google accounts table
function renderGoogleAccountsTable(accounts) {
    let html = '';
    
    if (!accounts || accounts.length === 0) {
        html = '<tr><td colspan="5">No Google accounts added yet.</td></tr>';
    } else {
        accounts.forEach(account => {
            const statusColor = account.status === 'active' ? '#06d6a0' : 
                              account.status === 'suspicious' ? '#ffd166' : '#ef476f';
            
            const lastUsed = account.lastUsed ? 
                formatTimeAgo(account.lastUsed) : 'Never';
            
            const successRate = account.successRate ? 
                `${Math.round(account.successRate)}%` : 'N/A';
            
            // Tentukan ID account (gunakan email jika tidak ada ID)
            const accountId = account.id || account.email;
            
            html += `
                <tr>
                    <td>
                        <strong>${account.email}</strong><br>
                        <small style="color: rgba(255,255,255,0.6);">
                            ${account.accountType || 'personal'} • Used ${account.usageCount || 0} times
                        </small>
                    </td>
                    <td>
                        <span style="color: ${statusColor}; font-weight: bold;">
                            ${account.status ? account.status.toUpperCase() : 'UNKNOWN'}
                        </span><br>
                        <small>${successRate} success rate</small>
                    </td>
                    <td>${account.usageCount || 0}</td>
                    <td>${lastUsed}</td>
                    <td>
                        <button onclick="testAccount('${accountId}')" 
                                class="btn btn-sm btn-info" style="margin: 2px; padding: 4px 8px;">
                            🧪 Test
                        </button>
                        <button onclick="deleteAccount('${accountId}')" 
                                class="btn btn-sm btn-danger" style="margin: 2px; padding: 4px 8px;">
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    document.getElementById('googleAccountsBody').innerHTML = html;
}

// Update Google account selection in session modal
function updateGoogleAccountSelection(accounts) {
    const select = document.getElementById('googleAccount');
    const useGoogleCheckbox = document.getElementById('useGoogleAccount');
    
    if (!select || !useGoogleCheckbox) return;
    
    // Clear existing options except first two
    while (select.options.length > 2) {
        select.remove(2);
    }
    
    // Add active accounts
    const activeAccounts = accounts.filter(acc => 
        acc.status === 'active' && !acc.has2FA
    );
    
    if (activeAccounts.length > 0) {
        activeAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id || account.email;
            option.textContent = `${account.email.substring(0, 25)}... (${account.status})`;
            select.appendChild(option);
        });
        useGoogleCheckbox.disabled = false;
    } else {
        useGoogleCheckbox.disabled = true;
        useGoogleCheckbox.checked = false;
        toggleGoogleAccountSelection();
    }
}

// Add Google account
async function addGoogleAccount() {
    const email = document.getElementById('googleEmail').value;
    const password = document.getElementById('googlePassword').value;
    const accountType = document.getElementById('accountType').value;
    const has2FA = document.getElementById('has2FA').checked;
    const backupCodes = document.getElementById('backupCodes').value;
    
    const submitBtn = document.querySelector('#addGoogleAccountForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loader"></span> Adding...';
    
    try {
        const response = await fetch('/api/google-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                accountType,
                has2FA,
                backupCodes: backupCodes ? backupCodes.split(',').map(code => code.trim()) : []
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Account added successfully!\nEmail: ${data.account.email}`);
            switchGoogleTab('accounts');
            loadGoogleAccounts();
            document.getElementById('addGoogleAccountForm').reset();
            document.getElementById('backupCodesSection').style.display = 'none';
        } else {
            alert(`❌ Error: ${data.error}`);
        }
    } catch (error) {
        alert(`❌ Network error: ${error.message}`);
    } finally {
        submitBtn.innerHTML = originalText;
    }
}

// Test Google account
async function testAccount(accountId) {
    if (!confirm('Test this Google account login?')) return;
    
    try {
        const response = await fetch(`/api/google-accounts/test/${accountId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Test result: ${data.testResult || 'Success'}`);
            if (data.requires2FA) {
                alert('⚠️ This account requires 2FA. Consider disabling 2FA or adding backup codes.');
            }
            loadGoogleAccounts(); // Refresh list
        } else {
            alert(`❌ Test failed: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        alert(`❌ Network error: ${error.message}`);
    }
}

// Delete Google account
async function deleteAccount(accountId) {
    if (!confirm('Delete this Google account? This cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/google-accounts/${accountId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Account deleted');
            loadGoogleAccounts();
        } else {
            alert(`❌ Failed to delete account: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        alert(`❌ Network error: ${error.message}`);
    }
}

// Test all accounts
async function testAllAccounts() {
    if (!confirm('Test ALL Google accounts? This may take a while.')) return;
    
    try {
        const response = await fetch('/api/google-accounts/test-all', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            let message = 'Test Results:\n\n';
            data.results.forEach(result => {
                message += `${result.email}: ${result.status}\n`;
            });
            alert(message);
            loadGoogleAccounts();
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// Refresh Google accounts
async function refreshGoogleAccounts() {
    await loadGoogleAccounts();
    alert('✅ Google accounts refreshed');
}

// Toggle Google account selection
function toggleGoogleAccountSelection() {
    const useGoogle = document.getElementById('useGoogleAccount');
    const selectionDiv = document.getElementById('googleAccountSelection');
    
    if (!useGoogle || !selectionDiv) return;
    
    selectionDiv.style.display = useGoogle.checked ? 'block' : 'none';
    
    if (useGoogle.checked) {
        loadGoogleAccounts();
    }
}

// Load templates
async function loadTemplates() {
    try {
        const response = await fetch('/api/google-accounts/templates');
        const data = await response.json();
        
        let html = '';
        if (data.success && data.templates.length > 0) {
            html = '<ul>';
            data.templates.forEach(template => {
                html += `<li><strong>${template}</strong></li>`;
            });
            html += '</ul>';
        } else {
            html = 'No templates created yet.';
        }
        
        document.getElementById('templatesList').innerHTML = html;
    } catch (error) {
        document.getElementById('templatesList').innerHTML = 'Error loading templates';
    }
}

// Create Chrome template
async function createChromeTemplate() {
    const templateName = prompt('Enter template name:', `template_${Date.now()}`);
    if (!templateName) return;
    
    const statusDiv = document.getElementById('templateStatus');
    statusDiv.innerHTML = '<span class="loader"></span> Creating template...';
    statusDiv.style.color = '#ffd166';
    
    try {
        const response = await fetch(`/api/google-accounts/templates/${templateName}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusDiv.innerHTML = `
                ✅ Template created!<br>
                <small style="color: rgba(255,255,255,0.7);">
                    Path: ${data.path}<br>
                    ${data.instructions}
                </small>
            `;
            statusDiv.style.color = '#06d6a0';
            loadTemplates();
        } else {
            statusDiv.innerHTML = `❌ Error: ${data.error}`;
            statusDiv.style.color = '#ef476f';
        }
    } catch (error) {
        statusDiv.innerHTML = `❌ Network error: ${error.message}`;
        statusDiv.style.color = '#ef476f';
    }
}

// ==================== SESSION FUNCTIONS ====================

// Start organic session
async function startSession() {
    const targetUrl = document.getElementById('targetUrl').value;
    const proxyType = document.getElementById('proxyType').value;
    const deviceType = document.getElementById('deviceType').value;
    const searchEngine = document.getElementById('searchEngine').value;
    const keywordMode = document.getElementById('keywordMode').value;
    const customKeywords = document.getElementById('customKeywords').value;
    const useGoogleAccount = document.getElementById('useGoogleAccount').checked;
    const googleAccount = useGoogleAccount ? document.getElementById('googleAccount').value : 'none';
    
    // Show loading
    const submitBtn = document.querySelector('#sessionForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loader"></span> Starting...';
    
    try {
        let keywordsArray = [];
        if (keywordMode === 'manual' && customKeywords.trim()) {
            keywordsArray = customKeywords.split(',')
                .map(k => k.trim())
                .filter(k => k.length > 2);
        }
        
        const response = await fetch('/api/start-organic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetUrl,
                proxyType,
                deviceType,
                searchEngine: searchEngine === 'both' ? (Math.random() > 0.5 ? 'google' : 'bing') : searchEngine,
                keywordMode,
                customKeywords: keywordsArray,
                googleAccount,
                useProfile: true,
                maxKeywords: 5,
                enableSubUrl: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Session started!\nSession ID: ${result.sessionId.substring(0, 12)}...\nGoogle Account: ${useGoogleAccount ? 'Yes' : 'No'}`);
            closeModal();
            refreshAllData();
        } else {
            alert(`❌ Error: ${result.error}`);
        }
    } catch (error) {
        alert(`❌ Network error: ${error.message}`);
    } finally {
        submitBtn.innerHTML = originalText;
    }
}

// Start batch sessions
async function startBatch() {
    const targetUrl = document.getElementById('batchTargetUrl').value;
    const totalSessions = parseInt(document.getElementById('totalSessions').value);
    const concurrentSessions = parseInt(document.getElementById('concurrentSessions').value);
    const proxyType = document.getElementById('batchProxyType').value;
    const deviceType = document.getElementById('batchDeviceType').value;
    const keywordMode = document.getElementById('batchKeywordMode').value;
    
    let customKeywords = [];
    if (keywordMode === 'manual') {
        const keywordsText = document.getElementById('batchCustomKeywords').value;
        customKeywords = keywordsText.split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
    }
    
    // Validate input
    if (totalSessions > 1000) {
        alert('❌ Maximum 1000 sessions per batch');
        return;
    }
    
    if (concurrentSessions > 5) {
        alert('❌ Maximum 5 concurrent sessions');
        return;
    }
    
    const submitBtn = document.querySelector('#batchForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loader"></span> Creating batch...';
    
    try {
        const response = await fetch('/api/batch/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetUrl,
                totalSessions,
                concurrentSessions,
                proxyType,
                deviceType,
                searchEngine: 'google',
                keywordMode,
                customKeywords,
                maxKeywords: 3
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Batch created!\nBatch ID: ${data.batchId}\nTotal Sessions: ${totalSessions}\nConcurrent: ${concurrentSessions}`);
            
            // Start the batch immediately
            const startResponse = await fetch(`/api/batch/start/${data.batchId}`, {
                method: 'POST'
            });
            
            const startData = await startResponse.json();
            
            if (startData.success) {
                alert('🚀 Batch started successfully! Sessions will run in background.');
                closeBatchModal();
                refreshAllData();
            } else {
                alert(`❌ Failed to start batch: ${startData.error}`);
            }
        } else {
            alert(`❌ Error: ${data.error}`);
        }
    } catch (error) {
        alert(`❌ Network error: ${error.message}`);
    } finally {
        submitBtn.innerHTML = originalText;
    }
}

// ==================== MODAL FUNCTIONS ====================

// Show session modal
function showSessionModal() {
    document.getElementById('sessionModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('sessionModal').style.display = 'none';
}

// Show batch modal
function showBatchModal() {
    document.getElementById('batchModal').style.display = 'flex';
}

// Close batch modal
function closeBatchModal() {
    document.getElementById('batchModal').style.display = 'none';
}

// Show proxy details modal
function showProxyDetailsModal() {
    if (lastProxyData) {
        updateProxyTextAreas();
        document.getElementById('proxyDetailsModal').style.display = 'flex';
    } else {
        alert('No proxy data available. Please refresh first.');
        refreshAllData();
    }
}

// Close proxy details modal
function closeProxyDetailsModal() {
    document.getElementById('proxyDetailsModal').style.display = 'none';
}

// Show proxy list modal
function showProxyListModal() {
    if (lastProxyData) {
        updateAllProxiesText();
        document.getElementById('proxyListModal').style.display = 'flex';
    } else {
        alert('No proxy data available. Please refresh first.');
        refreshAllData();
    }
}

// Close proxy list modal
function closeProxyListModal() {
    document.getElementById('proxyListModal').style.display = 'none';
}

// Toggle keyword input for single session
function toggleKeywordInput() {
    const mode = document.getElementById('keywordMode').value;
    const section = document.getElementById('manualKeywordsSection');
    section.style.display = mode === 'manual' ? 'block' : 'none';
}

// Toggle keyword input for batch
function toggleBatchKeywords() {
    const mode = document.getElementById('batchKeywordMode').value;
    const section = document.getElementById('batchKeywordsSection');
    section.style.display = mode === 'manual' ? 'block' : 'none';
}

// Switch between proxy tabs
function switchProxyTab(tab) {
    // Remove active class from all tabs
    document.querySelectorAll('.proxy-tab').forEach(t => {
        t.classList.remove('active');
    });
    
    // Remove active class from all content
    document.querySelectorAll('.proxy-tab-content').forEach(c => {
        c.classList.remove('active');
    });
    
    // Add active class to selected tab
    event.target.classList.add('active');
    
    // Show selected content
    document.getElementById(tab + 'ProxyContent').classList.add('active');
}

// ==================== PROXY FUNCTIONS ====================

// Update proxy text areas with current data
function updateProxyTextAreas() {
    if (!lastProxyData) return;
    
    // Format fresh proxies
    let freshText = '';
    if (lastProxyData.freshProxies && lastProxyData.freshProxies.length > 0) {
        lastProxyData.freshProxies.forEach((proxy, index) => {
            // HANYA tampilkan host:port saja
            freshText += `${proxy.host}:${proxy.port}`;
            freshText += '\n';
        });
    } else {
        freshText = 'No fresh proxies available. Click "Refresh Proxies" to discover fresh proxies.\n';
    }
    document.getElementById('freshProxyText').value = freshText;
    
    // Format VPN proxies - dengan info lengkap
    let vpnText = '';
    if (lastProxyData.vpnProxies && lastProxyData.vpnProxies.length > 0) {
        lastProxyData.vpnProxies.forEach((proxy, index) => {
            vpnText += `${proxy.host}:${proxy.port}`;
            if (proxy.country) vpnText += ` | ${proxy.country}`;
            if (proxy.type) vpnText += ` | ${proxy.type}`;
            if (proxy.name) vpnText += ` | ${proxy.name}`;
            vpnText += '\n';
        });
    } else {
        vpnText = 'No VPN proxies available. Click "Refresh Proxies" to discover VPN endpoints.\n';
    }
    document.getElementById('vpnProxyText').value = vpnText;
    
    // Format web proxies - dengan info lengkap
    let webText = '';
    if (lastProxyData.webProxies && lastProxyData.webProxies.length > 0) {
        lastProxyData.webProxies.forEach((proxy, index) => {
            webText += `${proxy.host}:${proxy.port}`;
            if (proxy.type) webText += ` | ${proxy.type}`;
            if (proxy.name) webText += ` | ${proxy.name}`;
            webText += '\n';
        });
    } else {
        webText = 'No web proxies available. Click "Refresh Proxies" to discover web proxies.\n';
    }
    document.getElementById('webProxyText').value = webText;
    
    // Format all proxies
    let allText = '=== FRESH PROXIES (IP:PORT ONLY) ===\n';
    allText += freshText + '\n';
    allText += '=== VPN PROXIES ===\n';
    allText += vpnText + '\n';
    allText += '=== WEB PROXIES ===\n';
    allText += webText;
    document.getElementById('allProxyText').value = allText;
}

// Update all proxies text for simple modal
function updateAllProxiesText() {
    if (!lastProxyData) return;
    
    let allText = '';
    
    // Add fresh proxies - HANYA IP:PORT
    if (lastProxyData.freshProxies && lastProxyData.freshProxies.length > 0) {
        allText += `=== FRESH PROXIES (${lastProxyData.freshProxies.length}) ===\n`;
        lastProxyData.freshProxies.forEach((proxy, index) => {
            allText += `${proxy.host}:${proxy.port}\n`;
        });
        allText += '\n';
    }
    
    // Add VPN proxies
    if (lastProxyData.vpnProxies && lastProxyData.vpnProxies.length > 0) {
        allText += `=== VPN PROXIES (${lastProxyData.vpnProxies.length}) ===\n`;
        lastProxyData.vpnProxies.forEach((proxy, index) => {
            allText += `${proxy.host}:${proxy.port}`;
            if (proxy.country) allText += ` # ${proxy.country}`;
            allText += '\n';
        });
        allText += '\n';
    }
    
    // Add web proxies
    if (lastProxyData.webProxies && lastProxyData.webProxies.length > 0) {
        allText += `=== WEB PROXIES (${lastProxyData.webProxies.length}) ===\n`;
        lastProxyData.webProxies.forEach((proxy, index) => {
            allText += `${proxy.host}:${proxy.port}\n`;
        });
    }
    
    if (allText === '') {
        allText = 'No proxies available. Click "Refresh Proxies" to discover proxies.';
    }
    
    document.getElementById('allProxiesText').value = allText;
}

// Update VPN details
function updateVPNDetails(vpnList) {
    if (!vpnList || vpnList.length === 0) {
        document.getElementById('vpnDetails').innerHTML = `
            <div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">
                No VPNs available. Click "Refresh Proxies" to discover VPN endpoints.
            </div>
        `;
        return;
    }
    
    let html = '<table>';
    html += '<thead><tr><th>VPN Name</th><th>Location</th><th>Type</th><th>Status</th></tr></thead><tbody>';
    
    vpnList.slice(0, 8).forEach(vpn => {
        const countryCode = vpn.country ? vpn.country.toLowerCase() : 'unknown';
        const countryClass = getCountryClass(countryCode);
        const isPremium = vpn.isPremium ? '⭐' : '';
        
        html += `
            <tr>
                <td>${isPremium} ${vpn.name || 'Unknown'}</td>
                <td>
                    ${countryClass !== 'unknown' ? `<span class="country-flag ${countryClass}"></span>` : ''}
                    ${vpn.country || 'Unknown'}
                </td>
                <td><span class="proxy-badge badge-vpn">${vpn.type || 'N/A'}</span></td>
                <td>${vpn.working ? '✅' : '❌'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    
    // Add VPN by country stats
    const countryStats = {};
    vpnList.forEach(vpn => {
        const country = vpn.country || 'Unknown';
        countryStats[country] = (countryStats[country] || 0) + 1;
    });
    
    if (Object.keys(countryStats).length > 0) {
        html += '<div style="margin-top: 15px; font-size: 12px; color: rgba(255,255,255,0.7);">';
        html += '<strong>VPN by Country:</strong> ';
        html += Object.entries(countryStats)
            .map(([country, count]) => `${country}: ${count}`)
            .join(' • ');
        html += '</div>';
    }
    
    document.getElementById('vpnDetails').innerHTML = html;
}

// Update fastest proxies
function updateFastestProxies(proxies) {
    if (!proxies || proxies.length === 0) {
        document.getElementById('fastestProxies').innerHTML = `
            <div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">
                No proxies available yet.
            </div>
        `;
        return;
    }
    
    let html = '<table>';
    html += '<thead><tr><th>#</th><th>Proxy (IP:Port)</th><th>Status</th></tr></thead><tbody>';
    
    proxies.slice(0, 10).forEach((proxy, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td style="font-family: monospace;">${proxy.host}:${proxy.port}</td>
                <td><span style="color: ${proxy.working ? '#06d6a0' : '#ef476f'}">${proxy.working ? '✅ Working' : '❌ Failed'}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('fastestProxies').innerHTML = html;
}

// Copy proxy text to clipboard
function copyProxyText(type) {
    const textareaId = type + 'ProxyText';
    const textarea = document.getElementById(textareaId);
    textarea.select();
    document.execCommand('copy');
    alert(`✅ ${type.toUpperCase()} proxies copied to clipboard!`);
}

// Copy all proxies
function copyAllProxies() {
    const textarea = document.getElementById('allProxiesText');
    textarea.select();
    document.execCommand('copy');
    alert('✅ All proxies copied to clipboard!');
}

// Copy fastest proxies
function copyFastestProxies() {
    if (!lastProxyData || !lastProxyData.stats || !lastProxyData.stats.fresh || !lastProxyData.stats.fresh.fastest) {
        alert('No fastest proxies data available.');
        return;
    }
    
    let text = '=== FASTEST PROXIES (IP:PORT ONLY) ===\n';
    lastProxyData.stats.fresh.fastest.forEach((proxy, index) => {
        text += `${proxy.host}:${proxy.port}\n`;
    });
    
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert('✅ Fastest proxies copied to clipboard!');
}

// Download proxies as TXT file
function downloadProxies(type) {
    const textareaId = type + 'ProxyText';
    const textarea = document.getElementById(textareaId);
    const content = textarea.value;
    
    if (!content || content.includes('No proxies available')) {
        alert('No proxies to download.');
        return;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_proxies_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`✅ ${type.toUpperCase()} proxies downloaded as TXT file!`);
}

// Download all proxies
function downloadAllProxies() {
    const textarea = document.getElementById('allProxiesText');
    const content = textarea.value;
    
    if (!content || content.includes('No proxies available')) {
        alert('No proxies to download.');
        return;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_proxies_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ All proxies downloaded as TXT file!');
}

// Refresh proxies
async function refreshProxies() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Refreshing...';
    
    try {
        const response = await fetch('/api/proxies/refresh', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Proxies refreshed successfully!');
            refreshAllData();
        } else {
            alert(`❌ Failed to refresh proxies: ${data.error}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    } finally {
        btn.innerHTML = originalText;
    }
}

// Refresh proxies from modal
function refreshProxiesFromModal() {
    closeProxyDetailsModal();
    refreshProxies();
}

// ==================== SESSION MANAGEMENT ====================

// Update sessions table
function updateSessionsTable(sessions) {
    if (!sessions || sessions.length === 0) {
        document.getElementById('sessionsTable').innerHTML = `
            <div style="color: rgba(255,255,255,0.6); text-align: center; padding: 40px;">
                No active sessions. Click "Start Single Session" to begin.
            </div>
        `;
        return;
    }
    
    let html = '<table>';
    html += '<thead><tr><th>Session ID</th><th>Target</th><th>Proxy Type</th><th>Status</th><th>Duration</th><th>Started</th><th>Actions</th></tr></thead><tbody>';
    
    sessions.slice(0, 10).forEach(session => {
        const duration = session.startTime ? 
            Math.round((new Date() - new Date(session.startTime)) / 1000) : 0;
        const durationStr = duration > 60 ? 
            `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`;
        
        const proxyType = session.config?.proxyType || 'fresh';
        const badgeClass = proxyType === 'vpn' ? 'badge-vpn' :
                         proxyType === 'web' ? 'badge-web' :
                         proxyType === 'direct' ? 'badge-direct' : 'badge-fresh';
        
        // Check if this is a batch session
        const sessionType = session.isBatch ? '📦 ' : '';
        
        html += `
            <tr>
                <td style="font-family: monospace; font-size: 12px;">${sessionType}${session.id.substring(0, 12)}...</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                    ${session.config?.targetUrl || 'N/A'}
                </td>
                <td><span class="proxy-badge ${badgeClass}">${proxyType}</span></td>
                <td>
                    <span style="color: ${session.status === 'running' ? '#06d6a0' : '#ef476f'}">
                        ${session.status === 'running' ? '▶ Running' : '⏹ Stopped'}
                    </span>
                </td>
                <td>${durationStr}</td>
                <td>${new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>
                    <button onclick="stopSession('${session.id}')" 
                            style="background: #ef476f; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                        Stop
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('sessionsTable').innerHTML = html;
}

// Stop specific session
async function stopSession(sessionId) {
    if (!confirm('Stop this session?')) return;
    
    try {
        const response = await fetch(`/api/stop-session/${sessionId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Session stopped');
            refreshAllData();
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// Stop all sessions
async function stopAllSessions() {
    if (!confirm('Stop ALL active sessions?')) return;
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Stopping...';
    
    try {
        const response = await fetch('/api/stop-all-sessions', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ All sessions stopped');
            refreshAllData();
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    } finally {
        btn.innerHTML = originalText;
    }
}

// ==================== BATCH FUNCTIONS ====================

// Fetch batch status
async function fetchBatchStatus() {
    try {
        const response = await fetch('/api/batch/all');
        const data = await response.json();
        
        if (data.success) {
            updateBatchStatus(data);
        }
    } catch (error) {
        console.error('Batch fetch error:', error);
    }
}

// Update batch status
function updateBatchStatus(data) {
    const batches = data.batches || [];
    
    if (batches.length === 0) {
        document.getElementById('batchStatus').innerHTML = `
            <div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">
                No active batches. Click "Start Batch Sessions" to begin.
            </div>
        `;
        
        document.getElementById('batchStats').innerHTML = `
            <div>No active batches</div>
        `;
        return;
    }
    
    // Update batch stats
    const runningBatches = batches.filter(b => b.status === 'running');
    const completedBatches = batches.filter(b => b.status === 'completed');
    
    document.getElementById('batchStats').innerHTML = `
        <div><strong>Running:</strong> ${runningBatches.length}</div>
        <div><strong>Completed:</strong> ${completedBatches.length}</div>
        <div><strong>Total Sessions:</strong> ${data.stats?.totalBatches || 0}</div>
    `;
    
    // Update batch status list
    let html = '<div style="max-height: 300px; overflow-y: auto;">';
    
    batches.slice(0, 3).forEach(batch => {
        const statusColor = batch.status === 'running' ? '#06d6a0' : 
                          batch.status === 'completed' ? '#4361ee' : '#ef476f';
        
        html += `
            <div style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Batch:</strong> ${batch.id.substring(0, 12)}...
                        <span style="color: ${statusColor}; font-weight: bold; margin-left: 10px;">
                            ${batch.status.toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <button onclick="stopBatch('${batch.id}')" 
                                style="background: #ef476f; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                            Stop
                        </button>
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: rgba(255,255,255,0.7);">
                    <div><strong>Target:</strong> ${batch.config.targetUrl.replace('https://', '')}</div>
                    <div><strong>Sessions:</strong> ${batch.stats.total} total, ${batch.stats.running} running</div>
                    <div><strong>Progress:</strong> ${batch.stats.completed} completed, ${batch.stats.failed} failed</div>
                    <div><strong>Started:</strong> ${batch.started ? new Date(batch.started).toLocaleTimeString() : 'N/A'}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    if (batches.length > 3) {
        html += `<div style="text-align: center; margin-top: 10px; color: rgba(255,255,255,0.6);">
            + ${batches.length - 3} more batches
        </div>`;
    }
    
    document.getElementById('batchStatus').innerHTML = html;
}

// Stop batch
async function stopBatch(batchId) {
    if (!confirm('Stop this batch? Running sessions will be stopped.')) return;
    
    try {
        const response = await fetch(`/api/batch/stop/${batchId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Batch stopped');
            refreshAllData();
        } else {
            alert(`❌ Error: ${data.error}`);
        }
    } catch (error) {
        alert(`❌ Network error: ${error.message}`);
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    
    return `${Math.floor(diffDays / 365)}y ago`;
}

// Get country CSS class for flags
function getCountryClass(countryCode) {
    const countryMap = {
        'us': 'us',
        'united states': 'us',
        'usa': 'us',
        'uk': 'uk',
        'united kingdom': 'uk',
        'gb': 'uk',
        'germany': 'de',
        'de': 'de',
        'germany': 'de',
        'netherlands': 'nl',
        'nl': 'nl',
        'japan': 'jp',
        'jp': 'jp',
        'singapore': 'sg',
        'sg': 'sg',
        'tor': 'tor'
    };
    
    return countryMap[countryCode.toLowerCase()] || 'unknown';
}

// Initialize country flags for VPN
function initializeCountryFlags() {
    const flags = ['us', 'uk', 'de', 'nl', 'jp', 'sg'];
    flags.forEach(flag => {
        if (!document.querySelector(`.country-flag.${flag}`)) {
            const style = document.createElement('style');
            style.textContent = `
                .country-flag.${flag} {
                    background-image: url('https://flagcdn.com/w20/${flag}.png');
                }
            `;
            document.head.appendChild(style);
        }
    });
}

// Auto-refresh every 10 seconds
function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    
    refreshInterval = setInterval(() => {
        if (autoRefresh) {
            fetchSystemHealth();
            fetchBatchStatus();
            
            // Only full refresh every 30 seconds
            if (Math.floor(Date.now() / 1000) % 30 === 0) {
                refreshAllData();
            }
        }
    }, 10000); // 10 seconds
}

// Export session data
function exportSessionData() {
    const sessions = Array.from(document.querySelectorAll('#sessionsTable tbody tr'));
    const data = sessions.map(row => {
        const cells = row.querySelectorAll('td');
        return {
            sessionId: cells[0].textContent.trim(),
            target: cells[1].textContent.trim(),
            proxyType: cells[2].textContent.trim(),
            status: cells[3].textContent.trim(),
            duration: cells[4].textContent.trim(),
            started: cells[5].textContent.trim()
        };
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Session data exported as JSON!');
}

// Add export button to sessions table
function addExportButton() {
    const sessionsHeader = document.querySelector('.card-title');
    if (sessionsHeader && !document.querySelector('#exportSessionsBtn')) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportSessionsBtn';
        exportBtn.className = 'btn btn-info';
        exportBtn.style.marginLeft = '15px';
        exportBtn.innerHTML = '📊 Export Data';
        exportBtn.onclick = exportSessionData;
        sessionsHeader.appendChild(exportBtn);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl + R = Refresh
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshAllData();
    }
    
    // Ctrl + S = Start session
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        showSessionModal();
    }
    
    // Ctrl + B = Batch session
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        showBatchModal();
    }
    
    // Ctrl + P = Proxy list
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        showProxyDetailsModal();
    }
    
    // Escape = Close modals
    if (e.key === 'Escape') {
        closeModal();
        closeBatchModal();
        closeProxyDetailsModal();
        closeProxyListModal();
        closeGoogleAccountsModal();
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        refreshAllData();
    }
});