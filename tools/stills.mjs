// Render still frames at the given times. Usage: node tools/stills.mjs --times 3,20,45 [--width 1920 --height 1080 --dir out/stills]
import fs from 'node:fs';
import path from 'node:path';
import { openStage, parseArgs } from './browser.mjs';

const o = parseArgs({ width: 1920, height: 1080, times: '3,16,29,37,45,55,63,70,77,93', dir: 'out/stills', gpu: false, headed: false, scale: 1, quality: 'high' });
fs.mkdirSync(o.dir, { recursive: true });
const { page, close } = await openStage(o);
for (const t of String(o.times).split(',').map(Number)) {
  await page.evaluate((x) => window.__setTime(x), t);
  const file = path.join(o.dir, `t${String(t).padStart(5, '0')}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
  console.log(file);
}
await close();
