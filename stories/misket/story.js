// Misket — the Royal Navy beat scurvy with lemons, swapped them for cheaper limes (and boiled the juice in copper),
// and scurvy came back on the long polar voyages. Both were sold as "lime juice": the cure changed, the name did not.
// Sets: DECK (x≈0, night), OFFICE (x≈200, sunset), GALLEY (x≈300, fire), KITCHEN (x≈400, day), ICE DECK (x≈500, polar night).
// Every cue is pinned to a word of voice/words.json (W('word', n)).
// Light per set: deck = ship lantern (warm) vs moon (cool); office = low sun through the window vs cool room;
// galley = the fire under the copper pot vs a blue porthole; kitchen = sun through the window vs sky fill;
// ice = the lantern vs aurora + moon.
import * as THREE from 'three';
import { stoneTex, woodTex, tileTex, ciniTex, frizTex, painted, flat, rng, D } from '/engine/src/paint.js';
import { Toon, Arm3D, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, ribbon, beam, glow } from '/engine/src/fx.js';
import { holedWall, vistaMat, dayGardenTex } from '/engine/src/vista.js';

export const NAME = 'misket';
export const FPS = 30;
export let DUR = 30;
export const CUES = [];

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const lerpN = (a, b, k) => a + (b - a) * k;
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const DEG = Math.PI / 180;
const OFF_CAM = [200.3, 1.55, 3.0];
const KIT_CAM = [399.6, 1.3, 1.5];
let W, cast = {}, sets = {}, smokes = {}, dyn = {};

function wordTimes(words) {
  const norm = s => s.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]/gu, '');
  return (w, n = 1) => { let k = 0; for (const x of words) if (norm(x.word) === norm(w) && ++k === n) return x.start; throw new Error('word not found: ' + w); };
}
function shadows(g) {
  g.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (o.material.isMeshLambertMaterial) o.receiveShadow = true;
    if (/Box|Cylinder|Extrude|Lathe|Torus|Sphere/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
function keySpot(color, intensity, pos, target, angle, { map, size = 2048, near = 1, far = 60, penumbra = .35 } = {}) {
  const l = new THREE.SpotLight(color, intensity, 0, angle, penumbra, 0);
  l.position.set(...pos); l.target.position.set(...target); l.castShadow = true;
  l.shadow.mapSize.set(size, size); l.shadow.camera.near = near; l.shadow.camera.far = far; l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3;
  if (map) l.map = map;
  return l;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const box = (g, sx, sy, sz, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); return b; };

// ---------------------------------------------------------------- SKY + SEA (a painted cylinder around a deck)
function skyTex({ ice = false } = {}) {
  return canvasTex(4096, 1024, (g, w, h) => {
    const hz = h * .64;                                     // the horizon line (world y ≈ 1.2)
    const sky = g.createLinearGradient(0, 0, 0, hz);
    if (ice) { sky.addColorStop(0, D('#141a48')); sky.addColorStop(.6, D('#23306e')); sky.addColorStop(1, D('#4b5aa0')); }
    else { sky.addColorStop(0, D('#191a4a')); sky.addColorStop(.62, D('#2e2c72')); sky.addColorStop(1, D('#6a5a9e')); }
    g.fillStyle = sky; g.fillRect(0, 0, w, hz);
    const R = rng(ice ? 77 : 7);
    for (let i = 0; i < 700; i++) { g.fillStyle = D('#fff6dc', .4 + R() * .6); const r = R() < .9 ? 1.4 : 2.6; g.beginPath(); g.arc(R() * w, R() * hz * .85, r, 0, 6.29); g.fill(); }
    if (ice) {                                              // aurora: soft green-teal curtains with fine vertical streaks
      for (let k = 0; k < 3; k++) {
        const y0 = h * (.16 + k * .09);
        for (let x = 0; x < w; x += 3) {
          const y = y0 + Math.sin(x / 260 + k * 2) * 40 + Math.sin(x / 90 + k) * 12, len = 90 + Math.sin(x / 140 + k * 3) * 50;
          const gr = g.createLinearGradient(0, y - len, 0, y + 20);
          gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.75, D(k === 1 ? '#5ef0c0' : '#46d8a8', .32)); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(x, y - len, 3, len + 20);
        }
      }
      for (let i = 0; i < 9; i++) {                         // icebergs on the horizon: pale lilac-blue, a lit face and a shade face
        const x = R() * w, bw = 120 + R() * 260, bh = 40 + R() * 120;
        g.fillStyle = D('#c9d4f4'); g.beginPath(); g.moveTo(x - bw / 2, hz + 2); g.lineTo(x - bw * .2, hz - bh); g.lineTo(x + bw * .1, hz - bh * .8); g.lineTo(x + bw / 2, hz + 2); g.closePath(); g.fill();
        g.fillStyle = D('#8e9ad6'); g.beginPath(); g.moveTo(x + bw * .1, hz - bh * .8); g.lineTo(x + bw / 2, hz + 2); g.lineTo(x, hz + 2); g.closePath(); g.fill();
        g.strokeStyle = D('#2c2858'); g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - bw / 2, hz + 2); g.lineTo(x - bw * .2, hz - bh); g.lineTo(x + bw * .1, hz - bh * .8); g.lineTo(x + bw / 2, hz + 2); g.stroke();
      }
    } else {
      g.fillStyle = D('#3c3470', .6); for (let i = 0; i < 14; i++) { const x = R() * w, y = hz * (.45 + R() * .35); g.beginPath(); g.ellipse(x, y, 160 + R() * 260, 18 + R() * 20, 0, 0, 6.29); g.fill(); }   // long night clouds
    }
    const sea = g.createLinearGradient(0, hz, 0, h);
    sea.addColorStop(0, D(ice ? '#3a4a8e' : '#3a3a86')); sea.addColorStop(1, D('#141640'));
    g.fillStyle = sea; g.fillRect(0, hz, w, h - hz);
    g.strokeStyle = D(ice ? '#9fb4ec' : '#8f8fd8', .5); g.lineWidth = 2.5;
    for (let i = 0; i < 520; i++) { const y = hz + 4 + Math.pow(R(), 1.6) * (h - hz), x = R() * w, l = 20 + (y - hz) * .5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); }
    g.fillStyle = D('#fff1c0', .35); for (let i = 0; i < 60; i++) { const y = hz + 6 + R() * 40, x = w * .3 + (R() - .5) * 240; g.fillRect(x, y, 30 + R() * 60, 2.5); }   // the moon's path on the water
  });
}
function shipLantern(light = 9) {                           // a brass ship lantern: a glowing glass cylinder in a cage
  const g = new THREE.Group(), brass = flat('#d9a441', { emissive: '#5a3a08' });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .2, 20), new THREE.MeshBasicMaterial({ color: HDR(3.0, 2.0, .85) })); glass.userData.noShadow = true; g.add(glass);
  for (const y of [.115, -.115]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .035, 20), brass); c.position.y = y; c.userData.noShadow = true; g.add(c); }
  const top = new THREE.Mesh(new THREE.ConeGeometry(.1, .09, 20), brass); top.position.y = .175; top.userData.noShadow = true; g.add(top);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + .4, b = new THREE.Mesh(new THREE.BoxGeometry(.012, .21, .012), flat('#4a3424')); b.position.set(Math.cos(a) * .095, 0, Math.sin(a) * .095); b.userData.noShadow = true; g.add(b); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .007, 6, 14), brass); ring.position.y = .24; ring.userData.noShadow = true; g.add(ring);
  const pl = new THREE.PointLight('#ffc070', light, 11, 1.25); pl.castShadow = true;
  pl.shadow.mapSize.set(1024, 1024); pl.shadow.camera.near = .15; pl.shadow.camera.far = 14; pl.shadow.bias = -.003; pl.shadow.normalBias = .04; pl.shadow.radius = 4;
  g.add(pl); g.light = pl; g.glass = glass;
  return g;
}

// ---------------------------------------------------------------- DECK (x = 0) and ICE DECK (x = 500)
function buildDeck(scene, X, ice) {
  const g = new THREE.Group(); g.position.x = X; scene.add(g);
  const plank = painted(woodTex({ base: ice ? '#b9a48a' : '#a8784a', plank: 48, rep: [3, 3] }));
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), plank); fl.rotation.x = -Math.PI / 2; g.add(fl);
  if (ice) {                                                // snow drifts along the rail and in the corners
    const snow = canvasTex(1024, 1024, (c, w, h) => { const R = rng(5); c.clearRect(0, 0, w, h); for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(240,244,255,${.35 + R() * .5})`; c.beginPath(); c.ellipse(R() * w, Math.pow(R(), .5) * h * .5, 30 + R() * 90, 10 + R() * 30, R() * 3, 0, 6.29); c.fill(); } });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshLambertMaterial({ map: snow, transparent: true })); sm.rotation.x = -Math.PI / 2; sm.position.y = .006; g.add(sm);
  }
  // the rail at the back (z = -3): posts, a top rail and a painted band (the hull's strake) under it
  const railM = painted(woodTex({ base: '#7a4a2e', rep: [4, 1] })), bandM = painted(frizTex({ ground: '#e9dcc0', a: '#e0b050', b: '#6f8fd8', c: '#c8433a', rep: [5, 1] }));
  for (const z of [-3]) {
    box(g, 14, .12, .16, 0, 1.05, z, railM);
    const strake = new THREE.Mesh(new THREE.PlaneGeometry(14, .42), bandM); strake.position.set(0, .3, z + .08); g.add(strake);
    box(g, 14, .05, .1, 0, .54, z + .06, flat('#3a2a5a'));
    for (let x = -6.5; x <= 6.5; x += .62) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .5, 8), railM); p.position.set(x, .8, z); g.add(p); }
    if (ice) box(g, 14, .06, .2, 0, 1.13, z, flat('#eef2ff'));
  }
  // side rail on the left (x = -5)
  box(g, .16, .12, 8, -5, 1.05, 1, railM);
  for (let z = -2.6; z <= 4.6; z += .62) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .5, 8), railM); p.position.set(-5, .8, z); g.add(p); }
  // the mast, a yard and a furled sail; ropes down to the rail
  const mastM = painted(woodTex({ base: '#9a6a3e', vertical: true, rep: [1, 4] }));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, 14, 16), mastM); mast.position.set(-2.2, 7, -1.8); g.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 6, 10), mastM); yard.rotation.z = Math.PI / 2; yard.position.set(-2.2, 5.6, -1.8); g.add(yard);
  const sail = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 5.6, 12), flat(ice ? '#e8ecfa' : '#eadfc6')); sail.rotation.z = Math.PI / 2; sail.position.set(-2.2, 5.35, -1.75); g.add(sail);
  for (const s of [-1, 1]) { const a = V(-2.2 + s * 2.8, 5.6, -1.8), b = V(-2.2 + s * 3.6, 1.1, -3); const r = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, a.distanceTo(b), 4), flat('#5a4230')); r.position.copy(a).lerp(b, .5); r.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); r.userData.noShadow = true; g.add(r); }
  // the barrel of juice, a crate of fruit, a coil of rope
  const barM = painted(woodTex({ base: '#a0683a', vertical: true, plank: 40, rep: [2, 1] }));
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .85, 24), barM); bar.position.set(1.15, .425, -1.6); g.add(bar);
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .4, 24), barM); belly.position.set(1.15, .425, -1.6); g.add(belly);
  for (const y of [.12, .74]) { const h = new THREE.Mesh(new THREE.TorusGeometry(.375, .022, 6, 28), flat('#4a4458')); h.rotation.x = Math.PI / 2; h.position.set(1.15, y, -1.6); g.add(h); }
  const crate = box(g, .7, .36, .5, 1.95, .18, -1.1, painted(woodTex({ base: '#b88a52', plank: 32 })));
  const fruitCol = ice ? '#6ec23a' : '#ffd83a';
  for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.075, 14, 10), flat(fruitCol)); f.scale.set(1.15, .9, .9); f.position.set(1.72 + (i % 3) * .22, .41 + (i > 5 ? .05 : 0), -1.25 + Math.floor(i / 3) * .15); g.add(f); }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(.3, .06, 8, 24), flat('#c8a46a')); coil.rotation.x = -Math.PI / 2; coil.position.set(-3.6, .06, .6); g.add(coil);
  // a funnel: the steamship years (shown from "Gemiler" on); its smoke is a wisp in setup()
  const fun = new THREE.Group(); fun.position.set(3.8, 0, -2.2); g.add(fun);
  const fm = new THREE.Mesh(new THREE.CylinderGeometry(.48, .5, 6, 24), flat('#c8433a')); fm.position.y = 3; fun.add(fm);
  const ft = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .7, 24), flat('#2a2a48')); ft.position.y = 5.7; fun.add(ft);
  const fb = new THREE.Mesh(new THREE.TorusGeometry(.5, .04, 6, 24), flat('#e8b84a')); fb.rotation.x = Math.PI / 2; fb.position.y = 5.3; fun.add(fb);
  // sky + sea around the deck (painted, unlit), the moon
  const st = skyTex({ ice }); st.wrapS = THREE.RepeatWrapping;
  const sky = new THREE.Mesh(new THREE.CylinderGeometry(45, 45, 60, 64, 1, true), new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide }));
  sky.position.set(0, 10, 0); sky.userData.noShadow = true; g.add(sky);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshBasicMaterial({ color: HDR(1.9, 1.85, 1.6) })); moon.position.set(-14, 13, -38); moon.lookAt(0, 1.5, 0); g.add(moon);
  // lights: the lantern on the mast (warm key, shadows), the moon (cool, from the back left), a cool night fill
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight(ice ? '#7f8cf0' : '#7a7ee6', '#3c3266', ice ? 1.5 : 1.25));
  const moonL = keySpot(ice ? '#9fb4ff' : '#a3b0ff', ice ? 2.2 : 1.6, [X - 12, 16, -22], [X, 0, 0], .32, { near: 10, far: 60 }); L.add(moonL); L.add(moonL.target);
  scene.add(L);
  const lan = shipLantern(ice ? 10 : 9); lan.position.set(-1.92, 2.15, -1.62); g.add(lan);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(.32, .04, .04), flat('#4a3424')); hook.position.set(-2.06, 2.42, -1.7); hook.userData.noShadow = true; g.add(hook);
  shadows(g);
  sky.castShadow = sky.receiveShadow = false;
  const set = { g, L, lan, funnel: fun, sea: st, crateFruit: V(X + 1.95, .5, -1.1), lanternPos: V(X - 1.92, 2.15, -1.62) };
  fun.visible = false;
  return set;
}

// ---------------------------------------------------------------- OFFICE (x = 200): the Admiralty at sunset
function mapTex() {
  return canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = D('#efe0bc'); g.fillRect(0, 0, w, h);
    g.fillStyle = D('#a9c4e8'); g.fillRect(40, 40, w - 80, h - 80);
    const R = rng(3); g.fillStyle = D('#e6cf96'); g.strokeStyle = D('#5a4636'); g.lineWidth = 4;
    for (const [cx, cy, rx, ry] of [[250, 220, 150, 110], [560, 190, 120, 80], [700, 380, 170, 120], [330, 450, 110, 70], [880, 200, 70, 60]]) {
      g.beginPath(); for (let a = 0; a <= 6.3; a += .3) { const r = 1 + (R() - .5) * .25; g.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r); } g.closePath(); g.fill(); g.stroke();
    }
    g.strokeStyle = D('#c8433a'); g.lineWidth = 5; g.setLineDash([14, 10]);
    g.beginPath(); g.moveTo(260, 230); g.bezierCurveTo(420, 330, 520, 300, 700, 380); g.stroke(); g.beginPath(); g.moveTo(260, 230); g.bezierCurveTo(330, 120, 520, 120, 880, 200); g.stroke(); g.setLineDash([]);
    g.strokeStyle = D('#7a5a3a'); g.lineWidth = 14; g.strokeRect(20, 20, w - 40, h - 40); g.strokeStyle = D('#e0b050'); g.lineWidth = 4; g.strokeRect(34, 34, w - 68, h - 68);
  });
}
function labelTex() {   // the SAME label on both bottles
  return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = D('#f4e8c8'); g.fillRect(0, 0, w, h);
    g.strokeStyle = D('#2a2a5a'); g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28);
    g.strokeStyle = D('#c8433a'); g.lineWidth = 5; g.strokeRect(34, 34, w - 68, h - 68);
    g.fillStyle = D('#2a2a5a'); g.font = '900 78px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LIME', w / 2, h * .38); g.fillText('JUICE', w / 2, h * .66);
  });
}
function buildOffice(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), painted(woodTex({ base: '#8a5a3a', plank: 56, rep: [2, 2] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), painted(tileTex({ a: '#3a5aa8', b: '#e9dcc0', ink: '#2a2448', rep: [4, 3] }))); carpet.rotation.x = -Math.PI / 2; carpet.position.set(-.2, .005, .2); g.add(carpet);
  const wallM = painted(stoneTex({ base: '#8fa6d0', bw: 256, bh: 128, rep: [2, 1] }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), wallM); back.position.set(0, 1.7, -2.4); g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), wallM); left.position.set(-3.2, 1.7, 0); left.rotation.y = Math.PI / 2; g.add(left);
  // dado panels and a cornice, proud of the walls
  const dado = painted(woodTex({ base: '#5a3a5a', plank: 64, rep: [6, 1], vertical: true }));
  box(g, 7, .9, .06, 0, .45, -2.36, dado); box(g, 7, .06, .12, 0, .93, -2.34, flat('#e0b050'));
  box(g, .06, .9, 7, -3.16, .45, 0, dado); box(g, .12, .06, 7, -3.14, .93, 0, flat('#e0b050'));
  box(g, 7, .14, .16, 0, 3.3, -2.32, flat('#e9dcc0'));
  // the chart of the world, framed, on the back wall (away from the heads: high and to the left)
  const map = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.12), new THREE.MeshLambertMaterial({ map: mapTex() })); map.position.set(-1.1, 2.35, -2.3); g.add(map);
  box(g, 1.92, 1.24, .04, -1.1, 2.35, -2.33, flat('#7a5a3a'));
  // the right wall with a tall window: one piece with a hole; a harbour at sunset outside
  const WZ = [-1.5, -.1], WY = [.9, 2.75], wc = (WZ[0] + WZ[1]) / 2, wy = (WY[0] + WY[1]) / 2;
  const rw = holedWall(7, 3.4, [WZ[0], WY[0], WZ[1], WY[1]], painted(stoneTex({ base: '#8fa6d0', bw: 256, bh: 128, rep: [1 / 1.6, 1 / 1.7] })));
  rw.position.set(2.4, 0, 0); rw.rotation.y = -Math.PI / 2; rw.castShadow = true; g.add(rw);
  const jamb = painted(woodTex({ base: '#e9dcc0', plank: 128 })), X0 = 2.34, X1 = 2.62, xc = (X0 + X1) / 2, xd = X1 - X0;
  box(g, xd, .12, WZ[1] - WZ[0] + .16, xc, WY[1] + .02, wc, jamb); box(g, xd, .12, WZ[1] - WZ[0] + .16, xc, WY[0] - .02, wc, jamb);
  for (const z of WZ) box(g, xd, WY[1] - WY[0], .1, xc, wy, z + Math.sign(z - wc) * .01, jamb);
  box(g, xd * .5, WY[1] - WY[0], .05, xc + .05, wy, wc, flat('#e9dcc0'));          // a mullion
  box(g, xd * .5, .05, WZ[1] - WZ[0], xc + .05, wy + .2, wc, flat('#e9dcc0'));
  const out = new THREE.Mesh(new THREE.PlaneGeometry(WZ[1] - WZ[0] + .3, WY[1] - WY[0] + .3),
    vistaMat(dayGardenTex({ seed: 44 }), { yaw: Math.atan2(202.6 - OFF_CAM[0], wc - OFF_CAM[2]), az: Math.PI / 2, el: [-15 * DEG, 30 * DEG], gain: 1.25 }));
  out.position.set(2.6, wy, wc); out.rotation.y = -Math.PI / 2; g.add(out);
  // the desk by the window: a lemon, a lime, two bottles with the same label
  const dk = painted(woodTex({ base: '#7a4a2e', plank: 48 }));
  box(g, 1.3, .07, .72, 1.3, .78, -1.3, dk);
  for (const [x, z] of [[.72, -1.6], [1.88, -1.6], [.72, -1.0], [1.88, -1.0]]) box(g, .07, .75, .07, x, .375, z, dk);
  box(g, 1.2, .05, .02, 1.3, .7, -.95, flat('#e0b050'));
  const lemon = new THREE.Mesh(new THREE.SphereGeometry(.07, 20, 14), flat('#ffd83a')); lemon.scale.set(1.3, 1, 1); lemon.position.set(1.2, .885, -1.08); g.add(lemon);
  const lime = new THREE.Mesh(new THREE.SphereGeometry(.058, 20, 14), flat('#62b83a')); lime.position.set(1.42, .873, -1.08); g.add(lime);
  const lab = labelTex();
  const bottle = (x, col) => {
    const b = new THREE.Group(); b.position.set(x, .815, -1.42); g.add(b);
    const glassM = new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: .9 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .26, 20), glassM); body.position.y = .13; b.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.025, .05, .09, 16), glassM); neck.position.y = .305; b.add(neck);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(.024, .022, .04, 12), flat('#a8784a')); cork.position.y = .37; b.add(cork);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.0765, .0765, .12, 24, 1, true, -Math.PI * .45, Math.PI * .9), new THREE.MeshLambertMaterial({ map: lab })); l.position.y = .13; l.userData.noShadow = true; b.add(l);
    return b;
  };
  bottle(1.19, '#e6c030'); bottle(1.43, '#5aa83a');
  // a brass candlestick: something that glows at the desk in the close-ups
  const cs = new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, .16, 12), flat('#d9a441', { emissive: '#5a3a08' })); cs.position.set(1.85, .9, -1.5); g.add(cs);
  const cf = new THREE.Mesh(new THREE.ConeGeometry(.015, .05, 10), new THREE.MeshBasicMaterial({ color: HDR(3.2, 2.0, .6) })); cf.position.set(1.85, 1.01, -1.5); cf.userData.noShadow = true; g.add(cf); dyn.candle = cf;
  // close to the lens in the wide shot: a ship model on a stand, left edge
  const near = new THREE.Group(); near.position.set(-.95, 0, 1.55); g.add(near);
  box(near, .07, 1.05, .07, 0, .52, 0, dk);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(.12, .07, .55, 12, 1, false, 0, Math.PI), flat('#5a3a2a', { side: THREE.DoubleSide })); hull.rotation.set(0, 0, Math.PI / 2); hull.position.y = 1.14; near.add(hull);
  const ms = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .4, 6), flat('#3a2a20')); ms.position.y = 1.36; near.add(ms);
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(.2, .22), flat('#efe4cc', { side: THREE.DoubleSide })); sl.position.set(0, 1.35, .01); near.add(sl);
  near.traverse(o => { o.userData.noShadow = true; });
  // light: the low sun through the window (warm key), a cool fill, the candle
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c8d0ff', '#6a5a8e', 1.7));
  const sunDir = V(-2.4, -.9, .55).normalize(); dyn.oSun = sunDir;
  const sun = keySpot('#ffb050', 5.0, V(202.6, 1.8, -.8).addScaledVector(sunDir, -8).toArray(), [200.2, .3, -.3], .36, { near: 2, far: 20, penumbra: .25 });
  L.add(sun); L.add(sun.target);
  const cl = new THREE.PointLight('#ffc070', 1.0, 2.2, 1.6); cl.position.set(201.85, 1.05, -1.5); L.add(cl);
  scene.add(L); sets.office = { g, L };
  shadows(g);
  dyn.oBeam = beam(scene, [202.5, 1.85, -.8], V(202.5, 1.85, -.8).addScaledVector(sunDir, 3.2).toArray(), { r0: .55, r1: .9, color: '#ffd090', strength: .14 });
  dyn.lemonP = V(201.2, .9, -1.08); dyn.limeP = V(201.42, .89, -1.08);
}

// ---------------------------------------------------------------- GALLEY (x = 300): the copper pot over the fire
function buildGalley(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), painted(woodTex({ base: '#8a6a4a', plank: 40, rep: [2, 2] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const hullM = painted(woodTex({ base: '#4a5c96', plank: 44, rep: [2, 1] }));     // the ship's side, painted a cool blue
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6), hullM); back.position.set(0, 1.3, -2.0); g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6), hullM); left.position.set(-2.2, 1.3, 0); left.rotation.y = Math.PI / 2; g.add(left);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), painted(woodTex({ base: '#5a4a5a', plank: 96, rep: [1, 3] }))); top.rotation.x = Math.PI / 2; top.position.y = 2.6; g.add(top);
  for (const z of [-1.4, -.2, 1.0]) box(g, 6, .14, .16, 0, 2.52, z, painted(woodTex({ base: '#4a3440' })));
  // a porthole: the night sea (a cool HDR disc that blooms a little), brass ring proud of the wall
  const ph = new THREE.Mesh(new THREE.CircleGeometry(.22, 32), new THREE.MeshBasicMaterial({ color: HDR(.38, .52, 1.15) })); ph.position.set(-1.1, 1.7, -1.98); g.add(ph);
  const pr = new THREE.Mesh(new THREE.TorusGeometry(.24, .04, 8, 32), flat('#d9a441', { emissive: '#3a2604' })); pr.position.set(-1.1, 1.7, -1.95); pr.userData.noShadow = true; g.add(pr);
  // a shelf with copper pans and a row of limes: pattern on the back wall, above the heads
  box(g, 2.2, .05, .28, .9, 2.05, -1.86, painted(woodTex({ base: '#9a6a3e' })));
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.1, .09, .1, 16), flat('#d8843e')); p.position.set(.05 + i * .42, 2.13, -1.86); g.add(p); }
  for (let i = 0; i < 10; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 10), flat('#62b83a')); f.position.set(-.1 + i * .2, 1.73, -1.86); g.add(f); }
  box(g, 2.2, .05, .2, .9, 1.66, -1.9, painted(woodTex({ base: '#9a6a3e' })));
  // the brick stove with an open fire, the copper cauldron on top
  const brick = painted(stoneTex({ base: '#8a4a3a', seam: '#4a2418', bw: 64, bh: 32, rep: [1, 1] }));
  box(g, 1.2, .62, .9, 0, .31, -1.15, brick);
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(.55, .26), new THREE.MeshBasicMaterial({ color: HDR(3.0, 1.45, .4) })); fire.position.set(0, .27, -.69); g.add(fire); dyn.fire = fire;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.4, .32, .5, 28, 1, true), flat('#c88a5a', { side: THREE.DoubleSide })); pot.position.set(0, .87, -1.15); g.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.4, .03, 8, 32), flat('#e8a060')); rim.rotation.x = Math.PI / 2; rim.position.set(0, 1.12, -1.15); g.add(rim);
  const juice = new THREE.Mesh(new THREE.CircleGeometry(.38, 32), flat('#a8c83a')); juice.rotation.x = -Math.PI / 2; juice.position.set(0, 1.04, -1.15); g.add(juice); dyn.juice = juice;
  dyn.potTop = V(300, 1.06, -1.15);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .7, 6), painted(woodTex({ base: '#6e4c30' }))); g.add(stick); dyn.stick = stick;
  // light: the fire is the key (warm, low, shadows up the wall); the porthole a cool patch; a cool fill
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#8f9cff', '#4a3a6a', 2.2));
  const f = new THREE.PointLight('#ffa850', 3.5, 6, 1.3); f.position.set(300, .62, -.42); f.castShadow = true; f.shadow.mapSize.set(1024, 1024); f.shadow.camera.near = .1; f.shadow.camera.far = 10; f.shadow.bias = -.003; f.shadow.normalBias = .04; f.shadow.radius = 4; L.add(f); dyn.fireL = f;
  const pl = new THREE.PointLight('#8aa6ff', 2.5, 3.5, 1.5); pl.position.set(298.9, 1.7, -1.6); L.add(pl);
  scene.add(L); sets.galley = { g, L };
  shadows(g); fire.castShadow = false;
  dyn.gBeam = beam(scene, [298.9, 1.7, -1.95], [299.4, .05, -.4], { r0: .2, r1: .55, color: '#9db4ff', strength: .16 });
}

// ---------------------------------------------------------------- KITCHEN (x = 400): a glass of orange juice by a sunny window
function buildKitchen(scene) {
  const g = new THREE.Group(); g.position.x = 400; scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), painted(tileTex({ a: '#3a8fb8', b: '#f2ead8', ink: '#24304a', rep: [6, 6] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), painted(ciniTex({ kind: 'yildiz', a: '#3f7fd6', b: '#35b3aa', c: '#e0604a', rep: [10, 5] }))); back.position.set(0, 1.5, -2.2); g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), painted(stoneTex({ base: '#a8c8e8', rep: [2, 1] }))); left.position.set(-2.6, 1.5, 0); left.rotation.y = Math.PI / 2; g.add(left);
  const WZ = [-1.6, -.4], WY = [1.0, 2.2], wc = (WZ[0] + WZ[1]) / 2, wy = (WY[0] + WY[1]) / 2;
  const rw = holedWall(6, 3, [WZ[0], WY[0], WZ[1], WY[1]], painted(stoneTex({ base: '#a8c8e8', rep: [1 / 2, 1 / 3] })));
  rw.position.set(2.0, 0, 0); rw.rotation.y = -Math.PI / 2; rw.castShadow = true; g.add(rw);
  const jamb = painted(woodTex({ base: '#f2ead8', plank: 128 })), X0 = 1.94, X1 = 2.3, xc = (X0 + X1) / 2, xd = X1 - X0;
  box(g, xd, .1, WZ[1] - WZ[0] + .14, xc, WY[1] + .02, wc, jamb); box(g, xd, .1, WZ[1] - WZ[0] + .14, xc, WY[0] - .02, wc, jamb);
  for (const z of WZ) box(g, xd, WY[1] - WY[0], .1, xc, wy, z + Math.sign(z - wc) * .01, jamb);
  const out = new THREE.Mesh(new THREE.PlaneGeometry(WZ[1] - WZ[0] + .3, WY[1] - WY[0] + .3),
    vistaMat(dayGardenTex(), { yaw: Math.atan2(402.2 - KIT_CAM[0], wc - KIT_CAM[2]), az: Math.PI / 2, el: [-20 * DEG, 25 * DEG], gain: 1.12 }));
  out.position.set(2.27, wy, wc); out.rotation.y = -Math.PI / 2; g.add(out);
  // a table, a glass of orange juice, half an orange
  const tw = painted(woodTex({ base: '#c08a52', plank: 48 }));
  box(g, 1.1, .06, .7, .1, .74, -1.1, tw);
  for (const [x, z] of [[-.38, -1.38], [.58, -1.38], [-.38, -.82], [.58, -.82]]) box(g, .06, .72, .06, x, .36, z, tw);
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(.055, .045, .16, 24, 1, true), new THREE.MeshLambertMaterial({ color: '#dcecff', transparent: true, opacity: .35, side: THREE.DoubleSide })); gl.position.set(-.05, .85, -1.0); gl.userData.noShadow = true; g.add(gl);
  const oj = new THREE.Mesh(new THREE.CylinderGeometry(.05, .042, .12, 24), flat('#ff9a1e')); oj.position.set(-.05, .832, -1.0); g.add(oj); dyn.oj = oj;
  const ho = new THREE.Mesh(new THREE.SphereGeometry(.06, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), flat('#ff8a1a')); ho.position.set(.22, .77, -1.12); g.add(ho);
  const hc = new THREE.Mesh(new THREE.CircleGeometry(.056, 20), flat('#ffd070')); hc.rotation.x = -Math.PI / 2; hc.position.set(.22, .772, -1.12); g.add(hc);
  dyn.ojTop = V(399.95, .9, -1.0);
  // a plant pot near the lens at the frame edge
  const pp = new THREE.Mesh(new THREE.CylinderGeometry(.12, .09, .2, 16), flat('#c8663a')); pp.position.set(-.75, .84, .25); pp.userData.noShadow = true; g.add(pp);
  const bush = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12), flat('#3f9a48')); bush.position.set(-.75, 1.03, .25); bush.userData.noShadow = true; g.add(bush);
  box(g, .5, .04, .5, -.75, .72, .25, tw).userData.noShadow = true;
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#d4dcff', '#a096b8', 2.4));
  const sunDir = V(-2.2, -.75, .2).normalize(); dyn.kSun = sunDir;
  const sun = new THREE.DirectionalLight('#ffd89c', 3.6); sun.position.copy(V(402.2, 1.6, -1.0).addScaledVector(sunDir, -6)); sun.target.position.set(402.2, 1.6, -1.0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: .5, far: 16 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02; sun.shadow.radius = 3;
  L.add(sun); L.add(sun.target);
  scene.add(L); sets.kitchen = { g, L };
  shadows(g);
  dyn.kBeam = beam(scene, [402.1, 1.6, -1.0], V(402.1, 1.6, -1.0).addScaledVector(sunDir, 3.0).toArray(), { r0: .55, r1: .75, color: '#ffe9b8', strength: .13 });
}

// ---------------------------------------------------------------- CAST
export const LOOK = {
  denizci1: { hat: 'sailor', cloth: '#e9edf5', clothDark: '#a8acc8', pattern: 'stripes', mustache: true, hair: '#4a3020', height: 1.68 },
  denizci2: { hat: 'sailor', cloth: '#3a5aa8', buttons: '#e8b84a', height: 1.6, headW: 262, headH: 246 },
  amiral1: { hat: 'bicorne', cloth: '#26305a', trim: '#e8b84a', buttons: '#e8b84a', sash: '#c8323a', mustache: '#cfc6bc', height: 1.74 },
  amiral2: { hat: 'bicorne', hatColor: '#3a2a5a', cloth: '#3a2a5a', trim: '#e8b84a', buttons: '#e8b84a', beard: '#e4ded6', beardLen: .55, height: 1.66, headW: 268 },
  asci: { hat: 'cook', cloth: '#c8643a', apron: true, height: 1.62, mustache: true, hair: '#4a3020' },
  cocuk: { cloth: '#ff9a3a', hair: '#5a3a28', height: 1.32, headW: 262, headH: 246 },
  kutup: { hat: 'knit', cloth: '#3a7ab8', clothDark: '#22467a', mustache: true, hair: '#6a4a30', height: 1.66 },
};

// ---------------------------------------------------------------- CAMERA
function cameraPath() {
  const t = W;
  const keys = [
    // hook: a sailor drinks his juice -> cheers -> the admiral with a lime -> the sailor, worried
    { t: 0, pos: [.62, 1.42, 1.55], look: [.05, 1.42, -.9], fov: 44, creep: .3, drift: .05 },
    { t: t('yendi,') + .1, dur: .45, pos: [1.6, 1.6, 3.3], look: [.2, 1.55, -1.0], fov: 52, creep: .28 },
    { t: t('onu') + .25, dur: .45, pos: [3.45, 1.55, 1.0], look: [2.55, 1.5, -1.3], fov: 44, creep: .3 },
    { t: t('geri') + .12, dur: .35, pos: [.32, 1.5, 1.0], look: [.05, 1.52, -.9], fov: 40, creep: .3 },
    // "Bakın": the deck again, two sailors at the barrel
    { t: t('Bakın') + .22, dur: .3, move: 'whip', pos: [-.6, 1.85, 3.9], look: [.75, 1.45, -1.5], fov: 52, creep: .24 },
    { t: t('iskorbüt') + .5, dur: 1.1, pos: [1.25, 1.55, 1.75], look: [.65, 1.5, -1.3], fov: 46, creep: .26 },
    // the Admiralty: two admirals laugh; the talker; the desk
    { t: t('Sonra', 2) + .2, dur: .32, move: 'whip', pos: OFF_CAM, look: [200.1, 1.4, -.6], fov: 50, creep: .26 },
    { t: t('Misket') + .5, dur: .9, pos: [199.75, 1.6, 1.45], look: [199.45, 1.55, -.6], fov: 44, creep: .26 },
    { t: t('Ama') + .4, dur: .55, pos: [201.31, 1.28, -.05], look: [201.31, .9, -1.15], fov: 40, creep: .3 },
    // the galley: the copper pot
    { t: t('Üstelik', 2) + .2, dur: .3, move: 'whip', pos: [299.55, 1.65, 1.95], look: [300.1, 1.05, -1.0], fov: 48, creep: .26 },
    { t: t('kalanı') + .3, dur: 1.0, pos: [300.1, 1.95, .35], look: [300, 1.02, -1.15], fov: 44, creep: .3 },
    // analogy: the one hard cut
    { t: t('Tıpkı'), move: 'cut', pos: KIT_CAM, look: [400.2, 1.0, -1.0], fov: 46, creep: .26 },
    { t: t('bekledikçe') + .2, dur: 1.0, pos: [399.75, 1.15, -.2], look: [399.97, .88, -1.0], fov: 42, creep: .3 },
    // steamships: the deck with the funnel, wide
    { t: t('Gemiler') + .2, dur: .32, move: 'whip', pos: [5.4, 2.6, 4.6], look: [1.0, 2.6, -1.8], fov: 56, creep: .22 },
    // the polar voyage
    { t: t('Ta') + .22, dur: .32, move: 'whip', pos: [501.4, 1.7, 2.6], look: [500.3, 1.55, -.9], fov: 50, creep: .26 },
    { t: t('dişleri') + .1, dur: .9, pos: [500.42, 1.56, .75], look: [500.2, 1.57, -.9], fov: 40, creep: .3 },
    // payoff: the two bottles, the same label
    { t: t('Yani') + .22, dur: .32, move: 'whip', pos: [201.31, 1.2, -.12], look: [201.31, .97, -1.42], fov: 40, creep: .26 },
    { t: t('Sadece') + .3, dur: 1.0, pos: [201.31, 1.22, -.4], look: [201.31, .97, -1.42], fov: 38, creep: .18 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t('çağırdı.') + .03, .8); cp.kick(t('sallanana') + .05, 1.0);
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  W = wordTimes(ctx.words);
  DUR = Math.ceil((ctx.words[ctx.words.length - 1].end + .6) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#1a1f3a');
  sets.deck = buildDeck(scene, 0, false); sets.ice = buildDeck(scene, 500, true);
  buildOffice(scene); buildGalley(scene); buildKitchen(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  dyn.armC = new Arm3D(scene, cast.asci);
  // smoke and specks
  smokes.steam = new Smoke(scene, { color: '#d8d2dc', maxPoints: 1600, H: ctx.H });
  for (let k = 0; k < 5; k++) smokes.steam.wisps.push({ n: 50, size: .25, alpha: .2, speed: .22, seed: k, on: t => t >= W('Üstelik', 2) - .4 && t < W('Tıpkı'),
    path: (u, t) => { const a = dyn.potTop, s = k * 1.3; return [a.x + Math.sin(u * 5 + s + t * 1.6) * .18 * u + (k - 2) * .08, a.y + u * 1.4, a.z + Math.cos(u * 4 + s + t) * .14 * u]; } });
  smokes.funnel = new Smoke(scene, { color: '#b9adb8', maxPoints: 1400, H: ctx.H });
  for (let k = 0; k < 4; k++) smokes.funnel.wisps.push({ n: 80, size: .9, alpha: .3, speed: .2, seed: k, on: t => t >= W('Gemiler') - .4 && t < W('Ta'),
    path: (u, t) => [3.8 + Math.sin(u * 4 + k + t) * .3 - u * 6, 6.1 + u * 3 + Math.sin(u * 7 + k) * .3, -2.2 + Math.cos(u * 3 + k) * .4 + u * 1.5] });
  // the "hidden substance": bright specks around the fruit. A lemon has many, a lime few; in the pot and the glass they fade.
  smokes.vit = new Smoke(scene, { color: '#fff2b0', maxPoints: 900, H: ctx.H, additive: true, near: .25 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const orbit = (c, n, r, on, fade) => smokes.vit.wisps.push({ n, size: .012, alpha: .9, speed: .08, on, fade,
    path: (u, t, i) => { const a = hash(i, 1) * 6.28 + t * (.6 + hash(i, 2)), e = (hash(i, 3) - .5) * 2.2, rr = r * (.8 + hash(i, 4) * .7); return [c.x + Math.cos(a) * Math.cos(e) * rr, c.y + Math.sin(e) * rr * .8 + Math.sin(t * 2 + i) * .004, c.z + Math.sin(a) * Math.cos(e) * rr]; } });
  const deskOn = t => t >= W('Ama') && t < W('Üstelik', 2);
  orbit(dyn.lemonP, 70, .1, deskOn);
  orbit(dyn.limeP, 9, .085, deskOn, t => 1 - .5 * ramp(t, W('az.') - .1, W('az.') + .4));
  smokes.vit.wisps.push({ n: 50, size: .02, alpha: .9, speed: .35, on: t => t >= W('Üstelik', 2) - .3 && t < W('Tıpkı'),       // specks leave the pot with the steam and go out
    fade: t => 1 - ramp(t, W('yok', 2) - .2, W('oluyor.', 2) + .2),
    path: (u, t, i) => { const a = dyn.potTop; return [a.x + (hash(i, 1) - .5) * .5 + Math.sin(u * 6 + i) * .06, a.y + u * 1.1, a.z + (hash(i, 2) - .5) * .4]; } });
  orbit(dyn.ojTop, 40, .1, t => t >= W('Tıpkı') && t < W('Gemiler'), t => 1 - .9 * ramp(t, W('gücünü') - .1, W('gibi.') + .2));
  // snow on the ice deck, dust in the office sunbeam
  smokes.snow = new Smoke(scene, { color: '#f2f4ff', maxPoints: 800, H: ctx.H, additive: true, near: 1.2 });
  smokes.snow.wisps.push({ n: 500, size: .02, alpha: .7, speed: .06, on: t => t >= W('Ta') - .4 && t < W('Yani'),
    path: (u, t, i) => [500 + (hash(i, 1) - .5) * 7 + Math.sin(t * .7 + i) * .2 - u * .6, 4.5 - u * 4.6, (hash(i, 2) - .5) * 6 + Math.cos(t * .5 + i) * .2] });
  smokes.motes = new Smoke(scene, { color: '#fff0d0', maxPoints: 400, H: ctx.H, additive: true, near: 1.8 });
  smokes.motes.wisps.push({ n: 140, size: .008, alpha: .45, speed: .05, on: t => t >= W('Sonra', 2) - .4 && t < W('Üstelik', 2) || t >= W('Yani'),
    path: (u, t, i) => [201.2 + (hash(i, 1) - .5) * 2.2 + Math.sin(t * .5 + i) * .06, 1.4 + (hash(i, 2) - .5) * 1.6 + (u - .5) * .4, -.6 + (hash(i, 3) - .5) * 1.6] });
  // the steamer's speed: wind ribbons streaming past the rail
  dyn.ribbons = [0, 1, 2, 3].map(i => ribbon(scene, [[8, 1.6 + i * .5, -2.6 + i * .7], [3, 1.9 + i * .45, -2.4 + i * .6], [-2, 2.2 + i * .4, -2.2 + i * .5], [-8, 2.4 + i * .4, -2.0 + i * .5]], { radius: .05 }));
  dyn.cam = cameraPath();
  // sound cues
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(W('Sonra', 2) - .1, 'whoosh'); cue(W('Üstelik', 2) - .1, 'whoosh'); cue(W('Gemiler') - .1, 'whoosh');
  cue(W('Bakın') - .1, 'rise', { dur: .5 }); cue(W('Ta') - .1, 'rise', { dur: .5 }); cue(W('Yani') - .1, 'rise', { dur: .5 });
  cue(W('çağırdı.') + .03, 'boom'); cue(W('sallanana') + .05, 'boom');
  cue(W('gülüyor:') - .1, 'laugh', { dur: W('Ama') - .2 - W('gülüyor:') });
  cue(W('gizli') - .05, 'shimmer'); cue(W('Üstelik', 2), 'simmer', { dur: W('Tıpkı') - W('Üstelik', 2) }); cue(W('kaynatılıyor') - .1, 'stir', { dur: 1.4 });
  cue(W('Tıpkı'), 'cut'); cue(W('Gemiler'), 'wind', { dur: W('Ta') - W('Gemiler') }); cue(W('Ta'), 'wind', { dur: W('Yani') - W('Ta') });
  cue(W('adı') - .05, 'shimmer');
}

// ---------------------------------------------------------------- PER FRAME
const SETS = ['deck', 'office', 'galley', 'kitchen', 'ice'];
const vis = (set, on) => { sets[set].g.visible = on; sets[set].L.visible = on; };
const WARM = '#ffb45a', NIGHT = '#d6d1f2', DAY = '#e8e3f4';
export function frame(t, ctx) {
  const { cam, env } = ctx;
  const cp = dyn.cam.apply(cam, t);
  const x = cam.position.x;
  const where = x < 100 ? 'deck' : x < 250 ? 'office' : x < 350 ? 'galley' : x < 450 ? 'kitchen' : 'ice';
  for (const s of SETS) vis(s, s === where);
  const T = W, A = (w, n) => W(w, n) - 2 / FPS;
  const steam = t >= T('Gemiler') - .5 && t < T('Ta');
  sets.deck.funnel.visible = steam;
  sets.deck.sea.offset.x = t * (steam ? .012 : .002); sets.ice.sea.offset.x = t * .002;
  dyn.ribbons.forEach((r, i) => { r.material.uniforms.uT.value = t * 2.2; r.material.uniforms.uOn.value = steam ? ramp(t, T('Gemiler') - .2 + i * .1, T('hızlandığı') + .3 + i * .1) : 0; r.visible = where === 'deck' && steam; });
  dyn.oBeam.visible = where === 'office'; dyn.gBeam.visible = where === 'galley'; dyn.kBeam.visible = where === 'kitchen';
  for (const s of [sets.deck, sets.ice]) { const f = 1 + .08 * Math.sin(t * 23) * Math.sin(t * 13); s.lan.light.intensity = (s === sets.ice ? 10 : 9) * f; s.lan.rotation.z = .04 * Math.sin(t * 1.3); }
  if (where === 'galley') { const f = 1 + .18 * Math.sin(t * 19) * Math.sin(t * 7.3); dyn.fireL.intensity = 3.5 * f; dyn.fire.material.color.setRGB(3.0 * f, 1.45 * f, .4); }
  if (where === 'kitchen') dyn.oj.material.color.set(new THREE.Color('#ff9a1e').lerp(new THREE.Color('#d8a060'), .45 * ramp(t, T('gücünü') - .1, T('gibi.') + .2)));
  if (where === 'galley') dyn.juice.material.color.set(new THREE.Color('#a8c83a').lerp(new THREE.Color('#8a7a3a'), ramp(t, T('kalanı') - .1, T('oluyor.', 2) + .2)));
  dyn.candle.scale.set(1, 1 + .15 * Math.sin(t * 29) * Math.sin(t * 13), 1);
  // ---- cast
  for (const c of Object.values(cast)) c.hide();
  dyn.armC.hide();
  const tint = FACE[where].map((v, i) => v / GRADE[where][i]);
  const bl = (seed, ...swaps) => blinkAt(t, seed, swaps, FPS);
  if (where === 'deck' && !steam && t < T('Sonra', 2) + .1) {
    const lan = sets.deck.lanternPos;
    const hook = t < T('Bakın') + .05;
    if (hook) {
      // denizci1 drinks, cheers on "yendi", worried on "geri çağırdı"
      const cheer = t > A('yendi,') && t < A('geri'), worry = t >= A('geri');
      cast.denizci1.show(); cast.denizci1.place(.05, 0, -.9, cam, tint);
      const drink = ramp(t, 0, .6) * (1 - ramp(t, A('yendi,') - .1, A('yendi,')));
      cast.denizci1.draw({ expr: worry ? 'worried' : cheer ? 'grin' : 'smile', look: worry ? .2 : .55, lookY: cheer ? -.3 : 0, blink: bl(1, A('yendi,'), A('geri')), sweat: worry ? 1 : 0,
        armR: cheer ? [150, 20] : [lerpN(30, 95, drink), lerpN(40, 100, drink)], propR: 'cup', armL: worry ? [70, 120] : [18, 12], lean: worry ? -3 : 0, tilt: worry ? -4 : 0,
        lit: -1, shade: NIGHT, rim: { color: WARM, a: .4 } });
      cast.denizci1.castFrom(lan);
      cast.denizci2.show(); cast.denizci2.place(.95, 0, -1.2, cam, tint);
      cast.denizci2.draw({ expr: cheer ? 'laugh' : worry ? 'surprised' : 'smile', look: -.4, blink: bl(2, A('yendi,'), A('geri')), armL: cheer ? [150, 30] : [20, 10], armR: [26, 60], propR: 'cup', bob: cheer ? Math.abs(Math.sin(t * 14)) * -10 : 0,
        lit: -1, shade: NIGHT, rim: { color: WARM, a: .35 } });
      cast.denizci2.castFrom(lan);
      cast.amiral1.show(); cast.amiral1.place(2.55, 0, -1.35, cam, tint);
      cast.amiral1.draw({ expr: t > A('kendi') ? 'smug' : 'neutral', look: -.5, brow: .4, blink: bl(3, A('kendi')), armR: [lerpN(16, 110, ramp(t, A('kendi'), A('kendi') + .3)), 60], propR: 'lime', armL: [18, 20],
        lit: -1, shade: NIGHT, rim: { color: WARM, a: .3 } });
      cast.amiral1.castFrom(lan);
    } else {
      // two sailors at the barrel, happy and healthy
      const proud = t > A('iskorbüt');
      cast.denizci1.show(); cast.denizci1.place(.45, 0, -1.25, cam, tint);
      const sip = .5 + .5 * Math.sin((t - T('içiyor')) * 3);
      cast.denizci1.draw({ expr: proud ? 'proud' : 'smile', look: .45, blink: bl(1, A('iskorbüt')), armR: t > A('içiyor') && !proud ? [lerpN(40, 95, sip), lerpN(50, 100, sip)] : [30, 50], propR: 'cup', armL: [18, 10],
        lit: -1, shade: NIGHT, rim: { color: WARM, a: .4 } });
      cast.denizci1.castFrom(lan);
      cast.denizci2.show(); cast.denizci2.place(1.85, 0, -1.45, cam, tint);
      cast.denizci2.draw({ expr: proud ? 'grin' : 'smile', look: -.5, blink: bl(2, A('iskorbüt')), armL: proud ? [140, 40] : [24, 30], propL: proud ? 'lemon' : undefined, armR: [26, 60], propR: 'cup',
        lit: -1, shade: NIGHT, rim: { color: WARM, a: .35 } });
      cast.denizci2.castFrom(lan);
    }
  } else if (where === 'deck') {
    // steamship years: the sailors shrug, all is well
    const lan = sets.deck.lanternPos;
    cast.denizci1.show(); cast.denizci1.place(.2, 0, -1.0, cam, tint);
    cast.denizci1.draw({ expr: t > A('kimse') ? 'smug' : 'smile', look: .5, blink: bl(1, A('kimse')), armR: [30, 50], propR: 'cup', armL: t > A('kimse') ? [80, -60] : [18, 10], lit: -1, shade: NIGHT, rim: { color: WARM, a: .4 } });
    cast.denizci1.castFrom(lan);
    cast.denizci2.show(); cast.denizci2.place(1.5, 0, -1.3, cam, tint);
    cast.denizci2.draw({ expr: 'smile', look: -.5, blink: bl(2, A('kimse')), armL: [24, 30], armR: t > A('kimse') ? [80, -60] : [26, 60], propR: 'cup', lit: -1, shade: NIGHT, rim: { color: WARM, a: .35 } });
    cast.denizci2.castFrom(lan);
  } else if (where === 'office') {
    const desk = (t >= T('Ama') - .1 && t < T('Üstelik', 2)) || t >= T('Yani');
    if (!desk) {
      const talk = t > A('Misket') - .05 && t < A('yetişiyor."') + .5;
      const laugh = t > A('gülüyor:') && t < A('Ama');
      cast.amiral1.show(); cast.amiral1.place(199.45, 0, -.6, cam, tint);
      cast.amiral1.draw({ mouth: talk ? flap(env, t) : 0, expr: talk ? 'smug' : laugh ? 'laugh' : 'neutral', blink: bl(3, A('gülüyor:'), A('Misket') - .05), look: .5, brow: talk ? .6 : 0, laughMarks: laugh && !talk ? .8 : 0,
        armR: talk ? [lerpN(30, 120, ramp(t, A('adalarda') - .2, A('adalarda') + .1)), 50] : [18, 10], propR: 'lime', armL: [talk ? 70 + Math.sin(t * 7) * 12 : 18, talk ? 40 : 10], lean: talk ? 3 + Math.sin(t * 5) * 1.5 : 0, bob: laugh && !talk ? Math.abs(Math.sin(t * 14)) * -10 : 0,
        lit: 1, shade: DAY, rim: { color: '#ffb860', a: .42 } });
      cast.amiral1.castFrom(dyn.oSun, true);
      cast.amiral2.show(); cast.amiral2.place(200.45, 0, -.85, cam, tint);
      cast.amiral2.draw({ expr: laugh ? 'laugh' : 'smile', look: -.45, blink: bl(4, A('gülüyor:'), A('Ama')), mouth: laugh ? .5 + .5 * Math.abs(Math.sin(t * 13)) : 0, laughMarks: laugh ? .9 : 0,
        armL: [laugh ? 150 : 20, laugh ? 20 : 10], armR: [30, 40], lean: laugh ? -4 + Math.sin(t * 9) * 3 : 0, bob: laugh ? Math.abs(Math.sin(t * 13 + 1)) * -12 : 0,
        lit: 1, shade: DAY, rim: { color: '#ffb860', a: .42 } });
      cast.amiral2.castFrom(dyn.oSun, true);
    }
  } else if (where === 'galley') {
    const stirT = Math.max(0, t - (T('Üstelik', 2) - .3)), a = stirT * 5;
    dyn.stick.position.set(300 + Math.cos(a) * .14, 1.25, -1.15 + Math.sin(a) * .14); dyn.stick.rotation.set(Math.sin(a) * .3, 0, -Math.cos(a) * .3);
    cast.asci.show(); cast.asci.place(300.62, 0, -.72, cam, tint);
    const gone = t > A('yok', 2);
    cast.asci.draw({ expr: gone ? 'surprised' : t > A('kaynatılıyor') ? 'focused' : 'smile', look: -.75, lookY: .6, blink: bl(5, A('kaynatılıyor'), A('yok', 2)), noArmR: true, armL: [18, 12], sweat: gone ? .8 : 0,
      lit: -1, shade: '#e4d8ee', rim: { color: '#ff9a50', a: .45 } });
    dyn.stick.updateMatrixWorld(); dyn.armC.set(-1, dyn.stick.localToWorld(V(0, .3, 0)), { sag: .05, tint });
    cast.asci.castFrom(V(300, .62, -.42));
  } else if (where === 'kitchen') {
    cast.cocuk.show(); cast.cocuk.place(400.55, 0, -.75, cam, tint);
    const lost = t > A('kaybetmesi');
    cast.cocuk.draw({ expr: lost ? 'worried' : t > A('bekledikçe') ? 'focused' : 'smile', look: -.7, lookY: .7, gazeX: -.6, gazeY: .6, blink: bl(6, A('bekledikçe'), A('kaybetmesi')), armL: [30, 40], armR: [18, 10], brow: lost ? .5 : 0,
      lit: 1, shade: DAY, rim: { color: '#ffe2a0', a: .4 } });
    cast.cocuk.castFrom(dyn.kSun, true);
  } else if (where === 'ice') {
    const lan = sets.ice.lanternPos, shake = t > A('sallanana');
    cast.kutup.show(); cast.kutup.place(500.2, 0, -.9, cam, tint);
    cast.kutup.draw({ expr: shake ? 'surprised' : t > A('dişleri') ? 'worried' : 'neutral', look: .35, blink: bl(7, A('dişleri'), A('sallanana')), sweat: shake ? 1 : 0, mouth: shake ? .7 : 0,
      armL: t > A('dişleri') ? [62, 128] : [18, 10], armR: [22, 12], tilt: shake ? Math.sin(t * 40) * 3 : 0, lean: shake ? -2 : 0,
      lit: -1, shade: '#d2d0f4', rim: { color: WARM, a: .42 } });
    cast.kutup.castFrom(lan);
  }
  for (const s of Object.values(smokes)) s.update(t);
  // ---- look
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (where === 'deck') look = { ...focusOn(steam ? V(.8, 1.5, -1.2) : t < T('Bakın') ? V(.3, 1.5, -1.0) : V(1.1, 1.5, -1.3), steam ? 3 : 6, 3), sat: 1.2, lift: [.105, .092, .175], bloom: .85, vignette: .24 };
  else if (where === 'office') {
    const desk = (t >= T('Ama') - .1 && t < T('Üstelik', 2)) || t >= T('Yani');
    look = { ...focusOn(desk ? V(201.3, .92, -1.2) : V(199.9, 1.4, -.7), desk ? 10 : 6, desk ? .6 : 2.5), sat: 1.25, lift: [.1, .09, .16], bloom: .75, vignette: .18 };
  } else if (where === 'galley') look = { ...focusOn(V(300.3, 1.1, -1.0), 6, 2), sat: 1.25, lift: [.11, .095, .19], bloom: .9, vignette: .16 };
  else if (where === 'kitchen') look = { ...focusOn(t < T('bekledikçe') ? V(400.2, 1.0, -.9) : dyn.ojTop, t < T('bekledikçe') ? 6 : 10, t < T('bekledikçe') ? 2.5 : .7), sat: 1.45, lift: [.098, .09, .15], bloom: .7, vignette: .18 };
  else look = { ...focusOn(V(500.2, 1.5, -.9), 6, 2.5), sat: 1.15, lift: [.11, .1, .2], bloom: .9, vignette: .22 };
  look.tint = GRADE[where];
  look.blur = cp.moving > .15 ? 16 : 0;
  look.flash = t >= T('Tıpkı') && t < T('Tıpkı') + 2 / FPS ? .35 : 0;
  return look;
}
const GRADE = { deck: [1, .98, 1.03], office: [1.04, 1.0, .95], galley: [1.0, .97, 1.02], kitchen: [1.03, 1.0, .95], ice: [.96, .97, 1.08] };
const FACE = { deck: [1, .985, .96], office: [1, .99, .96], galley: [1, .98, .95], kitchen: [1, 1, .985], ice: [.95, .97, 1] };
