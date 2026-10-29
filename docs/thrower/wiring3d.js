import * as THREE from './web/vendor/three/three.module.min.js';
import { OrbitControls } from './web/vendor/three/OrbitControls.js';
export async function init(root, context) {
const base = new URL('./web/', import.meta.url);
const document = { querySelector: (s) => root.querySelector(s), querySelectorAll: (s) => root.querySelectorAll(s), createElement: (s) => globalThis.document.createElement(s), createElementNS: (...a) => globalThis.document.createElementNS(...a), documentElement: root.host };
const fetch = async (path) => { const r = await globalThis.fetch(new URL(path, base)); if (!r.ok) throw new Error('Could not load ' + path); return r; };
// 3D wiring view of POC test phase 1: real-looking parts, one coloured cable per
// connection, grouped into build steps. Pico pin numbers come from data/wiring.json,
// which tools/wiring_svg.py writes from firmware/config.py, so this view, the
// phase 1 diagram (docs/wiring_p1.svg) and the firmware always agree.
// Units are mm, Z is up, the perfboard's top-left hole row is at the origin side.

const $ = (s) => document.querySelector(s);
const PM = await fetch('data/wiring.json').then((r) => r.json());
const pinNo = (name) => { const i = PM.pico_left.indexOf(name); return i >= 0 ? i + 1 : 40 - PM.pico_right.indexOf(name); };

// ---------------------------------------------------------------- scene
const canvas = $('#view3');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 2, 5000);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.48;
const hemi = new THREE.HemisphereLight(0xffffff, 0x8f8270, 1.6);
hemi.position.set(0, 0, 1);
const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(-140, -180, 320);
sun.target.position.set(10, 40, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 50, far: 900 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
scene.add(hemi, sun, sun.target);
function setBg() {
  const css = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim();
  scene.background = new THREE.Color(css || '#dfe6ec');
}
setBg();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setBg);
const table = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), new THREE.MeshStandardMaterial({ color: '#c8a77d', roughness: 0.85 }));
table.position.set(0, 30, -1.62);
table.receiveShadow = true;
scene.add(table);

// ---------------------------------------------------------------- building blocks
const comps = {};                                   // id → { id, name, at, group, mats }
const pins = {};                                    // id → { id, comp, label, p, out }
let cur = null, into = null;
function mat(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.55, metalness: o.m ?? 0, map: o.map ?? null });
  if (cur) cur.mats.push(m);
  return m;
}
function add(geo, m, x = 0, y = 0, z = 0) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = me.receiveShadow = true;
  me.userData.comp = cur && cur.id;
  (into || (cur ? cur.group : scene)).add(me);
  return me;
}
const boxAt = (sx, sy, sz, m, cx, cy, z0) => add(new THREE.BoxGeometry(sx, sy, sz), m, cx, cy, z0 + sz / 2);
function cylAt(r, h, m, cx, cy, z0, axis = 'z', seg = 32) {    // axis z: z0 = bottom; x / y: z0 = axis height
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  if (axis === 'z') g.rotateX(Math.PI / 2); else if (axis === 'x') g.rotateZ(Math.PI / 2);
  return add(g, m, cx, cy, axis === 'z' ? z0 + h / 2 : z0);
}
function rod(a, b, r, m) {                           // thin straight lead between two points
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(r, r, A.distanceTo(B), 10);
  const me = add(g, m, ...A.clone().lerp(B, 0.5).toArray());
  me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return me;
}
function topBox(sx, sy, sz, side, top, cx, cy, z0) {   // a box whose top face carries a texture
  return add(new THREE.BoxGeometry(sx, sy, sz), [side, side, side, side, top, side], cx, cy, z0 + sz / 2);
}
function tex(w, h, draw, ppm = 14) {                   // canvas texture in mm; draw() sees y pointing up
  const c = document.createElement('canvas');
  c.width = Math.round(w * ppm); c.height = Math.round(h * ppm);
  const g = c.getContext('2d');
  g.setTransform(ppm, 0, 0, -ppm, 0, c.height);
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function label(g, s, x, y, size, color = '#fff', rot = 0) {   // upright text inside a y-up canvas
  g.save(); g.translate(x, y); g.scale(1, -1); g.rotate(rot);
  g.fillStyle = color; g.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
}
function part(id, name, at, build) {
  cur = { id, name, at: new THREE.Vector3(...at), group: new THREE.Group(), mats: [] };
  comps[id] = cur;
  scene.add(cur.group);
  build();
  cur = null;
}
function pin(id, comp, text, p, out) {
  pins[id] = { id, comp, label: text, p: new THREE.Vector3(...p), out: new THREE.Vector3(...out).normalize() };
}

// perfboard hole grid (2.54 mm): every part with legs sits on it
const X = (i) => 2.4 + 2.54 * i;
const Y = (j) => 0.87 + 2.54 * j;
const BLACK = '#18191b', GOLD = '#d9b45a', TIN = '#c9ccd1';
const HDR = 8.5, SPACER = 2.5, PCB_Z = HDR + SPACER;   // female header, male header spacer, module PCB bottom

function femaleRow(n, x0, y, alongX = true) {          // n-way female header on the board, x0/y = first pin
  const len = n * 2.54, top = tex(alongX ? len : 2.54, alongX ? 2.54 : len, (g) => {
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, 100, 100);
    g.fillStyle = '#000';
    for (let k = 0; k < n; k++) alongX ? g.fillRect(1.27 + 2.54 * k - 0.45, 0.82, 0.9, 0.9) : g.fillRect(0.82, 1.27 + 2.54 * k - 0.45, 0.9, 0.9);
  }, 20);
  const side = mat('#1b1c1f', { r: 0.7 });
  const c = (n - 1) * 2.54 / 2;
  topBox(alongX ? len : 2.54, alongX ? 2.54 : len, HDR, side, mat('#fff', { map: top, r: 0.7 }), alongX ? x0 + c : x0, alongX ? y : y + c, 0);
  boxAt(alongX ? len : 2.54, alongX ? 2.54 : len, SPACER, mat('#232427', { r: 0.6 }), alongX ? x0 + c : x0, alongX ? y : y + c, HDR);
}

// ---------------------------------------------------------------- perfboard 70 × 50
part('board', 'Perfboard 70 × 50 mm', [35, -4, 2], () => {
  const top = tex(70, 50, (g) => {
    g.fillStyle = '#2d6a3f'; g.fillRect(0, 0, 70, 50);
    for (let i = 0; i < 27; i++) for (let j = 0; j < 20; j++) {
      g.fillStyle = '#d8d3c0'; g.beginPath(); g.arc(X(i), Y(j), 0.85, 0, 7); g.fill();
      g.fillStyle = '#20301f'; g.beginPath(); g.arc(X(i), Y(j), 0.42, 0, 7); g.fill();
    }
  }, 12);
  topBox(70, 50, 1.6, mat('#2b6139', { r: 0.6 }), mat('#fff', { map: top, r: 0.5 }), 35, 25, -1.6);
});

// ---------------------------------------------------------------- Raspberry Pi Pico 2 WH (USB toward −X)
const PYA = Y(6), PYB = Y(13);                       // pins 1–20 row, pins 40–21 row
const pPos = (n) => (n <= 20 ? [X(n - 1), PYA] : [X(40 - n), PYB]);
const PICO = { x0: X(0) - 1.37, y0: 25 - 10.5 };
part('pico', 'Raspberry Pi Pico 2 WH', [26.5, 25, PCB_Z + 4], () => {
  femaleRow(20, X(0), PYA);
  femaleRow(20, X(0), PYB);
  const top = tex(51, 21, (g) => {
    g.fillStyle = '#2a8a4b'; g.fillRect(0, 0, 51, 21);
    for (let k = 0; k < 20; k++) for (const y of [1.61, 19.39]) {
      const x = X(k) - PICO.x0;
      g.fillStyle = GOLD; g.beginPath(); g.arc(x, y, 0.9, 0, 7); g.fill();
      g.fillStyle = '#1d1d1d'; g.beginPath(); g.arc(x, y, 0.45, 0, 7); g.fill();
    }
    label(g, '1', X(0) - PICO.x0, 3.6, 1.4);
    label(g, '20', X(19) - PICO.x0, 3.6, 1.4);
    label(g, '40', X(0) - PICO.x0, 17.4, 1.4);
    label(g, '21', X(19) - PICO.x0, 17.4, 1.4);
    label(g, 'Raspberry Pi Pico 2 W', 31, 4.4, 1.5);
    label(g, 'BOOTSEL', 7.5, 11.4, 1.0);
    g.strokeStyle = '#d7e9dc'; g.lineWidth = 0.25; g.strokeRect(46.3, 5.5, 3.6, 10);   // antenna keep-out
  });
  topBox(51, 21, 1, mat('#24753f', { r: 0.5 }), mat('#fff', { map: top, r: 0.45 }), PICO.x0 + 25.5, 25, PCB_Z);
  const z = PCB_Z + 1;
  boxAt(5.6, 7.6, 2.7, mat(TIN, { m: 0.85, r: 0.3 }), PICO.x0 + 1.6, 25, z);          // micro-USB
  boxAt(7, 7, 0.85, mat('#151515', { r: 0.4 }), 23.5, 25, z);                         // RP2350
  boxAt(4.2, 5, 0.8, mat('#151515', { r: 0.4 }), 16, 20, z);                          // flash
  boxAt(9.5, 11, 1.4, mat(TIN, { m: 0.8, r: 0.35 }), 39, 25, z);                     // Wi-Fi shield
  boxAt(3.6, 4.6, 1.6, mat('#e9e9e9', { r: 0.6 }), PICO.x0 + 7.5, 20.4, z);          // BOOTSEL
  cylAt(0.9, 0.6, mat('#f4f4f4'), PICO.x0 + 7.5, 20.4, z + 1.6);
  boxAt(1.2, 0.8, 0.4, mat('#79d36b', { r: 0.3 }), PICO.x0 + 4.5, 29.8, z);          // LED
  const gold = mat(GOLD, { m: 0.8, r: 0.3 });
  for (let n = 1; n <= 40; n++) cylAt(0.33, 1.2, gold, ...pPos(n), z);               // header pin tips
});
for (let n = 1; n <= 40; n++) {
  const [x, y] = pPos(n), name = n <= 20 ? PM.pico_left[n - 1] : PM.pico_right[40 - n];
  const out = n <= 20 ? -1 : 1;
  pin(`pico.p${n}`, 'pico', `${name.replace('_', ' ')} · pin ${n}`, [x, y + out * 1.72, 1.2], [0, out, 0]);
}

// ---------------------------------------------------------------- DRV8833 module (red clone / Pololu pinout names)
const DYI = Y(4), DYO = Y(9), DX = (i) => X(21 + i);
const DRV_IN = [['AIN1', 'IN1'], ['AIN2', 'IN2'], ['BIN1', 'IN3'], ['BIN2', 'IN4'], ['EEP', 'nSLEEP'], ['ULT', 'nFAULT']];
const DRV_OUT = [['VM', 'VCC'], ['GND', 'GND'], ['AOUT1', 'OUT1'], ['AOUT2', 'OUT2'], ['BOUT1', 'OUT3'], ['BOUT2', 'OUT4']];
part('drv', 'DRV8833 motor driver', [DX(2.5), 17.4, PCB_Z + 4], () => {
  femaleRow(6, DX(0), DYI);
  femaleRow(6, DX(0), DYO);
  const w = 15.8, h = 15.9, x0 = DX(2.5) - w / 2, y0 = (DYI + DYO) / 2 - h / 2;
  const top = tex(w, h, (g) => {
    g.fillStyle = '#c3282d'; g.fillRect(0, 0, w, h);
    DRV_IN.forEach(([nm], i) => {
      const x = DX(i) - x0;
      for (const y of [DYI - y0, DYO - y0]) { g.fillStyle = GOLD; g.beginPath(); g.arc(x, y, 0.85, 0, 7); g.fill(); }
      label(g, nm, x, DYI - y0 + 2.9, 1.0, '#fff', -Math.PI / 2);
      label(g, DRV_OUT[i][0], x, DYO - y0 - 3.1, 1.0, '#fff', -Math.PI / 2);
    });
  });
  topBox(w, h, 1.2, mat('#a92025', { r: 0.5 }), mat('#fff', { map: top, r: 0.45 }), x0 + w / 2, y0 + h / 2, PCB_Z);
  boxAt(2.6, 3.4, 0.9, mat('#151515', { r: 0.4 }), x0 + w / 2, y0 + h / 2, PCB_Z + 1.2);   // DRV8833 chip, between the label rows
  boxAt(2, 1.25, 0.6, mat('#b49a6a'), x0 + w / 2 + 4.2, y0 + h / 2, PCB_Z + 1.2);
  boxAt(1.6, 0.8, 0.5, mat('#1d1d1d'), x0 + w / 2 - 4.2, y0 + h / 2, PCB_Z + 1.2);
  const gold = mat(GOLD, { m: 0.8, r: 0.3 });
  for (let i = 0; i < 6; i++) for (const y of [DYI, DYO]) cylAt(0.33, 1.2, gold, DX(i), y, PCB_Z + 1.2);
});
DRV_IN.forEach(([nm, alt], i) => pin(`drv.${nm}`, 'drv', `${nm} · ${alt}`, [DX(i), DYI - 1.72, 1.2], [0, -1, 0]));
DRV_OUT.forEach(([nm, alt], i) => pin(`drv.${nm}`, 'drv', alt === nm ? nm : `${nm} · ${alt}`, [DX(i), DYO + 1.72, 1.2], [0, 1, 0]));

// ---------------------------------------------------------------- screw terminals (2-pin, 5.08 mm)
function terminal(id, name, c, f, texts) {           // c: body centre, f: direction the wire openings face
  const a = f[0] !== 0 ? [0, 1] : [1, 0];            // across: position 0 is at the smaller x / y
  const deep = 7.6, wide = 10.16, tall = 10;
  part(id, name, [c[0], c[1], tall + 3], () => {
    const sx = Math.abs(f[0]) * deep + a[0] * wide, sy = Math.abs(f[1]) * deep + a[1] * wide;
    boxAt(sx, sy, tall, mat('#2f6db5', { r: 0.5 }), c[0], c[1], 0);
    for (const k of [0, 1]) {
      const s = k ? 1 : -1, px = c[0] + a[0] * 2.54 * s, py = c[1] + a[1] * 2.54 * s;
      cylAt(1.7, 0.8, mat(TIN, { m: 0.8, r: 0.3 }), px, py, tall);
      boxAt(f[0] ? 0.5 : 2.8, f[0] ? 2.8 : 0.5, 0.25, mat('#555'), px, py, tall + 0.8);
      boxAt(f[0] ? 0.3 : 3.6, f[0] ? 3.6 : 0.3, 3.2, mat('#0d0d0d'), px + f[0] * (deep / 2 + 0.01), py + f[1] * (deep / 2 + 0.01), 2.3);
    }
  });
  [0, 1].forEach((k) => {
    const s = k ? 1 : -1, px = c[0] + a[0] * 2.54 * s, py = c[1] + a[1] * 2.54 * s;
    pin(`${id}.in${k + 1}`, id, `${texts[k]} (screw in)`, [px + f[0] * 4.2, py + f[1] * 4.2, 4.0], [f[0], f[1], 0]);
    pin(`${id}.b${k + 1}`, id, texts[k], [px - f[0] * 4.25, py - f[1] * 4.25, 1.0], [-f[0], -f[1], 0]);
  });
}
terminal('tbat', 'Battery terminal', [X(1), (Y(16) + Y(18)) / 2], [-1, 0], ['BAT +', 'BAT −']);
terminal('ttop', 'Top-motor terminal', [(X(21) + X(23)) / 2, 46.2], [0, 1], ['TOP 1', 'TOP 2']);
terminal('tbot', 'Bottom-motor terminal', [66.2, 34.62], [1, 0], ['BOTTOM 1', 'BOTTOM 2']);

// ---------------------------------------------------------------- capacitors and diodes
function ecap(id, name, cx, cy, r, h, color, value) {     // radial electrolytic, − stripe facing +X
  part(id, name, [cx, cy, h + 2], () => {
    cylAt(r, h, mat(color, { r: 0.35 }), cx, cy, 0.4, 'z', 40);
    const g = new THREE.CylinderGeometry(r + 0.04, r + 0.04, h * 0.94, 24, 1, true, Math.PI / 2 - 0.5, 1.0);
    g.rotateX(Math.PI / 2);
    add(g, mat('#cfd3d8', { r: 0.4 }), cx, cy, 0.4 + h / 2);
    cylAt(r * 0.9, 0.15, mat('#b9bec4', { m: 0.6, r: 0.35 }), cx, cy, h + 0.4, 'z', 40);
    const t = tex(4, 4, (gc) => { gc.fillStyle = '#b9bec4'; gc.fillRect(0, 0, 4, 4); label(gc, value, 2, 2, 1.0, '#333'); }, 40);
    add(new THREE.PlaneGeometry(r * 1.2, r * 1.2), mat('#fff', { map: t }), cx, cy, h + 0.56);
  });
}
ecap('c470', '470 µF capacitor (stripe = −)', 45.58, 42.78, 4, 12, '#1d2448', '470µF');
pin('c470.p', 'c470', '470 µF  + leg', [43.83, 38.2, 0.8], [0, -1, 0]);           // every cable on a leg meets at one hole
pin('c470.n', 'c470', '470 µF  − leg (stripe)', [47.33, 38.2, 0.8], [0, -1, 0]);
ecap('c100', '100 µF capacitor (stripe = −)', 15.1, 40.24, 2.5, 11, '#283a9a', '100');
pin('c100.p', 'c100', '100 µF  + leg', [12.0, 40.24, 0.8], [-1, 0, 0]);
pin('c100.n', 'c100', '100 µF  − leg (stripe)', [18.2, 40.24, 0.8], [1, 0, 0]);

function diode(id, name, xk, xa, y) {                   // axial 1N4007 lying on the board, stripe = cathode
  const len = 4.6, r = 1.35, z = r + 0.35, cx = (xk + xa) / 2, s = Math.sign(xk - xa);
  part(id, name, [cx, y, 5], () => {
    cylAt(r, len, mat('#161616', { r: 0.45 }), cx, y, z, 'x');
    cylAt(r + 0.03, 0.75, mat('#d6dadf', { r: 0.4 }), cx + s * (len / 2 - 0.6), y, z, 'x');
    const lead = mat(TIN, { m: 0.85, r: 0.3 });
    for (const x of [xk, xa]) {
      rod([cx + Math.sign(x - cx) * len / 2, y, z], [x, y, z], 0.3, lead);
      rod([x, y, z], [x, y, -0.2], 0.3, lead);
    }
  });
}
const DY = Y(17);
diode('d2', 'Diode 2 (1N4007, stripe toward the Pico)', X(7), X(10), DY);
diode('d1', 'Diode 1 (1N4007)', X(11), X(14), DY);
pin('d2.k', 'd2', 'diode 2, stripe end', [X(7) - 0.6, DY, 0.7], [-1, 0, 0]);
pin('d2.a', 'd2', 'diode 2, plain end', [X(10) + 0.6, DY, 0.7], [1, 0, 0]);
pin('d1.k', 'd1', 'diode 1, stripe end', [X(11) - 0.6, DY, 0.7], [-1, 0, 0]);
pin('d1.a', 'd1', 'diode 1, plain end', [X(14) + 0.6, DY, 0.7], [1, 0, 0]);

// ---------------------------------------------------------------- loose parts: battery box, switch, motors
part('bat', '4 × AA battery box (its own switch ON)', [-61.5, 29, 21], () => {
  const top = tex(67, 62, (g) => {
    g.fillStyle = '#222427'; g.fillRect(0, 0, 67, 62);
    g.strokeStyle = '#3a3d42'; g.lineWidth = 0.6; g.strokeRect(3, 3, 61, 56);
    label(g, '4 × AA', 33.5, 36, 7, '#9ea3aa');
    label(g, '4.8–6 V', 33.5, 26, 4, '#7d828a');
  }, 8);
  topBox(67, 62, 19, mat('#202225', { r: 0.6 }), mat('#fff', { map: top, r: 0.6 }), -61.5, 29, -1.6);
  boxAt(9, 5, 2.2, mat('#3b3e43'), -40, 10, 17.4);                                     // the box's own switch
  boxAt(3.4, 3, 1.4, mat('#d0d3d7'), -38.6, 10, 19.4);
  cylAt(2.6, 1.2, mat('#111'), -27.4, 49, 8, 'x');                                     // lead grommet
});
pin('bat.neg', 'bat', 'battery box − (black lead)', [-26.6, 51.2, 8.4], [1, 0, 0]);
pin('bat.pos', 'bat', 'battery box + (red lead)', [-26.6, 46.8, 7.6], [1, 0, 0]);

part('sw', 'Power switch KCD1 (either tab)', [-14, 22, 17], () => {
  boxAt(21, 2, 15, mat('#1b1c1e', { r: 0.5 }), -14, 11, -1.6);                          // bezel
  const rk = boxAt(14.5, 2.4, 9.5, mat('#26272a', { r: 0.4 }), -14, 9.4, 1.2);          // rocker
  rk.rotation.x = 0.12;
  const t = tex(14.5, 9.5, (g) => { g.fillStyle = '#26272a'; g.fillRect(0, 0, 15, 10); label(g, 'I', 4.2, 4.75, 4, '#ddd'); label(g, 'O', 10.3, 4.75, 3.6, '#ddd'); }, 20);
  const face = add(new THREE.PlaneGeometry(14.5, 9.5), mat('#fff', { map: t }), -14, 8.15, 5.95);
  face.rotation.x = Math.PI / 2 + 0.12;
  boxAt(19, 20, 12, mat('#151618', { r: 0.6 }), -14, 22, -1);                           // body
  for (const x of [-18, -10]) boxAt(0.8, 7, 4.8, mat('#c9a457', { m: 0.8, r: 0.3 }), x, 35.5, 3.4);
});
pin('sw.1', 'sw', 'switch tab', [-18, 39.4, 5.8], [0, 1, 0]);
pin('sw.2', 'sw', 'switch tab', [-10, 39.4, 5.8], [0, 1, 0]);

function motor(id, name, tabs, angle, order = [1, -1]) {   // N20 lying on the table, tab end at `tabs`, shaft along `angle`
  part(id, name, [tabs[0] + 18 * Math.cos(angle), tabs[1] + 18 * Math.sin(angle), 13], () => {
    const g = new THREE.Group();
    g.position.set(tabs[0], tabs[1], 0);
    g.rotation.z = angle;
    cur.group.add(g);
    into = g;
    const zc = 3.4;
    boxAt(2.5, 9, 8, mat('#1f1f1f', { r: 0.6 }), 1.25, 0, zc - 4);                       // end cap
    const can = new THREE.CylinderGeometry(6, 6, 15, 36);
    can.rotateZ(Math.PI / 2); can.scale(1, 1, 10 / 12);
    add(can, mat('#c3c8ce', { m: 0.8, r: 0.35 }), 2.5 + 7.5, 0, zc);
    boxAt(9, 12, 10, mat('#b5a27a', { m: 0.6, r: 0.4 }), 17.5 + 4.5, 0, zc - 5);         // gearbox
    cylAt(1.5, 10, mat(TIN, { m: 0.85, r: 0.3 }), 26.5 + 5, 0, zc, 'x', 20);             // D-shaft
    const brass = mat('#c9a457', { m: 0.8, r: 0.3 });
    for (const s of [-1, 1]) boxAt(2.2, 1.6, 0.35, brass, -1.1, s * 3.2, zc + 1.6);         // tabs
    cylAt(2.3, 1.8, mat('#d39b3c', { r: 0.5 }), -3.6, 0, zc + 4.6, 'x', 24);              // 100 nF disc
    for (const s of [-1, 1]) rod([-3.6, s * 1.2, zc + 3.4], [-1.6, s * 3.2, zc + 1.9], 0.22, mat(TIN, { m: 0.8, r: 0.3 }));
    into = null;
  });
  const g = comps[id].group.children[0];
  g.updateMatrixWorld(true);
  order.forEach((s, k) => {                          // tab 1 on the side of terminal 1, so the cables do not cross
    const p = g.localToWorld(new THREE.Vector3(-2.3, s * 3.2, 5.0));
    const out = new THREE.Vector3(-Math.cos(angle), -Math.sin(angle), 0);
    pin(`${id}.${k + 1}`, id, `${name.split(' (')[0]}, tab ${k + 1}`, p.toArray(), out.toArray());
  });
}
motor('mtop', 'TOP motor (upper wheel)', [(X(21) + X(23)) / 2, 74], Math.PI / 2);
motor('mbot', 'BOTTOM motor (lower wheel)', [86, 34.62], 0, [-1, 1]);

// ---------------------------------------------------------------- the cables
const C = {
  red: ['red', '#d9302c'], black: ['black', '#1b1b1d'], orange: ['orange', '#f08a24'], bare: ['bare wire', '#c9ccd1'],
  yellow: ['yellow', '#f2c41f'], green: ['green', '#2ea84a'], blue: ['blue', '#2f6fe0'], purple: ['purple', '#8b4fd1'],
  white: ['white', '#f4f4f2'], grey: ['grey', '#8d9096'], brown: ['brown', '#8a5a2b'], pink: ['pink', '#f07fb2'],
  cyan: ['cyan', '#19b8c8'], lime: ['lime', '#9ad12a'],
};
const W = [];
const wire = (id, from, to, c, text, o = {}) => W.push({ id, from, to, color: C[c][1], colorName: C[c][0], text, ...o });

wire('w1', 'bat.pos', 'sw.1', 'red', 'Battery box red lead → one switch tab', { r: 0.8 });
wire('w2', 'sw.2', 'tbat.in1', 'red', 'Other switch tab → battery terminal BAT +', { r: 0.8 });
wire('w3', 'bat.neg', 'tbat.in2', 'black', 'Battery box black lead → battery terminal BAT −', { r: 0.8, h: 7 });

wire('w4', 'tbat.b1', 'c470.p', 'red', 'BAT + → 470 µF + leg (the leg without the stripe)',
  { via: [[11.0, 39.2, 1.7], [12.2, 36.9, 1.7], [38.6, 36.9, 1.7]] });
wire('w5', 'c470.p', 'drv.VM', 'red', '470 µF + leg → DRV8833 VM (VCC)', { h: 7 });
wire('w6', 'tbat.b2', 'c470.n', 'black', 'BAT − → 470 µF − leg (striped side)',
  { via: [[11.2, 47.6, 1.7], [13.0, 48.9, 1.7], [49.0, 48.9, 1.7], [51.0, 47.2, 1.7], [51.0, 39.5, 1.7], [49.6, 37.0, 1.7]] });   // around the capacitor's east side
wire('w7', 'c470.n', 'drv.GND', 'black', '470 µF − leg → DRV8833 GND', { h: 9 });

wire('w8', 'c470.p', 'd1.a', 'red', '470 µF + leg → diode 1, plain end', { via: [[40.6, 39.0, 2.2]] });
wire('w9', 'd1.k', 'd2.a', 'bare', 'Diode 1, stripe end → diode 2, plain end (join the two legs)', { h: 1.2, r: 0.3 });
wire('w10', 'd2.k', 'c100.p', 'orange', 'Diode 2, stripe end → 100 µF + leg', { h: 15 });
wire('w11', 'c100.p', `pico.p${pinNo('VSYS')}`, 'orange', `100 µF + leg → Pico VSYS (pin ${pinNo('VSYS')})`, { h: 9 });
wire('w12', 'c100.n', 'pico.p38', 'black', '100 µF − leg → Pico GND (pin 38)', { h: 14 });
wire('w13', 'pico.p38', 'tbat.b2', 'black', 'Pico GND (pin 38) → BAT −', { h: 12 });

const SIG = [
  ['PIN_TOP_IN1', 'AIN1', 'yellow', 'top motor, one direction'],
  ['PIN_TOP_IN2', 'AIN2', 'green', 'top motor, other direction'],
  ['PIN_BOT_IN1', 'BIN1', 'blue', 'bottom motor, one direction'],
  ['PIN_BOT_IN2', 'BIN2', 'purple', 'bottom motor, other direction'],
  ['PIN_DRV_SLEEP', 'EEP', 'white', 'switches the driver on'],
  ['PIN_DRV_FAULT', 'ULT', 'grey', 'reports a driver fault'],
];
SIG.forEach(([key, drv, c, why], i) => {
  const gpN = `GP${PM.gpio[key]}`, n = pinNo(gpN), [px] = pPos(n), dx = pins[`drv.${drv}`].p.x;
  const y = 7.0 - 1.2 * i, z = 1.5 + 1.3 * i;                      // one lane per cable in the strip below
  wire(`s${i}`, `pico.p${n}`, `drv.${drv}`, c, `Pico ${gpN} (pin ${n}) → DRV8833 ${drv}: ${why}`,
    { via: [[px, y + 1.6, z + 0.4], [px + 1.6, y, z], [dx - 1.6, y, z], [dx, y + 1.4, z + 0.3]] });
});

wire('m1', 'drv.AOUT1', 'ttop.b1', 'brown', 'DRV8833 AOUT1 (OUT1) → top-motor terminal 1', { h: 8 });
wire('m2', 'drv.AOUT2', 'ttop.b2', 'pink', 'DRV8833 AOUT2 (OUT2) → top-motor terminal 2', { h: 10 });
wire('m3', 'drv.BOUT1', 'tbot.b1', 'cyan', 'DRV8833 BOUT1 (OUT3) → bottom-motor terminal 1', { h: 5 });
wire('m4', 'drv.BOUT2', 'tbot.b2', 'lime', 'DRV8833 BOUT2 (OUT4) → bottom-motor terminal 2', { h: 8 });
wire('m5', 'ttop.in1', 'mtop.1', 'brown', 'Top-motor terminal 1 → top motor, tab 1', { r: 0.8 });
wire('m6', 'ttop.in2', 'mtop.2', 'pink', 'Top-motor terminal 2 → top motor, tab 2', { r: 0.8 });
wire('m7', 'tbot.in1', 'mbot.1', 'cyan', 'Bottom-motor terminal 1 → bottom motor, tab 1', { r: 0.8 });
wire('m8', 'tbot.in2', 'mbot.2', 'lime', 'Bottom-motor terminal 2 → bottom motor, tab 2', { r: 0.8 });

const STEPS = [
  { title: 'Battery and power switch', view: [-0.3, -0.75, 0.9], wires: ['w1', 'w2', 'w3'],
    text: 'The switch goes in the red (+) lead only: battery red → either switch tab, the other tab → <b>BAT +</b> on the board. The black lead goes straight to <b>BAT −</b>. Leave the switch on <b>O</b> (off) while you work.' },
  { title: 'Power for the motor driver', view: [0.1, -0.55, 1], wires: ['w4', 'w5', 'w6', 'w7'],
    text: 'BAT + and BAT − go to the two legs of the 470 µF capacitor, and from those legs on to the driver’s <b>VM</b> and <b>GND</b>. The capacitor keeps the battery voltage steady when the motors start.',
    warn: 'The capacitor’s light stripe marks the − leg (also the shorter leg). Put it in the wrong way round and it can burst.' },
  { title: 'Power for the Pico', view: [-0.15, 0.7, 1], wires: ['w8', 'w9', 'w10', 'w11', 'w12', 'w13'], comps: ['d1', 'd2'],
    text: 'Two diodes in a row drop the battery voltage by about 1.4 V, so the Pico’s <b>VSYS</b> never sees more than it can take. After them, the 100 µF capacitor sits between VSYS and the Pico’s <b>GND</b>, and that GND goes back to BAT −.',
    warn: 'Both diode stripes point toward the Pico. The 100 µF stripe (−) goes to GND. Before you plug the Pico in, switch on and measure VSYS at the header: it must be under 5.2 V.' },
  { title: 'Control cables: Pico → driver', view: [0.05, -0.75, 0.85], wires: SIG.map((_, i) => `s${i}`),
    text: 'Six thin cables carry the Pico’s commands. The Pico pin numbers come from <code>firmware/config.py</code>. Many red driver boards print <b>IN1–IN4</b> instead of AIN1/AIN2/BIN1/BIN2: the labels in this view show both names. Follow the printed names on your board, because pin order differs between clones.' },
  { title: 'Driver outputs → motor terminals', view: [0.1, 0.3, 1], wires: ['m1', 'm2', 'm3', 'm4'],
    text: '<b>AOUT1/AOUT2</b> (OUT1/OUT2) feed the top motor, <b>BOUT1/BOUT2</b> (OUT3/OUT4) the bottom one. These carry the motor current, so use the thicker wire from the kit.' },
  { title: 'Motors', view: [-0.4, -0.5, 1], wires: ['m5', 'm6', 'm7', 'm8'], comps: ['mtop', 'mbot'],
    text: 'Solder a 100 nF ceramic capacitor straight across each motor’s two tabs (it is already drawn there), then the two cables. Which tab gets which cable does not matter: if a wheel turns the wrong way, flip <code>TOP_REVERSED</code> or <code>BOT_REVERSED</code> in config.py, or swap that motor’s two cables.' },
];
W.forEach((w) => { w.step = STEPS.findIndex((s) => s.wires.includes(w.id)); });

// geometry: each cable leaves its pin straight out, arcs over, and lands straight in
const UP = new THREE.Vector3(0, 0, 1);
function curveFor(w) {
  const a = pins[w.from], b = pins[w.to];
  const A1 = a.p.clone().addScaledVector(a.out, 1.4).addScaledVector(UP, 0.5);
  const B1 = b.p.clone().addScaledVector(b.out, 1.4).addScaledVector(UP, 0.5);
  let mids;
  if (w.via) mids = w.via.map((v) => new THREE.Vector3(...v));
  else {
    const d = A1.distanceTo(B1), h = w.h ?? THREE.MathUtils.clamp(d * 0.3, 3, 16);
    if (d < 9) mids = [A1.clone().lerp(B1, 0.5).addScaledVector(UP, h)];
    else {
      const A2 = A1.clone().addScaledVector(a.out, Math.min(5, d * 0.2)).addScaledVector(UP, h * 0.75);
      const B2 = B1.clone().addScaledVector(b.out, Math.min(5, d * 0.2)).addScaledVector(UP, h * 0.75);
      mids = [A2, A2.clone().lerp(B2, 0.5).addScaledVector(UP, h * 0.25), B2];
    }
  }
  return new THREE.CatmullRomCurve3([a.p, A1, ...mids, B1, b.p], false, 'centripetal');
}
const solder = new THREE.SphereGeometry(1, 14, 10), pickMat = new THREE.MeshBasicMaterial({ visible: false });
for (const w of W) {
  w.curve = curveFor(w);
  const r = w.r ?? 0.55;
  w.mat = new THREE.MeshStandardMaterial({ color: w.color, roughness: w.colorName === 'bare wire' ? 0.3 : 0.45, metalness: w.colorName === 'bare wire' ? 0.8 : 0 });
  w.mesh = new THREE.Mesh(new THREE.TubeGeometry(w.curve, 120, r, 10, false), w.mat);
  w.mesh.castShadow = true;
  w.mesh.userData.wire = w;
  w.pick = new THREE.Mesh(new THREE.TubeGeometry(w.curve, 60, 1.8, 6, false), pickMat);   // fatter, invisible: easier to hover
  w.pick.userData.wire = w;
  scene.add(w.mesh, w.pick);
  w.ends = [w.from, w.to].map((pid) => {
    const s = new THREE.Mesh(solder, w.mat);
    s.scale.setScalar(r * 1.35);
    s.position.copy(pins[pid].p);
    scene.add(s);
    return s;
  });
}

// ---------------------------------------------------------------- labels
const labelBox = $('#labels');
function mkLabel(text, cls = 'lab') { const d = document.createElement('div'); d.className = cls; d.textContent = text; labelBox.appendChild(d); return d; }
for (const c of Object.values(comps)) if (c.id !== 'board') { c.el = mkLabel(c.name.split(' (')[0]); c.el.pos = c.at; }
let pinLabels = [];
const v = new THREE.Vector3();
const NS = 'http://www.w3.org/2000/svg', leaders = document.createElementNS(NS, 'svg');
leaders.id = 'leaders';
labelBox.prepend(leaders);
function svgEl(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); leaders.appendChild(e); return e; }
// Pin labels first, then part names. A label that would cover one already placed moves up;
// pin labels keep a leader line down to a dot on the exact solder point.
function layoutLabels() {
  const cw = canvas.clientWidth, boxes = [];
  const parts = Object.values(comps).filter((c) => c.el).map((c) => c.el);
  for (const el of [...pinLabels, ...parts]) {
    let vis = !el.hidden && !el.classList.contains('dim');
    if (vis) { v.copy(el.pos).project(camera); vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05; }
    el.style.display = vis ? '' : 'none';
    if (el.line) el.line.style.display = el.dot.style.display = vis ? '' : 'none';
    if (!vis) continue;
    const ax = (v.x + 1) / 2 * cw, ay = (1 - v.y) / 2 * canvas.clientHeight;
    if (!el.w) { el.w = el.offsetWidth; el.h = el.offsetHeight; }
    const w = el.w, h = el.h;
    let x = THREE.MathUtils.clamp(ax - w / 2, 2, cw - w - 2), y = ay - h - (el.line ? 14 : 2);
    for (let k = 0; k < 16; k++) {
      const b = boxes.find((o) => x < o.x + o.w + 3 && x + w + 3 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y);
      if (!b) break;
      y = b.y - h - 2;
    }
    boxes.push({ x, y, w, h });
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    if (el.line) {
      for (const [k, val] of Object.entries({ x1: x + w / 2, y1: y + h, x2: ax, y2: ay })) el.line.setAttribute(k, val);
      el.dot.setAttribute('cx', ax); el.dot.setAttribute('cy', ay);
    }
  }
}

// ---------------------------------------------------------------- selection
const sel = { step: -1, wire: null, comps: new Set() };
const litWires = () => (sel.wire ? [sel.wire] : sel.step < 0 ? W.map((w) => w.id) : STEPS[sel.step].wires);
function dimComp(c, lit) {
  for (const m of c.mats) {
    m.transparent = !lit; m.opacity = lit ? 1 : 0.22; m.depthWrite = lit; m.needsUpdate = true;
  }
  c.group.traverse((o) => { if (o.isMesh) o.castShadow = lit; });
}
function applySel(frameIt = true) {
  const ids = litWires(), all = !sel.wire && sel.step < 0;
  const comp = new Set(all ? Object.keys(comps) : ['board']);
  for (const w of W) {
    const lit = ids.includes(w.id);
    w.mat.transparent = !lit; w.mat.opacity = lit ? 1 : 0.08; w.mat.depthWrite = lit; w.mat.needsUpdate = true;
    w.mesh.castShadow = lit;
    if (lit) { comp.add(pins[w.from].comp); comp.add(pins[w.to].comp); }
  }
  if (!sel.wire && sel.step >= 0) for (const c of STEPS[sel.step].comps || []) comp.add(c);
  sel.comps = comp;
  for (const c of Object.values(comps)) {
    dimComp(c, comp.has(c.id));
    if (c.el) c.el.classList.toggle('dim', !comp.has(c.id));
  }
  for (const el of pinLabels) { el.remove(); el.line.remove(); el.dot.remove(); }
  pinLabels = [];
  if (!all) {
    const seen = new Set();
    for (const w of W.filter((x) => ids.includes(x.id))) for (const pid of [w.from, w.to]) {
      if (seen.has(pid)) continue;
      seen.add(pid);
      const el = mkLabel(pins[pid].label, 'lab pin');
      const col = w.color === '#f4f4f2' || w.color === '#1b1b1d' ? '#888' : w.color;
      el.style.setProperty('--c', col);
      el.pos = pins[pid].p;
      el.line = svgEl('line', { stroke: col, 'stroke-width': 1.5 });
      el.dot = svgEl('circle', { r: 3.5, fill: col, stroke: '#fff', 'stroke-width': 1.2 });
      pinLabels.push(el);
    }
  }
  document.querySelectorAll('#wsteps > li').forEach((li, i) => li.classList.toggle('on', i === sel.step));
  document.querySelectorAll('.wires button').forEach((b) => b.classList.toggle('on', b.dataset.w === sel.wire));
  $('#tip3').hidden = true;
  $('#count').textContent = sel.step < 0 ? `All ${W.length} cables` : `Step ${sel.step + 1} of ${STEPS.length}`;
  $('#prev').disabled = sel.step <= 0;
  $('#next').disabled = sel.step >= STEPS.length - 1;
  if (frameIt) {
    if (all) frame(overviewPts(), new THREE.Vector3(...HOME), 0.9);
    else {
      const pts = [];
      for (const w of W.filter((x) => ids.includes(x.id))) pts.push(...w.curve.getPoints(16));
      for (const c of comp) if (c !== 'board') {                          // keep whole parts in view, not just the cables
        const b = new THREE.Box3().setFromObject(comps[c].group);
        for (let k = 0; k < 8; k++) pts.push(new THREE.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z));
      }
      const view = sel.step >= 0 && STEPS[sel.step].view;
      frame(pts, view && new THREE.Vector3(...view));
    }
  }
}
const HOME = [-0.35, -0.8, 0.85];                    // the default view: from the front left, above
function overviewPts() {
  return [[-95, -2, 18], [-95, 60, 18], [-28, -2, 18], [-28, 60, 18], [70, 0, 0], [70, 50, 0],      // battery box, board
    [122, 34, 6], [58, 110, 6], [-24, 8, 14]].map((q) => new THREE.Vector3(...q));                   // motor shafts, switch
}

// ---------------------------------------------------------------- camera framing
let tween = null;
function frame(pts, dir, fill = 0.68) {              // ease the camera so every point fits `fill` of the view
  const center = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
  const d = (dir || camera.position.clone().sub(controls.target)).normalize();
  if (d.z < 0.5) { d.z = 0.5; d.normalize(); }
  const probe = camera.clone(), vf = THREE.MathUtils.degToRad(camera.fov) / 2;
  let dist = 400;
  for (let k = 0; k < 4; k++) {                       // the projected size shrinks roughly as 1 / distance
    probe.position.copy(center).addScaledVector(d, dist);
    probe.lookAt(center);
    probe.updateMatrixWorld();
    let m = 0;
    for (const p of pts) { v.copy(p).project(probe); m = Math.max(m, Math.abs(v.x), Math.abs(v.y)); }
    dist *= m / fill;
  }
  dist = Math.max(dist, 24 / Math.tan(vf));          // never closer than a ~48 mm wide view
  tween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(),
    p1: center.clone().addScaledVector(d, dist), t1: center };
}

// ---------------------------------------------------------------- side panel
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
$('#wsteps').innerHTML = STEPS.map((s, i) => `<li data-s="${i}"><h3>${s.title}</h3><p>${s.text}</p>
  ${s.warn ? `<p class="warn">${s.warn}</p>` : ''}
  <ul class="wires">${s.wires.map((id) => { const w = W.find((x) => x.id === id);
    return `<li><button data-w="${id}"><span class="sw" style="--c:${w.color}"></span><span><b>${w.colorName}</b> · ${esc(w.text)}</span></button></li>`; }).join('')}</ul></li>`).join('');
$('#wsteps').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-w]');
  if (b) { const w = W.find((x) => x.id === b.dataset.w); sel.wire = sel.wire === w.id ? null : w.id; sel.step = w.step; applySel(); return; }
  const li = e.target.closest('#wsteps > li');
  if (li) { sel.wire = null; sel.step = Number(li.dataset.s); applySel(); }
});
const go = (i) => { sel.wire = null; sel.step = THREE.MathUtils.clamp(i, 0, STEPS.length - 1); applySel(); $('#wsteps > li.on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
$('#prev').addEventListener('click', () => go(sel.step - 1));
$('#next').addEventListener('click', () => go(sel.step + 1));
$('#all').addEventListener('click', () => { sel.wire = null; sel.step = -1; applySel(); });
$('#v-all').addEventListener('click', () => frame(overviewPts(), new THREE.Vector3(...HOME), 0.9));
$('#v-board').addEventListener('click', () => frame([[0, 0, 0], [70, 0, 0], [0, 50, 0], [70, 50, 0], [35, 25, 13]]
  .map((q) => new THREE.Vector3(...q)), new THREE.Vector3(...HOME), 0.95));
$('#names').addEventListener('change', (e) => { labelBox.classList.toggle('nonames', !e.target.checked); for (const c of Object.values(comps)) if (c.el) c.el.hidden = !e.target.checked; });
if (matchMedia('(max-width: 860px)').matches) {        // phone: pin labels only, part names would crowd the small view
  $('#names').checked = false;
  $('#names').dispatchEvent(new Event('change'));
}
root.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') go(sel.step + 1);
  if (e.key === 'ArrowLeft') go(sel.step - 1);
});

// ---------------------------------------------------------------- hover and click in the 3D view
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tip = $('#tip3');
let down = null;
function hit(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const lit = new Set(litWires());
  const targets = [...W.filter((w) => lit.has(w.id)).map((w) => w.pick), ...Object.values(comps).filter((c) => c.id !== 'board' && sel.comps.has(c.id)).map((c) => c.group)];   // faded parts let the mouse through
  const h = ray.intersectObjects(targets, true)[0];
  if (!h) return null;
  if (h.object.userData.wire) return { wire: h.object.userData.wire };
  let o = h.object; while (o && !o.userData.comp) o = o.parent;
  return o ? { comp: comps[o.userData.comp] } : null;
}
canvas.addEventListener('pointermove', (e) => {
  const h = hit(e);
  tip.hidden = !h;
  if (!h) return;
  tip.textContent = h.wire ? `${h.wire.colorName} cable: ${h.wire.text}` : h.comp.name;
  const r = canvas.getBoundingClientRect();
  tip.style.left = `${Math.min(e.clientX - r.left + 14, r.width - 330)}px`;
  tip.style.top = `${e.clientY - r.top + 14}px`;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  const h = hit(e);
  if (h && h.wire) { sel.wire = h.wire.id; sel.step = h.wire.step; applySel(); document.querySelector(`.wires button[data-w="${h.wire.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
});

// ---------------------------------------------------------------- loop
function resize() {
  if (!context.active()) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
resize();
camera.position.set(-60, -260, 260);
controls.target.set(10, 40, 0);
frame(overviewPts(), new THREE.Vector3(...HOME), 0.9);
tween.t = 1;
camera.position.copy(tween.p1); controls.target.copy(tween.t1);
applySel(false);
let last = performance.now();
renderer.setAnimationLoop((now) => {
  if (!context.active()) { last = now; return; }
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  resize();
  if (tween && tween.t < 1) {
    tween.t = Math.min(1, tween.t + (matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : dt / 0.7));
    const k = 1 - (1 - tween.t) ** 3;
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
  }
  controls.update();
  layoutLabels();
  renderer.render(scene, camera);
});

}
