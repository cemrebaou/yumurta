// Marina — a silent animation (no captions, no audio in the file) timed to the user's audio, which they add with
// YouTube's own remix tool. words.json holds only segment ids (s1..s21) and their times, not the words.
// Sets: STAGE (x≈0, a Miami club: one warm spotlight, a pink palm neon, the front row with a rich man in it),
// MARINA (x≈200, a pier at sunset: yachts, a glowing MARINA arch, a giant golden key).
import * as THREE from 'three';
import { stoneTex, woodTex, painted, flat, rng, D } from '../../engine/src/paint.js';
import { Toon, flap, blinkAt } from '../../engine/src/toon.js';
import { CamPath, smoother } from '../../engine/src/camera.js';
import { beam } from '../../engine/src/fx.js';

export const NAME = 'marina';
export const FPS = 30;
export let DUR = 56.6;
export const CUES = [];

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
let W, E, cast = {}, sets = {}, dyn = {};
const inSeg = (t, n) => t >= W('s' + n) - .05 && t < E('s' + n) + .15;

function shadows(g) {
  g.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (o.material.isMeshLambertMaterial) o.receiveShadow = true;
    if (/Box|Cylinder|Sphere|Torus/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
const box = (g, sx, sy, sz, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); return b; };
const glowM = (r, g, b) => new THREE.MeshBasicMaterial({ color: HDR(r, g, b) });
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------------------------------------------------------------- STAGE (x = 0)
function palmShape(s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Shape(); trunk.moveTo(-.04 * s, 0); trunk.quadraticCurveTo(.12 * s, .5 * s, .02 * s, 1 * s); trunk.lineTo(.08 * s, 1 * s); trunk.quadraticCurveTo(.2 * s, .5 * s, .04 * s, 0); trunk.closePath();
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(trunk), glowM(2.4, .5, 1.5)));
  for (let k = 0; k < 6; k++) {
    const a = -.2 + k / 5 * (Math.PI + .4), leaf = new THREE.Shape();
    leaf.moveTo(0, 0); leaf.quadraticCurveTo(Math.cos(a) * .25 * s, Math.sin(a) * .25 * s + .12 * s, Math.cos(a) * .45 * s, Math.sin(a) * .3 * s - .05 * s);
    leaf.quadraticCurveTo(Math.cos(a) * .22 * s, Math.sin(a) * .2 * s + .05 * s, 0, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(leaf), glowM(.4, 2.4, 1.8)); m.position.set(.05 * s, 1 * s, .001); g.add(m);
  }
  return g;
}
function buildStage(scene) {
  const g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), painted(woodTex({ base: '#3a4a6a', plank: 48, rep: [3, 3] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  box(g, 5, .5, 2.4, 0, .25, -1.4, painted(woodTex({ base: '#6a3a5a', plank: 40, rep: [2, 1] })));
  box(g, 5, .06, .06, 0, .5, -.2, flat('#e0b050'));
  const wall = painted(stoneTex({ base: '#2e6a7a', seam: '#173a48', bw: 64, bh: 32, rep: [6, 3] }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), wall); back.position.set(0, 2, -2.6); g.add(back);
  const p1 = palmShape(1.1); p1.position.set(-1.9, 1.5, -2.58); g.add(p1);
  const p2 = palmShape(.8); p2.position.set(1.5, 1.9, -2.58); p2.scale.x = -1; g.add(p2);
  // a neon sunset disc between the palms
  const sun = new THREE.Mesh(new THREE.CircleGeometry(.26, 32), glowM(1.5, .65, .3)); sun.position.set(-1.0, 3.3, -2.585); g.add(sun);
  for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(.6, .04), flat('#2e6a7a')); st.position.set(-1.0, 3.2 - k * .08, -2.58); g.add(st); }
  for (const x of [-2.6, 2.6]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.35, .45, 3.6, 16, 1, true), flat('#1a6a7a', { side: THREE.DoubleSide })); c.position.set(x, 2.0, -2.3); g.add(c); }
  const ms = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.4, 6), flat('#2a2440')); ms.position.set(.45, 1.2, -.75); g.add(ms);
  const mb = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .02, 16), flat('#2a2440')); mb.position.set(.45, .51, -.75); g.add(mb);
  for (const x of [-1.5, 0, 1.5]) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .03, 20), flat('#2a2440')); top.position.set(x, .72, 2.4); g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .7, 8), flat('#2a2440')); leg.position.set(x, .36, 2.4); g.add(leg);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.03, .025, .1, 10), glowM(1.4, .8, .3)); glass.position.set(x + .1, .79, 2.4); glass.userData.noShadow = true; g.add(glass);
  }
  // the rich man's table: a champagne bucket
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(.07, .055, .13, 14), flat('#c8ccd8')); bucket.position.set(-.1, .8, 2.4); g.add(bucket);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .2, 10), flat('#2a5a3a')); bottle.position.set(-.1, .92, 2.4); bottle.rotation.z = .25; g.add(bottle);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#6a8ad6', '#3a2440', 1.4));
  const sp = new THREE.SpotLight('#ffc884', 18, 0, .3, .45, 0); sp.position.set(.4, 5.5, 2.5); sp.target.position.set(0, .5, -.7); sp.castShadow = true;
  sp.shadow.mapSize.set(2048, 2048); sp.shadow.camera.near = 1; sp.shadow.camera.far = 14; sp.shadow.bias = -.0008; sp.shadow.normalBias = .03; L.add(sp); L.add(sp.target);
  const back2 = new THREE.PointLight('#ff5ab0', 2.4, 5, 1.5); back2.position.set(-1.6, 2.5, -2.2); L.add(back2);
  const crowd = new THREE.PointLight('#7ad0e0', 2.0, 6, 1.4); crowd.position.set(0, 2.4, 3.6); L.add(crowd);
  // a gold light that finds the rich man
  const rich = new THREE.SpotLight('#ffd070', 0, 0, .18, .5, 0); rich.position.set(0, 5, 4.5); rich.target.position.set(0, 1, 2.1); L.add(rich); L.add(rich.target); dyn.rich = rich;
  scene.add(L); sets.stage = { g, L };
  shadows(g);
  dyn.spotBeam = beam(scene, [.4, 5.5, 2.5], [0, .5, -.7], { r0: .1, r1: 1.0, color: '#ffd8a0', strength: .14 });
  dyn.richBeam = beam(scene, [0, 5, 4.5], [0, .6, 2.1], { r0: .1, r1: .8, color: '#ffe0a0', strength: 0 });
}

// ---------------------------------------------------------------- MARINA (x = 200): a pier at sunset
function sunsetTex() {
  return canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, D('#2a2470')); gr.addColorStop(.32, D('#7a3a8a')); gr.addColorStop(.44, D('#e0607a')); gr.addColorStop(.5, D('#ffb060')); gr.addColorStop(.52, D('#ffd890')); gr.addColorStop(1, D('#3a2a6a'));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = rng(3);
    for (let i = 0; i < 22; i++) { const y = h * (.2 + R() * .26), x = R() * w; g.fillStyle = D(R() < .5 ? '#ff9a8a' : '#b870a8', .5); g.beginPath(); g.ellipse(x, y, 80 + R() * 200, 8 + R() * 14, 0, 0, 6.29); g.fill(); }
    for (let i = 0; i < 300; i++) { g.fillStyle = D('#fff6dc', .3 + R() * .5); g.beginPath(); g.arc(R() * w, R() * h * .25, 1.2, 0, 6.29); g.fill(); }
  });
}
function signTex() {
  return canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.font = '900 170px "Segoe UI Black", Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff6ac8'; g.shadowBlur = 30; g.fillStyle = '#ffe0f4'; g.fillText('MARINA', w / 2, h / 2 + 8);
  });
}
function yacht(g, x, z, s, color, R) {
  const y = new THREE.Group(); y.position.set(x, 0, z); y.scale.setScalar(s); g.add(y);
  const hull = new THREE.Shape(); hull.moveTo(-1.2, .5); hull.lineTo(1.4, .5); hull.lineTo(1.0, 0); hull.lineTo(-1.0, 0); hull.closePath();
  const hg = new THREE.ExtrudeGeometry(hull, { depth: .7, bevelEnabled: false }); hg.translate(0, -.15, -.35);
  y.add(new THREE.Mesh(hg, flat('#f2f0ec')));
  box(y, 2.3, .06, .72, .1, .3, 0, flat(color));
  box(y, 1.1, .32, .55, -.1, .62, 0, flat('#f2f0ec'));
  box(y, 1.0, .1, .56, -.1, .62, 0, glowM(.4, .7, 1.2));
  box(y, .6, .22, .45, -.2, .9, 0, flat('#f2f0ec'));
  if (R() < .6) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 2.2, 6), flat('#d8d4dc')); m.position.set(.2, 1.8, 0); y.add(m); }
  y.userData.ph = R() * 6;
  return y;
}
function goldKey() {
  const k = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: '#e8b84a', emissive: '#6a4410' });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.12, .035, 12, 32), m); ring.position.y = .3; k.add(ring);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .42, 10), m); shaft.position.y = -.05; k.add(shaft);
  for (const [y, w] of [[-.2, .1], [-.12, .07]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(w, .04, .04), m); t.position.set(w / 2, y, 0); k.add(t); }
  const gem = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), glowM(3, 2.2, .8)); gem.position.y = .3; gem.userData.noShadow = true; k.add(gem);
  return k;
}
function buildMarina(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: '#6a5ab0' })); water.rotation.x = -Math.PI / 2; water.position.y = -.05; g.add(water);
  // the sun's path on the water: a column of glints
  const R = rng(9);
  const glints = new THREE.Group(); g.add(glints); dyn.glints = glints;
  for (let i = 0; i < 140; i++) {
    const z = -100 + Math.pow(R(), 1.6) * 100, wdt = .2 + R() * 1.2 * (1 + (-z) / 40);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(wdt, .05 + (-z) * .004), glowM(2.6, 1.3, .5)); gl.rotation.x = -Math.PI / 2;
    gl.position.set((R() - .5) * (2 + (-z) * .25), -.03, z); gl.userData = { ph: R() * 6, noShadow: true }; glints.add(gl);
  }
  // the pier
  const deck = painted(woodTex({ base: '#8a5a3a', plank: 40, rep: [1, 4] }));
  box(g, 1.6, .12, 14, 0, .3, -3, deck);
  for (let z = 3.6; z > -10; z -= 1.4) for (const x of [-.75, .75]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .9, 8), flat('#5a3a2a')); p.position.set(x, -.05, z); g.add(p); }
  for (const x of [-.78, .78]) box(g, .05, .05, 14, x, .65, -3, flat('#e9eef8'));
  // side pontoons with yachts
  box(g, 6, .1, .5, -3.8, .2, -2.5, deck); box(g, 6, .1, .5, 3.8, .2, -2.5, deck);
  box(g, 6, .1, .5, -3.8, .2, -6.5, deck); box(g, 6, .1, .5, 3.8, .2, -6.5, deck);
  dyn.yachts = [];
  const cols = ['#3a7ab8', '#e0604a', '#2a3a6a', '#3f9a48', '#8a5ad6', '#e8b84a'];
  let c = 0;
  for (const z of [-1.3, -3.7, -5.3, -7.7]) for (const sd of [-1, 1]) { const x = sd * (2.3 + R() * 1.6); dyn.yachts.push(yacht(g, x, z, .8 + R() * .4, cols[c++ % 6], R)); }
  for (let i = 0; i < 10; i++) dyn.yachts.push(yacht(g, (R() - .5) * 50, -14 - R() * 20, 1 + R() * .6, cols[i % 6], R));
  // the little boat (the "tekne"), alone by the pier's start
  dyn.boat = yacht(g, 1.9, 1.6, .55, '#e0604a', () => .9); dyn.yachts.push(dyn.boat);
  // the MARINA arch at the pier's head
  for (const x of [-.85, .85]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.6, 10), flat('#e9eef8')); p.position.set(x, 1.6, 2.6); g.add(p); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .48), new THREE.MeshBasicMaterial({ map: signTex(), transparent: true, depthWrite: false, color: HDR(1.8, 1.4, 1.7) }));
  sign.position.set(0, 2.75, 2.6); sign.userData.noShadow = true; g.add(sign); dyn.sign = sign;
  box(g, 1.9, .5, .04, 0, 2.75, 2.58, flat('#2a2440'));
  // shore palms (silhouettes on the horizon) and a far skyline
  for (let i = 0; i < 26; i++) {
    const x = -60 + i * 4.6 + R() * 2, z = -40 - R() * 6, h = 3 + R() * 3;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.08, .14, h, 6), flat('#2a1a4a')); tr.position.set(x, h / 2, z); tr.rotation.z = (R() - .5) * .3; g.add(tr);
    for (let k = 0; k < 6; k++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(.12, 1.8, 4), flat('#2a1a4a')); lf.position.set(x, h, z); lf.rotation.set(0, k, 1.5 + (R() - .5) * .4); g.add(lf); }
  }
  for (let i = 0; i < 30; i++) { const w = 3 + R() * 5, h = 1.5 + R() * 4; box(g, w, h, 3, -70 + i * 5 + R() * 3, h / 2, -90 - R() * 6, flat('#3a2a5a')); }
  const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 48, 32), new THREE.MeshBasicMaterial({ map: sunsetTex(), side: THREE.BackSide })); sky.userData.noShadow = true; g.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 48), glowM(3.2, 1.9, .8)); sun.position.set(0, 16, -200); sun.userData.noShadow = true; g.add(sun);
  // the giant key (appears when he says what they bought)
  dyn.key = goldKey(); dyn.key.position.set(200.45, 1.55, -.2); scene.add(dyn.key);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#9a7ad6', '#3a2a5a', 1.3));
  const sunL = new THREE.DirectionalLight('#ffb070', 3.2); sunL.position.set(200, 8, -40); sunL.target.position.set(200, 0, 0); sunL.castShadow = true;
  sunL.shadow.mapSize.set(2048, 2048); Object.assign(sunL.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 }); sunL.shadow.bias = -.0006; sunL.shadow.normalBias = .03;
  L.add(sunL); L.add(sunL.target);
  const fill = new THREE.PointLight('#ff7ac8', 2.2, 6, 1.4); fill.position.set(200, 2.8, 2.4); L.add(fill);
  scene.add(L); sets.marina = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- CAST (generic characters, no resemblance to anyone real)
export const LOOK = {
  komedyen: { cloth: '#c8433a', clothDark: '#8a2a2a', buttons: '#2a2440', mustache: '#3a2a20', hair: '#3a2a20', height: 1.74 },
  zengin: { cloth: '#2a3a6a', clothDark: '#1a2448', trim: '#e0b84a', hair: '#c8c0cc', height: 1.7, headW: 262 },
  ahbap: { cloth: '#e8e0cc', clothDark: '#b8ac90', trim: '#3a7ab8', hair: '#3a2a20', mustache: true, height: 1.72, headW: 256 },
  a1: { cloth: '#3a7ab8', hair: '#4a3020', height: 1.66, hat: 'knit', hatColor: '#e0604a' },
  a2: { cloth: '#8a5ad6', hair: '#2e2026', height: 1.62, headW: 250 },
};
const ROW = { a1: [-1.5, 2.0], zengin: [0, 2.1], a2: [1.5, 2.0] };

function cameraPath() {
  const t = n => W('s' + n), e = n => E('s' + n);
  const keys = [
    { t: 0, pos: [.2, 1.6, 3.4], look: [0, 1.65, -.7], fov: 48, creep: .26, drift: .03 },
    // "a familiar face": the comedian squints, then the whip to the front row
    { t: t(2) - .1, dur: .4, pos: [.1, 1.6, 1.7], look: [0, 1.75, -.7], fov: 42, creep: .28 },
    { t: t(3) - .15, dur: .3, move: 'whip', pos: [.25, 1.5, 4.7], look: [0, 1.25, 2.1], fov: 42, creep: .3 },
    // "one of our country's top businessmen": gold light, the camera rises a little
    { t: t(4) + .2, dur: 2.6, pos: [-.15, 1.35, 4.3], look: [0, 1.3, 2.1], fov: 40, creep: .2 },
    // the chat: comedian, rich man, comedian
    { t: t(5) - .15, dur: .3, move: 'whip', pos: [-.35, 1.65, 1.9], look: [0, 1.72, -.7], fov: 42, creep: .26 },
    { t: t(8) - .15, dur: .3, move: 'whip', pos: [.3, 1.45, 4.6], look: [0, 1.25, 2.1], fov: 42, creep: .3 },
    { t: t(9) - .15, dur: .3, move: 'whip', pos: [.3, 1.65, 1.8], look: [0, 1.72, -.7], fov: 42, creep: .26 },
    { t: t(11) - .1, dur: .5, pos: [-.4, 1.7, 2.7], look: [0, 1.6, -.7], fov: 46, creep: .26 },
    // "he sits right in front": a wide shot over the room
    { t: t(13) + 1.2, dur: 1.0, pos: [1.2, 2.2, 5.8], look: [0, 1.1, .6], fov: 50, creep: .22 },
    { t: t(14) - .15, dur: .3, move: 'whip', pos: [.2, 1.45, 4.5], look: [0, 1.28, 2.1], fov: 40, creep: .32 },
    // "he bought a marina": the pier at sunset
    { t: t(15) - .15, dur: .35, move: 'whip', pos: [200.6, 1.6, 5.4], look: [200, 1.6, -2], fov: 52, creep: .22 },
    // "a boat I can understand": the little boat
    { t: t(16) - .1, dur: .5, pos: [201.2, .9, 3.4], look: [201.9, .6, 1.6], fov: 42, creep: .28 },
    { t: t(16) + .9, dur: 1.0, pos: [201, 4.5, 9], look: [200, .5, -6], fov: 56, creep: .2 },
    // back to the stage: the comedian loses it
    { t: t(17) - .15, dur: .3, move: 'whip', pos: [.1, 1.6, 1.6], look: [0, 1.72, -.7], fov: 42, creep: .3 },
    { t: t(18) - .1, dur: .6, pos: [-.3, 1.6, 2.6], look: [0, 1.55, -.7], fov: 48, creep: .26 },
    // "is there a marina?": two rich friends on the pier
    { t: t(18) + 2.6, dur: .35, move: 'whip', pos: [200.15, 1.5, 2.6], look: [200, 1.45, -.2], fov: 46, creep: .26 },
    { t: t(21) - .1, dur: .4, pos: [200.35, 1.45, 2.1], look: [200.15, 1.5, -.2], fov: 42, creep: .3 },
    { t: e(21) - .4, dur: 1.2, pos: [200.4, 3.5, 7], look: [200, 1.4, -6], fov: 54, creep: .1 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t(15) + .1, .8); cp.kick(t(17) + .1, .7);
  return cp;
}

export async function setup(ctx) {
  const ids = {}; for (const w of ctx.words) ids[w.word] = w;
  W = k => ids[k].start; E = k => ids[k].end;
  DUR = Math.ceil(56.6 * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#1a1f3a');
  buildStage(scene); buildMarina(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  dyn.cam = cameraPath();
}

const vis = (set, on) => { sets[set].g.visible = on; sets[set].L.visible = on; };
const GRADE = { stage: [1, .98, 1.03], marina: [1.03, .97, .99] };
const FACE = { stage: [1, .98, .95], marina: [1, .97, .93] };
export function frame(t, ctx) {
  const { cam, env } = ctx;
  const cp = dyn.cam.apply(cam, t);
  const where = cam.position.x < 100 ? 'stage' : 'marina';
  vis('stage', where === 'stage'); vis('marina', where === 'marina');
  dyn.spotBeam.visible = where === 'stage'; dyn.key.visible = false;
  for (const c of Object.values(cast)) c.hide();
  const tint = FACE[where].map((v, i) => v / GRADE[where][i]);
  const bl = (seed, ...swaps) => blinkAt(t, seed, swaps, FPS);
  const m = flap(env, t);
  const T = n => W('s' + n);
  const gold = ramp(t, T(4), T(4) + .8) * (1 - ramp(t, T(5) - .3, T(5)));
  dyn.rich.intensity = 10 * gold;
  if (dyn.richBeam.material.uniforms?.uStrength) dyn.richBeam.material.uniforms.uStrength.value = .12 * gold;
  dyn.richBeam.visible = where === 'stage' && gold > .01;
  if (where === 'stage') {
    const richTalks = inSeg(t, 8) || inSeg(t, 14);
    const comic = !richTalks && [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 15, 16, 17, 18].some(n => inSeg(t, n));
    cast.komedyen.show(); cast.komedyen.place(0, .5, -.7, cam, tint);
    let e;
    if (t < T(2)) e = { expr: 'smile', look: .3, armL: [110, 20] };
    else if (t < T(4)) e = { expr: 'focused', look: .5, lookY: .3, armL: [150, 80] };                       // squinting at the crowd, hand over the eyes
    else if (t < T(5)) e = { expr: 'proud', look: .4, armL: [60, -40] };
    else if (t < T(9)) e = { expr: 'smile', look: .5, armL: [100, 40] };
    else if (t < T(11)) e = { expr: 'laugh', look: .4, armL: [120, 40 + Math.sin(t * 10) * 25], laughMarks: .6 };   // "come on, quit joking"
    else if (t < T(14)) e = { expr: 'smug', look: .3, brow: .6, armL: [80, 30] };
    else if (t < T(17)) e = { expr: 'surprised', look: .4, brow: .9, armL: [150, 60] };
    else if (t < T(18)) e = { expr: 'angry', look: 0, armL: [140, 40 + Math.sin(t * 8) * 20] };             // "can you even buy a marina?!"
    else e = { expr: 'worried', look: -.1, brow: .5, armL: [100, 40 + Math.sin(t * 6) * 15] };
    cast.komedyen.draw({ armR: [70, 90], propR: 'mic', ...e, mouth: comic ? m : 0, blink: bl(1, T(2), T(5), T(9), T(14), T(17)), lit: 1, shade: '#d8cfee', rim: { color: '#ff7ac8', a: .45 } });
    cast.komedyen.castFrom(V(.4, 5.5, 2.5));
    const laugh = (t >= T(9) && t < E('s11') + .3) || inSeg(t, 17);
    for (const k of ['a1', 'zengin', 'a2']) {
      const [x, z] = ROW[k];
      if (cam.position.z < 3.2) { cast[k].hide(); continue; }
      cast[k].show(); cast[k].place(x, 0, z, cam, tint);
      if (k === 'zengin') {
        const ex = inSeg(t, 14) ? 'smug' : inSeg(t, 8) ? 'smile' : gold > .3 ? 'proud' : laugh ? 'grin' : 'smile';
        cast.zengin.draw({ expr: ex, mouth: richTalks ? m : 0, look: -.3, armL: richTalks ? [70, 140] : [18, 10], armR: gold > .3 ? [40, 120] : [18, 10], propR: inSeg(t, 14) ? 'phone' : undefined,
          blink: bl(7, T(4), T(8), T(14)), lit: 1 + gold * .3, shade: '#d8cfee', rim: { color: gold > .1 ? '#ffd070' : '#7ad0e0', a: .35 + gold * .4 } });
        cast.zengin.castFrom(V(0, 2.4, 3.6));
      } else {
        const i = k === 'a1' ? 0 : 1;
        cast[k].draw({ expr: laugh ? 'laugh' : t > T(15) ? 'surprised' : 'neutral', mouth: laugh ? .5 + .5 * Math.abs(Math.sin(t * 12 + i)) : 0, laughMarks: laugh ? .8 : 0,
          look: i ? -.6 : .6, bob: laugh ? Math.abs(Math.sin(t * 12 + i)) * -10 : 0, blink: bl(12 + i), lit: 1, shade: '#d8cfee', rim: { color: '#8aa0ff', a: .35 } });
        cast[k].castFrom(V(0, 2.4, 3.6));
      }
    }
  } else {
    // marina: water glints shimmer, boats bob
    dyn.glints.children.forEach(gl => { gl.material.opacity = 1; gl.scale.x = .6 + .4 * Math.abs(Math.sin(t * 2.2 + gl.userData.ph)); });
    for (const y of dyn.yachts) { y.position.y = Math.sin(t * 1.6 + y.userData.ph) * .04; y.rotation.z = Math.sin(t * 1.3 + y.userData.ph) * .03; }
    const pair = t >= T(18) + 2.4;
    const keyOn = ramp(t, T(15), T(15) + .6) * (pair ? 1 : 1 - ramp(t, T(16) - .2, T(16)));
    cast.zengin.show(); cast.zengin.place(200, .36, -.2, cam, tint);
    const answers = inSeg(t, 21), win = t >= T(21) + .4;
    cast.zengin.draw({ expr: answers ? (win ? 'grin' : 'smug') : pair ? 'smile' : 'proud', look: pair ? .5 : .2, mouth: answers ? m : 0,
      armR: keyOn > .3 ? [110, 60] : [18, 10], armL: answers ? [70, 140] : [18, 10], bob: win ? Math.abs(Math.sin(t * 8)) * -6 : 0,
      blink: bl(3, T(15), T(21)), lit: 1, shade: '#e8c8d8', rim: { color: '#ffb070', a: .55 } });
    cast.zengin.castFrom(V(200, 6, -40));
    if (pair) {
      cast.ahbap.show(); cast.ahbap.place(199.3, .36, -.4, cam, tint);
      const asks = t < T(21) - .05 && t >= T(18) + 2.4 && (inSeg(t, 18) || inSeg(t, 19) || inSeg(t, 20));
      cast.ahbap.draw({ expr: asks ? 'focused' : 'surprised', look: -.5, mouth: asks ? m : 0, armR: asks ? [80, 120] : [18, 10],
        brow: answers ? .9 : .3, blink: bl(4, T(19), T(21)), lit: 1, shade: '#e8c8d8', rim: { color: '#ffb070', a: .55 } });
      cast.ahbap.castFrom(V(200, 6, -40));
    }
    if (keyOn > .01) {
      dyn.key.visible = true; dyn.key.scale.setScalar(.75 * keyOn * (1 + (win ? .25 : 0)));
      dyn.key.position.set(200.8, 1.6 + Math.sin(t * 2) * .04, -.15); dyn.key.rotation.y = t * 1.2;
    }
  }
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (where === 'stage') look = { ...focusOn(cam.position.z > 3 ? V(cam.position.x * .2, 1.2, 2.1) : V(0, 1.7, -.7), 6, 1.8), sat: 1.25, lift: [.1, .095, .17], bloom: .8 + gold * .3, vignette: .24 };
  else { const far = cam.position.distanceTo(V(200, 1.4, -.2)); look = { ...focusOn(far > 6 ? V(200, 1.4, -2) : V(200, 1.4, -.2), far > 6 ? 2 : 6, 2), sat: 1.25, lift: [.12, .08, .15], bloom: 1.0, vignette: .2 }; }
  look.tint = GRADE[where];
  look.blur = cp.moving > .15 ? 16 : 0;
  look.captions = false;
  return look;
}
