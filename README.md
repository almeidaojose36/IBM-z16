# IBM z16 teardown

A procedural 3D teardown animation of the IBM z16 (machine type 3931, model A01), built with
three.js. The whole model is code: there are no imported meshes. The animation runs in a browser
and renders frame by frame to video.

The 96-second sequence goes: closed frame → covers off → interior tour → rear and a Crypto
Express8S card → CPC drawer out → cover off → exploded drawer → cold plates off → dual chip
module → thermal cap off → Telum chip floor plan → reassembly.

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

## Render the video

Rendering needs `ffmpeg` and Playwright's Chromium:

```bash
npm install --no-save playwright
```

```bash
npx playwright install chromium
```

```bash
npm run render
```

That writes `out/z16-teardown.mp4` at 1920×1080, 30 fps. Options:

| Option | Meaning |
|---|---|
| `--width 3840 --height 2160` | Any 16:9 size. Captions and labels scale with it |
| `--fps 60` | Frame rate |
| `--from 42 --to 58` | Render only part of the timeline |
| `--crf 14` | x264 quality (lower is better) |
| `--gpu` | Use the machine's GPU instead of software rendering. Much faster on a desktop |
| `--out file.mp4` | Output path |

Software rendering takes about one second per 1080p frame. `npm run render:preview` makes a
quick 720p, 24 fps version.

Other tools:

- `node tools/stills.mjs --times 3,45,77` writes JPEG stills to `out/stills/` (thumbnails).
- `node tools/beauty.mjs` writes caption-free exterior shots (front and both three-quarter views) to `out/exterior/`.
- `node tools/export-glb.mjs --t 0` writes `out/ibm-z16-a-frame.glb` for Blender. Every part is a
  named node. `--t 57` exports the exploded drawer, `--t 72` the opened DCM.

## Where things are

| File | What it holds |
|---|---|
| `src/story.js` | The edit: every move, camera key, caption and label, in seconds. Change the video here |
| `src/model/cpcDrawer.js` | CPC drawer, dual chip module, cold plates |
| `src/model/rack.js` | Frame, doors, PCIe+ I/O drawer, radiator unit, PDUs, hoses, SMP9 cables |
| `src/kit.js` | Materials, textures (including the Telum floor plan), geometry helpers |
| `src/timeline.js` | Deterministic timeline and camera path |
| `docs/RESEARCH.md` | Hardware facts with sources, and what in the model is an estimate |
| `docs/NARRATION.md` | Voice-over script timed to the shots |

## Accuracy

Counts, positions and specifications follow the *IBM z16 (3931) Technical Guide* (SG24-8951).
Outer dimensions, the cover styling and fine detail are estimates from photographs, because IBM
does not publish mechanical drawings. `docs/RESEARCH.md` lists which is which.

This is an independent educational model. It is not affiliated with or endorsed by IBM. IBM,
IBM Z, z16 and Telum are trademarks of International Business Machines Corporation.
