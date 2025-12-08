// ==================== SETUP GOOGLE ACCOUNTS ====================
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class GoogleAccountSetup {
    constructor() {
        this.accountsFile = path.join(__dirname, '..', 'data', 'google-accounts.json');
        this.accounts = this.loadAccounts();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'organic-traffic-bot-2025-secure-key';
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log(`📁 Created data directory: ${dataDir}`);
        }
    }

    loadAccounts() {
        try {
            if (fs.existsSync(this.accountsFile)) {
                const data = fs.readFileSync(this.accountsFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('❌ Error loading accounts:', error.message);
        }
        return [];
    }

    saveAccounts() {
        try {
            fs.writeFileSync(this.accountsFile, JSON.stringify(this.accounts, null, 2));
            console.log(`💾 Saved ${this.accounts.length} accounts to ${this.accountsFile}`);
            return true;
        } catch (error) {
            console.error('❌ Error saving accounts:', error.message);
            return false;
        }
    }

    encryptPassword(password) {
        try {
            const iv = crypto.randomBytes(16);
            const key = crypto.createHash('sha256')
                .update(this.encryptionKey)
                .digest();
            
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(password, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return {
                iv: iv.toString('hex'),
                data: encrypted
            };
        } catch (error) {
            console.error('❌ Error encrypting password:', error.message);
            return null;
        }
    }

    decryptPassword(encrypted) {
        try {
            const key = crypto.createHash('sha256')
                .update(this.encryptionKey)
                .digest();
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, 
                Buffer.from(encrypted.iv, 'hex'));
            
            let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('❌ Error decrypting password:', error.message);
            return null;
        }
    }

    async addAccount() {
        console.log('\n📝 Add Google Account\n');
        
        const email = await this.question('Email: ');
        if (!this.isValidEmail(email)) {
            console.log('❌ Invalid email format');
            return;
        }

        // Check for duplicate
        if (this.accounts.some(acc => acc.email === email)) {
            console.log('❌ Account with this email already exists');
            return;
        }

        const password = await this.question('Password: ', true);
        if (!password || password.length < 6) {
            console.log('❌ Password must be at least 6 characters');
            return;
        }

        const accountType = await this.question('Account Type (personal/business/temp) [personal]: ') || 'personal';
        const has2FA = (await this.question('Has 2FA? (y/n) [n]: ') || 'n').toLowerCase() === 'y';
        
        let backupCodes = [];
        if (has2FA) {
            const backupCodesStr = await this.question('Backup codes (comma separated): ');
            backupCodes = backupCodesStr.split(',').map(code => code.trim()).filter(code => code);
            
            if (backupCodes.length === 0) {
                console.log('⚠️ Warning: 2FA enabled but no backup codes provided');
            }
        }
        
        const encryptedPassword = this.encryptPassword(password);
        if (!encryptedPassword) {
            console.log('❌ Failed to encrypt password');
            return;
        }
        
        const account = {
            id: `acc_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
            email: email,
            password: encryptedPassword,
            accountType: accountType,
            has2FA: has2FA,
            backupCodes: backupCodes,
            status: 'active',
            created: new Date().toISOString(),
            lastUsed: null,
            usageCount: 0,
            successRate: 1.0,
            failureCount: 0,
            lastError: null,
            cookies: [],
            notes: ''
        };
        
        this.accounts.push(account);
        const saved = this.saveAccounts();
        
        if (saved) {
            console.log(`✅ Account ${email} added successfully`);
            
            // Show account summary
            console.log('\n📋 Account Summary:');
            console.log(`   Email: ${account.email}`);
            console.log(`   Type: ${account.accountType}`);
            console.log(`   2FA: ${account.has2FA ? 'Yes' : 'No'}`);
            console.log(`   Backup Codes: ${account.backupCodes.length}`);
            console.log(`   Status: ${account.status}`);
            
            // Test account
            const test = await this.question('\nTest account now? (y/n) [n]: ') || 'n';
            if (test.toLowerCase() === 'y') {
                await this.testAccount(account);
            }
        }
    }

    async testAccount(account) {
        console.log(`\n🧪 Testing account: ${account.email}`);
        
        try {
            // Try to import puppeteer dynamically
            let puppeteer;
            try {
                puppeteer = require('puppeteer-extra');
                const StealthPlugin = require('puppeteer-extra-plugin-stealth');
                puppeteer.use(StealthPlugin());
            } catch (error) {
                console.log('⚠️ Puppeteer not available, using manual testing');
                console.log('📝 Manual Test Instructions:');
                console.log('1. Go to https://accounts.google.com');
                console.log(`2. Login with: ${account.email}`);
                console.log('3. Check if login succeeds');
                
                const success = await this.question('Did login succeed? (y/n): ');
                if (success.toLowerCase() === 'y') {
                    console.log('✅ Account login successful!');
                    account.status = 'active';
                    account.lastUsed = new Date().toISOString();
                    this.saveAccounts();
                } else {
                    console.log('❌ Account login failed');
                    account.status = 'failed';
                    this.saveAccounts();
                }
                return;
            }
            
            console.log('Launching browser...');
            const browser = await puppeteer.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            
            const page = await browser.newPage();
            await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2' });
            
            console.log('\n🔐 Manual Testing Mode');
            console.log('=' .repeat(40));
            console.log(`Email: ${account.email}`);
            console.log('Please login manually in the browser window');
            console.log('Press Enter in terminal when done or if login fails.');
            console.log('=' .repeat(40));
            
            await new Promise(resolve => {
                rl.question('', () => resolve());
            });
            
            // Check login status
            await page.goto('https://myaccount.google.com', { waitUntil: 'domcontentloaded' });
            const isLoggedIn = await page.evaluate(() => {
                return document.body.innerText.includes('Welcome') || 
                       document.title.includes('My Account') ||
                       document.querySelector('img[alt="Profile"]') !== null ||
                       document.querySelector('a[href*="SignOutOptions"]') !== null;
            });
            
            await browser.close();
            
            if (isLoggedIn) {
                console.log('✅ Account login successful!');
                account.status = 'active';
                account.lastUsed = new Date().toISOString();
                account.successRate = 1.0;
                this.saveAccounts();
            } else {
                console.log('❌ Account login failed');
                account.status = 'failed';
                account.failureCount = (account.failureCount || 0) + 1;
                this.saveAccounts();
            }
            
        } catch (error) {
            console.error('❌ Test error:', error.message);
            account.status = 'error';
            account.lastError = error.message;
            this.saveAccounts();
        }
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    async listAccounts() {
        console.log('\n📋 Existing Accounts:');
        console.log('='.repeat(80));
        
        if (this.accounts.length === 0) {
            console.log('No accounts found.');
            return;
        }
        
        this.accounts.forEach((acc, i) => {
            const statusIcon = acc.status === 'active' ? '✅' : 
                              acc.status === 'suspicious' ? '⚠️' : '❌';
            
            console.log(`${i+1}. ${statusIcon} ${acc.email}`);
            console.log(`   Type: ${acc.accountType} | Used: ${acc.usageCount}x | Success: ${(acc.successRate * 100).toFixed(1)}%`);
            console.log(`   Status: ${acc.status} | Last: ${acc.lastUsed ? new Date(acc.lastUsed).toLocaleDateString() : 'Never'}`);
            console.log(`   2FA: ${acc.has2FA ? 'Yes' : 'No'} | Backup Codes: ${acc.backupCodes.length}`);
            
            if (acc.lastError) {
                console.log(`   Last Error: ${acc.lastError}`);
            }
            console.log('');
        });
    }

    async removeAccount() {
        await this.listAccounts();
        
        if (this.accounts.length === 0) return;
        
        const indexStr = await this.question('\nEnter account number to remove (0 to cancel): ');
        const index = parseInt(indexStr) - 1;
        
        if (isNaN(index) || index < 0) {
            console.log('❌ Cancelled');
            return;
        }
        
        if (index >= 0 && index < this.accounts.length) {
            const account = this.accounts[index];
            const confirm = await this.question(`Remove account ${account.email}? (y/n): `);
            
            if (confirm.toLowerCase() === 'y') {
                this.accounts.splice(index, 1);
                const saved = this.saveAccounts();
                if (saved) {
                    console.log('✅ Account removed');
                }
            } else {
                console.log('❌ Cancelled');
            }
        } else {
            console.log('❌ Invalid account number');
        }
    }

    async editAccount() {
        await this.listAccounts();
        
        if (this.accounts.length === 0) return;
        
        const indexStr = await this.question('\nEnter account number to edit (0 to cancel): ');
        const index = parseInt(indexStr) - 1;
        
        if (isNaN(index) || index < 0) {
            console.log('❌ Cancelled');
            return;
        }
        
        if (index >= 0 && index < this.accounts.length) {
            const account = this.accounts[index];
            console.log(`\n✏️ Editing account: ${account.email}`);
            
            const newStatus = await this.question(`Status (active/suspicious/failed) [${account.status}]: `);
            if (newStatus) account.status = newStatus;
            
            const notes = await this.question(`Notes [${account.notes || ''}]: `);
            if (notes !== undefined) account.notes = notes;
            
            const saved = this.saveAccounts();
            if (saved) {
                console.log('✅ Account updated');
            }
        } else {
            console.log('❌ Invalid account number');
        }
    }

    async exportToEnv() {
        const envContent = `ENCRYPTION_KEY=${this.encryptionKey}\n`;
        const envFile = path.join(__dirname, '..', '.env.accounts');
        
        try {
            fs.writeFileSync(envFile, envContent);
            console.log('📁 Created .env.accounts file');
            console.log('⚠️ Add ENCRYPTION_KEY to your main .env file');
            console.log('📋 Copy this to your Railway variables:');
            console.log(`ENCRYPTION_KEY=${this.encryptionKey}`);
        } catch (error) {
            console.error('❌ Error creating env file:', error.message);
        }
    }

    async viewAccountDetails() {
        await this.listAccounts();
        
        if (this.accounts.length === 0) return;
        
        const indexStr = await this.question('\nEnter account number to view details (0 to cancel): ');
        const index = parseInt(indexStr) - 1;
        
        if (isNaN(index) || index < 0) {
            console.log('❌ Cancelled');
            return;
        }
        
        if (index >= 0 && index < this.accounts.length) {
            const account = this.accounts[index];
            console.log('\n' + '='.repeat(80));
            console.log(`🔍 Account Details: ${account.email}`);
            console.log('='.repeat(80));
            console.log(JSON.stringify(account, null, 2));
            console.log('='.repeat(80));
            
            // Decrypt password for viewing (optional)
            const showPassword = await this.question('\nShow decrypted password? (y/n) [n]: ') || 'n';
            if (showPassword.toLowerCase() === 'y') {
                const decrypted = this.decryptPassword(account.password);
                if (decrypted) {
                    console.log(`Password: ${decrypted.substring(0, 3)}${'*'.repeat(decrypted.length - 3)}`);
                } else {
                    console.log('❌ Failed to decrypt password');
                }
            }
        } else {
            console.log('❌ Invalid account number');
        }
    }

    question(prompt, hide = false) {
        return new Promise((resolve) => {
            if (hide && process.stdin.isTTY) {
                const stdin = process.stdin;
                const listener = (char) => {
                    char = char + '';
                    switch (char) {
                        case '\n':
                        case '\r':
                        case '\u0004':
                            stdin.removeListener('data', listener);
                            break;
                        default:
                            process.stdout.write('\x1B[2K\x1B[200D' + prompt + Array(rl.line.length + 1).join('*'));
                            break;
                    }
                };
                process.stdin.on('data', listener);
                
                rl.question(prompt, (answer) => {
                    process.stdin.removeListener('data', listener);
                    console.log();
                    resolve(answer);
                });
            } else {
                rl.question(prompt, (answer) => {
                    resolve(answer);
                });
            }
        });
    }
}

// Main menu
async function main() {
    const setup = new GoogleAccountSetup();
    
    console.log('🔐 Google Account Setup');
    console.log('=======================\n');
    
    while (true) {
        console.log('\nMenu:');
        console.log('1. Add new Google account');
        console.log('2. List existing accounts');
        console.log('3. View account details');
        console.log('4. Edit account');
        console.log('5. Remove account');
        console.log('6. Test account manually');
        console.log('7. Export encryption key');
        console.log('8. Exit');
        
        const choice = await setup.question('\nSelect option: ');
        
        switch(choice) {
            case '1':
                await setup.addAccount();
                break;
            case '2':
                await setup.listAccounts();
                break;
            case '3':
                await setup.viewAccountDetails();
                break;
            case '4':
                await setup.editAccount();
                break;
            case '5':
                await setup.removeAccount();
                break;
            case '6':
                await setup.listAccounts();
                const testIndex = await setup.question('\nEnter account number to test: ');
                const idx = parseInt(testIndex) - 1;
                if (idx >= 0 && idx < setup.accounts.length) {
                    await setup.testAccount(setup.accounts[idx]);
                }
                break;
            case '7':
                await setup.exportToEnv();
                break;
            case '8':
                console.log('👋 Goodbye!');
                rl.close();
                process.exit(0);
            default:
                console.log('❌ Invalid option');
        }
    }
}

// Handle cleanup
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down...');
    rl.close();
    process.exit(0);
});

if (require.main === module) {
    main().catch(console.error);
}