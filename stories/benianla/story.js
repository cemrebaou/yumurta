// Beni Anla — a silent animation (no captions, no audio in the file) timed to the user's audio, which they add with
// YouTube's own remix tool. words.json holds only segment ids (s1..s17) and their times, not the words.
// Sets: STAGE (x=0), RUNWAY (x=200, a jumbo jet at dusk and its pilot), PEAK (x=400, a summit above the clouds at sunrise),
// MOON (x=600, the earth in a black sky), FARM (x=800, a golden field, a mother and four kids), HOME (x=1000, a man in
// grey sweats on the couch, lit by the TV).
import * as THREE from 'three';
import { stoneTex, woodTex, carpetTex, painted, flat, rng, D } from '../../engine/src/paint.js';
import { Toon, flap, blinkAt } from '../../engine/src/toon.js';
import { CamPath, smoother } from '../../engine/src/camera.js';
import { beam } from '../../engine/src/fx.js';

export const NAME = 'benianla';
export const FPS = 30;
export let DUR = 50;
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
    if (/Box|Cylinder|Sphere|Torus|Cone/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
const box = (g, sx, sy, sz, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); return b; };
const glowM = (r, g, b) => new THREE.MeshBasicMaterial({ color: HDR(r, g, b) });
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function skyDome(g, stops, stars = 0, seed = 1) {
  const tex = canvasTex(1024, 1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); for (const [p, col] of stops) gr.addColorStop(p, D(col)); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const R = rng(seed); for (let i = 0; i < stars; i++) { c.fillStyle = D('#fff6dc', .3 + R() * .7); c.beginPath(); c.arc(R() * w, R() * h * .48, R() < .9 ? 1 : 2, 0, 6.29); c.fill(); }
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 32), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })); sky.userData.noShadow = true; g.add(sky); return sky;
}
function sunLight(L, x, from, to, color, I, half = 8) {
  const s = new THREE.DirectionalLight(color, I); s.position.set(x + from[0], from[1], from[2]); s.target.position.set(x + to[0], to[1], to[2]); s.castShadow = true;
  s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 120 }); s.shadow.bias = -.0006; s.shadow.normalBias = .03;
  L.add(s); L.add(s.target); return s;
}

// ---------------------------------------------------------------- STAGE (x = 0)
function buildStage(scene) {
  const g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), painted(woodTex({ base: '#5a3a3a', plank: 48, rep: [3, 3] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  box(g, 5, .5, 2.4, 0, .25, -1.4, painted(woodTex({ base: '#7a4a2e', plank: 40, rep: [2, 1] })));
  box(g, 5, .06, .06, 0, .5, -.2, flat('#e0b050'));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), painted(stoneTex({ base: '#4a3a7a', seam: '#24204a', bw: 64, bh: 32, rep: [6, 3] }))); back.position.set(0, 2, -2.6); g.add(back);
  // a neon heart and a neon question mark
  const hs = new THREE.Shape(); hs.moveTo(0, -.3); hs.bezierCurveTo(-.5, .05, -.25, .4, 0, .15); hs.bezierCurveTo(.25, .4, .5, .05, 0, -.3);
  const heart = new THREE.Mesh(new THREE.ShapeGeometry(hs), glowM(2.6, .5, 1.2)); heart.position.set(-1.5, 2.7, -2.58); g.add(heart);
  const q = new THREE.Mesh(new THREE.TorusGeometry(.18, .035, 8, 24, Math.PI * 1.4), glowM(.6, 1.8, 2.6)); q.position.set(1.55, 2.85, -2.58); q.rotation.z = -.9; q.userData.noShadow = true; g.add(q);
  const qd = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), glowM(.6, 1.8, 2.6)); qd.position.set(1.5, 2.38, -2.58); qd.userData.noShadow = true; g.add(qd);
  for (const x of [-2.6, 2.6]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.35, .45, 3.6, 16, 1, true), flat('#8a1a3a', { side: THREE.DoubleSide })); c.position.set(x, 2.0, -2.3); g.add(c); }
  const ms = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.4, 6), flat('#2a2440')); ms.position.set(.45, 1.2, -.75); g.add(ms);
  const mb = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .02, 16), flat('#2a2440')); mb.position.set(.45, .51, -.75); g.add(mb);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#7a70d6', '#3a2440', 1.4));
  const sp = new THREE.SpotLight('#ffc884', 18, 0, .3, .45, 0); sp.position.set(.4, 5.5, 2.5); sp.target.position.set(0, .5, -.7); sp.castShadow = true;
  sp.shadow.mapSize.set(2048, 2048); sp.shadow.camera.near = 1; sp.shadow.camera.far = 14; sp.shadow.bias = -.0008; sp.shadow.normalBias = .03; L.add(sp); L.add(sp.target);
  const back2 = new THREE.PointLight('#ff5ab0', 2.2, 5, 1.5); back2.position.set(-1.5, 2.6, -2.2); L.add(back2);
  scene.add(L); sets.stage = { g, L };
  shadows(g);
  dyn.spotBeam = beam(scene, [.4, 5.5, 2.5], [0, .5, -.7], { r0: .1, r1: 1.0, color: '#ffd8a0', strength: .14 });
}

// ---------------------------------------------------------------- RUNWAY (x = 200): a jumbo jet at dusk
function buildRunway(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const tar = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), flat('#3a3a5a')); tar.rotation.x = -Math.PI / 2; g.add(tar);
  for (let x = -60; x < 60; x += 4) box(g, 2, .01, .15, x, .005, 3.2, flat('#e9eef8'));
  for (let x = -60; x < 60; x += 2.5) for (const z of [5.5, -9]) { const l = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), glowM(3, 2.2, .9)); l.position.set(x, .05, z); l.userData.noShadow = true; g.add(l); }
  // the jet: nose toward -x, its right side toward the camera
  const jet = new THREE.Group(); jet.position.set(2, 0, -3.5); g.add(jet); dyn.jet = jet;
  const white = flat('#f2f0ec'), red = flat('#c8333a');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 16, 32), white); body.rotation.z = Math.PI / 2; body.position.y = 2.6; jet.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), white); nose.rotation.z = Math.PI / 2; nose.scale.set(1, 1.6, 1); nose.position.set(-8, 2.6, 0); jet.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3, 32), white); tail.rotation.z = -Math.PI / 2; tail.position.set(9.5, 2.8, 0); jet.add(tail);
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(2.4, 0); fin.lineTo(3.2, 3.2); fin.lineTo(2.2, 3.2); fin.closePath();
  const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(fin, { depth: .16, bevelEnabled: false }), red); fm.position.set(8, 3.4, -.08); jet.add(fm);
  box(jet, 3.4, .14, 14, 1, 2.1, 0, white).rotation.y = .25;
  for (const z of [3.2, -3.2]) { const en = new THREE.Mesh(new THREE.CylinderGeometry(.5, .45, 1.8, 20), flat('#d8d4dc')); en.rotation.z = Math.PI / 2; en.position.set(-.3, 1.5, z); jet.add(en); }
  box(jet, 16, .2, .04, .4, 2.0, 1.14, red);
  // windows: a lit strip, a cockpit glass
  const winTex = canvasTex(2048, 64, (c, w, h) => { c.clearRect(0, 0, w, h); for (let x = 12; x < w; x += 30) { c.fillStyle = '#ffe0a0'; c.beginPath(); c.roundRect(x, 14, 16, 34, 7); c.fill(); } });
  const wins = new THREE.Mesh(new THREE.PlaneGeometry(14, .45), new THREE.MeshBasicMaterial({ map: winTex, transparent: true, color: HDR(2.2, 1.8, 1.1), depthWrite: false })); wins.position.set(.5, 2.95, 1.16); wins.userData.noShadow = true; jet.add(wins);
  const cock = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .35), glowM(.6, 1.2, 2.2)); cock.position.set(-8.4, 3.0, 1.0); cock.rotation.y = -.6; cock.userData.noShadow = true; jet.add(cock);
  for (const [x, y] of [[-6, 1.1], [1, 1.1]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .3, 16), flat('#2a2440')); wh.rotation.x = Math.PI / 2; wh.position.set(x, .35, .6); jet.add(wh); const st = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.3, 8), flat('#d8d4dc')); st.position.set(x, 1.0, .6); jet.add(st); }
  skyDome(g, [[0, '#1a1a5a'], [.4, '#5a3a8a'], [.5, '#ff8a6a'], [.52, '#ffc890'], [1, '#2a2440']], 200, 5);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#8a8af0', '#3a2a5a', 1.3));
  sunLight(L, 200, [-30, 8, -20], [0, 0, 0], '#ffb070', 3.0, 14);
  const fill = new THREE.PointLight('#ffb080', 6, 9, 1.2); fill.position.set(199.6, 2.6, 3.2); L.add(fill);
  scene.add(L); sets.runway = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- PEAK (x = 400): a summit above the clouds
function buildPeak(scene) {
  const g = new THREE.Group(); g.position.x = 400; scene.add(g);
  const rock = painted(stoneTex({ base: '#7a6a7a', seam: '#4a3a4a', bw: 96, bh: 96, rep: [4, 4] }));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 6, 12, 12), rock); top.position.y = -6; g.add(top);
  const snow = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2.6, 2.6, 12), flat('#f2f6ff')); snow.position.y = -1.25; g.add(snow);
  const R = rng(6);
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.2 + R() * .3), rock); r.position.set((R() - .5) * 2.2, .05, (R() - .5) * 1.6 - .4); g.add(r); }
  // the flag
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.8, 6), flat('#d8d4dc')); pole.position.set(.6, .9, -.3); g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.6, .4, 8, 1), flat('#e0303a', { side: THREE.DoubleSide })); flag.position.set(.9, 1.6, -.3); g.add(flag); dyn.flag = flag;
  // a sea of clouds below, far peaks poking through
  const cm = flat('#ffe0e8');
  for (let i = 0; i < 90; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(2 + R() * 4, 12, 8), cm); const a = R() * 6.28, r = 6 + R() * 60; c.position.set(Math.cos(a) * r, -5 - R() * 2, Math.sin(a) * r); c.scale.y = .35; c.userData.noShadow = true; g.add(c); }
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.ConeGeometry(4 + R() * 4, 8 + R() * 6, 6), flat('#8a6aa0')); p.position.set(-40 + i * 16, -4, -50 - R() * 20); g.add(p); }
  skyDome(g, [[0, '#2a3a8a'], [.35, '#8a6ad6'], [.47, '#ff9a8a'], [.5, '#ffd8a0'], [1, '#ffd0e0']], 80, 7);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(10, 40), glowM(3.2, 2.3, 1.2)); sun.position.set(-60, 2, -260); sun.lookAt(400, 0, 0); sun.userData.noShadow = true; g.add(sun);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a8a0f0', '#5a4a7a', 1.4));
  sunLight(L, 400, [-12, 6, -30], [0, 0, 0], '#ffc080', 3.4, 6);
  scene.add(L); sets.peak = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- MOON (x = 600)
function buildMoon(scene) {
  const g = new THREE.Group(); g.position.x = 600; scene.add(g);
  const groundTex = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = D('#9a98a8'); c.fillRect(0, 0, w, h); const R = rng(9);
    for (let i = 0; i < 160; i++) { const x = R() * w, y = R() * h, r = 6 + R() * 40; c.fillStyle = D('#6a6878', .7); c.beginPath(); c.ellipse(x, y, r, r * .9, 0, 0, 6.29); c.fill(); c.fillStyle = D('#c8c6d4', .6); c.beginPath(); c.ellipse(x - r * .15, y - r * .15, r * .8, r * .7, 0, 0, 6.29); c.fill(); }
  });
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(12, 12);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshLambertMaterial({ map: groundTex })); gr.rotation.x = -Math.PI / 2; g.add(gr);
  const R = rng(10);
  for (let i = 0; i < 14; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.15 + R() * .5), flat('#8a8898')); r.position.set((R() - .5) * 16, 0, -2 - R() * 14); g.add(r); }
  // a little lunar lander
  const lander = new THREE.Group(); lander.position.set(2.2, 0, -3); g.add(lander);
  box(lander, 1.2, .8, 1.2, 0, 1.1, 0, flat('#e8b84a'));
  const cab = new THREE.Mesh(new THREE.SphereGeometry(.55, 16, 10), flat('#e9eef8')); cab.position.y = 1.8; lander.add(cab);
  for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.1, 6), flat('#d8d4dc')); l.position.set(x, .5, z); l.rotation.set(z * .4, 0, -x * .4); lander.add(l); }
  skyDome(g, [[0, '#0a0a24'], [.5, '#1a1a3a'], [1, '#1a1a3a']], 900, 12);
  const earthTex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = D('#2a6ad6'); c.fillRect(0, 0, w, h); const R2 = rng(3);
    for (let i = 0; i < 26; i++) { c.fillStyle = D('#3fa060'); c.beginPath(); c.ellipse(R2() * w, R2() * h, 20 + R2() * 60, 14 + R2() * 40, R2() * 3, 0, 6.29); c.fill(); }
    for (let i = 0; i < 40; i++) { c.fillStyle = D('#ffffff', .7); c.beginPath(); c.ellipse(R2() * w, R2() * h, 20 + R2() * 50, 6 + R2() * 10, R2() * 3, 0, 6.29); c.fill(); }
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(14, 40, 30), new THREE.MeshBasicMaterial({ map: earthTex, color: HDR(1.2, 1.2, 1.3) })); earth.position.set(-20, 40, -160); earth.userData.noShadow = true; g.add(earth); dyn.earth = earth;
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#8a90c0', '#2a2a40', .9));
  sunLight(L, 600, [10, 9, 6], [0, 0, 0], '#f2f4ff', 3.6, 8);
  const rimL = new THREE.PointLight('#6aa0ff', 2, 6, 1.4); rimL.position.set(599, 2.6, -1.8); L.add(rimL);
  scene.add(L); sets.moon = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- FARM (x = 800)
function buildFarm(scene) {
  const g = new THREE.Group(); g.position.x = 800; scene.add(g);
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), flat('#c8963a')); soil.rotation.x = -Math.PI / 2; g.add(soil);
  // wheat: instanced stalks in rows, cut down near the family
  const geo = new THREE.ConeGeometry(.05, .9, 4); geo.translate(0, .45, 0);
  const R = rng(14), N = 5000, im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#f0c050', emissive: '#7a5410' }), N), m4 = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < N * 3 && n < N; i++) {
    const x = (R() - .5) * 40, z = -1.5 - R() * 30;
    if (Math.abs(x) < 3 && z > -3) continue;
    m4.makeRotationZ((R() - .5) * .2); m4.setPosition(x, 0, z); m4.scale(V(1, .8 + R() * .5, 1)); im.setMatrixAt(n++, m4);
  }
  im.count = n; im.receiveShadow = true; g.add(im);
  // sheaves and baskets
  for (const [x, z] of [[-1.8, -.6], [1.9, -.9], [-.5, -1.4]]) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, .7, 10), flat('#e8b84a')); sh.position.set(x, .35, z); g.add(sh); }
  dyn.baskets = [];
  for (const [x, z] of [[-.9, .4], [1.1, .3]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.22, .16, .26, 14, 1, true), flat('#8a5a2a', { side: THREE.DoubleSide })); b.position.set(x, .13, z); g.add(b); const f = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .05, 14), flat('#f0c050')); f.position.set(x, .2, z); g.add(f); dyn.baskets.push(f); }
  // a barn and trees on the horizon
  const barn = new THREE.Group(); barn.position.set(-7, 0, -16); g.add(barn);
  box(barn, 3, 2.2, 2.4, 0, 1.1, 0, flat('#c8333a'));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.5, 3), flat('#6a2a2a')); roof.rotation.set(Math.PI / 2, 0, Math.PI / 2); roof.position.y = 2.6; roof.rotation.y = Math.PI / 2; barn.add(roof);
  for (let i = 0; i < 10; i++) { const tr = new THREE.Mesh(new THREE.SphereGeometry(1.2 + R(), 12, 8), flat('#5a8a3a')); tr.position.set(-20 + i * 4.5, 1.6, -26 - R() * 4); g.add(tr); }
  skyDome(g, [[0, '#4a7ad6'], [.42, '#9ac8f0'], [.5, '#ffe0b0'], [1, '#c8963a']], 0, 3);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 40), glowM(3.2, 2.6, 1.4)); sun.position.set(60, 40, -200); sun.lookAt(800, 0, 0); sun.userData.noShadow = true; g.add(sun);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a8c8f0', '#8a6a3a', 1.4));
  sunLight(L, 800, [12, 10, -18], [0, 0, 0], '#fff0c0', 3.2, 6);
  scene.add(L); sets.farm = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- HOME (x = 1000): a dark living room, the TV glow
function buildHome(scene) {
  const g = new THREE.Group(); g.position.x = 1000; scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), painted(carpetTex({ base: '#5a4a7a', band: '#8a6aa0', rep: [2, 2] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const wall = painted(stoneTex({ base: '#6a5a8a', seam: '#5a4a7a', bw: 512, bh: 512, rep: [1, 1] }));
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wall); bw.position.set(0, 2, -2); g.add(bw);
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wall); sw.position.set(-3, 2, 3); sw.rotation.y = Math.PI / 2; g.add(sw);
  // the couch (against the back wall), the side lamp
  const cm = flat('#c85a3a');
  box(g, 2.4, .45, .9, 0, .23, -1.4, cm); box(g, 2.4, .7, .25, 0, .7, -1.8, cm);
  for (const x of [-1.25, 1.25]) box(g, .25, .65, .9, x, .33, -1.4, cm);
  box(g, .6, .1, .6, 1.8, .5, -1.4, painted(woodTex({ base: '#6a4a3a' })));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.14, .22, .3, 16, 1, true), glowM(2.2, 1.6, .9)); shade.position.set(1.8, 1.0, -1.4); shade.userData.noShadow = true; g.add(shade);
  // a snack bowl on a coffee table
  box(g, 1.2, .08, .6, 0, .42, -.2, painted(woodTex({ base: '#7a5a3a' })));
  for (const x of [-.5, .5]) box(g, .06, .38, .5, x, .19, -.2, flat('#3a2a2a'));
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), flat('#e9eef8', { side: THREE.DoubleSide })); bowl.position.set(.3, .6, -.2); g.add(bowl);
  for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.CircleGeometry(.04, 8), flat('#f0c050', { side: THREE.DoubleSide })); c.position.set(.3 + (i % 4 - 1.5) * .05, .6, -.2 + (i > 3 ? .04 : -.04)); c.rotation.x = -1.2; g.add(c); }
  // the TV: behind the camera's usual spot, its glow is the key light; a second TV mesh for the reverse shot
  const tv = new THREE.Group(); tv.position.set(0, 0, 2.6); g.add(tv);
  box(tv, 1.4, .5, .4, 0, .25, 0, flat('#2a2440'));
  box(tv, 1.7, 1.0, .06, 0, 1.1, 0, flat('#14142a'));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .9), glowM(.8, 1.4, 2.6)); scr.position.set(0, 1.1, -.04); scr.rotation.y = Math.PI; scr.userData.noShadow = true; tv.add(scr); dyn.tvScreen = scr;
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#5a5aa0', '#2a2040', .9));
  const tvL = new THREE.SpotLight('#a8c0f0', 7, 0, .7, .6, 0); tvL.position.set(1000, 1.1, 2.4); tvL.target.position.set(1000, .8, -1.4); tvL.castShadow = true;
  tvL.shadow.mapSize.set(2048, 2048); tvL.shadow.camera.near = .3; tvL.shadow.camera.far = 10; tvL.shadow.bias = -.001; tvL.shadow.normalBias = .03; L.add(tvL); L.add(tvL.target); dyn.tvL = tvL;
  const lampL = new THREE.PointLight('#ffb060', 2.4, 4, 1.5); lampL.position.set(1001.8, 1.0, -1.4); L.add(lampL);
  scene.add(L); sets.home = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- CAST (generic characters, no resemblance to anyone real)
export const LOOK = {
  komedyen: { cloth: '#3a6ab8', clothDark: '#24447a', buttons: '#e8b84a', mustache: '#3a2a20', hair: '#3a2a20', height: 1.74 },
  pilot: { cloth: '#2a3a6a', clothDark: '#1a2448', buttons: '#e8b84a', trim: '#e8b84a', hat: 'sailor', hatColor: '#2a3a6a', hair: '#6a3a20', height: 1.64, headW: 250, headH: 250 },
  dagci: { cloth: '#e0603a', clothDark: '#a83a2a', hat: 'knit', hatColor: '#3f9a48', hair: '#3a2a20', height: 1.62, headW: 250, headH: 250 },
  astro: { cloth: '#e9eef8', clothDark: '#a8aec8', buttons: '#c8333a', collar: false, hair: '#2a2030', height: 1.66, headW: 256, headH: 256 },
  anne: { cloth: '#8a5ad6', apron: true, hair: '#5a2a20', height: 1.62, headW: 250, headH: 250 },
  c1: { cloth: '#e0604a', hair: '#5a2a20', height: 1.0, headW: 230, headH: 230 },
  c2: { cloth: '#3f9a48', hair: '#3a2a20', height: 1.1, headW: 236, headH: 232 },
  c3: { cloth: '#e8b84a', hair: '#5a2a20', height: .9, headW: 226, headH: 226 },
  c4: { cloth: '#3a7ab8', hair: '#2a2030', height: 1.2, headW: 240, headH: 236 },
  koca: { cloth: '#9a98a8', clothDark: '#6a687a', hair: '#3a2a20', mustache: '#3a2a20', height: 1.72, headW: 272, headH: 262 },
  kocaSit: { body: 'sit', cloth: '#9a98a8', clothDark: '#6a687a', hair: '#3a2a20', mustache: '#3a2a20', height: 1.72, headW: 272, headH: 262 },
};

function cameraPath() {
  const t = n => W('s' + n), e = n => E('s' + n);
  const keys = [
    { t: 0, pos: [.2, 1.6, 3.2], look: [0, 1.65, -.7], fov: 48, creep: .26, drift: .03 },
    { t: t(2) - .1, dur: .4, pos: [-.1, 1.65, 1.8], look: [0, 1.75, -.7], fov: 42, creep: .3 },
    { t: t(4) - .1, dur: .4, pos: [.3, 1.6, 2.4], look: [0, 1.7, -.7], fov: 44, creep: .28 },
    // the pilot by her jet
    { t: t(5) - .15, dur: .35, move: 'whip', pos: [199.4, 1.5, 3.6], look: [199.2, 1.5, 0], fov: 46, creep: .26 },
    { t: t(6) + 3.7, dur: 3.6, pos: [205, 3.2, 12], look: [201, 2.6, -3.5], fov: 54, creep: .1 },
    { t: t(7) - .15, dur: .4, pos: [199.5, 1.45, 2.2], look: [199.2, 1.55, 0], fov: 42, creep: .3 },
    // the summit
    { t: t(8) - .15, dur: .35, move: 'whip', pos: [400.4, .9, 3.0], look: [400, 1.4, -.2], fov: 46, creep: .26 },
    // the moon
    { t: t(9) - .15, dur: .35, move: 'whip', pos: [600.3, 1.3, 3.2], look: [600, 1.6, 0], fov: 46, creep: .26 },
    { t: t(9) + 2.8, dur: 1.4, pos: [601.2, .6, 4.4], look: [599.6, 3, -2], fov: 52, creep: .2 },
    // the farm
    { t: t(10) - .15, dur: .35, move: 'whip', pos: [800.2, 1.4, 4.2], look: [800, 1.0, 0], fov: 48, creep: .26 },
    // home: standing up in the grey sweats, then the couch
    { t: t(11) - .15, dur: .35, move: 'whip', pos: [1000.2, 1.4, 1.6], look: [1000, 1.2, -.9], fov: 46, creep: .28 },
    { t: t(12) - .1, dur: .6, pos: [999.6, 1.3, 1.9], look: [1000, .95, -1.4], fov: 48, creep: .26 },
    { t: t(13) - .1, dur: .4, pos: [1000.1, 1.2, 1.0], look: [1000, 1.1, -1.3], fov: 44, creep: .32 },
    { t: t(14) - .05, dur: .4, pos: [1000.15, 1.15, .75], look: [1000, 1.1, -1.3], fov: 42, creep: .3 },
    // the jet lifts off
    { t: t(15) - .15, dur: .35, move: 'whip', pos: [196, 1.6, 14], look: [201, 3, -3.5], fov: 54, creep: .14 },
    // back to the stage, then the man and his remote
    { t: t(16) - .15, dur: .3, move: 'whip', pos: [.1, 1.6, 1.6], look: [0, 1.72, -.7], fov: 42, creep: .3 },
    { t: t(16) + 2.0, dur: .35, move: 'whip', pos: [1000.2, 1.2, 1.1], look: [1000, 1.0, -1.3], fov: 46, creep: .3 },
    { t: t(17) - .1, dur: .3, move: 'whip', pos: [.2, 1.6, 2.6], look: [0, 1.65, -.7], fov: 46, creep: .26 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t(5) + .1, .6); cp.kick(t(15) + .1, .6); cp.kick(t(16) + .1, .7);
  return cp;
}

export async function setup(ctx) {
  const ids = {}; for (const w of ctx.words) ids[w.word] = w;
  W = k => ids[k].start; E = k => ids[k].end;
  DUR = Math.ceil(50 * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#1a1f3a');
  buildStage(scene); buildRunway(scene); buildPeak(scene); buildMoon(scene); buildFarm(scene); buildHome(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  dyn.cam = cameraPath();
}

const SETS = ['stage', 'runway', 'peak', 'moon', 'farm', 'home'];
const vis = (set, on) => { sets[set].g.visible = on; sets[set].L.visible = on; };
const GRADE = { stage: [1, .97, 1.03], runway: [1.02, .97, 1.0], peak: [1.02, .98, 1.0], moon: [.97, .98, 1.05], farm: [1.03, 1, .95], home: [.96, .97, 1.06] };
const FACE = { stage: [1, .98, .95], runway: [1, .97, .93], peak: [1, .97, .94], moon: [.98, .99, 1], farm: [1, .98, .92], home: [.96, .98, 1.02] };
export function frame(t, ctx) {
  const { cam, env } = ctx;
  const cp = dyn.cam.apply(cam, t);
  const where = SETS[Math.max(0, Math.min(5, Math.round(cam.position.x / 200)))];
  for (const s of SETS) vis(s, s === where);
  dyn.spotBeam.visible = where === 'stage';
  for (const c of Object.values(cast)) c.hide();
  const tint = FACE[where].map((v, i) => v / GRADE[where][i]);
  const bl = (seed, ...swaps) => blinkAt(t, seed, swaps, FPS);
  const m = flap(env, t);
  const T = n => W('s' + n);
  const shade = '#d8cfee';
  if (where === 'stage') {
    cast.komedyen.show(); cast.komedyen.place(0, .5, -.7, cam, tint);
    let e;
    if (t < T(2)) e = { expr: 'focused', look: .3, armL: [70, 120] };
    else if (t < T(3)) e = { expr: 'smug', look: .4, brow: .7, armL: [150, 20] };                         // "the only woman in the world"
    else if (t < T(5)) e = { expr: 'angry', look: .2, armL: [100, 40 + Math.sin(t * 7) * 15] };
    else if (t < T(17)) e = { expr: 'angry', look: 0, brow: 1, armL: [130 + Math.sin(t * 9) * 25, 60] };     // "what are YOU lifting?"
    else e = { expr: 'smug', look: .3, brow: .6, armL: [60, -50] };
    cast.komedyen.draw({ armR: [70, 90], propR: 'mic', ...e, mouth: m, blink: bl(1, T(2), T(4), T(16), T(17)), lit: 1, shade, rim: { color: '#ff7ac8', a: .45 } });
    cast.komedyen.castFrom(V(.4, 5.5, 2.5));
  } else if (where === 'runway') {
    const lift = ramp(t, T(15) + .2, T(15) + 2.6);
    dyn.jet.position.set(2 - lift * 18, lift * 7, -3.5); dyn.jet.rotation.z = -lift * .22;
    if (t < T(15)) {
      cast.pilot.show(); cast.pilot.place(199.2, 0, 0, cam, tint);
      const proud = t >= T(7) - .1;
      cast.pilot.draw({ expr: proud ? 'proud' : 'smile', look: proud ? .3 : -.2, armL: proud ? [60, -40] : [18, 10], armR: proud ? [150, 30] : [110, 60],
        blink: bl(2, T(6), T(7)), lit: 1, shade: '#e8c8d8', rim: { color: '#ffb070', a: .55 } });
      cast.pilot.castFrom(V(170, 8, -20));
    }
  } else if (where === 'peak') {
    dyn.flag.rotation.y = Math.sin(t * 6) * .25;
    cast.dagci.show(); cast.dagci.place(400, 0, -.2, cam, tint);
    cast.dagci.draw({ expr: 'grin', look: .2, lookY: -.3, armR: [160, 20], armL: [60, -40], bob: Math.abs(Math.sin(t * 5)) * -6,
      blink: bl(3, T(8)), lit: 1, shade: '#e0c8e8', rim: { color: '#ffc080', a: .6 } });
    cast.dagci.castFrom(V(388, 6, -30));
  } else if (where === 'moon') {
    const fy = .4 + Math.sin((t - T(9)) * 1.6) * .25;
    cast.astro.show(); cast.astro.place(600, fy, 0, cam, tint);
    cast.astro.draw({ expr: 'focused', look: .2, armL: [100 + Math.sin(t * 2) * 20, 40], armR: [120, 60], propR: 'brush', tilt: Math.sin(t * 1.3) * 8,
      blink: bl(4, T(9)), lit: 1, shade: '#c8d0f0', rim: { color: '#6aa0ff', a: .5 } });
    cast.astro.castFrom(V(610, 9, 6));
    dyn.earth.rotation.y = t * .1;
  } else if (where === 'farm') {
    const ph = t * 7;
    cast.anne.show(); cast.anne.place(800, 0, -.3, cam, tint);
    cast.anne.draw({ expr: 'smile', look: .3, armR: [90 + Math.sin(ph) * 30, 60], armL: [40, 30], blink: bl(5, T(10)), lit: 1, shade: '#e8d8c8', rim: { color: '#fff0c0', a: .45 } });
    cast.anne.castFrom(V(812, 10, -18));
    [['c1', -1.4, .2], ['c2', -.6, .7], ['c3', .7, .8], ['c4', 1.5, .1]].forEach(([k, x, z], i) => {
      cast[k].show(); cast[k].place(800 + x, 0, z, cam, tint);
      cast[k].draw({ expr: i % 2 ? 'grin' : 'focused', look: -x * .3, armR: [80 + Math.sin(ph + i * 1.7) * 40, 50], armL: [60 + Math.cos(ph + i) * 30, 30],
        lookY: .3, bob: Math.abs(Math.sin(ph + i)) * -5, blink: bl(20 + i), lit: 1, shade: '#e8d8c8', rim: { color: '#fff0c0', a: .45 } });
      cast[k].castFrom(V(812, 10, -18));
    });
  } else {
    const flick = .85 + .15 * Math.sin(t * 13) * Math.sin(t * 5.3);
    dyn.tvL.intensity = 7 * flick; dyn.tvScreen.material.color.setRGB(.8 * flick, 1.4 * flick, 2.6 * flick);
    const standing = t < T(12) - .1;
    if (standing) {
      // tugging the grey sweats up, a few times
      const tug = Math.max(0, Math.sin((t - T(11)) * 9));
      cast.koca.show(); cast.koca.place(1000, 0, -.9, cam, tint);
      cast.koca.draw({ expr: 'focused', look: .1, lookY: .5, gazeY: 1, armL: [20 + tug * 25, -20], armR: [20 + tug * 25, -20], bob: -tug * 8,
        blink: bl(6, T(11)), lit: 1, shade: '#c8d0f0', rim: { color: '#ffb060', a: .4 } });
      cast.koca.castFrom(V(1000, 1.1, 2.4));
    } else {
      const plead = t >= T(13) - .1 && t < E('s14') + .5, remote = t >= T(16) + 1.8;
      const up = remote ? Math.max(0, Math.sin((t - T(16)) * 7)) : 0;
      cast.kocaSit.show(); cast.kocaSit.place(1000, .02, -1.25, cam, tint);
      cast.kocaSit.draw({ expr: plead ? 'worried' : remote ? 'smug' : 'neutral', look: plead ? 0 : .05, brow: plead ? .6 : 0,
        mouth: plead && (inSeg(t, 13) || inSeg(t, 14)) ? m : 0, propR: plead ? undefined : 'phone',
        armR: plead ? [100, 120] : [50 + up * 90, 90], armL: plead ? [100, 120] : [18, 10],
        blink: bl(7, T(12), T(13)), lit: 1, shade: '#c8d0f0', rim: { color: '#ffb060', a: .4 } });
      cast.kocaSit.castFrom(V(1000, 1.1, 2.4));
    }
  }
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  const subj = { stage: V(0, 1.7, -.7), runway: V(199.2, 1.4, 0), peak: V(400, 1.3, -.2), moon: V(600, 1.6, 0), farm: V(800, .9, 0), home: V(1000, 1.0, -1.2) }[where];
  const far = cam.position.distanceTo(subj) > 7;
  const look = { ...focusOn(subj, far ? 0 : 6, 2), sat: 1.25, lift: [.1, .09, .17], bloom: where === 'home' ? .9 : .8, vignette: where === 'home' ? .3 : .22 };
  look.tint = GRADE[where];
  look.blur = cp.moving > .15 ? 16 : 0;
  look.captions = false;
  return look;
}
