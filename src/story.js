// The teardown: every move, camera key, caption and callout, keyed to seconds.
// Facts in the captions are from the IBM z16 (3931) Technical Guide, SG24-8951 (see docs/RESEARCH.md).
import * as THREE from 'three';
import { Timeline, CameraPath, pulse } from './timeline.js';
import { fadePalette } from './kit.js';
import { uY } from './model/rack.js';

export const DURATION = 96;
export const FOV = 35;

export function buildStory({ rack, palettes }) {
  const tl = new Timeline();
  const R = rack.refs, hero = R.cpc[0], h = hero.refs;
  const END = { rack: 85.5, stage: 86, slide: 88.5, doors: 90 };

  // ---- 1. open the frame
  tl.move(R.frontDoor, { rot: [0, -2.0, 0] }, { in: 6, dur: 3, out: END.doors + 1, outDur: 2.5 });
  tl.move(R.rearDoor, { rot: [0, -2.0, 0] }, { in: 6.5, dur: 3, out: END.doors + 1, outDur: 2.5 });
  tl.move(R.sideL, { pos: [-0.45, 0, 0] }, { in: 8, dur: 2.5, out: END.doors, outDur: 2 });
  tl.move(R.sideR, { pos: [0.45, 0, 0] }, { in: 8, dur: 2.5, out: END.doors, outDur: 2 });
  const doorParts = [R.frontDoor, R.rearDoor, R.sideL, R.sideR];
  tl.hook((t) => {
    const k = 1 - pulse(t, 9, 2.5, END.doors - 0.5, 1.5);
    fadePalette(palettes.doors, k);
    for (const d of doorParts) d.visible = k > 0.002;
  });

  // ---- 2. rear: pull a Crypto Express8S card
  tl.move(R.io.refs.crypto, { pos: [0, 0, -0.34] }, { in: 28.5, dur: 2, out: 31.8, outDur: 1.5 });

  // ---- 3. CPC0 slides out, then floats to the "bench"; the rack ghosts away
  const STAGE = [0, 0.45, 1.35];
  tl.move(hero.group, { pos: [0, 0, 0.95] }, { in: 35, dur: 3, out: END.slide, outDur: 2 });
  tl.move(hero.group, { pos: STAGE }, { in: 38, dur: 3, out: END.stage, outDur: 2.5 });
  const rackParts = rack.group.children.filter((c) => c !== hero.group && !doorParts.includes(c));
  tl.hook((t) => {
    const k = 1 - pulse(t, 39, 2.5, END.rack, 2);
    fadePalette(palettes.rack, k);
    for (const p of rackParts) p.visible = k > 0.002;
  });

  // ---- 4. covers off
  tl.move(h.coverFront, { pos: [0, 0.30, 0.05] }, { in: 42, dur: 2.2, out: 84, outDur: 2 });
  tl.move(h.coverRear, { pos: [0, 0.30, -0.05] }, { in: 42.4, dur: 2.2, out: 84, outDur: 2 });
  tl.hook((t) => {
    const k = 1 - pulse(t, 42.6, 1.8, 84, 1.6);
    fadePalette(palettes.cover, k);
    h.coverFront.visible = h.coverRear.visible = k > 0.002;
  });

  // ---- 5. explode the drawer
  const back = { out: 82.2, outDur: 2 };
  h.fans.forEach((f, i) => tl.move(f, { pos: [0, 0, 0.20 + 0.012 * Math.abs(i - 2)] }, { in: 47 + i * 0.22, dur: 1.6, ...back }));
  h.frontCards.forEach((c, i) => tl.move(c, { pos: [0, 0, 0.15] }, { in: 48.6 + i * 0.15, dur: 1.4, ...back }));
  h.dimmGroups.forEach((g, i) => tl.move(g, { pos: [0, 0.13 + (i < 3 ? 0 : 0.045), 0] }, { in: 49.6 + i * 0.28, dur: 1.6, ...back }));
  h.pols.forEach((p, i) => tl.move(p, { pos: [0, 0.07, 0] }, { in: 51.6 + i * 0.1, dur: 1.4, ...back }));
  h.fanouts.forEach((f, i) => tl.move(f, { pos: [0, 0.19, 0] }, { in: 51.4 + i * 0.09, dur: 1.5, ...back }));
  h.psus.forEach((p, i) => tl.move(p, { pos: [0, 0, -0.20] }, { in: 53 + i * 0.2, dur: 1.5, ...back }));

  // ---- 6. cold plates off, one DCM out, lid off
  const dcm = h.dcms[1];
  tl.move(h.cooling, { pos: [0, 0.44, -0.30] }, { in: 58, dur: 2.4, out: 81.6, outDur: 2 });
  tl.move(dcm, { pos: [0, 0.30, 0] }, { in: 60, dur: 2.4, out: 80.6, outDur: 1.8 });
  tl.move(dcm.userData.lid, { pos: [0, 0.035, -0.02] }, { in: 65.2, dur: 1.8, out: 79.6, outDur: 1.2 });
  tl.move(dcm.userData.lid, { pos: [0.078, 0, 0] }, { in: 67, dur: 1.5, out: 79.6, outDur: 1.2 });

  // ---- fans spin while powered
  const heroRotors = new Set(h.rotors);
  const rotors = [];
  rack.group.traverse((o) => { if (o.name === 'Rotor') rotors.push(o); });
  tl.hook((t) => {
    const heroT = Math.min(t, 34.5) + Math.max(0, t - 91);
    for (const r of rotors) r.rotation.z = -11 * (heroRotors.has(r) ? heroT : t);
  });

  // ---- camera
  const hy = uY(10) + 0.003;
  const C = [0, hy + STAGE[1] + 0.11, 0.02 + 0.95 + STAGE[2]];                 // hero drawer centre on the bench
  const M = [-0.049, hy + STAGE[1] + 0.0158 + 0.30, C[2] - 0.075];             // lifted DCM
  const DIE = [M[0] - 0.0155, M[1] + 0.004, M[2]];                             // Telum chip 0
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const camera = new CameraPath([
    { t: 0, pos: [3.3, 1.6, 5.4], look: [0, 1.0, 0] },
    { t: 6, pos: [-1.0, 1.4, 6.2], look: [-0.2, 1.0, 0] },
    { t: 11, pos: [2.3, 1.4, 4.9], look: [-0.4, 1.0, 0] },
    { t: 14.5, pos: [1.15, 1.75, 2.9], look: [-0.3, 1.5, 0.1] },
    { t: 18.5, pos: [1.15, 1.05, 2.9], look: [-0.3, 0.72, 0.2] },
    { t: 22, pos: [1.0, 0.7, 2.7], look: [-0.25, 0.3, 0.2] },
    { t: 25, pos: [3.0, 1.2, -0.2], look: [0, 1.0, 0] },
    { t: 28, pos: [0.95, 1.6, -2.2], look: [0.25, 1.42, -0.3] },
    { t: 31.5, pos: [0.85, 1.6, -2.25], look: [0.25, 1.42, -0.3] },
    { t: 34, pos: [0.9, 0.95, -2.1], look: [0.2, 0.68, -0.4] },
    { t: 36.5, pos: [2.9, 1.2, 0.9], look: [0, 0.7, 0.6] },
    { t: 39, pos: [2.2, 1.35, 3.6], look: [-0.2, 0.7, 1.2] },
    { t: 42, pos: add(C, [0.95, 0.9, 1.3]), look: add(C, [-0.22, -0.12, 0.05]) },
    { t: 47, pos: add(C, [0.8, 1.0, 1.3]), look: add(C, [-0.22, -0.12, 0.05]) },
    { t: 57, pos: add(C, [-1.2, 1.0, 1.1]), look: add(C, [0.15, -0.08, 0]) },
    { t: 62.5, pos: add(M, [0.17, 0.16, 0.22]), look: add(M, [-0.03, -0.03, 0]) },
    { t: 66, pos: add(M, [0.075, 0.115, 0.125]), look: add(M, [-0.012, -0.012, 0]) },
    { t: 71.5, pos: add(M, [0.06, 0.12, 0.12]), look: add(M, [-0.012, -0.012, 0]) },
    { t: 74, pos: add(DIE, [0, 0.062, 0.004]), look: DIE },
    { t: 80, pos: add(DIE, [0, 0.056, 0.004]), look: DIE },
    { t: 83.5, pos: add(C, [0.95, 0.95, 1.3]), look: C },
    { t: 87, pos: [2.2, 1.4, 4.2], look: [-0.2, 0.9, 0.9] },
    { t: 91, pos: [3.0, 1.5, 5.4], look: [-0.3, 1.0, 0] },
    { t: 96, pos: [1.8, 1.45, 6.0], look: [-0.3, 1.0, 0] },
  ]);

  // ---- captions (lower third)
  const captions = [
    { t0: 6.2, t1: 11, kicker: 'Machine type 3931 · Model A01', title: 'The A frame', text: 'A standard 19-inch, 42U rack. One to four frames bolt together into a single system.' },
    { t0: 11.5, t1: 23, kicker: 'Inside the frame', title: 'Processors below, I/O above', text: 'Everything is redundant: two support elements, two switches, N+1 pumps, fans and power supplies.' },
    { t0: 24.5, t1: 34.5, kicker: 'Rear of the frame', title: 'All cabling happens at the back', text: 'Power, I/O, coupling links and the water loop all enter and connect at the rear.' },
    { t0: 35.5, t1: 41.5, kicker: 'Central processor complex', title: 'The CPC drawer', text: '5U tall. One to four per system, joined point-to-point by SMP9 cables.' },
    { t0: 42.2, t1: 47, kicker: 'CPC drawer · cover off', title: '64 cores and up to 10 TB of memory', text: 'Four dual chip modules, 48 DIMM slots and their own power and cooling in each drawer.' },
    { t0: 47.6, t1: 57.5, kicker: 'CPC drawer · exploded', title: 'Built to be repaired while running', text: 'Fans, power supplies, control cards and fanouts can be replaced concurrently.' },
    { t0: 58.4, t1: 65, kicker: 'Closed-loop water cooling', title: 'Cold plates on every processor module', text: 'Water carries heat from the DCMs to the radiator unit. No facility chilled water is needed.' },
    { t0: 65.4, t1: 73, kicker: 'PU dual chip module', title: 'Two processors, one module', text: '71.5 × 79 mm, 4,753 pins. Two Telum chips share one thermal cap.' },
    { t0: 74, t1: 81, kicker: 'IBM Telum · 7 nm', title: '22.5 billion transistors at 5.2 GHz', text: '8 cores, 32 MB of L2 per core, and an on-chip AI accelerator. 530 mm² of silicon.' },
    { t0: 86.5, t1: 95.2, kicker: 'IBM z16 A01 · maximum configuration', title: '200 cores · 40 TB · four frames', text: 'Four CPC drawers, up to twelve PCIe+ I/O drawers and 192 I/O features in one system.' },
  ];

  // ---- callouts: { t0, t1, at: () => Vector3 (world), off: [dx, dy] in vh, title, text }
  const v = new THREE.Vector3();
  const of = (obj, dx = 0, dy = 0, dz = 0) => () => obj.localToWorld(v.set(dx, dy, dz)).clone();
  const world = (p) => () => new THREE.Vector3(...p);
  const dieAt = (u, w) => world([DIE[0] + (u - 0.5) * 0.023, DIE[1], DIE[2] + (w - 0.5) * 0.023]);
  const callouts = [
    // interior, front
    { t0: 12.5, t1: 17.5, at: of(R.ses[0], 0.2, 0, 0), off: [26, -9], title: '2 × Support Element', text: '1U servers that manage the system (A41, A42)' },
    { t0: 13.2, t1: 17.5, at: of(R.switches[0], 0.2, 0, 0), off: [28, 3], title: '2 × Ethernet switch', text: '24-port internal management LAN' },
    { t0: 14, t1: 18, at: of(R.io.group, 0.18, 0.17, 0.35), off: [30, 14], title: 'PCIe+ I/O drawer', text: '8U · 16 adapter slots · up to 12 per system' },
    { t0: 17.8, t1: 21.6, at: of(R.cpc[1].group, 0.2, 0.11, 0.4), off: [30, -8], title: 'CPC drawers', text: 'Up to 3 in the A frame, a 4th in frame B' },
    { t0: 21.2, t1: 24.2, at: of(R.rcu, 0.15, 0.2, 0.39), off: [28, -12], title: 'Radiator cooling unit', text: 'N+1 pumps and fans cool the processor water loop' },
    // rear
    { t0: 27, t1: 33, at: of(R.io.group, 0.1, 0.3, -0.35), off: [-34, -10], title: '16 PCIe adapter slots', text: 'FICON, OSA, RoCE, coupling and crypto cards' },
    { t0: 29.6, t1: 32.4, at: () => R.io.refs.crypto.localToWorld(v.set(0, 0, -0.02)).clone(), off: [26, 12], title: 'Crypto Express8S', text: 'Tamper-responding HSM with quantum-safe algorithms' },
    { t0: 27.6, t1: 33, at: of(R.pdus[1], 0, 0.3, -0.03), off: [-24, -24], title: 'Intelligent PDUs', text: '2 to 8 three-phase line cords' },
    { t0: 33.2, t1: 35.6, at: of(R.smpCables, -0.17, uY(13), -0.44), off: [-30, 6], title: 'SMP9 cables', text: 'Drawer-to-drawer A-bus, in redundant pairs' },
    { t0: 33.5, t1: 35.6, at: of(R.hoses, -0.16, 0.5, -0.45), off: [22, 14], title: 'Water hoses', text: 'Supply and return for each CPC drawer' },
    // drawer, cover off
    { t0: 43.6, t1: 47.2, at: of(h.fans[4], 0.02, 0.06, 0.03), off: [26, 4], title: '5 fans', text: 'Air-cool memory and power' },
    { t0: 44.0, t1: 47.2, at: of(h.dimmGroups[2], 0.03, 0.03, 0), off: [34, -8], title: '48 DIMM slots', text: '6 memory controllers × 8 DDR4 DIMMs, RAIM protected' },
    { t0: 44.4, t1: 47.2, at: of(h.cooling, 0.147, 0.05, -0.075), off: [30, -20], title: '4 PU DCMs', text: 'Under water-cooled cold plates' },
    { t0: 44.8, t1: 47.2, at: of(h.fanouts[3], 0, 0.06, 0.1), off: [-22, -22], title: '12 fanout slots', text: 'PCIe+ Gen3 to I/O drawers, ICA SR coupling' },
    { t0: 45.2, t1: 47.2, at: of(h.frontCards[0], -0.05, 0, 0.01), off: [-30, 1], title: '2 × BMC/OSC, 2 × PPC', text: 'System control, clock, power control' },
    // exploded
    { t0: 54.5, t1: 57.6, at: of(h.psus[0], 0, 0, -0.02), off: [-4, 14], title: '4 power supplies', text: 'N+1, hot swappable' },
    { t0: 54.9, t1: 57.6, at: of(h.dimmGroups[3], 0, 0.035, 0), off: [-10, -24], title: 'Up to 10 TB per drawer', text: '40 TB across four drawers' },
    { t0: 55.3, t1: 57.6, at: of(h.fans[0], -0.03, 0, 0.05), off: [4, -17], title: 'Hot-swap fans', text: 'Five per drawer' },
    // DCM
    { t0: 62.6, t1: 65.2, at: of(dcm, 0.02, 0.008, 0.01), off: [30, -12], title: 'PU dual chip module', text: '16 cores under one thermal cap' },
    { t0: 68.6, t1: 72.6, at: of(dcm.userData.dies, -0.0155, 0.004, 0), off: [-30, -14], title: 'Telum chip 0', text: '8 cores' },
    { t0: 69.0, t1: 72.6, at: of(dcm.userData.dies, 0.0155, 0.004, 0), off: [8, -30], title: 'Telum chip 1', text: 'Linked to chip 0 by the M-bus' },
    { t0: 69.4, t1: 72.6, at: of(dcm.userData.lid, 0, 0.008, 0), off: [-26, 13], title: 'Thermal cap', text: 'Sits between the chips and the cold plate' },
    // die
    { t0: 75.0, t1: 80.4, at: dieAt(0.115, 0.27), off: [-34, -8], title: 'Core', text: '8 per chip · SMT2 · 5.2 GHz' },
    { t0: 75.5, t1: 80.4, at: dieAt(0.725, 0.45), off: [42, 22], title: 'L2 cache', text: '32 MB per core · virtual L3 256 MB, L4 2 GB' },
    { t0: 76.0, t1: 80.4, at: dieAt(0.115, 0.955), off: [-30, -16], title: 'AI accelerator (AIU)', text: 'On-chip inference, shared by all cores' },
    { t0: 76.5, t1: 80.4, at: dieAt(0.86, 0.04), off: [40, 2], title: 'X-bus', text: 'Links the 8 chips within a drawer' },
  ];

  const title = { t0: 0.6, t1: 5.6, kicker: 'DEEP TEARDOWN', title: 'IBM z16', text: 'Inside a million-dollar mainframe' };
  return { tl, camera, captions, callouts, title };
}
