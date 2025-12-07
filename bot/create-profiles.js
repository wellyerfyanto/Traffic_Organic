// ==================== CREATE CHROME PROFILES ====================
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class ProfileCreator {
    constructor() {
        this.profilesDir = path.join(__dirname, '..', 'chrome_profiles');
        this.templatesDir = path.join(this.profilesDir, 'templates');
    }

    async init() {
        await fs.mkdir(this.profilesDir, { recursive: true });
        await fs.mkdir(this.templatesDir, { recursive: true });
        console.log(`📁 Profiles directory: ${this.profilesDir}`);
    }

    async createProfile(profileName, options = {}) {
        const profilePath = path.join(this.profilesDir, profileName);
        
        console.log(`\n🎨 Creating profile: ${profileName}`);
        console.log(`📂 Location: ${profilePath}`);
        
        // Create profile directory
        await fs.mkdir(profilePath, { recursive: true });
        
        // Launch Chrome with profile
        console.log('🚀 Launching Chrome...');
        console.log('🔧 Please login to Google account in the browser window');
        console.log('⏳ Close the browser when done to save profile');
        
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: profilePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080',
                '--start-maximized'
            ]
        });
        
        const page = await browser.newPage();
        await page.goto('https://accounts.google.com');
        
        console.log('\n📝 Instructions:');
        console.log('1. Login to Google account in the browser');
        console.log('2. Complete any security checks');
        console.log('3. Close the browser window when done');
        console.log('\n⏳ Waiting for you to close the browser...');
        
        // Wait for browser to close
        return new Promise((resolve) => {
            const checkBrowser = setInterval(async () => {
                try {
                    await browser.pages();
                } catch (error) {
                    clearInterval(checkBrowser);
                    console.log('✅ Browser closed, profile saved!');
                    
                    // Create profile info file
                    const profileInfo = {
                        name: profileName,
                        path: profilePath,
                        created: new Date().toISOString(),
                        type: options.type || 'session',
                        deviceType: options.deviceType || 'desktop',
                        description: options.description || 'Google account profile'
                    };
                    
                    await fs.writeFile(
                        path.join(profilePath, 'profile-info.json'),
                        JSON.stringify(profileInfo, null, 2)
                    );
                    
                    resolve(profileInfo);
                }
            }, 1000);
        });
    }

    async listProfiles() {
        try {
            const items = await fs.readdir(this.profilesDir);
            const profiles = [];
            
            for (const item of items) {
                const itemPath = path.join(this.profilesDir, item);
                const stats = await fs.stat(itemPath);
                
                if (stats.isDirectory() && item !== 'session_profiles' && item !== 'templates') {
                    const infoPath = path.join(itemPath, 'profile-info.json');
                    try {
                        const infoData = await fs.readFile(infoPath, 'utf8');
                        const info = JSON.parse(infoData);
                        profiles.push(info);
                    } catch {
                        profiles.push({
                            name: item,
                            path: itemPath,
                            created: stats.mtime.toISOString(),
                            type: 'unknown'
                        });
                    }
                }
            }
            
            return profiles;
        } catch (error) {
            return [];
        }
    }

    async cleanOldProfiles() {
        try {
            const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
            const profiles = await this.listProfiles();
            let cleaned = 0;
            
            for (const profile of profiles) {
                const profileTime = new Date(profile.created).getTime();
                if (profileTime < cutoff) {
                    await fs.rm(profile.path, { recursive: true, force: true });
                    console.log(`🗑️  Removed old profile: ${profile.name}`);
                    cleaned++;
                }
            }
            
            console.log(`✅ Cleaned ${cleaned} old profiles`);
            return cleaned;
        } catch (error) {
            console.error('❌ Error cleaning profiles:', error.message);
            return 0;
        }
    }
}

// Main function
async function main() {
    const creator = new ProfileCreator();
    await creator.init();
    
    console.log('🎨 Chrome Profile Creator');
    console.log('=========================\n');
    
    while (true) {
        console.log('\nMenu:');
        console.log('1. Create new Chrome profile');
        console.log('2. List existing profiles');
        console.log('3. Clean old profiles (24h+)');
        console.log('4. Exit');
        
        const choice = await question('Select option: ');
        
        switch(choice) {
            case '1':
                const profileName = await question('Profile name: ');
                const profileType = await question('Profile type (desktop/mobile) [desktop]: ') || 'desktop';
                const description = await question('Description: ');
                
                await creator.createProfile(profileName, {
                    type: 'template',
                    deviceType: profileType,
                    description: description
                });
                break;
                
            case '2':
                const profiles = await creator.listProfiles();
                console.log('\n📋 Existing Profiles:');
                console.log('='.repeat(80));
                
                if (profiles.length === 0) {
                    console.log('No profiles found.');
                } else {
                    profiles.forEach((profile, i) => {
                        console.log(`${i+1}. ${profile.name}`);
                        console.log(`   Type: ${profile.type} | Device: ${profile.deviceType || 'desktop'}`);
                        console.log(`   Created: ${new Date(profile.created).toLocaleString()}`);
                        console.log(`   Path: ${profile.path}`);
                        console.log('');
                    });
                }
                break;
                
            case '3':
                console.log('🧹 Cleaning profiles older than 24 hours...');
                await creator.cleanOldProfiles();
                break;
                
            case '4':
                console.log('👋 Goodbye!');
                rl.close();
                return;
                
            default:
                console.log('❌ Invalid option');
        }
    }
}

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

if (require.main === module) {
    main().catch(console.error);
}