const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const fs = require('fs');

(async () => {
  let browser;
  let server;
  const pageErrors = [];

  try {
    // Start a simple local server to serve static files (resolving CORS issues in Puppeteer tests)
    server = http.createServer((req, res) => {
      let filePath = path.join(__dirname, '../../', req.url.split('?')[0]);
      if (filePath.endsWith('/')) {
        filePath += 'index.html';
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          const ext = path.extname(filePath).toLowerCase();
          let contentType = 'text/html';
          if (ext === '.css') contentType = 'text/css';
          else if (ext === '.js') contentType = 'application/javascript';
          else if (ext === '.json') contentType = 'application/json';
          else if (ext === '.svg') contentType = 'image/svg+xml';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
          
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });

    const PORT = 8080;
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`Started local static server on http://localhost:${PORT}`);

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
      '',
      'blog.html',
      'tracking/',
      'fray/'
    ];

    for (const target of targets) {
      const fileUrl = `http://localhost:${PORT}/${target}`;
      
      for (const vp of viewports) {
        console.log(`\n--- Testing ${target || 'index.html'} [Viewport: ${vp.name}] ---`);
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
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
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('Local static server stopped.');
    }
  }
})();
