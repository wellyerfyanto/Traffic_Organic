class BotHandler {
  constructor() {
    this.detectionCount = 0;
    this.strategies = [
      this.changeUserAgent,
      this.changeViewport,
      this.simulateHumanInput,
      this.useProxyRotation,
      this.handleCaptcha,
      this.clearCookies,
      this.randomDelays,
      this.mouseMovementPatterns
    ];
  }

  async handleDetection(page, context = 'unknown') {
    this.detectionCount++;
    console.log(`🤖 Bot detected in ${context}. Total detections: ${this.detectionCount}`);
    
    // Pilih 2-4 strategi random
    const selectedStrategies = this.strategies
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 3));
    
    for (const strategy of selectedStrategies) {
      try {
        await strategy.call(this, page);
        await page.waitForTimeout(2000 + Math.random() * 3000);
      } catch (error) {
        console.log(`Strategy error: ${error.message}`);
      }
    }
    
    return this.detectionCount;
  }

  async changeUserAgent(page) {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];
    const newUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(newUA);
    console.log('🔄 Changed User Agent');
  }

  async changeViewport(page) {
    const width = 1200 + Math.floor(Math.random() * 400);
    const height = 800 + Math.floor(Math.random() * 400);
    await page.setViewport({ width, height });
    console.log(`🔄 Changed viewport to ${width}x${height}`);
  }

  async simulateHumanInput(page) {
    // Simulasi keyboard dan mouse
    await page.mouse.move(
      Math.random() * 500,
      Math.random() * 300,
      { steps: 20 + Math.random() * 30 }
    );
    
    await page.waitForTimeout(500 + Math.random() * 1000);
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200 + Math.random() * 500);
    
    console.log('👤 Simulated human input');
  }

  async useProxyRotation(page) {
    console.log('🔀 Proxy rotation strategy (would change proxy in real implementation)');
  }

  async handleCaptcha(page) {
    try {
      // Cek jika ada plugin recaptcha
      if (typeof page.solveRecaptchas === 'function') {
        await page.solveRecaptchas();
        console.log('✅ Attempted to solve captcha');
      } else {
        console.log('⚠️ No recaptcha plugin available');
      }
    } catch (error) {
      console.log('⚠️ Captcha handling error:', error.message);
    }
  }

  async clearCookies(page) {
    try {
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.send('Network.clearBrowserCache');
      console.log('🧹 Cleared cookies and cache');
    } catch (error) {
      console.log('⚠️ Error clearing cookies:', error.message);
    }
  }

  async randomDelays(page) {
    const delay = 5000 + Math.random() * 10000;
    await page.waitForTimeout(delay);
    console.log(`⏰ Added random delay: ${Math.round(delay/1000)}s`);
  }

  async mouseMovementPatterns(page) {
    try {
      const patterns = [
        [100, 200, 300, 150, 250, 180],
        [200, 150, 250, 300, 180, 220],
        [150, 250, 200, 180, 300, 220]
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
}

module.exports = BotHandler;