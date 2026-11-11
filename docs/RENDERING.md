# Rendering the video locally (1080p or 4K)

Instructions for a person or an AI agent rendering **"How Does a Mainframe Work? Inside the IBM z16"**
on a machine with a graphics card. Everything needed is in this repository: the 3D scene is code,
and the narration, music and sound effects are committed under `audio/`. No API keys are needed to render.

The output is `out/z16-how-a-mainframe-works.mp4` (about 20 min 11 s) plus `out/captions.srt`.

## 1. Requirements

| Tool | Version | Used for |
|---|---|---|
| Node.js | 20 or newer | scene, render tools |
| ffmpeg + ffprobe | any recent, on the PATH | encoding, audio |
| Python 3 + numpy | 3.9 or newer | soundtrack mix |
| A GPU | any recent discrete or Apple-silicon GPU | 4K needs about 4 GB of video memory |

## 2. Install

```bash
npm install
```

```bash
npm install --no-save playwright
```

```bash
npx playwright install chromium
```

```bash
python3 -m pip install numpy
```

## 3. Check that the GPU is used

```bash
node tools/stills.mjs --gpu --width 1920 --height 1080 --times 4,396,935 --dir out/test
```

The first line printed is `[renderer] …`. It must name your graphics card (for example
`ANGLE (NVIDIA …)`, `ANGLE (Apple, ANGLE Metal Renderer: Apple M2 …)`).
If it says **SwiftShader**, **llvmpipe** or "software", the GPU is not in use. Try, in this order:

1. Add `--headed` (shows a browser window; the most reliable way to get the GPU).
2. Linux: `Z16_ANGLE=vulkan node tools/stills.mjs --gpu …` or `Z16_ANGLE=gl …`.
3. Use an installed Chrome: `CHROME_PATH="/path/to/chrome" node tools/stills.mjs --gpu …`.

Open the three JPEGs in `out/test` and confirm they look right (card on a payment terminal, the open
processor drawer, the Telum chip floor plan) before starting the long render.

## 4. Build the soundtrack

```bash
node tools/cues.mjs
```

```bash
python3 tools/mix_audio.py
```

This writes `out/audio.wav` and `out/captions.srt`. It takes about a minute.

## 5. Render the picture

The render is split into one-minute chunks in `out/chunks/` and is **resumable**: if it stops, run the
same command again and it continues. Delete `out/chunks` before changing any setting.

1080p, 30 fps:

```bash
tools/render-all.sh
```

4K, 30 fps:

```bash
WIDTH=3840 HEIGHT=2160 tools/render-all.sh
```

Best quality 4K (supersampled edges; needs a strong GPU, roughly 3× slower):

```bash
WIDTH=3840 HEIGHT=2160 SCALE=1.5 tools/render-all.sh
```

Settings (environment variables): `WIDTH`, `HEIGHT`, `FPS` (30), `SCALE` (1), `QUALITY` (`high` or `draft`),
`CRF` (14; lower is larger and cleaner), `LEN` (chunk seconds, 60), `GPU` (1), `HEADED` (0), `BUDGET` (seconds, 0 = no limit).
On Windows run the script from Git Bash or WSL.

There are about 36,300 frames at 30 fps. Each frame is rendered, screenshotted and piped to ffmpeg, so
expect very roughly 0.1–0.3 s per frame at 1080p and 0.3–1 s at 4K on a GPU (1–10 hours in total).
Measure the first chunk and extrapolate.

No GPU? This works but is slow (many hours) and less polished:

```bash
GPU=0 QUALITY=draft SCALE=0.8 FPS=24 tools/render-all.sh
```

## 6. Join picture and sound

```bash
tools/assemble.sh
```

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate out/z16-how-a-mainframe-works.mp4
```

Expect one h264 stream at the size you chose, one aac stream, and a duration of about 1211 s.
Upload the MP4 to YouTube and add `out/captions.srt` as subtitles.

## 7. Quality options

| Option | Effect |
|---|---|
| `QUALITY=high` (default) | ambient occlusion, 4× MSAA, 8K shadow map, studio floor |
| `QUALITY=draft` | plain render, for CPU-only machines |
| `SCALE=1.5` or `2` | supersampling of the 3D layer |
| `Z16_QUERY="&bloom=0.2"` | optional glow pass. Check stills first: on some drivers it produces a white haze |
| `Z16_QUERY="&ao=0"` | turn ambient occlusion off |
| `Z16_QUERY="&bevel=0"` | sharp-edged boxes (faster to build) |

## 8. Review before the long render

One labelled frame per narration beat (113 frames) lands in `out/review`:

```bash
node tools/review.mjs --gpu --width 1920 --height 1080
```

To preview interactively, run `npm start` and open the printed address. `?t=396` jumps to a time,
"Free camera" lets you orbit.

## 9. Changing things

| Change | Then run |
|---|---|
| Camera, labels, animation (`src/story.js`) or models (`src/model/`) | re-render affected chunks (delete those `out/chunks/cNNN.mp4`); if sound cues moved, repeat step 4 |
| Narration text (`content/script.js`) | `ELEVENLABS_API_KEY=… node tools/voice.mjs` (re-records only changed lines and rewrites `content/timing.js`), then steps 4–6 in full, because all later timings shift |
| Music or effects | replace files in `audio/music` or `audio/sfx` (or edit `tools/music.sh`, `tools/sfx.sh`), then step 4 and step 6 |

## Troubleshooting

- **`Playwright is not installed`**: repeat the install commands in section 2.
- **Page never becomes ready / timeout**: run `npm start`, open the page in a normal browser and read the console.
- **Black or blank frames with `--gpu`**: use `--headed`, or another `Z16_ANGLE` backend.
- **Out of video memory at 4K**: use `SCALE=1`, or set `QUALITY=draft`.
- **Chunks of different sizes mixed**: delete `out/chunks` and start again; `out/chunks/settings.txt` records the last settings used.
