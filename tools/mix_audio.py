#!/usr/bin/env python3
"""Mix narration, music and sound effects into out/audio.wav, and write out/captions.srt.

Usage: node tools/cues.mjs && python3 tools/mix_audio.py
Needs ffmpeg and numpy. Narration timing comes from content/timing.js, effect cues from out/cues.json.
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
db = lambda x: 10 ** (x / 20)

def load(path, tempo=None):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), *(['-af', f'atempo={tempo}'] if tempo else []), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float32)

def norm(a, peak_db):            # peak-normalise a clip
    p = np.abs(a).max()
    return a * (db(peak_db) / p) if p > 0 else a

def place(track, clip, t, gain=1.0):
    i = int(round(t * SR))
    if i >= len(track): return
    n = min(len(clip), len(track) - i)
    track[i:i + n] += clip[:n] * gain

timing = json.loads(re.search(r'TIMING = (\{.*\});', (ROOT / 'content/timing.js').read_text(), re.S).group(1))
total = timing['total']
N = int(total * SR)
ch = {k: v['start'] for k, v in timing['chapters'].items()}

# ---- narration
vo = np.zeros((N, 2), np.float32)
for bid, b in timing['beats'].items():
    place(vo, norm(load(ROOT / f'audio/vo/{bid}.mp3'), -3), b['start'])

# ---- music: five beds cross-faded at chapter boundaries
beds = [('a_hook', 0, ch['io']), ('b_machine', ch['io'], ch['memory']), ('c_flow', ch['memory'], ch['telum']), ('d_wonder', ch['telum'], ch['scale']), ('e_resolve', ch['scale'], total)]
XF = 4.0
music = np.zeros((N, 2), np.float32)
for i, (name, a, b) in enumerate(beds):
    clip = norm(load(ROOT / f'audio/music/{name}.mp3', 0.93 if name == 'd_wonder' else None), -6)   # d is a little short: slow it 7%
    t0 = max(0, a - XF / 2) if i else 0
    t1 = min(total, b + XF / 2)
    need = int((t1 - t0) * SR)
    if len(clip) < need:                                   # loop with a short cross-fade if a bed is too short
        reps = [clip]
        while sum(map(len, reps)) < need + SR: reps.append(clip)
        clip = np.concatenate(reps)
    clip = clip[:need].copy()
    f = int(XF * SR)
    ramp = np.linspace(0, 1, f, dtype=np.float32)[:, None]
    clip[:f] *= np.sin(ramp * np.pi / 2) if i else ramp ** 0.5   # equal-power cross-fade
    clip[-f:] *= np.cos(ramp * np.pi / 2)
    place(music, clip, t0)

# duck the music under the narration (envelope computed at 100 Hz, then interpolated)
HOP = SR // 100
frames = np.abs(vo).max(axis=1)[: (N // HOP) * HOP].reshape(-1, HOP).max(axis=1)
active = (frames > db(-38)).astype(np.float32)
def smooth(x, n):                                           # moving average over n frames
    c = np.cumsum(np.concatenate([np.zeros(n // 2 + 1, np.float32), x, np.full(n - n // 2 - 1, x[-1], np.float32)]))
    return (c[n:] - c[:-n]) / n
active = np.minimum(1, smooth(active, 45) * 45 / 8)          # hold across short gaps between words
active = smooth(smooth(active, 40), 40)                      # ~0.4 s attack and release
gain = db(-11.5) + (db(-22) - db(-11.5)) * active
music *= np.interp(np.arange(N), np.arange(len(gain)) * HOP + HOP / 2, gain).astype(np.float32)[:, None]

# ---- sound effects
LEVEL = {'tick': -24, 'click': -17, 'whoosh': -17, 'data': -17, 'servo': -16, 'slide': -13, 'door': -14, 'lift': -16, 'thud': -13, 'beep': -14, 'approved': -10,
         'alert': -17, 'water': -17, 'chime': -15, 'compute': -15, 'zap': -17, 'riser': -14, 'chapter': -11, 'impact': -9}
clips = {p.stem: norm(load(p), -1) for p in (ROOT / 'audio/sfx').glob('*.mp3')}
sfx = np.zeros((N, 2), np.float32)
for c in json.loads((ROOT / 'out/cues.json').read_text()):
    if c['name'] in clips:
        place(sfx, clips[c['name']], max(0, c['t'] - 0.03), db(LEVEL.get(c['name'], -16)) * c.get('gain', 1))

# ---- master
mix = vo * db(-1.5) + music + sfx
fade = int(2.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[:, None]
mix = np.tanh(mix * 1.1) / 1.1                               # gentle soft clip
out = ROOT / 'out'
out.mkdir(exist_ok=True)
p = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-ar', '48000', str(out / 'audio.wav')], stdin=subprocess.PIPE)
p.communicate(mix.tobytes())

# ---- captions (SRT) from the script
script = (ROOT / 'content/script.js').read_text()
texts = dict(re.findall(r"\{ id: '(\w+)', text: '((?:[^'\\]|\\.)*)'", script))
def ts(t): h, r = divmod(t, 3600); m, s = divmod(r, 60); return f'{int(h):02}:{int(m):02}:{s:06.3f}'.replace('.', ',')
lines = []
for n, (bid, b) in enumerate(timing['beats'].items(), 1):
    lines.append(f"{n}\n{ts(b['start'])} --> {ts(b['start'] + b['dur'])}\n{texts[bid].replace(chr(92) + chr(39), chr(39))}\n")
(out / 'captions.srt').write_text('\n'.join(lines))
print(f'wrote out/audio.wav ({total / 60:.2f} min) and out/captions.srt')
