// ==================== PROFILE MANAGER PER SESSION ====================
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ProfileManager {
    constructor() {
        this.profilesDir = path.join(__dirname, '..', 'chrome_profiles');
        this.sessionProfilesDir = path.join(this.profilesDir, 'session_profiles');
        this.templateProfilesDir = path.join(this.profilesDir, 'templates');
        
        this.init();
    }

    async init() {
        try {
            // Buat direktori jika belum ada
            await fs.mkdir(this.profilesDir, { recursive: true });
            await fs.mkdir(this.sessionProfilesDir, { recursive: true });
            await fs.mkdir(this.templateProfilesDir, { recursive: true });
            
            console.log('✅ Profile Manager initialized');
        } catch (error) {
            console.error('❌ Profile Manager init error:', error.message);
        }
    }

    // Generate unique session ID untuk profile
    generateSessionProfileId(sessionId) {
        const hash = crypto.createHash('md5').update(sessionId).digest('hex');
        return `session_${hash.substring(0, 8)}_${Date.now().toString(36)}`;
    }

    // Buat profile baru untuk session
    async createSessionProfile(sessionId, deviceType = 'desktop') {
        const profileId = this.generateSessionProfileId(sessionId);
        const profilePath = path.join(this.sessionProfilesDir, profileId);
        
        try {
            // Buat direktori profile
            await fs.mkdir(profilePath, { recursive: true });
            
            // Buat file preferences dasar
            const preferences = this.generatePreferences(deviceType, sessionId);
            
            // Simpan preferences
            const prefsPath = path.join(profilePath, 'Preferences');
            await fs.writeFile(prefsPath, JSON.stringify(preferences, null, 2));
            
            // Buat folder Local State
            const localStatePath = path.join(profilePath, 'Local State');
            const localState = {
                'background_mode': {
                    'enabled': false
                },
                'browser': {
                    'last_redirect_origin': ''
                },
                'hardware_acceleration_mode': {
                    'enabled': 1
                }
            };
            await fs.writeFile(localStatePath, JSON.stringify(localState, null, 2));
            
            console.log(`✅ Created session profile: ${profileId}`);
            return {
                id: profileId,
                path: profilePath,
                created: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error creating profile:', error.message);
            return null;
        }
    }

    // Generate preferences unik per session
    generatePreferences(deviceType, sessionId) {
        const fingerprint = this.generateFingerprint(deviceType, sessionId);
        
        return {
            'profile': {
                'created_by_version': '121.0.6167.85',
                'name': `Organic Session ${sessionId.substring(0, 6)}`
            },
            'session': {
                'restore_on_startup': 4,
                'startup_urls': []
            },
            'browser': {
                'window_placement': {
                    'bottom': fingerprint.windowHeight,
                    'left': 0,
                    'maximized': true,
                    'right': fingerprint.windowWidth,
                    'top': 0,
                    'work_area_bottom': fingerprint.screenHeight,
                    'work_area_left': 0,
                    'work_area_right': fingerprint.screenWidth,
                    'work_area_top': 0
                }
            },
            'extensions': {
                'ui': {
                    'developer_mode': false
                }
            },
            'device': {
                'fingerprint': fingerprint,
                'session_id': sessionId,
                'created_at': new Date().toISOString()
            },
            'google': {
                'services': {
                    'account_id': '',
                    'last_username': '',
                    'username': ''
                }
            }
        };
    }

    // Generate fingerprint unik per session
    generateFingerprint(deviceType, sessionId) {
        const seed = sessionId + deviceType;
        const hash = crypto.createHash('md5').update(seed).digest('hex');
        
        const baseFingerprint = {
            architecture: 'x86',
            brand: Math.random() > 0.5 ? 'Google' : 'Intel',
            deviceMemory: deviceType === 'mobile' ? 4 : 8,
            hardwareConcurrency: deviceType === 'mobile' ? 4 : 8,
            maxTouchPoints: deviceType === 'mobile' ? 5 : 0,
            platform: deviceType === 'mobile' ? 'Android' : 'Win32',
            timezone: this.getRandomTimezone(),
            language: this.getRandomLanguage(),
            screen: {
                width: deviceType === 'mobile' ? 375 : 1920,
                height: deviceType === 'mobile' ? 667 : 1080,
                availWidth: deviceType === 'mobile' ? 375 : 1920,
                availHeight: deviceType === 'mobile' ? 647 : 1040,
                colorDepth: 24,
                pixelDepth: 24
            },
            window: {
                width: deviceType === 'mobile' ? 375 : 1920,
                height: deviceType === 'mobile' ? 667 : 1080
            },
            navigator: {
                userAgent: '',
                platform: deviceType === 'mobile' ? 'Android' : 'Win32',
                language: this.getRandomLanguage(),
                languages: [this.getRandomLanguage(), 'en-US', 'en'],
                hardwareConcurrency: deviceType === 'mobile' ? 4 : 8,
                deviceMemory: deviceType === 'mobile' ? 4 : 8,
                maxTouchPoints: deviceType === 'mobile' ? 5 : 0
            },
            canvas: {
                hash: hash.substring(0, 16)
            },
            webgl: {
                vendor: Math.random() > 0.5 ? 'Google Inc.' : 'Intel Inc.',
                renderer: deviceType === 'mobile' ? 
                    'Adreno (TM) 650' : 
                    'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'
            },
            audio: {
                hash: hash.substring(16, 32)
            },
            fonts: this.getRandomFonts(deviceType)
        };
        
        return baseFingerprint;
    }

    getRandomTimezone() {
        const timezones = [
            'America/New_York',
            'America/Los_Angeles',
            'Europe/London',
            'Europe/Paris',
            'Asia/Jakarta',
            'Asia/Tokyo',
            'Australia/Sydney'
        ];
        return timezones[Math.floor(Math.random() * timezones.length)];
    }

    getRandomLanguage() {
        const languages = ['en-US', 'en-GB', 'id-ID', 'de-DE', 'fr-FR'];
        return languages[Math.floor(Math.random() * languages.length)];
    }

    getRandomFonts(deviceType) {
        const desktopFonts = [
            'Arial', 'Times New Roman', 'Helvetica', 'Georgia', 
            'Verdana', 'Tahoma', 'Courier New', 'Lucida Console'
        ];
        
        const mobileFonts = [
            'Roboto', 'Open Sans', 'Lato', 'Montserrat',
            'Poppins', 'Source Sans Pro', 'Ubuntu'
        ];
        
        const fonts = deviceType === 'mobile' ? mobileFonts : desktopFonts;
        const selected = [];
        
        // Pilih 5-8 font secara random
        const count = 5 + Math.floor(Math.random() * 4);
        while (selected.length < count) {
            const font = fonts[Math.floor(Math.random() * fonts.length)];
            if (!selected.includes(font)) {
                selected.push(font);
            }
        }
        
        return selected;
    }

    // Hapus profile session setelah digunakan
    async cleanupSessionProfile(profileId) {
        try {
            const profilePath = path.join(this.sessionProfilesDir, profileId);
            if (await this.exists(profilePath)) {
                await fs.rm(profilePath, { recursive: true, force: true });
                console.log(`🗑️ Cleaned up profile: ${profileId}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error cleaning profile:', error.message);
            return false;
        }
    }

    // Hapus semua profile lama (lebih dari 1 jam)
    async cleanupOldProfiles(maxAgeHours = 1) {
        try {
            const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
            const profiles = await fs.readdir(this.sessionProfilesDir);
            
            let cleaned = 0;
            for (const profile of profiles) {
                const profilePath = path.join(this.sessionProfilesDir, profile);
                const stats = await fs.stat(profilePath);
                
                if (stats.mtimeMs < cutoff) {
                    await fs.rm(profilePath, { recursive: true, force: true });
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                console.log(`🧹 Cleaned ${cleaned} old profiles`);
            }
            
            return cleaned;
        } catch (error) {
            console.error('❌ Error cleaning old profiles:', error.message);
            return 0;
        }
    }

    async exists(path) {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = ProfileManager;