// ==================== GOOGLE AUTO LOGIN MANAGER ====================
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class GoogleAuthManager {
    constructor() {
        this.accountsFile = path.join(__dirname, '..', 'data', 'google-accounts.json');
        this.activeAccounts = [];
        this.failedAccounts = [];
        this.rotationIndex = 0;
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(this.accountsFile), { recursive: true });
            await this.loadAccounts();
            console.log(`✅ Google Auth Manager initialized: ${this.activeAccounts.length} accounts`);
        } catch (error) {
            console.error('❌ Google Auth Manager init error:', error.message);
        }
    }

    // Encrypt password
    encryptPassword(password) {
        const iv = crypto.randomBytes(16);
        const key = crypto.createHash('sha256')
            .update(process.env.ENCRYPTION_KEY || 'organic-traffic-bot-2025-secure-key')
            .digest();
        
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            iv: iv.toString('hex'),
            data: encrypted
        };
    }

    // Decrypt password
    decryptPassword(encrypted) {
        try {
            const key = crypto.createHash('sha256')
                .update(process.env.ENCRYPTION_KEY || 'organic-traffic-bot-2025-secure-key')
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
            if (await this.exists(this.accountsFile)) {
                const data = await fs.readFile(this.accountsFile, 'utf8');
                const accounts = JSON.parse(data);
                
                this.activeAccounts = accounts.filter(acc => 
                    acc.status === 'active' && !acc.has2FA
                );
                this.failedAccounts = accounts.filter(acc => 
                    acc.status === 'failed' || acc.status === 'suspicious'
                );
                
                console.log(`📋 Loaded ${this.activeAccounts.length} active accounts`);
            } else {
                console.log('⚠️ No Google accounts file found');
                await this.saveAccounts([]);
            }
        } catch (error) {
            console.error('❌ Error loading accounts:', error.message);
            this.activeAccounts = [];
        }
    }

    async saveAccounts(accounts) {
        try {
            await fs.writeFile(this.accountsFile, JSON.stringify(accounts, null, 2));
        } catch (error) {
            console.error('❌ Error saving accounts:', error.message);
        }
    }

    async exists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Dapatkan akun untuk session
    getAccountForSession(sessionId, strategy = 'rotation') {
        if (this.activeAccounts.length === 0) {
            return null;
        }

        switch(strategy) {
            case 'random':
                const randomIndex = Math.floor(Math.random() * this.activeAccounts.length);
                return this.activeAccounts[randomIndex];
            
            case 'least-used':
                return this.activeAccounts.sort((a, b) => 
                    (a.usageCount || 0) - (b.usageCount || 0)
                )[0];
            
            case 'rotation':
            default:
                this.rotationIndex = (this.rotationIndex + 1) % this.activeAccounts.length;
                return this.activeAccounts[this.rotationIndex];
        }
    }

    // Login ke Google
    async loginToGoogle(page, account) {
        try {
            if (!account || !account.email || !account.password) {
                console.log('⚠️ Invalid account credentials');
                return false;
            }

            console.log(`🔐 Attempting Google login: ${account.email.substring(0, 10)}...`);

            // Decrypt password
            const password = this.decryptPassword(account.password);
            if (!password) {
                console.log(`❌ Failed to decrypt password for ${account.email}`);
                return false;
            }

            // Navigate to Google login
            await page.goto('https://accounts.google.com', { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Fill email
            await page.waitForSelector('input[type="email"]', { timeout: 10000 });
            await page.type('input[type="email"]', account.email);
            await page.click('#identifierNext');
            
            await page.waitForTimeout(2000);

            // Fill password
            await page.waitForSelector('input[type="password"]', { timeout: 10000 });
            await page.type('input[type="password"]', password);
            await page.click('#passwordNext');
            
            await page.waitForTimeout(5000);

            // Check login success
            const currentUrl = page.url();
            const success = currentUrl.includes('myaccount.google.com') || 
                          currentUrl.includes('accounts.google.com/signin/v2/challenge/pwd') ||
                          !currentUrl.includes('accounts.google.com/signin');

            if (success) {
                console.log(`✅ Google login successful: ${account.email}`);
                
                // Update account usage
                account.lastUsed = new Date().toISOString();
                account.usageCount = (account.usageCount || 0) + 1;
                account.successRate = ((account.successRate || 0) * (account.usageCount - 1) + 1) / account.usageCount;
                
                return true;
            } else {
                console.log(`❌ Google login failed: ${account.email}`);
                
                // Update account failure
                account.lastError = 'Login failed';
                account.failureCount = (account.failureCount || 0) + 1;
                account.successRate = ((account.successRate || 1) * (account.usageCount || 1)) / ((account.usageCount || 1) + 1);
                
                if (account.failureCount > 3) {
                    account.status = 'suspicious';
                }
                
                return false;
            }

        } catch (error) {
            console.log(`❌ Google login error for ${account?.email || 'unknown'}:`, error.message);
            return false;
        }
    }

    // Inject Google cookies (alternatif method)
    async injectGoogleCookies(page, account) {
        try {
            if (!account || !account.cookies) {
                return false;
            }

            console.log(`🍪 Injecting Google cookies for: ${account.email.substring(0, 10)}...`);

            // Format cookies
            const cookies = [
                {
                    name: 'SID',
                    value: account.cookies.SID || '',
                    domain: '.google.com',
                    path: '/',
                    httpOnly: true,
                    secure: true
                },
                {
                    name: 'HSID',
                    value: account.cookies.HSID || '',
                    domain: '.google.com',
                    path: '/',
                    httpOnly: true,
                    secure: true
                },
                {
                    name: 'SSID',
                    value: account.cookies.SSID || '',
                    domain: '.google.com',
                    path: '/',
                    httpOnly: true,
                    secure: true
                },
                {
                    name: 'APISID',
                    value: account.cookies.APISID || '',
                    domain: '.google.com',
                    path: '/',
                    httpOnly: true,
                    secure: true
                },
                {
                    name: 'SAPISID',
                    value: account.cookies.SAPISID || '',
                    domain: '.google.com',
                    path: '/',
                    httpOnly: true,
                    secure: true
                },
                {
                    name: '__Secure-3PSID',
                    value: account.cookies.__Secure_3PSID || '',
                    domain: '.google.com',
                    path: '/',
                    httpOnly: true,
                    secure: true
                },
                {
                    name: 'NID',
                    value: account.cookies.NID || '',
                    domain: '.google.com',
                    path: '/',
                    httpOnly: false,
                    secure: true
                }
            ].filter(cookie => cookie.value && cookie.value.length > 10);

            // Set cookies
            for (const cookie of cookies) {
                try {
                    await page.setCookie(cookie);
                } catch (cookieError) {
                    // Ignore cookie errors
                }
            }

            console.log(`✅ Injected ${cookies.length} Google cookies`);
            return true;

        } catch (error) {
            console.error('❌ Cookie injection error:', error.message);
            return false;
        }
    }

    // Verify login status
    async verifyGoogleLogin(page) {
        try {
            await page.goto('https://myaccount.google.com', { 
                waitUntil: 'domcontentloaded',
                timeout: 10000 
            });
            
            const isLoggedIn = await page.evaluate(() => {
                return document.body.innerText.includes('Welcome') || 
                       document.title.includes('My Account') ||
                       !!document.querySelector('img[alt="Profile"]') ||
                       !!document.querySelector('a[href*="SignOutOptions"]');
            });

            return isLoggedIn;
        } catch (error) {
            return false;
        }
    }

    // Bypass Google block dengan login
    async bypassGoogleBlock(page, sessionId) {
        try {
            console.log('🛡️ Attempting Google block bypass via login...');
            
            // Coba login dengan akun Google
            const account = this.getAccountForSession(sessionId, 'random');
            if (account) {
                const loginSuccess = await this.loginToGoogle(page, account);
                if (loginSuccess) {
                    console.log('✅ Bypassed Google block via login');
                    return true;
                }
            }
            
            // Fallback: clear cookies and reload
            await page.deleteCookie(...(await page.cookies()));
            await page.reload({ waitUntil: 'networkidle2' });
            
            return false;
            
        } catch (error) {
            console.log('❌ Google bypass error:', error.message);
            return false;
        }
    }
}

module.exports = GoogleAuthManager;