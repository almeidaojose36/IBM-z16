// Dump the sound-effect cue list the story defines (out/cues.json), for tools/mix_audio.py.
import fs from 'node:fs';
import { openStage } from './browser.mjs';
const { page, close } = await openStage({ width: 320, height: 180 });
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/cues.json', JSON.stringify(await page.evaluate(() => window.__sfx)));
await close();
console.log('wrote out/cues.json');
