// Emu — 1932, Western Australia: three soldiers, two Lewis guns, twenty thousand emus. The gun jams, the truck is too
// slow, the major says they are "like tanks", the army withdraws, the emus go back to the wheat.
// Sets: FIELD (x≈0, low afternoon sun), CAMP (x≈300, night, lantern).
import * as THREE from 'three';
import { stoneTex, woodTex, painted, flat, rng, D } from '../../engine/src/paint.js';
import { Toon, flap, blinkAt } from '../../engine/src/toon.js';
import { CamPath, smoother } from '../../engine/src/camera.js';
import { Smoke, beam } from '../../engine/src/fx.js';

export const NAME = 'emu';
export const FPS = 30;
export let DUR = 30;
export const CUES = [];

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
let W, cast = {}, sets = {}, smokes = {}, dyn = {};

function wordTimes(words) {
  const norm = s => s.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]/gu, '');
  return (w, n = 1) => { let k = 0; for (const x of words) if (norm(x.word) === norm(w) && ++k === n) return x.start; throw new Error('word not found: ' + w); };
}
function shadows(g) {
  g.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (o.material.isMeshLambertMaterial) o.receiveShadow = true;
    if (/Box|Cylinder|Sphere|Cone/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
const box = (g, sx, sy, sz, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); return b; };
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------------------------------------------------------------- EMU (a 3D bird with big cartoon eyes)
const EMU_M = { body: flat('#6a5444'), dark: flat('#4a3a32'), neck: flat('#6f86c8'), leg: flat('#9a8670'), beak: flat('#3a2e2a'), eye: flat('#ffffff'), pupil: flat('#1a1428') };
function makeEmu(scale = 1) {
  const e = new THREE.Group(), root = new THREE.Group(); e.add(root); e.scale.setScalar(scale);
  const body = new THREE.Mesh(new THREE.SphereGeometry(.36, 18, 14), EMU_M.body); body.scale.set(1.25, .85, .9); body.position.y = 1.0; root.add(body);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), EMU_M.dark); tail.position.set(-.38, 1.0, 0); tail.scale.set(1, .9, .9); root.add(tail);
  const legs = [];
  for (const z of [-.12, .12]) {
    const hip = new THREE.Group(); hip.position.set(.02, .82, z); root.add(hip);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, .82, 8), EMU_M.leg); leg.position.y = -.41; hip.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.18, .03, .07), EMU_M.leg); foot.position.set(.06, -.82, 0); hip.add(foot);
    legs.push(hip);
  }
  const neckP = new THREE.Group(); neckP.position.set(.34, 1.1, 0); root.add(neckP);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.055, .085, .62, 10), EMU_M.neck); neck.position.y = .31; neckP.add(neck);
  const head = new THREE.Group(); head.position.y = .64; neckP.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 12), EMU_M.neck); skull.scale.set(1.15, 1, .95); head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.04, .14, 8), EMU_M.beak); beak.rotation.z = -Math.PI / 2; beak.position.set(.15, -.02, 0); head.add(beak);
  const eyes = [];
  for (const z of [-.065, .065]) {
    const ey = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), EMU_M.eye); ey.position.set(.05, .035, z); head.add(ey);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), EMU_M.pupil); pu.position.set(.09, .035, z * 1.2); head.add(pu);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(.053, 12, 8, 0, Math.PI * 2, 0, Math.PI * .5), EMU_M.neck); lid.position.copy(ey.position); lid.scale.y = .2; head.add(lid);
    eyes.push({ pu, lid });
  }
  e.userData = { root, legs, neckP, head, eyes };
  e.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return e;
}
// mode: stand | peck | run | stare | smug ; dir: facing angle (0 = +x)
function poseEmu(e, t, { mode = 'stand', ph = 0, dir = 0, look = null }) {
  const u = e.userData, s = t * 1.0 + ph;
  e.rotation.y = -dir;
  u.root.position.y = 0; u.root.rotation.z = 0;
  let neck = -.15, headTilt = 0;
  if (mode === 'peck') { const p = Math.max(0, Math.sin(s * 3.2)) ** 3; neck = lerp(-.25, -1.9, p); headTilt = p * .6; }
  if (mode === 'run') {
    const r = s * 13; u.legs[0].rotation.z = Math.sin(r) * .9; u.legs[1].rotation.z = -Math.sin(r) * .9;
    u.root.position.y = Math.abs(Math.cos(r)) * .08 - .04; u.root.rotation.z = -.12; neck = -.55 + Math.sin(r * 2) * .05;
  } else { u.legs[0].rotation.z = u.legs[1].rotation.z = 0; }
  if (mode === 'stare') { neck = .05; headTilt = Math.sin(s * .8) * .05; }
  if (mode === 'smug') { neck = .12; headTilt = -.15; }
  if (mode === 'stand') { neck = -.12 + Math.sin(s * 1.7) * .05; headTilt = Math.sin(s * 2.3) * .2; }
  u.neckP.rotation.z = neck; u.head.rotation.z = -neck * .6 + headTilt;
  const lidK = mode === 'smug' ? 1 : (Math.sin(s * 1.3) > .985 ? 1 : 0);
  for (const ey of u.eyes) { ey.lid.scale.y = lidK ? 1 : .2; ey.lid.rotation.x = 0; }
  if (look) {                                               // turn the head to face a point (the camera)
    const hp = new THREE.Vector3(); u.head.getWorldPosition(hp);
    const a = Math.atan2(-(look.z - hp.z), look.x - hp.x) - (-dir);
    u.head.rotation.y = Math.max(-1.3, Math.min(1.3, -a));
  } else u.head.rotation.y = 0;
}

// ---------------------------------------------------------------- FIELD (x = 0)
function skyTex(night) {
  return canvasTex(4096, 1024, (g, w, h) => {
    const hz = h * .62, gr = g.createLinearGradient(0, 0, 0, hz);
    if (night) { gr.addColorStop(0, D('#141846')); gr.addColorStop(1, D('#3a3a86')); } else { gr.addColorStop(0, D('#3f6ee0')); gr.addColorStop(.75, D('#9fc4ff')); gr.addColorStop(1, D('#ffd8a0')); }
    g.fillStyle = gr; g.fillRect(0, 0, w, hz + 2);
    const R = rng(night ? 9 : 4);
    if (night) { for (let i = 0; i < 600; i++) { g.fillStyle = D('#fff6dc', .4 + R() * .6); g.beginPath(); g.arc(R() * w, R() * hz * .9, R() < .9 ? 1.4 : 2.6, 0, 6.29); g.fill(); } }
    else { g.fillStyle = D('#ffffff', .92); for (let i = 0; i < 16; i++) { const x = R() * w, y = hz * (.2 + R() * .45); for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + k * 46, y + Math.sin(k * 2) * 12, 70 + R() * 30, 30, 0, 0, 6.29); g.fill(); } } }
    for (const [col, amp, base] of night ? [['#2a2858', 50, .9], ['#20204a', 30, .96]] : [['#8fa8a0', 60, .88], ['#c8a860', 34, .96]]) {   // two rows of low hills
      g.fillStyle = D(col); g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, hz * base - Math.abs(Math.sin(x / 300 + amp)) * amp - Math.sin(x / 90) * 8);
      g.lineTo(w, h); g.closePath(); g.fill();
    }
    g.fillStyle = D(night ? '#1c1a3a' : '#c9a865'); g.fillRect(0, hz, w, h - hz);
    if (!night) { g.strokeStyle = D('#5a4a2a', .7); g.lineWidth = 3; for (let x = 0; x < w; x += 90) { g.beginPath(); g.moveTo(x, hz * .95); g.lineTo(x, hz * .95 - 26); g.stroke(); } g.beginPath(); g.moveTo(0, hz * .95 - 18); g.lineTo(w, hz * .95 - 18); g.stroke(); }
  });
}
function buildField(scene) {
  const g = new THREE.Group(); scene.add(g);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), painted(stoneTex({ base: '#c9a865', seam: '#a8864a', bw: 256, bh: 256, rep: [24, 24] }))); gr.rotation.x = -Math.PI / 2; g.add(gr);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(90, 3.2), painted(stoneTex({ base: '#b88a5a', seam: '#8a6a3a', bw: 128, bh: 128, rep: [30, 1] }))); road.rotation.x = -Math.PI / 2; road.position.set(0, .004, 4.2); g.add(road);
  // wheat: thousands of thin golden stalks with heads, a clear strip for the road
  const N = 7000, R = rng(21);
  const stalk = new THREE.InstancedMesh(new THREE.ConeGeometry(.03, 1.0, 4), new THREE.MeshLambertMaterial({ color: '#ffffff' }), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    let x, z; do { x = (R() - .5) * 34; z = -22 + R() * 24.2; } while (z > -2 && z < 2.3 && Math.abs(x) < 1.2 && false);
    const hgt = .75 + R() * .35;
    q.setFromEuler(new THREE.Euler((R() - .5) * .25, R() * 6, (R() - .5) * .25));
    m.compose(V(x, hgt * .5, z), q, V(1, hgt, 1)); stalk.setMatrixAt(i, m);
    stalk.setColorAt(i, c.set(D(['#e8b84a', '#f0c860', '#d8a03a', '#f4d27a'][i % 4])));
  }
  stalk.receiveShadow = true; g.add(stalk);
  // fence posts along the road edge
  for (let x = -20; x <= 20; x += 2.2) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 1.0, 6), painted(woodTex({ base: '#7a5a3a' }))); p.position.set(x, .5, 2.55); g.add(p); }
  box(g, 40, .05, .05, 0, .85, 2.55, flat('#6a4a30')); box(g, 40, .05, .05, 0, .5, 2.55, flat('#6a4a30'));
  // a farmhouse far left, a windmill: shapes with a lit face, against the sky
  const house = new THREE.Group(); house.position.set(-9, 0, -14); g.add(house);
  box(house, 3, 2, 2.4, 0, 1, 0, flat('#e9dcc0')); const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.2, 4), flat('#c8433a')); roof.position.y = 2.6; roof.rotation.y = Math.PI / 4; house.add(roof);
  box(house, .5, .8, .05, .5, .4, 1.22, flat('#5a3a2a'));
  const mill = new THREE.Group(); mill.position.set(7, 0, -16); g.add(mill);
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(.08, .25, 6, 6), flat('#d8d4e0')); tw.position.y = 3; mill.add(tw);
  const rotor = new THREE.Group(); rotor.position.set(0, 6, .25); mill.add(rotor); dyn.rotor = rotor;
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, 1.4, .02), flat('#e9eef8')); b.position.y = .7; const p = new THREE.Group(); p.rotation.z = k / 6 * Math.PI * 2; p.add(b); rotor.add(p); }
  // the truck: olive cab, flat bed, the Lewis gun on the bed
  const truck = new THREE.Group(); g.add(truck); dyn.truck = truck;
  const olive = flat('#6f7a3a'), blk = flat('#2a2638');
  box(truck, 3.4, .18, 1.6, 0, .62, 0, blk);
  box(truck, 1.2, 1.1, 1.5, 1.2, 1.2, 0, olive); box(truck, .9, .5, 1.52, 1.95, .95, 0, olive);
  box(truck, .05, .45, 1.2, 1.81, 1.45, 0, flat('#9fc8e8', { emissive: '#203040' }));
  box(truck, 2.1, .1, 1.6, -.55, .76, 0, painted(woodTex({ base: '#8a6a3a' })));
  for (const z of [-.8, .8]) box(truck, 2.1, .35, .05, -.55, .96, z, painted(woodTex({ base: '#8a6a3a' })));
  for (const [x, z] of [[1.4, -.78], [1.4, .78], [-1.1, -.78], [-1.1, .78]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .22, 18), blk); wh.rotation.x = Math.PI / 2; wh.position.set(x, .36, z); truck.add(wh); }
  const gun = makeGun(); gun.position.set(-.5, .82, 0); truck.add(gun); dyn.truckGun = gun;
  // the ambush gun on a tripod in the wheat
  const tg = makeGun(); tg.position.set(1.0, .55, -.2); tg.rotation.y = Math.PI / 2 + .2; g.add(tg); dyn.ambushGun = tg;
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, l = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .7, 6), blk); l.position.set(1.0 + Math.cos(a) * .2, .28, -.2 + Math.sin(a) * .2); l.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35); g.add(l); }
  // the flag on a pole by the soldiers
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 3.2, 8), flat('#d8d4e0')); pole.position.set(5.2, 1.6, 1.5); g.add(pole);
  const flagT = canvasTex(256, 128, (c, w, h) => { c.fillStyle = D('#24307a'); c.fillRect(0, 0, w, h); c.fillStyle = D('#ffffff'); for (const [x, y, r] of [[180, 40, 10], [210, 70, 8], [160, 90, 9], [200, 100, 6], [60, 96, 16]]) { c.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, rr = k % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); } c.fillStyle = D('#c8323a'); c.fillRect(0, 26, 110, 12); c.fillRect(49, 0, 12, 64); c.strokeStyle = D('#ffffff'); c.lineWidth = 4; c.strokeRect(0, 0, 110, 64); });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .55, 10, 1), new THREE.MeshLambertMaterial({ map: flagT, side: THREE.DoubleSide })); flag.position.set(5.76, 2.9, 1.5); g.add(flag); dyn.flag = flag;
  // sky
  const sky = new THREE.Mesh(new THREE.CylinderGeometry(44, 44, 60, 64, 1, true), new THREE.MeshBasicMaterial({ map: skyTex(false), side: THREE.BackSide })); sky.position.y = 8.7; g.add(sky); sky.userData.noShadow = true;
  const sun = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: HDR(2.8, 2.4, 1.6) })); sun.position.set(30, 8, 30); sun.lookAt(0, 1, 0); g.add(sun);
  // light: a low warm sun from the back left (long shadows toward the camera), a cool sky fill
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a8b8ff', '#8a6a4a', 1.5));
  const sl = new THREE.DirectionalLight('#ffc070', 3.6); sl.position.set(13, 10, 12); sl.target.position.set(0, 0, 0); sl.castShadow = true; sl.shadow.mapSize.set(4096, 4096);
  Object.assign(sl.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 }); sl.shadow.bias = -.0005; sl.shadow.normalBias = .03; sl.shadow.radius = 3;
  L.add(sl); L.add(sl.target);
  scene.add(L); sets.field = { g, L };
  shadows(g); sky.castShadow = false; flag.castShadow = false;
  // emus: a flock in the wheat, each with a home spot and a scatter direction
  const RE = rng(5); dyn.flock = [];
  for (let i = 0; i < 34; i++) {
    const e = makeEmu(.92 + RE() * .16); g.add(e);
    const home = V((RE() - .5) * 18, 0, -3 - RE() * 13);
    dyn.flock.push({ e, home, ph: RE() * 10, dir: RE() * 6.28, run: RE() * 6.28 });
  }
  dyn.hero = makeEmu(1.0); g.add(dyn.hero);
  dyn.line = [0, 1, 2, 3, 4, 5, 6].map(i => { const e = makeEmu(.95 + (i % 3) * .05); g.add(e); return e; });
}
function makeGun() {
  const gg = new THREE.Group(), blk = flat('#2a2638');
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .9, 12), blk); barrel.rotation.z = Math.PI / 2; barrel.position.set(.35, .2, 0); gg.add(barrel);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .06, 20), flat('#4a4458')); drum.position.set(.05, .33, 0); gg.add(drum);
  box(gg, .5, .12, .1, -.15, .17, 0, painted(woodTex({ base: '#7a4a2e' })));
  return gg;
}

// ---------------------------------------------------------------- CAMP (x = 300): the major's confession at night
function buildCamp(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), painted(stoneTex({ base: '#7a6a5a', seam: '#5a4a3a', bw: 256, bh: 256, rep: [10, 10] }))); gr.rotation.x = -Math.PI / 2; g.add(gr);
  const tent = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.6, 4), flat('#b8a46a')); tent.position.set(-.6, 1.3, -2.4); tent.rotation.y = Math.PI / 4; g.add(tent);
  box(g, .7, 1.3, .05, -.6, .65, -1.04, flat('#3a2a3a'));
  const crate = box(g, .6, .5, .5, .9, .25, -.9, painted(woodTex({ base: '#a8784a', plank: 32 })));
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .18, 16), new THREE.MeshBasicMaterial({ color: HDR(3.0, 2.0, .85) })); glass.position.set(.9, .62, -.9); glass.userData.noShadow = true; g.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.09, .08, 16), flat('#d9a441')); cap.position.set(.9, .75, -.9); cap.userData.noShadow = true; g.add(cap);
  const map = canvasTex(512, 384, (c, w, h) => { c.fillStyle = D('#efe0bc'); c.fillRect(0, 0, w, h); c.strokeStyle = D('#c8433a'); c.lineWidth = 6; for (let i = 0; i < 12; i++) { const x = 60 + (i * 97) % 380, y = 60 + (i * 53) % 260; c.beginPath(); c.moveTo(x - 14, y - 14); c.lineTo(x + 14, y + 14); c.moveTo(x + 14, y - 14); c.lineTo(x - 14, y + 14); c.stroke(); } c.font = '900 64px Inter, sans-serif'; c.fillStyle = D('#2a2a5a'); c.fillText('?', 230, 220); });
  const mp = new THREE.Mesh(new THREE.PlaneGeometry(.6, .45), new THREE.MeshLambertMaterial({ map })); mp.rotation.x = -Math.PI / 2; mp.position.set(.85, .505, -.88); g.add(mp);
  const sky = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 50, 48, 1, true), new THREE.MeshBasicMaterial({ map: skyTex(true), side: THREE.BackSide })); sky.position.y = 6; g.add(sky); sky.userData.noShadow = true;
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ color: HDR(1.9, 1.85, 1.6) })); moon.position.set(8, 10, -24); moon.lookAt(0, 1, 0); g.add(moon);
  // an emu at the edge of the light, watching
  const spy = makeEmu(1.0); spy.position.set(-2.4, 0, -1.6); g.add(spy); dyn.spy = spy;
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#7a80e6', '#3c3266', 1.3));
  const pl = new THREE.PointLight('#ffc070', 7, 9, 1.25); pl.position.set(300.9, .7, -.9); pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); pl.shadow.camera.near = .1; pl.shadow.camera.far = 14; pl.shadow.bias = -.003; pl.shadow.normalBias = .04; pl.shadow.radius = 4; L.add(pl);
  const ml = new THREE.SpotLight('#a3b0ff', 1.6, 0, .5, .4, 0); ml.position.set(308, 12, -20); ml.target.position.set(300, 0, 0); L.add(ml); L.add(ml.target);
  scene.add(L); sets.camp = { g, L };
  shadows(g); sky.castShadow = false;
}

// ---------------------------------------------------------------- CAST
export const LOOK = {
  komutan: { hat: 'slouch', hatColor: '#8a7a4a', cloth: '#a89a5a', clothDark: '#6a5a3a', buttons: '#e8b84a', sash: '#5a3a2a', mustache: '#3a2a20', height: 1.76 },
  asker1: { hat: 'slouch', hatColor: '#9a8a5a', cloth: '#b8a46a', clothDark: '#7a6a3a', buttons: '#5a4a2a', height: 1.66, headW: 262, headH: 246 },
  asker2: { hat: 'slouch', hatColor: '#8a7a4a', cloth: '#b0a060', clothDark: '#706038', buttons: '#5a4a2a', beard: '#5a3a28', beardLen: .35, height: 1.7 },
  ciftci: { hat: 'slouch', hatColor: '#e8cf8a', hatBand: '#c8433a', cloth: '#c85a3a', clothDark: '#8a3a2a', mustache: true, hair: '#6a4a30', height: 1.7 },
};

// truck path: drives from x=+9 to x=-7 between "Tüfeği" and "Komutan"; the flock runs ahead of it, faster
const truckX = t => t < W('Tüfeği') ? 9 : lerp(9, -7, ramp(t, W('Tüfeği'), W('Komutan') + .2));
const leaveX = t => lerp(0, 16, ramp(t, W('Ve', 2) + .2, W('Yani') + .2));

function cameraPath() {
  const t = W;
  const keys = [
    // hook: three proud soldiers by the flag -> sad -> into the wheat -> an emu stares at us
    { t: 0, pos: [3.3, 1.65, 7.2], look: [3.6, 1.55, 1.6], fov: 48, creep: .26, drift: .04 },
    { t: t('kaybetti.') + .05, dur: .45, pos: [3.4, 1.55, 4.6], look: [3.6, 1.5, 1.6], fov: 42, creep: .3 },
    { t: t('Düşman') + .15, dur: .32, move: 'whip', pos: [0, 1.05, 2.2], look: [0, 1.15, -3], fov: 44, creep: .3 },
    { t: t('Kuşlar.') - .05, dur: .22, pos: [0, 1.6, 1.25], look: [0, 1.62, -.5], fov: 38, creep: .3 },
    // "Bakın": the flock eating, the farmer furious in front
    { t: t('Bakın') + .2, dur: .32, move: 'whip', pos: [-3.4, 2.3, 7.4], look: [-.6, 1.0, -4], fov: 54, creep: .22 },
    // the army: two guns and exactly three soldiers
    { t: t('Ordu') + .2, dur: .32, move: 'whip', pos: [3.7, 1.6, 7.0], look: [3.6, 1.45, 1.6], fov: 48, creep: .24 },
    { t: t('tam') + .05, dur: .5, pos: [3.6, 1.6, 5.8], look: [3.6, 1.45, 1.6], fov: 46, creep: .28 },
    { t: t('Uçamayan') + .1, dur: .6, pos: [4.05, 1.58, 3.6], look: [4.3, 1.5, 1.6], fov: 42, creep: .3 },
    // the ambush: behind the gun, the flock ahead; the jam; the scatter
    { t: t('İlk') + .2, dur: .32, move: 'whip', pos: [2.5, 1.5, 2.4], look: [.2, 1.0, -3], fov: 50, creep: .26 },
    { t: t('emular') + .1, dur: .8, pos: [2.6, 2.4, 3.6], look: [0, .9, -6], fov: 56, creep: .22 },
    // the truck chase along the road (the camera tracks with it)
    { t: t('Tüfeği') + .2, dur: .32, move: 'whip', pos: [3, 2.0, 12.5], look: [0, 1.0, 4], fov: 58, creep: .18 },
    // the camp at night: the confession
    { t: t('Komutan') + .2, dur: .32, move: 'whip', pos: [300.75, 1.6, 2.2], look: [300.4, 1.45, -.4], fov: 46, creep: .26 },
    { t: t('tank') - .1, dur: .3, pos: [300.55, 1.62, 1.1], look: [300.4, 1.58, -.4], fov: 40, creep: .3 },
    // the army drives away; the emus watch
    { t: t('Ve', 2) + .2, dur: .32, move: 'whip', pos: [-3.5, 1.4, 1.6], look: [4, 1.25, 4.2], fov: 50, creep: .24 },
    // the winners, lined up
    { t: t('Yani') + .2, dur: .32, move: 'whip', pos: [0, 1.05, 4.0], look: [0, 1.3, -1.2], fov: 52, creep: .24 },
    // the hero emu, back to lunch
    { t: t('Kuşlar', 2) + .1, dur: .5, pos: [.5, 1.45, 1.6], look: [.05, 1.3, -.6], fov: 40, creep: .28 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t('Kuşlar.') + .05, .9); cp.kick(t('tutukluk') + .05, .9); cp.kick(t('tank') + .05, .8);
  return cp;
}

export async function setup(ctx) {
  W = wordTimes(ctx.words);
  DUR = Math.ceil((ctx.words[ctx.words.length - 1].end + .8) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#9fc4ff');
  buildField(scene); buildCamp(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  smokes.dust = new Smoke(scene, { color: '#d8bc88', maxPoints: 900, H: ctx.H });
  for (let k = 0; k < 3; k++) smokes.dust.wisps.push({ n: 60, size: .5, alpha: .3, speed: .5, seed: k, on: t => t >= W('Tüfeği') && t < W('Komutan') + .3,
    path: (u, t) => [truckX(t) + 1.7 + u * 3.5, .2 + u * .9, 4.2 + (k - 1) * .5 + Math.sin(u * 5 + k) * .2] });
  smokes.jam = new Smoke(scene, { color: '#e8e4ec', maxPoints: 300, H: ctx.H });
  smokes.jam.wisps.push({ n: 50, size: .25, alpha: .5, speed: .4, on: t => t >= W('tutukluk') && t < W('Tüfeği'),
    path: (u, t) => [1.3 + u * .3, .8 + u * 1.2 + Math.sin(u * 6 + t) * .1, -.2 + Math.cos(u * 5) * .1] });
  dyn.cam = cameraPath();
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(W('Bakın') - .1, 'whoosh'); cue(W('İlk') - .1, 'whoosh'); cue(W('Komutan') - .1, 'whoosh');
  cue(W('Düşman') - .1, 'rise', { dur: .9 }); cue(W('Kuşlar.') + .03, 'boom');
  cue(W('Askerler') + .1, 'laugh', { dur: W('İlk') - .3 - W('Askerler') });
  cue(W('tutukluk') + .03, 'boom'); cue(W('Tüfeği'), 'wind', { dur: W('Komutan') - W('Tüfeği') });
  cue(W('tank') + .03, 'boom'); cue(W('Yani') - .1, 'rise', { dur: .5 }); cue(W('Buğdayı'), 'shimmer');
}

const vis = (set, on) => { sets[set].g.visible = on; sets[set].L.visible = on; };
const WARM = '#ffb45a', DAY = '#e8e3f4', NIGHT = '#d6d1f2';
const GRADE = { field: [1.03, 1.0, .96], camp: [1, .98, 1.03] };
const FACE = { field: [1, .99, .97], camp: [1, .985, .96] };
export function frame(t, ctx) {
  const { cam, env } = ctx;
  const cp = dyn.cam.apply(cam, t);
  const where = cam.position.x < 150 ? 'field' : 'camp';
  vis('field', where === 'field'); vis('camp', where === 'camp');
  const T = W, A = (w, n) => W(w, n) - 2 / FPS;
  dyn.rotor.rotation.z = t * .9;
  { const p = dyn.flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 5 - t * 6) * .06 * (x + .55)); } p.needsUpdate = true; }
  // ---- truck
  const leaving = t >= T('Ve', 2);
  const tx = leaving ? 3.2 + leaveX(t) : t >= T('Tüfeği') ? truckX(t) : 3.6;
  const moving = (t >= T('Tüfeği') && t < T('Komutan') + .3) || (leaving && t < T('Yani') + .3);
  dyn.truck.position.set(tx, moving ? Math.abs(Math.sin(t * 17)) * .05 : 0, t >= T('Tüfeği') ? 4.2 : 3.4);
  dyn.truck.rotation.y = leaving ? 0 : Math.PI;
  dyn.truck.rotation.z = moving ? Math.sin(t * 13) * .02 : 0;
  dyn.truckGun.rotation.z = moving ? Math.sin(t * 21) * .25 : 0;     // the gun bounces all over: no aiming possible
  dyn.truck.visible = t < T('İlk') || t >= T('Tüfeği');
  dyn.ambushGun.visible = t >= T('İlk') - .3 && t < T('Tüfeği');
  dyn.ambushGun.rotation.z = t >= T('tutukluk') ? Math.sin(t * 40) * .05 * (1 - ramp(t, T('tutukluk'), T('tutukluk') + .6)) : 0;
  // ---- flock
  const scatter = ramp(t, T('emular') - .1, T('Tüfeği'));
  const chase = t >= T('Tüfeği') && t < T('Komutan') + .3;
  dyn.flock.forEach((f, i) => {
    const e = f.e; e.visible = !(t < T('Bakın') - .3 && t >= T('Düşman') && i % 3);
    if (chase) {
      const k = i < 10 ? 1 : 0; e.visible = i < 10;
      const x = truckX(t) - 1.6 - (i % 5) * 1.0 - ramp(t, T('Tüfeği'), T('Komutan')) * 3.5, z = 3.3 + (i % 3) * .8;
      e.position.set(x, 0, z); poseEmu(e, t, { mode: 'run', ph: f.ph, dir: Math.PI });
    } else if (scatter > 0 && t < T('Tüfeği')) {
      const d = scatter * 9, a = f.run;
      e.position.set(f.home.x + Math.cos(a) * d, 0, f.home.z + Math.sin(a) * d * .6 - scatter * 3);
      poseEmu(e, t, { mode: 'run', ph: f.ph, dir: a });
    } else {
      e.position.copy(f.home);
      poseEmu(e, t, { mode: leaving ? 'stare' : i % 4 === 0 ? 'stand' : 'peck', ph: f.ph, dir: leaving ? 1.2 : f.dir, look: leaving ? V(cam.position.x, 1, cam.position.z) : null });
    }
  });
  // the hero emu: rises out of the wheat on "Kuşlar." and stares; at the end it pecks
  const hero = dyn.hero; hero.visible = (t >= T('Kuşlar.') - .3 && t < T('Bakın') + .2) || t >= T('Kuşlar', 2) - .3;
  if (hero.visible) {
    const rise = t < T('Bakın') + .2 ? ramp(t, T('Kuşlar.') - .25, T('Kuşlar.') + .05) : 1;
    hero.position.set(t < T('Bakın') ? 0 : .05, -1.0 * (1 - rise), -.55);
    poseEmu(hero, t, { mode: t >= T('ettiler.') ? 'peck' : t >= T('Kuşlar', 2) ? 'smug' : 'stare', ph: 0, dir: Math.PI / 2 + .1, look: t < T('ettiler.') ? cam.position : null });
  }
  dyn.line.forEach((e, i) => { e.visible = t >= T('Yani') - .2 && t < T('Kuşlar', 2) - .2; if (e.visible) { e.position.set((i - 3) * .9, 0, -1.2 - Math.abs(i - 3) * .25); poseEmu(e, t, { mode: 'smug', ph: i, dir: Math.PI / 2, look: cam.position }); } });
  if (where === 'camp') { dyn.spy.position.x = -2.4 + .4 * ramp(t, T('tank') - .3, T('tank') + .3); poseEmu(dyn.spy, t, { mode: 'stare', ph: 2, dir: .3, look: cam.position }); }
  // ---- people
  for (const c of Object.values(cast)) c.hide();
  const tint = FACE[where].map((v, i) => v / GRADE[where][i]);
  const bl = (seed, ...swaps) => blinkAt(t, seed, swaps, FPS);
  const sunDir = V(-13, -10, -12).normalize();
  if (where === 'field') {
    const army = (t < T('Düşman') + .2) || (t >= T('Ordu') && t < T('İlk'));
    if (army) {
      const sad = t > A('kaybetti.') && t < T('Ordu'), laugh = t > A('Askerler') && t < A('İlk'), talk = t > A('Uçamayan') - .05 && t < A('iş."') + .4;
      const xs = [2.7, 3.6, 4.5];
      ['asker1', 'komutan', 'asker2'].forEach((k, i) => {
        cast[k].show(); cast[k].place(xs[i], 0, 1.6 - (i === 1 ? .15 : 0), cam, tint);
        const me = k === 'asker2' && talk;
        cast[k].draw({ expr: sad ? 'worried' : me ? 'smug' : laugh ? 'laugh' : 'proud', mouth: me ? flap(env, t) : laugh ? .5 + .5 * Math.abs(Math.sin(t * 13 + i)) : 0, laughMarks: laugh && !me ? .8 : 0,
          look: i === 1 ? 0 : i === 0 ? .4 : -.4, blink: bl(i + 1, A('kaybetti.'), A('Askerler'), A('Uçamayan')),
          armR: sad ? [18, 10] : laugh ? [150, 20] : [140, 120], armL: [18, 10], tilt: sad ? -5 : 0, lean: sad ? -3 : laugh ? Math.sin(t * 9 + i) * 3 : 0, bob: laugh && !me ? Math.abs(Math.sin(t * 13 + i)) * -10 : 0,
          lit: 1, shade: DAY, rim: { color: WARM, a: .45 } });
        cast[k].castFrom(sunDir, true);
      });
    }
    if (t >= T('Bakın') && t < T('Ordu')) {                 // the farmer, furious, in front of his eaten wheat
      cast.ciftci.show(); cast.ciftci.place(-2.6, 0, 3.2, cam, tint);
      cast.ciftci.draw({ expr: 'angry', look: .6, blink: bl(5, A('buğdayını')), armR: [150, 30 + Math.sin(t * 12) * 20], armL: [60, 120], sweat: .6, lit: 1, shade: DAY, rim: { color: WARM, a: .45 } });
      cast.ciftci.castFrom(sunDir, true);
    }
    if (t >= T('İlk') && t < T('Tüfeği')) {                 // the gunner behind the tripod gun
      const jam = t > A('tutukluk');
      cast.asker1.show(); cast.asker1.place(1.25, 0, .25, cam, tint);
      cast.asker1.draw({ expr: jam ? 'surprised' : 'focused', look: -.6, blink: bl(1, A('tutukluk')), armR: jam ? [150, 40] : [80, 90], armL: jam ? [150, 40] : [70, 100], sweat: jam ? 1 : 0, lit: 1, shade: DAY, rim: { color: WARM, a: .45 } });
      cast.asker1.castFrom(sunDir, true);
    }
    if (t >= T('Tüfeği') && t < T('Komutan') + .3) {        // the gunner on the truck bed, bouncing
      cast.asker2.show(); cast.asker2.place(truckX(t) - .9, .78 + Math.abs(Math.sin(t * 17)) * .08, 4.2, cam, tint);
      cast.asker2.draw({ expr: 'worried', look: -.6, blink: bl(2, A('emular', 2)), armR: [90, 70], armL: [90, 70], tilt: Math.sin(t * 19) * 6, sweat: 1, lit: 1, shade: DAY, rim: { color: WARM, a: .4 } });
      cast.asker2.castFrom(sunDir, true);
    }
    if (leaving && t < T('Yani')) {                          // the soldiers on the departing truck, heads down
      ['asker1', 'komutan'].forEach((k, i) => {
        cast[k].show(); cast[k].place(tx + .3 + i * .7, .78, 4.2 + (i - .5) * .5, cam, tint);
        cast[k].draw({ expr: 'worried', look: -.3, blink: bl(i + 1, A('çekiliyor.')), armR: [18, 10], armL: [18, 10], tilt: -6, lit: 1, shade: DAY, rim: { color: WARM, a: .4 } });
        cast[k].castFrom(sunDir, true);
      });
    }
  } else {
    const conf = t > A('itiraf'), talk = t > A('Bunlar') - .05 && t < A('gibi."') + .4;
    cast.komutan.show(); cast.komutan.place(300.4, 0, -.4, cam, tint);
    cast.komutan.draw({ expr: talk ? 'worried' : conf ? 'worried' : 'focused', mouth: talk ? flap(env, t) : 0, look: .4, brow: talk ? .7 : 0, blink: bl(4, A('itiraf'), A('Bunlar')), sweat: conf ? 1 : 0,
      armR: talk ? [90 + Math.sin(t * 8) * 10, 60] : [40, 70], armL: [18, 10], lit: 1, shade: NIGHT, rim: { color: WARM, a: .45 } });
    cast.komutan.castFrom(V(300.9, .7, -.9));
  }
  for (const s of Object.values(smokes)) s.update(t);
  // ---- look
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (where === 'field') {
    const close = (t >= T('Kuşlar.') - .1 && t < T('Bakın')) || t >= T('Kuşlar', 2);
    look = { ...focusOn(close ? V(0, 1.6, -.55) : V(1, 1.2, -1), close ? 8 : 4, close ? 1 : 6), sat: 1.3, lift: [.098, .09, .15], bloom: .65, vignette: .18 };
  } else look = { ...focusOn(V(300.4, 1.5, -.4), 6, 2), sat: 1.2, lift: [.105, .092, .175], bloom: .9, vignette: .24 };
  look.tint = GRADE[where];
  look.blur = cp.moving > .15 ? 16 : 0;
  return look;
}
