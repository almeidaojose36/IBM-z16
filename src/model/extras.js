// Supporting props for the long-form video: the card reader, the transistor close-up,
// the travelling "payment" light, water-flow beads and floor-plan highlights.
import * as THREE from 'three';
import { box, cyl, group, glowTexture, coreDetailTexture } from '../kit.js';

// ---------------------------------------------------------------- payment terminal and card

/** Rounded-rectangle outline in the XY plane, centred. */
function roundedShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

/** Rounded slab lying in the XZ plane: w along x, d along z, t thick along y (centred), with bevelled rims. */
function slab(w, d, t, r, mat, bevel = Math.min(t * 0.3, 0.0015)) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w - 2 * bevel, d - 2 * bevel, Math.max(r - bevel, 0.0002)), { depth: t - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 20 });
  g.translate(0, 0, -(t - 2 * bevel) / 2); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
  return m;
}

/** Flat rounded rectangle facing +y with 0..1 texture coordinates (u along x, v up = −z). */
function roundedPlane(w, d, r, mat) {
  const g = new THREE.ShapeGeometry(roundedShape(w, d, r), 16);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / d + 0.5);
  g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}

/** The four-arc contactless symbol, centred on (x, y), opening to the right. */
function contactless(g, x, y, size, color, width = size * 0.09) {
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x - size * 0.45, y, size * (0.22 + i * 0.2), -0.62, 0.62); g.stroke(); }
  g.restore();
}

const SANS = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';

/** Terminal screens, 9:16 portrait. */
function terminalScreen(state) {
  return tex(720, 1280, (g, W, H) => {
    const ok = state === 'ok';
    const bg = g.createLinearGradient(0, 0, 0, H);
    if (ok) { bg.addColorStop(0, '#0f9d58'); bg.addColorStop(1, '#0a7d45'); } else { bg.addColorStop(0, '#101622'); bg.addColorStop(1, '#0a0e17'); }
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // status bar
    g.fillStyle = ok ? 'rgba(255,255,255,.85)' : '#8d98ab'; g.font = `600 30px ${SANS}`;
    g.textAlign = 'left'; g.fillText('9:41', 40, 48);
    g.textAlign = 'right'; g.fillText('100%', W - 100, 48);
    g.strokeStyle = g.fillStyle; g.lineWidth = 3; g.strokeRect(W - 86, 34, 46, 26); g.fillRect(W - 81, 39, 36, 16); g.fillRect(W - 38, 42, 5, 10);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(W - 220, 62, 10 + i * 11, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
    g.textAlign = 'center';
    if (ok) {
      g.strokeStyle = '#fff'; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.arc(W / 2, 470, 150, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(W / 2 - 70, 475); g.lineTo(W / 2 - 15, 532); g.lineTo(W / 2 + 80, 415); g.stroke();
      g.fillStyle = '#fff'; g.font = `700 92px ${SANS}`; g.fillText('Approved', W / 2, 760);
      g.font = `500 54px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText('$42.80', W / 2, 860);
      g.font = `400 36px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('Thank you', W / 2, 1150);
      return;
    }
    g.fillStyle = '#8d98ab'; g.font = `500 36px ${SANS}`; g.fillText('Corner Coffee', W / 2, 170);
    g.fillStyle = '#ffffff'; g.font = `700 150px ${SANS}`; g.fillText('$42.80', W / 2, 330);
    g.fillStyle = '#8d98ab'; g.font = `400 34px ${SANS}`; g.fillText('Total, including tax', W / 2, 440);
    if (state === 'idle') {
      g.fillStyle = '#17223a'; g.beginPath(); g.arc(W / 2, 720, 170, 0, 7); g.fill();
      g.strokeStyle = '#2f6bff'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, 720, 170, 0, 7); g.stroke();
      contactless(g, W / 2 + 20, 720, 190, '#e9f0ff', 15);
      g.fillStyle = '#ffffff'; g.font = `600 52px ${SANS}`; g.fillText('Tap to pay', W / 2, 990);
      g.fillStyle = '#8d98ab'; g.font = `400 34px ${SANS}`; g.fillText('or insert card below', W / 2, 1056);
    } else {
      g.lineWidth = 18; g.lineCap = 'round';
      g.strokeStyle = '#1c2740'; g.beginPath(); g.arc(W / 2, 720, 150, 0, 7); g.stroke();
      g.strokeStyle = '#4f8dff'; g.beginPath(); g.arc(W / 2, 720, 150, -1.4, 1.9); g.stroke();
      g.fillStyle = '#ffffff'; g.font = `600 52px ${SANS}`; g.fillText('Authorizing…', W / 2, 990);
      g.fillStyle = '#8d98ab'; g.font = `400 34px ${SANS}`; g.fillText('Do not remove card', W / 2, 1056);
    }
    // accepted-brand tiles
    for (let i = 0; i < 4; i++) { g.fillStyle = '#1a2233'; g.beginPath(); g.roundRect(W / 2 - 214 + i * 110, 1160, 98, 60, 10); g.fill(); }
  });
}

/** Front of the card: issuer art, EMV chip position, contactless indicator, Visa mark (approximation of the wordmark). */
function cardFront() {
  return tex(1600, 1010, (g, W, H) => {
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0b1f6b'); bg.addColorStop(0.55, '#1434cb'); bg.addColorStop(1, '#0a1a5c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // soft sweeping bands
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(120,160,255,${0.05 + i * 0.012})`;
      g.beginPath(); g.moveTo(W * (0.25 + i * 0.13), 0); g.bezierCurveTo(W * (0.55 + i * 0.1), H * 0.35, W * (0.3 + i * 0.12), H * 0.7, W * (0.75 + i * 0.1), H);
      g.lineTo(W, H); g.lineTo(W, 0); g.closePath(); g.fill();
    }
    g.fillStyle = '#ffffff'; g.textBaseline = 'alphabetic';
    g.font = `700 62px ${SANS}`; g.textAlign = 'left'; g.fillText('NORTHLINE', 96, 150);
    g.font = `400 62px ${SANS}`; g.fillText('BANK', 96 + g.measureText('NORTHLINE ').width + 70, 150);
    contactless(g, 520, 505, 130, 'rgba(255,255,255,.92)', 12);
    g.font = `500 44px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText('ALEX M. CARTER', 96, H - 96);
    // Visa mark, bottom right, with the product identifier above it
    g.textAlign = 'right'; g.fillStyle = '#ffffff';
    g.font = `500 40px ${SANS}`; g.fillText('Debit', W - 96, H - 250);
    g.save(); g.translate(W - 92, H - 92); g.transform(1, 0, -0.2, 1, 0, 0);
    g.font = `italic 900 178px ${SANS}`; g.fillText('VISA', 0, 0); g.restore();
  });
}

function cardBack() {
  return tex(1600, 1010, (g, W, H) => {
    g.fillStyle = '#0b1f6b'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 90, W, 190);
    g.fillStyle = '#e9e9e4'; g.fillRect(96, 350, 900, 120);
    g.fillStyle = '#1b1b1f'; g.font = `italic 500 56px ${SANS}`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('123', 970, 412);
    g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.font = `500 76px "Courier New", monospace`; g.fillText('4000 1234 5678 9010', 96, 610);
    g.font = `400 34px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('VALID THRU', 96, 712);
    g.font = `500 54px "Courier New", monospace`; g.fillStyle = '#fff'; g.fillText('12/29', 320, 712);
    g.font = `400 26px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.55)';
    ['This card is the property of Northline Bank and must be returned on request.', 'Sample card for illustration. Not a real account.'].forEach((l, i) => g.fillText(l, 96, 850 + i * 40));
  });
}

function chipTexture() {
  return tex(256, 200, (g, W, H) => {
    g.fillStyle = '#d8b25a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#8a6a22'; g.lineWidth = 4;
    g.strokeRect(84, 60, 88, 80);
    for (const y of [60, 100, 140]) { g.beginPath(); g.moveTo(0, y); g.lineTo(84, y); g.moveTo(172, y); g.lineTo(W, y); g.stroke(); }
    g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 60); g.moveTo(128, 140); g.lineTo(128, H); g.stroke();
  });
}

function woodTexture() {
  return tex(1024, 1024, (g, W, H) => {
    g.fillStyle = '#2e221b'; g.fillRect(0, 0, W, H);
    let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) {
      const y = rnd() * H, l = 30 + rnd() * 20;
      g.strokeStyle = `hsla(${22 + rnd() * 10}, ${25 + rnd() * 15}%, ${l - 12}%, ${0.08 + rnd() * 0.14})`; g.lineWidth = 2 + rnd() * 6;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= W; x += 64) g.lineTo(x, y + Math.sin(x * 0.006 + i) * 5 + (rnd() - 0.5) * 3);
      g.stroke();
    }
    for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, (k + 1) * H / 4 - 2, W, 3); }   // plank joints
  });
}

/**
 * A current-style smart payment terminal (5.5-inch touchscreen slab, about 162 × 82 × 17 mm, in a
 * counter dock) and a contactless Visa debit card, on a shop counter. Origin: centre of the counter top.
 */
export function buildReader() {
  const std = (o) => new THREE.MeshStandardMaterial(o), phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const M = {
    body: phys({ color: 0x1d2026, metalness: 0.1, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
    glass: phys({ color: 0x050608, metalness: 0.0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, reflectivity: 0.6 }),
    dock: std({ color: 0x2b2f36, metalness: 0.15, roughness: 0.55 }),
    rubber: std({ color: 0x0c0d0f, metalness: 0, roughness: 0.9 }),
    slot: std({ color: 0x020203, metalness: 0.2, roughness: 0.6 }),
    btn: std({ color: 0x3a3f48, metalness: 0.4, roughness: 0.4 }),
    ledOff: std({ color: 0x1a2a22, roughness: 0.4 }),
    wood: std({ map: woodTexture(), color: 0xffffff, metalness: 0, roughness: 0.62 }),
    edge: std({ color: 0x241a14, roughness: 0.6 }),
    cardEdge: std({ color: 0x0d1f66, metalness: 0.1, roughness: 0.45 }),
    cardFront: phys({ map: cardFront(), metalness: 0.15, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    cardBack: phys({ map: cardBack(), metalness: 0.1, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    chip: std({ map: chipTexture(), metalness: 1, roughness: 0.32 }),
    cable: std({ color: 0x111214, roughness: 0.7 }),
  };
  M.wood.map.wrapS = M.wood.map.wrapT = THREE.RepeatWrapping; M.wood.map.repeat.set(2.4, 1.4);
  const root = group('Card reader set');

  // counter
  const top = box(2.4, 0.04, 1.4, M.edge, 0, -0.02, 0, 'Counter'); root.add(top);
  const veneer = new THREE.Mesh(new THREE.PlaneGeometry(2.39, 1.39), M.wood); veneer.rotation.x = -Math.PI / 2; veneer.position.y = 0.0004; veneer.receiveShadow = true; root.add(veneer);

  // terminal: device frame has x = width, y = out of the screen, z = length (top of the screen at −z)
  const TW = 0.0816, TL = 0.162, TT = 0.017, TILT = 0.80;
  const dev = group('Payment terminal');
  const body = slab(TW, TL, TT, 0.012, M.body, 0.003); body.name = 'Terminal body'; dev.add(body);
  const glass = slab(TW - 0.003, TL - 0.003, 0.0014, 0.0108, M.glass, 0.0004); glass.position.y = TT / 2 + 0.0002; glass.name = 'Cover glass'; dev.add(glass);
  const SW = 0.0685, SL = 0.1218, sy = TT / 2 + 0.00105, sz = 0.006;
  const mk = (state) => { const m = roundedPlane(SW, SL, 0.004, new THREE.MeshBasicMaterial({ map: terminalScreen(state), toneMapped: false })); m.position.set(0, sy, sz); m.name = `Screen (${state})`; dev.add(m); return m; };
  const screens = { idle: mk('idle'), wait: mk('wait'), ok: mk('ok') };
  // four contactless status lights and the camera in the top bezel
  const ledOn = new THREE.MeshBasicMaterial({ color: 0x5dffa0, toneMapped: false });
  const leds = [0, 1, 2, 3].map((i) => { const l = new THREE.Mesh(new THREE.CircleGeometry(0.0011, 16), M.ledOff); l.rotation.x = -Math.PI / 2; l.position.set((i - 1.5) * 0.007, sy, -TL / 2 + 0.0085); dev.add(l); return l; });
  const camDot = new THREE.Mesh(new THREE.CircleGeometry(0.0013, 16), M.slot); camDot.rotation.x = -Math.PI / 2; camDot.position.set(0.026, sy, -TL / 2 + 0.0085); dev.add(camDot);
  // chip-card slot in the bottom edge, swipe groove down the right side, buttons, speaker
  dev.add(box(0.060, 0.0032, 0.004, M.slot, 0, -0.001, TL / 2 - 0.0012, 'Chip card slot'));
  dev.add(box(0.0016, 0.006, 0.112, M.slot, TW / 2 - 0.0004, 0.0035, 0.0, 'Magnetic stripe groove'));
  dev.add(box(0.0016, 0.0035, 0.014, M.btn, -TW / 2 + 0.0002, 0.001, -0.04, 'Power button'));
  dev.add(box(0.0016, 0.0035, 0.022, M.btn, -TW / 2 + 0.0002, 0.001, -0.012, 'Volume'));
  for (let i = 0; i < 6; i++) dev.add(cyl(0.0006, 0.002, M.slot, -0.012 + i * 0.0048, -0.004, TL / 2 - 0.0008, 'z'));
  dev.rotation.x = TILT;
  const cy = 0.014 + (TL / 2) * Math.sin(TILT) + 0.012;
  dev.position.set(0, cy, 0);
  root.add(dev);

  // dock: weighted base, sloped cradle behind the terminal, cable
  const dock = group('Counter dock');
  const base = slab(0.098, 0.118, 0.014, 0.02, M.dock, 0.003); base.position.set(0, 0.007, -0.012); dock.add(base);
  const pad = slab(0.09, 0.11, 0.0016, 0.018, M.rubber, 0.0004); pad.position.set(0, 0.0008, -0.012); dock.add(pad);
  const cradle = slab(0.066, 0.118, 0.012, 0.01, M.dock, 0.003);
  cradle.rotation.x = TILT; cradle.position.set(0, cy - Math.cos(TILT) * (TT / 2 + 0.0058), -Math.sin(TILT) * (TT / 2 + 0.0058) + 0.004); dock.add(cradle);
  const lip = box(0.07, 0.008, 0.012, M.dock, 0, 0, 0); lip.rotation.x = TILT; lip.position.set(0, cy - Math.sin(TILT) * (TL / 2 + 0.002) - 0.001, Math.cos(TILT) * (TL / 2 + 0.002) - 0.003); dock.add(lip);
  const spine = box(0.05, 0.085, 0.026, M.dock, 0, 0.05, -0.052); dock.add(spine);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.012, -0.066], [0.0, 0.006, -0.09], [0.03, 0.003, -0.16], [0.14, 0.003, -0.3], [0.2, 0.003, -0.7]].map((p) => new THREE.Vector3(...p))), 48, 0.0022, 10), M.cable);
  cable.castShadow = true; dock.add(cable);
  root.add(dock);

  // card: ISO ID-1, 85.60 × 53.98 × 0.76 mm, 3.18 mm corners; front faces +y
  const CW = 0.0856, CH = 0.05398, CT = 0.00076;
  const card = group('Visa debit card');
  card.add(slab(CW, CH, CT, 0.00318, M.cardEdge, 0.00012));
  const front = roundedPlane(CW - 0.0003, CH - 0.0003, 0.00305, M.cardFront); front.position.y = CT / 2 + 0.00002; card.add(front);
  const back = roundedPlane(CW - 0.0003, CH - 0.0003, 0.00305, M.cardBack); back.rotation.z = Math.PI; back.position.y = -CT / 2 - 0.00002; card.add(back);
  const chip = roundedPlane(0.0125, 0.0098, 0.0014, M.chip); chip.position.set(-CW / 2 + 0.0165, CT / 2 + 0.00006, -0.0005); chip.name = 'EMV chip'; card.add(chip);
  card.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  card.position.set(0.125, 0.075, 0.09); card.rotation.set(0.5, 0.5, 0.1);
  root.add(card);

  // where the card hovers during the tap: 28 mm off the screen, parallel to it
  const n = [0, Math.cos(TILT), Math.sin(TILT)];
  const tap = { pos: new THREE.Vector3(0, cy + n[1] * 0.036 - Math.sin(TILT) * 0.0, n[2] * 0.036), rotX: TILT, screen: new THREE.Vector3(0, cy + n[1] * 0.01, n[2] * 0.01) };
  const setLeds = (k) => leds.forEach((l, i) => { l.material = i < k ? ledOn : M.ledOff; });
  return { group: root, card, term: dev, screens, tap, setLeds };
}

/**
 * A patch of FinFET transistors (schematic, not to scale): silicon fins standing out of the
 * oxide, metal gates wrapping over them. One gate in the middle is the "hero" switch.
 * Units are arbitrary; the patch is about 2.4 wide.
 */
export function buildFinfet() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    sub: std({ color: 0x2a3140, metalness: 0.3, roughness: 0.6 }),
    oxide: std({ color: 0x6f86a8, metalness: 0.0, roughness: 0.35, transparent: true, opacity: 0.55 }),
    fin: std({ color: 0xc2c9d6, metalness: 0.55, roughness: 0.35 }),
    gate: std({ color: 0xb5793a, metalness: 0.9, roughness: 0.35 }),
    heroGate: std({ color: 0xd9913f, metalness: 0.6, roughness: 0.35, transparent: true, opacity: 1, emissive: 0xffa040, emissiveIntensity: 0 }),
    heroFin: std({ color: 0xe6ebf5, metalness: 0.4, roughness: 0.3, emissive: 0x39b6ff, emissiveIntensity: 0 }),
    contact: std({ color: 0xd9dde4, metalness: 0.95, roughness: 0.25 }),
    electron: new THREE.MeshBasicMaterial({ color: 0x7fe3ff, toneMapped: false }),
  };
  const root = group('FinFET patch');
  root.add(box(3.2, 0.2, 3.2, M.sub, 0, -0.1, 0, 'Silicon substrate'));
  root.add(box(3.2, 0.12, 3.2, M.oxide, 0, 0.06, 0, 'Oxide'));
  const nf = 7, ng = 5, pitch = 0.34, gp = 0.56, fh = 0.46, fw = 0.075, gw = 0.16;
  const refs = { M, gates: [], electrons: [] };
  for (let i = 0; i < nf; i++) {
    const hero = i === 3;
    const f = box(fw, fh, 3.0, hero ? M.heroFin : M.fin, (i - 3) * pitch, fh / 2, 0, hero ? 'Fin (channel)' : 'Fin');
    root.add(f); if (hero) refs.fin = f;
  }
  for (let j = 0; j < ng; j++) {
    const hero = j === 2;
    const gate = group(hero ? 'Gate (hero)' : 'Gate');
    const m = hero ? M.heroGate : M.gate;
    gate.add(box(nf * pitch + 0.1, 0.13, gw, m, 0, fh + 0.065, 0));          // over the fin tops
    for (let i = 0; i <= nf; i++) gate.add(box(pitch - fw, fh - 0.12, gw, m, (i - 3.5) * pitch, 0.12 + (fh - 0.12) / 2, 0)); // between the fins
    gate.position.z = (j - 2) * gp;
    root.add(gate); refs.gates.push(gate);
    if (hero) refs.gate = gate;
  }
  // source / drain contacts on the hero fin
  refs.source = box(0.2, 0.3, 0.18, M.contact, 0, fh + 0.15, 0.28, 'Source contact');
  refs.drain = box(0.2, 0.3, 0.18, M.contact, 0, fh + 0.15, -0.28, 'Drain contact');
  root.add(refs.source, refs.drain);
  for (let k = 0; k < 9; k++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), M.electron); root.add(e); refs.electrons.push(e); }
  /** on: 0..1 gate drive; t: seconds. Electrons run source → drain along the top of the hero fin. */
  refs.update = (t, on) => {
    M.heroGate.emissiveIntensity = on * 1.6; M.heroFin.emissiveIntensity = on * 0.9;
    refs.electrons.forEach((e, k) => {
      const u = (t * 0.9 + k / 9) % 1;
      e.position.set(((k * 37) % 5 - 2) * 0.012, fh + 0.03, 0.42 - u * 0.84);
      e.visible = on > 0.02; e.scale.setScalar(on * (0.7 + 0.3 * Math.sin(u * Math.PI)));
    });
  };
  return { group: root, refs };
}

/** The payment: a small bright light with a halo. */
export function buildPacket(color = 0x5fe6ff) {
  const g = group('Payment');
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
  halo.scale.setScalar(9);
  halo.renderOrder = 10;
  g.add(halo);
  g.userData.halo = halo;
  return g;
}

/**
 * Beads that run along a hose to show flow. Added to the hose's parent so they move with it.
 * Returns update(t, k): k = 0 hidden … 1 full size.
 */
export function addFlow(hoseMesh, { n = 6, color = 0x6fd6ff, r = 1.35, speed = 0.35, reverse = false } = {}) {
  const curve = hoseMesh.userData.curve;
  const radius = hoseMesh.geometry.parameters.radius * r;
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const beads = Array.from({ length: n }, () => { const b = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), mat); b.visible = false; hoseMesh.parent.add(b); return b; });
  return (t, k) => beads.forEach((b, i) => {
    b.visible = k > 0.01;
    if (!b.visible) return;
    let u = (t * speed + i / n) % 1; if (reverse) u = 1 - u;
    b.position.copy(curve.getPointAt(u)).add(hoseMesh.position);
    b.scale.setScalar(k * Math.min(1, 6 * Math.min(u, 1 - u) + 0.15));
  });
}

/** A flat glowing rectangle (additive) for highlighting part of a floor plan. Lies in the XZ plane. */
export function highlight(w, d, color = 0x5fe6ff) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 5;
  m.visible = false;
  return m;
}

/** A glowing link between two points (thin additive bar), for bus diagrams. */
export function link(a, b, thick = 0.0016, color = 0x5fe6ff) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.scale.set(thick, thick, A.distanceTo(B));
  m.position.copy(A).lerp(B, 0.5);
  m.lookAt(B);
  m.renderOrder = 5; m.visible = false;
  return m;
}

/** Core floor-plan diagram on a plane in the XZ plane (fades in over a core on the die). */
export function coreDetail(size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: coreDetailTexture(), transparent: true, opacity: 0, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 4; m.visible = false;
  return m;
}
