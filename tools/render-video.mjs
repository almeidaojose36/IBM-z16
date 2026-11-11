// Render the teardown to an MP4, frame by frame (deterministic, any resolution).
// Usage: node tools/render-video.mjs [--width 1920 --height 1080 --fps 30 --out out/z16-teardown.mp4]
//        [--from 0 --to 96] [--crf 16] [--gpu]
// Needs ffmpeg on the PATH and Playwright's Chromium (see README).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { openStage, parseArgs } from './browser.mjs';

const o = parseArgs({ width: 1920, height: 1080, fps: 30, out: 'out/z16-teardown.mp4', from: 0, to: -1, crf: 16, gpu: false, scale: 1 });
fs.mkdirSync(path.dirname(o.out), { recursive: true });

const { page, close } = await openStage(o);
const duration = await page.evaluate(() => window.__duration);
const end = o.to < 0 ? duration : Math.min(o.to, duration);
const frames = Math.round((end - o.from) * o.fps);

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(o.fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(o.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', o.out], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((ok, fail) => ff.on('close', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg exited with ${c}`)))));

const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.__setTime(t), o.from + i / o.fps);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`\rframe ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s `);
}
ff.stdin.end();
await done;
await close();
console.log(`\nwrote ${o.out} (${frames} frames, ${o.width}x${o.height} @ ${o.fps} fps)`);
