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
    const ROOT_DIR = path.resolve(__dirname, '../../');
    server = http.createServer((req, res) => {
      let filePath = path.resolve(ROOT_DIR, '.' + req.url.split('?')[0]);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      // Security: Prevent directory traversal
      if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden');
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
    // PUPPETEER_EXECUTABLE_PATH, when set, is honoured by puppeteer.launch itself.
    browser = await puppeteer.launch({ headless: true, args: launchArgs });
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
      'blog.html'
    ];

    for (const target of targets) {
      const fileUrl = `http://localhost:${PORT}/${target}`;
      
      for (const vp of viewports) {
        console.log(`\n--- Testing ${target || 'index.html'} [Viewport: ${vp.name}] ---`);
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // What a reader must be able to see, and that nothing runs past the
        // viewport (html clips overflow, so only a measurement catches it).
        const problems = await page.evaluate((isReader) => {
            const found = [];
            const count = sel => document.querySelectorAll(sel).length;
            if (isReader) {
                if (count('.article-list-item') === 0) found.push('reader: the paper list is empty');
                if (count('.research-section') === 0) found.push('reader: the open paper has no summary sections');
                if (!document.getElementById('post-title').textContent.trim()) found.push('reader: the paper has no title');
            } else {
                if (count('.paper-card') === 0) found.push('home: no papers rendered');
                if (count('.project-card') === 0) found.push('home: no tools rendered');
            }
            if (count('.error-state') > 0) found.push('an error state is showing');
            const width = document.documentElement.clientWidth;
            document.querySelectorAll('main, main section, .masthead-inner, .site-footer, .article-view').forEach((el) => {
                const box = el.getBoundingClientRect();
                if (box.width && box.right > width + 1) {
                    found.push(`${el.id || el.className} runs ${Math.round(box.right - width)}px past the viewport`);
                }
            });
            return found;
        }, target === 'blog.html');
        problems.forEach((problem) => {
            console.log('ASSERTION FAILED:', problem);
            pageErrors.push(new Error(`${target || 'index.html'} @ ${vp.name}: ${problem}`));
        });
      }
    }

    if (pageErrors.length > 0) {
      throw new Error(`Test failed with ${pageErrors.length} page error(s) or failed assertion(s).`);
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
