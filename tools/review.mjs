// Review sheets: one frame per narration beat (at a fraction of the beat), labelled with the beat id.
// Usage: node tools/review.mjs [--at 0.6] [--only chapterId] [--dir out/review]
import fs from 'node:fs';
import path from 'node:path';
import { openStage, parseArgs } from './browser.mjs';
import { CHAPTERS } from '../content/script.js';
import { TIMING } from '../content/timing.js';

const o = parseArgs({ width: 960, height: 540, at: 0.6, only: '', dir: 'out/review', gpu: false, headed: false, scale: 1, quality: 'high' });
fs.rmSync(o.dir, { recursive: true, force: true }); fs.mkdirSync(o.dir, { recursive: true });
const { page, close } = await openStage(o);
let n = 0;
for (const c of CHAPTERS) {
  if (o.only && !String(o.only).split(',').includes(c.id)) continue;
  for (const b of c.beats) {
    const { start, dur } = TIMING.beats[b.id], t = start + dur * o.at;
    await page.evaluate(({ t, label }) => {
      window.__setTime(t);
      let e = document.getElementById('rv'); if (!e) { e = document.createElement('div'); e.id = 'rv'; e.style.cssText = 'position:fixed;right:8px;top:6px;font:700 20px monospace;color:#ff0;background:#000a;padding:2px 6px;z-index:9'; document.body.append(e); }
      e.textContent = label;
    }, { t, label: `${b.id} @${t.toFixed(1)}` });
    await page.screenshot({ path: path.join(o.dir, `${String(n++).padStart(3, '0')}-${b.id}.jpg`), type: 'jpeg', quality: 80 });
  }
}
await close();
console.log(n, 'frames');
