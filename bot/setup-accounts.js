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
    }

    loadAccounts() {
        if (fs.existsSync(this.accountsFile)) {
            const data = fs.readFileSync(this.accountsFile, 'utf8');
            return JSON.parse(data);
        }
        return [];
    }

    saveAccounts() {
        fs.writeFileSync(this.accountsFile, JSON.stringify(this.accounts, null, 2));
        console.log(`💾 Saved ${this.accounts.length} accounts to ${this.accountsFile}`);
    }

    encryptPassword(password) {
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
    }

    async addAccount() {
        console.log('\n📝 Add Google Account\n');
        
        const email = await this.question('Email: ');
        const password = await this.question('Password: ', true);
        const accountType = await this.question('Account Type (personal/business/temp) [personal]: ') || 'personal';
        const has2FA = (await this.question('Has 2FA? (y/n) [n]: ') || 'n').toLowerCase() === 'y';
        
        let backupCodes = [];
        if (has2FA) {
            const backupCodesStr = await this.question('Backup codes (comma separated): ');
            backupCodes = backupCodesStr.split(',').map(code => code.trim()).filter(code => code);
        }
        
        const account = {
            id: `acc_${Date.now().toString(36)}`,
            email: email,
            password: this.encryptPassword(password),
            accountType: accountType,
            has2FA: has2FA,
            backupCodes: backupCodes,
            status: 'active',
            created: new Date().toISOString(),
            lastUsed: null,
            usageCount: 0,
            successRate: 1.0,
            failureCount: 0,
            lastError: null
        };
        
        this.accounts.push(account);
        this.saveAccounts();
        
        console.log(`✅ Account ${email} added successfully`);
        
        // Test account
        const test = await this.question('Test account now? (y/n) [n]: ') || 'n';
        if (test.toLowerCase() === 'y') {
            await this.testAccount(account);
        }
    }

    async testAccount(account) {
        console.log(`\n🧪 Testing account: ${account.email}`);
        
        try {
            const puppeteer = require('puppeteer-extra');
            const StealthPlugin = require('puppeteer-extra-plugin-stealth');
            puppeteer.use(StealthPlugin());
            
            console.log('Launching browser...');
            const browser = await puppeteer.launch({
                headless: false, // Show browser for manual testing
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2' });
            
            console.log('Please login manually in the browser window...');
            console.log(`Email: ${account.email}`);
            console.log('Press Enter in terminal when done or if login fails.');
            
            await new Promise(resolve => {
                rl.question('', () => resolve());
            });
            
            // Check login status
            await page.goto('https://myaccount.google.com', { waitUntil: 'domcontentloaded' });
            const isLoggedIn = await page.evaluate(() => {
                return document.body.innerText.includes('Welcome') || 
                       document.title.includes('My Account');
            });
            
            await browser.close();
            
            if (isLoggedIn) {
                console.log('✅ Account login successful!');
                account.status = 'active';
                account.lastUsed = new Date().toISOString();
                this.saveAccounts();
            } else {
                console.log('❌ Account login failed');
                account.status = 'failed';
                this.saveAccounts();
            }
            
        } catch (error) {
            console.error('❌ Test error:', error.message);
        }
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
            
            if (acc.lastError) {
                console.log(`   Last Error: ${acc.lastError}`);
            }
            console.log('');
        });
    }

    async removeAccount() {
        await this.listAccounts();
        
        const indexStr = await this.question('\nEnter account number to remove: ');
        const index = parseInt(indexStr) - 1;
        
        if (index >= 0 && index < this.accounts.length) {
            const account = this.accounts[index];
            const confirm = await this.question(`Remove account ${account.email}? (y/n): `);
            
            if (confirm.toLowerCase() === 'y') {
                this.accounts.splice(index, 1);
                this.saveAccounts();
                console.log('✅ Account removed');
            }
        } else {
            console.log('❌ Invalid account number');
        }
    }

    async exportToEnv() {
        const envContent = `ENCRYPTION_KEY=${this.encryptionKey}\n`;
        fs.writeFileSync('.env.accounts', envContent);
        
        console.log('📁 Created .env.accounts file');
        console.log('⚠️ Add ENCRYPTION_KEY to your main .env file');
        console.log('📋 Copy this to your Railway variables:');
        console.log(`ENCRYPTION_KEY=${this.encryptionKey}`);
    }

    question(prompt, hide = false) {
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                resolve(answer);
            });
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
        console.log('3. Remove account');
        console.log('4. Export encryption key');
        console.log('5. Exit');
        
        const choice = await setup.question('\nSelect option: ');
        
        switch(choice) {
            case '1':
                await setup.addAccount();
                break;
            case '2':
                await setup.listAccounts();
                break;
            case '3':
                await setup.removeAccount();
                break;
            case '4':
                await setup.exportToEnv();
                break;
            case '5':
                console.log('👋 Goodbye!');
                rl.close();
                return;
            default:
                console.log('❌ Invalid option');
        }
    }
}

if (require.main === module) {
    main().catch(console.error);
}