// Supporting props for the long-form video: the card reader, the transistor close-up,
// the travelling "payment" light, water-flow beads and floor-plan highlights.
import * as THREE from 'three';
import { box, cyl, group, glowTexture, screenTexture, coreDetailTexture } from '../kit.js';

/** Payment terminal and card on a counter. Origin at the centre of the counter top. */
export function buildReader(P) {
  const root = group('Card reader set');
  root.add(box(2.4, 0.06, 1.4, P.blackGloss, 0, -0.03, 0, 'Counter'));
  const term = group('Payment terminal');
  term.add(box(0.085, 0.022, 0.17, P.plastic, 0, 0.011, 0));
  term.add(box(0.079, 0.004, 0.164, P.blackGloss, 0, 0.024, 0));
  const mk = (tex) => new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.041), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const idle = mk(screenTexture('TAP CARD', '$ 42.80', '#0b1a2e', '#cfe3ff'));
  const wait = mk(screenTexture('· · ·', 'Authorizing', '#0b1a2e', '#cfe3ff'));
  const ok = mk(screenTexture('APPROVED', 'Thank you', '#0c3a22', '#7dffb0'));
  for (const s of [idle, wait, ok]) { s.rotation.x = -Math.PI / 2; s.position.set(0, 0.0265, -0.045); term.add(s); }
  // contactless mark
  for (let i = 0; i < 3; i++) { const arc = new THREE.Mesh(new THREE.TorusGeometry(0.006 + i * 0.005, 0.0009, 6, 20, Math.PI * 0.6), P.led); arc.rotation.set(-Math.PI / 2, 0, Math.PI * 0.2); arc.position.set(-0.004, 0.0265, 0.045); term.add(arc); }
  term.rotation.x = 0.32; term.position.set(0, 0.03, 0);
  term.add(box(0.07, 0.05, 0.02, P.plastic, 0, -0.012, -0.07));
  root.add(term);
  const card = group('Payment card', box(0.0856, 0.0012, 0.054, P.blue, 0, 0, 0), box(0.012, 0.0004, 0.010, P.gold, -0.024, 0.0008, -0.004), box(0.0856, 0.0004, 0.009, P.blackGloss, 0, -0.0008, 0.016));
  card.position.set(0.16, 0.12, 0.12); card.rotation.set(0.32, 0.5, 0.1);
  root.add(card);
  return { group: root, card, term, screens: { idle, wait, ok } };
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
