import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/tests/audio/`);
  await page.waitForFunction(() => typeof window.verifyAudio === 'function');
  const results = await page.evaluate(() => window.verifyAudio());
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
