// Deterministic timeline: every property is a pure function of time, so any frame can
// be rendered in any order (scrubbing in the browser, frame-by-frame in the video renderer).
import * as THREE from 'three';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const ramp = (t, t0, dur) => smooth((t - t0) / dur);

/** 0→1 over [inAt, inAt+inDur], back to 0 over [outAt, outAt+outDur] (if outAt given). */
export function pulse(t, inAt, inDur, outAt, outDur = inDur) {
  const k = ramp(t, inAt, inDur);
  return outAt === undefined ? k : k * (1 - ramp(t, outAt, outDur));
}

export class Timeline {
  constructor() { this.objects = new Map(); this.hooks = []; }

  /**
   * Offset an object from its rest pose.
   * @param obj  THREE.Object3D
   * @param d    { pos:[x,y,z], rot:[x,y,z] } offsets reached at k = 1
   * @param w    { in, dur, out, outDur } timing in seconds
   */
  move(obj, d, w) {
    let e = this.objects.get(obj);
    if (!e) this.objects.set(obj, e = { pos: obj.position.clone(), rot: obj.rotation.clone(), tracks: [] });
    e.tracks.push({ d, w });
    return this;
  }

  /** Arbitrary per-frame callback fn(t). */
  hook(fn) { this.hooks.push(fn); return this; }

  apply(t) {
    for (const [obj, e] of this.objects) {
      obj.position.copy(e.pos);
      obj.rotation.copy(e.rot);
      for (const { d, w } of e.tracks) {
        const k = pulse(t, w.in, w.dur, w.out, w.outDur);
        if (k === 0) continue;
        if (d.pos) { obj.position.x += d.pos[0] * k; obj.position.y += d.pos[1] * k; obj.position.z += d.pos[2] * k; }
        if (d.rot) { obj.rotation.x += d.rot[0] * k; obj.rotation.y += d.rot[1] * k; obj.rotation.z += d.rot[2] * k; }
      }
    }
    for (const h of this.hooks) h(t);
  }
}

/**
 * Camera path through timed keys { t, pos:[x,y,z], look:[x,y,z] } using cubic Hermite
 * interpolation with monotone tangents, so the camera never overshoots a key.
 */
export class CameraPath {
  constructor(keys) {
    this.keys = keys.map((k) => ({ t: k.t, v: [...k.pos, ...k.look] }));
    const K = this.keys, n = K.length;
    // Monotone (Fritsch–Carlson style) tangents: no overshoot, and the camera settles at any
    // key where a component reverses direction or holds.
    for (let i = 0; i < n; i++) {
      const c = K[i];
      c.m = c.v.map((x, j) => {
        if (i === 0 || i === n - 1) return 0;
        const d0 = (x - K[i - 1].v[j]) / (c.t - K[i - 1].t), d1 = (K[i + 1].v[j] - x) / (K[i + 1].t - c.t);
        return d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1);
      });
    }
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
  }

  at(t) {
    const K = this.keys;
    let i = 0;
    while (i < K.length - 2 && t > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1], h = b.t - a.t, s = clamp01((t - a.t) / h);
    const s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    const v = a.v.map((_, j) => h00 * a.v[j] + h10 * h * a.m[j] + h01 * b.v[j] + h11 * h * b.m[j]);
    this.pos.set(v[0], v[1], v[2]); this.look.set(v[3], v[4], v[5]);
    return this;
  }
}
