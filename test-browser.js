const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  let browser;
  const pageErrors = [];

  try {
    const launchArgs = process.env.CI ? ['--no-sandbox'] : [];
    browser = await puppeteer.launch({ headless: 'new', args: launchArgs });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.toString());
      pageErrors.push(err);
    });

    const viewports = [
      { name: 'iPhone SE', width: 320, height: 568 },
      { name: 'iPad Mini', width: 768, height: 1024 },
      { name: 'Desktop', width: 1440, height: 900 }
    ];

    const targets = [
      'tracking/index.html',
      'fray/index.html'
    ];

    for (const target of targets) {
      const fileUrl = 'file://' + path.resolve(__dirname, target);
      
      for (const vp of viewports) {
        console.log(`\n--- Testing ${target} [Viewport: ${vp.name}] ---`);
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(fileUrl, { waitUntil: 'networkidle0' });
      }
    }

    if (pageErrors.length > 0) {
      throw new Error(`Test failed with ${pageErrors.length} page errors.`);
    }
    
    console.log('\n✅ All tests passed successfully.');
  } catch (error) {
    console.error('TEST FAILED:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
