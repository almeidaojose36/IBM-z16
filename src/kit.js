// Small modelling kit: shared geometry, PBR palettes, canvas textures.
import * as THREE from 'three';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 28);

/** Box of w×h×d metres centred at (x,y,z). Shares one geometry across the scene. */
export function box(w, h, d, mat, x = 0, y = 0, z = 0, name) {
  const m = new THREE.Mesh(UNIT_BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

/** Cylinder of radius r and length h along `axis` ('x' | 'y' | 'z'). */
export function cyl(r, h, mat, x = 0, y = 0, z = 0, axis = 'y', name) {
  const m = new THREE.Mesh(UNIT_CYL, mat);
  m.scale.set(r, h, r);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

export function group(name, ...children) {
  const g = new THREE.Group();
  g.name = name;
  for (const c of children) if (c) g.add(c);
  return g;
}

/** Smooth hose through the given points. */
export function hose(points, r, mat, name) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.35);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 8), r, 10), mat);
  m.castShadow = m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

// ---------------------------------------------------------------- textures

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function finish(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** Hex-perforated sheet metal alpha mask (white = metal, black = hole). */
export function perforationTexture(repeat) {
  const [c, g] = canvas(128, 222);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 222);
  g.fillStyle = '#000';
  const dot = (x, y) => { g.beginPath(); g.arc(x, y, 40, 0, 7); g.fill(); };
  for (const [x, y] of [[0, 0], [128, 0], [64, 111], [0, 222], [128, 222]]) dot(x, y);
  return finish(c, { repeat, srgb: false });
}

/** Radiator fins / heat-sink stripes. */
export function finTexture(repeat) {
  const [c, g] = canvas(64, 64);
  g.fillStyle = '#9aa3ad'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#20252b'; g.fillRect(0, 0, 26, 64);
  return finish(c, { repeat });
}

/** A text plate (labels, badges). */
export function labelTexture(text, { w = 512, h = 128, bg = '#0c0f13', fg = '#e9eef5', font = '600 64px "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif', accent } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (accent) { g.fillStyle = accent; g.fillRect(0, h - 10, w, 10); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2);
  return finish(c);
}

/** Faceplate with a row of ports: kind = 'rj45' | 'lc' | 'qsfp'. */
export function portTexture(n, kind = 'lc', label = '') {
  const [c, g] = canvas(1024, 96);
  g.fillStyle = '#b9bec4'; g.fillRect(0, 0, 1024, 96);
  const col = { rj45: '#15181c', lc: '#2a6fd6', qsfp: '#22262b' }[kind];
  const pw = kind === 'qsfp' ? 90 : 48, gap = (880 - n * pw) / (n + 1);
  for (let i = 0; i < n; i++) {
    const x = 120 + gap + i * (pw + gap);
    g.fillStyle = '#0a0b0d'; g.fillRect(x - 3, 21, pw + 6, 54);
    g.fillStyle = col; g.fillRect(x, 24, pw, 48);
    g.fillStyle = '#39d98a'; g.fillRect(x + 4, 78, 8, 6);
  }
  g.fillStyle = '#1a1d21'; g.font = '600 26px Arial'; g.textBaseline = 'middle';
  g.fillText(label, 10, 48);
  return finish(c);
}

/**
 * Telum processor floor plan, after Figure 2-14 of the IBM z16 (3931) Technical Guide:
 * eight cores in two columns, each beside its 32 MB L2, ringed by the bus and I/O blocks.
 */
export function telumDieTexture() {
  const S = 2048;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#10131a'; g.fillRect(0, 0, S, S);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const block = (x, y, w, h, hue, label, style = 'logic') => {
    const X = x * S, Y = y * S, W = w * S, H = h * S;
    g.fillStyle = `hsl(${hue} 45% 22%)`; g.fillRect(X, Y, W, H);
    if (style === 'sram') {
      // dense regular SRAM arrays
      g.fillStyle = `hsl(${hue} 55% 34%)`;
      const nx = 8, ny = 6, cw = W / nx, ch = H / ny;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) g.fillRect(X + i * cw + 3, Y + j * ch + 3, cw - 6, ch - 6);
      g.strokeStyle = `hsl(${hue} 60% 50% / .35)`; g.lineWidth = 1;
      for (let j = 0; j < H; j += 5) { g.beginPath(); g.moveTo(X, Y + j); g.lineTo(X + W, Y + j); g.stroke(); }
    } else {
      // random-logic macro look
      for (let i = 0; i < Math.max(14, W * H / 900); i++) {
        const bw = (0.04 + rnd() * 0.3) * W, bh = (0.04 + rnd() * 0.22) * H;
        g.fillStyle = `hsl(${hue + rnd() * 30 - 15} ${40 + rnd() * 30}% ${20 + rnd() * 34}%)`;
        g.fillRect(X + rnd() * (W - bw), Y + rnd() * (H - bh), bw, bh);
      }
    }
    g.strokeStyle = 'rgba(255,214,90,.9)'; g.lineWidth = 4; g.strokeRect(X + 2, Y + 2, W - 4, H - 4);
    if (label) {
      const lines = label.split('\n');
      const size = Math.min(H / (lines.length + 0.6), W / (Math.max(...lines.map((l) => l.length)) * 0.62), 76);
      g.font = `700 ${size}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
      lines.forEach((l, i) => {
        const ty = Y + H / 2 + (i - (lines.length - 1) / 2) * size * 1.05;
        g.fillStyle = 'rgba(0,0,0,.75)'; g.fillText(l, X + W / 2 + 3, ty + 3);
        g.fillStyle = '#ffe27a'; g.fillText(l, X + W / 2, ty);
      });
    }
  };

  for (let i = 0; i < 6; i++) block(0.09 + i * 0.13, 0.012, 0.12, 0.06, 172, 'X-Bus');
  block(0.24, 0.085, 0.54, 0.085, 180, 'X-FBC');
  block(0.89, 0.10, 0.10, 0.06, 200, 'NXU');
  block(0.01, 0.09, 0.09, 0.12, 265, 'PBU');
  block(0.01, 0.85, 0.09, 0.11, 265, 'PBU');
  block(0.01, 0.23, 0.085, 0.28, 140, 'PCIe\n0');
  block(0.01, 0.54, 0.085, 0.28, 140, 'PCIe\n1');
  for (let r = 0; r < 4; r++) {
    const y = 0.185 + r * 0.18;
    block(0.115, y, 0.16, 0.17, 24, `Core ${r * 2}`);
    block(0.285, y, 0.215, 0.17, 214, 'L2\n32 MB', 'sram');
    block(0.51, y, 0.215, 0.17, 214, 'L2\n32 MB', 'sram');
    block(0.735, y, 0.16, 0.17, 24, `Core ${r * 2 + 1}`);
  }
  block(0.925, 0.18, 0.065, 0.26, 172, 'A-\nBus');
  block(0.925, 0.46, 0.065, 0.24, 300, 'MC');
  block(0.925, 0.74, 0.065, 0.13, 300, 'MCU');
  block(0.115, 0.915, 0.215, 0.075, 330, 'AIU');
  block(0.345, 0.915, 0.16, 0.075, 172, 'M-Bus');
  block(0.515, 0.915, 0.16, 0.075, 172, 'M-Bus');
  block(0.69, 0.905, 0.30, 0.085, 300, 'MCD');
  return finish(c);
}

// ---------------------------------------------------------------- materials

/**
 * A palette of PBR materials. Build one palette per independently fadeable assembly
 * (rack, doors, hero drawer) so `fadePalette` can ghost one without touching the others.
 */
export function makePalette() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const perf = perforationTexture([1, 1]);
  return {
    steel: std({ color: 0x8f969e, metalness: 0.85, roughness: 0.45 }),
    steelDark: std({ color: 0x4a5058, metalness: 0.8, roughness: 0.5 }),
    zinc: std({ color: 0x6f767e, metalness: 0.75, roughness: 0.55 }),
    black: std({ color: 0x121418, metalness: 0.35, roughness: 0.6 }),
    blackGloss: std({ color: 0x0b0c0f, metalness: 0.6, roughness: 0.28 }),
    plastic: std({ color: 0x1b1e23, metalness: 0.0, roughness: 0.75 }),
    blue: std({ color: 0x1f6fff, metalness: 0.1, roughness: 0.45 }),
    ibmBlue: std({ color: 0x0f62fe, emissive: 0x0f62fe, emissiveIntensity: 1.6, roughness: 0.4 }),
    pcb: std({ color: 0x0f4a2c, metalness: 0.15, roughness: 0.55 }),
    pcbDark: std({ color: 0x10261c, metalness: 0.15, roughness: 0.6 }),
    chip: std({ color: 0x0c0d0f, metalness: 0.2, roughness: 0.4 }),
    gold: std({ color: 0xd9a441, metalness: 1.0, roughness: 0.3 }),
    copper: std({ color: 0xc8733a, metalness: 1.0, roughness: 0.28 }),
    nickel: std({ color: 0xc9c2b4, metalness: 0.95, roughness: 0.3 }),
    alu: std({ color: 0xd4d8dd, metalness: 0.9, roughness: 0.35 }),
    hose: std({ color: 0x17181b, metalness: 0.0, roughness: 0.85 }),
    hoseBlue: std({ color: 0x1b5fd9, metalness: 0.0, roughness: 0.6 }),
    hoseRed: std({ color: 0xc8322b, metalness: 0.0, roughness: 0.6 }),
    orange: std({ color: 0xf08a1c, metalness: 0.1, roughness: 0.5 }),
    magenta: std({ color: 0xd4279a, metalness: 0.1, roughness: 0.5 }),
    cable: std({ color: 0x2c7be0, metalness: 0.0, roughness: 0.7 }),
    yellow: std({ color: 0xe3b81e, metalness: 0.0, roughness: 0.7 }),
    led: std({ color: 0x39d98a, emissive: 0x39d98a, emissiveIntensity: 2.0 }),
    perf: std({ color: 0x15171b, metalness: 0.7, roughness: 0.5, alphaMap: perf, alphaTest: 0.5, side: THREE.DoubleSide }),
    perfSteel: std({ color: 0x565c64, metalness: 0.85, roughness: 0.45, alphaMap: perf, alphaTest: 0.5, side: THREE.DoubleSide }),
    silicon: std({ color: 0x3d4350, metalness: 0.9, roughness: 0.22 }),
    _perfTex: perf,
  };
}

/** Clone of a palette material with a texture map (kept in the palette so it fades with it). */
export function textured(pal, base, map, extra = {}) {
  const m = base.clone();
  m.map = map; m.color.set(0xffffff);
  Object.assign(m, extra);
  pal['_t' + Object.keys(pal).length] = m;
  return m;
}

/** Ghost a whole palette: k = 1 solid, 0 gone. */
export function fadePalette(pal, k) {
  for (const m of Object.values(pal)) {
    if (!m.isMaterial) continue;
    m.transparent = k < 0.999;
    m.opacity = k;
    m.depthWrite = k > 0.5;
  }
}
