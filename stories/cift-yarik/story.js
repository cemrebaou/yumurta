// Çift yarık — single photons sent one by one through two slits still build stripes (interference); watch which
// slit they take and the stripes vanish. Sets: LAB (x≈0, night, desk lamp + green beam), POOL (x≈200, day, two ripples).
import * as THREE from 'three';
import { stoneTex, woodTex, tileTex, ciniTex, painted, flat, rng, D } from '../../engine/src/paint.js';
import { Toon, Arm3D, flap, blinkAt } from '../../engine/src/toon.js';
import { CamPath, smoother } from '../../engine/src/camera.js';
import { Smoke, beam, glow } from '../../engine/src/fx.js';

export const NAME = 'cift-yarik';
export const FPS = 30;
export let DUR = 20;
export const CUES = [];

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
let W, cast = {}, sets = {}, smokes = {}, dyn = {};

function wordTimes(words) {
  const norm = s => s.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]/gu, '');
  return (w, n = 1) => { let k = 0; for (const x of words) if (norm(x.word) === norm(w) && ++k === n) return x.start; throw new Error('word not found: ' + w); };
}
function shadows(g) {
  g.traverse(o => {
    if (!o.isMesh) return;
    if (o.material.isMeshLambertMaterial) o.receiveShadow = true;
    if (/Box|Cylinder|Sphere|Torus/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
const box = (g, sx, sy, sz, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); return b; };
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw && draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.c = c; return t;
}

// ---------------------------------------------------------------- LAB (x = 0)
// optical bench along x on a table: emitter (x=-1.1), slit board (x=0), screen (x=1.2). Table top at y=.9, z=-1.
const BY = 1.12, BZ = -1.0;
function buildLab(scene) {
  const g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), painted(tileTex({ a: '#3a4a8a', b: '#d8d4e8', ink: '#24203a', rep: [10, 8] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const wallM = painted(stoneTex({ base: '#5a6aa8', bw: 256, bh: 128, rep: [3, 1] }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.4), wallM); back.position.set(0, 1.7, -2.6); g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.4), wallM); left.position.set(-3.2, 1.7, 0); left.rotation.y = Math.PI / 2; g.add(left);
  // pattern on the back wall: a chalkboard of wave sums (proud of the wall), a shelf of jars; a tiled dado
  const board = canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = D('#2f5a4a'); c.fillRect(0, 0, w, h); c.strokeStyle = D('#eef4e8', .9); c.lineWidth = 4;
    for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 40; x < w - 40; x += 4) c.lineTo(x, 110 + k * 120 + Math.sin(x / (30 + k * 12)) * 30 * (k === 2 ? Math.cos(x / 140) : 1)); c.stroke(); }
    c.font = '700 54px Inter, sans-serif'; c.fillStyle = D('#f2e6a8'); c.fillText('+', 60, 200); c.fillText('=', 60, 320);
    c.strokeStyle = D('#a8743e'); c.lineWidth = 22; c.strokeRect(0, 0, w, h);
  });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshLambertMaterial({ map: board })); bd.position.set(-1.0, 2.15, -2.55); g.add(bd);
  box(g, 10, .9, .05, 0, .45, -2.57, painted(ciniTex({ kind: 'yildiz', a: '#5b8fe0', b: '#3fbcae', c: '#e8603f', rep: [22, 2] })));
  box(g, 10, .05, .1, 0, .92, -2.55, flat('#e0b050'));
  box(g, 1.6, .05, .26, 1.6, 2.2, -2.48, painted(woodTex({ base: '#9a6a3e' })));
  for (let i = 0; i < 5; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .22, 14), flat(['#e8603f', '#f0c455', '#5b8fe0', '#7ac85a', '#c87ae0'][i])); j.position.set(.98 + i * .31, 2.34, -2.48); g.add(j); }
  // the window on the left wall: night outside (a cool HDR panel that blooms a little), with bars
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: HDR(.3, .42, 1.0) })); win.position.set(-3.18, 1.9, -.6); win.rotation.y = Math.PI / 2; g.add(win);
  for (const z of [-1.3, -.6, .1]) box(g, .06, 1.3, .06, -3.14, 1.9, z, flat('#e9dcc0'));
  for (const y of [1.25, 1.9, 2.55]) box(g, .06, .06, 1.5, -3.14, y, -.6, flat('#e9dcc0'));
  // the table and the bench
  const tw = painted(woodTex({ base: '#8a5a3a', plank: 48, rep: [2, 1] }));
  box(g, 3.2, .06, .9, 0, .87, BZ, tw);
  for (const [x, z] of [[-1.5, BZ - .38], [1.5, BZ - .38], [-1.5, BZ + .38], [1.5, BZ + .38]]) box(g, .07, .86, .07, x, .43, z, tw);
  box(g, 2.8, .04, .12, 0, .92, BZ, flat('#4a4458'));
  // emitter: a brass box with a lens; it glows green when it fires
  box(g, .36, .22, .22, -1.15, 1.06, BZ, flat('#d9a441', { emissive: '#4a3008' }));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .06, 16), new THREE.MeshBasicMaterial({ color: HDR(.8, 2.6, 1.6) })); lens.rotation.z = Math.PI / 2; lens.position.set(-.95, BY, BZ); lens.userData.noShadow = true; g.add(lens); dyn.lens = lens;
  // the slit board: a dark plate with two thin vertical gaps (built from three pieces), on a stand
  const plate = flat('#2c2a48');
  box(g, .04, .42, .17, 0, BY, BZ - .135, plate); box(g, .04, .42, .17, 0, BY, BZ + .135, plate); box(g, .04, .42, .06, 0, BY, BZ, plate);
  box(g, .04, .04, .5, 0, BY + .23, BZ, plate); box(g, .04, .04, .5, 0, BY - .23, BZ, plate);
  box(g, .06, .2, .06, 0, .98, BZ, flat('#4a4458'));
  dyn.slits = [V(0, BY, BZ - .043), V(0, BY, BZ + .043)];
  // the "watcher": a little camera on an arm that swings to the slits on "bakınca"
  const det = new THREE.Group(); det.position.set(.25, BY + .32, BZ + .28); g.add(det);
  box(det, .16, .12, .12, 0, 0, 0, flat('#c8433a'));
  const dl = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .08, 16), flat('#2a2440')); dl.rotation.z = Math.PI / 2; dl.position.x = -.11; det.add(dl);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), new THREE.MeshBasicMaterial({ color: HDR(3, .4, .3) })); led.position.set(-.02, .07, 0); det.add(led);
  det.visible = false; dyn.det = det;
  // the screen: a board facing the slits (its face is a canvas the photons paint)
  const sc = canvasTex(512, 512); dyn.screen = { t: sc, g: sc.c.getContext('2d'), key: '' };
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshBasicMaterial({ map: sc })); scr.position.set(1.2, BY + .1, BZ); scr.rotation.y = -Math.PI / 2; g.add(scr);
  box(g, .04, .86, .86, 1.23, BY + .1, BZ, flat('#e0b050'));
  box(g, .06, .3, .06, 1.24, .98, BZ, flat('#4a4458'));
  // the desk lamp: the key light (warm), on the far end of the table
  const lampM = flat('#c8433a');
  box(g, .2, .03, .2, -1.35, .91, BZ - .3, lampM);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .62, 8), lampM); arm.position.set(-1.35, 1.2, BZ - .3); arm.rotation.z = .3; g.add(arm);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.13, .16, 20, 1, true), flat('#c8433a', { side: THREE.DoubleSide })); shade.position.set(-1.45, 1.52, BZ - .3); shade.rotation.z = -.5; shade.userData.noShadow = true; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 10), new THREE.MeshBasicMaterial({ color: HDR(3.2, 2.4, 1.3) })); bulb.position.set(-1.42, 1.47, BZ - .3); bulb.userData.noShadow = true; g.add(bulb);
  // a plant near the lens in the wide shot
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, .3, 16), flat('#c8663a')); pot.position.set(2.0, .15, .9); pot.userData.noShadow = true; g.add(pot);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.28, 16, 12), flat('#3f9a48')); leaf.position.set(2.0, .5, .9); leaf.scale.y = 1.3; leaf.userData.noShadow = true; g.add(leaf);
  // lights
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#7f8cf0', '#3c3266', 1.6));
  const pl = new THREE.PointLight('#ffc27a', 7, 7, 1.3); pl.position.set(-1.4, 1.42, BZ - .3); pl.castShadow = true;
  pl.shadow.mapSize.set(1024, 1024); pl.shadow.camera.near = .1; pl.shadow.camera.far = 12; pl.shadow.bias = -.003; pl.shadow.normalBias = .04; pl.shadow.radius = 4; L.add(pl);
  const moon = new THREE.SpotLight('#9fb4ff', 2.0, 0, .5, .4, 0); moon.position.set(-6, 3.2, -.6); moon.target.position.set(0, 0, -.6); L.add(moon); L.add(moon.target);
  const gl = new THREE.PointLight('#7affc8', 0, 2.2, 1.6); gl.position.set(.6, BY, BZ + .2); L.add(gl); dyn.beamL = gl;
  scene.add(L); sets.lab = { g, L };
  shadows(g);
  dyn.winBeam = beam(scene, [-3.1, 1.9, -.6], [-.6, .05, -.2], { r0: .6, r1: .9, color: '#9db4ff', strength: .12 });
}
// the screen pattern: dots arrive one by one; their x follows two-slit fringes, or two bands when watched
function drawScreen(n, watched, k) {
  const sc = dyn.screen, key = n + '|' + watched + '|' + Math.round(k * 20);
  if (sc.key === key) return; sc.key = key;
  const g = sc.g, w = 512, h = 512;
  g.fillStyle = D('#efeef8'); g.fillRect(0, 0, w, h);
  g.strokeStyle = D('#c9c6dc'); g.lineWidth = 2; for (let x = 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  const R = rng(17);
  const sample = band => {
    for (;;) {
      const x = (R() - .5) * 2;
      const env = Math.exp(-x * x * 3.2);
      const p = band ? (Math.exp(-((x - .26) ** 2) * 60) + Math.exp(-((x + .26) ** 2) * 60)) * .9 : env * Math.cos(x * 9) ** 2;
      if (R() < p) return x;
    }
  };
  for (let i = 0; i < n; i++) {
    const watchedDot = watched;
    const x = sample(watchedDot), y = (R() - .5) * 1.7;
    const fresh = i > n - 4;
    g.fillStyle = fresh ? D('#2fd89a') : D(watchedDot ? '#c8433a' : '#2a2a6a', .85);
    g.beginPath(); g.arc(w / 2 + x * w * .45, h / 2 + y * h * .45, fresh ? 9 : 5, 0, 6.29); g.fill();
  }
  if (k > 0) {                                                // the stripes, drawn over the dots once enough have landed
    g.globalAlpha = k * .55;
    for (let px = 0; px < w; px += 2) {
      const x = (px - w / 2) / (w * .45);
      const p = watched ? (Math.exp(-((x - .26) ** 2) * 60) + Math.exp(-((x + .26) ** 2) * 60)) * .9 : Math.exp(-x * x * 3.2) * Math.cos(x * 9) ** 2;
      g.fillStyle = D(watched ? '#c8433a' : '#3a3aa8', p * .7); g.fillRect(px, 0, 2, h);
    }
    g.globalAlpha = 1;
  }
  g.strokeStyle = D('#2a2440'); g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  sc.t.needsUpdate = true;
}

// ---------------------------------------------------------------- POOL (x = 200)
function buildPool(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), painted(stoneTex({ base: '#f0d9a8', bw: 128, bh: 128, rep: [6, 5] }))); deck.rotation.x = -Math.PI / 2; g.add(deck);
  // the water: a canvas the two ripples are drawn on every frame (rings that add and cancel)
  const wt = canvasTex(384, 384); dyn.water = { t: wt, g: wt.c.getContext('2d'), img: null };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: wt })); water.rotation.x = -Math.PI / 2; water.position.set(0, .02, -1.2); g.add(water);
  const rimM = flat('#e9eef8');
  box(g, 4.3, .12, .15, 0, .06, .85, rimM); box(g, 4.3, .12, .15, 0, .06, -3.25, rimM); box(g, .15, .12, 4.2, -2.08, .06, -1.2, rimM); box(g, .15, .12, 4.2, 2.08, .06, -1.2, rimM);
  // a tiled wall behind, a hedge on top, sky beyond
  box(g, 12, 1.6, .2, 0, .8, -4.2, painted(ciniTex({ kind: 'lale', a: '#3f7fd6', b: '#35b3aa', c: '#e0604a', rep: [14, 2] })));
  const hedge = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 12, 16), flat('#3f9a48')); hedge.rotation.z = Math.PI / 2; hedge.position.set(0, 1.85, -4.2); g.add(hedge);
  const sky = canvasTex(2048, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, D('#4a7ae8')); gr.addColorStop(1, D('#bcd8ff')); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const R = rng(3); c.fillStyle = D('#ffffff', .9); for (let i = 0; i < 12; i++) { const x = R() * w, y = h * (.2 + R() * .4); for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + k * 40, y + Math.sin(k) * 10, 60, 30, 0, 0, 6.29); c.fill(); } }
  });
  const sk = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshBasicMaterial({ map: sky })); sk.position.set(0, 5, -9); g.add(sk);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(.9, 32), new THREE.MeshBasicMaterial({ color: HDR(2.6, 2.3, 1.6) })); sun.position.set(5, 7, -8.9); g.add(sun);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#d4dcff', '#a096b8', 2.2));
  const sl = new THREE.DirectionalLight('#ffd89c', 3.4); sl.position.set(205, 6, -5); sl.target.position.set(200, 0, -1); sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048);
  Object.assign(sl.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 20 }); sl.shadow.bias = -.0006; sl.shadow.normalBias = .02; L.add(sl); L.add(sl.target);
  scene.add(L); sets.pool = { g, L };
  shadows(g);
  dyn.drops = [V(199.4, .02, -.2), V(200.6, .02, -.2)];
}
function drawWater(t, t0) {
  const W2 = dyn.water, g = W2.g, n = 384;
  if (!W2.img) W2.img = g.createImageData(n, n);
  const d = W2.img.data, age = Math.max(0, t - t0);
  const sx = [n * .35, n * .65], sy = n * .75;     // the two stones, near the edge facing the camera
  const base = [63, 184, 200], hi = [215, 250, 246], lo = [30, 110, 150];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let a = 0;
    for (const s of sx) { const r = Math.hypot(x - s, y - sy), front = age * 70 - r; if (front > 0) a += Math.sin(r * .22 - age * 6) * Math.min(1, front / 30) / (1 + r * .012); }
    const k = Math.max(-1, Math.min(1, a * .9)), c = k > 0 ? hi : lo, m = Math.abs(k);
    const i = (y * n + x) * 4;
    d[i] = base[0] + (c[0] - base[0]) * m; d[i + 1] = base[1] + (c[1] - base[1]) * m; d[i + 2] = base[2] + (c[2] - base[2]) * m; d[i + 3] = 255;
  }
  g.putImageData(W2.img, 0, 0); W2.t.needsUpdate = true;
}

// ---------------------------------------------------------------- CAST
export const LOOK = {
  bilimci: { cloth: '#eef0f6', clothDark: '#b8bcd6', buttons: '#5a6aa8', mustache: true, hair: '#5a3a28', height: 1.7 },
  asistan: { cloth: '#4a7ab8', hair: '#2e2026', height: 1.6, headW: 262, headH: 246 },
  cocuk: { cloth: '#ff9a3a', hair: '#5a3a28', height: 1.3, headW: 262, headH: 246 },
};

function cameraPath() {
  const t = W;
  const keys = [
    { t: 0, pos: [-1.0, 1.42, 1.5], look: [-1.35, 1.2, -.75], fov: 46, creep: .28, drift: .04 },
    { t: t('iki') + .1, dur: .35, pos: [-.85, 1.28, -.35], look: [0, 1.12, -1.0], fov: 42, creep: .28, drift: .03 },
    { t: t('aynı') + .1, dur: .3, pos: [-1.25, 1.55, 1.2], look: [-1.5, 1.5, -.25], fov: 42, creep: .3 },
    { t: t('geçebilir') + .1, dur: .3, pos: [-.35, 1.32, .45], look: [1.2, 1.2, -1.0], fov: 40, creep: .28, drift: .02 },
    { t: t('Bakın') + .2, dur: .3, move: 'whip', pos: [-.45, 1.85, 3.7], look: [-.6, 1.25, -.9], fov: 56, creep: .22 },
    { t: t('gülüyor:') + .1, dur: .7, pos: [1.55, 1.55, 1.75], look: [2.1, 1.45, -.55], fov: 48, creep: .26 },
    { t: t('Ama') + .15, dur: .35, move: 'whip', pos: [-.35, 1.32, .45], look: [1.2, 1.2, -1.0], fov: 42, creep: .28, drift: .02 },
    { t: t('Tıpkı'), move: 'cut', pos: [200, 2.2, 2.4], look: [200, .1, -1.0], fov: 50, creep: .26 },
    { t: t('Daha') + .2, dur: .32, move: 'whip', pos: [.75, 1.6, 1.25], look: [.05, 1.25, -1.0], fov: 44, creep: .26 },
    { t: t('desen') - .1, dur: .4, pos: [-.35, 1.32, .45], look: [1.2, 1.2, -1.0], fov: 42, creep: .28, drift: .02 },
    { t: t('Yani') + .2, dur: .7, pos: [.15, 1.55, 2.3], look: [.9, 1.25, -.7], fov: 50, creep: .26 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t('kayboluyor.') + .05, .9);
  return cp;
}

export async function setup(ctx) {
  W = wordTimes(ctx.words);
  DUR = Math.ceil((ctx.words[ctx.words.length - 1].end + .7) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#1a1f3a');
  buildLab(scene); buildPool(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  // photons: bright green specks from the emitter to the slits, then on to the screen
  smokes.ph = new Smoke(scene, { color: '#8affd0', maxPoints: 400, H: ctx.H, additive: true, near: .15 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  dyn.photon = (u, i, t) => {                                       // u: 0 emitter -> .5 slits -> 1 screen
    const e = V(-.95, BY, BZ), sl = dyn.slits[hash(i, 1) < .5 ? 0 : 1], s = V(1.18, BY + (hash(i, 2) - .5) * .5, BZ + (hash(i, 3) - .5) * .6);
    return u < .5 ? e.lerp(sl, u / .5) : sl.clone().lerp(s, (u - .5) / .5);
  };
  // one photon at a time: a single bright point, plus a soft wave front between slits and screen (two rings)
  smokes.ph.wisps.push({ n: 3, size: .05, alpha: 1, speed: 1.1, on: t => t < W('Tıpkı') || t >= W('Daha'),
    path: (u, t, i) => dyn.photon(u, Math.floor(t * 1.1 + i * .33) + i * 7, t).toArray() });
  dyn.cam = cameraPath();
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(W('Bakın') - .1, 'whoosh'); cue(W('Ama') - .05, 'whoosh'); cue(W('Daha') - .1, 'whoosh');
  cue(W('parçacığı,') - .1, 'shimmer'); cue(W('Herkes') + .1, 'laugh', { dur: W('Ama') - .3 - W('Herkes') });
  cue(W('Tıpkı'), 'cut'); cue(W('Tıpkı') + .1, 'stir', { dur: 1.2 }); cue(W('kayboluyor.') + .05, 'boom'); cue(W('dalga.') - .1, 'shimmer');
}

const vis = (set, on) => { sets[set].g.visible = on; sets[set].L.visible = on; };
const WARM = '#ffb45a', NIGHT = '#d6d1f2', DAY = '#e8e3f4';
const GRADE = { lab: [1, .98, 1.03], pool: [1.03, 1.0, .96] };
const FACE = { lab: [1, .985, .96], pool: [1, 1, .985] };
export function frame(t, ctx) {
  const { cam, env } = ctx;
  const cp = dyn.cam.apply(cam, t);
  const where = cam.position.x < 100 ? 'lab' : 'pool';
  vis('lab', where === 'lab'); vis('pool', where === 'pool');
  dyn.winBeam.visible = where === 'lab';
  const T = W, A = (w, n) => W(w, n) - 2 / FPS;
  // screen: dots land at a steady pace, faster after "Ama"; watched from "bakınca"
  const watched = t >= T('bakınca') && t < T('Yani');
  const rate = t < T('Ama') ? 3 : 60;
  const n = Math.floor(Math.min(t, T('Ama')) * 3 + Math.max(0, t - T('Ama')) * rate);
  if (!dyn.nBefore || t < T('bakınca')) dyn.nBefore = n;
  const stripes = watched ? ramp(t, T('desen') - .2, T('kayboluyor.')) : ramp(t, T('sürü') - .2, T('beliriyor.') + .4);
  if (where === 'lab') drawScreen(Math.min(n, 1400), watched, stripes);
  dyn.det.visible = t >= T('hangi') - .2 && t < T('Yani');
  if (dyn.det.visible) { const k = ramp(t, T('hangi') - .2, T('yarıktan') + .1); dyn.det.position.set(.25 - .1 * k, BY + .32 - .12 * k, BZ + .28 - .1 * k); }
  const fire = .5 + .5 * Math.sin(t * 7); dyn.lens.material.color.setRGB(.5, 1.1 + fire * .5, .8 + fire * .3); dyn.beamL.intensity = .6 + fire * .5;
  if (where === 'pool') drawWater(t, T('Tıpkı') - .1);
  // cast
  for (const c of Object.values(cast)) c.hide();
  const tint = FACE[where].map((v, i) => v / GRADE[where][i]);
  const bl = (seed, ...swaps) => blinkAt(t, seed, swaps, FPS);
  const lampP = V(-1.42, 1.47, BZ - .3);
  if (where === 'lab') {
    const surprised = t > A('aynı') && t < A('Bakın'), shock = t > A('kayboluyor.') - .05 && t < A('Yani'), proud = t > A('Yani');
    cast.bilimci.show(); cast.bilimci.place(-1.5, 0, -.2, cam, tint);
    cast.bilimci.draw({ expr: shock ? 'surprised' : proud ? 'proud' : surprised ? 'surprised' : t > A('Ama') ? 'smug' : 'focused', look: .7, brow: surprised ? .8 : 0, sweat: shock ? 1 : 0,
      blink: bl(1, A('aynı'), A('Bakın'), A('Ama'), A('kayboluyor.')), armR: [40, 60], armL: [18, 10], lit: -1, shade: NIGHT, rim: { color: WARM, a: .4 } });
    cast.bilimci.castFrom(lampP);
    if (t > T('Yani')) { cast.bilimci.place(.6, 0, -.3, cam, tint); cast.bilimci.draw({ expr: 'proud', look: .6, blink: bl(1, A('Yani')), armR: [120, 40], armL: [18, 10], lit: -1, shade: NIGHT, rim: { color: WARM, a: .4 } }); cast.bilimci.castFrom(lampP); }
    const talk = t > A('Ekranda') - .05 && t < A('biter."') + .4, laugh = t > A('Herkes') && t < A('Ama') - .2;
    cast.asistan.show(); cast.asistan.place(2.1, 0, -.55, cam, tint);
    cast.asistan.draw({ mouth: talk ? flap(env, t) : laugh ? .6 : 0, expr: talk ? 'smug' : laugh ? 'laugh' : t > A('Ama') ? 'surprised' : 'neutral', look: -.6, brow: talk ? .6 : 0, laughMarks: laugh && !talk ? .9 : 0,
      blink: bl(2, A('Herkes'), A('Ekranda'), A('Ama')), armL: [talk ? 70 + Math.sin(t * 7) * 12 : 18, talk ? 40 : 10], armR: [laugh ? 150 : 22, laugh ? 20 : 12], bob: laugh && !talk ? Math.abs(Math.sin(t * 13)) * -10 : 0,
      lit: -1, shade: NIGHT, rim: { color: WARM, a: .3 } });
    cast.asistan.castFrom(lampP);
  } else {
    cast.cocuk.show(); cast.cocuk.place(200.2, 0, 1.45, cam, tint);
    cast.cocuk.draw({ expr: t > A('çarpışan') ? 'grin' : 'surprised', look: -.2, lookY: .9, gazeY: 1, blink: bl(3, A('çarpışan')), armL: [60, 50], armR: [60, 50], lit: 1, shade: DAY, rim: { color: '#ffe2a0', a: .35 } });
    cast.cocuk.castFrom(V(-5, -6, 4).normalize(), true);
  }
  for (const s of Object.values(smokes)) s.update(t);
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (where === 'lab') look = { ...focusOn(V(.2, 1.2, -1.0), 6, 1.6), sat: 1.22, lift: [.105, .092, .175], bloom: .9, vignette: .22 };
  else look = { ...focusOn(V(200, .1, -1.0), 3, 4), sat: 1.35, lift: [.098, .09, .15], bloom: .7, vignette: .18 };
  look.tint = GRADE[where];
  look.blur = cp.moving > .15 ? 16 : 0;
  look.flash = t >= T('Tıpkı') && t < T('Tıpkı') + 2 / FPS ? .35 : 0;
  return look;
}
