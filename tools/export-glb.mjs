// Export the model as a binary glTF with every part named, for Blender / the GLB studio.
// Usage: node tools/export-glb.mjs [--t 0 --out out/ibm-z16-a-frame.glb]
//   --t is the timeline second to export at: 0 = assembled, 57 = drawer exploded, 72 = DCM open.
import fs from 'node:fs';
import path from 'node:path';
import { openStage, parseArgs } from './browser.mjs';

const o = parseArgs({ t: 0, out: 'out/ibm-z16-a-frame.glb', width: 640, height: 360, gpu: false });
fs.mkdirSync(path.dirname(o.out), { recursive: true });
const { page, close } = await openStage(o);
const b64 = await page.evaluate((t) => window.__exportGlb(t), o.t);
fs.writeFileSync(o.out, Buffer.from(b64, 'base64'));
await close();
console.log(`wrote ${o.out} (${(fs.statSync(o.out).size / 1e6).toFixed(1)} MB)`);
