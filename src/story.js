// The edit of the long-form video. Every move is keyed to a narration beat (content/script.js),
// whose times come from the recorded voice-over (content/timing.js), so the picture follows the audio.
import * as THREE from 'three';
import { Timeline, ShotCamera, pulse, ramp } from './timeline.js';
import { fadePalette, box, group, DIE, CORE_UNITS } from './kit.js';
import { uY, FRAME } from './model/rack.js';
import { addFlow, highlight, link, coreDetail } from './model/extras.js';
import { CHAPTERS, TITLE } from '../content/script.js';
import { TIMING } from '../content/timing.js';

export const DURATION = TIMING.total;
export const FOV = 35;
export const CARD = 4;                       // seconds a chapter card is on screen

export function buildStory({ rack, palettes, reader, finfet, packet, shells, scene }) {
  const tl = new Timeline();
  const R = rack.refs, hero = R.cpc[0], h = hero.refs, io = R.io.refs;

  // ------------------------------------------------------------ time helpers
  const order = [];
  for (const c of CHAPTERS) { if (c.title) order.push({ start: TIMING.chapters[c.id].start }); for (const b of c.beats) order.push({ id: b.id, start: TIMING.beats[b.id].start }); }
  const S = (id) => TIMING.beats[id].start;                       // beat starts
  const E = (id) => S(id) + TIMING.beats[id].dur;                 // narration ends
  const N = (id) => { const i = order.findIndex((o) => o.id === id); return order[i + 1]?.start ?? DURATION; }; // next thing starts
  const CH = (id) => TIMING.chapters[id].start;

  const sfx = [];                       // { t, name, gain } for the sound mix
  const cue = (t, name, gain = 1) => sfx.push({ t: +t.toFixed(3), name, gain });
  const dips = [];                      // fades through black (cuts happen at the centre)
  const dip = (t) => { dips.push(t); return t; };
  const fx = [];                        // glow overlays: { m, t0, t1, max, hz }
  const glow = (m, t0, t1, max = 0.5, hz = 0.6) => { fx.push({ m, t0, t1, max, hz }); return m; };
  const emis = [];                      // emissive pulses on materials: { mat, t0, t1, color, max, hz }
  const pulseMat = (mat, t0, t1, color, max = 1.2, hz = 0.8) => emis.push({ mat, t0, t1, color: new THREE.Color(color), max, hz });
  /** Give an object subtree its own copies of its materials, and return them. */
  const isolate = (obj) => { const out = []; obj.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); out.push(o.material); } }); return out; };

  // ------------------------------------------------------------ world positions
  const Hp = hero.group.position.clone();                           // drawer at home
  const BO = [0, 0.45, 2.3];                                        // home → bench offset
  const C = [Hp.x + BO[0], Hp.y + BO[1] + 0.11, Hp.z + BO[2]];      // drawer centre on the bench
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const bench = (l) => [Hp.x + BO[0] + l[0], Hp.y + BO[1] + l[1], Hp.z + BO[2] + l[2]];   // drawer-local → bench world
  const homeW = (l) => [Hp.x + l[0], Hp.y + l[1], Hp.z + l[2]];
  const dcm = h.dcms[1];
  const M = bench([dcm.position.x, dcm.position.y + 0.30, dcm.position.z]);       // lifted DCM
  const DIEC = add(M, [-0.0155, 0.0042, 0]);                                       // centre of Telum chip 0
  const dieP = (u, w, y = 0) => [DIEC[0] + (u - 0.5) * 0.023, DIEC[1] + y, DIEC[2] + (w - 0.5) * 0.023];
  const rc = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2];             // rect centre (u, v)
  const ioG = R.io.group.position;
  const cardW = (c, dz = 0) => [ioG.x + c.position.x, ioG.y + c.position.y, ioG.z + c.position.z + dz];
  const RX = reader.group.position, FX = finfet.group.position;

  // ------------------------------------------------------------ hero drawer: home ↔ bench
  const dHome1 = dip(S('pw1') - 0.45), dBench1 = dip(S('pw3') - 0.45);
  const dHome2 = dip(S('w4') - 0.45), dBench2 = dip(S('p1') - 0.45);
  const dHome3 = dip(S('s4') + 5.2);
  const homeWin = [[dHome1, dBench1], [dHome2, dBench2], [dHome3, Infinity]];
  const atHome = (t) => homeWin.some(([a, b]) => t >= a && t < b);
  const g = (t) => (atHome(t) ? 0 : 1);                              // gate for everything that belongs to the bench

  const tOut = S('d2') + 0.4;
  tl.move(hero.group, { pos: [0, 0, 0.95] }, { in: tOut, dur: 2.6, gate: g });
  tl.move(hero.group, { pos: [0, BO[1], BO[2] - 0.95] }, { in: tOut + 2.4, dur: 2.8, gate: g });
  cue(tOut, 'slide'); cue(tOut + 2.5, 'whoosh', 0.7);
  const doorParts = [R.frontDoor, R.rearDoor, R.sideL, R.sideR];
  const rackParts = rack.group.children.filter((c) => c !== hero.group && !doorParts.includes(c));
  const rackK = (t) => (t < dHome1 ? 1 - ramp(t, tOut + 3.2, 2.2) : atHome(t) ? 1 : 0);
  tl.hook((t) => { const k = rackK(t); fadePalette(palettes.rack, k); for (const p of rackParts) p.visible = k > 0.002; });

  // covers of the A frame: open in "frame", closed again for the finale
  const tOpen = S('f4') + 0.8, dClose = dip(S('z4') - 0.45);
  const shut = (t) => (t >= dClose ? 0 : 1);
  tl.move(R.frontDoor, { rot: [0, -2.0, 0] }, { in: tOpen, dur: 2.6, gate: shut });
  tl.move(R.rearDoor, { rot: [0, -2.0, 0] }, { in: tOpen + 0.4, dur: 2.6, gate: shut });
  tl.move(R.sideL, { pos: [-0.5, 0, 0] }, { in: tOpen + 1.6, dur: 2.2, gate: shut });
  tl.move(R.sideR, { pos: [0.5, 0, 0] }, { in: tOpen + 1.6, dur: 2.2, gate: shut });
  cue(tOpen, 'door'); cue(tOpen + 1.6, 'whoosh', 0.6);
  tl.hook((t) => { const k = t >= dClose ? 1 : 1 - ramp(t, tOpen + 2.4, 2.2); fadePalette(palettes.doors, k); for (const d of doorParts) d.visible = k > 0.002; });

  // extra frames Z, B, C: a four-frame system
  const shellWin = [[S('f3') + 2.2, S('f4') - 0.3], [S('s5') + 0.6, CH('never') + 1.5], [dClose, Infinity]];
  shells.forEach((s, i) => {
    const home = [-0.6, 0.6, 1.2][i], from = home < 0 ? -5 : 5;
    s.position.x = home;
    shellWin.slice(0, 2).forEach(([a, b]) => { cue(a + i * 0.35 + 1.2, 'thud', 0.6); });
    tl.hook((t) => {
      let k = 0;
      for (const [a, b] of shellWin) k = Math.max(k, b === Infinity ? (t >= a ? 1 : 0) : pulse(t, a + i * 0.35, 1.6, b - 1.4, 1.4));
      s.position.x = home + from * (1 - k) ** 2;
      s.visible = k > 0.001;
    });
  });
  // a second mainframe, coupled to the first ("never" chapter)
  const twin = shells[2], twinWin = [S('r3b') + 0.8, N('r3b')];
  const coupling = link([0.35, 1.2, -0.62], [3.65, 1.2, -0.62], 0.02, 0x5fe6ff);
  scene.add(coupling);
  glow(coupling, twinWin[0] + 2, twinWin[1], 0.9, 1.2);
  tl.hook((t) => { const k = pulse(t, twinWin[0], 1.8, twinWin[1] - 1.4, 1.4); if (k > 0.001) { twin.visible = true; twin.position.x = 4 + 6 * (1 - k) ** 2; } });

  // ------------------------------------------------------------ card reader (hook and close)
  const cardRest = reader.card.position.clone(), cardRot = reader.card.rotation.clone();
  const tapA = S('h1') + 0.7, tapZ = S('z3') - 6;
  tl.hook((t) => {
    const k = Math.max(pulse(t, tapA, 1.3, tapA + 4.5, 1.2), 0);
    reader.card.position.copy(cardRest).lerp(reader.tap.pos, k);
    reader.card.rotation.set(cardRot.x * (1 - k) + reader.tap.rotX * k, cardRot.y * (1 - k), cardRot.z * (1 - k));
    const approvedA = E('h1') - 0.75, approvedZ = E('z3') + 0.9;
    const phase = t < dips[0] + 0 && t < S('h3') ? (t < tapA + 1.3 ? 0 : t < approvedA ? 1 : 2) : (t < approvedZ ? 1 : 2);
    reader.setLeds(phase === 0 ? (k > 0.5 ? 1 + Math.min(3, Math.floor((k - 0.5) * 8)) : 1) : 4); reader.screens.idle.visible = phase === 0; reader.screens.wait.visible = phase === 1; reader.screens.ok.visible = phase === 2;
  });
  cue(tapA + 1.3, 'beep', 0.8); cue(E('h1') - 0.75, 'approved'); cue(E('z3') + 0.9, 'approved', 1.2);

  // ------------------------------------------------------------ I/O drawer and crypto card
  const slide = (c, t0, t1, d = 0.2) => { tl.move(c, { pos: [0, 0, -d] }, { in: t0, dur: 1.0, out: t1, outDur: 0.9 }); cue(t0, 'click', 0.7); };
  const osa = io.card('osa', 1), fc = io.card('fc', -1), cpl = io.card('cpl', -1), swR = io.card('sw', 1), swL = io.card('sw', -1), crypto = io.card('crypto', 1);
  slide(osa, S('i3') + 2.2, N('i3') - 1.2, 0.16);
  slide(osa, S('i4') + 2.6, S('i4') + 7.6);
  slide(fc, S('i4') + 7.8, S('i4') + 14.2);
  slide(cpl, S('i4') + 14.4, N('i4') - 1.0);
  slide(swR, S('i5b') + 1.0, N('i5b') - 1.0, 0.12); slide(swL, S('i5b') + 1.3, N('i5b') - 1.0, 0.12);
  // domain tint
  const dom = [-1, 1].map((sx) => { const m = highlight(0.2, 0.27, sx < 0 ? 0x3d8bff : 0xffa63d); m.rotation.set(0, Math.PI, 0); m.position.set(sx * 0.115, 0.193, -0.353); R.io.group.add(m); return m; });
  glow(dom[0], S('i5') + 0.5, N('i5b') - 0.5, 0.35, 0.5); glow(dom[1], S('i5') + 1.3, N('i5b') - 0.5, 0.35, 0.5);
  const cableMats = isolate(R.ioCables.children[0]).concat(isolate(R.ioCables.children[1]));
  cableMats.forEach((m) => pulseMat(m, S('i5b') + 3, N('i5b'), 0x3d8bff, 1.5, 1));
  // crypto card comes out to the camera
  tl.move(crypto, { pos: [0, 0, -0.36] }, { in: S('c2') + 0.8, dur: 1.8, out: N('c4') - 2.4, outDur: 1.6 });
  tl.move(crypto, { pos: [0.16, 0.02, -0.42], rot: [-0.85, 0, 0] }, { in: S('c2') + 2.4, dur: 2.2, out: N('c4') - 3.6, outDur: 1.6 });
  cue(S('c2') + 0.8, 'slide', 0.6); cue(N('c4') - 2.4, 'click');
  const hsm = crypto.children.find((c) => c.name?.startsWith('HSM'));
  pulseMat(isolate(hsm)[0], S('c3') + 0.5, N('c3'), 0xff3b30, 1.6, 0.9);

  // ------------------------------------------------------------ drawer teardown (bench)
  const tCover = S('d3') + 0.4;
  tl.move(h.coverFront, { pos: [0, 0.30, 0.05] }, { in: tCover, dur: 2.2, gate: g });
  tl.move(h.coverRear, { pos: [0, 0.30, -0.05] }, { in: tCover + 0.3, dur: 2.2, gate: g });
  cue(tCover, 'lift');
  tl.hook((t) => { const k = atHome(t) ? 1 : 1 - ramp(t, tCover + 0.5, 1.8); fadePalette(palettes.cover, k); h.coverFront.visible = h.coverRear.visible = k > 0.002; });

  const x0 = S('d8') + 2.6, back = { out: N('d11') - 2.4, outDur: 1.8, gate: g };
  h.fans.forEach((f, i) => tl.move(f, { pos: [0, 0, 0.20 + 0.012 * Math.abs(i - 2)] }, { in: x0 + i * 0.22, dur: 1.5, ...back }));
  h.psus.forEach((p, i) => tl.move(p, { pos: [0, 0, -0.20] }, { in: x0 + 1.6 + i * 0.2, dur: 1.5, ...back }));
  h.frontCards.forEach((c, i) => tl.move(c, { pos: [0, 0, 0.15] }, { in: x0 + 3.0 + i * 0.15, dur: 1.4, ...back }));
  h.fanouts.forEach((f, i) => tl.move(f, { pos: [0, 0.19, 0] }, { in: x0 + 0.6 + i * 0.08, dur: 1.5, ...back }));
  cue(x0, 'servo'); cue(x0 + 1.6, 'servo', 0.8); cue(x0 + 3.0, 'click'); cue(back.out, 'servo', 0.7);
  // a failed fan is swapped
  tl.move(h.fans[1], { pos: [0, -0.02, 0.32] }, { in: S('d10') + 3.4, dur: 1.2, out: S('d10') + 6.4, outDur: 1.2, gate: g });
  const fanMats = isolate(h.fans[1]);
  fanMats.forEach((m) => pulseMat(m, S('d10') + 0.6, S('d10') + 4.4, 0xff3b30, 0.9, 1.4));
  cue(S('d10') + 0.6, 'alert', 0.6); cue(S('d10') + 3.4, 'click'); cue(S('d10') + 6.4, 'click');
  [h.frontCards[0], h.frontCards[2]].forEach((c) => isolate(c).forEach((m) => pulseMat(m, S('d11') + 2.2, N('d11') - 2.6, 0x5fe6ff, 0.7, 1)));
  // power: point-of-load regulators
  h.pols.forEach((p, i) => tl.move(p, { pos: [0, 0.075, 0] }, { in: S('pw3') + 8.5 + i * 0.12, dur: 1.4, out: N('pw4') - 1.8, outDur: 1.3, gate: g }));
  h.pols.forEach((p) => isolate(p).forEach((m) => pulseMat(m, S('pw3') + 9.5, N('pw4') - 1.8, 0xffb23d, 0.5, 0.7)));
  cue(S('pw3') + 8.5, 'servo', 0.6);
  // memory
  const mUp = S('m2') + 0.4, mDown = N('m6') - 2.2;
  h.dimmGroups.forEach((d, i) => tl.move(d, { pos: [0, 0.10 + (i < 3 ? 0 : 0.03), 0] }, { in: mUp + i * 0.22, dur: 1.5, out: mDown, outDur: 1.6, gate: g }));
  cue(mUp, 'servo', 0.7); cue(mDown, 'servo', 0.6);
  const raim = h.dimmGroups[1], bad = raim.children[3];
  const badMats = isolate(bad), goodMats = raim.children.filter((d) => d !== bad).flatMap((d) => isolate(d));
  badMats.forEach((m) => pulseMat(m, S('m3') + 3.2, mDown, 0xff2d20, 1.8, 1.3));
  goodMats.forEach((m) => pulseMat(m, S('m4') + 0.8, mDown, 0x2f8cff, 1.0, 0.5));
  tl.move(bad, { pos: [0, 0.07, 0] }, { in: S('m5') + 5.8, dur: 1.2, out: mDown - 0.6, outDur: 1.0, gate: g });
  cue(S('m3') + 3.2, 'alert'); cue(S('m5') + 5.8, 'click');
  // cooling: flow in the drawer and in the frame
  const flows = [];
  const hoses = h.cooling.children.filter((c) => c.userData.curve);
  hoses.forEach((hs) => {
    const supply = hs.name === 'Supply hose', ret = hs.name === 'Return hose';
    if (!supply && !ret) return;
    const f = addFlow(hs, { n: 4, color: supply ? 0x4db8ff : 0xff6a3d, speed: 0.55, reverse: supply });
    flows.push((t) => f(t, pulse(t, S('w2') + (supply ? 2.5 : 6.5), 0.8, N('w3'), 0.6) * g(t)));
  });
  R.hoses.children.forEach((hs, i) => {
    const f = addFlow(hs, { n: 9, color: i % 2 ? 0xff6a3d : 0x4db8ff, speed: 0.16 });
    flows.push((t) => f(t, pulse(t, S('w4') + 0.5, 0.8, N('w6b') - 0.5, 0.5)));
  });
  tl.hook((t) => flows.forEach((f) => f(t)));
  pulseMat(palettes.hero.copper, S('w1') + 2.5, S('w2') + 3, 0xff5a1f, 0.8, 0.5);
  cue(S('w2') + 2.5, 'water'); cue(S('w4') + 0.5, 'water');
  // radiator unit pulled forward and opened
  const tR = S('w5') + 0.4, tRb = N('w6b') - 2.6;
  tl.move(R.rcu, { pos: [0, 0, 0.62] }, { in: tR, dur: 2.2, out: tRb, outDur: 2.0 });
  tl.move(R.rcuParts.top, { pos: [0, 0.34, 0] }, { in: tR + 2.0, dur: 1.6, out: tRb - 1.2, outDur: 1.2 });
  R.rcuParts.fans.forEach((f, i) => tl.move(f, { pos: [0, 0, 0.24] }, { in: tR + 6.5 + i * 0.25, dur: 1.4, out: tRb - 1.6, outDur: 1.2 }));
  cue(tR, 'slide'); cue(tR + 2.0, 'lift'); cue(tR + 6.5, 'servo', 0.7); cue(tRb, 'slide', 0.7);
  R.rcuParts.pumps.forEach((p) => isolate(p).forEach((m) => pulseMat(m, tR + 2.6, tR + 6.5, 0x3d8bff, 0.8, 0.8)));
  // cold plates off, module out, flipped, cap off
  const tCool = S('p1') + 0.5;
  tl.move(h.cooling, { pos: [0, 0.44, -0.30] }, { in: tCool, dur: 2.6, gate: g });
  cue(tCool, 'lift');
  const tDcm = S('p2') + 0.2, tDown = S('s3') - 0.4;
  tl.move(dcm, { pos: [0, 0.30, 0] }, { in: tDcm, dur: 2.4, out: tDown, outDur: 1.6, gate: g });
  tl.move(dcm, { rot: [Math.PI, 0, 0] }, { in: S('p2') + 4.4, dur: 1.5, out: S('p2b') + 0.2, outDur: 1.5, gate: g });
  tl.move(dcm, { pos: [0, 0.03, 0] }, { in: S('p2') + 4.4, dur: 1.5, out: S('p2b') + 0.2, outDur: 1.5, gate: g });
  cue(tDcm, 'lift', 0.8); cue(S('p2') + 4.4, 'whoosh', 0.5); cue(S('p2b') + 0.2, 'whoosh', 0.5);
  const tLid = S('p3') + 0.8;
  tl.move(dcm.userData.lid, { pos: [0, 0.035, -0.02] }, { in: tLid, dur: 1.8, out: tDown - 1.4, outDur: 1.2, gate: g });
  tl.move(dcm.userData.lid, { pos: [0.078, 0, 0] }, { in: tLid + 1.7, dur: 1.5, out: tDown - 1.4, outDur: 1.2, gate: g });
  cue(tLid, 'click'); cue(tLid + 1.7, 'whoosh', 0.4);

  // ------------------------------------------------------------ on the die
  const dies = dcm.userData.dies;
  const dieHL = (r, color) => { const m = highlight(r[2] * 0.023, r[3] * 0.023, color); const [u, v] = rc(r); m.position.set(-0.0155 + (u - 0.5) * 0.023, 0.00412, (v - 0.5) * 0.023); dies.add(m); return m; };
  const cores = Array.from({ length: 8 }, (_, i) => dieHL(DIE.core(i), 0xffb23d));
  const l2s = Array.from({ length: 8 }, (_, i) => dieHL(DIE.l2(i), 0x4db8ff));
  cores.forEach((m, i) => { glow(m, S('t2') + 2.6 + i * 0.12, N('t3b'), 0.5, 1.2); });
  glow(l2s[0], S('t5') + 1.0, N('t5'), 0.55, 0.8);
  l2s.forEach((m, i) => glow(m, S('t6') + 1.5 + i * 0.25, N('t6'), 0.5, 0.6));
  // one core in detail
  const cr = DIE.core(0), cSize = cr[2] * 0.023, [cu, cv] = rc(cr);
  const detail = coreDetail(cSize * 1.04);
  detail.position.set(-0.0155 + (cu - 0.5) * 0.023, 0.00416, (cv - 0.5) * 0.023);
  dies.add(detail);
  const detWin = [[S('t4') + 1.6, N('t4b') - 0.3], [S('t7') + 0.8, N('t8')], [S('x1') + 0.5, S('x1') + 9]];
  tl.hook((t) => { let k = 0; for (const [a, b] of detWin) k = Math.max(k, pulse(t, a, 1.2, b, 0.8)); detail.material.opacity = k; detail.visible = k > 0.002; });
  const unitHL = (name, color = 0xffffff) => { const [x, y, w, d] = CORE_UNITS[name]; const m = highlight(w * cSize, d * cSize, color); m.position.set(detail.position.x + (x + w / 2 - 0.5) * cSize, 0.0042, detail.position.z + (y + d / 2 - 0.5) * cSize); dies.add(m); return m; };
  ['IFB', 'IDU', 'ISU', 'FXU', 'LSU'].forEach((u, i) => glow(unitHL(u), S('t4') + 3.2 + i * 1.5, S('t4') + 5.4 + i * 1.5, 0.5, 2));
  glow(unitHL('VFU', 0x7dffb0), S('t7') + 3.2, S('t7') + 9.5, 0.55, 1);
  glow(unitHL('COP', 0xff8ad1), S('t7') + 10, N('t7'), 0.6, 1);
  glow(unitHL('RU', 0xffd23d), S('t8') + 1.2, N('t8'), 0.65, 1.2);
  // sparing: core 0 fails, core 7 takes over
  glow(dieHL(DIE.core(0), 0xff2d20), S('t9') + 0.6, N('t9'), 0.7, 2);
  glow(dieHL(DIE.core(7), 0x39d98a), S('t9') + 4.2, N('t9'), 0.7, 0.8);
  cue(S('t9') + 0.6, 'alert'); cue(S('t9') + 4.2, 'chime', 0.7);
  // AI accelerator
  const aiu = dieHL(DIE.aiu, 0xff4fd0);
  glow(aiu, S('a3') + 2.2, N('a3'), 0.55, 0.8); glow(aiu, S('a4') + 3.4, S('a4') + 8.5, 0.9, 3);
  cue(S('a4') + 3.4, 'compute'); cue(S('a5') + 4.4, 'chime');
  // buses
  const mbus = link([-0.0045, 0.0046, 0.0102], [0.0045, 0.0046, 0.0102], 0.0012); dies.add(mbus);
  glow(mbus, S('s2') + 1.6, tDown, 0.95, 1.5);
  const busY = 0.045, dx = (i) => h.dcms[i].position.x, dz = dcm.position.z;
  let n = 0;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const off = 0.05 + 0.02 * (j - i) + 0.004 * n++, x1 = dx(i) + (j - i) * 0.006, x2 = dx(j) - (j - i) * 0.006;
    [[[x1, busY, dz], [x1, busY, dz + off]], [[x1, busY, dz + off], [x2, busY, dz + off]], [[x2, busY, dz + off], [x2, busY, dz]]].forEach(([a, b]) => { const m = link(a, b, 0.003, 0x5fe6ff); hero.group.add(m); glow(m, S('s3') + 2.2 + n * 0.25, S('s4') + 1.5, 0.85, 0.9); });
  }
  h.smp.forEach((s, i) => { const m = link([s.position.x, 0.075, dz - 0.07], [s.position.x, 0.075, s.position.z + 0.02], 0.004, 0xffb23d); hero.group.add(m); glow(m, S('s4') + 2.4 + i * 0.15, dHome3, 0.9, 1); });
  cue(S('s2') + 1.6, 'zap', 0.6); cue(S('s3') + 2.4, 'zap', 0.8); cue(S('s4') + 2.4, 'zap', 0.8);
  isolate(R.smpCables).forEach((m) => pulseMat(m, dHome3 + 0.6, N('s4b'), 0xffb23d, 1.6, 1));

  // ------------------------------------------------------------ transistor close-up
  const dFin = dip(S('x1') + 8.6), dFinBack = dip(CH('ai') - 0.45);
  const wires = group('Wiring levels');
  const copper = new THREE.MeshStandardMaterial({ color: 0xc8733a, metalness: 1, roughness: 0.3 });
  for (let i = 0; i < 6; i++) wires.add(box(0.1, 0.07, 3.0, copper, (i - 2.5) * 0.42, 1.25, 0));
  for (let i = 0; i < 5; i++) wires.add(box(3.0, 0.08, 0.14, copper, 0, 1.5, (i - 2) * 0.55));
  finfet.group.add(wires);
  tl.hook((t) => {
    const k = pulse(t, S('x4b') + 0.6, 2.2, dFinBack, 0.1);
    wires.visible = k > 0.001; wires.position.y = (1 - k) * 2.2;
    const on = t < S('x3') ? 0 : t < S('x5')
      ? Math.max(pulse(t, S('x3') + 1.6, 0.5, S('x3') + 7.4, 0.4), pulse(t, E('x3') - 2.6, 0.2, E('x3') - 2.0, 0.2), pulse(t, E('x3') - 1.2, 0.2, E('x3') - 0.5, 0.2), pulse(t, E('x3') + 0.4, 0.15, E('x3') + 0.8, 0.15), pulse(t, E('x3') + 1.2, 0.15, E('x3') + 1.6, 0.15))
      : 0.5 + 0.5 * Math.sign(Math.sin(t * 16));
    finfet.refs.update(t, on);
    finfet.refs.M.heroGate.opacity = 1 - 0.6 * pulse(t, S('x2') + 5.5, 1.2, S('x4') + 1, 1.2);
    finfet.refs.M.gate.emissive.setHex(0xffa040); finfet.refs.M.gate.emissiveIntensity = t >= S('x5') ? 0.35 + 0.35 * Math.sin(t * 23) : 0;
  });
  cue(S('x3') + 1.6, 'zap'); cue(E('x3') - 2.6, 'tick'); cue(E('x3') - 1.2, 'tick'); cue(E('x3') + 0.4, 'tick'); cue(E('x3') + 1.2, 'tick'); cue(S('x1') + 5, 'riser');

  // a processor drawer is removed while running
  const spareDrawer = R.cpc[1].group;
  tl.move(spareDrawer, { pos: [0, 0, 1.05] }, { in: S('r3') + 3.2, dur: 2.6, out: N('r3') - 2.8, outDur: 2.4 });
  cue(S('r3') + 3.2, 'slide'); cue(N('r3') - 2.8, 'slide', 0.7);

  // fans spin
  const rotors = [];
  rack.group.traverse((o) => { if (o.name === 'Rotor') rotors.push(o); });
  tl.hook((t) => { for (const r of rotors) r.rotation.z = -11 * t; });

  // glow overlays and emissive pulses
  tl.hook((t) => {
    for (const f of fx) { const k = pulse(t, f.t0, 0.5, f.t1 - 0.4, 0.4); f.m.visible = k > 0.002; f.m.material.opacity = k * f.max * (0.72 + 0.28 * Math.sin(t * f.hz * 6.283)); }
    for (const e of emis) { const k = pulse(t, e.t0, 0.5, e.t1 - 0.5, 0.5); if (k > 0.002) { e.mat.emissive.copy(e.color); e.mat.emissiveIntensity = k * e.max * (0.6 + 0.4 * Math.sin(t * e.hz * 6.283)); e._on = true; } else if (e._on) { e.mat.emissiveIntensity = 0; e._on = false; } }
  });

  // ------------------------------------------------------------ the payment (packet)
  const path = [];      // { t, p, s } — position and size; consecutive keys with the same t jump
  const P = (t, p, s) => path.push({ t, p, s });
  const along = (pts, t0, t1, s, rev = false) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.35); for (let i = 0; i <= 14; i++) { const u = i / 14; P(t0 + (t1 - t0) * u, c.getPointAt(rev ? 1 - u : u).toArray(), s); } };
  const vis = [];       // visible windows
  // hook: leaves the reader
  P(tapA + 1.3, [RX.x + reader.tap.screen.x, RX.y + reader.tap.screen.y, RX.z + reader.tap.screen.z], 0.004); P(S('h2') + 0.5, [RX.x, RX.y + 0.22, RX.z - 0.02], 0.006); P(E('h2') - 2.5, [RX.x + 0.1, RX.y + 0.22, RX.z - 0.1], 0.006); P(E('h2') + 0.6, [RX.x + 0.6, RX.y + 0.9, RX.z - 6], 0.01);
  vis.push([tapA + 1.3, E('h2') + 0.6]);
  // arrives by fibre, sits on the network card
  const osaP = cardW(osa, -0.02), cryP = cardW(crypto, -0.02), swP = cardW(swR, -0.02), fcP = cardW(fc, -0.02);
  P(S('i1') + 1.5, R.fiberPts[0], 0.012);
  along(R.fiberPts, S('i1') + 1.6, E('i1b') - 0.4, 0.012);
  P(S('c1') + 1.0, osaP, 0.012); P(S('c1') + 3.2, add(cryP, [0, 0, -0.1]), 0.012); P(S('c1') + 4.0, cryP, 0.012);
  // rides out with the crypto card, then down the cable to the processor drawer
  P(S('c2') + 0.8, cryP, 0.012); P(S('c2') + 4.6, add(cryP, [0.16, 0.06, -0.78]), 0.012); P(N('c4') - 3.6, add(cryP, [0.16, 0.06, -0.78]), 0.012); P(N('c4') - 0.8, cryP, 0.012);
  P(S('d1') + 1.0, cryP, 0.012); P(S('d1') + 2.4, swP, 0.012);
  along(R.ioPath[1], S('d1') + 2.6, E('d1') + 0.3, 0.012);
  vis.push([S('i1') + 1.5, E('d1') + 0.5]);
  cue(S('i1') + 1.6, 'data'); cue(S('c1') + 1.0, 'data', 0.7); cue(S('d1') + 2.6, 'data');
  // on the bench: fanout → memory
  const foB = bench([h.fanouts[9].position.x, 0.16, -0.30]), memB = bench([h.dimmGroups[1].position.x, 0.09, h.dimmGroups[1].position.z]);
  P(S('m1') + 0.4, foB, 0.008); P(S('m1') + 2.2, bench([0.05, 0.1, -0.1]), 0.008); P(E('m1') + 0.2, memB, 0.008); P(S('m2') + 0.4, memB, 0.008); P(S('m2') + 1.6, add(memB, [0, 0.16, 0]), 0.008); P(S('m3') - 0.5, add(memB, [0, 0.16, 0]), 0.008);
  vis.push([S('m1') + 0.4, S('m3') - 0.5]);
  cue(S('m1') + 0.4, 'data', 0.7);
  // on the chip: lands on core 0, visits the AI accelerator
  const c0 = dieP(...rc(DIE.core(0)), 0.0012), ai = dieP(...rc(DIE.aiu), 0.0012);
  P(S('p4') + 5.5, add(M, [0.02, 0.09, 0.05]), 0.0016); P(E('p4') + 0.4, c0, 0.0007); P(S('t2'), c0, 0.0005); P(S('t2') + 1, c0, 0.0001);
  vis.push([S('p4') + 5.5, S('t2') + 1]);
  P(S('a1') + 0.3, c0, 0.0006); P(S('a4') + 1.6, c0, 0.0006); P(S('a4') + 3.4, ai, 0.0006); P(S('a4') + 8.2, ai, 0.0006); P(S('a4') + 9.8, c0, 0.0006); P(N('a5') - 1.5, c0, 0.0006);
  vis.push([S('a1') + 0.3, N('a5') - 1.5]);
  cue(S('p4') + 5.5, 'data', 0.7); cue(S('a4') + 1.6, 'data', 0.6); cue(S('a4') + 8.2, 'data', 0.6);
  // the way out: drawer → fanout cable → storage card → out; then network card → fibre
  const foH = homeW([h.fanouts[2].position.x, 0.17, -0.41]);
  P(S('z1') + 5.5, foH, 0.012);
  along(R.ioPath[0], S('z1') + 6, S('z1') + 10, 0.012, true);
  P(S('z1') + 11, fcP, 0.012); P(E('z1'), add(fcP, [-0.5, 0.1, -1.6]), 0.012);
  P(S('z2') + 0.2, cryP, 0.012); P(S('z2') + 2.4, osaP, 0.012);
  along(R.fiberPts, S('z2') + 2.8, E('z2') + 0.4, 0.012, true);
  vis.push([S('z1') + 5.5, E('z1')], [S('z2') + 0.2, E('z2') + 0.4]);
  cue(S('z1') + 6, 'data'); cue(S('z2') + 2.8, 'data');
  path.sort((a, b) => a.t - b.t);
  const pv = new THREE.Vector3(), green = new THREE.Color(0x52ff9a), cyan = new THREE.Color(0x5fe6ff);
  tl.hook((t) => {
    let k = 0; for (const [a, b] of vis) k = Math.max(k, pulse(t, a, 0.4, b - 0.3, 0.3));
    packet.visible = k > 0.002;
    if (!packet.visible) return;
    let i = 0; while (i < path.length - 2 && t >= path[i + 1].t) i++;
    const a = path[i], b = path[i + 1], u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1, s = u * u * (3 - 2 * u);
    packet.position.set(...a.p).lerp(pv.set(...b.p), s);
    packet.scale.setScalar((a.s + (b.s - a.s) * s) * k * (0.9 + 0.1 * Math.sin(t * 9)));
    packet.userData.halo.material.color.copy(t >= S('a5') + 4.4 && t < N('a5') ? green : cyan);
  });

  // ------------------------------------------------------------ camera
  const cam = new ShotCamera();
  const rd = (p) => [RX.x + p[0], RX.y + p[1], RX.z + p[2]], ff = (p) => [FX.x + p[0], FX.y + p[1], FX.z + p[2]];
  // hook
  cam.cut(0, rd([0.2, 0.25, 0.36]), rd([0.01, 0.085, 0]));
  cam.to(S('h1') + 0.5, 5, rd([0.12, 0.2, 0.25]), rd([0, 0.09, 0]));
  cam.to(S('h2'), E('h2') - S('h2'), rd([0.2, 0.27, 0.4]), rd([0.07, 0.13, -0.04]));
  const dZ = dip(S('h3') - 0.45);
  cam.cut(dZ, [-2.4, 1.2, 4.2], [0, 1.05, 0]);
  cam.to(dZ + 0.1, N('h3b') - dZ, [2.0, 1.4, 4.4], [0, 1.0, 0]);
  cam.to(S('h4'), 9, [2.9, 1.5, 3.0], [0.3, 1.0, 0]);
  cam.to(S('h5'), 8, [1.3, 1.2, 4.7], [-0.8, 1.05, 0]);
  // frame
  cam.to(CH('frame') + 1, 3.5, [-0.7, 1.75, 2.1], [0, 1.6, 0.6]);
  cam.to(S('f1') + 1.5, E('f1') - S('f1'), [-0.75, 0.95, 2.3], [0, 0.9, 0.6]);
  cam.to(S('f2') - 0.3, 3.5, [-2.1, 1.3, 4.4], [0.3, 1.0, 0]);
  cam.to(S('f2b'), N('f2b') - S('f2b'), [-3.1, 1.4, 3.2], [0.3, 1.0, 0]);
  cam.to(S('f3'), 3, [0.9, 1.5, 6.3], [0.3, 0.95, 0]);
  cam.to(S('f4') - 0.3, 3.2, [2.3, 1.4, 4.9], [-0.4, 1.0, 0]);
  cam.to(S('f5') - 0.6, 2.6, [1.15, 1.9, 2.5], [-0.25, 1.78, 0.2]);
  cam.to(S('f7') - 0.5, 2.4, [1.2, 1.75, 2.8], [-0.3, 1.5, 0.2]);
  cam.to(S('f8') - 0.5, 2.6, [1.2, 1.05, 2.9], [-0.3, 0.72, 0.2]);
  cam.to(S('f9') - 0.5, 2.4, [1.05, 0.7, 2.7], [-0.25, 0.3, 0.2]);
  cam.to(S('f9b'), 4, [2.2, 1.4, 4.8], [-0.4, 1.0, 0]);
  // the way in (rear)
  cam.to(CH('io') + 0.5, 4.2, [1.5, 2.3, -2.9], [0.15, 1.75, -0.4]);
  cam.to(S('i2') - 0.4, 3, [1.9, 1.3, -3.7], [0.35, 1.0, -0.3]);
  cam.to(S('i2b'), N('i2b') - S('i2b'), [1.0, 0.95, -2.5], [0.2, 0.75, -0.4]);
  cam.to(S('i3') - 0.4, 2.6, [0.8, 1.78, -1.5], [0.2, 1.62, -0.28]);
  cam.to(S('i4') + 7, 2.4, [-0.55, 1.78, -1.5], [-0.02, 1.62, -0.28]);
  cam.to(S('i5') - 0.3, 2.4, [0.25, 1.75, -1.75], [0.2, 1.6, -0.28]);
  cam.to(S('i5b') + 3, 3, [0.9, 1.35, -2.4], [0.25, 1.1, -0.4]);
  cam.to(S('i6') - 0.2, 3, [2.3, 1.5, -4.2], [0.5, 1.0, -0.3]);
  // the vault
  cam.to(CH('crypto') + 0.8, 3, [0.75, 1.72, -1.45], [0.3, 1.58, -0.3]);
  cam.to(S('c2') + 2.2, 2.6, [0.62, 1.82, -1.62], [0.3, 1.6, -1.02]);
  cam.to(S('c3'), 3, [0.5, 1.8, -1.5], [0.27, 1.62, -1.04]);
  cam.to(N('c4') - 3.8, 2.6, [0.8, 1.72, -1.5], [0.3, 1.58, -0.3]);
  // the processor drawer
  cam.to(S('d1') + 1.6, 4, [1.25, 1.25, -2.5], [0.25, 1.0, -0.42]);
  cam.to(E('d1') - 2, 2.4, [1.0, 0.85, -2.0], [0.25, 0.68, -0.42]);
  cam.to(S('d2') - 0.6, 2.6, [2.6, 1.2, 1.6], [0, 0.7, 0.7]);
  cam.to(tOut + 2.2, 3.2, add(C, [0.95, 0.9, 1.3]), add(C, [-0.22, -0.12, 0.05]));
  cam.to(S('d4') - 0.5, 2.2, add(C, [0.5, 0.42, 1.15]), add(C, [-0.12, -0.04, 0.3]));
  cam.to(S('d5') - 0.4, 2.2, add(C, [0.65, 0.62, 0.75]), add(C, [-0.12, -0.02, 0.14]));
  cam.to(S('d6') - 0.4, 2.2, add(C, [0.5, 0.55, 0.42]), add(C, [-0.1, -0.03, -0.08]));
  cam.to(S('d7') - 0.4, 2.4, add(C, [0.75, 0.6, -0.85]), add(C, [-0.05, 0.02, -0.28]));
  cam.to(S('d7b') - 0.3, 2.6, add(C, [0.55, 0.35, 1.2]), add(C, [-0.12, -0.08, 0.38]));
  cam.to(S('d8') + 0.2, 3, add(C, [0.9, 1.0, 1.35]), add(C, [-0.2, -0.1, 0.05]));
  cam.to(S('d9') + 2, 5, add(C, [-1.05, 0.9, 1.15]), add(C, [0.18, -0.08, 0]));
  cam.to(S('d10'), 2.6, add(C, [-0.75, 0.5, 1.25]), add(C, [0.12, -0.02, 0.45]));
  cam.to(S('d11') - 0.2, 2.6, add(C, [0.55, 0.3, 1.3]), add(C, [-0.1, -0.1, 0.5]));
  // power
  cam.cut(dHome1, [-1.5, 1.35, -2.5], [-0.05, 1.05, -0.45]);
  cam.to(S('pw2') - 0.3, 3, [0.3, 1.5, -3.9], [0.3, 1.05, -0.4]);
  cam.cut(dBench1, add(C, [0.7, 0.5, -1.15]), add(C, [-0.1, -0.06, -0.3]));
  cam.to(S('pw3') + 6.5, 2.6, add(C, [0.55, 0.55, 0.85]), add(C, [-0.1, 0, 0.16]));
  // memory
  cam.to(CH('memory') + 1, 3, add(C, [0.75, 0.6, 0.95]), add(C, [-0.15, 0.02, 0.15]));
  cam.to(S('m3') - 0.4, 2.6, add(C, [0.32, 0.36, 0.72]), add(C, [-0.06, 0.07, 0.2]));
  cam.to(S('m6') - 0.2, 3, add(C, [0.7, 0.6, 0.95]), add(C, [-0.15, 0.02, 0.15]));
  // water
  cam.to(CH('cooling') + 1, 3, add(C, [0.42, 0.42, 0.32]), add(C, [-0.08, -0.05, -0.1]));
  cam.to(S('w2') - 0.3, 2.6, add(C, [0.26, 0.26, 0.12]), add(C, [-0.04, -0.045, -0.1]));
  cam.to(S('w3') - 0.3, 3, add(C, [0.6, 0.42, -1.0]), add(C, [-0.08, 0, -0.32]));
  cam.cut(dHome2, [1.2, 0.8, -2.3], [0.1, 0.5, -0.45]);
  cam.cut(S('w5') - 0.05, [1.5, 1.0, 2.5], [-0.2, 0.3, 0.9]);
  cam.to(S('w5') + 2.2, 3, [1.25, 0.95, 2.35], [-0.15, 0.27, 1.05]);
  cam.to(S('w6'), N('w6b') - S('w6'), [-1.2, 0.9, 2.5], [0.1, 0.3, 1.0]);
  // the module
  cam.cut(dBench2, add(C, [0.6, 0.55, 0.5]), add(C, [-0.1, -0.03, -0.1]));
  cam.to(S('p2'), 3, add(M, [0.17, 0.14, 0.24]), add(M, [-0.03, -0.02, 0]));
  cam.to(S('p2') + 4.4, 2, add(M, [0.12, 0.16, 0.2]), add(M, [-0.02, 0.02, 0]));
  cam.to(S('p2b') + 0.2, 2.4, add(M, [0.12, 0.13, 0.2]), add(M, [-0.02, -0.14, 0]));
  cam.to(S('p3') - 0.4, 2.6, add(M, [0.08, 0.115, 0.13]), add(M, [-0.012, -0.012, 0]));
  cam.to(S('p4') - 0.2, 4, add(M, [0.25, 0.22, 0.34]), add(M, [-0.02, -0.16, 0]));
  cam.to(S('p4') + 5.4, 3.4, add(M, [0.07, 0.12, 0.12]), add(M, [-0.012, -0.012, 0]));
  // telum
  const top = (u, v, hgt) => [dieP(u, v, hgt).map((x, i) => x + (i === 2 ? hgt * 0.07 : 0)), dieP(u, v)];
  const overDie = top(0.36, 0.56, 0.062), overCore = top(cu + 0.1, cv + 0.06, 0.0125), overPair = top(0.3, 0.3, 0.03);
  cam.to(CH('telum') + 0.6, 3.6, ...overDie);
  cam.to(S('t4') - 0.3, 2.6, ...overCore);
  cam.to(S('t5') - 0.3, 2.4, ...overPair);
  cam.to(S('t6') - 0.2, 2.6, ...overDie);
  cam.to(S('t7') - 0.3, 2.6, ...overCore);
  cam.to(S('t9') - 0.3, 2.6, ...overDie);
  // the switch
  cam.to(CH('transistor') + 0.8, 3, ...overCore);
  cam.to(S('x1') + 4.6, 4, ...top(cu, cv, 0.0016));
  cam.cut(dFin, ff([2.6, 2.4, 3.4]), ff([0, 0.3, 0]));
  cam.to(dFin + 0.1, N('x1') - dFin, ff([1.9, 1.5, 2.3]), ff([0, 0.3, 0]));
  cam.to(S('x2') - 0.2, 3, ff([1.7, 1.6, 2.2]), ff([0, 0.4, 0]));
  cam.to(S('x3') + 0.4, 3, ff([1.3, 1.35, 1.6]), ff([0, 0.45, 0]));
  cam.to(S('x4') + 2, 4, ff([2.3, 1.9, 2.9]), ff([0, 0.35, 0]));
  cam.to(S('x4b'), 3, ff([2.1, 2.3, 2.6]), ff([0, 0.7, 0]));
  cam.to(S('x5'), N('x5') - S('x5') - 0.5, ff([2.9, 5.2, 3.6]), ff([0, 0.6, 0]));
  // the fraud check
  cam.cut(dFinBack, ...top(0.62, 0.52, 0.062));
  cam.to(S('a3') - 0.2, 2.8, ...top(0.45, 0.72, 0.04));
  cam.to(S('a5') + 3, 3, ...top(0.62, 0.52, 0.062));
  // one computer
  cam.to(CH('scale') + 0.6, 3.6, add(M, [0.075, 0.115, 0.125]), add(M, [-0.012, -0.012, 0]));
  cam.to(S('s2') - 0.2, 2.4, add(M, [0.03, 0.085, 0.085]), add(M, [0, 0, 0.004]));
  cam.to(S('s3') - 0.6, 3.2, add(C, [0.12, 0.62, 0.38]), add(C, [0, -0.06, -0.03]));
  cam.to(S('s4') - 0.2, 3, add(C, [0.5, 0.55, -1.0]), add(C, [-0.05, -0.02, -0.25]));
  cam.cut(dHome3, [1.15, 1.0, -2.4], [0.2, 0.8, -0.42]);
  cam.to(S('s4b'), N('s4b') - S('s4b'), [2.9, 1.3, -1.5], [0.2, 0.8, 0]);
  cam.to(S('s5') - 0.3, 3.4, [1.5, 1.5, 6.4], [0.35, 0.95, 0]);
  cam.to(S('s6'), 4, [-0.4, 1.4, 6.6], [1.3, 1.0, 0]);
  // never stop
  cam.to(CH('never') + 0.8, 3.4, [2.0, 1.35, 4.3], [-0.45, 1.0, 0]);
  cam.to(S('r2'), N('r2') - S('r2'), [1.7, 1.3, 3.9], [-0.4, 1.0, 0]);
  cam.to(S('r3') - 0.2, 3, [2.3, 1.1, 3.4], [-0.1, 0.72, 0.6]);
  cam.to(S('r3b') - 0.2, 3.4, [2.0, 1.6, 7.6], [2.0, 0.95, 0]);
  cam.to(S('r4') - 0.2, 3.4, [2.1, 1.35, 4.6], [-0.4, 1.0, 0]);
  // approved
  cam.to(CH('close') + 0.8, 3.6, [1.3, 1.35, -3.1], [0.25, 1.1, -0.4]);
  cam.to(S('z2') - 0.2, 2.6, [1.0, 1.9, -2.6], [0.2, 1.65, -0.35]);
  const dR = dip(S('z3') - 0.45);
  cam.cut(dR, rd([0.17, 0.22, 0.31]), rd([0, 0.085, 0]));
  cam.to(dR + 0.1, N('z3') - dR, rd([0.1, 0.18, 0.22]), rd([0, 0.09, 0]));
  cam.cut(dClose, [-2.8, 1.3, 5.6], [0.3, 1.0, 0]);
  cam.to(dClose + 0.1, N('z4') - dClose, [1.0, 1.4, 6.6], [0.3, 1.0, 0]);
  cam.to(S('z5'), N('z5') - S('z5') + 6, [3.6, 1.6, 5.8], [0.3, 1.0, 0]);
  cam.finish();

  // ------------------------------------------------------------ on-screen text
  const v = new THREE.Vector3();
  const of = (obj, dx = 0, dy = 0, dz = 0) => () => obj.localToWorld(v.set(dx, dy, dz)).clone();
  const world = (p) => () => new THREE.Vector3(...p);
  const callouts = [];
  const call = (t0, t1, at, off, title, text = '') => { callouts.push({ t0, t1, at, off, title, text }); cue(t0, 'tick', 0.5); };

  // hook
  call(S('h4') + 0.4, N('h4'), world([0.3, 1.75, 0.6]), [26, -8], 'Upwards of $1 million', 'For one system');
  call(S('h4') + 3.0, N('h4'), world([0.3, 1.0, 0.6]), [28, 2], 'Up to 795 kg', 'Per frame, fully configured');
  call(S('h4') + 7.2, N('h4'), world([0.3, 0.35, 0.6]), [26, 6], 'Built never to stop', '');
  // frame
  call(S('f2') + 1.2, N('f2b'), world([0, 1.99, 0.55]), [-20, -8], '19-inch rack', 'Industry-standard width');
  call(S('f2') + 3.4, N('f2b'), world([-0.3, 1.0, 0.55]), [-28, 4], '42U tall', 'About 2 m');
  call(S('f3') + 4.2, N('f3'), world([0.3, 2.0, 0.55]), [0, -14], 'Up to four frames', 'Z · A · B · C, one system');
  call(S('f5') + 1.0, N('f5b'), of(R.ses[0], 0.2, 0, 0), [26, -9], '2 × Support Element', 'Manage and monitor the system');
  call(S('f6') + 0.8, N('f6'), of(R.switches[0], 0.2, 0, 0), [28, 4], '2 × Ethernet switch', 'Internal management network');
  call(S('f7') + 0.8, N('f7'), of(R.io.group, 0.18, 0.17, 0.35), [30, 6], 'PCIe+ I/O drawer', 'Network, storage, coupling, crypto');
  call(S('f8') + 0.8, N('f8b'), of(R.cpc[1].group, 0.2, 0.11, 0.4), [30, -8], '3 × processor drawer', 'CPC drawers, 5U each');
  call(S('f8b') + 1.5, N('f8b'), of(R.cpc[0].group, 0.2, 0.11, 0.4), [30, 8], '64 cores · up to 10 TB', 'In every drawer');
  call(S('f9') + 0.8, N('f9'), of(R.rcu, 0.15, 0.2, 0.39), [28, -12], 'Radiator cooling unit', 'Cools the processor water loop');
  // way in
  call(S('i2') + 2.0, N('i2b'), of(R.pdus[1], 0, 0.45, -0.03), [-22, -18], 'Power', 'Three-phase line cords');
  call(S('i2') + 3.4, N('i2b'), world(cardW(osa, -0.03)), [-34, -6], 'Network and storage', 'Fiber to every I/O card');
  call(S('i2') + 6.0, N('i2b'), of(R.hoses, -0.16, 0.62, -0.45), [-30, 12], 'Cooling water', 'Supply and return hoses');
  call(S('i3') + 4.5, N('i3'), world(cardW(io.card('roce', -1), -0.02)), [-36, 4], '16 adapter cards', 'Two columns of eight, lying flat');
  call(S('i4') + 3.4, S('i4') + 7.6, () => osa.localToWorld(v.set(0, 0, -0.01)).clone(), [-30, -12], 'Network card', 'OSA-Express: transactions in and out');
  call(S('i4') + 8.6, S('i4') + 14.2, () => fc.localToWorld(v.set(0, 0, -0.01)).clone(), [30, -14], 'Storage card', 'FICON: up to 32 Gb/s to disk');
  call(S('i4') + 15.2, N('i4'), () => cpl.localToWorld(v.set(0, 0, -0.01)).clone(), [30, 10], 'Coupling card', 'Links two mainframes up to 10 km apart');
  call(S('i5') + 1.0, N('i5b'), of(R.io.group, -0.115, 0.3, -0.36), [-30, -8], 'Domain 0', '');
  call(S('i5') + 1.8, N('i5b'), of(R.io.group, 0.115, 0.3, -0.36), [26, -8], 'Domain 1', '');
  call(S('i6') + 3.0, N('i6'), of(R.io.group, 0, 0.2, -0.36), [-34, -14], 'Up to 12 drawers', '192 adapter cards in one system');
  // vault
  call(S('c2') + 5.0, N('c2b'), () => crypto.localToWorld(v.set(-0.02, 0.012, 0.1)).clone(), [-32, -10], 'Hardware security module', 'Holds the master keys');
  call(S('c3') + 2.0, N('c3'), () => crypto.localToWorld(v.set(-0.02, 0.012, 0.1)).clone(), [-32, -10], 'Tamper-responding', 'Any attack erases the keys');
  call(S('c4') + 6.0, N('c4') - 3, () => crypto.localToWorld(v.set(-0.02, 0.012, 0.1)).clone(), [-32, -10], 'Quantum-safe algorithms', 'Protection against "harvest now, decrypt later"');
  // drawer
  call(S('d4') + 0.4, N('d4'), of(h.fans[3], 0.02, 0.05, 0.05), [26, -14], '5 fans', 'Any four are enough');
  call(S('d5') + 0.5, N('d5'), of(h.dimmGroups[4], 0, 0.04, 0), [30, 14], '48 memory slots', 'DDR4 modules in six groups of eight');
  call(S('d6') + 0.8, N('d6'), of(h.cooling, 0.049, 0.045, -0.075), [30, 16], '4 processor modules', 'Under water-cooled cold plates');
  call(S('d7') + 0.8, N('d7'), of(h.fanouts[8], 0, 0.06, 0), [-30, -14], '12 fanout slots', 'PCIe+ links to the I/O drawers');
  call(S('d7b') + 1.0, N('d7b'), of(h.frontCards[2], 0, 0, 0.01), [26, 10], '2 × control card', 'BMC and oscillator');
  call(S('d9') + 2.4, N('d9'), of(h.psus[0], 0, 0, -0.02), [-6, -20], '4 power supplies', 'The drawer runs on three');
  call(S('d9') + 6.2, N('d9'), of(h.fans[0], 0, 0.06, 0.05), [-24, -14], '5 fans', 'The drawer runs on four');
  call(S('d9') + 9.5, N('d10') - 0.5, of(hero.group, 0, 0.3, -0.05), [0, -26], 'N + 1', 'Whatever you need, plus one');
  call(S('d11') + 2.6, N('d11') - 2.6, of(h.frontCards[0], 0, 0.02, 0.01), [-28, -10], '2 × oscillator', 'The backup takes over instantly');
  // power
  call(S('pw1') + 6.0, N('pw2'), of(R.pdus[0], 0, 0.3, -0.03), [30, -12], 'Power distribution unit', 'Three-phase, switched per outlet');
  call(S('pw2') + 2.0, N('pw2'), of(R.pdus[1], 0, 0.5, -0.03), [-28, 4], 'Second feed', 'Either one carries the frame');
  call(S('pw3') + 1.2, S('pw3') + 6.2, of(h.psus[1], 0, 0.02, -0.01), [24, -18], 'AC in, 12 V out', '4 supplies, N + 1');
  call(S('pw3') + 10, N('pw4') - 1.8, of(h.pols[3], 0, 0.036, 0), [-30, -16], 'Point-of-load regulators', '12 V down to processor voltage, N + 2');
  // memory
  call(S('m2') + 1.4, N('m2'), of(h.dimmGroups[5], 0, 0.14, 0), [-26, -14], 'Up to 10 TB per drawer', '40 TB across four drawers');
  call(S('m4') + 1.5, N('m5'), of(raim, 0.04, 0.14, 0.03), [30, -14], 'Group of 8 modules', 'Data + error correction spread across all');
  call(S('m5') + 6.6, N('m5'), of(bad, 0, 0.11, 0), [-28, -16], 'A whole module fails', 'The other seven rebuild its data');
  call(S('m6') + 1.0, N('m6') - 2.2, of(raim, 0.04, 0.14, 0.03), [30, -14], 'RAIM', 'Redundant array of independent memory');
  // water
  call(S('w2') + 1.6, N('w2'), of(h.cooling, -0.147, 0.03, -0.075), [-26, -16], 'Copper cold plate', 'One on each processor module');
  call(S('w2') + 3.0, N('w2'), of(h.cooling, 0.03, 0.05, -0.12), [28, -14], 'Cool water in', '');
  call(S('w2') + 7.0, N('w2'), of(h.cooling, 0.07, 0.07, -0.14), [30, 2], 'Warm water out', '');
  call(S('w3') + 3.0, N('w3'), of(h.quick, 0, 0, -0.04), [-26, -12], 'Quick connector', 'One per drawer');
  call(tR + 3.0, tR + 6.5, of(R.rcuParts.pumps[1], 0.1, 0.12, -0.3), [-30, -18], '2 pumps', 'One is enough');
  call(tR + 7.2, N('w5'), of(R.rcuParts.core, 0.1, 0.12, 0), [28, -16], 'Heat exchanger', 'Water inside, room air outside');
  call(S('w6') + 1.5, N('w6'), of(R.rcu, 0, 0.42, 0.1), [0, -22], 'Closed loop', 'No water connection to the building');
  // module
  call(S('p2') + 0.8, S('p2') + 4.2, of(dcm, 0.02, 0.008, 0.01), [30, -12], 'Dual chip module', '71.5 × 79 mm');
  call(S('p2') + 6.2, S('p2b'), of(dcm, 0, 0, 0), [28, -16], '4,753 contacts', 'On the underside');
  call(S('p2b') + 1.2, N('p2b'), of(hero.group, dcm.position.x, 0.02, dcm.position.z), [30, 6], 'Socket', 'The module is clamped onto it');
  call(S('p3') + 3.4, N('p3b'), of(dies, -0.0155, 0.004, 0), [-30, -14], 'Telum chip', '');
  call(S('p3') + 3.8, N('p3b'), of(dies, 0.0155, 0.004, 0), [8, -28], 'Telum chip', '');
  call(S('p4') + 0.8, S('p4') + 5.2, of(hero.group, 0, 0.05, dz), [30, 4], '4 modules × 2 chips', '8 processors per drawer');
  // telum
  call(S('t1') + 0.6, N('t1'), world(dieP(0.02, 0.5)), [-30, -10], '530 mm²', 'One Telum chip');
  call(S('t1') + 3.2, N('t1'), world(dieP(0.98, 0.5)), [34, -10], '22.5 billion transistors', '7 nm process');
  call(S('t2') + 3.0, N('t2'), world(dieP(...rc(DIE.core(1)))), [44, -8], '8 cores', '');
  call(S('t3') + 0.8, N('t3b'), world(dieP(...rc(DIE.core(1)))), [44, -8], '5.2 GHz', 'More than 5 billion steps a second');
  call(S('t4b') + 0.8, N('t4b'), world(dieP(cu + 0.09, cv)), [30, -10], '2 threads per core', 'Simultaneous multithreading');
  call(S('t5') + 1.4, N('t5'), world(dieP(...rc(DIE.l2(0)))), [36, -12], '32 MB cache', 'Private to one core');
  call(S('t6') + 4.0, N('t6'), world(dieP(0.98, 0.45)), [36, 0], 'Shared when idle', '256 MB per chip · 2 GB per drawer');
  call(S('t7') + 3.4, S('t7') + 9.5, world(dieP(cu + 0.05, cv - 0.08)), [36, -12], 'Decimal arithmetic', 'Exact money math');
  call(S('t7') + 10.2, N('t7'), world(dieP(cu - 0.07, cv + 0.07)), [-30, 10], 'Co-processor', 'Compression and encryption');
  call(S('t8') + 1.6, N('t8'), world(dieP(cu + 0.07, cv + 0.03)), [34, 8], 'Recovery unit', 'Checks, rolls back, retries');
  call(S('t9') + 1.0, N('t9'), world(dieP(...rc(DIE.core(0)))), [-36, -8], 'Core fails', '');
  call(S('t9') + 4.6, N('t9'), world(dieP(...rc(DIE.core(7)))), [40, 4], 'Spare takes over', 'Transparent to the program');
  // switch
  call(S('x2') + 2.2, N('x3'), of(finfet.refs.fin, 0, 0.5, 2.2), [-30, -6], 'Fin', 'Silicon channel');
  call(S('x2') + 5.0, N('x3'), of(finfet.refs.gate, 2.2, 0.5, 0), [26, -14], 'Gate', 'Wraps the fin on three sides');
  call(S('x4') + 8.5, N('x4'), of(finfet.group, 0, 0.6, 0), [30, -20], '7 nm FinFET', 'Thousands of fins across a human hair');
  call(S('x4b') + 3.0, N('x4b'), of(wires, 0, 1.5, 0), [-30, -10], 'Copper wiring', 'More than a dozen levels');
  // AI
  call(S('a3') + 2.6, N('a3'), world(dieP(...rc(DIE.aiu))), [-34, -4], 'AI accelerator', 'Shared by all eight cores');
  call(S('a4') + 4.2, S('a4') + 8.4, world(dieP(...rc(DIE.aiu))), [-34, -4], 'Running the model', 'On the chip, beside the data');
  // one computer
  call(S('s2') + 2.2, N('s2'), of(dies, 0, 0.0046, 0.0102), [0, 20], 'M-bus', 'Chip to chip, inside a module');
  call(S('s3') + 4.0, N('s3'), of(hero.group, 0, busY, dz + 0.1), [30, 10], 'X-bus', '8 chips · 64 cores · one memory');
  call(S('s4') + 3.2, dHome3 - 0.3, of(hero.group, 0.2, 0.075, -0.3), [-30, -14], 'A-bus', 'To the other drawers');
  call(dHome3 + 1.0, N('s4b'), of(R.smpCables, -0.17, uY(13), -0.44), [-30, 6], 'SMP9 cables', 'Every drawer to every drawer, in pairs');
  call(S('s5') + 2.2, N('s5'), world([0.3, 2.05, 0.6]), [-18, -12], '256 cores', 'Four drawers');
  call(S('s5') + 5.0, N('s5'), world([0.9, 2.05, 0.6]), [26, -12], 'Up to 200 for customer work', 'The rest: system tasks and spares');
  // never stop
  const dbl = [[1.0, of(R.ses[0], 0.2, 0, 0), [26, -10], '2 × support element'], [2.2, of(R.switches[1], 0.2, 0, 0), [28, 0], '2 × switch'], [3.4, of(hero.group, 0.1, 0.064, 0.4), [30, -2], '2 × oscillator'], [4.6, of(R.rcu, 0.15, 0.12, 0.39), [28, 8], '2 × pump'], [6.4, of(R.cpc[2].group, 0.18, 0.15, 0.4), [30, -6], 'Spare supplies, fans and cores']];
  dbl.forEach(([dt, at, off, title]) => call(S('r1') + dt, N('r1'), at, off, title));
  call(S('r1b') + 3.2, N('r1b'), of(R.cpc[1].group, -0.1, 0.024, 0.4), [30, 10], '3 × each sensor', 'Temperature · humidity · air pressure');
  call(S('r3') + 5.0, N('r3') - 2.8, of(spareDrawer, 0.2, 0.15, 0.4), [30, -12], 'Concurrent drawer repair', 'The other drawers carry its work');
  call(S('r3b') + 4.0, N('r3b'), world([2.0, 1.2, -0.62]), [0, -20], 'Coupling link', 'Two machines, one workload');
  // approved
  call(S('z1') + 11.2, E('z1'), world(fcP), [-30, -10], 'Out to storage', '');
  call(S('z4') + 2.0, N('z5'), world([-0.6, 2.05, 0.6]), [-22, -10], '4 frames', '');
  call(S('z4') + 3.6, N('z5'), world([0.0, 2.05, 0.6]), [-8, -20], '12 I/O drawers', '');
  call(S('z4') + 5.2, N('z5'), world([0.6, 2.05, 0.6]), [10, -20], '200 cores', '');
  call(S('z4') + 6.6, N('z5'), world([1.2, 2.05, 0.6]), [24, -10], '40 TB memory', '');

  // side lists (HUD)
  const frac = (id, f) => S(id) + (E(id) - S(id)) * f;
  const lists = [
    { t0: S('h2') + 0.3, t1: E('h2') + 1.2, title: 'In one second', items: [[frac('h2', 0.14), 'Encrypted'], [frac('h2', 0.27), 'Sent across the country'], [frac('h2', 0.42), 'Balance checked'], [frac('h2', 0.58), 'Scored for fraud'], [frac('h2', 0.8), 'Written to the ledger']] },
    { t0: S('a2') + 1.5, t1: N('a2b'), title: 'The model looks at', items: [[frac('a2', 0.24), 'Amount'], [frac('a2', 0.3), 'Place'], [frac('a2', 0.36), 'Time'], [frac('a2', 0.42), 'Your history'], [frac('a2', 0.52), '→ a fraud score']] },
    { t0: S('a5') + 3.4, t1: N('a5'), title: 'Fraud score', items: [[S('a5') + 4.4, 'Low risk'], [S('a5') + 6.0, 'It is really you']] },
  ];
  lists.forEach((l) => l.items.forEach(([t]) => cue(t, 'tick', 0.6)));
  // logical partitions grid
  const grid = { t0: S('s6') + 3.4, t1: N('s7'), fill: [S('s6') + 4.2, S('s6') + 9], groupsAt: S('s7') + 0.6, groups: [[0, 30, 'Ledger', '#4589ff'], [30, 52, 'Fraud models', '#ff4fd0'], [52, 85, 'Linux servers', '#39d98a']], crash: [S('s7') + 7.2, 41], title: '85 logical partitions' };
  cue(grid.crash[0], 'alert', 0.7);

  // lower-third facts
  const captions = [];
  const cap = (t0, t1, kicker, title, text = '') => captions.push({ t0, t1, kicker, title, text });
  cap(S('f2') + 0.5, N('f2b'), 'IBM z16 · model A01', 'A standard rack underneath', '19 inches wide, 42 units tall');
  cap(S('i2') + 0.6, N('i2b'), 'Rear of the frame', 'Every cable connects at the back', '');
  cap(S('d2') + 3.5, N('d3'), 'Central processor complex', 'The processor drawer', '5U · up to four per system');
  cap(S('d8') + 3.0, N('d9'), 'N + 1 redundancy', 'Built to be repaired while running', '');
  cap(S('w6') + 0.5, N('w6b'), 'Radiator cooling unit', 'Water inside, air outside', 'A sealed loop with N + 1 pumps and fans');
  cap(S('t1') + 0.4, N('t3b'), 'IBM Telum', '8 cores at 5.2 GHz', '22.5 billion transistors · 530 mm² · 7 nm');
  cap(S('x2') + 0.5, N('x4'), 'FinFET transistor', 'A switch a few nanometers wide', 'Schematic, not to scale');
  cap(S('a3') + 1.0, N('a4'), 'On-chip AI accelerator', 'Fraud scoring inside the transaction', '');
  cap(S('r2'), N('r2'), 'Design rule', 'Nothing is the only one of its kind', '');
  cap(S('r4') + 3.0, N('r4'), 'Mainframe', 'The one that is still running', '');

  const chapters = CHAPTERS.filter((c) => c.title).map((c, i) => ({ t0: CH(c.id), t1: CH(c.id) + CARD, num: String(i + 1).padStart(2, '0'), title: c.title }));
  chapters.forEach((c) => { cue(c.t0, 'chapter'); });
  const title = { t0: N('h5') - 5.2, t1: CH('frame') - 0.2, kicker: 'DEEP TEARDOWN', title: 'Inside the IBM z16', text: 'How does a mainframe work?' };
  cue(title.t0, 'impact');
  const end = { t0: S('z5') + 7.5, t1: DURATION, kicker: 'DEEP TEARDOWN', title: 'Thanks for watching', text: 'Subscribe for the next teardown' };
  dips.forEach((t) => cue(t - 0.35, 'whoosh', 0.5));
  sfx.sort((a, b) => a.t - b.t);

  return { tl, camera: cam, captions, callouts, title, end, chapters, lists, grid, dips, sfx, fullTitle: TITLE };
}
