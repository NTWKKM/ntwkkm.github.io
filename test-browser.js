const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  console.log('--- Testing tracking/index.html ---');
  await page.goto('file:///Users/ntwkkm/ntwkkm.github.io/tracking/index.html', { waitUntil: 'networkidle0' });
  
  console.log('--- Testing fray/index.html ---');
  await page.goto('file:///Users/ntwkkm/ntwkkm.github.io/fray/index.html', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
