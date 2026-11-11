// IBM z16 A01 "A" frame: 42U, 19-inch, single-frame PDU-powered configuration with
// three CPC drawers (Max125), one PCIe+ I/O drawer, radiator cooling unit, two support
// elements and two Ethernet switches. Positions follow the Technical Guide (SG24-8951):
// CPC0 at A10, CPC1 at A15, CPC2 at A20, switches at A39/A40, SEs at A41/A42, radiator
// cooling unit at the bottom of the frame.
// Frame origin: centre of the footprint on the floor, +z = front. Units: metres.
import * as THREE from 'three';
import { box, cyl, group, hose, finTexture, labelTexture, portTexture, textured, stripedWordmarkTexture, outlineLetterTexture } from '../kit.js';
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
    cpl: textured(P, P.zinc, portTexture(2, 'lc', 'Coupling LR')),
    bmc: textured(P, P.zinc, portTexture(1, 'rj45', 'BMC')),
  };
  const kinds = ['fc', 'osa', 'crypto', 'cpl', 'sw', 'bmc', 'roce', 'fc', 'osa', 'fc'];
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
  refs.card = (kind, side = 1) => refs.cards.find((c) => c.userData.kind === kind && Math.sign(c.position.x) === side);
  return { group: root, refs, H };
}

// ------------------------------------------------------------ radiator cooling unit
function buildRadiator(P) {
  const W = 0.445, H = 9 * U - 0.008, D = 0.78;
  const root = group('Radiator cooling unit (RCU)');
  const refs = { fans: [], pumps: [] };
  refs.top = box(W, 0.003, D, P.steel, 0, H, 0, 'RCU cover');
  root.add(box(W, 0.003, D, P.steel, 0, 0.0015, 0), refs.top);
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
    root.add(fa); refs.fans.push(fa);
  }
  // heat exchanger core
  const fins = textured(P, P.alu, finTexture([90, 1]));
  refs.core = box(W - 0.03, H - 0.05, 0.16, fins, 0, H / 2, D / 2 - 0.20, 'Radiator core (heat exchanger)');
  root.add(refs.core);
  root.add(box(W - 0.02, H - 0.04, 0.30, P.black, 0, H / 2, -0.05, 'Plenum'));
  // two pumps (N+1) and the manifold at the rear
  for (const s of [-1, 1]) {
    const pump = group(`Pump ${s < 0 ? 1 : 2}`,
      cyl(0.036, 0.12, P.steelDark, s * 0.10, 0.11, -D / 2 + 0.07, 'z'),
      cyl(0.026, 0.05, P.alu, s * 0.10, 0.11, -D / 2 + 0.005, 'z'),
      box(0.05, 0.03, 0.06, P.blue, s * 0.10, 0.165, -D / 2 + 0.07));
    root.add(pump); refs.pumps.push(pump);
  }
  root.add(cyl(0.014, 0.34, P.alu, 0, 0.25, -D / 2 + 0.03, 'x', 'Manifold assembly'));
  return { group: root, H, refs };
}

function oneU(P, name, face, depth = 0.5) {
  const g = group(name, box(0.445, U - 0.004, depth, P.blackGloss, 0, 0, -depth / 2));
  g.add(box(0.47, U - 0.006, 0.003, face, 0, 0, 0.001));
  return g;
}

/** Front door (hinged group), and left / right side cover sets, styled after the z16 cover set. */
export function buildCovers(DP) {
  const { W, H, D, base } = FRAME;
  // ---- covers and doors (styled after the z16 cover set: four faceted panels on the front
  //      door, four vertical cover strips per side with the striped wordmark)
  const doorH = H - 0.06;
  const mkPerf = (rx, ry) => { const m = DP.perf.clone(); m.alphaMap = DP._perfTex.clone(); m.alphaMap.wrapS = m.alphaMap.wrapT = THREE.RepeatWrapping; m.alphaMap.repeat.set(rx, ry); DP['_perf' + rx] = m; return m; };
  const decal = (tex) => { const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, metalness: 0.5, roughness: 0.45 }); DP['_decal' + Object.keys(DP).length] = m; return m; };
  const wordmark = decal(stripedWordmarkTexture('IBM', '#74787e'));
  const wordmarkChrome = decal(stripedWordmarkTexture('IBM', '#d5d9df'));
  const zMark = decal(outlineLetterTexture('Z'));

  const side = (sx) => {
    const g = group(`Side covers (${sx < 0 ? 'left' : 'right'})`);
    const n = 4, gap = 0.006, pd = (D - 0.02 - (n - 1) * gap) / n, ph = H - base - 0.03;
    for (let i = 0; i < n; i++) g.add(box(0.014, ph, pd, DP.coverBlack, 0, 0, -D / 2 + 0.01 + pd / 2 + i * (pd + gap), 'Side cover strip'));
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.40), wordmark);
    logo.rotation.set(0, sx * Math.PI / 2, Math.PI / 2);
    logo.position.set(sx * 0.0078, -ph / 2 + 0.63, sx < 0 ? -0.255 : -0.255);
    logo.name = 'Wordmark';
    g.add(logo);
    g.position.set(sx * (W / 2 - 0.007), (H + base) / 2 - 0.015, 0);
    return g;
  };
  const sideL = side(-1), sideR = side(1);

  // One faceted cover panel: a rounded square slab with a triangular recess whose base is the
  // vertical centre line and whose apex points to `dir` (-1 left, +1 right). The upper facet
  // reads dark, the lower light, and a blue sliver lines the centre.
  const PS = 0.445, PT = 0.046;
  const panel = (dir, name) => {
    const g = group(name);
    const r = 0.034, h = PS / 2, m = 0.012, bev = 0.004;
    const sh = new THREE.Shape();
    sh.moveTo(-h + r, -h); sh.lineTo(h - r, -h); sh.quadraticCurveTo(h, -h, h, -h + r); sh.lineTo(h, h - r);
    sh.quadraticCurveTo(h, h, h - r, h); sh.lineTo(-h + r, h); sh.quadraticCurveTo(-h, h, -h, h - r); sh.lineTo(-h, -h + r); sh.quadraticCurveTo(-h, -h, -h + r, -h);
    const A = [0, h - m], B = [0, -h + m], C = [dir * (h - m), 0], E = [-dir * 0.013, 0];
    const hole = new THREE.Path();
    hole.moveTo(...A); hole.lineTo(...C); hole.lineTo(...B); hole.lineTo(...E); hole.closePath();
    sh.holes.push(hole);
    const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: PT - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 }), DP.cover);
    slab.position.z = bev; slab.castShadow = slab.receiveShadow = true;
    g.add(slab);
    const zf = PT - bev * 0.5, Dp = [0, 0, PT - 0.04];
    const tri = (pts, mat, nm) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => (p.length === 3 ? p : [p[0], p[1], zf])), 3));
      geo.computeVertexNormals();
      const me = new THREE.Mesh(geo, mat); me.name = nm; me.receiveShadow = true;
      g.add(me);
    };
    tri([A, C, Dp], DP.facetDark, 'Upper facet');
    tri([C, B, Dp], DP.facetLight, 'Lower facet');
    tri([A, Dp, E, Dp, B, E], DP.facetBlue, 'Blue accent');
    g.add(box(PS - 0.01, PS - 0.01, 0.002, DP.coverBlack, 0, 0, 0.001, 'Back plate'));
    // quadrant seam on the plain half
    g.add(box(h - 0.03, 0.0016, 0.001, DP.coverBlack, -dir * (h / 2 + 0.008), 0, PT + 0.0002, 'Seam'));
    return g;
  };

  // front door: hinged on the left
  const front = new THREE.Group(); front.name = 'Front door';
  front.position.set(-W / 2, 0.05, D / 2);
  const fd = group('Door leaf');
  fd.position.x = W / 2;
  fd.add(box(W, doorH, 0.03, DP.coverBlack, 0, doorH / 2, 0.035, 'Door'));
  const pitch = PS + 0.03, y0 = (doorH - (4 * PS + 3 * 0.03)) / 2 + PS / 2, px = -0.0125;
  for (let i = 0; i < 4; i++) {
    const p = panel(i % 2 ? 1 : -1, `Cover panel ${i + 1}`);
    p.position.set(px, y0 + (3 - i) * pitch, 0.05);
    fd.add(p);
    if (i === 0) {
      const ibm = new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.028), wordmarkChrome);
      ibm.position.set(0.125, 0.085, PT + 0.001); ibm.name = 'Wordmark badge';
      const z = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.046), zMark);
      z.position.set(-0.175, -0.165, PT + 0.001); z.name = 'Z badge';
      p.add(ibm, z);
    }
  }
  fd.add(group('Latch', box(0.026, 0.085, 0.012, DP.blackGloss, W / 2 - 0.04, y0 + 1.5 * pitch, 0.056), box(0.012, 0.04, 0.008, DP.cover, W / 2 - 0.04, y0 + 1.5 * pitch - 0.012, 0.064)));
  front.add(fd);
  return { sideL, sideR, front };
}

/** A closed frame seen from outside only: used for the extra frames of a multi-frame system. */
export function buildShell(P, name) {
  const { W, H, D, base } = FRAME;
  const g = group(name);
  g.add(box(W, 0.06, D, P.black, 0, base - 0.03, 0), box(W, 0.03, D, P.black, 0, H - 0.015, 0));
  g.add(box(W - 0.03, H - base - 0.03, 0.02, P.coverBlack, 0, (H + base) / 2 - 0.015, -D / 2 + 0.01, 'Rear door'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.035, 0.05, P.blackGloss, sx * (W / 2 - 0.07), 0.035, sz * (D / 2 - 0.09), 'x'));
  const c = buildCovers(P);
  g.add(c.sideL, c.sideR, c.front);
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
  frame.add(box(W - 0.05, 0.06, 0.34, R.black, 0, H + 0.03, -D / 2 + 0.19, 'Top exit enclosure'));
  // 19-inch mounting rails
  for (const sx of [-1, 1]) for (const z of [Z_FRONT, -0.40]) frame.add(box(0.02, 42 * U, 0.004, R.zinc, sx * 0.235, uY(1) + 21 * U, z, 'EIA rail'));
  root.add(frame);

  // ---- covers and doors
  const doorH = H - 0.06;
  const mkPerf = (rx, ry) => { const m = DP.perf.clone(); m.alphaMap = DP._perfTex.clone(); m.alphaMap.wrapS = m.alphaMap.wrapT = THREE.RepeatWrapping; m.alphaMap.repeat.set(rx, ry); DP['_perf' + rx] = m; return m; };
  const { sideL, sideR, front } = buildCovers(DP);
  root.add(sideL, sideR, front);

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
  refs.rcu = rcu.group; refs.rcuParts = rcu.refs;

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

  // fanout cables: each I/O domain's switch card to a fanout slot of CPC0, and the payment's fiber
  const ioc = group('PCIe+ fanout cables');
  const ioY = uY(31) + 0.003, ioZ = Z_FRONT - 0.35 - 0.35;
  refs.ioPath = [];
  for (const sx of [-1, 1]) {
    const sw = io.refs.card('sw', sx);
    const a = [sw.position.x + sx * 0.04, ioY + sw.position.y, ioZ], f = refs.cpc[0].refs.fanouts[sx < 0 ? 2 : 9];
    const b = [f.position.x, uY(10) + 0.003 + f.position.y + 0.02, zr];
    const pts = [a, [a[0], a[1], ioZ - 0.07], [sx * 0.215, a[1] - 0.12, ioZ - 0.11], [sx * 0.215, b[1] + 0.25, zr - 0.10], [b[0], b[1] + 0.03, zr - 0.07], b];
    ioc.add(hose(pts, 0.008, R.hose, `Fanout cable (domain ${sx < 0 ? 0 : 1})`));
    refs.ioPath.push(pts);
  }
  const osa = io.refs.card('osa', 1);
  refs.fiberPts = [[0.19, H + 0.5, -D / 2 - 0.25], [0.2, H - 0.15, -D / 2 - 0.12], [0.21, ioY + osa.position.y + 0.25, ioZ - 0.10], [osa.position.x + 0.03, ioY + osa.position.y + 0.03, ioZ - 0.06], [osa.position.x + 0.03, ioY + osa.position.y, ioZ]];
  ioc.add(hose(refs.fiberPts, 0.004, R.aqua, 'Fiber (network)'));
  root.add(ioc);
  refs.ioCables = ioc;

  return { group: root, refs };
}
