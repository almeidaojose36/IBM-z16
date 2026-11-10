import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { makePalette } from './kit.js';
import { buildRack } from './model/rack.js';
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

const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x161a21, roughness: 0.9, metalness: 0.0 }));
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

const story = buildStory({ rack, palettes });
const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.01, 60);
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

function updateOverlay(t) {
  const W = stage.clientWidth, H = stage.clientHeight, u = H / 100;
  setBlock($('title'), story.title, fadeK(t, story.title));
  const cap = story.captions.find((c) => t >= c.t0 && t <= c.t1);
  setBlock($('caption'), cap, cap ? fadeK(t, cap) : 0);
  $('shade').style.opacity = cap ? fadeK(t, cap) : 0;
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
    camera.near = Math.max(0.002, d * 0.04); camera.far = 60;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  scene.updateMatrixWorld();
  renderer.render(scene, camera);
  updateOverlay(time);
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setPixelRatio(RENDER ? 1 : Math.min(devicePixelRatio, 2));
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
