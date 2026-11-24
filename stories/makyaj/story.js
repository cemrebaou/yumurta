// Makyaj — the user's own voice: a 52-year-old man, fed up with makeup videos, tries contouring himself on camera.
// Sets: ROOM (x≈0, night: ring light key + Hollywood-mirror bulbs + blue window), CAFE (x≈200, day: sun under an awning).
import * as THREE from 'three';
import { stoneTex, woodTex, tileTex, ciniTex, frizTex, painted, flat, rng, D } from '../../engine/src/paint.js';
import { Toon, flap, blinkAt } from '../../engine/src/toon.js';
import { CamPath, smoother } from '../../engine/src/camera.js';
import { beam } from '../../engine/src/fx.js';

export const NAME = 'makyaj';
export const FPS = 30;
export let DUR = 45;
export const CUES = [];

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
let W, cast = {}, sets = {}, dyn = {};

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
const glowM = (r, g, b) => new THREE.MeshBasicMaterial({ color: HDR(r, g, b) });

// ---------------------------------------------------------------- ROOM (x = 0)
function buildRoom(scene) {
  const g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), painted(woodTex({ base: '#9a6a4a', plank: 48, rep: [2, 2] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), painted(tileTex({ a: '#c8433a', b: '#f2d8a8', ink: '#4a2440', rep: [3, 3] }))); rug.rotation.x = -Math.PI / 2; rug.position.set(.3, .005, .4); g.add(rug);
  const wall = painted(ciniTex({ kind: 'yildiz', a: '#5a4aa8', b: '#3a8aa8', c: '#c86a7a', rep: [12, 4] }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), wall); back.position.set(0, 1.6, -1.8); g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), wall); left.position.set(-2.4, 1.6, 0); left.rotation.y = Math.PI / 2; g.add(left);
  box(g, 8, .9, .04, 0, .45, -1.78, painted(woodTex({ base: '#5a3a5a', vertical: true, plank: 64, rep: [10, 1] }))); box(g, 8, .05, .08, 0, .92, -1.76, flat('#e0b050'));
  // the window (night: a cool HDR pane with bars), high on the back wall left
  box(g, 1.0, .9, .03, -1.3, 2.05, -1.77, glowM(.32, .44, 1.05));
  for (const x of [-1.8, -1.3, -.8]) box(g, .05, 1.0, .05, x, 2.05, -1.74, flat('#e9dcc0'));
  for (const y of [1.6, 2.5]) box(g, 1.05, .05, .05, -1.3, y, -1.74, flat('#e9dcc0'));
  // a Hollywood mirror on the left wall: a frame with a ring of warm bulbs (they bloom)
  const mir = new THREE.Group(); mir.position.set(-2.36, 1.5, -.3); mir.rotation.y = Math.PI / 2; g.add(mir);
  box(mir, 1.0, 1.2, .04, 0, 0, 0, flat('#e9dcc0'));
  box(mir, .84, 1.04, .02, 0, 0, .03, flat('#b8c8e8', { emissive: '#283048' }));
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), glowM(3, 2.3, 1.2)); b.position.set(Math.cos(a) * .5, Math.sin(a) * .6, .05); b.userData.noShadow = true; mir.add(b); }
  // the bed at the back right with a pink blanket and a pillow
  box(g, 1.6, .45, 1.1, 1.6, .225, -1.2, painted(woodTex({ base: '#7a4a3a' })));
  box(g, 1.55, .12, 1.05, 1.6, .5, -1.18, flat('#ff8ab0'));
  box(g, .5, .14, .3, 1.15, .62, -1.5, flat('#f2ead8'));
  // the table in front of him: palette, brushes in a cup, a lipstick, the phone on a tiny tripod (REC light)
  const tw = painted(woodTex({ base: '#e9dcc0', plank: 64 }));
  box(g, 1.4, .05, .55, 0, .75, -.15, tw);
  for (const [x, z] of [[-.64, -.38], [.64, -.38], [-.64, .08], [.64, .08]]) box(g, .05, .74, .05, x, .37, z, tw);
  box(g, .26, .03, .16, .35, .79, -.1, flat('#2a2440'));
  ['#f2c8a0', '#d8956a', '#8a5038', '#ff5a86', '#4a7aff', '#c070ff'].forEach((c, i) => box(g, .07, .012, .06, .27 + (i % 3) * .08, .81, -.14 + Math.floor(i / 3) * .07, flat(c)));
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.05, .045, .12, 14), flat('#5ab3d0')); cup.position.set(.55, .84, -.25); g.add(cup);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .22, 6), flat(['#e8b84a', '#2a2440', '#ff8ab0', '#e8b84a'][k])); b.position.set(.53 + (k % 2) * .03, .95, -.27 + Math.floor(k / 2) * .03); b.rotation.z = (k - 1.5) * .12; g.add(b); }
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .07, 10), flat('#e0204a')); lip.position.set(.1, .81, -.02); g.add(lip);
  const ph = new THREE.Group(); ph.position.set(-.3, .78, .02); g.add(ph);
  box(ph, .08, .15, .012, 0, .2, 0, flat('#2a2440')); for (let k = 0; k < 3; k++) { const a = k / 3 * 6.28, l = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .14, 5), flat('#2a2440')); l.position.set(Math.cos(a) * .03, .06, Math.sin(a) * .03); l.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35); ph.add(l); }
  const rec = new THREE.Mesh(new THREE.SphereGeometry(.009, 8, 6), glowM(3, .3, .3)); rec.position.set(.025, .26, .01); rec.userData.noShadow = true; ph.add(rec); dyn.rec = rec;
  // the ring light on a stand, front right: the key light
  const rl = new THREE.Group(); rl.position.set(.95, 0, .9); g.add(rl);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(.015, .02, 1.5, 6), flat('#2a2440')); stand.position.y = .75; rl.add(stand);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.22, .03, 10, 40), glowM(3.0, 2.8, 2.5)); ring.position.y = 1.55; ring.lookAt(0, 1.5, -.6); ring.userData.noShadow = true; rl.add(ring); dyn.ring = ring;
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#8a8cf0', '#4a3a5a', 1.4));
  const key = new THREE.SpotLight('#fff0dc', 4.5, 0, .45, .5, 0); key.position.set(.95, 1.55, .9); key.target.position.set(0, 1.3, -.6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = .2; key.shadow.camera.far = 10; key.shadow.bias = -.0008; key.shadow.normalBias = .03; key.shadow.radius = 3; L.add(key); L.add(key.target); dyn.key = key;
  const bulbs = new THREE.PointLight('#ffb860', 2.5, 4, 1.4); bulbs.position.set(-2.2, 1.5, -.3); L.add(bulbs);
  const win = new THREE.PointLight('#7a96ff', 1.6, 4, 1.5); win.position.set(-1.3, 2.0, -1.5); L.add(win);
  scene.add(L); sets.room = { g, L };
  shadows(g);
  dyn.winBeam = beam(scene, [-1.3, 2.05, -1.75], [-.6, .05, -.3], { r0: .45, r1: .7, color: '#9db4ff', strength: .1 });
}

// ---------------------------------------------------------------- CAFE (x = 200)
function buildCafe(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), painted(tileTex({ a: '#d8c8a8', b: '#b8a888', ink: '#6a5a48', rep: [10, 8] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), painted(stoneTex({ base: '#e8c8a0', bw: 192, bh: 96, rep: [5, 2] }))); back.position.set(0, 2, -2.6); g.add(back);
  // the café window (warm interior glow) and a striped awning above
  box(g, 2.6, 1.4, .03, -.2, 1.55, -2.57, glowM(1.3, .95, .55));
  for (const x of [-1.5, -.2, 1.1]) box(g, .08, 1.5, .08, x, 1.55, -2.54, flat('#3a5a8a'));
  box(g, 2.8, .08, .08, -.2, 2.3, -2.54, flat('#3a5a8a')); box(g, 2.8, .08, .08, -.2, .82, -2.54, flat('#3a5a8a'));
  const awn = new THREE.Mesh(new THREE.BoxGeometry(4.2, .05, 1.0), painted(frizTex({ ground: '#f2ead8', a: '#c8433a', b: '#c8433a', c: '#c8433a', rep: [6, 1] }))); awn.position.set(-.2, 2.75, -2.15); awn.rotation.x = .35; g.add(awn);
  for (let k = 0; k < 14; k++) { const v = new THREE.Mesh(new THREE.ConeGeometry(.15, .18, 3), flat(k % 2 ? '#c8433a' : '#f2ead8')); v.rotation.x = Math.PI; v.position.set(-2.1 + k * .29, 2.48, -1.7); g.add(v); }
  // potted plants and a sign: pattern and colour along the wall
  for (const x of [-2.3, 1.8]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.2, .15, .4, 14), flat('#c8663a')); p.position.set(x, .2, -2.2); g.add(p); const b = new THREE.Mesh(new THREE.SphereGeometry(.32, 14, 10), flat('#3f9a48')); b.position.set(x, .6, -2.2); g.add(b); }
  // two little round tables with tulip tea glasses
  const tbl = (x, z) => { const top = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .04, 24), flat('#e9eef8')); top.position.set(x, .72, z); g.add(top); const leg = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .7, 8), flat('#2a2440')); leg.position.set(x, .36, z); g.add(leg);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(.03, .022, .09, 12), flat('#c8402a')); gl.position.set(x + .08, .785, z); g.add(gl); const sa = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .01, 16), flat('#f2ead8')); sa.position.set(x + .08, .745, z); g.add(sa); };
  tbl(-.15, -.15); tbl(.8, -.95);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c8d8ff', '#a08a78', 2.0));
  const sun = new THREE.DirectionalLight('#ffd89c', 3.2); sun.position.set(205, 7, 4); sun.target.position.set(200, 0, -1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 20 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02; L.add(sun); L.add(sun.target);
  scene.add(L); sets.cafe = { g, L };
  shadows(g);
}

// ---------------------------------------------------------------- CAST
export const LOOK = {
  amca: { cloth: '#5a7ab8', clothDark: '#3a5088', buttons: '#e8b84a', mustache: '#6a6a74', hair: '#9a98a8', height: 1.72, headW: 276, headH: 262 },
  kadin: { cloth: '#e0604a', clothDark: '#a83a2a', hair: '#4a2a20', height: 1.62, headW: 252, headH: 252 },
};

function cameraPath() {
  const t = W;
  const keys = [
    { t: 0, pos: [0, 1.5, 1.7], look: [0, 1.42, -.6], fov: 42, creep: .28, drift: .03 },
    { t: t('ona') + .05, dur: .35, pos: [.08, 1.55, 1.2], look: [0, 1.5, -.6], fov: 40, creep: .3 },
    { t: t('götünü') - .05, dur: .3, pos: [.35, 1.4, 2.6], look: [0, 1.15, -.6], fov: 48, creep: .26 },
    { t: t('bunlara') + .05, dur: .3, pos: [0, 1.56, 1.05], look: [0, 1.52, -.6], fov: 40, creep: .3 },
    { t: t('Bir') + .15, dur: .32, move: 'whip', pos: [-.6, 1.75, 3.3], look: [-.2, 1.3, -.6], fov: 54, creep: .22 },
    { t: t('Yemin') + .05, dur: .5, pos: [.1, 1.56, 1.15], look: [0, 1.5, -.6], fov: 40, creep: .3 },
    { t: t('neymiş') - .1, dur: .4, pos: [.4, 1.45, 1.6], look: [.15, 1.32, -.5], fov: 44, creep: .28 },
    { t: t('Bak') + .05, dur: .35, pos: [0, 1.56, .95], look: [0, 1.53, -.6], fov: 38, creep: .3 },
    { t: t('profesyonel') - .05, dur: .5, pos: [-.35, 1.5, 1.45], look: [0, 1.45, -.6], fov: 42, creep: .28 },
    { t: t('Yahu') + .15, dur: .32, move: 'whip', pos: [.8, 1.7, 3.0], look: [0, 1.3, -.6], fov: 54, creep: .22 },
    { t: t('Bak', 3) + .05, dur: .35, pos: [0, 1.56, .95], look: [0, 1.53, -.6], fov: 38, creep: .3 },
    { t: t('yaşıma') - .1, dur: .32, move: 'whip', pos: [200.2, 1.6, 3.2], look: [200.2, 1.15, -.8], fov: 54, creep: .24 },
    { t: t('Ulan') - .05, dur: .3, pos: [199.75, 1.52, .95], look: [199.45, 1.47, -.45], fov: 40, creep: .3 },
    { t: t('İnanılmaz') + .05, dur: .45, pos: [200.4, 1.48, .55], look: [200.95, 1.36, -1.3], fov: 42, creep: .28 },
    { t: t('Nereden') + .1, dur: .32, move: 'whip', pos: [-.4, 1.72, 3.1], look: [0, 1.3, -.6], fov: 52, creep: .22 },
    { t: t('Öğrendiniz') + .05, dur: .4, pos: [0, 1.56, 1.1], look: [0, 1.52, -.6], fov: 40, creep: .3 },
    { t: t('Öğren') + .1, dur: 2.2, pos: [0, 1.56, .8], look: [0, 1.53, -.6], fov: 34, creep: .35 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t('bunlara') + .05, .7); cp.kick(t('veriyorum.') + .05, .9); cp.kick(t('Ulan') + .05, 1.0);
  return cp;
}

export async function setup(ctx) {
  W = wordTimes(ctx.words);
  DUR = Math.ceil(44.3 * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#1a1f3a');
  buildRoom(scene); buildCafe(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  dyn.cam = cameraPath();
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(W('Bir') - .1, 'whoosh'); cue(W('yaşıma') - .2, 'whoosh'); cue(W('Nereden') - .05, 'whoosh');
  cue(W('bunlara') + .03, 'boom'); cue(W('veriyorum.') + .03, 'boom'); cue(W('Ulan') + .03, 'boom');
  cue(W('neymiş') - .05, 'rise', { dur: .5 }); cue(W('Öğrendiniz') - .1, 'shimmer'); cue(W('Yahu') - .1, 'rise', { dur: .5 });
}

const vis = (set, on) => { sets[set].g.visible = on; sets[set].L.visible = on; };
const GRADE = { room: [1, .98, 1.03], cafe: [1.03, 1.0, .96] };
const FACE = { room: [1, .985, .96], cafe: [1, 1, .985] };
export function frame(t, ctx) {
  const { cam, env } = ctx;
  const cp = dyn.cam.apply(cam, t);
  const where = cam.position.x < 100 ? 'room' : 'cafe';
  vis('room', where === 'room'); vis('cafe', where === 'cafe'); dyn.winBeam.visible = where === 'room';
  const T = W, A = (w, n) => W(w, n) - 2 / FPS;
  dyn.rec.visible = Math.sin(t * 6) > 0;
  for (const c of Object.values(cast)) c.hide();
  const tint = FACE[where].map((v, i) => v / GRADE[where][i]);
  const bl = (seed, ...swaps) => blinkAt(t, seed, swaps, FPS);
  const mouth = flap(env, t);
  // makeup builds up over the video
  const mk = {
    contour: Math.max(.6 * ramp(t, A('böyle'), A('böyle') + .8), ramp(t, A('gölge'), A('veriyorum.'))),
    blush: ramp(t, A('profesyonel'), A('erkeğim,')),
    eye: ramp(t, A('veriyorum.'), A('veriyorum.') + .4),
    lips: ramp(t, A('Nereden'), A('Öğrendiniz')),
  };
  if (where === 'room') {
    const seg = w => t >= A(w);
    let o = { expr: 'neutral', look: 0, armR: [18, 10], armL: [18, 10] };
    if (t < T('Bir')) {
      const wiggle = t >= A('götünü') && t < A('bunlara');
      o = { expr: wiggle ? 'grin' : t > A('doyduk,') ? 'angry' : 'neutral', look: wiggle ? .3 : 0, lookY: t < A('götünü') ? .6 : 0, gazeY: t < A('götünü') ? .7 : 0,
        armR: t < A('bunlara') ? [70, 100] : [lerpA(t, A('bunlara'), 160, 18), 30], propR: t < A('bunlara') + .2 ? 'phone' : undefined,
        armL: wiggle ? [60, -40] : [18, 10], lean: wiggle ? Math.sin(t * 18) * 7 : 0, bob: wiggle ? Math.abs(Math.sin(t * 18)) * -14 : 0 };
    } else if (t < T('Yemin')) o = { expr: 'smug', look: .2, brow: .5, armR: [60, 80], armL: [18, 10] };
    else if (t < T('neymiş') - .1) o = { expr: 'proud', look: 0, armL: [60, 150], armR: [18, 10] };
    else if (t < T('Bak')) o = { expr: 'surprised', look: .3, brow: .8, armR: [100, 120], propR: 'palette', armL: [70, 40] };
    else if (t < T('profesyonel') - .1) o = { expr: 'focused', look: -.2, armR: [125, 150 + Math.sin(t * 14) * 8], propR: 'brush', armL: [18, 10] };
    else if (t < T('Yahu')) o = { expr: 'proud', look: .1, brow: .3, armR: [70, 60], propR: 'brush', armL: [40, -40], lean: 3 };
    else if (t < T('Bak', 3)) o = { expr: 'angry', look: Math.sin(t * 2) * .4, brow: .7, armR: [130 + Math.sin(t * 7) * 15, 40], armL: [130 + Math.cos(t * 7) * 15, 40] };
    else if (t < T('yaşıma')) o = { expr: 'focused', look: -.2, armR: [125, 150 + Math.sin(t * 14) * 8], propR: 'brush', armL: [18, 10] };
    else if (t < T('Öğrendiniz')) o = { expr: 'worried', look: .3, brow: .6, armR: [80, -60], armL: [80, -60] };
    else o = { expr: 'proud', look: 0, armR: [18, 10], armL: [18, 10], tilt: t > A('Öğren') ? Math.sin(t * 5) * 6 : 0, brow: .4 };
    cast.amca.show(); cast.amca.place(0, 0, -.6, cam, tint);
    cast.amca.draw({ ...o, mouth, mk, blink: bl(1, A('doyduk,'), A('Bir'), A('Bak'), A('Yahu'), A('Öğrendiniz')), lit: 1, shade: '#ded8f2', rim: { color: '#ffb860', a: .4 } });
    cast.amca.castFrom(V(.95, 1.55, .9));
  } else {
    const shock = t >= A('Ulan') && t < A('İnanılmaz'), snark = t >= A('İnanılmaz');
    cast.amca.show(); cast.amca.place(199.45, 0, -.45, cam, tint);
    cast.amca.draw({ expr: shock ? 'surprised' : snark ? 'smug' : 'neutral', mouth: shock ? Math.max(.6, mouth) : mouth, look: .7, gazeX: .8, brow: shock ? 1 : snark ? .5 : 0, laughMarks: snark ? .5 : 0,
      armR: shock ? [150, 40] : [60, 90], propR: shock ? undefined : 'tea', armL: shock ? [150, 40] : [18, 10], bob: shock ? -8 : 0,
      blink: bl(2, A('Ulan'), A('İnanılmaz')), lit: 1, shade: '#e8e3f4', rim: { color: '#ffe2a0', a: .35 } });
    cast.amca.castFrom(V(-5, -7, -4).normalize(), true);
    cast.kadin.show(); cast.kadin.place(200.95, 0, -1.3, cam, tint);
    cast.kadin.draw({ expr: snark ? 'angry' : 'smile', look: snark ? -.7 : .2, gazeX: snark ? -.9 : 0, brow: snark ? .6 : 0, mk: { contour: .35, blush: .7, eye: .9, lips: 1 },
      armR: [60, 90], propR: 'tea', armL: [18, 10], blink: bl(3, A('İnanılmaz')), lit: 1, shade: '#e8e3f4', rim: { color: '#ffe2a0', a: .35 } });
    cast.kadin.castFrom(V(-5, -7, -4).normalize(), true);
  }
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (where === 'room') look = { ...focusOn(V(0, 1.45, -.6), 6, 1.5), sat: 1.25, lift: [.105, .092, .175], bloom: .5, vignette: .22 };
  else look = { ...focusOn(t >= T('İnanılmaz') ? V(200.95, 1.35, -1.3) : V(199.45, 1.45, -.45), 6, 2), sat: 1.35, lift: [.098, .09, .15], bloom: .7, vignette: .16 };
  look.tint = GRADE[where];
  look.blur = cp.moving > .15 ? 16 : 0;
  return look;
}
function lerpA(t, t0, a, b) { const k = Math.min(1, Math.max(0, (t - t0) / .25)); return a + (b - a) * k; }
