import * as THREE from './web/vendor/three/three.module.min.js';
import { OrbitControls } from './web/vendor/three/OrbitControls.js';
import { STLLoader } from './web/vendor/three/STLLoader.js';
export async function init(root, context) {
const base = new URL('./web/', import.meta.url);
const document = { querySelector: (s) => root.querySelector(s), querySelectorAll: (s) => root.querySelectorAll(s), createElement: (s) => globalThis.document.createElement(s), createElementNS: (...a) => globalThis.document.createElementNS(...a), documentElement: root.host };
const fetch = async (path) => { const r = await globalThis.fetch(new URL(path, base)); if (!r.ok) throw new Error('Could not load ' + path); return r; };
// PingPongThrower — interactive model, simulation and documentation viewer.
// Meshes come from cad/thrower.scad via `make viz`; positions are CAD millimetres
// (Z up). The `cad` group rotates that frame into three.js (Y up).

const $ = (s) => document.querySelector(s);
const manifest = await fetch('data/assembly.json').then((r) => r.json());
const bom = await fetch('data/bom.json').then((r) => r.json());
const PH = await fetch('data/phases.json').then((r) => r.json());
const D = manifest.dims;
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// ---------------------------------------------------------------- scene
const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 5, 40000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(1500, 3000, -100);
sun.target.position.set(0, 0, -1300);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -2200, right: 2200, top: 2200, bottom: -2200, near: 100, far: 9000 });
scene.add(sun);

function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  scene.background = new THREE.Color(cs.getPropertyValue('--stage').trim() || '#dfe6ec');
}
themeColors();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeColors);

const cad = new THREE.Group();            // CAD frame: X right, Y launch, Z up (mm)
cad.rotation.x = -Math.PI / 2;
scene.add(cad);

// ---------------------------------------------------------------- hierarchy
const groups = {};
const rig = new THREE.Group(); cad.add(rig);   // the robot on the table; lowered for the bench test phases
groups.base = new THREE.Group(); rig.add(groups.base);
groups.yaw = new THREE.Group(); rig.add(groups.yaw);
function pivotPair(parent, at) {          // rotate children about an axis through `at`
  const p = new THREE.Group(); p.position.copy(at); parent.add(p);
  const o = new THREE.Group(); o.position.copy(at).negate(); p.add(o);
  return [p, o];
}
const [rockerPivot, rockerOff] = pivotPair(groups.yaw, v3(D.rocker_axis));
const [pitchPivot, pitchOff] = pivotPair(groups.yaw, v3(D.pivot));
const [wtPivot, wtOff] = pivotPair(pitchOff, v3(D.wheel_top));
const [wbPivot, wbOff] = pivotPair(pitchOff, v3(D.wheel_bot));
rockerPivot.rotation.x = THREE.MathUtils.degToRad(D.esc_alpha);   // rest: lower finger in
groups.rocker = rockerOff; groups.pitch = pitchOff; groups.wheel_top = wtOff; groups.wheel_bot = wbOff;

// exploded-view offsets (mm, CAD frame)
const EXPLODE = {
  lid: [0, 0, 40], bearings: [0, 0, 25], coupler: [0, 0, -20], swing_servo: [0, 0, -35], battery: [-70, 0, 0],
  panel_knobs: [0, -40, 0], turret: [0, 0, 80], bolt: [0, 0, 130], cheeks: [0, 0, 115], feed_tube: [0, 0, 180],
  hopper: [0, 0, 270], feed_servo: [0, -70, 180], rocker: [0, -40, 180], head_left: [-80, 0, 115],
  head_right: [80, 0, 115], clamps: [130, 0, 115], motors: [160, 0, 115], lock_knobs: [0, 0, 115],
  hub_top: [55, 0, 115], hub_bot: [55, 0, 115], tyre_top: [0, 0, 135], rim_top: [0, 0, 135],
  tyre_bot: [0, 0, 95], rim_bot: [0, 0, 95],
};
const meshes = {};
const loader = new STLLoader();
const metal = /bolt|bearings|motors/;
await Promise.all(manifest.meshes.filter((m) => m.group !== 'ball').map((m) => new Promise((resolve) => {
  loader.load(new URL(m.file, base).href, (geo) => {
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: m.color, roughness: metal.test(m.file) ? 0.35 : 0.62, metalness: metal.test(m.file) ? 0.7 : 0.04,
      transparent: m.opacity < 1, opacity: m.opacity, depthWrite: m.opacity >= 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const key = m.file.replace('models/', '').replace('.stl', '');
    mesh.userData = { label: m.label, key, color: new THREE.Color(m.color), opacity: m.opacity };
    mesh.castShadow = m.opacity >= 1;
    mesh.receiveShadow = true;
    groups[m.group].add(mesh);
    meshes[key] = mesh;
    resolve();
  }, undefined, () => { context.warn('Some 3D models could not be loaded. See the reference image and build documentation below.'); resolve(); });
})));
$('#loading').hidden = true;

// ---------------------------------------------------------------- table (CAD frame)
const TABLE = { w: 1525, l: 2740, y0: -100, h: 760, net: 152.5 };
TABLE.netY = TABLE.y0 + TABLE.l / 2;
{
  const t = new THREE.Group(); cad.add(t);
  const blue = new THREE.MeshStandardMaterial({ color: 0x1f4e8c, roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.8 });
  const box = (sx, sy, sz, x, y, z, mat, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z); m.receiveShadow = shadow; m.castShadow = shadow; t.add(m); return m;
  };
  const cy = TABLE.y0 + TABLE.l / 2;
  box(TABLE.w, TABLE.l, 25, 0, cy, -12.5, blue);
  for (const s of [-1, 1]) box(20, TABLE.l, 1, s * (TABLE.w / 2 - 10), cy, 0.6, white, false);
  for (const y of [TABLE.y0 + 10, TABLE.y0 + TABLE.l - 10]) box(TABLE.w, 20, 1, 0, y, 0.6, white, false);
  box(3, TABLE.l, 1, 0, cy, 0.6, white, false);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(50, 50, TABLE.h - 25, sx * (TABLE.w / 2 - 120), cy + sy * (TABLE.l / 2 - 250), -(TABLE.h + 25) / 2, dark);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(TABLE.w + 305, TABLE.net),
    new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  net.rotation.x = Math.PI / 2; net.position.set(0, TABLE.netY, TABLE.net / 2); t.add(net);
  box(TABLE.w + 305, 4, 12, 0, TABLE.netY, TABLE.net - 6, white, false);
  for (const s of [-1, 1]) box(12, 12, TABLE.net + 20, s * (TABLE.w / 2 + 152), TABLE.netY, TABLE.net / 2, dark);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ color: 0x9a9286, roughness: 0.95 }));
  floor.position.z = -TABLE.h; floor.receiveShadow = true; t.add(floor);
}

// ---------------------------------------------------------------- balls
const ballGeo = new THREE.SphereGeometry(D.ball_d / 2, 24, 16);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xff8c1a, roughness: 0.45 });
const newBall = (parent) => { const b = new THREE.Mesh(ballGeo, ballMat); b.castShadow = true; parent.add(b); return b; };
const stackZ0 = D.ball1_z;                                           // ball 1 resting on the lower finger
const stack = [0, 1, 2].map((i) => { const b = newBall(groups.yaw); b.position.set(0, 0, stackZ0 + i * D.ball_d); return b; });
const heap = [];                                                     // balls resting in the hopper
{ // balls heaped in the hopper: greedy drop, each ball takes the lowest free spot on the funnel or the heap
  const r = D.ball_d / 2, slope = THREE.MathUtils.degToRad(D.hopper_slope);
  const coneZ = (rho) => D.tube_top_z + Math.max(0, rho - D.tube_ir + r / Math.sin(slope)) * Math.tan(slope);
  const pts = [stack[stack.length - 1].position.clone()];
  for (let n = 0; n < 11; n++) {
    let best = null;
    for (let rho = 0; rho <= D.hopper_top_r - r; rho += 3) {
      for (let a = 0; a < 360; a += 15) {
        const x = rho * Math.cos(THREE.MathUtils.degToRad(a + n * 37)), y = rho * Math.sin(THREE.MathUtils.degToRad(a + n * 37));
        let z = coneZ(rho);
        for (const p of pts) {
          const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d2 < D.ball_d ** 2) z = Math.max(z, p.z + Math.sqrt(D.ball_d ** 2 - d2));
        }
        if (!best || z < best.z - 0.5) best = new THREE.Vector3(x, y, z);
      }
    }
    pts.push(best);
    const b = newBall(groups.yaw); b.position.copy(best); heap.push(b);
  }
}
const marks = new THREE.Group(); cad.add(marks);
const flying = [];
const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xe4572e, dashSize: 30, gapSize: 18 }));
cad.add(trail);

// ---------------------------------------------------------------- firmware mirror (see firmware/logic.py)
const CFG = { MIN_DUTY: 0.30, MAX_DUTY: 1.0, SPIN_MAX: 0.45, SPIN_DEADBAND: 0.06, RAMP_PER_S: 0.8, SPINUP_S: 1.2,
  SWING_LIMIT: D.yaw_max, SWING_SETTLE_S: 0.35, FEED_RELEASE_S: 0.28, FEED_INTERVAL_MIN: 0.8, FEED_INTERVAL_MAX: 5.0 };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const S = {
  t: 0, motors: false, since: 0, feeding: false, swing: 'off', pattern: 'sweep', step: -1,
  duty: [0, 0], rpm: [0, 0], aim: 0, aimTarget: 0, movedAt: -1e9, nextBall: 0, releaseUntil: -1, balls: 0,
  knobs: { speed: 0.55, spin: 0.5, rate: 0.5 }, width: 25, period: 4, pitch: 8, batt: 6.0, wheelAngle: [0, 0],
};
// POC test phase on show (0 = the finished robot), see web/data/phases.json
const P = { id: 0, step: 0, playing: false, timer: 0 };
const phaseById = (id) => PH.phases.find((p) => p.id === id);
const FEATURES = { feed: 3, swing: 4, panel: 5 };                      // mirrors FEATURES in firmware/logic.py
const has = (f) => P.id === 0 || P.id >= FEATURES[f];
const speedOf = (v) => CFG.MIN_DUTY + v * (CFG.MAX_DUTY - CFG.MIN_DUTY);
function spinOf(v) {
  let s = (v - 0.5) * 2; if (Math.abs(s) < CFG.SPIN_DEADBAND) return 0;
  return Math.sign(s) * (Math.abs(s) - CFG.SPIN_DEADBAND) / (1 - CFG.SPIN_DEADBAND) * CFG.SPIN_MAX;
}
const intervalOf = (v) => Math.max(CFG.FEED_INTERVAL_MAX * (CFG.FEED_INTERVAL_MIN / CFG.FEED_INTERVAL_MAX) ** v, CFG.FEED_RELEASE_S + CFG.SWING_SETTLE_S);
function targets() {
  if (!S.motors) return [0, 0];
  const b = speedOf(S.knobs.speed), s = spinOf(S.knobs.spin);
  return [clamp(b * (1 + s), 0, 1), clamp(b * (1 - s), 0, 1)];
}
function ready() {
  const [a, b] = targets();
  return S.motors && Math.abs(S.duty[0] - a) < 0.02 && Math.abs(S.duty[1] - b) < 0.02 && S.t - S.since >= CFG.SPINUP_S;
}
function aimAt(o) { o = clamp(o, -CFG.SWING_LIMIT, CFG.SWING_LIMIT); if (o !== S.aimTarget) { S.aimTarget = o; S.movedAt = S.t; } }
function setSwing(mode) { if (!has('swing')) mode = 'off'; if (mode !== 'off') { S.pattern = mode; S.step = -1; } S.swing = mode; if (mode === 'off') aimAt(0); syncUI(); }
function press(btn, long) {
  if ((btn === 'swing' || btn === 'feed') && !has(btn)) return;    // not fitted in this test phase
  if (btn === 'motors') { if (long || S.motors) { S.motors = false; S.feeding = false; } else { S.motors = true; S.since = S.t; } }
  if (btn === 'swing') {
    if (long) { const P = ['sweep', 'step3', 'random']; setSwing(P[(P.indexOf(S.pattern) + 1) % 3]); }
    else setSwing(S.swing !== 'off' ? 'off' : S.pattern);
  }
  if (btn === 'feed') {
    if (long) { if (ready()) release(); }
    else if (S.feeding) S.feeding = false;
    else { if (!S.motors) { S.motors = true; S.since = S.t; } S.feeding = true; S.nextBall = S.t; }
  }
  syncUI();
}
function release() {
  S.releaseUntil = S.t + CFG.FEED_RELEASE_S; S.balls++;
  const w = Math.min(S.width, CFG.SWING_LIMIT);
  if (S.swing === 'step3') { S.step = (S.step + 1) % 4; aimAt([-w, 0, w, 0][S.step]); }
  if (S.swing === 'random') aimAt((Math.random() * 2 - 1) * w);
  launchFromStack();
}
function stepLogic(dt) {
  S.t += dt;
  const tg = targets();
  for (let i = 0; i < 2; i++) {
    const d = CFG.RAMP_PER_S * dt;
    S.duty[i] = S.duty[i] < tg[i] ? Math.min(tg[i], S.duty[i] + d) : Math.max(tg[i], S.duty[i] - d);
    const rpmTarget = 3000 * (S.batt / 6.0) * S.duty[i];                 // N20 6 V 3000 rpm, ∝ voltage
    S.rpm[i] += (rpmTarget - S.rpm[i]) * (1 - Math.exp(-dt / 0.3));      // wheel inertia lag
  }
  const w = Math.min(S.width, CFG.SWING_LIMIT);
  if (S.swing === 'sweep') { S.aimTarget = w * Math.sin(2 * Math.PI * S.t / Math.max(0.5, S.period)); S.movedAt = -1e9; }
  S.aim += clamp(S.aimTarget - S.aim, -400 * dt, 400 * dt);              // MG90S ≈ 0.1 s / 60°
  if (S.feeding && !S.motors) S.feeding = false;
  if (S.feeding && ready() && S.t >= S.nextBall && S.t >= S.releaseUntil && S.t - S.movedAt >= CFG.SWING_SETTLE_S) {
    release(); S.nextBall = S.t + intervalOf(S.knobs.rate);
  }
}

// ---------------------------------------------------------------- ball physics (SI units)
const BALL = { m: 0.0027, r: 0.02, A: Math.PI * 0.02 ** 2, rho: 1.2, cd: 0.5 };
const yawRad = () => THREE.MathUtils.degToRad(-S.aim);   // firmware: negative offset = left = +rotation about Z
function wheelSpeeds() { return S.rpm.map((r) => Math.PI * (D.wheel_d / 1000) * r / 60); }
function launchState() {
  // exit point and velocity in the CAD frame (m, m/s) from the current pose
  const [vt, vb] = wheelSpeeds();
  const eta = 0.8;
  const speed = eta * (vt + vb) / 2;
  const omega = eta * (vt - vb) / (D.ball_d / 1000);                      // rad/s, + = topspin
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, yawRad()))
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(S.pitch), 0, 0)));
  const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  // the tilt pivot lies on the yaw axis, so pinch = pivot + q·(pinch − pivot)
  const pos = v3(D.pinch).sub(v3(D.pivot)).applyQuaternion(q).add(v3(D.pivot)).add(rig.position).multiplyScalar(0.001);
  return { pos, vel: dir.multiplyScalar(speed), w: right.multiplyScalar(-omega), speed, omega };
}
function physicsStep(b, dt) {
  const v = b.vel, sp = v.length();
  const acc = new THREE.Vector3(0, 0, -9.81);
  if (sp > 1e-6) {
    acc.addScaledVector(v, -0.5 * BALL.rho * BALL.cd * BALL.A * sp / BALL.m);
    const S_ = b.w.length() * BALL.r / sp;
    const cl = S_ > 0 ? Math.min(0.5, 1 / (2 + 1 / S_)) : 0;
    const mag = new THREE.Vector3().crossVectors(b.w, v);
    if (mag.lengthSq() > 0) acc.addScaledVector(mag.normalize(), 0.5 * BALL.rho * cl * BALL.A * sp * sp / BALL.m);
  }
  const prevY = b.pos.y;
  v.addScaledVector(acc, dt);
  b.pos.addScaledVector(v, dt);
  b.w.multiplyScalar(1 - 0.02 * dt);
  const onTable = Math.abs(b.pos.x) < TABLE.w / 2000 && b.pos.y > TABLE.y0 / 1000 && b.pos.y < (TABLE.y0 + TABLE.l) / 1000;
  if (onTable && b.pos.z < BALL.r && v.z < 0) {                             // bounce
    b.pos.z = BALL.r; v.z = -0.88 * v.z;
    const fwd = new THREE.Vector3(v.x, v.y, 0);
    const top = new THREE.Vector3(-v.y, v.x, 0).normalize().dot(b.w);       // topspin component, rad/s
    v.x *= 0.82; v.y *= 0.82;
    if (fwd.lengthSq() > 1e-6) { fwd.normalize(); v.x += fwd.x * 0.25 * top * BALL.r; v.y += fwd.y * 0.25 * top * BALL.r; }
    b.w.multiplyScalar(0.6);
    b.bounces++;
    return 'bounce';
  }
  const ny = TABLE.netY / 1000;
  if ((prevY - ny) * (b.pos.y - ny) < 0 && b.pos.z < TABLE.net / 1000 + BALL.r && Math.abs(b.pos.x) < (TABLE.w + 305) / 2000) {
    v.y *= -0.15; v.x *= 0.3; b.pos.y = prevY; return 'net';
  }
  return null;
}
function predict() {
  if (!S.motors) { trail.visible = false; return; }
  const st = launchState();
  const b = { pos: st.pos.clone(), vel: st.vel.clone(), w: st.w.clone(), bounces: 0 };
  const pts = [b.pos.clone().multiplyScalar(1000)];
  for (let i = 0; i < 500 && b.bounces < 2 && b.pos.z > -TABLE.h / 1000; i++) {
    for (let k = 0; k < 2; k++) physicsStep(b, 1 / 400);
    pts.push(b.pos.clone().multiplyScalar(1000));
  }
  trail.geometry.dispose();
  trail.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  trail.computeLineDistances();
  trail.visible = true;
}

// ---------------------------------------------------------------- ball choreography
const headPath = (() => {                                  // head frame (CAD at pitch 0): entry → elbow → pinch
  const P = v3(D.pivot), pts = [];
  pts.push(new THREE.Vector3(0, 0, P.z + 10));
  pts.push(new THREE.Vector3(0, 0, P.z - D.drop_len));
  for (let a = 190; a <= 270; a += 10) {
    const r = THREE.MathUtils.degToRad(a);
    pts.push(new THREE.Vector3(0, D.elbow_c[1] + D.elbow_r * Math.cos(r), D.elbow_c[2] + D.elbow_r * Math.sin(r)));
  }
  pts.push(v3(D.pinch));
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
})();
const transit = [];
function launchFromStack() {
  const b = stack.shift();                                 // lowest ball in the tube
  stack.push(newBall(groups.yaw));                         // the hopper refills the column
  stack[stack.length - 1].visible = b.visible;
  stack[stack.length - 1].position.set(0, 0, stackZ0 + 3 * D.ball_d);
  transit.push({ mesh: b, phase: 'drop', t: 0, z0: b.position.z });
}
function dropByHand() {                                  // test phases 1–2: no feeder, a ball goes in by hand
  if (!ready()) { $('#state').textContent = 'wait for READY, then drop'; return; }
  const b = newBall(groups.yaw);
  b.position.set(0, 0, D.pivot[2] + 70);
  S.balls++;
  transit.push({ mesh: b, phase: 'drop', t: 0, z0: b.position.z });
}
const tmp = new THREE.Vector3();
function stepTransit(dt) {
  for (const [i, s] of stack.entries()) {                   // column settles one ball lower
    const zt = stackZ0 + i * D.ball_d;
    s.position.z += clamp(zt - s.position.z, -400 * dt, 0);
  }
  for (let i = transit.length - 1; i >= 0; i--) {
    const tr = transit[i];
    tr.t += dt;
    if (tr.phase === 'drop') {
      const z = tr.z0 - 0.5 * 9810 * tr.t * tr.t;
      if (z <= D.pivot[2] + 10) { tr.phase = 'head'; tr.t = 0; groups.yaw.remove(tr.mesh); pitchOff.add(tr.mesh); }
      else tr.mesh.position.set(0, 0, z);
    }
    if (tr.phase === 'head') {
      const u = Math.min(1, tr.t / 0.16);
      tr.mesh.position.copy(headPath.getPoint(u * u * 0.4 + u * 0.6));
      if (u >= 1) {                                         // reached the pinch: fly
        tr.mesh.getWorldPosition(tmp); cad.worldToLocal(tmp);
        pitchOff.remove(tr.mesh); cad.add(tr.mesh); tr.mesh.position.copy(tmp);
        const st = launchState();
        flying.push({ mesh: tr.mesh, pos: tmp.clone().multiplyScalar(0.001), vel: st.vel, w: st.w, bounces: 0, age: 0, marked: false });
        transit.splice(i, 1);
      }
    }
  }
  for (let i = flying.length - 1; i >= 0; i--) {
    const b = flying[i];
    b.age += dt;
    const n = Math.ceil(dt / (1 / 400));
    for (let k = 0; k < n; k++) {
      const ev = physicsStep(b, dt / n);
      if (ev === 'bounce' && !b.marked && b.pos.y * 1000 > TABLE.netY) { addMark(b.pos); b.marked = true; }
    }
    b.mesh.position.copy(b.pos).multiplyScalar(1000);
    if (b.pos.z < -TABLE.h / 1000 + BALL.r || b.age > 5) { b.pos.z = Math.max(b.pos.z, -TABLE.h / 1000 + BALL.r); if (b.age > 3) { cad.remove(b.mesh); flying.splice(i, 1); } }
  }
  for (const m of [...marks.children]) { m.userData.age += dt; m.material.opacity = Math.max(0, 0.9 - m.userData.age / 12); if (m.material.opacity <= 0) marks.remove(m); }
}
function addMark(p) {
  const m = new THREE.Mesh(new THREE.RingGeometry(14, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.9 }));
  m.position.set(p.x * 1000, p.y * 1000, 1.5); m.userData.age = 0; marks.add(m);
}

// ---------------------------------------------------------------- pose + explode + cutaway
function applyPose(dt) {
  groups.yaw.rotation.z = yawRad();
  pitchPivot.rotation.x = THREE.MathUtils.degToRad(S.pitch);
  const releasing = S.t < S.releaseUntil;
  const target = THREE.MathUtils.degToRad(releasing ? -D.esc_alpha : D.esc_alpha);
  rockerPivot.rotation.x += clamp(target - rockerPivot.rotation.x, -12 * dt, 12 * dt);
  const vis = 1 / 40;                                       // slowed for the eye
  S.wheelAngle[0] += S.rpm[0] / 60 * 2 * Math.PI * dt * vis;
  S.wheelAngle[1] -= S.rpm[1] / 60 * 2 * Math.PI * dt * vis;
  wtPivot.rotation.x = S.wheelAngle[0];
  wbPivot.rotation.x = S.wheelAngle[1];
}
const explode = $('#explode');
const fly = new Map();                                    // key → { from, t }: parts flying into place
function applyExplode() {
  const k = Number(explode.value);
  for (const [key, mesh] of Object.entries(meshes)) {
    const o = EXPLODE[key] || [0, 0, 0];
    mesh.position.set(o[0] * k, o[1] * k, o[2] * k);
    const f = fly.get(key);
    if (f) mesh.position.addScaledVector(f.from, (1 - Math.min(1, f.t)) ** 3);
  }
}
// loaded balls show once the hopper is on, and hide while exploded or while build steps are shown
function updateBalls() {
  const show = Number(explode.value) === 0 && !document.querySelector('#steps li.on') && shown.has('hopper') && fly.size === 0;
  for (const b of [...stack, ...heap]) b.visible = show;
}
explode.addEventListener('input', () => { applyExplode(); updateBalls(); });
const CUT = ['head_right', 'cheeks', 'hopper'];
const robotParts = () => new Set(Object.keys(meshes).filter((k) => !/^(poc|loose)_/.test(k)));   // the finished robot
let shown = robotParts();
function applyVisibility() {
  const cut = $('#cutaway').checked;
  for (const [k, m] of Object.entries(meshes)) m.visible = shown.has(k) && !(cut && CUT.includes(k));
  updateBalls();
}
$('#cutaway').addEventListener('change', applyVisibility);
applyVisibility();

// ---------------------------------------------------------------- camera presets
const CAMS = {
  robot: { pos: [640, -720, 600], target: [0, 10, 220] },
  table: { pos: [2600, 1100, 1700], target: [0, 1100, 0] },
  player: { pos: [0, TABLE.y0 + TABLE.l + 1300, 900], target: [0, 700, 120] },
};
function cadToThree(a) { return new THREE.Vector3(a[0], a[2], -a[1]); }
function setCam(name) {
  const c = CAMS[name], dz = name === 'robot' ? rig.position.z : 0;
  camera.position.copy(cadToThree([c.pos[0], c.pos[1], c.pos[2] + dz]));
  controls.target.copy(cadToThree([c.target[0], c.target[1], c.target[2] + dz])); controls.update();
  document.querySelectorAll('#viewbar [data-cam]').forEach((b) => b.classList.toggle('on', b.dataset.cam === name));
}
document.querySelectorAll('#viewbar [data-cam]').forEach((b) => b.addEventListener('click', () => setCam(b.dataset.cam)));
setCam('robot');

// ---------------------------------------------------------------- hover labels
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tip = $('#tip');
let lastHover = 0;
canvas.addEventListener('pointermove', (e) => {
  if (performance.now() - lastHover < 60) return;
  lastHover = performance.now();
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(Object.values(meshes).filter((m) => m.visible), false)[0];
  if (hit) { tip.hidden = false; tip.textContent = hit.object.userData.label; tip.style.left = `${e.clientX - r.left + 12}px`; tip.style.top = `${e.clientY - r.top + 12}px`; }
  else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; });

// ---------------------------------------------------------------- UI bindings
const fmt = {
  speed: (v) => `${Math.round(speedOf(v) * 100)} % duty`,
  spin: (v) => { const s = spinOf(v); return s === 0 ? 'flat' : `${s > 0 ? 'topspin' : 'backspin'} ${Math.round(Math.abs(s) * 100)} %`; },
  rate: (v) => `1 ball / ${intervalOf(v).toFixed(1)} s`,
  pitch: (v) => `${v}°`, width: (v) => `±${v}°`, period: (v) => `${v} s`,
};
for (const k of ['speed', 'spin', 'rate']) {
  const el = $(`#k-${k}`);
  const upd = () => { S.knobs[k] = Number(el.value); $(`#o-${k}`).textContent = fmt[k](S.knobs[k]); };
  el.addEventListener('input', upd); upd();
}
for (const k of ['pitch', 'width', 'period']) {
  const el = $(`#k-${k}`);
  const upd = () => { S[k] = Number(el.value); $(`#o-${k}`).textContent = fmt[k](S[k]); };
  el.addEventListener('input', upd); upd();
}
$('#k-pattern').addEventListener('change', (e) => { S.pattern = e.target.value; if (S.swing !== 'off') setSwing(S.pattern); });
$('#k-batt').addEventListener('change', (e) => { S.batt = Number(e.target.value); });
S.batt = Number($('#k-batt').value);
for (const b of ['motors', 'swing', 'feed']) $(`#b-${b}`).addEventListener('click', (e) => press(b, e.shiftKey));
$('#b-drop').addEventListener('click', dropByHand);
function syncUI() {
  $('#b-swing').disabled = !has('swing');
  $('#b-feed').hidden = !has('feed');
  $('#b-drop').hidden = has('feed');
  $('#knobs-title').textContent = has('panel') ? 'Panel knobs' : 'Phone sliders (no panel yet)';
  $('#k-rate').closest('label').hidden = !has('feed');
  for (const k of ['width', 'period', 'pattern']) $(`#k-${k}`).closest('label').hidden = !has('swing');
  const ph = P.id && phaseById(P.id);
  $('#sim-phase').hidden = !ph;
  if (ph) {
    $('#sim-phase').textContent = `Simulating test phase ${ph.id} · ${ph.name}. ` + (!has('feed')
      ? 'No feeder yet: press MOTORS, wait for READY, then DROP BALL feeds one by hand. No swing.'
      : !has('swing') ? 'The escapement feeds; the head does not swing yet.'
        : !has('panel') ? `Feed and swing work; buttons and knobs are on the phone page until phase ${FEATURES.panel}.` : 'Everything is fitted: this is the finished robot.');
  }
  $('#b-motors').classList.toggle('on', S.motors);
  $('#b-feed').classList.toggle('on', S.feeding);
  $('#b-swing').classList.toggle('on', S.swing !== 'off');
  $('#b-swing').textContent = S.swing === 'off' ? 'SWING' : `SWING · ${{ sweep: 'sweep', step3: 'L·C·R', random: 'random' }[S.swing]}`;
  $('#k-pattern').value = S.pattern;
}
syncUI();

// tabs
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === `tab-${b.dataset.tab}`));
}));

// ---------------------------------------------------------------- docs tabs content
{
  let html = '', total = 0;
  for (const g of bom.groups) {
    html += `<h3>${g.name}</h3><p class="hint">${g.where}</p><table><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">≈ zł</th></tr>`;
    for (const it of g.items) {
      const sum = it.qty * it.price; total += sum;
      html += `<tr><td>${it.id}</td><td>${it.name}<div class="spec">${it.spec}</div></td><td class="num">${it.qty}</td><td class="num">${sum ? sum.toFixed(0) : '–'}</td></tr>`;
    }
    html += '</table>';
  }
  html += `<table><tr class="total"><td>Total (approx.)</td><td class="num">≈ ${Math.round(total)} zł</td></tr></table><p class="hint">${bom.note}</p>`;
  $('#bom').innerHTML = html;
  let ph = '<table><tr><th>Part</th><th class="num">Qty</th><th>Print notes</th></tr>';
  for (const p of manifest.printed) {
    ph += `<tr><td>${p.part}<div class="links spec"><a href="thrower/${p.a1}" download>A1 3MF</a> · <a href="thrower/${p.stl}" download>STL</a></div></td><td class="num">${p.qty}</td><td class="spec">${p.notes}</td></tr>`;
  }
  $('#printed').innerHTML = `${ph}</table>`;
}
{
  const PINS = [
    ['GP2', 4, 'DRV8833 AIN1', 'top motor'], ['GP3', 5, 'DRV8833 AIN2', 'top motor'],
    ['GP4', 6, 'DRV8833 BIN1', 'bottom motor'], ['GP5', 7, 'DRV8833 BIN2', 'bottom motor'],
    ['GP6', 9, 'DRV8833 nSLEEP (EEP)', 'high = enabled'], ['GP7', 10, 'DRV8833 nFAULT (ULT)', 'input, pull-up'],
    ['GP14', 19, 'Swing servo signal', 'orange wire'], ['GP15', 20, 'Feed servo signal', 'orange wire'],
    ['GP16', 21, 'MOTORS button → GND', 'pull-up'], ['GP17', 22, 'SWING button → GND', 'pull-up'],
    ['GP18', 24, 'FEED button → GND', 'pull-up'], ['GP19', 25, 'READY LED → 220 Ω → GND', ''],
    ['GP26 / ADC0', 31, 'SPEED pot wiper', ''], ['GP27 / ADC1', 32, 'SPIN pot wiper', ''],
    ['GP28 / ADC2', 34, 'RATE pot wiper', ''], ['AGND', 33, 'pot low ends', ''], ['3V3(OUT)', 36, 'pot high ends', ''],
    ['VSYS', 39, '+BAT via 2× 1N4001 (+100 µF to GND)', '≤ 5.5 V'], ['GND', 38, 'common ground', ''],
  ];
  $('#pins').innerHTML = '<tr><th>Pico pin</th><th class="num">#</th><th>Goes to</th><th>Note</th></tr>' +
    PINS.map((p) => `<tr><td>${p[0]}</td><td class="num">${p[1]}</td><td>${p[2]}</td><td class="spec">${p[3]}</td></tr>`).join('');
}
{
  const STEPS = [
    ['Print the parts', 'PETG, no supports, orientations already set in the STL/3MF files.', ['tray', 'lid', 'turret', 'cheeks', 'head_left', 'head_right', 'clamps', 'feed_tube', 'rocker', 'hopper', 'coupler', 'panel_knobs', 'lock_knobs', 'hub_top', 'hub_bot']],
    ['Bearings into the lid', 'Press one 608 into the top seat and one into the bottom seat. Put the printed spacer between the inner races.', ['lid', 'bearings']],
    ['Swing servo', 'Centre the MG90S (run the firmware once, or 1500 µs). Drop it into the tower, screw the tabs down, screw the double horn into the coupler, pointing along X.', ['tray', 'swing_servo', 'coupler']],
    ['Electronics', 'Solder the perfboard (see Wiring), screw it onto the standoffs, fit switch, buttons, pots and LED in the back panel, and mount the battery holder on the left wall.', ['board', 'pico', 'driver', 'panel', 'panel_switch', 'panel_knobs', 'battery']],
    ['Turret on the bearings', 'M8×40 through the turret (head in the hex pocket), 1.5 mm shim, both bearings with the spacer, 2 mm shim, nyloc. Tighten until it turns freely with no wobble.', ['turret', 'bolt', 'bearings', 'lid']],
    ['Cheeks', 'Screw both cheek feet to the turret with 4 × M4×10.', ['cheeks', 'turret']],
    ['Head', 'Fit the motors into the clamps (gearbox nose into the wall pocket), hubs on the shafts (set screw on the flat), wheels pushed onto the stubs. Bolt the halves with 4 × M3×40. Set the top wheel so the gap is ball − 2 mm.', ['head_left', 'head_right', 'clamps', 'motors', 'hub_top', 'hub_bot', 'tyre_top', 'tyre_bot', 'rim_top', 'rim_bot']],
    ['Hang the head', 'Between the cheeks: M5×12 bolts (with washers) screwed through the cheeks, their plain tips into the head bores, then the M4 lock knobs through the arc slots.', ['head_left', 'head_right', 'cheeks', 'lock_knobs']],
    ['Feed tube and escapement', 'Screw the SG90 to the tube plate, the rocker onto its horn (centred = both fingers half in), then the tube ears to the cheeks (8 × M3×20).', ['feed_tube', 'feed_servo', 'rocker']],
    ['Hopper and basket', 'Slide the funnel onto the tube. Screw your bin (cut a Ø 140 mm hole in its bottom) to the collar.', ['hopper']],
    ['Close up and calibrate', 'Route the turret cable through the arc slot with a loose loop, screw the lid on, flash the firmware, then check wheel directions and servo centres (config.py).', []],
  ];
  const ol = $('#steps');
  STEPS.forEach(([title, text, keys], i) => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${title}</b>${text}`;
    li.addEventListener('click', () => {
      const on = !li.classList.contains('on');
      if (P.id) setPhase(0);
      ol.querySelectorAll('li').forEach((x) => x.classList.remove('on'));
      li.classList.toggle('on', on);
      dim(on ? keys : null);
      if (on && i > 0) { explode.value = 0.6; applyExplode(); } else if (!on) { explode.value = 0; applyExplode(); }
      updateBalls();
    });
    ol.appendChild(li);
  });
}

// ---------------------------------------------------------------- POC test phases: build animation + tab
function dim(keys) {                                      // Build tab: fade everything not in `keys` (null = none)
  for (const [k, m] of Object.entries(meshes)) {
    const lit = !keys || keys.length === 0 || keys.includes(k);
    m.material.transparent = !lit || m.userData.opacity < 1;
    m.material.opacity = lit ? m.userData.opacity : 0.08;
    m.material.depthWrite = lit && m.userData.opacity >= 1;
    m.material.needsUpdate = true;                        // `transparent` changes the shader
    m.castShadow = lit && m.userData.opacity >= 1;
  }
}
function sceneAt(id, step) {                              // parts in place after `step` of phase `id`
  const ph = phaseById(id);
  const keys = ph.carry ? sceneAt(ph.carry, phaseById(ph.carry).steps.length - 1) : new Set();
  for (const st of ph.steps.slice(0, step + 1)) for (const k of st.add) keys.add(k);
  return keys;
}
let glowing = [];
function glow(keys) {
  for (const k of glowing) meshes[k].material.emissive.setHex(0x000000);
  glowing = keys.filter((k) => meshes[k]);
  for (const k of glowing) meshes[k].material.emissive.setHex(0xffc04d);
}
const STEP_S = 2.6;                                       // seconds per step while playing
function goStep(i, animate = true) {
  const ph = phaseById(P.id);
  P.step = clamp(i, 0, ph.steps.length - 1);
  const st = ph.steps[P.step];
  shown = sceneAt(P.id, P.step);
  fly.clear();
  if (animate) {
    for (const k of st.add) {
      const e = EXPLODE[k];
      const from = st.from || (e && e.some((v) => v) ? e.map((v) => v * 1.6) : [0, 0, 220]);
      fly.set(k, { from: v3(from), t: 0 });
    }
  }
  glow(st.add);
  applyExplode();
  applyVisibility();
  renderSteps();
}
function setPhase(id, play = true) {
  play = play && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  P.id = id; P.playing = false;
  document.querySelectorAll('#steps li.on').forEach((x) => x.classList.remove('on'));
  dim(null);
  explode.value = 0;
  const rigType = id ? phaseById(id).rig : 'base';
  rig.position.z = { bench: -D.poc_bot_z, loose: -D.loose_z }[rigType] || 0;
  const pitchEl = $('#k-pitch');                           // the loose head is clamped level on the bench
  pitchEl.disabled = rigType === 'loose';
  if (pitchEl.disabled) { pitchEl.value = 0; pitchEl.dispatchEvent(new Event('input')); }
  if (!has('swing')) setSwing('off');
  if (!has('feed')) S.feeding = false;
  for (const t of transit.splice(0)) t.mesh.parent.remove(t.mesh);
  if (id) {
    goStep(0, play);
    P.playing = play; P.timer = STEP_S;
  } else {
    fly.clear(); glow([]);
    shown = robotParts();
    applyExplode(); applyVisibility();
  }
  setCam('robot');
  renderPhase();
  renderSteps();
  syncUI();
}
function stepPhase(dt, now) {
  if (fly.size) {
    for (const [k, f] of fly) { f.t += matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : dt / 0.9; if (f.t >= 1) fly.delete(k); }
    applyExplode();
    if (!fly.size) updateBalls();
  }
  const pulse = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.25 : 0.18 + 0.17 * Math.sin(now / 160);
  for (const k of glowing) meshes[k].material.emissiveIntensity = pulse;
  if (P.playing && (P.timer -= dt) <= 0) {
    if (P.step >= phaseById(P.id).steps.length - 1) { P.playing = false; renderSteps(); }
    else { goStep(P.step + 1); P.timer = STEP_S; }
  }
}

// stage step bar
$('#sb-prev').addEventListener('click', () => { P.playing = false; goStep(P.step - 1); });
$('#sb-next').addEventListener('click', () => { P.playing = false; goStep(P.step + 1); });
$('#sb-play').addEventListener('click', () => {
  const last = P.step >= phaseById(P.id).steps.length - 1;
  P.playing = !matchMedia('(prefers-reduced-motion: reduce)').matches && !P.playing;
  if (P.playing) { if (last) goStep(0); P.timer = STEP_S; }
  renderSteps();
});
$('#sb-close').addEventListener('click', () => setPhase(0));
function renderSteps() {
  const ph = P.id && phaseById(P.id);
  $('#stepbar').hidden = !ph;
  if (!ph) return;
  $('#sb-phase').textContent = `Test phase ${ph.id} · ${ph.name}`;
  $('#sb-count').textContent = `step ${P.step + 1} / ${ph.steps.length}`;
  $('#sb-title').textContent = ph.steps[P.step].title;
  $('#sb-play').textContent = P.playing ? '❚❚' : '▶';
  $('#sb-play').setAttribute('aria-label', P.playing ? 'Pause' : 'Play the build');
  $('#sb-prev').disabled = P.step === 0;
  $('#sb-next').disabled = P.step === ph.steps.length - 1;
  document.querySelectorAll('#poc-steps li').forEach((li, i) => li.classList.toggle('on', i === P.step));
}

// the tab
const items = Object.fromEntries(bom.groups.flatMap((g) => g.items.map((it) => [it.id, it])));
const printedBy = Object.fromEntries(manifest.printed.map((p) => [p.part, p]));
const zl = (x) => `${Math.round(x)} zł`;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const cost = (ph) => ph.buy.reduce((a, [id, q]) => a + q * items[id].price, 0);
const store = {                                           // per-viewer checklist ticks; storage may be unavailable
  get(k) { try { return localStorage.getItem('launcher:thrower:' + k) === '1'; } catch { return false; } },
  set(k, v) { try { localStorage.setItem('launcher:thrower:' + k, v ? '1' : '0'); } catch { /* not persisted */ } },
};
$('#poc-note').textContent = PH.note;
$('#phase-pick').innerHTML = ['<button data-phase="0">Finished robot</button>',
  ...PH.phases.map((ph) => `<button data-phase="${ph.id}">${ph.id} · ${esc(ph.name)}</button>`)].join('');
$('#phase-pick').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setPhase(Number(b.dataset.phase)); });
function renderPhase() {
  document.querySelectorAll('#phase-pick button').forEach((b) => b.classList.toggle('on', Number(b.dataset.phase) === P.id));
  const body = $('#phase-body');
  if (!P.id) {
    body.innerHTML = `<p class="hint">Pick a phase to see its rig build up step by step in the 3D view, download its print kit and run its tests. The Simulate tab then behaves like that phase.</p>
      <table><tr><th>Phase</th><th>Answers</th><th class="num">Print</th><th class="num">Buy ≈</th></tr>${PH.phases.map((ph) =>
        `<tr><td><b>${ph.id} · ${esc(ph.name)}</b></td><td class="spec">${esc(ph.question)}</td><td class="num">${ph.print.reduce((a, p) => a + p[1], 0)} parts</td><td class="num">${zl(cost(ph))}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">All ${PH.phases.length} phases</td><td class="num">${zl(PH.phases.reduce((a, ph) => a + cost(ph), 0))}</td></tr></table>
      <p class="hint">${esc(PH.a1.note)}</p>`;
    return;
  }
  const ph = phaseById(P.id), a1 = PH.a1;
  const prints = ph.print.map(([part, q]) => {
    const p = printedBy[part];
    return `<tr><td>${part}<div class="spec">${esc(p.orientation)} ${p.a1_walls} walls.</div></td><td class="num">${q}</td>
      <td class="links"><a href="thrower/${p.a1}" download>A1 3MF</a><br><a href="thrower/${p.stl}" download class="spec">STL</a></td></tr>`;
  }).join('');
  const buys = ph.buy.map(([id, q]) => { const it = items[id];
    return `<tr><td>${id}</td><td>${esc(it.name)}<div class="spec">${esc(it.spec)}</div></td><td class="num">${q}</td><td class="num">${q * it.price ? Math.round(q * it.price) : '–'}</td></tr>`; }).join('');
  body.innerHTML = `
    <p class="question">${esc(ph.question)}</p><p>${esc(ph.summary)}</p>
    <h3>Build steps</h3><p class="hint">Click a step, or use ▶ on the 3D view to play the build.</p>
    <ol id="poc-steps">${ph.steps.map((st) => `<li><b>${esc(st.title)}</b>${esc(st.text)}</li>`).join('')}</ol>
    <h3>Print (Bambu A1)</h3>
    <a class="dl" href="thrower/print/a1/phase${ph.id}.zip" download>Download phase ${ph.id} print kit (.zip)</a>
    <p class="hint">${a1.printer}, ${a1.nozzle} mm nozzle, ${a1.layer} mm layers, ${a1.infill} % ${a1.pattern} infill, PETG, supports ${a1.supports}. Each .3mf opens in Bambu Studio with these settings and every copy already on the plate.</p>
    <table><tr><th>Part</th><th class="num">Qty</th><th>Files</th></tr>${prints}</table>
    <h3>Buy</h3><p class="hint">${esc(ph.start)}</p>
    <table><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">≈ zł</th></tr>${buys}
      <tr class="total"><td colspan="3">Phase ${ph.id}</td><td class="num">≈ ${zl(cost(ph))}</td></tr></table>
    <h3>Tools and supplies</h3><ul class="bullets">${ph.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <h3>Wiring</h3>
    ${ph.wiring3d ? `<a class="dl" href="${ph.wiring3d}">See every cable in 3D, step by step</a>
      <p class="hint">Real-looking parts with one coloured cable per connection, so you can see exactly which pin goes to which.</p>` : ''}
    <a href="thrower/docs/wiring_p${ph.id}.svg" target="_blank" rel="noopener"><img src="thrower/docs/wiring_p${ph.id}.svg" alt="Phase ${ph.id} wiring diagram" class="wiring"></a>
    <ul class="bullets">${ph.wiring.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <h3>Firmware</h3><p>Set <code>PHASE = ${ph.firmware}</code> in <code>firmware/config.py</code> and copy the firmware to the Pico. It only drives what is fitted, and the phone page shows only those controls.</p>
    <h3>Tests</h3><ul class="checks">${ph.tests.map(([what, pass], i) => `<li><label><input type="checkbox" data-k="poc-p${ph.id}-t${i}">
      <span><span class="what">${esc(what)}</span><br><span class="spec">${esc(pass)}</span></span></label></li>`).join('')}</ul>
    <h3>Before the next phase</h3><p>${esc(ph.exit)}</p>`;
  body.querySelectorAll('#poc-steps li').forEach((li, i) => li.addEventListener('click', () => { P.playing = false; goStep(i); }));
  body.querySelectorAll('.checks input').forEach((c) => { c.checked = store.get(c.dataset.k); c.addEventListener('change', () => store.set(c.dataset.k, c.checked)); });
  renderSteps();
}
renderPhase();

// ---------------------------------------------------------------- loop
function resize() {
  if (!context.active()) return;
  const r = canvas.parentElement.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas.parentElement);
resize();

let last = performance.now(), predictTimer = 0;
function frame(now) {
  if (!context.active()) { last = now; requestAnimationFrame(frame); return; }
  const rect = canvas.parentElement.getBoundingClientRect();
  if (canvas.clientWidth !== rect.width || canvas.width !== Math.round(rect.width * renderer.getPixelRatio())) resize();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stepLogic(dt);
  applyPose(dt);
  stepTransit(dt);
  stepPhase(dt, now);
  predictTimer -= dt;
  if (predictTimer <= 0) { predict(); predictTimer = 0.1; }
  const [vt, vb] = wheelSpeeds();
  const st = launchState();
  const led = S.motors && (ready() ? S.t >= S.releaseUntil : Math.floor(S.t * 4) % 2 === 0);
  $('#led').classList.toggle('on', led);
  $('#state').textContent = !S.motors ? 'idle' : ready() ? (S.feeding ? 'READY · feeding' : 'READY') : 'spinning up…';
  $('#readout').textContent = `aim ${S.aim.toFixed(0).padStart(3)}°   elevation ${S.pitch}°   balls ${S.balls}`;
  $('#physics').innerHTML = [
    ['Top wheel', `${Math.round(S.rpm[0])} rpm · ${vt.toFixed(1)} m/s`],
    ['Bottom wheel', `${Math.round(S.rpm[1])} rpm · ${vb.toFixed(1)} m/s`],
    ['Ball exit speed', `${st.speed.toFixed(1)} m/s · ${(st.speed * 3.6).toFixed(0)} km/h`],
    ['Ball spin', st.omega === 0 ? 'none' : `${(Math.abs(st.omega) / (2 * Math.PI)).toFixed(0)} rev/s ${st.omega > 0 ? 'topspin' : 'backspin'}`],
    ['Launch height', `${Math.round(D.pinch[2] + rig.position.z)} mm above table`],
  ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

}
