// İkramiye — a silent animation (no captions, no audio in the file) timed to the user's audio, which they add with
// YouTube's own remix tool. words.json holds only segment ids (s1..s15) and their times, not the words.
// Sets: STAGE (x≈0, a comedy club: one warm spotlight on a brick wall, the front row), ROOF (x≈200, night city under
// a huge galaxy; the camera pulls out to the cosmos, then one golden beam).
import * as THREE from 'three';
import { stoneTex, woodTex, painted, flat, rng, D } from '../../engine/src/paint.js';
import { Toon, flap, blinkAt } from '../../engine/src/toon.js';
import { CamPath, smoother } from '../../engine/src/camera.js';
import { beam } from '../../engine/src/fx.js';

export const NAME = 'ikramiye';
export const FPS = 30;
export let DUR = 44.6;
export const CUES = [];

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
let W, E, cast = {}, sets = {}, dyn = {};
const seg = n => [W('s' + n), E('s' + n)];
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
function buildStage(scene) {
  const g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), painted(woodTex({ base: '#5a3a3a', plank: 48, rep: [3, 3] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  box(g, 5, .5, 2.4, 0, .25, -1.4, painted(woodTex({ base: '#7a4a2e', plank: 40, rep: [2, 1] })));
  box(g, 5, .06, .06, 0, .5, -.2, flat('#e0b050'));
  const brick = painted(stoneTex({ base: '#a8503a', seam: '#4a2420', bw: 64, bh: 32, rep: [6, 3] }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), brick); back.position.set(0, 2, -2.6); g.add(back);
  // a neon-ish sign on the wall (a star shape glowing pink), curtains at the sides
  const star = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? .18 : .42; k ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const sm = new THREE.Mesh(new THREE.ShapeGeometry(star), glowM(2.6, .6, 1.6)); sm.position.set(-1.6, 2.6, -2.58); g.add(sm);
  for (const x of [-2.6, 2.6]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.35, .45, 3.6, 16, 1, true), flat('#8a1a3a', { side: THREE.DoubleSide })); c.position.set(x, 2.0, -2.3); g.add(c); }
  // the mic stand
  const ms = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.4, 6), flat('#2a2440')); ms.position.set(.45, 1.2, -.75); g.add(ms);
  const mb = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .02, 16), flat('#2a2440')); mb.position.set(.45, .51, -.75); g.add(mb);
  // the front row: little round tables with drinks, chairs
  for (const x of [-1.5, 0, 1.5]) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .03, 20), flat('#2a2440')); top.position.set(x, .72, 2.4); g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .7, 8), flat('#2a2440')); leg.position.set(x, .36, 2.4); g.add(leg);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.03, .025, .1, 10), glowM(1.4, .8, .3)); glass.position.set(x + .1, .79, 2.4); glass.userData.noShadow = true; g.add(glass);
  }
  // light: one warm spotlight on the comedian (visible cone), a cool wash on the room, a magenta back light
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#7a70d6', '#3a2440', 1.4));
  const sp = new THREE.SpotLight('#ffc884', 18, 0, .3, .45, 0); sp.position.set(.4, 5.5, 2.5); sp.target.position.set(0, .5, -.7); sp.castShadow = true;
  sp.shadow.mapSize.set(2048, 2048); sp.shadow.camera.near = 1; sp.shadow.camera.far = 14; sp.shadow.bias = -.0008; sp.shadow.normalBias = .03; L.add(sp); L.add(sp.target);
  const back2 = new THREE.PointLight('#ff5ab0', 2.2, 5, 1.5); back2.position.set(-1.6, 2.5, -2.2); L.add(back2);
  const crowd = new THREE.PointLight('#8aa0ff', 2.0, 6, 1.4); crowd.position.set(0, 2.4, 3.6); L.add(crowd);
  scene.add(L); sets.stage = { g, L };
  shadows(g);
  dyn.spotBeam = beam(scene, [.4, 5.5, 2.5], [0, .5, -.7], { r0: .1, r1: 1.0, color: '#ffd8a0', strength: .14 });
  // halos for the "four angels"
  dyn.halos = [0, 1, 2, 3].map(() => { const h = new THREE.Mesh(new THREE.TorusGeometry(.17, .025, 8, 32), glowM(3, 2.4, .8)); h.rotation.x = Math.PI / 2 - .45; h.userData.noShadow = true; scene.add(h); return h; });
}

// ---------------------------------------------------------------- ROOF (x = 200): a rooftop in a night city, the galaxy above
function galaxyTex() {
  return canvasTex(4096, 2048, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, D('#0f1240')); gr.addColorStop(.5, D('#2a2470')); gr.addColorStop(1, D('#3a2a6a'));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = rng(11);
    for (let i = 0; i < 4000; i++) { g.fillStyle = D(['#fff6dc', '#bcd0ff', '#ffd0f0'][i % 3], .3 + R() * .7); g.beginPath(); g.arc(R() * w, R() * h * .7, R() < .92 ? 1.3 : 2.8, 0, 6.29); g.fill(); }
    // a spiral galaxy above the horizon: soft arms of dots, a glowing core
    const cx = w * .55, cy = h * .3;
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 2600; i++) {
      const u = R(), a = u * 9 + arm * Math.PI + (R() - .5) * .5, r = 30 + u * 420;
      g.fillStyle = D(u < .3 ? '#fff0c0' : R() < .5 ? '#b8a0ff' : '#ff9ad8', .25 + (1 - u) * .5);
      g.beginPath(); g.arc(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * .55, 1 + R() * 2.4, 0, 6.29); g.fill();
    }
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, 160); core.addColorStop(0, 'rgba(255,240,200,.95)'); core.addColorStop(1, 'rgba(255,200,240,0)'); g.fillStyle = core; g.fillRect(cx - 200, cy - 200, 400, 400);
  });
}
function spiralTex() {
  return canvasTex(2048, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h); const R = rng(8), cx = w / 2, cy = h / 2;
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 9000; i++) {
      const u = R(), a = u * 10 + arm * Math.PI + (R() - .5) * .6, r = 20 + u * 900;
      g.fillStyle = u < .25 ? 'rgba(255,236,190,.8)' : R() < .5 ? 'rgba(180,150,255,.55)' : 'rgba(255,150,220,.5)';
      g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .38, 1 + R() * 3, 0, 6.29); g.fill();
    }
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, 220); core.addColorStop(0, 'rgba(255,240,210,1)'); core.addColorStop(1, 'rgba(255,190,240,0)'); g.fillStyle = core; g.fillRect(cx - 260, cy - 260, 520, 520);
  });
}
function buildRoof(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  box(g, 6, .3, 6, 0, -.15, -1, painted(stoneTex({ base: '#6a6a8a', seam: '#3a3a5a', bw: 128, bh: 128, rep: [3, 3] })));
  box(g, 6, .5, .2, 0, .25, 1.95, flat('#7a7aa0')); box(g, .2, .5, 6, -3, .25, -1, flat('#7a7aa0'));
  box(g, .7, 1.4, .7, -1.8, .7, -2.4, painted(stoneTex({ base: '#a8503a', seam: '#4a2420', bw: 64, bh: 32 })));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), flat('#e9eef8', { side: THREE.DoubleSide })); dish.rotation.x = -1.1; dish.position.set(1.8, 1.0, -2.2); g.add(dish);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10), glowM(3, 2.2, 1.1)); bulb.position.set(-1.8, 1.65, -2.0); bulb.userData.noShadow = true; g.add(bulb);
  // the city: blocks of buildings with lit windows, all around, falling away below the roof
  const R = rng(4), city = new THREE.Group(); g.add(city);
  const winTex = canvasTex(64, 128, (c, w, h) => { c.fillStyle = D('#24204a'); c.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 14) for (let x = 6; x < w; x += 14) { c.fillStyle = R() < .45 ? D(R() < .7 ? '#ffd88a' : '#9fd0ff') : D('#2e2a5a'); c.fillRect(x, y, 7, 8); } });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  for (let i = 0; i < 160; i++) {
    const a = R() * Math.PI * 2, r = 10 + R() * 70, w = 2 + R() * 4, hgt = 4 + R() * 22, d = 2 + R() * 4;
    const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(w / 2, hgt / 4);
    const m = new THREE.MeshLambertMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: .9 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), m); b.position.set(Math.cos(a) * r, -12 + hgt / 2 - 3 * R(), Math.sin(a) * r - 6); city.add(b);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), flat('#1c1a3a')); ground.rotation.x = -Math.PI / 2; ground.position.y = -15; g.add(ground);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 48, 32), new THREE.MeshBasicMaterial({ map: galaxyTex(), side: THREE.BackSide })); g.add(sky); sky.userData.noShadow = true;
  const gal = new THREE.Mesh(new THREE.PlaneGeometry(220, 110), new THREE.MeshBasicMaterial({ map: spiralTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  gal.position.set(0, 70, -200); g.add(gal); gal.userData.noShadow = true;
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#8a8cf0', '#2a2050', 1.4));
  const bl = new THREE.PointLight('#ffc070', 6, 7, 1.3); bl.position.set(198.2, 1.65, -2.0); bl.castShadow = true; bl.shadow.mapSize.set(1024, 1024); bl.shadow.camera.near = .1; bl.shadow.camera.far = 12; bl.shadow.bias = -.003; bl.shadow.normalBias = .04; L.add(bl);
  const gold = new THREE.SpotLight('#ffd070', 0, 0, .12, .4, 0); gold.position.set(200.2, 40, 2); gold.target.position.set(200.2, 0, -.6); L.add(gold); L.add(gold.target); dyn.gold = gold;
  scene.add(L); sets.roof = { g, L };
  shadows(g);
  dyn.godBeam = beam(scene, [200.2, 40, 2], [200.2, 0, -.6], { r0: .3, r1: 1.3, color: '#ffe0a0', strength: 0 });
}

// ---------------------------------------------------------------- CAST (generic characters, no resemblance to anyone real)
export const LOOK = {
  komedyen: { cloth: '#c8433a', clothDark: '#8a2a2a', buttons: '#2a2440', mustache: '#3a2a20', hair: '#3a2a20', height: 1.74 },
  a1: { cloth: '#3a7ab8', hair: '#4a3020', mustache: true, height: 1.68, hat: 'knit', hatColor: '#3f9a48' },
  a2: { cloth: '#e0604a', hair: '#5a2a20', height: 1.6, headW: 252, headH: 252 },
  a3: { cloth: '#8a5ad6', hair: '#2e2026', height: 1.7, headW: 262 },
  a4: { cloth: '#e8b84a', beard: '#e4ded6', beardLen: .45, height: 1.64, headW: 270 },
  ibrahim: { cloth: '#5a8a6a', clothDark: '#3a5a48', hair: '#4a3020', mustache: true, height: 1.7, headW: 268 },
};
const ROW = [[-1.9, 2.0], [-.65, 2.1], [.65, 2.1], [1.9, 2.0]];

function cameraPath() {
  const t = n => W('s' + n);
  const keys = [
    { t: 0, pos: [.2, 1.55, 2.2], look: [0, 1.75, -.7], fov: 44, creep: .26, drift: .03 },
    // each audience member as they answer (cards always face the camera; the camera stands on the stage edge)
    { t: t(2) - .1, dur: .3, move: 'whip', pos: [-1.6, 1.45, 4.0], look: [-1.9, 1.2, 2.0], fov: 42, creep: .28 },
    { t: t(3) - .1, dur: .3, pos: [-.5, 1.4, 4.0], look: [-.65, 1.15, 2.1], fov: 42, creep: .28 },
    { t: t(4) - .1, dur: .3, pos: [.8, 1.45, 4.0], look: [.65, 1.2, 2.1], fov: 42, creep: .28 },
    { t: t(5) - .1, dur: .3, pos: [1.95, 1.42, 4.0], look: [1.9, 1.15, 2.0], fov: 42, creep: .28 },
    // "four angels": the whole row with halos, then the comedian
    { t: t(6) - .05, dur: .3, pos: [0, 1.6, 5.8], look: [0, 1.25, 2.0], fov: 52, creep: .24 },
    { t: t(8) - .15, dur: .32, move: 'whip', pos: [.15, 1.6, 1.7], look: [0, 1.75, -.7], fov: 42, creep: .26 },
    { t: t(9) - .05, dur: .5, pos: [-.5, 1.7, 2.6], look: [0, 1.6, -.7], fov: 46, creep: .26 },
    // the rooftop: a man and his lottery ticket under the galaxy
    { t: t(10) + 1.9, dur: .35, move: 'whip', pos: [200.6, 1.5, 2.4], look: [200.1, 1.45, -.6], fov: 46, creep: .26 },
    { t: t(11) - .1, dur: .4, pos: [200.35, 1.25, 1.2], look: [200.1, 1.55, -.6], fov: 42, creep: .3 },
    { t: t(12) - .1, dur: .4, pos: [200.5, 1.5, 1.6], look: [200.1, 1.45, -.6], fov: 44, creep: .28 },
    // the pull-out: rooftop -> city -> the cosmos
    { t: t(14) - .2, dur: 3.4, pos: [200, 14, 70], look: [200, 30, -120], fov: 58, creep: 0 },
    // the beam: back down to him
    { t: t(15) + .1, dur: 1.2, pos: [200.7, 2.0, 2.8], look: [200.15, 1.4, -.6], fov: 48, creep: .26 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t(6) + .1, .8); cp.kick(t(15) + .2, .7);
  return cp;
}

export async function setup(ctx) {
  const ids = {}; for (const w of ctx.words) ids[w.word] = w;
  W = k => ids[k].start; E = k => ids[k].end;
  DUR = Math.ceil(44.6 * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#1a1f3a');
  buildStage(scene); buildRoof(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  dyn.cam = cameraPath();
}

const vis = (set, on) => { sets[set].g.visible = on; sets[set].L.visible = on; };
const GRADE = { stage: [1, .97, 1.03], roof: [.98, .97, 1.05] };
const FACE = { stage: [1, .98, .95], roof: [1, .985, .96] };
export function frame(t, ctx) {
  const { cam, env } = ctx;
  const cp = dyn.cam.apply(cam, t);
  const where = cam.position.x < 100 ? 'stage' : 'roof';
  vis('stage', where === 'stage'); vis('roof', where === 'roof'); dyn.spotBeam.visible = where === 'stage'; dyn.godBeam.visible = where === 'roof';
  for (const c of Object.values(cast)) c.hide();
  const tint = FACE[where].map((v, i) => v / GRADE[where][i]);
  const bl = (seed, ...swaps) => blinkAt(t, seed, swaps, FPS);
  const m = flap(env, t);
  const T = n => W('s' + n);
  const halo = ramp(t, T(6) - .1, T(6) + .3) * (1 - ramp(t, T(8) - .3, T(8)));
  if (where === 'stage') {
    const comic = inSeg(t, 1) || inSeg(t, 6) || inSeg(t, 8) || inSeg(t, 9) || inSeg(t, 10);
    cast.komedyen.show(); cast.komedyen.place(0, .5, -.7, cam, tint);
    let e = { expr: 'smile', look: 0, armR: [70, 90], propR: 'mic', armL: [18, 10] };
    if (t < T(2)) e = { expr: 'smile', look: .4, armR: [70, 90], propR: 'mic', armL: [110, 20] };
    else if (t < T(6)) e = { expr: 'focused', look: .5, armR: [80, 60], propR: 'mic', armL: [18, 10] };
    else if (t < T(8)) e = { expr: 'surprised', look: .3, brow: .9, armR: [70, 90], propR: 'mic', armL: [150, 60] };
    else if (t < T(9)) e = { expr: 'smug', look: .2, brow: .6, armR: [70, 90], propR: 'mic', armL: [60, -50] };
    else e = { expr: 'worried', look: 0, brow: .5, armR: [70, 90], propR: 'mic', armL: [100, 40 + Math.sin(t * 6) * 15] };
    cast.komedyen.draw({ ...e, mouth: comic ? m : 0, blink: bl(1, T(2), T(6), T(8)), lit: 1, shade: '#d8cfee', rim: { color: '#ff7ac8', a: .45 } });
    cast.komedyen.castFrom(V(.4, 5.5, 2.5));
    const laugh = t >= T(7) - .1 && t < E('s7') + .3 || inSeg(t, 13);
    ['a1', 'a2', 'a3', 'a4'].forEach((k, i) => {
      const [x, z] = ROW[i], me = inSeg(t, i + 2);
      if (cam.position.z < 3.2) { cast[k].hide(); dyn.halos[i].visible = false; return; }
      cast[k].show(); cast[k].place(x, 0, z, cam, tint);
      const ex = laugh ? 'laugh' : me ? 'proud' : halo > .5 ? 'smile' : 'neutral';
      cast[k].draw({ expr: ex, mouth: me ? m : laugh ? .5 + .5 * Math.abs(Math.sin(t * 12 + i)) : 0, laughMarks: laugh ? .8 : 0, look: me ? -.2 : -.5 + i * .2,
        armL: me ? [70, 140] : [18, 10], armR: me && i === 2 ? [130, 40] : [18, 10], bob: laugh ? Math.abs(Math.sin(t * 12 + i)) * -10 : 0,
        blink: bl(10 + i, T(i + 2)), lit: 1, shade: '#d8cfee', rim: { color: '#8aa0ff', a: .35 } });
      cast[k].castFrom(V(0, 2.4, 3.6));
      const hp = cast[k].headWorld ? cast[k].headWorld() : V(x, (LOOK[k].height || 1.7) + .08, z);
      dyn.halos[i].position.set(x, (LOOK[k].height || 1.7) - .02 + Math.sin(t * 3 + i) * .02, z + .05); dyn.halos[i].scale.setScalar(Math.max(.001, halo)); dyn.halos[i].visible = halo > .01;
    });
  } else {
    dyn.halos.forEach(h => h.visible = false);
    const pray = t >= T(11) - .1 && t < T(12), give = t >= T(12) - .1 && t < T(14), lit = ramp(t, T(15) - .1, T(15) + .5);
    cast.ibrahim.show(); cast.ibrahim.place(200.15, 0, -.6, cam, tint);
    cast.ibrahim.draw({ expr: lit > .3 ? 'grin' : pray ? 'worried' : give ? 'smug' : 'focused', look: .1, lookY: pray ? -.9 : lit > .3 ? -.6 : 0, gazeY: pray ? -1 : 0,
      mouth: (inSeg(t, 11) || inSeg(t, 12) || inSeg(t, 15)) ? m : 0, propR: 'ticket',
      armR: pray ? [155, 20] : give ? [lerpG(t, T(12), 140, 60), 40] : lit > .3 ? [160, 20] : [70, 90], armL: pray ? [155, 20] : give ? [80, 120] : lit > .3 ? [160, 20] : [18, 10],
      bob: lit > .3 ? Math.abs(Math.sin(t * 9)) * -10 : 0, blink: bl(5, T(11), T(12), T(15)), lit: 1, shade: '#d6d1f2', rim: { color: lit > .1 ? '#ffd070' : '#ffb860', a: .4 + lit * .4 } });
    cast.ibrahim.castFrom(V(198.2, 1.65, -2.0));
    dyn.gold.intensity = 40 * lit; dyn.godBeam.material.uniforms && (dyn.godBeam.material.uniforms.uStrength ? dyn.godBeam.material.uniforms.uStrength.value = .25 * lit : 0);
    dyn.godBeam.visible = lit > .01;
  }
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (where === 'stage') look = { ...focusOn(cam.position.z > 3 ? V(cam.position.x, 1.2, 2.05) : V(0, 1.7, -.7), 6, 1.8), sat: 1.25, lift: [.105, .09, .175], bloom: .8, vignette: .24 };
  else { const far = cam.position.distanceTo(V(200, 1, 0)); look = { ...focusOn(V(200.15, 1.4, -.6), far > 8 ? 0 : 6, 2), sat: 1.25, lift: [.1, .09, .18], bloom: .95, vignette: .2 }; }
  look.tint = GRADE[where];
  look.blur = cp.moving > .15 && cam.position.y < 10 ? 16 : 0;
  look.captions = false;
  return look;
}
function lerpG(t, t0, a, b) { const k = Math.min(1, Math.max(0, (t - t0) / .4)); return a + (b - a) * Math.sin(k * Math.PI * 3) * .5 + (b - a) * .5; }
