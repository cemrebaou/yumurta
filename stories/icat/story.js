// İcat — a silent animation (no captions, no audio in the file) timed to the user's audio, which they add with
// YouTube's own remix tool. words.json holds only segment ids (s1..s23) and their times, not the words.
// Sets: LAB (x=0, an inventor's room at night: one candle, a moonlit window, the wife at the door; then the bulb),
// BED (x=200, a bedroom at night: a wall telephone, the husband shouting into it, the wife in bed).
import * as THREE from 'three';
import { stoneTex, woodTex, carpetTex, painted, flat, rng, D } from '../../engine/src/paint.js';
import { Toon, flap, blinkAt } from '../../engine/src/toon.js';
import { CamPath, smoother } from '../../engine/src/camera.js';
import { beam } from '../../engine/src/fx.js';

export const NAME = 'icat';
export const FPS = 30;
export let DUR = 56.6;
export const CUES = [];

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
let W, E, cast = {}, sets = {}, dyn = {};
const inSeg = (t, n) => t >= W('s' + n) - .05 && t < E('s' + n) + .15;
const any = (t, ...ns) => ns.some(n => inSeg(t, n));

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
function nightWindow(g, x, y, z, ry = 0) {
  const tex = canvasTex(512, 640, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, D('#1a2060')); gr.addColorStop(1, D('#4a3a8a')); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const R = rng(4); for (let i = 0; i < 90; i++) { c.fillStyle = D('#fff6dc', .4 + R() * .6); c.beginPath(); c.arc(R() * w, R() * h * .8, 1.6, 0, 6.29); c.fill(); }
    c.fillStyle = D('#f2f0dc'); c.beginPath(); c.arc(w * .68, h * .26, 56, 0, 6.29); c.fill();
    c.fillStyle = D('#2a2050'); for (let i = 0; i < 9; i++) { const bw = 40 + R() * 50, bh = 60 + R() * 140; c.fillRect(i * 60 - 10, h - bh, bw, bh); }
  });
  const win = new THREE.Group(); win.position.set(x, y, z); win.rotation.y = ry; g.add(win);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.25), new THREE.MeshBasicMaterial({ map: tex, color: HDR(1.3, 1.3, 1.5) })); pane.userData.noShadow = true; win.add(pane);
  const fm = flat('#3a2418');
  box(win, 1.12, .08, .08, 0, .64, .02, fm); box(win, 1.12, .08, .08, 0, -.64, .02, fm); box(win, .08, 1.3, .08, -.54, 0, .02, fm); box(win, .08, 1.3, .08, .54, 0, .02, fm);
  box(win, .04, 1.25, .05, 0, 0, .02, fm); box(win, 1.05, .04, .05, 0, .05, .02, fm);
  return win;
}

// ---------------------------------------------------------------- LAB (x = 0)
function buildLab(scene) {
  const g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), painted(woodTex({ base: '#6a4a3a', plank: 48, rep: [3, 3] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const wall = painted(stoneTex({ base: '#8a6a5a', seam: '#5a3a3a', bw: 96, bh: 48, rep: [5, 2] }));
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wall); bw.position.set(0, 2, -2); g.add(bw);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wall); rw.position.set(2.6, 2, 2); rw.rotation.y = -Math.PI / 2; g.add(rw);
  nightWindow(g, -1.2, 1.9, -1.98);
  // the doorway on the right wall (the wife appears there)
  box(g, .06, 2.2, 1.0, 2.58, 1.1, .6, flat('#1a1424'));
  for (const z of [.08, 1.12]) box(g, .1, 2.3, .08, 2.56, 1.15, z, flat('#4a2a1a'));
  box(g, .1, .08, 1.12, 2.56, 2.28, .6, flat('#4a2a1a'));
  // the desk: papers, jars, coiled wire, the candle
  const wood = painted(woodTex({ base: '#7a4a2e' }));
  box(g, 1.8, .07, .8, 0, .78, -1.3, wood);
  for (const [x, z] of [[-.82, -1.65], [.82, -1.65], [-.82, -.95], [.82, -.95]]) box(g, .06, .76, .06, x, .38, z, flat('#4a2a1a'));
  const R = rng(5);
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.22, .3), flat('#f2ead8', { side: THREE.DoubleSide })); p.rotation.set(-Math.PI / 2, 0, (R() - .5) * .8); p.position.set(-.6 + R() * 1.0, .82 + i * .002, -1.4 + R() * .3); g.add(p); }
  for (let i = 0; i < 5; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .14 + R() * .1, 10), new THREE.MeshLambertMaterial({ color: ['#6ab0a0', '#a870c8', '#e0b050'][i % 3], transparent: true, opacity: .8 })); j.position.set(.35 + i * .1, .89, -1.55); g.add(j); }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(.08, .025, 8, 20), flat('#c87a3a')); coil.position.set(-.55, .86, -1.5); coil.rotation.x = Math.PI / 2; g.add(coil);
  // shelves with more glass on the back wall
  for (const y of [1.6, 2.2]) { box(g, 1.2, .04, .25, 1.4, y, -1.87, wood); for (let k = 0; k < 4; k++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .18, 10), flat(['#6ab0a0', '#a870c8', '#e0b050', '#c85a5a'][(k + y * 10) % 4])); j.position.set(1.0 + k * .25, y + .11, -1.85); g.add(j); } }
  // the candle on the desk
  const cnd = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .16, 10), flat('#f7f3ea')); cnd.position.set(-.25, .9, -1.2); g.add(cnd);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), glowM(4, 2.6, 1)); flame.scale.y = 1.8; flame.position.set(-.25, 1.01, -1.2); flame.userData.noShadow = true; g.add(flame); dyn.flame = flame;
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#5a5aa0', '#2a1a2a', 1.0));
  const cl = new THREE.PointLight('#ffb060', 6, 6, 1.4); cl.position.set(-.25, 1.1, -1.1); cl.castShadow = true; cl.shadow.mapSize.set(1024, 1024); cl.shadow.camera.near = .05; cl.shadow.camera.far = 8; cl.shadow.bias = -.003; cl.shadow.normalBias = .04; L.add(cl); dyn.candleL = cl;
  const moon = new THREE.PointLight('#8aa0ff', 2.2, 5, 1.4); moon.position.set(-1.2, 1.9, -1.6); L.add(moon);
  // the bulb's light (off until it is found)
  const bl = new THREE.PointLight('#fff0b0', 0, 9, 1.2); bl.position.set(.5, 1.7, -.3); bl.castShadow = true; bl.shadow.mapSize.set(1024, 1024); bl.shadow.camera.near = .05; bl.shadow.camera.far = 9; bl.shadow.bias = -.003; bl.shadow.normalBias = .04; L.add(bl); dyn.bulbL = bl;
  scene.add(L); sets.lab = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- BED (x = 200): the bedroom with the telephone
function buildBed(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), painted(carpetTex({ base: '#6a3a4a', band: '#c8963a', rep: [2, 2] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const wallTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = D('#4a5a8a'); c.fillRect(0, 0, w, h); c.fillStyle = D('#5a6a9a'); for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 26, h); });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(5, 2);
  const wm = new THREE.MeshLambertMaterial({ map: wallTex });
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wm); bw.position.set(0, 2, -2); g.add(bw);
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wm); lw.position.set(-2.4, 2, 2); lw.rotation.y = Math.PI / 2; g.add(lw);
  nightWindow(g, 1.4, 1.9, -1.98);
  // the bed (headboard to the left wall), the wife sits in it
  const wood = painted(woodTex({ base: '#6a3a2a' }));
  box(g, 2.0, .4, 1.4, -1.2, .3, -.9, wood);
  box(g, 1.9, .16, 1.32, -1.2, .58, -.9, flat('#f2ead8'));
  box(g, 1.1, .1, 1.36, -.85, .7, -.9, flat('#c8433a'));
  box(g, .1, 1.2, 1.4, -2.25, .7, -.9, wood);
  const pil = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 10), flat('#f2ead8')); pil.scale.set(.6, .35, 1); pil.position.set(-1.95, .75, -.9); g.add(pil);
  // the night stand with an oil lamp
  box(g, .5, .6, .45, -.05, .3, -1.7, wood);
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .1, 14), flat('#e8b84a')); lb.position.set(-.05, .65, -1.7); g.add(lb);
  const lg = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .22, 14), new THREE.MeshBasicMaterial({ color: HDR(2.6, 1.8, .9), transparent: true, opacity: .85 })); lg.position.set(-.05, .81, -1.7); lg.userData.noShadow = true; g.add(lg); dyn.lampGlass = lg;
  // the wall telephone: a wooden box, two bells, a crank, the mouthpiece; the cord to the earpiece
  const ph = new THREE.Group(); ph.position.set(1.0, 1.35, -1.95); g.add(ph);
  box(ph, .34, .55, .14, 0, 0, .07, painted(woodTex({ base: '#8a4a2a' })));
  for (const x of [-.08, .08]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat('#e8b84a')); b.position.set(x, .2, .15); b.rotation.x = Math.PI / 2; ph.add(b); dyn.bells = (dyn.bells || []).concat(b); }
  const mp = new THREE.Mesh(new THREE.ConeGeometry(.05, .12, 12, 1, true), flat('#2a2440', { side: THREE.DoubleSide })); mp.rotation.x = -Math.PI / 2; mp.position.set(0, .0, .22); ph.add(mp);
  const cr = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .14, 6), flat('#2a2440')); cr.rotation.z = Math.PI / 2; cr.position.set(.22, 0, .1); ph.add(cr);
  box(ph, .14, .1, .1, 0, -.3, .12, painted(woodTex({ base: '#8a4a2a' })));
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#5a6ab0', '#2a1a2a', 1.0));
  const lamp = new THREE.PointLight('#ffb060', 5.5, 6, 1.4); lamp.position.set(199.95, .95, -1.6); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.camera.near = .05; lamp.shadow.camera.far = 8; lamp.shadow.bias = -.003; lamp.shadow.normalBias = .04; L.add(lamp); dyn.lamp = lamp;
  const moon = new THREE.PointLight('#8aa0ff', 2.4, 5, 1.4); moon.position.set(201.4, 1.9, -1.6); L.add(moon);
  scene.add(L); sets.bed = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- CAST (generic characters, no resemblance to anyone real)
export const LOOK = {
  mucit1: { cloth: '#5a4a3a', clothDark: '#3a2a20', sash: '#c8433a', hair: '#8a8898', mustache: '#8a8898', height: 1.72, headW: 266 },
  karisi1: { cloth: '#e9e2f2', clothDark: '#a8a0c0', hat: 'knit', hatColor: '#f2ead8', hair: '#6a3a20', height: 1.62, headW: 250, headH: 250 },
  mucit2: { cloth: '#f2ead8', clothDark: '#b8ac90', hat: 'knit', hatColor: '#3a7ab8', beard: '#e4ded6', beardLen: .55, height: 1.74, headW: 268 },
  karisi2: { body: 'sit', cloth: '#e0a0b8', clothDark: '#a86a80', hair: '#4a2a20', height: 1.62, headW: 250, headH: 250 },
};

function cameraPath() {
  const t = n => W('s' + n), e = n => E('s' + n);
  const keys = [
    { t: 0, pos: [.5, 1.5, 2.6], look: [.1, 1.25, -1.2], fov: 48, creep: .24, drift: .03 },
    // the wife at the door
    { t: t(3) - .15, dur: .3, move: 'whip', pos: [1.0, 1.55, -.6], look: [2.45, 1.45, .6], fov: 44, creep: .3 },
    // he holds up the dark bulb
    { t: t(4) - .15, dur: .3, move: 'whip', pos: [.15, 1.45, 1.1], look: [0, 1.5, -.5], fov: 42, creep: .3 },
    // the bulb lights up: a wide of the room, then her at the door again ("kapa")
    { t: t(6) + .2, dur: .7, pos: [-.3, 1.6, 1.9], look: [.3, 1.4, -.5], fov: 50, creep: .22 },
    { t: t(6) + 2.0, dur: .3, move: 'whip', pos: [1.0, 1.55, -.6], look: [2.45, 1.45, .6], fov: 44, creep: .3 },
    // the telephone, night
    { t: t(7) - .15, dur: .35, move: 'whip', pos: [200.2, 1.5, 1.8], look: [200.6, 1.35, -1.3], fov: 48, creep: .26 },
    { t: t(10) - .15, dur: .3, move: 'whip', pos: [199.8, 1.5, 1.9], look: [198.8, 1.45, -.9], fov: 46, creep: .3 },
    { t: t(13) - .1, dur: .3, move: 'whip', pos: [199.6, 1.5, 1.2], look: [198.8, 1.5, -.9], fov: 42, creep: .32 },
    { t: t(15) + .1, dur: .8, pos: [200.4, 1.6, 2.8], look: [199.8, 1.0, -1.2], fov: 52, creep: .22 },
    { t: t(17) - .1, dur: .3, move: 'whip', pos: [199.8, 1.5, 1.9], look: [198.8, 1.45, -.9], fov: 46, creep: .3 },
    { t: t(18) - .15, dur: .3, move: 'whip', pos: [200.45, 1.5, .9], look: [200.7, 1.4, -1.3], fov: 44, creep: .32 },
    { t: t(19) - .15, dur: .3, move: 'whip', pos: [199.8, 1.5, 1.9], look: [198.8, 1.45, -.9], fov: 46, creep: .3 },
    { t: t(21) - .15, dur: .3, move: 'whip', pos: [200.3, 1.5, .9], look: [200.6, 1.45, -1.3], fov: 44, creep: .3 },
    { t: t(22) - .1, dur: .5, pos: [200.1, 1.6, 2.8], look: [199.6, 1.1, -1.2], fov: 50, creep: .24 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t(6) + .05, .7); cp.kick(t(18) + .1, .5);
  return cp;
}

export async function setup(ctx) {
  const ids = {}; for (const w of ctx.words) ids[w.word] = w;
  W = k => ids[k].start; E = k => ids[k].end;
  DUR = Math.ceil(56.6 * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#1a1f3a');
  buildLab(scene); buildBed(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  dyn.cam = cameraPath();
}

const vis = (set, on) => { sets[set].g.visible = on; sets[set].L.visible = on; };
const GRADE = { lab: [1.03, .98, .97], bed: [.98, .97, 1.04] };
const FACE = { lab: [1, .97, .92], bed: [1, .97, .95] };
export function frame(t, ctx) {
  const { cam, env } = ctx;
  const cp = dyn.cam.apply(cam, t);
  const where = cam.position.x < 100 ? 'lab' : 'bed';
  vis('lab', where === 'lab'); vis('bed', where === 'bed');
  for (const c of Object.values(cast)) c.hide();
  const tint = FACE[where].map((v, i) => v / GRADE[where][i]);
  const bl = (seed, ...swaps) => blinkAt(t, seed, swaps, FPS);
  const m = flap(env, t);
  const T = n => W('s' + n);
  const laughing = any(t, 5, 11, 20);
  if (where === 'lab') {
    const fl = 1 + .12 * Math.sin(t * 17) * Math.sin(t * 7.3);
    dyn.flame.scale.set(fl, 1.8 * fl, fl); dyn.candleL.intensity = 6 * fl;
    const lit = ramp(t, T(6) - .1, T(6) + .25);
    dyn.bulbL.intensity = 30 * lit;
    const angryWife = t >= T(3) - .2 && t < T(4) || t >= T(6) + 1.6;
    cast.mucit1.show(); cast.mucit1.place(.15, 0, -.5, cam, tint);
    let e;
    if (t < T(3)) e = { expr: 'focused', look: -.4, lookY: .6, gazeY: 1, armR: [40 + Math.sin(t * 9) * 8, 110], armL: [30, 80], propR: 'candle' };
    else if (t < T(4)) e = { expr: 'worried', look: .8, armR: [40, 110], armL: [30, 80], propR: 'candle' };
    else if (t < T(6)) e = { expr: 'angry', look: .5, brow: .9, armR: [150, 40], propR: 'bulb', armL: [100, 40 + Math.sin(t * 7) * 15] };
    else if (t < T(6) + 1.6) e = { expr: 'grin', look: 0, lookY: -.5, armR: [165, 20], propR: 'bulb', bulbLit: true, armL: [160, 20], bob: Math.abs(Math.sin(t * 10)) * -8 };
    else e = { expr: 'surprised', look: .8, brow: .9, armR: [150, 40], propR: 'bulb', bulbLit: true, armL: [18, 10] };
    cast.mucit1.draw({ ...e, mouth: inSeg(t, 4) ? m : 0, blink: bl(1, T(3), T(4), T(6)), lit: 1 + lit * .3, shade: '#e0c8c8', rim: { color: lit > .1 ? '#fff0b0' : '#8aa0ff', a: .45 } });
    cast.mucit1.castFrom(lit > .3 ? V(.5, 1.7, -.3) : V(-.25, 1.1, -1.1));
    if (t >= T(2) - .3) {
      cast.karisi1.show(); cast.karisi1.place(2.45, 0, .6, cam, tint);
      const talks = inSeg(t, 3) || (t >= T(6) + 1.6 && inSeg(t, 6));
      cast.karisi1.draw({ expr: angryWife ? 'angry' : laughing ? 'smug' : 'neutral', brow: angryWife ? 1 : 0, look: -.6, mouth: talks ? m : 0,
        armL: angryWife ? [120, 60] : [18, 10], armR: angryWife ? [40, 120] : [18, 10],
        blink: bl(2, T(3)), lit: 1 + lit * .3, shade: '#d0c8e8', rim: { color: '#8aa0ff', a: .45 } });
      cast.karisi1.castFrom(V(-.25, 1.1, -1.1));
    }
  } else {
    const off = ramp(t, E('s23') - .6, E('s23') - .2);
    dyn.lamp.intensity = 5.5 * (1 - off); dyn.lampGlass.material.color.setRGB(2.6 * (1 - off) + .2, 1.8 * (1 - off) + .2, .9 * (1 - off) + .3);
    const alo = any(t, 7, 8, 9, 18);
    const shout = alo ? Math.abs(Math.sin(t * 9)) : 0;
    for (const b of dyn.bells) b.position.z = .15 + (alo ? Math.sin(t * 60) * .004 : 0);
    cast.mucit2.show(); cast.mucit2.place(200.75, 0, -1.3, cam, tint);
    const answer = inSeg(t, 21);
    cast.mucit2.draw({ expr: answer ? 'worried' : alo ? 'surprised' : laughing ? 'grin' : 'focused', look: answer ? -.8 : .5, brow: answer ? .5 : 0,
      mouth: alo || answer ? m : 0, propL: answer ? undefined : 'earpiece', armL: answer ? [100, 120] : [150, 150], armR: answer ? [100, 120] : alo ? [70 + shout * 50, 60] : [18, 10],
      bob: alo ? -shout * 6 : 0, blink: bl(3, T(7), T(18), T(21)), lit: 1 - off * .4, shade: '#d0c8e8', rim: { color: '#8aa0ff', a: .45 } });
    cast.mucit2.castFrom(V(199.95, .95, -1.6));
    cast.karisi2.show(); cast.karisi2.place(-1.25 + 200, .6, -.9, cam, tint);
    const wifeTalks = any(t, 10, 12, 13, 14, 15, 16, 17, 19, 22, 23);
    const mad = t >= T(10) - .1;
    cast.karisi2.draw({ expr: wifeTalks ? (t >= T(13) - .1 && t < E('s13') + .3 ? 'angry' : mad ? 'angry' : 'worried') : t < T(10) ? 'worried' : laughing ? 'smug' : 'angry',
      brow: mad ? .8 : .3, look: .7, mouth: wifeTalks ? m : 0, armL: wifeTalks ? [120, 60 + Math.sin(t * 6) * 15] : [18, 10], armR: wifeTalks ? [40, 120] : [18, 10],
      blink: bl(4, T(10), T(13), T(19)), lit: 1 - off * .4, shade: '#d0c8e8', rim: { color: '#ffb060', a: .4 } });
    cast.karisi2.castFrom(V(199.95, .95, -1.6));
  }
  const subj = where === 'lab' ? (cam.position.x > .7 ? V(2.45, 1.4, .6) : V(.15, 1.4, -.5)) : (cam.position.x < 200 ? V(198.75, 1.5, -.9) : V(200.75, 1.4, -1.3));
  const look = { focus: cam.position.distanceTo(subj), coc: 6, range: 1.8, sat: 1.25, lift: [.1, .09, .17], bloom: .85, vignette: .26 };
  look.tint = GRADE[where];
  look.blur = cp.moving > .15 ? 16 : 0;
  look.captions = false;
  return look;
}
