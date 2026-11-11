// Shared headless-Chromium launcher for the render and export tools.
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);

function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try { return require(name); } catch { /* try the next one */ }
  }
  throw new Error('Playwright is not installed. Run: npm install --no-save playwright && npx playwright install chromium');
}

/**
 * Opens the teardown page in render mode at the given size and waits until the scene is built.
 * gpu: use the machine's graphics card (otherwise software rendering). headed: show the browser window,
 * which is the most reliable way to get the GPU on some systems. quality: 'high' | 'draft'.
 */
export async function openStage({ width, height, gpu = false, scale = 1, quality = 'high', headed = false }) {
  const { chromium } = loadPlaywright();
  const server = await serve(0);
  const port = server.address().port;
  const args = ['--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars', '--force-color-profile=srgb',
    ...(gpu ? ['--enable-gpu', '--use-angle=' + (process.env.Z16_ANGLE ?? 'default')] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])];
  const browser = await chromium.launch({ args, headless: !headed, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/?render&scale=${scale}&quality=${quality}${process.env.Z16_QUERY ?? ''}`);
  await page.waitForFunction('window.__ready === true', null, { timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  const renderer = await page.evaluate(() => window.__gpu);
  console.error(`[renderer] ${renderer}${/swiftshader|llvmpipe|software/i.test(renderer) ? '  (software: slow)' : ''}`);
  const close = async () => { await browser.close(); server.close(); };
  return { page, close, renderer };
}

export function parseArgs(defaults) {
  const out = { ...defaults };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const k = a[i].slice(2);
    if (typeof defaults[k] === 'boolean') out[k] = true;
    else out[k] = typeof defaults[k] === 'number' ? Number(a[++i]) : a[++i];
  }
  return out;
}
