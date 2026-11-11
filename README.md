# IBM z16 teardown

A procedural 3D teardown animation of the IBM z16 (machine type 3931, model A01), built with
three.js. The whole model is code: there are no imported meshes. The animation runs in a browser
and renders frame by frame to video.

The current edit is a 20-minute narrated video, *How Does a Mainframe Work? Inside the IBM z16*. It
follows one card payment through the machine: frame → I/O drawer → crypto card → processor drawer →
power → memory → water cooling → dual chip module → Telum chip → a single transistor → the on-chip
AI accelerator → how the chips scale into one computer → why it never stops.

The picture is keyed to the narration: each sentence is one "beat" in `content/script.js`, the
recorded length of each beat is in `content/timing.js`, and every move in `src/story.js` refers to
beat ids. Change the script, re-record, and the edit follows.

## Run it

Needs Node.js 20 or newer.

```bash
npm install
```

```bash
npm start
```

Then open <http://localhost:8080>. The bar at the bottom plays, pauses and scrubs. **Free camera**
lets you orbit at any moment. **Export .glb** saves the model as it stands at the current time.
`?t=57` in the address opens paused at that second.

## Make the video

Needs `ffmpeg`, Python 3 with numpy, and Playwright's Chromium:

```bash
npm install --no-save playwright
```

```bash
npx playwright install chromium
```

The steps, in order. The audio files are already in `audio/`, so steps 1 and 2 are only needed
after changing the script, voice, music or effects.

1. **Narration** (ElevenLabs, needs `ELEVENLABS_API_KEY`). Re-records only the beats whose text changed,
   then rewrites `content/timing.js`:

   ```bash
   node tools/voice.mjs --voice mBuVX55i5Lt3LEkHr36R
   ```

2. **Music and effects** (ElevenLabs). Each file is skipped if it already exists; delete one to regenerate it:

   ```bash
   tools/music.sh && tools/sfx.sh
   ```

3. **Soundtrack**. Mixes narration, music (ducked under the voice) and effects into `out/audio.wav`,
   and writes `out/captions.srt` for YouTube:

   ```bash
   node tools/cues.mjs && python3 tools/mix_audio.py
   ```

4. **Picture**. Renders in two-minute chunks to `out/chunks/` and can be stopped and re-run:

   ```bash
   tools/render-all.sh 120 24 0.8
   ```

   The arguments are chunk length in seconds, frames per second, and 3D scale. At scale 0.8 the 3D is
   drawn at 1536×864 and upscaled to 1080p while text stays sharp, which keeps software rendering near
   0.55 s per frame (about 4.5 hours for the whole video). On a machine with a GPU, edit the script to
   pass `--gpu` to `render-video.mjs` and use scale 1.

5. **Join**:

   ```bash
   tools/assemble.sh
   ```

`node tools/review.mjs` writes one labelled frame per narration beat to `out/review/`, which is the
quickest way to check an edit. `node tools/render-video.mjs --from 715 --to 745` renders any part.

Other tools:

- `node tools/stills.mjs --times 3,45,77` writes JPEG stills to `out/stills/` (thumbnails).
- `node tools/beauty.mjs` writes caption-free exterior shots to `out/exterior/`.
- `node tools/export-glb.mjs --t 0` writes `out/ibm-z16-a-frame.glb` for Blender. Every part is a named node.

## Where things are

| File | What it holds |
|---|---|
| `content/script.js` | The narration, one beat per sentence or two |
| `content/timing.js` | Beat start times and lengths, generated from the recorded audio |
| `src/story.js` | The edit: every move, camera shot, label and sound cue, keyed to beat ids |
| `src/model/extras.js` | Card reader, transistor close-up, the travelling payment light, water flow, highlights |
| `audio/` | Narration clips, music beds and sound effects |
| `src/model/cpcDrawer.js` | CPC drawer, dual chip module, cold plates |
| `src/model/rack.js` | Frame, doors, PCIe+ I/O drawer, radiator unit, PDUs, hoses, SMP9 cables |
| `src/kit.js` | Materials, textures (including the Telum floor plan), geometry helpers |
| `src/timeline.js` | Deterministic timeline and camera path |
| `docs/RESEARCH.md` | Hardware facts with sources, and what in the model is an estimate |

## Accuracy

Counts, positions and specifications follow the *IBM z16 (3931) Technical Guide* (SG24-8951).
Outer dimensions, the cover styling and fine detail are estimates from photographs, because IBM
does not publish mechanical drawings. `docs/RESEARCH.md` lists which is which.

This is an independent educational model. It is not affiliated with or endorsed by IBM. IBM,
IBM Z, z16 and Telum are trademarks of International Business Machines Corporation.
