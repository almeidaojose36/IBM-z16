// IBM z16 A01 CPC (central processor complex) drawer, 5U.
// Layout follows Figures 2-6 (top), 2-7 (front) and 2-8 (rear) of the
// IBM z16 (3931) Technical Guide, SG24-8951:
//   front  : 5 fans above 2 BMC/OSC cards and 2 processor power control (PPC) cards
//   middle : up to 48 DIMMs in 6 groups of 8 (one group per memory controller), POL cards between
//            4 PU dual chip modules (DCMs) under water cold plates, cooling manifold behind them
//   rear   : 12 PCIe+ Gen3 fanout / ICA SR slots, 6 SMP9 connectors, 4 PSUs, water quick-connect
// Local frame: origin at the centre of the drawer floor, +z = front, +y = up. Units: metres.
import * as THREE from 'three';
import { box, cyl, group, hose, labelTexture, portTexture, telumDieTexture, textured } from '../kit.js';

export const CPC = { W: 0.445, H: 0.215, D: 0.80 };
const { W, H, D } = CPC;
const ZF = D / 2, ZR = -D / 2;

// Section boundaries along z (front → rear)
const Z_FAN = ZF - 0.105;      // rear face of the fan / card bay
const Z_DIMM0 = Z_FAN - 0.012; // front edge of the DIMM field
const DIMM_L = 0.133, DIMM_H = 0.031;
const Z_DCM = -0.075;          // DCM row centre line
const Z_MANIFOLD = -0.165;
const Z_CAGE = -0.19;          // front of the rear I/O cage

let dieTex;

function fan(P, i) {
  const fw = 0.084, fh = 0.124, fd = 0.095;
  const g = group(`Fan ${i + 1}`);
  const t = 0.004;
  g.add(box(fw, t, fd, P.zinc, 0, fh / 2 - t / 2, 0), box(fw, t, fd, P.zinc, 0, -fh / 2 + t / 2, 0));
  g.add(box(t, fh, fd, P.zinc, -fw / 2 + t / 2, 0, 0), box(t, fh, fd, P.zinc, fw / 2 - t / 2, 0, 0));
  // perforated grille (front) and shroud ring
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(fw - 0.006, fh - 0.006), P.perfGrille);
  grille.position.z = fd / 2 - 0.002;
  g.add(grille);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.004, 8, 32), P.steelDark);
  ring.position.z = fd / 2 - 0.012;
  g.add(ring);
  // rotor
  const rotor = group('Rotor', cyl(0.014, 0.03, P.black, 0, 0, 0, 'z'));
  for (let b = 0; b < 7; b++) {
    const blade = box(0.024, 0.002, 0.022, P.plastic, 0.025, 0, 0);
    blade.rotation.x = 0.6;
    const arm = new THREE.Group();
    arm.rotation.z = (b / 7) * Math.PI * 2;
    arm.add(blade);
    rotor.add(arm);
  }
  rotor.position.z = fd / 2 - 0.03;
  g.add(rotor);
  g.add(box(0.03, 0.006, 0.006, P.blue, 0, -fh / 2 + 0.006, fd / 2)); // release latch
  g.userData.rotor = rotor;
  return g;
}

function dimm(P) {
  const g = group('DIMM');
  g.add(box(0.0014, DIMM_H, DIMM_L, P.pcb, 0, DIMM_H / 2, 0));
  g.add(box(0.0042, 0.012, DIMM_L - 0.012, P.chip, 0, DIMM_H * 0.62, 0));
  g.add(box(0.0018, 0.003, DIMM_L - 0.008, P.gold, 0, 0.0015, 0));
  return g;
}

/** One PU dual chip module: 71.5 × 79 mm substrate, two Telum dies, thermal cap (lid). */
function dcm(P, i) {
  const g = group(`PU DCM ${i}`);
  const sw = 0.0715, sd = 0.079;
  g.add(box(sw, 0.0032, sd, P.pcbDark, 0, 0.0016, 0, 'Substrate'));
  g.add(box(sw - 0.004, 0.0006, sd - 0.004, P.gold, 0, -0.0003, 0, 'LGA pads'));
  const dies = group('Telum dies');
  dieTex ??= telumDieTexture();
  for (const s of [-1, 1]) {
    // 530 mm² die ≈ 23 × 23 mm
    const die = box(0.023, 0.0008, 0.023, P.silicon, s * 0.0155, 0.0036, 0, `Telum chip ${s < 0 ? 0 : 1}`);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(0.023, 0.023), P.dieTop);
    top.rotation.x = -Math.PI / 2;
    top.position.set(s * 0.0155, 0.00405, 0);
    top.name = 'Die floor plan';
    dies.add(die, top);
  }
  // decoupling capacitors around the dies
  for (let k = 0; k < 28; k++) {
    const a = k < 14 ? -1 : 1, j = k % 14;
    dies.add(box(0.0022, 0.0012, 0.0012, P.gold, -0.029 + j * 0.00445, 0.0038, a * 0.0178));
  }
  g.add(dies);
  const lid = group('Thermal cap',
    box(0.064, 0.0036, 0.062, P.nickel, 0, 0.0062, 0),
    box(0.068, 0.0012, 0.070, P.nickel, 0, 0.0044, 0));
  g.add(lid);
  Object.assign(g.userData, { lid, dies });
  return g;
}

/**
 * Build a CPC drawer.
 * @param P       material palette
 * @param detail  true = full internals (the hero drawer); false = shell with front and rear faces only
 */
export function buildCpcDrawer(P, { detail = true, name = 'CPC drawer' } = {}) {
  P.perfGrille ??= (() => { const m = P.perfSteel.clone(); m.alphaMap = P._perfTex.clone(); m.alphaMap.repeat.set(14, 12); m.alphaMap.wrapS = m.alphaMap.wrapT = THREE.RepeatWrapping; return m; })();
  P.dieTop ??= (() => {
    dieTex ??= telumDieTexture();
    return new THREE.MeshStandardMaterial({ map: dieTex, emissiveMap: dieTex, emissive: 0xffffff, emissiveIntensity: 0.22, metalness: 0.5, roughness: 0.35 });
  })();

  const root = group(name);
  const refs = { fans: [], frontCards: [], dimmGroups: [], pols: [], dcms: [], fanouts: [], psus: [], smp: [], rotors: [] };
  const t = 0.002;

  // ---- chassis
  const chassis = group('Chassis');
  chassis.add(box(W, t, D, P.steel, 0, t / 2, 0, 'Floor'));
  chassis.add(box(t, H, D, P.steel, -W / 2 + t / 2, H / 2, 0, 'Left wall'), box(t, H, D, P.steel, W / 2 - t / 2, H / 2, 0, 'Right wall'));
  chassis.add(box(W, t, 0.012, P.steel, 0, H - 0.05, Z_FAN, 'Fan bay rail'));
  for (const s of [-1, 1]) chassis.add(box(0.016, H, 0.004, P.steelDark, s * (W / 2 + 0.008), H / 2, ZF - 0.002, 'Rack ear'));
  root.add(chassis);

  // ---- covers (front cover spans fans→DCMs, rear cover the I/O cage)
  const coverFront = box(W, t, ZF - Z_CAGE, P.cover ?? P.steel, 0, H - t / 2, (ZF + Z_CAGE) / 2, 'Top cover (front)');
  const coverRear = box(W, t, Z_CAGE - ZR, P.cover ?? P.steel, 0, H - t / 2, (Z_CAGE + ZR) / 2, 'Top cover (rear)');
  root.add(coverFront, coverRear);
  Object.assign(refs, { coverFront, coverRear, chassis });

  // ---- front: 5 fans over BMC/OSC + PPC cards
  const fanY = H - 0.064;
  for (let i = 0; i < 5; i++) {
    const f = fan(P, i);
    f.position.set((i - 2) * 0.0875, fanY, ZF - 0.05);
    root.add(f); refs.fans.push(f); refs.rotors.push(f.userData.rotor);
  }
  P.bmcFace ??= textured(P, P.zinc, portTexture(2, 'rj45', 'BMC/OSC'));
  P.ppcFace ??= textured(P, P.zinc, labelTexture('PPC', { w: 512, h: 64, bg: '#2a2e33', fg: '#c8ced6', font: '600 40px Arial' }));
  for (const s of [-1, 1]) {
    const bmc = group(`BMC/OSC card ${s < 0 ? 1 : 2}`,
      box(0.20, 0.002, 0.16, P.pcb, 0, -0.012, -0.08),
      box(0.20, 0.034, 0.004, P.bmcFace, 0, 0, 0),
      cyl(0.004, 0.008, P.gold, -0.03, 0, 0.004, 'z'),      // PPS coax
      box(0.03, 0.02, 0.03, P.chip, 0.02, -0.004, -0.07));
    bmc.position.set(s * 0.108, 0.064, ZF - 0.002);
    const ppc = group(`PPC card ${s < 0 ? 1 : 2}`,
      box(0.20, 0.002, 0.16, P.pcb, 0, -0.012, -0.08),
      box(0.20, 0.034, 0.004, P.ppcFace, 0, 0, 0),
      box(0.012, 0.03, 0.008, P.blue, s * 0.088, 0, 0.004));
    ppc.position.set(s * 0.108, 0.024, ZF - 0.002);
    root.add(bmc, ppc); refs.frontCards.push(bmc, ppc);
  }

  // ---- rear face: fanout slots, SMP9, PSUs, water quick-connect
  const cage = group('Rear I/O');
  P.fanoutFace ??= textured(P, P.zinc, portTexture(2, 'qsfp', ''));
  const slotX = (i) => (i < 6 ? -0.205 + i * 0.031 : 0.05 + (i - 6) * 0.031);
  for (let i = 0; i < 12; i++) {
    const f = group(`PCIe+ fanout LG${String(i + 1).padStart(2, '0')}`);
    const face = box(0.024, 0.112, 0.003, P.fanoutFace, 0, 0, 0);
    face.material = P.fanoutFace;
    f.add(face);
    // face texture is landscape; turn the bracket so the two ports stack vertically
    face.rotation.z = Math.PI / 2; face.scale.set(0.112, 0.024, 0.003);
    f.add(box(0.008, 0.016, 0.006, P.blue, 0, 0.064, -0.002));
    if (detail) {
      f.add(box(0.0016, 0.10, 0.19, P.pcb, 0, 0, 0.097));
      f.add(box(0.014, 0.05, 0.06, P.alu, 0.004, 0, 0.09), box(0.004, 0.012, 0.03, P.gold, 0, -0.056, 0.17));
    }
    f.position.set(slotX(i), 0.148, ZR + 0.002);
    cage.add(f); refs.fanouts.push(f);
  }
  for (let i = 0; i < 6; i++) {
    const s = group(`SMP9 connector ${i + 1}`,
      box(0.036, 0.016, 0.03, P.blackGloss, 0, 0, 0.012),
      box(0.03, 0.010, 0.004, P.blue, 0, 0, -0.004));
    s.position.set(-0.17 + Math.floor(i / 2) * 0.15 + (i % 2) * 0.042, 0.068, ZR + 0.002);
    cage.add(s); refs.smp.push(s);
  }
  P.psuFace ??= P.perfGrille;
  for (let i = 0; i < 4; i++) {
    const p = group(`PSU ${i + 1}`);
    p.add(box(0.104, 0.040, detail ? 0.24 : 0.02, P.zinc, 0, 0, detail ? 0.12 : 0.01));
    const fanFace = new THREE.Mesh(new THREE.CircleGeometry(0.017, 20), P.black);
    fanFace.position.set(-0.028, 0, -0.0006); fanFace.rotation.y = Math.PI;
    p.add(fanFace, box(0.03, 0.022, 0.004, P.black, 0.022, 0, -0.002, 'C20 inlet'), box(0.006, 0.03, 0.01, P.orange, 0.046, 0, -0.004));
    p.position.set((i - 1.5) * 0.108, 0.026, ZR);
    cage.add(p); refs.psus.push(p);
  }
  const quick = group('Water quick-connect',
    cyl(0.013, 0.07, P.alu, 0, 0, -0.02, 'z'), cyl(0.016, 0.02, P.steelDark, 0, 0, -0.03, 'z'), cyl(0.010, 0.02, P.yellow, 0, 0, 0.0, 'z'));
  quick.position.set(0.012, 0.10, ZR);
  cage.add(quick);
  cage.add(box(W, 0.004, 0.004, P.steelDark, 0, 0.088, ZR + 0.002), box(W, 0.004, 0.004, P.steelDark, 0, 0.05, ZR + 0.002));
  root.add(cage);
  refs.quick = quick;

  if (!detail) {
    // closed shell: blank the interior so nothing shows through the grilles
    root.add(box(W - 0.01, H - 0.01, D - 0.24, P.black, 0, H / 2, -0.01, 'Interior'));
    return { group: root, refs };
  }

  // ---- processor board
  const board = box(W - 0.01, 0.0024, Z_FAN - Z_CAGE + 0.02, P.pcb, 0, 0.010, (Z_FAN + Z_CAGE) / 2, 'Processor board');
  root.add(board);
  const BY = 0.0112; // board top surface

  // ---- memory: 2 banks × 3 groups × 8 DIMMs = 48, POL cards between the groups
  const pitch = 0.0112, gw = 8 * pitch, gap = 0.034;
  const bankZ = [Z_DIMM0 - DIMM_L / 2, Z_DIMM0 - DIMM_L - 0.012 - DIMM_L / 2];
  bankZ.forEach((bz, b) => {
    for (let gi = 0; gi < 3; gi++) {
      const gx = (gi - 1) * (gw + gap);
      const mg = group(`DIMM group ${b * 3 + gi + 1} (8 DIMMs, 1 memory controller)`);
      for (let k = 0; k < 8; k++) {
        const d = dimm(P);
        d.position.set((k - 3.5) * pitch, 0, 0);
        mg.add(d);
      }
      mg.position.set(gx, BY + 0.006, bz);
      root.add(mg); refs.dimmGroups.push(mg);
      root.add(box(gw + 0.004, 0.006, DIMM_L + 0.008, P.plastic, gx, BY + 0.003, bz, 'DIMM sockets'));
    }
    for (const s of [-1, 1]) {
      const pol = group('POL card',
        box(0.002, 0.036, DIMM_L - 0.02, P.pcbDark, 0, 0.018, 0),
        box(0.012, 0.020, 0.03, P.chip, 0.004, 0.02, -0.03), box(0.012, 0.020, 0.03, P.chip, 0.004, 0.02, 0.03),
        box(0.010, 0.014, 0.016, P.copper, -0.004, 0.022, 0));
      pol.position.set(s * (gw + gap) / 2, BY, bz);
      root.add(pol); refs.pols.push(pol);
    }
  });
  // VRMs outboard of the DCM row
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
    const v = group('VRM',
      box(0.002, 0.04, 0.07, P.pcbDark, 0, 0.02, 0), box(0.012, 0.03, 0.05, P.alu, s * -0.006, 0.022, 0));
    v.position.set(s * (W / 2 - 0.014 - k * 0.012), BY, Z_DCM);
    root.add(v);
  }

  // ---- 4 PU DCMs in sockets, each under a cold plate
  const cooling = group('Cold plate & manifold assembly');
  const dcmX = (i) => (i - 1.5) * 0.098;
  for (let i = 0; i < 4; i++) {
    const x = dcmX(i);
    // socket (stays on the board)
    root.add(group(`DCM socket ${i} (4,753 pins)`,
      box(0.086, 0.004, 0.092, P.plastic, x, BY + 0.002, Z_DCM),
      box(0.070, 0.0008, 0.078, P.gold, x, BY + 0.0044, Z_DCM)));
    const m = dcm(P, i);
    m.position.set(x, BY + 0.0046, Z_DCM);
    root.add(m); refs.dcms.push(m);

    // cold plate + load frame
    const cp = group(`Cold plate ${i}`,
      box(0.066, 0.018, 0.066, P.copper, 0, 0.009, 0),
      box(0.070, 0.003, 0.070, P.copper, 0, 0.0015, 0),
      box(0.090, 0.005, 0.010, P.steelDark, 0, 0.0205, -0.039, 'Load frame'),
      box(0.090, 0.005, 0.010, P.steelDark, 0, 0.0205, 0.039, 'Load frame'),
      box(0.012, 0.012, 0.012, P.alu, -0.018, 0.024, -0.02, 'Inlet'), box(0.012, 0.012, 0.012, P.alu, 0.018, 0.024, -0.02, 'Outlet'));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cp.add(cyl(0.004, 0.012, P.steel, sx * 0.037, 0.022, sz * 0.039));
    cp.position.set(x, BY + 0.0146, Z_DCM);
    cooling.add(cp);
    // supply / return hoses from the manifold
    const y0 = BY + 0.036;
    cooling.add(hose([[x - 0.018, y0 - 0.008, Z_DCM - 0.02], [x - 0.018, y0 + 0.012, Z_DCM - 0.035], [x - 0.02, y0 + 0.018, Z_MANIFOLD + 0.03], [x - 0.02, y0 + 0.006, Z_MANIFOLD + 0.012]], 0.0055, P.hose, 'Supply hose'));
    cooling.add(hose([[x + 0.018, y0 - 0.008, Z_DCM - 0.02], [x + 0.018, y0 + 0.014, Z_DCM - 0.04], [x + 0.02, y0 + 0.026, Z_MANIFOLD + 0.03], [x + 0.02, y0 + 0.024, Z_MANIFOLD - 0.008]], 0.0055, P.hose, 'Return hose'));
    cooling.add(cyl(0.0075, 0.014, P.orange, x - 0.02, y0 + 0.006, Z_MANIFOLD + 0.012, 'z'));
    cooling.add(cyl(0.0075, 0.014, P.magenta, x + 0.02, y0 + 0.024, Z_MANIFOLD - 0.008, 'z'));
  }
  const my = BY + 0.042;
  cooling.add(cyl(0.010, W - 0.07, P.alu, 0, my, Z_MANIFOLD + 0.004, 'x', 'Supply manifold'));
  cooling.add(cyl(0.010, W - 0.07, P.alu, 0, my + 0.018, Z_MANIFOLD - 0.018, 'x', 'Return manifold'));
  cooling.add(cyl(0.009, Z_MANIFOLD - ZR - 0.06, P.alu, 0.012, 0.10, (Z_MANIFOLD + ZR) / 2 - 0.03 + 0.03, 'z', 'Manifold feed'));
  cooling.add(hose([[0.012, my + 0.01, Z_MANIFOLD - 0.01], [0.012, 0.085, Z_MANIFOLD - 0.03], [0.012, 0.10, Z_MANIFOLD - 0.06]], 0.009, P.alu));
  root.add(cooling);
  refs.cooling = cooling;

  // bulkhead between the processor bay and the rear cage
  root.add(box(W - 0.004, 0.05, 0.002, P.steel, 0, 0.03, Z_CAGE, 'Bulkhead'));
  return { group: root, refs };
}
