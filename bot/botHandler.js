// ==================== BOT HANDLER 2025 (GOOGLE SPECIFIC) ====================
class BotHandler {
  constructor() {
    this.detectionCount = 0;
    this.googleDetections = 0;
    this.strategies = [
      this.changeUserAgent,
      this.changeViewport,
      this.simulateHumanInput,
      this.handleGoogleCaptcha,
      this.clearGoogleCookies,
      this.randomGoogleDelays,
      this.mouseMovementPatterns,
      this.switchSearchEngine,
      this.useDifferentGoogleDomain,
      this.simulateTypingMistakes
    ];
  }

  async handleDetection(page, context = 'unknown') {
    this.detectionCount++;
    
    if (context.includes('google')) {
      this.googleDetections++;
      console.log(`🔴 Google bot detection #${this.googleDetections} in ${context}`);
    } else {
      console.log(`🤖 Bot detected in ${context}. Total detections: ${this.detectionCount}`);
    }
    
    // Select 3-5 strategies for Google, 2-3 for others
    const strategyCount = context.includes('google') ? 
      3 + Math.floor(Math.random() * 3) : 
      2 + Math.floor(Math.random() * 2);
    
    const selectedStrategies = this.strategies
      .sort(() => Math.random() - 0.5)
      .slice(0, strategyCount);
    
    console.log(`🛡️ Applying ${selectedStrategies.length} anti-detection strategies...`);
    
    for (const strategy of selectedStrategies) {
      try {
        await strategy.call(this, page, context);
        await page.waitForTimeout(2000 + Math.random() * 3000);
      } catch (error) {
        console.log(`⚠️ Strategy ${strategy.name} error: ${error.message}`);
      }
    }
    
    console.log(`✅ Anti-detection strategies applied`);
    
    return this.detectionCount;
  }

  async changeUserAgent(page, context) {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
    ];
    
    const newUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(newUA);
    
    if (context.includes('google')) {
      console.log('🔄 Changed User Agent for Google');
    } else {
      console.log('🔄 Changed User Agent');
    }
  }

  async changeViewport(page, context) {
    const widths = [1366, 1440, 1536, 1600, 1920];
    const heights = [768, 900, 960, 1024, 1080];
    
    const width = widths[Math.floor(Math.random() * widths.length)];
    const height = heights[Math.floor(Math.random() * heights.length)];
    
    await page.setViewport({ width, height });
    
    if (context.includes('google')) {
      console.log(`🔄 Changed viewport to ${width}x${height} for Google`);
    } else {
      console.log(`🔄 Changed viewport to ${width}x${height}`);
    }
  }

  async simulateHumanInput(page, context) {
    // Simulate keyboard and mouse
    await page.mouse.move(
      Math.random() * 500,
      Math.random() * 300,
      { steps: 20 + Math.random() * 30 }
    );
    
    await page.waitForTimeout(500 + Math.random() * 1000);
    
    // Random keyboard actions
    const actions = ['Tab', 'Space', 'Escape', 'ArrowDown', 'ArrowUp'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    await page.keyboard.press(randomAction);
    
    await page.waitForTimeout(200 + Math.random() * 500);
    
    console.log('👤 Simulated human input');
  }

  async handleGoogleCaptcha(page, context) {
    if (!context.includes('google')) return;
    
    try {
      console.log('🛡️ Checking for Google CAPTCHA...');
      
      // Check if CAPTCHA exists
      const hasCaptcha = await page.evaluate(() => {
        return document.querySelector('#recaptcha, .g-recaptcha, [aria-label*="captcha"]') !== null;
      });
      
      if (hasCaptcha) {
        console.log('⚠️ Google CAPTCHA detected');
        
        // Try to solve if plugin available
        if (typeof page.solveRecaptchas === 'function') {
          await page.solveRecaptchas();
          console.log('✅ Attempted to solve CAPTCHA via plugin');
        } else {
          console.log('ℹ️ No CAPTCHA plugin available, trying alternative...');
          
          // Try to click audio challenge
          await page.evaluate(() => {
            const audioBtn = document.querySelector('#recaptcha-audio-button');
            if (audioBtn) audioBtn.click();
          });
          
          await page.waitForTimeout(5000);
          
          // Reload page as last resort
          await page.reload({ waitUntil: 'networkidle2' });
          console.log('🔄 Reloaded page to bypass CAPTCHA');
        }
      }
    } catch (error) {
      console.log('⚠️ CAPTCHA handling error:', error.message);
    }
  }

  async clearGoogleCookies(page, context) {
    try {
      const cookies = await page.cookies();
      let cleared = 0;
      
      for (const cookie of cookies) {
        if (cookie.domain.includes('google') || 
            cookie.name.includes('google') || 
            cookie.name.includes('GA') || 
            cookie.name.includes('_ga')) {
          await page.deleteCookie(cookie);
          cleared++;
        }
      }
      
      console.log(`🧹 Cleared ${cleared} Google-related cookies`);
      
      // Also clear cache
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCache');
      console.log('🧹 Cleared browser cache');
      
    } catch (error) {
      console.log('⚠️ Error clearing cookies:', error.message);
    }
  }

  async randomGoogleDelays(page, context) {
    // Longer delays for Google
    const delay = context.includes('google') ? 
      10000 + Math.random() * 20000 : 
      5000 + Math.random() * 10000;
    
    await page.waitForTimeout(delay);
    
    if (context.includes('google')) {
      console.log(`⏰ Added long random delay for Google: ${Math.round(delay/1000)}s`);
    } else {
      console.log(`⏰ Added random delay: ${Math.round(delay/1000)}s`);
    }
  }

  async mouseMovementPatterns(page, context) {
    try {
      const patterns = [
        [100, 200, 300, 150, 250, 180],
        [200, 150, 250, 300, 180, 220],
        [150, 250, 200, 180, 300, 220],
        [300, 100, 200, 250, 150, 180],
        [250, 180, 300, 200, 150, 220]
      ];
      
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      
      for (let i = 0; i < pattern.length; i += 2) {
        const x = pattern[i];
        const y = pattern[i + 1];
        if (x !== undefined && y !== undefined) {
          await page.mouse.move(x * 2, y, { steps: 10 });
          await page.waitForTimeout(200 + Math.random() * 500);
        }
      }
      
      console.log('🖱️ Executed mouse movement pattern');
    } catch (error) {
      console.log('⚠️ Mouse movement error:', error.message);
    }
  }

  async switchSearchEngine(page, context) {
    if (!context.includes('google')) return;
    
    try {
      console.log('🔄 Switching search engine from Google...');
      
      // Navigate to alternative search engine
      const engines = [
        'https://www.bing.com',
        'https://duckduckgo.com',
        'https://search.yahoo.com',
        'https://yandex.com'
      ];
      
      const randomEngine = engines[Math.floor(Math.random() * engines.length)];
      await page.goto(randomEngine, { waitUntil: 'networkidle2' });
      
      console.log(`🌐 Switched to ${randomEngine}`);
      await page.waitForTimeout(5000);
      
    } catch (error) {
      console.log('⚠️ Search engine switch error:', error.message);
    }
  }

  async useDifferentGoogleDomain(page, context) {
    if (!context.includes('google')) return;
    
    try {
      const googleDomains = [
        'https://www.google.co.id',
        'https://www.google.co.uk',
        'https://www.google.ca',
        'https://www.google.com.au',
        'https://www.google.de',
        'https://www.google.fr'
      ];
      
      const randomDomain = googleDomains[Math.floor(Math.random() * googleDomains.length)];
      await page.goto(randomDomain, { waitUntil: 'networkidle2' });
      
      console.log(`🌍 Switched Google domain to ${randomDomain}`);
      
    } catch (error) {
      console.log('⚠️ Google domain switch error:', error.message);
    }
  }

  async simulateTypingMistakes(page, context) {
    if (!context.includes('google')) return;
    
    try {
      console.log('⌨️ Simulating typing mistakes...');
      
      // Focus search box
      await page.click('textarea[type="search"], input[type="text"]');
      await page.waitForTimeout(1000);
      
      // Type some characters
      const text = 'test search query';
      for (let i = 0; i < text.length; i++) {
        await page.keyboard.type(text[i], { delay: 50 + Math.random() * 150 });
        
        // Occasionally make mistake
        if (Math.random() < 0.1) {
          await page.keyboard.press('Backspace');
          await page.waitForTimeout(200);
          await page.keyboard.type(text[i]);
        }
      }
      
      // Delete and retype
      await page.waitForTimeout(1000);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Backspace');
      }
      
      await page.waitForTimeout(500);
      await page.keyboard.type('query');
      
      console.log('✅ Typing mistakes simulated');
      
    } catch (error) {
      console.log('⚠️ Typing simulation error:', error.message);
    }
  }
}

module.exports = BotHandler;