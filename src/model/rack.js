// IBM z16 A01 "A" frame: 42U, 19-inch, single-frame PDU-powered configuration with
// three CPC drawers (Max125), one PCIe+ I/O drawer, radiator cooling unit, two support
// elements and two Ethernet switches. Positions follow the Technical Guide (SG24-8951):
// CPC0 at A10, CPC1 at A15, CPC2 at A20, switches at A39/A40, SEs at A41/A42, radiator
// cooling unit at the bottom of the frame.
// Frame origin: centre of the footprint on the floor, +z = front. Units: metres.
import * as THREE from 'three';
import { box, cyl, group, hose, finTexture, labelTexture, portTexture, textured } from '../kit.js';
import { buildCpcDrawer, CPC } from './cpcDrawer.js';

export const U = 0.04445;
export const FRAME = { W: 0.60, H: 2.015, D: 1.07, base: 0.10 };
export const uY = (u) => FRAME.base + (u - 1) * U;   // bottom of rack unit u
export const Z_FRONT = 0.42;                          // front mounting plane

// ------------------------------------------------------------ PCIe+ I/O drawer (8U)
function buildIoDrawer(P) {
  const W = 0.445, H = 8 * U - 0.006, D = 0.70, ZF = D / 2, ZR = -D / 2;
  const root = group('PCIe+ I/O drawer');
  const refs = { cards: [] };
  root.add(box(W, 0.002, D, P.steel, 0, 0.001, 0), box(W, 0.002, D, P.steel, 0, H - 0.001, 0));
  root.add(box(0.002, H, D, P.steel, -W / 2, H / 2, 0), box(0.002, H, D, P.steel, W / 2, H / 2, 0));
  root.add(box(W - 0.01, H - 0.01, D - 0.56, P.black, 0, H / 2, 0.02, 'Midplane'));
  // front: six blowers
  for (let i = 0; i < 6; i++) {
    const b = group(`Blower ${i + 1}`, box(0.136, 0.16, 0.12, P.zinc, 0, 0, -0.06));
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.128, 0.152), P.perfGrille);
    gr.position.z = 0.001;
    b.add(gr, box(0.04, 0.008, 0.006, P.blue, 0, -0.07, 0.003));
    b.position.set((i % 3 - 1) * 0.144, H / 2 + (i < 3 ? 0.085 : -0.085), ZF);
    root.add(b);
  }
  // rear: 2 × 10 horizontal slots (8 I/O cards + PCIe+ switch card + BMC per side), 2 PSUs below
  const faces = {
    fc: textured(P, P.zinc, portTexture(4, 'lc', 'FICON')),
    osa: textured(P, P.zinc, portTexture(2, 'rj45', 'OSA')),
    roce: textured(P, P.zinc, portTexture(2, 'qsfp', 'RoCE')),
    crypto: textured(P, P.zinc, labelTexture('Crypto Express8S', { w: 1024, h: 96, bg: '#b9bec4', fg: '#16181b', font: '600 44px Arial' })),
    sw: textured(P, P.zinc, portTexture(1, 'qsfp', 'PCIe+ SW')),
    bmc: textured(P, P.zinc, portTexture(1, 'rj45', 'BMC')),
  };
  const kinds = ['fc', 'osa', 'crypto', 'fc', 'sw', 'bmc', 'roce', 'fc', 'osa', 'fc'];
  const slotH = 0.0262, y0 = 0.075;
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) {
    const kind = kinds[s < 0 ? i : 9 - i];
    const c = group(`${kind === 'crypto' ? 'Crypto Express8S' : kind.toUpperCase() + ' card'} LG${String(i + 1 + (s > 0 ? 10 : 0)).padStart(2, '0')}`);
    c.add(box(0.196, 0.021, 0.003, faces[kind], 0, 0, 0));
    c.add(box(0.19, 0.0016, 0.24, P.pcb, 0, -0.006, 0.122));
    c.add(box(0.008, 0.018, 0.008, P.blue, s * 0.092, 0, -0.004));
    if (kind === 'crypto') c.add(box(0.09, 0.014, 0.12, P.steelDark, -0.02, 0.002, 0.10, 'HSM (tamper-responding enclosure)'), box(0.03, 0.01, 0.03, P.yellow, 0.06, 0, 0.06, 'Battery'));
    else c.add(box(0.04, 0.008, 0.04, P.chip, 0, -0.001, 0.12), box(0.06, 0.012, 0.03, P.alu, 0, 0.001, 0.05));
    c.position.set(s * 0.115, y0 + i * slotH, ZR);
    c.userData.kind = kind;
    root.add(c); refs.cards.push(c);
  }
  root.add(box(0.026, 10 * slotH, 0.004, P.black, 0, y0 + 4.5 * slotH, ZR + 0.002, 'Location / LED panel'));
  for (const s of [-1, 1]) {
    const p = group('I/O drawer PSU', box(0.20, 0.044, 0.22, P.zinc, 0, 0, 0.11), box(0.03, 0.022, 0.004, P.black, s * 0.06, 0, -0.002), box(0.006, 0.03, 0.01, P.orange, s * -0.09, 0, -0.004));
    p.position.set(s * 0.11, 0.03, ZR);
    root.add(p);
  }
  refs.crypto = refs.cards.find((c) => c.userData.kind === 'crypto' && c.position.x > 0);
  return { group: root, refs, H };
}

// ------------------------------------------------------------ radiator cooling unit
function buildRadiator(P) {
  const W = 0.445, H = 9 * U - 0.008, D = 0.78;
  const root = group('Radiator cooling unit (RCU)');
  root.add(box(W, 0.003, D, P.steel, 0, 0.0015, 0), box(W, 0.003, D, P.steel, 0, H, 0));
  root.add(box(0.003, H, D, P.steel, -W / 2, H / 2, 0), box(0.003, H, D, P.steel, W / 2, H / 2, 0));
  // three fan assemblies, three fans each (N+1)
  for (let c = 0; c < 3; c++) {
    const fa = group(`Fan assembly ${c + 1}`, box(0.13, H - 0.03, 0.10, P.zinc, 0, 0, -0.05));
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.005, 8, 28), P.steelDark);
      ring.position.set(0, (r - 1) * 0.118, 0.002);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.046, 28), P.perfGrille);
      disc.position.copy(ring.position);
      fa.add(ring, disc, cyl(0.016, 0.01, P.black, 0, (r - 1) * 0.118, -0.004, 'z'));
    }
    fa.position.set((c - 1) * 0.142, H / 2, D / 2);
    root.add(fa);
  }
  // heat exchanger core
  const fins = textured(P, P.alu, finTexture([90, 1]));
  root.add(box(W - 0.03, H - 0.05, 0.16, fins, 0, H / 2, D / 2 - 0.20, 'Radiator core (heat exchanger)'));
  root.add(box(W - 0.02, H - 0.04, 0.30, P.black, 0, H / 2, -0.05, 'Plenum'));
  // two pumps (N+1) and the manifold at the rear
  for (const s of [-1, 1]) {
    root.add(group(`Pump ${s < 0 ? 1 : 2}`,
      cyl(0.036, 0.12, P.steelDark, s * 0.10, 0.11, -D / 2 + 0.07, 'z'),
      cyl(0.026, 0.05, P.alu, s * 0.10, 0.11, -D / 2 + 0.005, 'z'),
      box(0.05, 0.03, 0.06, P.blue, s * 0.10, 0.165, -D / 2 + 0.07)));
  }
  root.add(cyl(0.014, 0.34, P.alu, 0, 0.25, -D / 2 + 0.03, 'x', 'Manifold assembly'));
  return { group: root, H };
}

function oneU(P, name, face, depth = 0.5) {
  const g = group(name, box(0.445, U - 0.004, depth, P.blackGloss, 0, 0, -depth / 2));
  g.add(box(0.47, U - 0.006, 0.003, face, 0, 0, 0.001));
  return g;
}

/**
 * @param R   palette for everything that fades with the rack
 * @param DP  palette for the doors and side covers (fades separately)
 * @param HP  palette for the hero CPC drawer (never fades)
 */
export function buildRack(R, DP, HP) {
  const { W, H, D, base } = FRAME;
  const root = group('IBM z16 A01 – A frame');
  const refs = {};
  R.perfGrille = (() => { const m = R.perfSteel.clone(); m.alphaMap = R._perfTex.clone(); m.alphaMap.wrapS = m.alphaMap.wrapT = THREE.RepeatWrapping; m.alphaMap.repeat.set(14, 12); return m; })();

  // ---- structure
  const frame = group('Frame');
  frame.add(box(W, 0.06, D, R.black, 0, base - 0.03, 0, 'Base'));
  frame.add(box(W, 0.03, D, R.black, 0, H - 0.015, 0, 'Top'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    frame.add(box(0.045, H - base, 0.045, R.black, sx * (W / 2 - 0.0225), (H + base) / 2 - 0.015, sz * (D / 2 - 0.0225), 'Corner post'));
    frame.add(cyl(0.035, 0.05, R.blackGloss, sx * (W / 2 - 0.07), 0.035, sz * (D / 2 - 0.09), 'x', 'Caster'));
  }
  // 19-inch mounting rails
  for (const sx of [-1, 1]) for (const z of [Z_FRONT, -0.40]) frame.add(box(0.02, 42 * U, 0.004, R.zinc, sx * 0.235, uY(1) + 21 * U, z, 'EIA rail'));
  root.add(frame);

  // ---- covers and doors
  const sideL = box(0.012, H - base - 0.03, D - 0.02, DP.blackGloss, -W / 2 + 0.006, (H + base) / 2 - 0.015, 0, 'Side cover (left)');
  const sideR = box(0.012, H - base - 0.03, D - 0.02, DP.blackGloss, W / 2 - 0.006, (H + base) / 2 - 0.015, 0, 'Side cover (right)');
  root.add(sideL, sideR);

  const doorH = H - 0.06;
  const mkPerf = (rx, ry) => { const m = DP.perf.clone(); m.alphaMap = DP._perfTex.clone(); m.alphaMap.wrapS = m.alphaMap.wrapT = THREE.RepeatWrapping; m.alphaMap.repeat.set(rx, ry); DP['_perf' + rx] = m; return m; };
  // front door: hinged on the left, perforated acoustic face with the z16 angled panel and light bar
  const front = new THREE.Group(); front.name = 'Front door';
  front.position.set(-W / 2, 0.05, D / 2);
  const fd = group('Door leaf');
  fd.position.x = W / 2;
  fd.add(box(W, doorH, 0.03, DP.black, 0, doorH / 2, 0.035, 'Door frame'));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.07, doorH - 0.12), mkPerf(60, 110));
  mesh.position.set(0.012, doorH / 2, 0.066); fd.add(mesh);
  fd.add(box(W - 0.05, doorH - 0.10, 0.012, DP.blackGloss, 0.012, doorH / 2, 0.056, 'Acoustic panel'));
  // angular z16 styling: a slanted gloss panel and a vertical blue light bar
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.20, 0), new THREE.Vector2(0.20, 0.52), new THREE.Vector2(0, 0.78)]);
  const slant = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }), DP.blackGloss);
  slant.position.set(-W / 2 + 0.02, doorH - 0.80, 0.062); slant.castShadow = true;
  fd.add(slant);
  fd.add(box(0.008, doorH - 0.14, 0.006, DP.ibmBlue, -W / 2 + 0.014, doorH / 2, 0.070, 'Light bar'));
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.0375), textured(DP, DP.blackGloss, labelTexture('IBM z16', { bg: '#0b0c0f', fg: '#f2f4f8' })));
  badge.position.set(-W / 2 + 0.12, doorH - 0.14, 0.0745);
  fd.add(badge);
  front.add(fd);
  root.add(front);

  const rear = new THREE.Group(); rear.name = 'Rear door';
  rear.position.set(W / 2, 0.05, -D / 2);
  const rd = group('Door leaf');
  rd.position.x = -W / 2;
  for (const s of [-1, 1]) rd.add(box(0.03, doorH, 0.03, DP.black, s * (W / 2 - 0.015), doorH / 2, -0.02));
  rd.add(box(W, 0.03, 0.03, DP.black, 0, 0.015, -0.02), box(W, 0.03, 0.03, DP.black, 0, doorH - 0.015, -0.02));
  const rmesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, doorH - 0.06), mkPerf(64, 210));
  rmesh.position.set(0, doorH / 2, -0.03); rd.add(rmesh);
  rear.add(rd);
  root.add(rear);
  Object.assign(refs, { sideL, sideR, frontDoor: front, rearDoor: rear });

  // ---- contents
  const place = (obj, u, z = Z_FRONT) => { obj.position.set(0, uY(u), z); root.add(obj); return obj; };

  const rcu = buildRadiator(R);
  rcu.group.position.set(0, uY(1) + 0.002, Z_FRONT - 0.39);
  root.add(rcu.group);
  refs.rcu = rcu.group;

  // hero CPC0 is added by the caller's palette; CPC1/CPC2 are shells
  refs.cpc = [];
  [10, 15, 20].forEach((u, i) => {
    const d = buildCpcDrawer(i === 0 ? HP : R, { detail: i === 0, name: `CPC drawer ${i} (A${u}B)` });
    d.group.position.set(0, uY(u) + 0.003, Z_FRONT - CPC.D / 2);
    root.add(d.group);
    refs.cpc.push(d);
  });

  const io = buildIoDrawer(R);
  io.group.position.set(0, uY(31) + 0.003, Z_FRONT - 0.35);
  root.add(io.group);
  refs.io = io;

  // filler panels A25–A30
  for (let u = 25; u <= 30; u++) root.add(box(0.47, U - 0.003, 0.004, R.black, 0, uY(u) + U / 2, Z_FRONT, 'Filler panel'));

  const swFace = textured(R, R.zinc, portTexture(12, 'rj45', 'SW'));
  const seFace = textured(R, R.zinc, labelTexture('Support Element', { w: 1024, h: 64, bg: '#17191d', fg: '#aeb6c0', font: '600 34px Arial' }));
  refs.switches = [39, 40].map((u, i) => place(oneU(R, `Ethernet switch ${i + 1} (24-port GbE)`, swFace, 0.35), u + 0.5));
  refs.ses = [41, 42].map((u, i) => place(oneU(R, `Support Element ${i + 1} (1U)`, seFace, 0.6), u + 0.5));

  // ---- rear: PDUs on both sides, water hoses from the RCU manifold to each CPC drawer
  refs.pdus = [];
  for (const s of [-1, 1]) {
    const pdu = group(`Intelligent PDU ${s < 0 ? 1 : 2}`, box(0.05, 1.5, 0.06, R.black, 0, 0, 0));
    for (let k = 0; k < 12; k++) pdu.add(box(0.03, 0.03, 0.004, R.steelDark, 0, -0.66 + k * 0.12, -0.031));
    pdu.add(box(0.03, 0.05, 0.004, R.led, 0, 0.72, -0.031));
    pdu.position.set(s * 0.262, 1.05, -D / 2 + 0.07);
    root.add(pdu); refs.pdus.push(pdu);
  }
  const zr = Z_FRONT - CPC.D - 0.035;
  const hoses = group('Water hoses (supply / return)');
  [10, 15, 20].forEach((u, i) => {
    const y = uY(u) + 0.103;
    const x = 0.012;
    hoses.add(hose([[x, y, zr], [x - 0.01, y - 0.02, zr - 0.05], [-0.14 - i * 0.022, y - 0.10, zr - 0.07], [-0.14 - i * 0.022, uY(1) + 0.27, zr - 0.07], [-0.10, uY(1) + 0.255, zr + 0.02]], 0.011, i % 2 ? R.hoseRed : R.hoseBlue, `CPC${i} loop hose`));
  });
  root.add(hoses);
  refs.hoses = hoses;

  // SMP9 cables linking the three CPC drawers point-to-point
  const smp = group('SMP9 cables');
  const pair = (a, b, k) => {
    const ya = uY(10 + a * 5) + 0.071, yb = uY(10 + b * 5) + 0.071, x = -0.17 + k * 0.15;
    smp.add(hose([[x, ya, zr + 0.03], [x, ya + 0.01, zr - 0.05 - k * 0.012], [x, yb - 0.01, zr - 0.05 - k * 0.012], [x + 0.042, yb, zr + 0.03]], 0.006, R.cable, `SMP9 cable CPC${a}–CPC${b}`));
  };
  pair(0, 1, 0); pair(1, 2, 1); pair(0, 2, 2);
  root.add(smp);
  refs.smpCables = smp;

  return { group: root, refs };
}
