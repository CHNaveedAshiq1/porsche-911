/* Porsche 911 concept experience: one scroll-driven Three.js scene.
   Chapters: Form Study, Blueprint / Clay / Reality, 01 Deconstruction,
   02 Reassembly, 03 Reborn, end card. The spec label follows the
   Project 17 recipe: Object3D anchor on the part, per-frame
   getWorldPosition + project, pixel conversion, HTML pill offset 120px,
   SVG leader line 1px at 60% opacity with a 4px dot, hidden when the
   anchor faces away, active chapter only, position lerped at 0.2. */
import * as THREE from './three.module.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp01 = v => Math.min(1, Math.max(0, v));
const sstep = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const seg = (p, a, b) => sstep((p - a) / (b - a));
const trap = (p, a, b, c, d) => seg(p, a, b) * (1 - seg(p, c, d));
const pulse = (p, c, w) => clamp01(1 - Math.abs(p - c) / w);
const lerp = (a, b, t) => a + (b - a) * t;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= scroll progress ================= */
const space = $('#scrollSpace');
let targetP = 0, shownP = 0, lastScrollAt = 0;
function readScroll() {
  const max = space.offsetHeight - window.innerHeight;
  targetP = max > 0 ? clamp01(window.scrollY / max) : 0;
}
window.addEventListener('scroll', () => { readScroll(); lastScrollAt = performance.now(); }, { passive: true });
window.addEventListener('resize', readScroll);
readScroll();

const SETTLED = [0.02, 0.125, 0.30, 0.50, 0.68, 0.755, 0.90, 0.99];
function effectiveP() {
  if (!REDUCED) return shownP;
  let best = SETTLED[0], bd = 1e9;
  for (const s of SETTLED) { const d = Math.abs(s - shownP); if (d < bd) { bd = d; best = s; } }
  return best;
}

/* ================= three setup ================= */
const container = $('#scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11161f);
scene.fog = new THREE.Fog(0x060a14, 80, 160);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);

const hemi = new THREE.HemisphereLight(0xcfe2f2, 0x141a20, 0.55);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.15);
key.position.set(3.5, 5.5, 4.5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fd4ee, 1.4);
rim.position.set(-4.5, 2.6, -5.0);
scene.add(rim);
const sweep = new THREE.SpotLight(0xffffff, 0, 40, 0.45, 0.6);
sweep.position.set(-4.5, 3.2, 2.6);
sweep.target.position.set(0, 0.6, 0);
scene.add(sweep, sweep.target);

function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 0.8 ? 62 : camera.aspect < 1.2 ? 48 : 40;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

/* ================= helpers ================= */
function sampler(keys, isEuler = false) {
  return p => {
    if (p <= keys[0][0]) return isEuler ? new THREE.Euler(...keys[0][1]) : new THREE.Vector3(...keys[0][1]);
    for (let i = 0; i < keys.length - 1; i++) {
      const [p0, v0] = keys[i], [p1, v1] = keys[i + 1];
      if (p <= p1) {
        const t = sstep((p - p0) / (p1 - p0));
        if (isEuler) return new THREE.Euler(
          v0[0] + (v1[0] - v0[0]) * t, v0[1] + (v1[1] - v0[1]) * t, v0[2] + (v1[2] - v0[2]) * t);
        return new THREE.Vector3(
          v0[0] + (v1[0] - v0[0]) * t, v0[1] + (v1[1] - v0[1]) * t, v0[2] + (v1[2] - v0[2]) * t);
      }
    }
    const last = keys[keys.length - 1][1];
    return isEuler ? new THREE.Euler(...last) : new THREE.Vector3(...last);
  };
}
function fadeGroup() { const g = new THREE.Group(); g.userData.mats = []; scene.add(g); return g; }
function regMat(g, m) { m.transparent = true; g.userData.mats.push(m); return m; }
function setWeight(g, w) {
  g.visible = w > 0.012;
  if (g.visible) for (const m of g.userData.mats) m.opacity = m.userData.baseOp !== undefined ? m.userData.baseOp * w : w;
}
function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 126);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ================= materials ================= */
const paintBodyMat = new THREE.MeshPhysicalMaterial({ color: 0xd21f26, roughness: 0.32, metalness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.22, transparent: true });
const paintPanelMat = paintBodyMat.clone();
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x11161d, roughness: 0.12, metalness: 0.3, clearcoat: 1, transparent: true, opacity: 0.96 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.92, transparent: true });
const rimMat = new THREE.MeshStandardMaterial({ color: 0x777d85, roughness: 0.35, metalness: 0.85, transparent: true });
const interiorMat = new THREE.MeshStandardMaterial({ color: 0xd9d5cb, roughness: 0.9, transparent: true });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.55, metalness: 0.6, transparent: true });
const silverMat = new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.38, metalness: 0.55 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd6dade, roughness: 0.25, metalness: 0.6 });
const redCaliperMat = new THREE.MeshStandardMaterial({ color: 0xd21f26, roughness: 0.4, metalness: 0.2 });
const clayMat = new THREE.MeshStandardMaterial({ color: 0xd9dbde, roughness: 0.96, metalness: 0 });
const holoMat = new THREE.MeshBasicMaterial({ color: 0x54c8ff, transparent: true, opacity: 0.30, depthWrite: false });

/* ================= car build =================
   Car space: length along X, nose at -X, rear at +X, width along Z. */
const carGroup = new THREE.Group();
scene.add(carGroup);
const bodyGroup = new THREE.Group();
carGroup.add(bodyGroup);
const powerGroup = new THREE.Group();
carGroup.add(powerGroup);

function mark(mesh, kind, mat) {
  mesh.userData.kind = kind;
  mesh.userData.mat = mat;
  return mesh;
}
function profileShape(topPts, closeOnly = false) {
  const curve = new THREE.SplineCurve(topPts.map(([x, y]) => new THREE.Vector2(x, y)));
  const pts = curve.getPoints(56);
  const sh = new THREE.Shape();
  sh.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i].x, pts[i].y);
  if (closeOnly) { sh.closePath(); return sh; }
  /* bottom edge, tail to nose, with wheel arch cutouts */
  const by = 0.30;
  sh.lineTo(2.02, by);
  for (const cx of [1.45, -1.45]) {
    sh.lineTo(cx + 0.44, by);
    for (let i = 1; i <= 10; i++) {
      const a = (i / 10) * Math.PI;
      sh.lineTo(cx + 0.44 * Math.cos(a), by + 0.44 * Math.sin(a));
    }
  }
  sh.lineTo(-2.18, by);
  sh.closePath();
  return sh;
}
function flatShape(topPts, thick) {
  const curve = new THREE.SplineCurve(topPts.map(([x, y]) => new THREE.Vector2(x, y)));
  const pts = curve.getPoints(28);
  const sh = new THREE.Shape();
  sh.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i].x, pts[i].y);
  for (let i = pts.length - 1; i >= 0; i--) sh.lineTo(pts[i].x, pts[i].y - thick);
  sh.closePath();
  return sh;
}
function extrude(shape, width, bevelT = 0.08, bevelS = 0.07) {
  const depth = Math.max(0.02, width - bevelT * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevelT > 0, bevelThickness: bevelT, bevelSize: bevelS,
    bevelSegments: 3, steps: 1,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/* main body: nose, hood, beltline, rear fenders, tail */
const bodyMain = mark(new THREE.Mesh(
  extrude(profileShape([
    [-2.28, 0.42], [-2.24, 0.60], [-2.00, 0.74], [-1.45, 0.80], [-0.95, 0.84],
    [-0.30, 0.88], [0.45, 0.90], [1.10, 0.94], [1.60, 0.97], [2.10, 0.88],
    [2.26, 0.80], [2.28, 0.60], [2.18, 0.36],
  ]), 1.72), paintBodyMat), 'paint', paintBodyMat);
bodyGroup.add(bodyMain);

/* glasshouse */
const glasshouse = mark(new THREE.Mesh(
  extrude(profileShape([
    [-0.92, 0.82], [-0.55, 1.13], [-0.18, 1.28], [0.35, 1.31], [0.85, 1.26],
    [1.30, 1.08], [1.52, 0.94], [1.46, 0.84], [0.4, 0.83], [-0.5, 0.82],
  ], true), 1.44, 0.07, 0.06), glassMat), 'glass', glassMat);
bodyGroup.add(glasshouse);

/* front lid, hinged at the cowl */
const lidPivot = new THREE.Group();
lidPivot.position.set(-0.88, 0.855, 0);
bodyGroup.add(lidPivot);
const lidMesh = mark(new THREE.Mesh(
  extrude(flatShape([[-1.12, -0.105], [-0.70, -0.045], [-0.30, -0.005], [-0.02, 0.012]], 0.045), 1.14, 0.05, 0.04),
  paintPanelMat), 'paint', paintPanelMat);
lidPivot.add(lidMesh);

/* roof panel */
const roofGroup = new THREE.Group();
bodyGroup.add(roofGroup);
const roofMesh = mark(new THREE.Mesh(
  extrude(flatShape([[-0.34, 1.245], [0.0, 1.305], [0.35, 1.32], [0.7, 1.29], [0.98, 1.22]], 0.05), 1.28, 0.05, 0.04),
  paintPanelMat), 'paint', paintPanelMat);
roofGroup.add(roofMesh);

/* engine cover, hinged at the tail */
const coverPivot = new THREE.Group();
coverPivot.position.set(2.12, 0.895, 0);
bodyGroup.add(coverPivot);
const coverMesh = mark(new THREE.Mesh(
  extrude(flatShape([[-0.84, 0.105], [-0.57, 0.09], [-0.27, 0.05], [-0.04, 0.005]], 0.045), 1.26, 0.05, 0.04),
  paintPanelMat), 'paint', paintPanelMat);
coverPivot.add(coverMesh);

/* spoiler */
const spoilerGroup = new THREE.Group();
spoilerGroup.position.set(2.06, 0.90, 0);
bodyGroup.add(spoilerGroup);
{
  const blade = mark(new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.035, 1.46), paintPanelMat), 'paint', paintPanelMat);
  blade.position.y = 0.13;
  blade.rotation.z = -0.10;
  spoilerGroup.add(blade);
  for (const z of [-0.5, 0.5]) {
    const strut = mark(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.05), darkMetalMat), 'dark', darkMetalMat);
    strut.position.set(0, 0.06, z);
    spoilerGroup.add(strut);
  }
}

/* doors, hinged at the front edge */
function makeDoor(side) {
  const g = new THREE.Group();
  g.position.set(-0.80, 0, side * 0.845);
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.86); sh.lineTo(1.35, 0.90); sh.lineTo(1.42, 0.34); sh.lineTo(0.08, 0.32); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: false });
  if (side < 0) geo.translate(0, 0, -0.045);
  const m = mark(new THREE.Mesh(geo, paintPanelMat), 'paint', paintPanelMat);
  g.add(m);
  bodyGroup.add(g);
  return g;
}
const doorL = makeDoor(1);
const doorR = makeDoor(-1);

/* interior: white seats, dash, wheel */
const interiorGroup = new THREE.Group();
bodyGroup.add(interiorGroup);
{
  const floor = mark(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 1.35), darkMetalMat), 'dark', darkMetalMat);
  floor.position.set(0.1, 0.44, 0);
  interiorGroup.add(floor);
  for (const z of [-0.38, 0.38]) {
    const base = mark(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.50), interiorMat), 'interior', interiorMat);
    base.position.set(0.02, 0.55, z);
    const back = mark(new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.58, 0.50), interiorMat), 'interior', interiorMat);
    back.position.set(0.30, 0.82, z);
    back.rotation.z = 0.22;
    interiorGroup.add(base, back);
  }
  const dash = mark(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 1.30), darkMetalMat), 'dark', darkMetalMat);
  dash.position.set(-0.60, 0.80, 0);
  interiorGroup.add(dash);
  const wheelT = mark(new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.022, 8, 24), darkMetalMat), 'dark', darkMetalMat);
  wheelT.position.set(-0.44, 0.84, 0.38);
  wheelT.rotation.y = Math.PI / 2 - 0.25;
  interiorGroup.add(wheelT);
}

/* chassis plate */
const chassis = mark(new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.16, 1.58), darkMetalMat), 'dark', darkMetalMat);
chassis.position.set(0, 0.30, 0);
bodyGroup.add(chassis);

/* lights */
const headMat = new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.35 });
for (const z of [-0.55, 0.55]) {
  const h = new THREE.Mesh(new THREE.CircleGeometry(0.095, 20), headMat);
  h.position.set(-2.285, 0.60, z);
  h.rotation.y = -Math.PI / 2;
  bodyGroup.add(h);
}
const lightBarMat = new THREE.MeshBasicMaterial({ color: 0xff2028, transparent: true, opacity: 0.3 });
const lightBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 1.30), lightBarMat);
lightBar.position.set(2.285, 0.80, 0);
bodyGroup.add(lightBar);
const tailLight = new THREE.PointLight(0xff2a30, 0, 7, 1.8);
tailLight.position.set(2.6, 0.8, 0);
carGroup.add(tailLight);
/* PORSCHE lettering across the tail */
{
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const x = c.getContext('2d');
  x.font = '600 62px "Archivo", sans-serif';
  try { x.letterSpacing = '34px'; } catch (e) {}
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(30,10,10,0.85)';
  x.fillText('PORSCHE', 512, 52);
  const tex = new THREE.CanvasTexture(c);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.10),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 }));
  plate.position.set(2.292, 0.90, 0);
  plate.rotation.y = Math.PI / 2;
  bodyGroup.add(plate);
}

/* wheels */
const wheels = [];
function makeWheel(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.36, z);
  const spin = new THREE.Group();
  g.add(spin);
  const side = Math.sign(z);
  const tire = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.27, 30), tireMat), 'tire', tireMat);
  tire.geometry.rotateX(Math.PI / 2);
  spin.add(tire);
  const rimM = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.28, 24), rimMat), 'rim', rimMat);
  rimM.geometry.rotateX(Math.PI / 2);
  spin.add(rimM);
  for (let i = 0; i < 5; i++) {
    const spoke = mark(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.37, 0.05), rimMat), 'rim', rimMat);
    spoke.position.z = side * 0.145;
    spoke.rotation.z = (i / 5) * Math.PI * 2;
    spin.add(spoke);
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.03, 24), chromeMat);
  disc.geometry.rotateX(Math.PI / 2);
  disc.position.z = side * 0.10;
  spin.add(disc);
  const cal = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.17, 0.06), redCaliperMat);
  cal.position.set(0.11, 0.07, side * 0.115);
  spin.add(cal);
  bodyGroup.add(g);
  const w = { g, spin, home: new THREE.Vector3(x, 0.36, z), away: new THREE.Vector3() };
  wheels.push(w);
  return w;
}
makeWheel(-1.45, 0.74).away.set(-2.7, 0.55, 1.9);
makeWheel(-1.45, -0.74).away.set(-2.2, 0.42, -1.7);
makeWheel(1.45, 0.74).away.set(2.55, 0.50, 1.75);
makeWheel(1.45, -0.74).away.set(2.75, 0.45, -1.55);

/* soft blob shadow under the car */
const blob = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.9),
  new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, opacity: 0.5, depthWrite: false }));
blob.rotation.x = -Math.PI / 2;
blob.position.y = 0.012;
scene.add(blob);

/* ================= flat-six powertrain (exploded diagram) ================= */
const PARTS = [];
function addPart(g, home, away) {
  g.position.copy(home);
  powerGroup.add(g);
  const part = { g, home, away };
  PARTS.push(part);
  return part;
}
function cyl(r, h, mat, axis = 'y') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 22), mat);
  if (axis === 'x') m.geometry.rotateZ(Math.PI / 2);
  if (axis === 'z') m.geometry.rotateX(Math.PI / 2);
  return m;
}
function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }

/* engine block, with the label anchor on top */
const blockGroup = new THREE.Group();
{
  const main = box(0.78, 0.40, 0.92, silverMat);
  blockGroup.add(main);
  const plenum = box(0.46, 0.13, 0.46, darkMetalMat);
  plenum.position.y = 0.27;
  blockGroup.add(plenum);
  for (const s of [-1, 1]) {
    const head = box(0.52, 0.24, 0.30, silverMat);
    head.position.set(0, 0.02, s * 0.58);
    head.rotation.x = -s * 0.45;
    blockGroup.add(head);
    const cover = box(0.44, 0.06, 0.24, darkMetalMat);
    cover.position.set(0, 0.13, s * 0.66);
    cover.rotation.x = -s * 0.45;
    blockGroup.add(cover);
  }
  const pulley = cyl(0.11, 0.06, darkMetalMat, 'x');
  pulley.position.x = -0.44;
  blockGroup.add(pulley);
}
addPart(blockGroup, new THREE.Vector3(1.30, 0.52, 0), new THREE.Vector3(0.05, 0.92, 0));
const engineAnchor = new THREE.Object3D();
engineAnchor.position.set(0, 0.42, 0);
blockGroup.add(engineAnchor);
const engineAnchorRef = new THREE.Object3D();
engineAnchorRef.position.set(0.10, 0.95, 0.18);
blockGroup.add(engineAnchorRef);

/* six pistons with rods */
for (let i = 0; i < 6; i++) {
  const side = i < 3 ? 1 : -1, k = i % 3;
  const g = new THREE.Group();
  const piston = cyl(0.095, 0.13, chromeMat, 'z');
  g.add(piston);
  const rod = box(0.05, 0.24, 0.05, silverMat);
  rod.position.y = -0.17;
  rod.rotation.x = side * 0.3;
  g.add(rod);
  addPart(g,
    new THREE.Vector3(1.30 + (-0.24 + k * 0.24), 0.80, side * 0.60),
    new THREE.Vector3(0.05 + (k - 1) * 0.55, 1.78 + (k % 2) * 0.25, side * 0.88));
}
/* crankshaft */
{
  const g = new THREE.Group();
  const shaft = cyl(0.07, 0.95, silverMat, 'x');
  g.add(shaft);
  for (let i = 0; i < 3; i++) {
    const web = box(0.07, 0.26, 0.20, darkMetalMat);
    web.position.x = -0.28 + i * 0.28;
    web.position.y = 0.05;
    g.add(web);
  }
  addPart(g, new THREE.Vector3(1.30, 0.22, 0), new THREE.Vector3(0.15, 0.28, 0.25));
}
/* gearbox */
{
  const g = new THREE.Group();
  g.add(box(0.50, 0.34, 0.58, silverMat));
  const nose = box(0.24, 0.24, 0.40, darkMetalMat);
  nose.position.x = -0.36;
  g.add(nose);
  addPart(g, new THREE.Vector3(0.60, 0.48, 0), new THREE.Vector3(-0.90, 0.60, -0.35));
}
/* clutch discs */
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group();
  g.add(cyl(0.17, 0.035, i === 1 ? darkMetalMat : chromeMat, 'x'));
  addPart(g,
    new THREE.Vector3(0.99 - i * 0.055, 0.52, 0),
    new THREE.Vector3(-0.45 - i * 0.30, 0.95 + i * 0.18, -0.15));
}
/* exhaust silencers */
for (const s of [-1, 1]) {
  const g = new THREE.Group();
  const sil = box(0.52, 0.15, 0.24, chromeMat);
  g.add(sil);
  const pipe = cyl(0.045, 0.5, silverMat, 'x');
  pipe.position.set(-0.42, 0.05, -s * 0.04);
  g.add(pipe);
  const tip = cyl(0.055, 0.10, darkMetalMat, 'x');
  tip.position.set(0.30, 0, 0);
  g.add(tip);
  addPart(g, new THREE.Vector3(1.55, 0.34, s * 0.52), new THREE.Vector3(0.75, 0.45, s * 1.18));
}
/* suspension struts */
for (const s of [-1, 1]) {
  const g = new THREE.Group();
  const shaft = cyl(0.05, 0.55, silverMat);
  g.add(shaft);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.018, 8, 20), darkMetalMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.14 + i * 0.14;
    g.add(ring);
  }
  addPart(g, new THREE.Vector3(-1.45, 0.55, s * 0.64),
    new THREE.Vector3(-2.45, 0.85, s * 1.55));
}
/* brake disc and red caliper, foreground in the diagram */
{
  const g = new THREE.Group();
  const disc = cyl(0.17, 0.035, chromeMat, 'z');
  g.add(disc);
  const cal = box(0.11, 0.17, 0.07, redCaliperMat);
  cal.position.set(0.11, 0.07, 0.02);
  g.add(cal);
  addPart(g, new THREE.Vector3(-1.45, 0.36, 0.88), new THREE.Vector3(-2.80, 0.62, 2.05));
}
powerGroup.visible = false;

/* ================= environments ================= */
/* blueprint room: grid wall and floor */
const envBlueprint = fadeGroup();
{
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  const grad = x.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#1050a8');
  grad.addColorStop(1, '#082c66');
  x.fillStyle = grad;
  x.fillRect(0, 0, 1024, 1024);
  x.strokeStyle = 'rgba(255,255,255,0.55)';
  x.lineWidth = 1.4;
  for (let i = 0; i <= 16; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 1024); x.stroke(); }
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(0, i * 128); x.lineTo(1024, i * 128); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i <= 32; i++) for (let j = 0; j <= 16; j++) x.fillRect(i * 32 - 1, j * 64 - 1, 2, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(260, 60),
    regMat(envBlueprint, new THREE.MeshBasicMaterial({ map: tex })));
  wall.position.set(0, 12, -20);
  envBlueprint.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(170, 70),
    regMat(envBlueprint, new THREE.MeshBasicMaterial({ color: 0x0a2f6b })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  envBlueprint.add(floor);
  const grid = new THREE.GridHelper(140, 140, 0xbfe6ff, 0x7fb8ff);
  grid.position.y = 0.005;
  grid.material.transparent = true;
  grid.material.userData.baseOp = 0.5;
  envBlueprint.userData.mats.push(grid.material);
  envBlueprint.add(grid);
}

/* dark studio: floor grid, ceiling strip */
const envStudio = fadeGroup();
let studioGrid = null;
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(130, 70),
    regMat(envStudio, new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.55, metalness: 0.05 })));
  floor.rotation.x = -Math.PI / 2;
  envStudio.add(floor);
  studioGrid = new THREE.GridHelper(44, 44, 0x2fd8f2, 0x14424f);
  studioGrid.position.y = 0.006;
  studioGrid.material.transparent = true;
  studioGrid.material.userData.baseOp = 0.85;
  envStudio.userData.mats.push(studioGrid.material);
  envStudio.add(studioGrid);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 16),
    regMat(envStudio, new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 1 })));
  back.position.set(0, 6, -12);
  envStudio.add(back);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(11, 0.06, 0.5),
    regMat(envStudio, new THREE.MeshBasicMaterial({ color: 0xeaf6ff })));
  strip.position.set(0, 4.4, 0);
  envStudio.add(strip);
}

/* white light tent with opening walls and a skyline behind */
const envWhite = fadeGroup();
let wallL = null, wallR = null;
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(130, 70),
    regMat(envWhite, new THREE.MeshStandardMaterial({ color: 0xf4f5f6, roughness: 0.6 })));
  floor.rotation.x = -Math.PI / 2;
  envWhite.add(floor);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.07, 44),
    regMat(envWhite, new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.5 })));
  disc.position.y = 0.035;
  envWhite.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.02, 8, 60),
    regMat(envWhite, new THREE.MeshBasicMaterial({ color: 0xffffff })));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.075;
  envWhite.add(ring);
  const wallMat = regMat(envWhite, new THREE.MeshStandardMaterial({ color: 0xf7f8f9, roughness: 0.85, side: THREE.DoubleSide }));
  wallL = new THREE.Group();
  wallL.position.set(-7.2, 0, -6.0);
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 5.6), wallMat);
  wl.position.set(3.6, 2.8, 0);
  wallL.add(wl);
  envWhite.add(wallL);
  wallR = new THREE.Group();
  wallR.position.set(7.2, 0, -6.0);
  const wr = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 5.6), wallMat);
  wr.position.set(-3.6, 2.8, 0);
  wallR.add(wr);
  envWhite.add(wallR);
  const soft = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4),
    regMat(envWhite, new THREE.MeshBasicMaterial({ color: 0xffffff })));
  soft.rotation.x = Math.PI / 2;
  soft.position.set(0, 5.4, -1);
  envWhite.add(soft);
  /* night skyline canvas */
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 288;
  const x = c.getContext('2d');
  const grad = x.createLinearGradient(0, 0, 0, 288);
  grad.addColorStop(0, '#050914');
  grad.addColorStop(1, '#12233f');
  x.fillStyle = grad;
  x.fillRect(0, 0, 1024, 288);
  let bx = 0;
  while (bx < 1024) {
    const bw = 40 + Math.random() * 70, bh = 90 + Math.random() * 170;
    x.fillStyle = '#04060c';
    x.fillRect(bx, 288 - bh, bw, bh);
    x.fillStyle = 'rgba(255,205,120,0.9)';
    for (let wy = 288 - bh + 10; wy < 278; wy += 13)
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 11)
        if (Math.random() > 0.55) x.fillRect(wx, wy, 4, 6);
    bx += bw + 6;
  }
  const tex = new THREE.CanvasTexture(c);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 17),
    regMat(envWhite, new THREE.MeshBasicMaterial({ map: tex })));
  sky.position.set(0, 5.5, -16);
  envWhite.add(sky);
}

/* wet night street */
const envStreet = fadeGroup();
const streetMovers = [];
{
  const road = new THREE.Mesh(new THREE.PlaneGeometry(17, 95),
    regMat(envStreet, new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.38, metalness: 0.15 })));
  road.rotation.x = -Math.PI / 2;
  road.position.y = -0.005;
  envStreet.add(road);
  for (const gx of [-2.8, 2.8]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 95),
      regMat(envStreet, new THREE.MeshBasicMaterial({ color: 0x1d5b74 })));
    strip.position.set(gx, 0.004, -20);
    envStreet.add(strip);
  }
  const dashMat = regMat(envStreet, new THREE.MeshBasicMaterial({ color: 0xd8e6ee }));
  for (let z = -76; z <= 8; z += 8) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 3.2), dashMat);
    d.position.set(0, 0.006, z);
    d.userData.baseZ = z;
    envStreet.add(d);
    streetMovers.push(d);
  }
  /* building facades with lit windows */
  const fc = document.createElement('canvas');
  fc.width = 256; fc.height = 256;
  const fx = fc.getContext('2d');
  fx.fillStyle = '#0b0f16';
  fx.fillRect(0, 0, 256, 256);
  for (let wy = 12; wy < 244; wy += 22) for (let wx = 12; wx < 244; wx += 22) {
    fx.fillStyle = Math.random() > 0.5 ? 'rgba(255,196,110,0.95)' : 'rgba(150,210,255,0.85)';
    if (Math.random() > 0.35) fx.fillRect(wx, wy, 11, 13);
  }
  const ftex = new THREE.CanvasTexture(fc);
  const bMat = regMat(envStreet, new THREE.MeshBasicMaterial({ map: ftex }));
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    const h = 4.5 + ((i * 37 + (side > 0 ? 13 : 0)) % 55) / 10;
    const b = new THREE.Mesh(new THREE.BoxGeometry(5, h, 6), bMat);
    const z = -70 + i * 11 + (side > 0 ? 5 : 0);
    b.position.set(side * 8.4, h / 2, z);
    b.userData.baseZ = z;
    envStreet.add(b);
    streetMovers.push(b);
  }
  const poleMat = regMat(envStreet, new THREE.MeshStandardMaterial({ color: 0x14181e, roughness: 0.7 }));
  const lampMat = regMat(envStreet, new THREE.MeshBasicMaterial({ color: 0xcfe8ff }));
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -68 + i * 13;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 8), poleMat);
    pole.position.set(side * 5.4, 1.8, z);
    pole.userData.baseZ = z;
    envStreet.add(pole);
    streetMovers.push(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), lampMat);
    lamp.position.set(side * 5.4, 3.65, z);
    lamp.userData.baseZ = z;
    envStreet.add(lamp);
    streetMovers.push(lamp);
  }
}

/* ================= material states: hologram, clay, paint ================= */
let carState = 'paint';
function setCarState(state) {
  if (state === carState) return;
  carState = state;
  bodyGroup.traverse(o => {
    if (!o.isMesh || !o.userData.kind) return;
    if (state === 'clay') o.material = clayMat;
    else if (state === 'holo') o.material = holoMat;
    else o.material = o.userData.mat;
  });
}

/* ================= label recipe (as Project 17) ================= */
const labelLayer = $('#labels');
const labelSvg = $('#labelSvg');
const labelDefs = [{
  id: 'engine',
  el: $('#lbl-engine'),
  anchor: engineAnchor,
  ref: engineAnchorRef,
  dx: -120, dy: -120,
  active: p => p > 0.215 && p < 0.46,
  shown: false, sx: 0, sy: 0, tx: 0, ty: 0,
}];
function svgEl(name, attrs) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
for (const L of labelDefs) {
  L.line = svgEl('line', { stroke: 'rgba(255,255,255,0.6)', 'stroke-width': '1' });
  L.dot = svgEl('circle', { r: '4', fill: '#fff' });
  labelSvg.append(L.line, L.dot);
}
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3();
function updateLabels(p, idle) {
  const W = labelLayer.clientWidth, H = labelLayer.clientHeight;
  labelSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  labelSvg.setAttribute('width', W);
  labelSvg.setAttribute('height', H);
  for (const L of labelDefs) {
    const on = L.active(p);
    if (on && idle) {
      L.anchor.getWorldPosition(_v1);
      L.ref.getWorldPosition(_v2);
      _n.copy(_v2).sub(_v1).normalize();
      camera.getWorldPosition(_c);
      const facing = _n.dot(_v1.clone().sub(_c).normalize()) < 0.35;
      _v1.project(camera);
      L.tx = (_v1.x * 0.5 + 0.5) * W;
      L.ty = (-_v1.y * 0.5 + 0.5) * H;
      const behind = _v1.z > 1;
      if (!L.shown) { L.sx = L.tx; L.sy = L.ty; }
      L.shown = facing && !behind;
    } else if (!on) L.shown = false;
    if (L.shown) {
      L.sx += (L.tx - L.sx) * 0.2;
      L.sy += (L.ty - L.sy) * 0.2;
    }
    L.el.classList.toggle('on', !!L.shown);
    L.line.style.opacity = L.shown ? '1' : '0';
    L.dot.style.opacity = L.shown ? '1' : '0';
    if (L.shown) {
      L.el.style.transform = `translate(${L.sx + L.dx}px, ${L.sy + L.dy}px)`;
      L.line.setAttribute('x1', L.sx); L.line.setAttribute('y1', L.sy);
      L.line.setAttribute('x2', L.sx + L.dx + 128); L.line.setAttribute('y2', L.sy + L.dy + 14);
      L.dot.setAttribute('cx', L.sx); L.dot.setAttribute('cy', L.sy);
    }
  }
}

/* degree reticle around the engine anchor */
const reticle = $('#reticle');
function updateReticle(p) {
  const on = p > 0.295 && p < 0.455;
  reticle.classList.toggle('on', on);
  reticle.hidden = !on;
  if (!on) return;
  engineAnchor.getWorldPosition(_v1);
  _v1.project(camera);
  const W = labelLayer.clientWidth, H = labelLayer.clientHeight;
  const x = (_v1.x * 0.5 + 0.5) * W, y = (-_v1.y * 0.5 + 0.5) * H;
  const rot = seg(p, 0.295, 0.455) * 160;
  const half = reticle.clientWidth / 2 || 84;
  reticle.style.transform = `translate(${x - half}px, ${y - half}px) rotate(${rot}deg)`;
}

/* ================= timeline samplers ================= */
const camPosAt = sampler([
  [0.00, [5.4, 2.1, 6.6]], [0.15, [6.0, 1.9, 5.4]], [0.24, [0.4, 1.35, 8.8]],
  [0.34, [5.9, 2.0, 5.2]], [0.42, [3.6, 1.15, 3.4]], [0.50, [4.8, 2.3, 7.0]],
  [0.58, [4.4, 1.9, 5.8]], [0.70, [4.8, 1.35, 4.6]], [0.76, [5.6, 2.5, 7.6]],
  [0.83, [4.6, 2.0, 6.6]], [0.875, [2.7, 1.2, -6.9]], [0.905, [5.6, 1.7, 0.6]],
  [0.94, [2.0, 1.45, 7.2]], [1.00, [2.0, 1.45, 7.6]],
]);
const camTgtAt = sampler([
  [0.00, [0, 0.6, 0]], [0.34, [0.3, 0.6, 0]], [0.42, [1.35, 0.6, 0]],
  [0.50, [0.1, 0.8, 0]], [0.70, [0, 0.6, 0]], [0.875, [0, 0.65, 0]],
  [0.94, [0, 0.7, -1.5]], [1.00, [0, 0.7, -2.5]],
]);
const carRotAt = sampler([
  [0.00, [0, -0.55, 0]], [0.15, [0, -0.18, 0]], [0.24, [0, 0.02, 0]],
  [0.34, [0, 0.55, 0]], [0.46, [0, 0.42, 0]], [0.60, [0, 0.28, 0]],
  [0.70, [0, 0.12, 0]], [0.76, [0, 0.55, 0]], [0.83, [0, 1.15, 0]],
  [0.875, [0, -Math.PI / 2, 0]], [1.00, [0, -Math.PI / 2, 0]],
], true);
const bgAt = (() => {
  const keys = [
    [0.00, new THREE.Color(0x11161f)], [0.045, new THREE.Color(0x0a3a75)],
    [0.135, new THREE.Color(0x060a12)], [0.16, new THREE.Color(0x0b0f16)],
    [0.715, new THREE.Color(0x0b0f16)], [0.75, new THREE.Color(0xe9ebec)],
    [0.83, new THREE.Color(0xe9ebec)], [0.86, new THREE.Color(0x060a14)],
    [1.00, new THREE.Color(0x060a14)],
  ];
  return p => {
    if (p <= keys[0][0]) return keys[0][1].clone();
    for (let i = 0; i < keys.length - 1; i++) {
      if (p <= keys[i + 1][0]) {
        const t = sstep((p - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
        return keys[i][1].clone().lerp(keys[i + 1][1], t);
      }
    }
    return keys[keys.length - 1][1].clone();
  };
})();

/* ================= DOM elements ================= */
const stage = $('#stage');
const formStudy = $('#formStudy');
const formPathMain = $('#formPathMain'), formPathGlass = $('#formPathGlass');
const washEl = $('#wash');
const hudChapter = $('#hudChapter'), hudSince = $('#hudSince'), hudBrand = $('#hudBrand');
const specCounter = $('#specCounter'), specNum = $('#specNum');
const statAccel = $('#statAccel'), statWeight = $('#statWeight');
const statement = $('#statement'), assemblyLine = $('#assemblyLine'), tagline = $('#tagline');
const scrollHint = $('#scrollHint');
const endCard = $('#endCard'), endPath = $('#endPath');
const dots = $$('.dot');
let counterValue = 0, activeDot = 0;
for (const pth of [formPathMain, formPathGlass, endPath]) pth.style.strokeDasharray = '100';
/* fade an element that also carries the hidden attribute */
function show(el, op) {
  el.style.opacity = op.toFixed(3);
  el.hidden = op <= 0.01;
}

function applyTimeline(p, now) {
  /* camera and car */
  camera.position.copy(camPosAt(p));
  camera.lookAt(camTgtAt(p));
  carGroup.rotation.copy(carRotAt(p));
  if (!REDUCED && p > 0.72 && p < 0.80) carGroup.rotation.y += Math.sin(now * 0.00045) * 0.10;
  carGroup.position.set(0, 0, -3.2 * seg(p, 0.915, 0.965));
  scene.background.copy(bgAt(p));
  scene.fog.near = lerp(80, 13, seg(p, 0.838, 0.868));
  scene.fog.far = lerp(160, 42, seg(p, 0.838, 0.868));

  /* material state and the two wash flashes */
  setCarState(p < 0.078 ? 'holo' : p < 0.112 ? 'clay' : 'paint');
  const w1 = pulse(p, 0.078, 0.010), w2 = pulse(p, 0.112, 0.010);
  const wash = Math.max(w1, w2);
  washEl.style.opacity = (wash * 0.85).toFixed(3);
  washEl.style.background = w1 >= w2 ? '#cfe9ff' : '#fff3da';

  /* panels: open, hover, then fly off */
  const lidOpen = seg(p, 0.17, 0.25) * (1 - seg(p, 0.585, 0.66));
  const roofOpen = seg(p, 0.20, 0.30) * (1 - seg(p, 0.575, 0.66));
  const doorOpen = seg(p, 0.20, 0.29) * (1 - seg(p, 0.585, 0.66));
  const coverOpen = seg(p, 0.24, 0.33) * (1 - seg(p, 0.575, 0.66));
  const spoilerOpen = seg(p, 0.24, 0.31) * (1 - seg(p, 0.585, 0.66));
  const fly = seg(p, 0.385, 0.46) * (1 - seg(p, 0.535, 0.60));
  lidPivot.rotation.z = -0.98 * lidOpen;
  lidPivot.position.set(-0.88 - 0.7 * fly, 0.855 + 1.3 * fly, 0.5 * fly);
  roofGroup.position.set(0.3 * fly, 0.85 * roofOpen + 0.75 * fly, -0.4 * fly);
  roofGroup.rotation.z = 0.06 * roofOpen;
  doorL.rotation.y = -0.85 * doorOpen;
  doorL.position.set(-0.3 * fly, 0.9 * fly, 0.845 + 1.8 * fly);
  doorR.rotation.y = 0.85 * doorOpen;
  doorR.position.set(-0.3 * fly, 0.9 * fly, -0.845 - 1.8 * fly);
  coverPivot.rotation.z = -0.55 * coverOpen;
  coverPivot.position.set(2.12 + 1.2 * fly, 0.895 + 1.1 * fly, -0.5 * fly);
  spoilerGroup.position.set(2.06 + 1.6 * fly, 0.90 + 0.38 * spoilerOpen + 1.02 * fly, 0.3 * fly);
  spoilerGroup.rotation.z = -0.18 * spoilerOpen;

  /* body fade and the exploded diagram */
  const bodyOp = 1 - trap(p, 0.40, 0.47, 0.54, 0.60);
  paintBodyMat.opacity = bodyOp;
  glassMat.opacity = 0.96 * bodyOp;
  interiorMat.opacity = bodyOp;
  darkMetalMat.opacity = bodyOp;
  paintPanelMat.opacity = 1 - trap(p, 0.40, 0.47, 0.54, 0.60);
  const e = seg(p, 0.42, 0.50) * (1 - seg(p, 0.53, 0.62));
  for (const part of PARTS) part.g.position.lerpVectors(part.home, part.away, e);
  const wheelAmt = seg(p, 0.42, 0.50) * (1 - seg(p, 0.54, 0.62));
  for (const w of wheels) w.g.position.lerpVectors(w.home, w.away, wheelAmt);
  powerGroup.visible = p > 0.145 && p < 0.715;
  interiorGroup.visible = p > 0.145;

  /* environments */
  setWeight(envBlueprint, trap(p, 0.030, 0.048, 0.132, 0.158));
  const wStudio = trap(p, 0.150, 0.175, 0.700, 0.728);
  setWeight(envStudio, wStudio);
  studioGrid.material.opacity = 0.85 * wStudio * (1 - seg(p, 0.60, 0.68));
  const wWhite = trap(p, 0.715, 0.738, 0.812, 0.842);
  setWeight(envWhite, wWhite);
  const wallOpen = seg(p, 0.782, 0.83);
  wallL.rotation.y = 0.95 * wallOpen;
  wallR.rotation.y = -0.95 * wallOpen;
  const wStreet = seg(p, 0.838, 0.868);
  setWeight(envStreet, wStreet);
  blob.material.opacity = 0.5 * Math.max(wWhite, 1 - wStreet);

  /* lights */
  hemi.intensity = 0.5 + 0.3 * trap(p, 0.030, 0.048, 0.132, 0.158) + 0.95 * wWhite - 0.2 * wStreet;
  key.intensity = 1.15 + 0.6 * wWhite;
  rim.intensity = 1.4 * wStudio + 0.7 * trap(p, 0.030, 0.048, 0.132, 0.158) + 0.3;
  const sweepT = seg(p, 0.655, 0.71);
  sweep.intensity = 260 * pulse(p, 0.685, 0.028);
  sweep.position.x = lerp(-4.5, 4.5, sweepT);
  lightBarMat.opacity = 0.30 + 0.70 * wStreet;
  headMat.opacity = 0.35 + 0.65 * wStreet;
  tailLight.intensity = 5 * wStreet;

  /* street drive: scroll drives the world past, then a gentle creep */
  const drive = seg(p, 0.845, 0.968) * 85 + creep;
  for (const m of streetMovers) {
    let z = m.userData.baseZ + (drive % 92);
    if (z > 12) z -= 92;
    m.position.z = z;
  }
  const spinDelta = drive - prevDrive;
  prevDrive = drive;
  for (const w of wheels) w.spin.rotation.z -= spinDelta * 1.9;

  return { lidOpen, roofOpen, doorOpen, coverOpen, spoilerOpen, bodyOp, e };
}
let creep = 0, prevDrive = 0;

/* ================= DOM state ================= */
function applyDom(p) {
  /* form study overlay */
  const formOp = 1 - seg(p, 0.036, 0.052);
  formStudy.style.opacity = formOp.toFixed(3);
  formStudy.style.display = formOp <= 0.01 ? 'none' : '';
  formPathMain.style.strokeDashoffset = ((1 - seg(p, 0.0005, 0.009)) * 100).toFixed(1);
  formPathGlass.style.strokeDashoffset = ((1 - seg(p, 0.002, 0.0105)) * 100).toFixed(1);

  /* chapter HUD */
  show(hudSince, trap(p, 0.048, 0.062, 0.132, 0.148));
  let chapter = '';
  if (p >= 0.15 && p < 0.53) chapter = '01 / DECONSTRUCTION';
  else if (p >= 0.53 && p < 0.715) chapter = '02 / REASSEMBLY';
  else if (p >= 0.715 && p < 0.965) chapter = '03 / REBORN';
  hudChapter.textContent = chapter || '911 / FORM STUDY';
  hudChapter.style.opacity = chapter ? '1' : formOp.toFixed(3);
  show(hudBrand, trap(p, 0.15, 0.17, 0.50, 0.53));

  /* spec counter, settling at exactly 480 */
  counterValue = Math.round(480 * seg(p, 0.295, 0.37));
  specNum.textContent = counterValue;
  show(specCounter, trap(p, 0.27, 0.30, 0.50, 0.545));
  const statOp = trap(p, 0.44, 0.475, 0.515, 0.545);
  show(statAccel, statOp);
  show(statWeight, statOp);

  /* reborn words */
  show(assemblyLine, trap(p, 0.655, 0.685, 0.705, 0.725));
  let word = '', wordOp = 0;
  if (p >= 0.715 && p < 0.815) { word = 'ENGINEERED.'; wordOp = trap(p, 0.72, 0.745, 0.795, 0.815); }
  else if (p >= 0.845 && p < 0.897) { word = 'DECONSTRUCTED.'; wordOp = trap(p, 0.85, 0.862, 0.885, 0.897); }
  else if (p >= 0.897 && p < 0.962) { word = 'REBORN.'; wordOp = trap(p, 0.90, 0.915, 0.945, 0.962); }
  statement.textContent = word;
  show(statement, wordOp);
  stage.dataset.ground = (p >= 0.715 && p < 0.845) ? 'light' : 'dark';
  show(tagline, seg(p, 0.915, 0.94) * (1 - seg(p, 0.962, 0.975)));

  /* end card */
  const endOp = seg(p, 0.965, 0.985);
  endCard.style.display = endOp > 0.01 ? 'flex' : 'none';
  endCard.style.opacity = endOp.toFixed(3);
  endPath.style.strokeDashoffset = ((1 - seg(p, 0.968, 0.99)) * 100).toFixed(1);

  scrollHint.style.opacity = p < 0.02 ? '1' : '0';

  /* chapter dots */
  activeDot = p < 0.08 ? 0 : p < 0.30 ? 1 : p < 0.59 ? 2 : p < 0.79 ? 3 : 4;
  dots.forEach((d, i) => d.classList.toggle('is-active', i === activeDot));
}

/* ================= loop ================= */
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - lastT);
  lastT = now;
  shownP += (targetP - shownP) * (REDUCED ? 1 : 0.16);
  if (Math.abs(targetP - shownP) < 0.0004) shownP = targetP;
  const p = effectiveP();
  const idle = REDUCED || performance.now() - lastScrollAt > 180;
  if (idle && !REDUCED && p > 0.845 && p < 0.96) creep += dt * 0.0016;
  const state = applyTimeline(p, now);
  applyDom(p);
  updateLabels(p, idle);
  updateReticle(p);
  window.__state = state;
  renderer.render(scene, camera);
}
resize();
readScroll();
shownP = targetP;
requestAnimationFrame(frame);

/* ================= navigation ================= */
function scrollToP(p) {
  const max = space.offsetHeight - window.innerHeight;
  window.scrollTo({ top: p * max, behavior: REDUCED ? 'auto' : 'smooth' });
}
dots.forEach(d => d.addEventListener('click', () => scrollToP(parseFloat(d.dataset.p))));
$('#replayBtn').addEventListener('click', () => scrollToP(0));
$('#footReplay').addEventListener('click', () => scrollToP(0));

/* test hook */
window.__porsche = {
  get progress() { return effectiveP(); },
  get rawProgress() { return shownP; },
  state: () => carState,
  matState: () => bodyMain.material === holoMat ? 'holo' : bodyMain.material === clayMat ? 'clay' : 'paint',
  dot: () => activeDot,
  counter: () => counterValue,
  timeline: () => window.__state || {},
  label: id => {
    const L = labelDefs.find(l => l.id === id);
    if (!L) return null;
    return { shown: L.shown, sx: L.sx, sy: L.sy, tx: L.tx, ty: L.ty };
  },
  partScreen: () => {
    engineAnchor.getWorldPosition(_v1);
    _v1.project(camera);
    return { x: _v1.x, y: _v1.y, z: _v1.z };
  },
};
