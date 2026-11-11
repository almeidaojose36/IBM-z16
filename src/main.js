import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { makePalette } from './kit.js';
import { buildRack, buildShell } from './model/rack.js';
import { buildReader, buildFinfet, buildPacket } from './model/extras.js';
import { buildStory, DURATION, FOV } from './story.js';
import { pulse } from './timeline.js';

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
document.body.classList.toggle('render', RENDER);

const stage = document.getElementById('stage');
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RENDER });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d12);
scene.fog = new THREE.Fog(0x0a0d12, 9, 22);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.75;

const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
key.position.set(3.5, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3.5, bottom: -1.5, near: 1, far: 16 });
key.shadow.bias = -0.0002; key.shadow.normalBias = 0.004;
const rim = new THREE.DirectionalLight(0x7aa7ff, 1.3);
rim.position.set(-4, 3, -5);
scene.add(key, rim, new THREE.HemisphereLight(0xcfd8e6, 0x10131a, 0.35));

const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshLambertMaterial({ color: 0x323a47 })); // matte: far cheaper than PBR over this many pixels
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.name = 'Studio floor';
scene.add(floor);

// ---- model: one palette per independently fading assembly
const palettes = { rack: makePalette(), doors: makePalette(), hero: makePalette(), cover: {} };
palettes.cover.cover = palettes.hero.steel.clone();
palettes.hero.cover = palettes.cover.cover;
const rack = buildRack(palettes.rack, palettes.doors, palettes.hero);
scene.add(rack.group);

// extra frames of a four-frame system, the card reader, the transistor patch and the payment light
palettes.ext = makePalette();
const shells = ['Z frame', 'B frame', 'C frame'].map((n) => { const s = buildShell(palettes.ext, n); s.visible = false; scene.add(s); return s; });
const reader = buildReader(makePalette());
reader.group.position.set(60, 0.9, 0);
const finfet = buildFinfet();
finfet.group.position.set(-60, 0, 0);
const packet = buildPacket();
scene.add(reader.group, finfet.group, packet);

const story = buildStory({ rack, palettes, reader, finfet, packet, shells, scene });
const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.01, 80);
const controls = new OrbitControls(camera, canvas);
controls.enabled = false;

// ---- overlay
const $ = (id) => document.getElementById(id);
const overlay = $('overlay'), lines = $('lines');
const NS = 'http://www.w3.org/2000/svg';
const fadeK = (t, c) => pulse(t, c.t0, 0.45, c.t1 - 0.45, 0.45);
const setBlock = (el, c, k) => {
  el.style.opacity = k;
  if (!c || el._c === c) return;
  el._c = c;
  el.children[0].textContent = c.kicker; el.children[1].textContent = c.title; el.children[2].textContent = c.text;
};
for (const c of story.callouts) {
  c.el = document.createElement('div'); c.el.className = 'callout';
  c.el.innerHTML = `<b></b>${c.text ? '<span></span>' : ''}`;
  c.el.children[0].textContent = c.title;
  if (c.text) c.el.children[1].textContent = c.text;
  c.line = document.createElementNS(NS, 'line'); c.dot = document.createElementNS(NS, 'circle');
  c.dot.setAttribute('r', 4);
  overlay.append(c.el); lines.append(c.line, c.dot);
}

// side lists and the partition grid
for (const l of story.lists) {
  l.el = document.createElement('div'); l.el.className = 'hudlist';
  l.el.innerHTML = '<h4></h4>' + l.items.map(() => '<div class="item"></div>').join('');
  l.el.children[0].textContent = l.title;
  l.items.forEach(([, text], i) => { l.el.children[i + 1].textContent = text; });
  overlay.append(l.el);
}
const gridEl = $('grid');
gridEl.children[0].textContent = story.grid.title;
for (let i = 0; i < 85; i++) gridEl.children[1].append(document.createElement('i'));
const cells = [...gridEl.children[1].children];

function updateOverlay(t) {
  const W = stage.clientWidth, H = stage.clientHeight, u = H / 100;
  const tt = t < story.end.t0 ? story.title : story.end;
  setBlock($('title'), tt, fadeK(t, tt));
  const cap = story.captions.find((c) => t >= c.t0 && t <= c.t1);
  setBlock($('caption'), cap, cap ? fadeK(t, cap) : 0);
  $('shade').style.opacity = cap ? fadeK(t, cap) : 0;
  // fades through black
  let black = t < 1 ? 1 - t : t > DURATION - 1.5 ? (t - DURATION + 1.5) / 1.5 : 0;
  for (const d of story.dips) black = Math.max(black, pulse(t, d - 0.4, 0.38, d + 0.02, 0.38));
  $('black').style.opacity = black;
  // chapter card and tag
  const ch = story.chapters.find((c) => t >= c.t0 && t <= c.t1), cur = [...story.chapters].reverse().find((c) => t >= c.t1);
  const ck = ch ? pulse(t, ch.t0 + 0.2, 0.5, ch.t1 - 0.6, 0.5) : 0;
  const card = $('card'); card.style.opacity = ck;
  if (ch && card._c !== ch) { card._c = ch; card.children[0].textContent = `Chapter ${ch.num}`; card.children[1].textContent = ch.title; }
  if (ch) card.children[2].style.transform = `scaleX(${pulse(t, ch.t0 + 0.4, 1.4)})`;
  const tag = $('tag'); tag.style.opacity = cur && !ch && t < story.end.t0 ? 0.9 : 0;
  if (cur && tag._c !== cur) { tag._c = cur; tag.textContent = `${cur.num}  ·  ${cur.title}`; }
  for (const l of story.lists) {
    const k = t >= l.t0 && t <= l.t1 ? fadeK(t, l) : 0;
    l.el.style.opacity = k; l.el.style.display = k > 0.001 ? '' : 'none';
    l.items.forEach(([ti], i) => { const e = l.el.children[i + 1], a = pulse(t, ti, 0.35); e.style.opacity = a; e.style.transform = `translateX(${(1 - a) * 3 * u}px)`; });
  }
  const G = story.grid, gk = t >= G.t0 && t <= G.t1 ? fadeK(t, G) : 0;
  gridEl.style.opacity = gk; gridEl.style.display = gk > 0.001 ? '' : 'none';
  if (gk > 0.001) {
    const n = Math.floor(85 * Math.min(1, Math.max(0, (t - G.fill[0]) / (G.fill[1] - G.fill[0])))), grouped = t >= G.groupsAt;
    cells.forEach((c, i) => {
      const gdef = G.groups.find(([a, b]) => i >= a && i < b), crashed = i === G.crash[1] && t >= G.crash[0] && t < G.crash[0] + 4;
      c.style.opacity = i < n ? 1 : 0.12;
      c.style.background = crashed ? (Math.sin(t * 14) > 0 ? '#ff3b30' : '#5a1512') : grouped ? gdef[3] : '#8fa3bf';
    });
    [...gridEl.children[2].children].forEach((e, i) => { e.style.opacity = grouped ? pulse(t, G.groupsAt + i * 0.5, 0.5) : 0; });
  }
  for (const c of story.callouts) {
    const k = t >= c.t0 && t <= c.t1 ? fadeK(t, c) : 0;
    const show = k > 0.001;
    c.el.style.display = show ? '' : 'none';
    c.line.style.display = c.dot.style.display = show ? '' : 'none';
    if (!show) continue;
    const p = c.at().project(camera);
    const ax = (p.x * 0.5 + 0.5) * W, ay = (-p.y * 0.5 + 0.5) * H;
    const lx = ax + c.off[0] * u, ly = ay + c.off[1] * u;
    c.el.style.left = lx + 'px'; c.el.style.top = ly + 'px'; c.el.style.opacity = k;
    // leader runs from the anchor to the near edge of the label
    const ex = lx - Math.sign(c.off[0]) * Math.min(Math.abs(c.off[0]) * u, c.el.offsetWidth / 2);
    const g = (el, o) => { for (const [a, b] of Object.entries(o)) el.setAttribute(a, b); el.style.opacity = k; };
    g(c.line, { x1: ax, y1: ay, x2: ex, y2: ly });
    g(c.dot, { cx: ax, cy: ay });
  }
}

// ---- frame
let time = 0;
function setTime(t) {
  time = Math.min(DURATION, Math.max(0, t));
  story.tl.apply(time);
  if (!controls.enabled) {
    const c = story.camera.at(time);
    camera.position.copy(c.pos);
    camera.lookAt(c.look);
    // keep depth precision from the whole frame down to a 23 mm die
    const d = c.pos.distanceTo(c.look);
    camera.near = Math.max(0.0004, d * 0.04); camera.far = 80;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  scene.updateMatrixWorld();
  renderer.render(scene, camera);
  updateOverlay(time);
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  // ?scale=0.8 renders the 3D at 80% and lets the browser upscale it; text stays sharp
  renderer.setPixelRatio(RENDER ? Number(params.get('scale') ?? 1) : Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  lines.setAttribute('viewBox', `0 0 ${w} ${h}`);
  setTime(time);
}
addEventListener('resize', resize);
resize();

// ---- GLB export (assembled, with every part named; add ?explode=1 state by scrubbing first)
async function exportGlb() {
  const keep = [];
  rack.group.traverse((o) => { if (!o.visible) { keep.push(o); o.visible = true; } });
  const data = await new GLTFExporter().parseAsync(rack.group, { binary: true, onlyVisible: false });
  for (const o of keep) o.visible = false;
  return data;
}

// ---- hooks for the headless renderer / exporter
window.__duration = DURATION;
window.__setTime = (t) => { setTime(t); return true; };
window.__exportGlb = async (t = 0) => {
  setTime(t);
  const bytes = new Uint8Array(await exportGlb());
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
window.__scene = { scene, camera, rack, story };
window.__sfx = story.sfx;
// exterior still from an arbitrary camera, overlay hidden, stage filling the viewport
window.__beauty = (pos, look) => {
  stage.style.cssText = 'width:100vw;height:100vh;left:0;top:0;transform:none';
  resize();
  setTime(0);
  $('overlay').style.display = $('lines').style.display = $('shade').style.display = 'none';
  camera.fov = 24; camera.position.set(...pos); camera.lookAt(...look);
  camera.near = 0.1; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return true;
};
window.__ready = true;

// ---- interactive playback
if (!RENDER) {
  const play = $('play'), scrub = $('scrub'), clock = $('clock');
  scrub.max = DURATION;
  let playing = true, last = performance.now();
  const start = parseFloat(params.get('t'));
  if (!Number.isNaN(start)) { time = start; playing = false; play.textContent = 'Play'; }
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; if (playing && time >= DURATION) time = 0; };
  scrub.oninput = () => { playing = false; play.textContent = 'Play'; setTime(+scrub.value); };
  $('free').onchange = (e) => { controls.enabled = e.target.checked; if (controls.enabled) controls.target.copy(story.camera.at(time).look); };
  $('glb').onclick = async () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([await exportGlb()], { type: 'model/gltf-binary' }));
    a.download = 'ibm-z16-a-frame.glb'; a.click();
  };
  renderer.setAnimationLoop((now) => {
    const dt = (now - last) / 1000; last = now;
    if (playing) { time += dt; if (time >= DURATION) { time = DURATION; playing = false; play.textContent = 'Play'; } }
    if (controls.enabled) controls.update();
    setTime(time);
    scrub.value = time; clock.textContent = `${time.toFixed(2)} / ${DURATION} s`;
  });
}
