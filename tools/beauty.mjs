// Exterior beauty shots without captions. Usage: node tools/beauty.mjs [--dir out/exterior --width 1200 --height 1500]
import fs from 'node:fs';
import path from 'node:path';
import { openStage, parseArgs } from './browser.mjs';

const o = parseArgs({ width: 1200, height: 1500, dir: 'out/exterior', gpu: false });
fs.mkdirSync(o.dir, { recursive: true });
const { page, close } = await openStage(o);
const views = { front: [[0.25, 1.05, 6.2], [0, 1.02, 0]], 'three-quarter-left': [[-3.4, 1.5, 5.0], [0, 1.0, 0]], 'three-quarter-right': [[3.4, 1.5, 5.0], [0, 1.0, 0]] };
for (const [name, [pos, look]] of Object.entries(views)) {
  await page.evaluate(({ pos, look }) => window.__beauty(pos, look), { pos, look });
  const file = path.join(o.dir, `${name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
  console.log(file);
}
await close();
