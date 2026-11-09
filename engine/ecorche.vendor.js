/* Atlas Ecorche 3D engine - vendored VERBATIM from the Atlas Ecorche artifact
   (claude.ai/artifact/JxQsKSExC1ieUH71MAfPKs), the single <script> block that
   defines window.Ecorche. DOM-free: the artifact's own UI lives in a separate
   script and is not included. Do not edit - see engine/ecorche.ts for the
   typed wrapper the app calls. */
(function(){
/* =====================================================================
 * Atlas Écorché — procedural anatomical muscle body
 * Library-free geometry generator + WebGL2 viewer + optional three.js adapter.
 * Coordinate system: metres, +Y up, +Z = body front, +X = body's LEFT side.
 * ===================================================================== */

// ---------------------------------------------------------------- math
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mir = (p) => [-p[0], p[1], p[2]];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const DEG = Math.PI / 180;

function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cubic Hermite through a table of rows [x, c1, c2, ...]
function interpRaw(tab, x, col) {
  const n = tab.length;
  if (x <= tab[0][0]) return tab[0][col];
  if (x >= tab[n - 1][0]) return tab[n - 1][col];
  let i = 0; while (x > tab[i + 1][0]) i++;
  const slope = (j) => {
    if (j <= 0) return (tab[1][col] - tab[0][col]) / (tab[1][0] - tab[0][0]);
    if (j >= n - 1) return (tab[n - 1][col] - tab[n - 2][col]) / (tab[n - 1][0] - tab[n - 2][0]);
    return (tab[j + 1][col] - tab[j - 1][col]) / (tab[j + 1][0] - tab[j - 1][0]);
  };
  const x0 = tab[i][0], x1 = tab[i + 1][0], h = x1 - x0, t = (x - x0) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * tab[i][col] + (t3 - 2 * t2 + t) * h * slope(i) +
    (-2 * t3 + 3 * t2) * tab[i + 1][col] + (t3 - t2) * h * slope(i + 1);
}
// fast lookup table over [x0,x1] for every column of a profile table
function makeLUT(tab, cols, N = 160) {
  const x0 = tab[0][0], x1 = tab[tab.length - 1][0];
  const data = cols.map((c) => { const a = new Float32Array(N + 1); for (let i = 0; i <= N; i++) a[i] = interpRaw(tab, x0 + (x1 - x0) * i / N, c); return a; });
  return {
    x0, x1,
    get(x, ci) {
      const f = clamp((x - x0) / (x1 - x0), 0, 1) * N, i = Math.min(N - 1, f | 0), t = f - i, a = data[ci];
      return a[i] + (a[i + 1] - a[i]) * t;
    },
  };
}

// ---------------------------------------------------------------- body landmarks (left side)
const J = {
  pelvis: [0, 0.95, 0], spine1: [0, 1.05, -0.03], spine2: [0, 1.20, -0.04], chest: [0, 1.33, -0.035],
  neck: [0, 1.47, -0.02], head: [0, 1.575, 0.0],
  clav: [0.03, 1.425, 0.035], acromion: [0.17, 1.448, -0.012],
  shoulder: [0.185, 1.405, -0.02], elbow: [0.27, 1.115, -0.04], wrist: [0.345, 0.872, -0.01], handEnd: [0.372, 0.70, 0.012],
  hip: [0.088, 0.925, 0.0], knee: [0.108, 0.505, 0.012], ankle: [0.122, 0.085, -0.022], toe: [0.136, 0.0, 0.165],
};

// torso cross-sections: [y, rx (half-width), rz (half-depth), cz (centre z)]
const TORSO_TAB = [
  [0.84, 0.138, 0.084, -0.006], [0.90, 0.157, 0.097, -0.010], [0.96, 0.160, 0.100, -0.008],
  [1.02, 0.148, 0.094, 0.000], [1.08, 0.136, 0.090, 0.006], [1.15, 0.140, 0.094, 0.008],
  [1.22, 0.150, 0.104, 0.004], [1.29, 0.158, 0.110, -0.004], [1.35, 0.160, 0.108, -0.010],
  [1.40, 0.152, 0.098, -0.014], [1.44, 0.125, 0.082, -0.018], [1.475, 0.074, 0.060, -0.018],
  [1.50, 0.052, 0.052, -0.012],
];
const TORSO = makeLUT(TORSO_TAB, [1, 2, 3]);

// limb profiles: [t, rx (lateral), rz (front-back)]
const PROF = {
  upper: [[0, 0.044, 0.046], [0.15, 0.040, 0.042], [0.5, 0.036, 0.038], [0.85, 0.033, 0.032], [1, 0.031, 0.028]],
  fore: [[0, 0.034, 0.032], [0.2, 0.036, 0.034], [0.55, 0.028, 0.024], [0.85, 0.022, 0.016], [1, 0.022, 0.014]],
  thigh: [[0, 0.078, 0.078], [0.2, 0.072, 0.072], [0.55, 0.060, 0.060], [0.85, 0.050, 0.050], [1, 0.046, 0.048]],
  shin: [[0, 0.044, 0.046], [0.2, 0.044, 0.048], [0.5, 0.036, 0.040], [0.8, 0.028, 0.030], [1, 0.026, 0.028]],
  neck: [[0, 0.050, 0.050], [1, 0.047, 0.048]],
};

function makeSeg(a, b, prof) {
  const ax = sub(b, a), L = len(ax), axis = mul(ax, 1 / L);
  const f = norm(sub([0, 0, 1], mul(axis, axis[2])));
  const l = norm(cross(f, axis));
  return { a, b, L, axis, f, l, lut: makeLUT(prof, [1, 2]) };
}
const SEG = {
  upper: makeSeg(J.shoulder, J.elbow, PROF.upper),
  fore: makeSeg(J.elbow, J.wrist, PROF.fore),
  thigh: makeSeg(J.hip, J.knee, PROF.thigh),
  shin: makeSeg(J.knee, J.ankle, PROF.shin),
  neck: makeSeg([0, 1.46, -0.016], [0, 1.60, -0.004], PROF.neck),
};

// ---------------------------------------------------------------- surface coordinates for authoring
function T(y, th, extra = 0) {
  const rx = TORSO.get(y, 0) + extra, rz = TORSO.get(y, 1) + extra, cz = TORSO.get(y, 2);
  return [rx * Math.sin(th * DEG), y, cz + rz * Math.cos(th * DEG)];
}
function segPt(s, t, th, extra = 0) {
  const rx = s.lut.get(t, 0) + extra, rz = s.lut.get(t, 1) + extra;
  const c = add(s.a, mul(s.axis, t * s.L));
  return add(c, add(mul(s.l, Math.sin(th * DEG) * rx), mul(s.f, Math.cos(th * DEG) * rz)));
}
const U = (t, th) => segPt(SEG.upper, t, th);
const F = (t, th) => segPt(SEG.fore, t, th);
const H = (t, th) => segPt(SEG.thigh, t, th);
const S = (t, th) => segPt(SEG.shin, t, th);
const P = (p) => p;
const arc = (fn, t, a, b, k = 5) => Array.from({ length: k }, (_, i) => fn(t, a + (b - a) * i / (k - 1)));
const arcT = (y, a, b, k = 6) => Array.from({ length: k }, (_, i) => T(y, a + (b - a) * i / (k - 1)));

// ---------------------------------------------------------------- signed distance field of the deep body
function sdEllipsoid(p, c, r) {
  const q = [(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]];
  const k0 = Math.hypot(q[0], q[1], q[2]);
  const k1 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
  return k1 < 1e-9 ? -Math.min(r[0], r[1], r[2]) : k0 * (k0 - 1) / k1;
}
function sdTorso(p) {
  const y = clamp(p[1], TORSO.x0, TORSO.x1);
  const rx = TORSO.get(y, 0), rz = TORSO.get(y, 1), cz = TORSO.get(y, 2);
  const qx = p[0], qz = p[2] - cz, r = Math.hypot(qx, qz);
  const dr = r < 1e-7 ? -Math.min(rx, rz) : r * (1 - 1 / Math.hypot(qx / rx, qz / rz));
  const dy = Math.abs(p[1] - y);
  return dy > 1e-7 ? (dr > 0 ? Math.hypot(dr, dy) : dy) : dr;
}
function sdSeg(p, s) {
  const ap = sub(p, s.a), ta = dot(ap, s.axis) / s.L, tc = clamp(ta, 0, 1);
  const q = sub(ap, mul(s.axis, tc * s.L));
  const ql = dot(q, s.l), qf = dot(q, s.f), da = Math.abs(dot(q, s.axis));
  const rx = s.lut.get(tc, 0), rz = s.lut.get(tc, 1), r = Math.hypot(ql, qf);
  const dr = r < 1e-7 ? -Math.min(rx, rz) : r * (1 - 1 / Math.hypot(ql / rx, qf / rz));
  return da > 1e-7 ? (dr > 0 ? Math.hypot(dr, da) : da) : dr;
}
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }

const BODY_PRIMS = (() => {
  const prims = [];
  const segPrim = (s) => { const c = lerp(s.a, s.b, 0.5); prims.push({ f: (p) => sdSeg(p, s), c, r: s.L * 0.5 + 0.1 }); };
  const sph = (c, r) => prims.push({ f: (p) => len(sub(p, c)) - r, c, r });
  const ell = (c, r) => prims.push({ f: (p) => sdEllipsoid(p, c, r), c, r: Math.max(r[0], r[1], r[2]) });
  prims.push({ f: sdTorso, c: [0, 1.17, 0], r: 0.42 });
  segPrim(SEG.neck);
  ell([0, 1.665, 0.005], [0.074, 0.098, 0.092]);
  ell([0, 1.595, 0.035], [0.056, 0.055, 0.062]);
  for (const side of [1, -1]) {
    const m = side > 0 ? (p) => p : mir;
    const ms = side > 0 ? (s, prof) => s : (s, prof) => makeSeg(mir(s.a), mir(s.b), prof);
    sph(m([0.178, 1.405, -0.018]), 0.042);
    segPrim(ms(SEG.upper, PROF.upper)); segPrim(ms(SEG.fore, PROF.fore));
    segPrim(ms(SEG.thigh, PROF.thigh)); segPrim(ms(SEG.shin, PROF.shin));
    sph(m(J.elbow), 0.031); sph(m(J.knee), 0.046);
    ell(m(J.wrist), [0.024, 0.016, 0.016]); sph(m(J.ankle), 0.029);
    ell(m([0.072, 0.885, -0.052]), [0.07, 0.078, 0.056]);
  }
  return prims;
})();
const SMK = 0.02;
function sdf(p) {
  let d = 1e9;
  for (let i = 0; i < BODY_PRIMS.length; i++) {
    const pr = BODY_PRIMS[i];
    const dx = p[0] - pr.c[0], dy = p[1] - pr.c[1], dz = p[2] - pr.c[2];
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) - pr.r > d + SMK) continue;
    d = smin(d, pr.f(p), SMK);
  }
  return d;
}
function sdfGrad(p) {
  const e = 0.0012;
  return norm([
    sdf([p[0] + e, p[1], p[2]]) - sdf([p[0] - e, p[1], p[2]]),
    sdf([p[0], p[1] + e, p[2]]) - sdf([p[0], p[1] - e, p[2]]),
    sdf([p[0], p[1], p[2] + e]) - sdf([p[0], p[1], p[2] - e]),
  ]);
}
function projectTo(p, target, outOnly) {
  for (let it = 0; it < 4; it++) {
    const d = sdf(p);
    if (outOnly && d >= target) return p;
    if (Math.abs(d - target) < 2e-4) return p;
    p = sub(p, mul(sdfGrad(p), d - target));
  }
  return p;
}
function sdfAO(p, n) {
  const d0 = sdf(p); let occ = 0;
  const hs = [0.012, 0.028, 0.06], ws = [0.45, 0.33, 0.22];
  for (let i = 0; i < 3; i++) {
    const h = hs[i], d = sdf(add(p, mul(n, h)));
    occ += ws[i] * Math.max(0, d0 + h - d) / h;
  }
  return clamp(1 - 1.35 * occ, 0.32, 1);
}

// ---------------------------------------------------------------- curves
function polyAt(poly, u) {
  if (typeof poly[0] === 'number') return poly;
  if (poly.length === 1) return poly[0];
  const L = [0];
  for (let i = 1; i < poly.length; i++) L.push(L[i - 1] + len(sub(poly[i], poly[i - 1])));
  const tgt = u * L[L.length - 1];
  let i = 1; while (i < L.length - 1 && L[i] < tgt) i++;
  const t = (tgt - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]);
  return lerp(poly[i - 1], poly[i], clamp(t, 0, 1));
}
function resample(pts, M) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + len(sub(pts[i], pts[i - 1])));
  const tot = L[L.length - 1], out = [];
  let i = 1;
  for (let j = 0; j < M; j++) {
    const tgt = tot * j / (M - 1);
    while (i < L.length - 1 && L[i] < tgt) i++;
    const t = (tgt - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]);
    out.push(lerp(pts[i - 1], pts[i], clamp(t, 0, 1)));
  }
  return out;
}
function spline(ctrl, M) {
  if (ctrl.length === 2) return resample([ctrl[0], ctrl[1]], M);
  const n = ctrl.length;
  const Pp = [sub(mul(ctrl[0], 2), ctrl[1]), ...ctrl, sub(mul(ctrl[n - 1], 2), ctrl[n - 2])];
  const dense = [];
  const kn = (a, b, t) => t + Math.pow(len(sub(b, a)), 0.5) + 1e-6;
  for (let i = 1; i < Pp.length - 2; i++) {
    const p0 = Pp[i - 1], p1 = Pp[i], p2 = Pp[i + 1], p3 = Pp[i + 2];
    const t0 = 0, t1 = kn(p0, p1, t0), t2 = kn(p1, p2, t1), t3 = kn(p2, p3, t2);
    const steps = 16;
    for (let k = 0; k < steps; k++) {
      const t = t1 + (t2 - t1) * k / steps;
      const A1 = add(mul(p0, (t1 - t) / (t1 - t0)), mul(p1, (t - t0) / (t1 - t0)));
      const A2 = add(mul(p1, (t2 - t) / (t2 - t1)), mul(p2, (t - t1) / (t2 - t1)));
      const A3 = add(mul(p2, (t3 - t) / (t3 - t2)), mul(p3, (t - t2) / (t3 - t2)));
      const B1 = add(mul(A1, (t2 - t) / (t2 - t0)), mul(A2, (t - t0) / (t2 - t0)));
      const B2 = add(mul(A2, (t3 - t) / (t3 - t1)), mul(A3, (t - t1) / (t3 - t1)));
      dense.push(add(mul(B1, (t2 - t) / (t2 - t1)), mul(B2, (t - t1) / (t2 - t1))));
    }
  }
  dense.push(ctrl[n - 1]);
  return resample(dense, M);
}
// ---------------------------------------------------------------- skeleton (rig)
// [name, parent, pivot, weight segment a, b, axial?]
const BONE_DEFS = [
  ['pelvis', null, J.pelvis, [0, 0.80, -0.01], [0, 1.00, -0.02], true],
  ['spine1', 'pelvis', J.spine1, [0, 1.00, -0.02], [0, 1.14, -0.035], true],
  ['spine2', 'spine1', J.spine2, [0, 1.14, -0.035], [0, 1.28, -0.04], true],
  ['chest', 'spine2', J.chest, [0, 1.28, -0.04], [0, 1.45, -0.03], true],
  ['neck', 'chest', J.neck, [0, 1.45, -0.02], [0, 1.56, -0.01], true],
  ['head', 'neck', J.head, [0, 1.56, 0], [0, 1.80, 0], true],
  ['clavL', 'chest', J.clav, J.clav, J.acromion, false],
  ['upperArmL', 'clavL', J.shoulder, J.shoulder, J.elbow, false],
  ['foreArmL', 'upperArmL', J.elbow, J.elbow, J.wrist, false],
  ['handL', 'foreArmL', J.wrist, J.wrist, J.handEnd, false],
  ['thighL', 'pelvis', J.hip, J.hip, J.knee, false],
  ['shinL', 'thighL', J.knee, J.knee, J.ankle, false],
  ['footL', 'shinL', J.ankle, J.ankle, J.toe, false],
];
const BONES = (() => {
  const out = [];
  for (const d of BONE_DEFS) out.push({ name: d[0], parent: d[1], pivot: d[2], a: d[3], b: d[4], axial: d[5] });
  for (const d of BONE_DEFS) if (d[0].endsWith('L')) {
    const name = d[0].slice(0, -1) + 'R';
    const parent = d[1] && d[1].endsWith('L') ? d[1].slice(0, -1) + 'R' : d[1];
    out.push({ name, parent, pivot: mir(d[2]), a: mir(d[3]), b: mir(d[4]), axial: false });
  }
  out.forEach((b, i) => { b.index = i; });
  out.forEach((b) => { b.parentIndex = b.parent ? out.findIndex((o) => o.name === b.parent) : -1; });
  return out;
})();
const BONE_INDEX = Object.fromEntries(BONES.map((b) => [b.name, b.index]));
const AXIAL = new Set(['pelvis', 'spine1', 'spine2', 'chest', 'neck', 'head']);
const boneName = (n, side) => (AXIAL.has(n) ? n : n + (side === 'R' ? 'R' : 'L'));

function boneDist(p, b) {
  if (b.axial) {
    const y0 = Math.min(b.a[1], b.b[1]), y1 = Math.max(b.a[1], b.b[1]);
    const dy = Math.max(0, y0 - p[1], p[1] - y1);
    return dy + 0.35 * Math.hypot(p[0], p[2] - b.a[2]);
  }
  const ab = sub(b.b, b.a), t = clamp(dot(sub(p, b.a), ab) / dot(ab, ab), 0, 1);
  return len(sub(p, add(b.a, mul(ab, t))));
}
function skinWeights(p, boneIdx) {
  const ws = boneIdx.map((bi) => [bi, 1 / Math.pow(boneDist(p, BONES[bi]) + 0.004, 4)]);
  ws.sort((a, b) => b[1] - a[1]);
  const top = ws.slice(0, 4); let s = 0; top.forEach((w) => { s += w[1]; });
  const idx = [0, 0, 0, 0], w = [0, 0, 0, 0];
  top.forEach((t, i) => { idx[i] = t[0]; w[i] = t[1] / s; });
  return { idx, w };
}

// ---------------------------------------------------------------- muscle groups (16)
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const GROUPS = [
  { id: 'chest', color: '#D49696', name: 'Chest', local: 'Dada', region: 'upper', yaw: 0.0, pitch: 0.08,
    desc: 'Mendorong lengan ke depan dan merapatkannya ke tengah tubuh.', exercises: ['Bench press', 'Push-up', 'Dumbbell fly'] },
  { id: 'shoulders', color: '#B596D4', name: 'Shoulders', local: 'Bahu', region: 'upper', yaw: 0.75, pitch: 0.1,
    desc: 'Mengangkat lengan ke depan, samping, dan belakang.', exercises: ['Overhead press', 'Lateral raise', 'Face pull'] },
  { id: 'traps', color: '#96D4D4', name: 'Traps', local: 'Trapezius', region: 'upper', yaw: Math.PI, pitch: 0.18,
    desc: 'Mengangkat, menarik, dan menstabilkan tulang belikat.', exercises: ['Shrug', 'Upright row', 'Rack pull'] },
  { id: 'biceps', color: '#D1C399', name: 'Biceps', local: 'Lengan depan atas', region: 'upper', yaw: 0.35, pitch: 0.05,
    desc: 'Menekuk siku dan memutar telapak tangan ke atas.', exercises: ['Barbell curl', 'Hammer curl', 'Chin-up'] },
  { id: 'triceps', color: '#8A82C8', name: 'Triceps', local: 'Lengan belakang atas', region: 'upper', yaw: Math.PI - 0.4, pitch: 0.05,
    desc: 'Meluruskan siku; kepala panjang juga membantu menarik lengan ke belakang.', exercises: ['Dip', 'Skull crusher', 'Cable pushdown'] },
  { id: 'forearms', color: '#B5D199', name: 'Forearms', local: 'Lengan bawah', region: 'upper', yaw: 0.5, pitch: 0.0,
    desc: 'Menggenggam, menekuk, dan meluruskan pergelangan tangan.', exercises: ['Wrist curl', 'Farmer carry', 'Reverse curl'] },
  { id: 'lats', color: '#D496C5', name: 'Lats', local: 'Punggung samping', region: 'upper', yaw: Math.PI - 0.35, pitch: 0.08,
    desc: 'Menarik lengan ke bawah dan ke belakang, membentuk lebar punggung.', exercises: ['Pull-up', 'Lat pulldown', 'Barbell row'] },
  { id: 'midback', color: '#CA997D', name: 'Middle back', local: 'Punggung tengah', region: 'upper', yaw: Math.PI, pitch: 0.12,
    desc: 'Merapatkan tulang belikat dan memutar lengan ke luar.', exercises: ['Seated row', 'Reverse fly', 'External rotation'] },
  { id: 'abs', color: '#96D4A6', name: 'Abs', local: 'Perut', region: 'core', yaw: 0.0, pitch: 0.05,
    desc: 'Membungkukkan batang tubuh dan menahan tekanan perut.', exercises: ['Crunch', 'Hanging leg raise', 'Plank'] },
  { id: 'obliques', color: '#7DADCA', name: 'Obliques', local: 'Perut samping', region: 'core', yaw: 0.85, pitch: 0.05,
    desc: 'Memutar dan menekuk batang tubuh ke samping. Termasuk serratus anterior.', exercises: ['Russian twist', 'Side plank', 'Woodchopper'] },
  { id: 'lowback', color: '#BDC680', name: 'Lower back', local: 'Punggung bawah', region: 'core', yaw: Math.PI, pitch: 0.0,
    desc: 'Menegakkan tulang belakang dan menahan postur.', exercises: ['Deadlift', 'Back extension', 'Good morning'] },
  { id: 'glutes', color: '#CA7D99', name: 'Glutes', local: 'Bokong', region: 'lower', yaw: Math.PI - 0.5, pitch: -0.05,
    desc: 'Meluruskan dan membuka panggul. Termasuk gluteus medius dan TFL.', exercises: ['Hip thrust', 'Squat', 'Romanian deadlift'] },
  { id: 'quads', color: '#96A6D4', name: 'Quads', local: 'Paha depan', region: 'lower', yaw: 0.25, pitch: -0.05,
    desc: 'Meluruskan lutut; rectus femoris juga menekuk panggul.', exercises: ['Squat', 'Leg press', 'Lunge'] },
  { id: 'adductors', color: '#9CC48F', name: 'Adductors', local: 'Paha dalam', region: 'lower', yaw: 0.3, pitch: -0.1,
    desc: 'Merapatkan paha ke garis tengah tubuh.', exercises: ['Sumo squat', 'Copenhagen plank', 'Adductor machine'] },
  { id: 'hamstrings', color: '#BF85C8', name: 'Hamstrings', local: 'Paha belakang', region: 'lower', yaw: Math.PI, pitch: -0.05,
    desc: 'Menekuk lutut dan meluruskan panggul.', exercises: ['Romanian deadlift', 'Leg curl', 'Nordic curl'] },
  { id: 'calves', color: '#86C2AE', name: 'Calves', local: 'Betis & tungkai bawah', region: 'lower', yaw: Math.PI - 0.3, pitch: -0.15,
    desc: 'Menjinjitkan kaki; tibialis dan peroneus mengatur pergelangan kaki.', exercises: ['Standing calf raise', 'Seated calf raise', 'Tibialis raise'] },
];

// ---------------------------------------------------------------- muscle definitions (left side; mirrored)
// o/i: origin/insertion polyline (or point), v: via polylines, n: fascicles, h: belly thickness,
// t: [start tendon, end tendon] fraction (number or fn(u)), lift: offset above deep body (number or [[s,v]...]).
const MUSCLES = [
  // ---------------- chest
  { key: 'pec_clav', name: 'Pectoralis major', part: 'clavicular head', group: 'chest', n: 7, h: 0.017,
    o: [T(1.425, 6), T(1.44, 30), T(1.445, 50)], i: [U(0.17, 15), U(0.25, 24)],
    t: [0.03, 0.2], lift: 0.004, bridge: [0.72, 1], bones: ['chest', 'clav', 'upperArm'] },
  { key: 'pec_stern', name: 'Pectoralis major', part: 'sternocostal head', group: 'chest', n: 11, h: 0.025,
    o: [T(1.41, 4), T(1.33, 4), T(1.25, 5), T(1.205, 14), T(1.195, 32)],
    v: [[T(1.38, 40), T(1.32, 50), T(1.265, 56)]], i: [U(0.26, 18), U(0.13, 8)],
    t: [0.04, 0.17], lift: 0.004, bridge: [0.74, 1], across: (u) => 0.55 + 0.45 * Math.sin(Math.PI * (0.25 + 0.7 * u)),
    bones: ['spine2', 'chest', 'upperArm'] },
  // ---------------- shoulders
  { key: 'delt_ant', name: 'Deltoid', part: 'anterior', group: 'shoulders', n: 7, h: 0.024,
    o: [T(1.445, 54), P([0.165, 1.452, 0.022])], v: [[U(0.10, 8), U(0.08, 42)]], i: [U(0.42, 62), U(0.44, 76)],
    t: [0.03, 0.14], lift: 0.008, bones: ['clav', 'upperArm'] },
  { key: 'delt_lat', name: 'Deltoid', part: 'lateral', group: 'shoulders', n: 8, h: 0.029,
    o: [P([0.168, 1.455, 0.015]), P([0.178, 1.455, -0.035])], v: [[U(0.06, 52), U(0.06, 122)]], i: [U(0.43, 78), U(0.43, 96)],
    t: [0.03, 0.14], lift: 0.008, bones: ['clav', 'upperArm'] },
  { key: 'delt_post', name: 'Deltoid', part: 'posterior', group: 'shoulders', n: 7, h: 0.022,
    o: [P([0.165, 1.45, -0.045]), T(1.415, 134), T(1.40, 150)], v: [[U(0.10, 140), U(0.13, 178)]], i: [U(0.43, 98), U(0.45, 114)],
    t: [0.05, 0.14], lift: 0.008, bones: ['chest', 'clav', 'upperArm'] },
  // ---------------- traps
  { key: 'trap_up', name: 'Trapezius', part: 'descending (upper)', group: 'traps', n: 8, h: 0.016,
    o: [P([0.012, 1.60, -0.056]), P([0.0, 1.475, -0.068])], i: [P([0.12, 1.448, 0.02]), P([0.168, 1.456, -0.036])],
    t: [0.12, 0.06], lift: 0.004, bones: ['neck', 'chest', 'clav'] },
  { key: 'trap_mid', name: 'Trapezius', part: 'transverse (middle)', group: 'traps', n: 7, h: 0.012,
    o: [P([0, 1.47, -0.07]), T(1.36, 180)], i: [P([0.165, 1.452, -0.044]), T(1.405, 150)],
    t: [0.22, 0.06], lift: 0.010, bones: ['chest', 'clav'] },
  { key: 'trap_low', name: 'Trapezius', part: 'ascending (lower)', group: 'traps', n: 8, h: 0.010,
    o: [T(1.345, 180), T(1.165, 180)], i: [T(1.40, 150), T(1.385, 156)],
    t: [0.08, 0.18], lift: 0.010, bones: ['spine2', 'chest'] },
  // ---------------- middle back
  { key: 'rhomboid', name: 'Rhomboid major & minor', group: 'midback', n: 6, h: 0.010, deep: true,
    o: [T(1.45, 180), T(1.30, 180)], i: [T(1.405, 152), T(1.28, 147)], t: [0.06, 0.06], lift: 0.0, bones: ['chest'] },
  { key: 'infraspinatus', name: 'Infraspinatus', group: 'midback', n: 8, h: 0.018,
    o: [T(1.385, 150), T(1.31, 146), T(1.27, 141)], v: [[T(1.37, 128), T(1.32, 124)]], i: [U(0.05, 152), U(0.08, 136)],
    t: [0.05, 0.25], lift: 0.004, bones: ['chest', 'upperArm'] },
  { key: 'teres_minor', name: 'Teres minor', group: 'midback', n: 4, h: 0.014,
    o: [T(1.33, 125), T(1.30, 122)], i: [U(0.09, 162), U(0.10, 150)], t: [0.05, 0.2], lift: 0.004, bones: ['chest', 'upperArm'] },
  { key: 'teres_major', name: 'Teres major', group: 'midback', n: 5, h: 0.022,
    o: [T(1.275, 133), T(1.255, 124)], v: [[U(0.12, 186), U(0.14, 200)]], i: [U(0.16, 250), U(0.19, 262)],
    t: [0.04, 0.2], lift: 0.004, bridge: [0.6, 1], bones: ['chest', 'upperArm'] },
  // ---------------- lats
  { key: 'lats', name: 'Latissimus dorsi', group: 'lats', n: 13, h: 0.019, m: 38,
    o: [T(1.27, 179), T(1.20, 179), T(1.13, 176), T(1.07, 152), T(1.01, 140), T(0.99, 125)],
    v: [[T(1.28, 140), T(1.22, 128), T(1.15, 118), T(1.10, 110)], [P([0.164, 1.312, -0.052]), P([0.172, 1.29, -0.034])]],
    i: [U(0.18, 262), U(0.12, 250)],
    t: [(u) => 0.12 + 0.3 * u, 0.12], across: (u) => 0.35 + 0.65 * Math.sin(Math.PI * (0.15 + 0.6 * u)),
    lift: 0.003, bridge: [0.8, 1], bones: ['spine1', 'spine2', 'chest', 'upperArm'] },
  // ---------------- lower back
  { key: 'erector', name: 'Erector spinae', part: 'iliocostalis & longissimus', group: 'lowback', n: 6, h: 0.024, m: 36,
    o: [T(0.93, 178), T(0.955, 160)], i: [T(1.42, 176), T(1.30, 155)], t: [0.1, 0.58], lift: 0.0, pw: 0.45, peak: 0.45,
    bones: ['pelvis', 'spine1', 'spine2', 'chest'] },
  // ---------------- abs
  { key: 'rectus', name: 'Rectus abdominis', group: 'abs', n: 4, h: 0.019, m: 44,
    o: [T(0.875, 3), T(0.875, 11)], v: [[T(1.07, 2.5), T(1.07, 19)]], i: [T(1.255, 3), T(1.24, 26)],
    seg: [[0.02, 0.43], [0.448, 0.62], [0.638, 0.80], [0.818, 0.985]], tt: 0.008, lift: 0.004, pw: 0.3,
    across: (u) => 0.7 + 0.3 * Math.sin(Math.PI * u), bones: ['pelvis', 'spine1', 'spine2', 'chest'] },
  { key: 'linea_alba', name: 'Linea alba', group: 'abs', n: 1, w: 0.011, h: 0.003, center: true, tendon: true,
    o: [T(0.88, 0)], i: [T(1.25, 0)], lift: 0.004, bones: ['pelvis', 'spine1', 'spine2', 'chest'] },
  // ---------------- obliques
  { key: 'ext_oblique', name: 'External oblique', group: 'obliques', n: 13, h: 0.017, m: 34,
    o: [T(1.285, 58), T(1.24, 70), T(1.19, 84), T(1.13, 98), T(1.08, 112), T(1.04, 124)],
    i: [T(1.17, 24), T(1.06, 20), T(0.95, 17), T(0.885, 13), T(0.935, 38), T(0.985, 56), T(0.995, 92), T(1.0, 118)],
    t: [0.04, (u) => 0.06 + 0.3 * Math.pow(1 - u, 1.6)], lift: 0.002,
    across: (u) => 0.5 + 0.5 * Math.sin(Math.PI * (0.25 + 0.7 * u)), bones: ['pelvis', 'spine1', 'spine2', 'chest'] },
  { key: 'serratus', name: 'Serratus anterior', group: 'obliques', n: 6, h: 0.014, spread: 0.8, split: true,
    o: [T(1.33, 70), T(1.29, 72), T(1.25, 75), T(1.215, 80), T(1.185, 87)], i: [T(1.37, 118), T(1.30, 124)],
    t: [0.02, 0.1], lift: 0.0, pw: 0.5, bones: ['spine2', 'chest'] },
  // ---------------- biceps
  { key: 'biceps_long', name: 'Biceps brachii', part: 'long head', group: 'biceps', n: 4, h: 0.028,
    o: [U(0.02, 35), U(0.03, 42)], v: [[U(0.30, 18), U(0.30, 40)], [U(0.62, 5), U(0.62, 40)]], i: [F(0.10, 10), F(0.10, 18)],
    t: [0.22, 0.16], tw: 0.35, lift: 0.010, peak: 0.55, bones: ['clav', 'upperArm', 'foreArm'] },
  { key: 'biceps_short', name: 'Biceps brachii', part: 'short head', group: 'biceps', n: 4, h: 0.026,
    o: [P([0.128, 1.405, 0.065]), P([0.133, 1.40, 0.07])], v: [[U(0.30, -25), U(0.30, -2)], [U(0.62, -30), U(0.62, 2)]],
    i: [F(0.10, 2), F(0.10, 10)], t: [0.2, 0.16], tw: 0.35, lift: 0.010, peak: 0.55, bones: ['clav', 'upperArm', 'foreArm'] },
  { key: 'brachialis', ext: 1.5, name: 'Brachialis', group: 'biceps', n: 7, h: 0.016, deep: true,
    o: arc(U, 0.45, 75, -55), v: [arc(U, 0.75, 88, -78)], i: [F(0.12, 345), F(0.12, 15)],
    t: [0.05, 0.15], lift: 0.0, bones: ['upperArm', 'foreArm'] },
  // ---------------- triceps
  { key: 'tri_long', name: 'Triceps brachii', part: 'long head', group: 'triceps', n: 5, h: 0.026,
    o: [P([0.155, 1.37, -0.06]), P([0.16, 1.36, -0.06])], v: [arc(U, 0.40, 190, 235, 4)], i: [U(0.97, 175), U(0.97, 192)],
    t: [0.06, 0.42], tw: 1.1, lift: 0.004, bones: ['chest', 'upperArm', 'foreArm'] },
  { key: 'tri_lat', name: 'Triceps brachii', part: 'lateral head', group: 'triceps', n: 6, h: 0.026,
    o: [U(0.10, 135), U(0.35, 118)], v: [arc(U, 0.55, 120, 172, 4)], i: [U(0.96, 165), U(0.97, 179)],
    t: [0.04, 0.38], tw: 1.1, lift: 0.005, bones: ['upperArm', 'foreArm'] },
  { key: 'tri_med', name: 'Triceps brachii', part: 'medial head', group: 'triceps', n: 4, h: 0.016, deep: true,
    o: [U(0.45, 235), U(0.62, 255)], i: [U(0.97, 190), U(0.97, 200)], t: [0.04, 0.25], lift: 0.0, bones: ['upperArm', 'foreArm'] },
  // ---------------- forearms
  { key: 'brachiorad', ext: 1.5, name: 'Brachioradialis', group: 'forearms', n: 4, h: 0.024,
    o: [U(0.62, 92), U(0.80, 98)], v: [[F(0.22, 72), F(0.22, 95)]], i: [F(0.96, 78), F(0.96, 85)],
    t: [0.02, 0.48], tw: 0.4, lift: 0.006, peak: 0.4, bones: ['upperArm', 'foreArm'] },
  { key: 'ecr', ext: 1.5, name: 'Extensor carpi radialis', part: 'longus & brevis', group: 'forearms', n: 4, h: 0.018,
    o: [U(0.82, 105), U(0.92, 112)], v: [[F(0.3, 100), F(0.3, 125)]], i: [F(0.97, 105), F(0.97, 118)],
    t: [0.02, 0.5], tw: 0.4, lift: 0.002, peak: 0.42, bones: ['upperArm', 'foreArm', 'hand'] },
  { key: 'ext_dig', ext: 1.5, name: 'Extensor digitorum', group: 'forearms', n: 4, h: 0.015,
    o: [F(0.03, 135), F(0.04, 145)], v: [[F(0.4, 140), F(0.4, 165)]], i: [F(0.98, 150), F(0.98, 170)],
    t: [0.04, 0.48], tw: 0.6, lift: 0.002, bones: ['foreArm', 'hand'] },
  { key: 'ecu', ext: 1.5, name: 'Extensor carpi ulnaris', group: 'forearms', n: 3, h: 0.014,
    o: [F(0.04, 165), F(0.05, 175)], v: [[F(0.45, 180), F(0.45, 200)]], i: [F(0.97, 195), F(0.97, 205)],
    t: [0.04, 0.4], tw: 0.4, lift: 0.002, bones: ['foreArm', 'hand'] },
  { key: 'fcu', ext: 1.5, name: 'Flexor carpi ulnaris', group: 'forearms', n: 3, h: 0.016,
    o: [U(0.97, 262), F(0.06, 215)], v: [[F(0.4, 222), F(0.4, 276)]], i: [F(0.97, 262), F(0.97, 272)],
    t: [0.03, 0.35], tw: 0.4, lift: 0.002, bones: ['upperArm', 'foreArm', 'hand'] },
  { key: 'pronator', ext: 1.5, name: 'Pronator teres', group: 'forearms', n: 3, h: 0.016, deep: true,
    o: [U(0.94, 272), U(0.98, 282)], i: [F(0.45, 70), F(0.48, 80)], t: [0.05, 0.25], lift: 0.0, bones: ['upperArm', 'foreArm'] },
  { key: 'fcr', ext: 1.5, name: 'Flexor carpi radialis', group: 'forearms', n: 3, h: 0.016,
    o: [U(0.97, 288), F(0.03, 300)], v: [[F(0.35, 318), F(0.35, 352)]], i: [F(0.97, 20), F(0.97, 28)],
    t: [0.02, 0.48], tw: 0.4, lift: 0.003, bones: ['upperArm', 'foreArm', 'hand'] },
  { key: 'palmaris', ext: 1.5, name: 'Palmaris longus', group: 'forearms', n: 2, h: 0.011,
    o: [F(0.03, 300), F(0.04, 310)], v: [[F(0.3, 340), F(0.3, 2)]], i: [F(0.98, 358), F(0.98, 4)],
    t: [0.02, 0.55], tw: 0.35, lift: 0.005, bones: ['foreArm', 'hand'] },
  { key: 'fds', ext: 1.5, name: 'Flexor digitorum superficialis', group: 'forearms', n: 4, h: 0.012, deep: true,
    o: [F(0.05, 280), F(0.22, 330)], v: [[F(0.5, 290), F(0.5, 350)]], i: [F(0.95, 312), F(0.95, 356)], t: [0.02, 0.4], lift: 0.0, bones: ['foreArm', 'hand'] },
  // ---------------- glutes
  { key: 'glute_max', name: 'Gluteus maximus', group: 'glutes', n: 13, h: 0.028, m: 34,
    o: [T(1.01, 140), T(0.97, 160), T(0.92, 174), T(0.86, 179)],
    v: [[T(0.955, 128), P([0.122, 0.89, -0.076]), P([0.10, 0.835, -0.086])]],
    i: [H(0.08, 95), H(0.14, 110), H(0.25, 140)],
    t: [0.06, (u) => 0.3 - 0.15 * u], lift: 0.006, across: (u) => 0.5 + 0.5 * Math.sin(Math.PI * u), bones: ['pelvis', 'thigh'] },
  { key: 'glute_med', name: 'Gluteus medius', group: 'glutes', n: 9, h: 0.024,
    o: arcT(1.005, 62, 140, 6), i: [H(0.04, 95), H(0.06, 115)], t: [0.08, 0.14], lift: 0.0, bones: ['pelvis', 'thigh'] },
  { key: 'tfl', name: 'Tensor fasciae latae', group: 'glutes', n: 3, h: 0.020,
    o: [T(0.99, 52), T(0.995, 62)], i: [H(0.22, 78), H(0.24, 86)], t: [0.06, 0.15], lift: 0.004, bones: ['pelvis', 'thigh'] },
  // ---------------- quads
  { key: 'rect_fem', name: 'Rectus femoris', group: 'quads', n: 6, h: 0.030, m: 36,
    o: [P([0.10, 0.965, 0.065]), P([0.105, 0.965, 0.07])], v: [[H(0.2, -8), H(0.2, 30)], [H(0.55, -16), H(0.55, 32)]],
    i: [H(0.90, 0), H(0.90, 16)], t: [0.12, 0.18], tw: 0.6, lift: 0.008, bones: ['pelvis', 'thigh', 'shin'] },
  { key: 'vast_lat', name: 'Vastus lateralis', group: 'quads', n: 10, h: 0.032, m: 36,
    o: [H(0.06, 100), H(0.20, 135), H(0.50, 152)], v: [arc(H, 0.35, 22, 150, 6)], i: [H(0.88, 16), H(0.92, 50), H(0.96, 86)],
    t: [0.06, 0.2], lift: 0.002, bones: ['thigh', 'shin'] },
  { key: 'vast_med', name: 'Vastus medialis', group: 'quads', n: 10, h: 0.034,
    o: [H(0.12, 312), H(0.4, 292), H(0.62, 278), H(0.82, 264)], i: [H(0.62, 6), H(0.84, 356), H(0.94, 326), H(0.99, 300)],
    t: [0.05, (u) => 0.22 - 0.12 * u], lift: 0.002, peak: 0.66, across: (u) => 0.45 + 0.55 * Math.pow(Math.sin(Math.PI * (0.2 + 0.8 * u)), 0.8), m: 34, bones: ['thigh', 'shin'] },
  { key: 'sartorius', name: 'Sartorius', group: 'quads', n: 1, w: 0.024, h: 0.009, m: 44,
    o: [P([0.118, 0.995, 0.07]), P([0.122, 0.99, 0.068])],
    v: [[H(0.30, 345), H(0.30, 350)], [H(0.62, 295), H(0.62, 300)], [H(0.95, 265), H(0.95, 270)]], i: [S(0.10, 282), S(0.10, 288)],
    t: [0.03, 0.15], spread: 1.0, lift: [[0, 0.006], [0.5, 0.02], [0.8, 0.034], [1, 0.01]], bones: ['pelvis', 'thigh', 'shin'] },
  // ---------------- adductors
  { key: 'add_long', name: 'Adductor longus', group: 'adductors', n: 5, h: 0.024,
    o: [P([0.026, 0.862, 0.062]), P([0.046, 0.858, 0.06])], v: [[H(0.18, 322), H(0.18, 296)]], i: [H(0.45, 255), H(0.55, 260)],
    t: [0.03, 0.1], lift: 0.002, bones: ['pelvis', 'thigh'] },
  { key: 'pectineus', name: 'Pectineus', group: 'adductors', n: 4, h: 0.016, deep: true,
    o: [P([0.045, 0.874, 0.062]), P([0.075, 0.888, 0.058])], i: [H(0.17, 318), H(0.21, 326)], t: [0.03, 0.1], lift: 0.0, bones: ['pelvis', 'thigh'] },
  { key: 'gracilis', name: 'Gracilis', group: 'adductors', n: 2, h: 0.014, m: 36,
    o: [P([0.018, 0.848, 0.045]), P([0.024, 0.842, 0.03])], v: [[H(0.4, 275), H(0.4, 280)], [H(0.85, 258), H(0.85, 262)]],
    i: [S(0.12, 272), S(0.12, 278)], t: [0.04, 0.25], lift: 0.010, bones: ['pelvis', 'thigh', 'shin'] },
  { key: 'add_magnus', name: 'Adductor magnus', group: 'adductors', n: 7, h: 0.026, deep: true,
    o: [P([0.04, 0.86, 0.0]), P([0.06, 0.845, -0.05])], i: [H(0.45, 235), H(0.80, 248), H(0.88, 262)],
    t: [0.06, 0.15], lift: 0.0, bones: ['pelvis', 'thigh'] },
  // ---------------- hamstrings
  { key: 'bf_long', name: 'Biceps femoris', part: 'long head', group: 'hamstrings', n: 5, h: 0.026, m: 36,
    o: [P([0.065, 0.865, -0.075]), P([0.07, 0.86, -0.07])], v: [[H(0.4, 150), H(0.4, 198)], [H(0.7, 134), H(0.7, 176)]],
    i: [S(0.06, 125), S(0.06, 135)], t: [0.12, 0.2], tw: 0.5, lift: 0.006, bones: ['pelvis', 'thigh', 'shin'] },
  { key: 'bf_short', name: 'Biceps femoris', part: 'short head', group: 'hamstrings', n: 3, h: 0.016, deep: true,
    o: [H(0.45, 140), H(0.65, 150)], i: [S(0.05, 130), S(0.06, 140)], t: [0.04, 0.2], lift: 0.0, bones: ['thigh', 'shin'] },
  { key: 'semitend', name: 'Semitendinosus', group: 'hamstrings', n: 3, h: 0.022, m: 40,
    o: [P([0.055, 0.865, -0.08]), P([0.06, 0.86, -0.08])],
    v: [[H(0.35, 196), H(0.35, 228)], [H(0.65, 206), H(0.65, 230)], [H(0.95, 230), H(0.95, 236)]], i: [S(0.13, 272), S(0.13, 278)],
    t: [0.08, 0.42], tw: 0.4, lift: 0.008, peak: 0.4, bones: ['pelvis', 'thigh', 'shin'] },
  { key: 'semimem', name: 'Semimembranosus', group: 'hamstrings', n: 6, h: 0.024,
    o: [P([0.06, 0.855, -0.065]), P([0.065, 0.85, -0.065])], v: [[H(0.5, 198), H(0.5, 250)]], i: [S(0.04, 232), S(0.05, 245)],
    t: [0.4, 0.1], lift: 0.002, peak: 0.6, bones: ['pelvis', 'thigh', 'shin'] },
  // ---------------- calves & lower leg
  { key: 'gastro_med', ext: 1.5, name: 'Gastrocnemius', part: 'medial head', group: 'calves', n: 5, h: 0.032, m: 40,
    o: [H(0.95, 202), H(0.96, 218)], v: [[S(0.18, 188), S(0.18, 252)], [S(0.40, 184), S(0.40, 236)]],
    i: [P([0.12, 0.035, -0.082]), P([0.124, 0.035, -0.082])], t: [0.04, 0.55], tw: 0.35, lift: 0.010, peak: 0.4,
    bones: ['thigh', 'shin', 'foot'] },
  { key: 'gastro_lat', ext: 1.5, name: 'Gastrocnemius', part: 'lateral head', group: 'calves', n: 4, h: 0.028, m: 40,
    o: [H(0.95, 142), H(0.96, 158)], v: [[S(0.18, 126), S(0.18, 182)], [S(0.36, 136), S(0.36, 184)]],
    i: [P([0.124, 0.035, -0.082]), P([0.128, 0.035, -0.08])], t: [0.04, 0.6], tw: 0.35, lift: 0.010, peak: 0.38,
    bones: ['thigh', 'shin', 'foot'] },
  { key: 'soleus', ext: 1.5, name: 'Soleus', group: 'calves', n: 8, h: 0.022, m: 36,
    o: arc(S, 0.12, 120, 245, 5), v: [arc(S, 0.5, 105, 255, 5)], i: [P([0.118, 0.04, -0.078]), P([0.128, 0.04, -0.078])],
    t: [0.04, 0.35], tw: 0.4, lift: 0.0, peak: 0.55, bones: ['shin', 'foot'] },
  { key: 'tib_ant', ext: 1.5, name: 'Tibialis anterior', group: 'calves', n: 6, h: 0.028, m: 36,
    o: [S(0.05, 8), S(0.10, 66)], v: [[S(0.42, 0), S(0.42, 60)], [S(0.92, 6), S(0.92, 18)]],
    i: [P([0.10, 0.04, 0.045]), P([0.103, 0.04, 0.05])], t: [0.03, 0.42], tw: 0.4, lift: 0.002, bones: ['shin', 'foot'] },
  { key: 'ext_dig_long', ext: 1.5, name: 'Extensor digitorum longus', group: 'calves', n: 3, h: 0.014, m: 36,
    o: [S(0.06, 62), S(0.10, 80)], v: [[S(0.5, 58), S(0.5, 80)], [S(0.93, 30), S(0.93, 40)]],
    i: [P([0.135, 0.03, 0.08]), P([0.14, 0.028, 0.085])], t: [0.03, 0.42], tw: 0.5, lift: 0.002, bones: ['shin', 'foot'] },
  { key: 'peroneus', ext: 1.5, name: 'Fibularis longus', group: 'calves', n: 3, h: 0.018, m: 36,
    o: [S(0.05, 100), S(0.08, 125)], v: [[S(0.5, 92), S(0.5, 128)], [S(0.93, 130), S(0.93, 140)]],
    i: [P([0.145, 0.035, -0.035]), P([0.146, 0.03, -0.02])], t: [0.03, 0.45], tw: 0.4, lift: 0.002, bones: ['shin', 'foot'] },
  // ---------------- context (not part of the 16 groups)
  { key: 'scm', name: 'Sternocleidomastoid', group: null, n: 4, h: 0.017,
    o: [P([0.014, 1.43, 0.072]), P([0.04, 1.432, 0.068])], i: [P([0.06, 1.585, -0.025]), P([0.062, 1.595, -0.03])],
    t: [0.06, 0.06], lift: 0.002, bones: ['chest', 'neck', 'head'] },
  { key: 'splenius', name: 'Splenius capitis', group: null, n: 4, h: 0.012, deep: true,
    o: [P([0.0, 1.56, -0.055]), P([0.0, 1.46, -0.07])], i: [P([0.06, 1.60, -0.035]), P([0.045, 1.625, -0.06])],
    t: [0.06, 0.08], lift: 0.0, bones: ['chest', 'neck', 'head'] },
  { key: 'levator', name: 'Levator scapulae', group: null, n: 3, h: 0.012, deep: true,
    o: [P([0.035, 1.58, -0.012]), P([0.04, 1.55, -0.016])], i: [P([0.088, 1.445, -0.074]), P([0.082, 1.437, -0.08])],
    t: [0.12, 0.08], lift: 0.0, bones: ['chest', 'neck'] },
  { key: 'scalenes', name: 'Scalenes', group: null, n: 3, h: 0.010, deep: true,
    o: [P([0.034, 1.57, 0.0]), P([0.038, 1.53, 0.004])], i: [P([0.06, 1.455, 0.03]), P([0.078, 1.45, 0.02])],
    t: [0.1, 0.08], lift: 0.0, bones: ['chest', 'neck'] },
  { key: 'infrahyoid', name: 'Sternohyoid & omohyoid', group: null, n: 2, h: 0.006,
    o: [P([0.006, 1.428, 0.072]), P([0.02, 1.428, 0.07])], i: [P([0.006, 1.548, 0.046]), P([0.02, 1.548, 0.043])],
    t: [0.05, 0.08], lift: 0.0, spread: 1.6, bones: ['chest', 'neck'] },
  { key: 'it_band', name: 'Iliotibial tract', group: null, n: 1, w: 0.034, h: 0.004, tendon: true, m: 36,
    o: [H(0.12, 92)], v: [[H(0.5, 92)]], i: [S(0.06, 62)], lift: [[0, 0.02], [0.5, 0.03], [0.9, 0.014], [1, 0.004]], bones: ['thigh', 'shin'] },
  { key: 'tibia', name: 'Tibia (medial surface)', group: null, n: 1, w: 0.03, h: 0.005, bone: true, m: 30,
    o: [S(0.12, 330)], v: [[S(0.5, 332)]], i: [S(0.88, 340)], lift: 0.0, bones: ['shin'] },
  { key: 'patellar_lig', name: 'Patellar ligament', group: null, n: 1, w: 0.016, h: 0.004, tendon: true,
    o: [H(0.99, 4)], i: [S(0.12, 4)], lift: 0.006, bones: ['thigh', 'shin'] },
];
// ---------------------------------------------------------------- mesh accumulation
const COL = {
  muscle: [0.80, 0.78, 0.75], deep: [0.56, 0.52, 0.50], tendon: [0.94, 0.92, 0.88], plaster: [0.90, 0.885, 0.86], bone: [0.92, 0.89, 0.83],
};
class MeshBuf {
  constructor() { this.pos = []; this.nor = null; this.col = []; this.misc = []; this.si = []; this.sw = []; this.idx = []; }
  get count() { return this.pos.length / 3; }
  vert(p, c, alpha, u, v, ao, skin) {
    this.pos.push(p[0], p[1], p[2]);
    this.col.push(Math.round(clamp(c[0], 0, 1) * 255), Math.round(clamp(c[1], 0, 1) * 255), Math.round(clamp(c[2], 0, 1) * 255), Math.round(alpha * 255));
    this.misc.push(u, v, ao);
    this.si.push(skin.idx[0], skin.idx[1], skin.idx[2], skin.idx[3]);
    this.sw.push(Math.round(skin.w[0] * 255), Math.round(skin.w[1] * 255), Math.round(skin.w[2] * 255), Math.round(skin.w[3] * 255));
    return this.count - 1;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  computeNormals() {
    const p = this.pos, n = new Float32Array(p.length), I = this.idx;
    for (let k = 0; k < I.length; k += 3) {
      const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      const e1x = p[b] - p[a], e1y = p[b + 1] - p[a + 1], e1z = p[b + 2] - p[a + 2];
      const e2x = p[c] - p[a], e2y = p[c + 1] - p[a + 1], e2z = p[c + 2] - p[a + 2];
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      for (const v of [a, b, c]) { n[v] += nx; n[v + 1] += ny; n[v + 2] += nz; }
    }
    for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
    this.nor = n;
  }
}
// grid of rings (rows x cols+1) with optional end caps
function gridTris(m, base, rows, cols, flip) {
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols; i++) {
    const a = base + j * (cols + 1) + i, b = a + cols + 1, c = a + 1, d = b + 1;
    if (flip) { m.tri(a, c, b); m.tri(c, d, b); } else { m.tri(a, b, c); m.tri(c, b, d); }
  }
}
function capFan(m, center, ringStart, cols, flip) {
  for (let i = 0; i < cols; i++) { const a = ringStart + i, b = a + 1; if (flip) m.tri(center, b, a); else m.tri(center, a, b); }
}

// ---------------------------------------------------------------- muscle builder
// Each muscle is one smooth closed "pillow" surface lofted over its fibre guide lines:
// thickness follows the belly profile along the fibres and tapers to zero at the muscle's edges.
function buildMuscle(def, side, rnd, color) {
  const mirror = side === 'R';
  const N = def.n, M = def.m || 40;
  const boneIdx = (def.bones || ['chest']).map((b) => BONE_INDEX[boneName(b, side)]);
  const liftAt = (s) => (typeof def.lift === 'number' ? def.lift : def.lift ? interpRaw(def.lift, s, 1) : 0.002);
  const tfn = (k, u) => { const t = def.t ? def.t[k] : (k ? 0.1 : 0.05); return typeof t === 'function' ? t(u) : t; };
  const peak = def.peak || 0.5, ae = Math.log(0.5) / Math.log(peak), pw = def.pw || 0.55;
  const h = def.h, tTh = def.tth || 0.0022, spread = def.spread || 1.35, tw = def.tw || 1;
  const across = def.across || ((u) => 0.65 + 0.35 * Math.sin(Math.PI * u));
  const bridge = def.bridge || [2, 3];
  const isBridge = (s) => s >= bridge[0] && s <= bridge[1];

  // 1) fibre guide lines projected onto the deep body
  const lines = [];
  for (let k = 0; k < N; k++) {
    const u = N === 1 ? 0.5 : (k + 0.5) / N;
    let ctrl = [polyAt(def.o, u), ...(def.v || []).map((v) => polyAt(v, u)), polyAt(def.i, u)];
    if (mirror) ctrl = ctrl.map(mir);
    let pts = spline(ctrl, M);
    for (let pass = 0; pass < 3; pass++) {
      pts = pts.map((p, j) => { const s = j / (M - 1); return projectTo(p, liftAt(s), isBridge(s)); });
      if (pass < 2) pts = pts.map((p, j) => (j === 0 || j === M - 1 ? p : add(mul(p, 0.5), mul(add(pts[j - 1], pts[j + 1]), 0.25))));
    }
    lines.push(pts);
  }

  // belly / tendon profile at (u across, s along)
  const segsFor = (u) => (def.tendon || def.bone ? [] : def.seg || [[tfn(0, u), 1 - tfn(1, u)]]);
  function profile(u, s) {
    let bell = 0, tend = 1;
    for (const sg of segsFor(u)) {
      if (s >= sg[0] && s <= sg[1]) {
        const q = (s - sg[0]) / (sg[1] - sg[0]);
        bell = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(q, ae))), pw);
        tend = 1 - smoothstep(0, def.tt || 0.05, Math.min(s - sg[0], sg[1] - s));
      }
    }
    if (def.tendon) tend = 1;
    return { bell, tend };
  }

  // 2) strips: one smooth surface for the whole muscle, or one per fascicle when def.split
  const m = new MeshBuf();
  let anchor = null;
  const strips = def.split ? lines.map((l) => [l]) : [lines];
  const tendonTint = color ? lerp(color, COL.tendon, 0.62) : COL.tendon;
  for (const L of strips) {
    const n = L.length;
    const W = n === 1 ? 8 : clamp(n + 5, 9, 18); // columns across the width
    // column positions: Catmull-Rom across the guide lines, extended half a spacing past the outer lines
    const Lk = (k, j) => {
      const cap = (d) => { const l = len(d); return l > 0.025 ? mul(d, 0.025 / l) : d; };
      if (k < 0) return add(L[0][j], mul(cap(sub(L[0][j], L[1][j])), -k));
      if (k > n - 1) return add(L[n - 1][j], mul(cap(sub(L[n - 1][j], L[n - 2][j])), k - n + 1));
      return L[k][j];
    };
    const centreAt = (j) => {
      // centre column point & tangent frame for single-line strips
      const p = L[n >> 1][j];
      const tg = norm(sub(L[n >> 1][Math.min(j + 1, M - 1)], L[n >> 1][Math.max(j - 1, 0)]));
      const nn = sdfGrad(p), nrm = norm(sub(nn, mul(tg, dot(nn, tg))));
      return { p, b: norm(cross(nrm, tg)) };
    };
    const grid = []; // grid[j][c] = { p (base point), u, s }
    for (let j = 0; j < M; j++) {
      const s = j / (M - 1);
      const cp = profile(0.5, s);
      const wf = def.tendon || def.bone ? 1 : tw + (1 - tw) * (1 - cp.tend);
      const row = [];
      let fr = null;
      if (n === 1) fr = centreAt(j);
      for (let c = 0; c <= W; c++) {
        const v = c / W, vv = 0.5 + (v - 0.5) * wf;
        let p;
        if (n === 1) {
          let w = def.w;
          if (!w) { // split strip: width from neighbouring guide lines
            const k = lines.indexOf(L[0]);
            const dA = k > 0 ? len(sub(L[0][j], lines[k - 1][j])) : null, dB = k < N - 1 ? len(sub(L[0][j], lines[k + 1][j])) : null;
            w = (dA != null && dB != null ? 0.5 * (dA + dB) : dA != null ? dA : dB || 0.02) * spread;
          }
          if (def.bone) w *= 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * clamp(s * 1.1 - 0.05, 0, 1)), 0.3);
          p = add(fr.p, mul(fr.b, (vv - 0.5) * w));
        } else {
          const ext = def.ext || 0.85, x = -ext + vv * (n - 1 + 2 * ext), i = Math.floor(x), t = x - i;
          const p0 = Lk(i - 1, j), p1 = Lk(i, j), p2 = Lk(i + 1, j), p3 = Lk(i + 2, j);
          const t2 = t * t, t3 = t2 * t;
          p = [0, 1, 2].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3));
        }
        {
          for (let it = 0; it < 3; it++) {
            const d = sdf(p), tg = liftAt(s);
            if (isBridge(s) && d >= tg) break;
            p = sub(p, mul(sdfGrad(p), d - tg));
          }
        }
        row.push({ p, u: def.split ? (lines.indexOf(L[0]) + 0.5) / N : v, s });
      }
      grid.push(row);
    }
    // 3) vertices: closed ring per row = top (c = 0..W) then bottom (c = W-1..1)
    const ringN = 2 * W, start = m.count;
    let arclen = 0;
    for (let j = 0; j < M; j++) {
      const row = grid[j], s = j / (M - 1);
      if (j > 0) arclen += len(sub(row[W >> 1].p, grid[j - 1][W >> 1].p));
      const tops = [], bots = [];
      for (let c = 0; c <= W; c++) {
        const g = row[c], v = c / W;
        const nn = sdfGrad(g.p);
        const tgs = norm(sub(grid[Math.min(j + 1, M - 1)][c].p, grid[Math.max(j - 1, 0)][c].p));
        const nrm = norm(sub(nn, mul(tgs, dot(nn, tgs))));
        const { bell, tend } = profile(g.u, s);
        const edge = Math.pow(Math.max(0, Math.sin(Math.PI * v)), def.tendon || def.bone ? 0.25 : 0.42);
        const acr = n === 1 ? 1 : across(g.u);
        let th;
        if (def.bone) th = h * (0.4 + 0.6 * Math.pow(Math.sin(Math.PI * clamp(s * 1.1 - 0.05, 0, 1)), 0.4));
        else if (def.tendon) th = h;
        else th = tTh + (h * acr - tTh) * bell;
        th *= edge;
        const ao = sdfAO(g.p, nrm);
        const groove = 0.7 + 0.3 * Math.pow(Math.max(0, Math.sin(Math.PI * v)), 0.6);
        const skin = skinWeights(g.p, boneIdx);
        const base = def.bone ? COL.bone : color || COL.muscle;
        const colr = def.bone ? COL.bone : lerp(base, tendonTint, tend);
        const alpha = def.bone ? 1 : tend * 0.95;
        tops.push({ p: add(g.p, mul(nrm, th)), colr, alpha, v, ao: ao * groove, skin });
        bots.push({ p: add(g.p, mul(nrm, Math.min(th, 0.0004))), colr, alpha, v, ao: ao * 0.45, skin });
        if (!anchor && c === (W >> 1) && !def.split && bell > 0.98) anchor = { p: add(g.p, mul(nrm, th)), n: nrm, skin };
      }
      for (let c = 0; c <= W; c++) { const t = tops[c]; m.vert(t.p, t.colr, t.alpha, t.v, arclen, t.ao, t.skin); }
      for (let c = W - 1; c >= 1; c--) { const b = bots[c]; m.vert(b.p, b.colr, b.alpha, b.v, arclen, b.ao, b.skin); }
    }
    if (!anchor) {
      const j = M >> 1, c = W >> 1; const idx = start + j * ringN + c;
      anchor = { p: m.pos.slice(idx * 3, idx * 3 + 3), n: sdfGrad(grid[j][c].p), skin: skinWeights(grid[j][c].p, boneIdx) };
    }
    // orientation: top-centre face normal must point away from the body
    const jm = M >> 1, c0 = W >> 1;
    const ia = start + jm * ringN + c0, ib = ia + ringN, ic = ia + 1;
    const P3 = (i) => m.pos.slice(i * 3, i * 3 + 3);
    const flip = dot(cross(sub(P3(ib), P3(ia)), sub(P3(ic), P3(ia))), sdfGrad(grid[jm][c0].p)) < 0;
    for (let j = 0; j < M - 1; j++) for (let c = 0; c < ringN; c++) {
      const a = start + j * ringN + c, b = a + ringN, cc = start + j * ringN + ((c + 1) % ringN), d = cc + ringN;
      if (flip) { m.tri(a, cc, b); m.tri(cc, d, b); } else { m.tri(a, b, cc); m.tri(cc, b, d); }
    }
    // end caps
    for (const [j, f] of [[0, !flip], [M - 1, flip]]) {
      const ring = start + j * ringN;
      let cx = 0, cy = 0, cz = 0;
      for (let c = 0; c < ringN; c++) { cx += m.pos[(ring + c) * 3]; cy += m.pos[(ring + c) * 3 + 1]; cz += m.pos[(ring + c) * 3 + 2]; }
      const ci = m.vert([cx / ringN, cy / ringN, cz / ringN], [m.col[ring * 4] / 255, m.col[ring * 4 + 1] / 255, m.col[ring * 4 + 2] / 255], m.col[ring * 4 + 3] / 255, 0.5, m.misc[ring * 3 + 1], m.misc[ring * 3 + 2],
        { idx: m.si.slice(ring * 4, ring * 4 + 4), w: m.sw.slice(ring * 4, ring * 4 + 4).map((x) => x / 255) });
      for (let c = 0; c < ringN; c++) { const a = ring + c, b = ring + ((c + 1) % ringN); if (f) m.tri(ci, b, a); else m.tri(ci, a, b); }
    }
  }
  m.computeNormals();
  return { mesh: m, anchor };
}

// ---------------------------------------------------------------- deep body & plaster parts
function rigid(bi) { return { idx: [bi, 0, 0, 0], w: [1, 0, 0, 0] }; }
function ringsMesh(m, rings, col, alpha, skinFn, uvScale = 1, aoFn = null, caps = true) {
  // rings: array of {pts:[...cols], v}
  const rows = rings.length, cols = rings[0].pts.length - 1, start = m.count;
  rings.forEach((r) => r.pts.forEach((p, i) => {
    const ao = aoFn ? aoFn(p) : 1;
    m.vert(p, col, alpha, (i / cols) * uvScale, r.v, ao, skinFn(p));
  }));
  // orientation: compare first face normal with outward direction from ring centre
  const ctr = (r) => mul(r.pts.slice(0, cols).reduce((a, p) => add(a, p), [0, 0, 0]), 1 / cols);
  const jm = rows >> 1, a = rings[jm].pts[0], b = rings[jm + 1].pts[0], c = rings[jm].pts[1];
  const flip = dot(cross(sub(b, a), sub(c, a)), sub(a, ctr(rings[jm]))) < 0;
  gridTris(m, start, rows, cols, flip);
  if (caps) {
    for (const [j, f] of [[0, !flip], [rows - 1, flip]]) {
      const cp = ctr(rings[j]);
      const ci = m.vert(cp, col, alpha, 0.5, rings[j].v, aoFn ? aoFn(cp) : 1, skinFn(cp));
      capFan(m, ci, start + j * (cols + 1), cols, f);
    }
  }
}
function ellipsoidMesh(m, c, axes, radii, col, alpha, skin, segs = 28, rows = 18) {
  const rings = [];
  for (let j = 1; j < rows; j++) {
    const th = Math.PI * j / rows, pts = [];
    for (let i = 0; i <= segs; i++) {
      const ph = 2 * Math.PI * i / segs;
      const x = Math.sin(th) * Math.cos(ph) * radii[0], y = -Math.cos(th) * radii[1], z = Math.sin(th) * Math.sin(ph) * radii[2];
      pts.push(add(c, add(add(mul(axes[0], x), mul(axes[1], y)), mul(axes[2], z))));
    }
    rings.push({ pts, v: j / rows });
  }
  ringsMesh(m, rings, col, alpha, () => skin, 1, null, true);
}
const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function capsuleMesh(m, a, b, r, col, alpha, skin, segs = 16) {
  const ax = norm(sub(b, a)), L = len(sub(b, a));
  let f = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  f = norm(sub(f, mul(ax, dot(f, ax)))); const l = cross(f, ax);
  const rings = [], hs = 6;
  const prof = [];
  for (let k = 1; k <= hs; k++) { const t = Math.PI / 2 * (1 - k / hs); prof.push([-Math.sin(t) * r, Math.cos(t) * r]); }
  for (let k = 0; k <= 4; k++) prof.push([L * k / 4, r]);
  for (let k = 1; k < hs; k++) { const t = Math.PI / 2 * k / hs; prof.push([L + Math.sin(t) * r, Math.cos(t) * r]); }
  prof.forEach(([d, rr], j) => {
    const pts = [];
    for (let i = 0; i <= segs; i++) { const ph = 2 * Math.PI * i / segs; pts.push(add(add(a, mul(ax, d)), add(mul(l, Math.cos(ph) * rr), mul(f, Math.sin(ph) * rr)))); }
    rings.push({ pts, v: j });
  });
  ringsMesh(m, rings, col, alpha, () => skin, 1, null, true);
}

function buildDeepBody(m) {
  const torsoBones = ['pelvis', 'spine1', 'spine2', 'chest', 'neck'].map((n) => BONE_INDEX[n]);
  // torso
  const rings = [];
  for (let y = TORSO.x0; y <= TORSO.x1 + 1e-6; y += 0.0125) {
    const rx = TORSO.get(y, 0), rz = TORSO.get(y, 1), cz = TORSO.get(y, 2), pts = [];
    for (let i = 0; i <= 48; i++) { const th = 2 * Math.PI * i / 48; pts.push([rx * Math.sin(th), y, cz + rz * Math.cos(th)]); }
    rings.push({ pts, v: y * 3 });
  }
  ringsMesh(m, rings, COL.deep, 0, (p) => skinWeights(p, torsoBones), 6, (p) => 0.75, true);
  // neck
  limbMesh(m, SEG.neck, BONE_INDEX.neck, [BONE_INDEX.chest, BONE_INDEX.neck, BONE_INDEX.head]);
  for (const side of ['L', 'R']) {
    const mm = side === 'L' ? (p) => p : mir;
    const ms = (s, prof) => (side === 'L' ? s : makeSeg(mir(s.a), mir(s.b), prof));
    const B = (n) => BONE_INDEX[n + side];
    limbMesh(m, ms(SEG.upper, PROF.upper), null, [B('clav'), B('upperArm'), B('foreArm')]);
    limbMesh(m, ms(SEG.fore, PROF.fore), null, [B('upperArm'), B('foreArm'), B('hand')], 'forearms');
    limbMesh(m, ms(SEG.thigh, PROF.thigh), null, [BONE_INDEX.pelvis, B('thigh'), B('shin')]);
    limbMesh(m, ms(SEG.shin, PROF.shin), null, [B('thigh'), B('shin'), B('foot')], 'calves');
    ellipsoidMesh(m, mm([0.178, 1.405, -0.018]), AX, [0.042, 0.042, 0.042], COL.deep, 0, rigid(B('upperArm')));
    ellipsoidMesh(m, mm(J.elbow), AX, [0.031, 0.031, 0.031], COL.deep, 0, rigid(B('upperArm')));
    ellipsoidMesh(m, mm(J.knee), AX, [0.046, 0.046, 0.046], COL.deep, 0, rigid(B('thigh')));
    ellipsoidMesh(m, mm([0.072, 0.885, -0.052]), AX, [0.07, 0.078, 0.056], COL.deep, 0, rigid(BONE_INDEX.pelvis));
  }
}
function limbMesh(m, s, rigidBone, bones, tintGroup) {
  const tg = tintGroup ? GROUPS.find((g) => g.id === tintGroup) : null;
  const col = tg ? lerp(mul(hexRGB(tg.color), 0.82), COL.deep, 0.3) : COL.deep;
  const rings = [];
  for (let k = 0; k <= 28; k++) {
    const t = k / 28, pts = [];
    for (let i = 0; i <= 32; i++) pts.push(segPt(s, t, 360 * i / 32));
    rings.push({ pts, v: t * s.L * 3 });
  }
  ringsMesh(m, rings, col, 0, rigidBone != null ? () => rigid(rigidBone) : (p) => skinWeights(p, bones), 4, () => 0.75, false);
}

function buildPlaster(m) {
  const head = rigid(BONE_INDEX.head);
  // smooth mannequin head lofted from sagittal/transverse profile: [y, half width, front z, back z]
  const HT = [[1.528, 0.012, 0.050, 0.004], [1.538, 0.036, 0.072, 0.022], [1.552, 0.050, 0.086, 0.040], [1.572, 0.058, 0.094, 0.054],
    [1.598, 0.064, 0.099, 0.068], [1.626, 0.070, 0.101, 0.081], [1.654, 0.075, 0.099, 0.090], [1.684, 0.076, 0.095, 0.094],
    [1.712, 0.072, 0.087, 0.092], [1.737, 0.062, 0.073, 0.082], [1.756, 0.046, 0.053, 0.062], [1.768, 0.024, 0.028, 0.034], [1.7725, 0.004, 0.005, 0.006]];
  const hr = [];
  for (let k = 0; k <= 40; k++) {
    const y = HT[0][0] + (HT[HT.length - 1][0] - HT[0][0]) * k / 40;
    const wx = interpRaw(HT, y, 1), zf = interpRaw(HT, y, 2), zb = interpRaw(HT, y, 3), pts = [];
    for (let i = 0; i <= 48; i++) {
      const th = 2 * Math.PI * i / 48, c = Math.cos(th), sn = Math.sin(th);
      const e = 2.4, sx = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e), sz = Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
      pts.push([wx * sx, y, (c > 0 ? zf : zb) * sz - 0.004]);
    }
    hr.push({ pts, v: k });
  }
  ringsMesh(m, hr, COL.plaster, 1, () => head, 1, null, true);
  capsuleMesh(m, [0, 1.648, 0.092], [0, 1.622, 0.106], 0.0095, COL.plaster, 1, head, 14);
  for (const sx of [1, -1]) ellipsoidMesh(m, [sx * 0.073, 1.638, -0.004], AX, [0.008, 0.024, 0.016], COL.plaster, 1, head, 16, 10);
  // sternum, clavicles, patellae, tibia crest, malleoli, olecranon
  const chest = BONE_INDEX.chest;
  const stern = [];
  for (let k = 0; k <= 10; k++) {
    const y = 1.425 - 0.215 * k / 10, w = 0.012 - 0.004 * k / 10, pts = [];
    for (let i = 0; i <= 12; i++) { const th = (i / 12 - 0.5) * 2 * Math.PI; const pp = T(y, (Math.sin(th) * w / TORSO.get(y, 0)) / DEG); pts.push(add(pp, [0, 0, 0.004 + 0.002 * Math.cos(th)])); }
    stern.push({ pts, v: k });
  }
  ringsMesh(m, stern, COL.bone, 1, () => rigid(chest), 1, null, true);
  ellipsoidMesh(m, [0, 0.868, 0.07], AX, [0.034, 0.018, 0.016], COL.bone, 1, rigid(BONE_INDEX.pelvis), 24, 14); // pubic symphysis
  for (const side of ['L', 'R']) {
    const mm = side === 'L' ? (p) => p : mir;
    const B = (n) => BONE_INDEX[n + side];
    // clavicle (S-curved)
    const cl = spline([[0.02, 1.432, 0.074], [0.07, 1.442, 0.07], [0.12, 1.448, 0.045], [0.165, 1.456, 0.008]].map(mm), 14).map((p) => projectTo(p, 0.004, false));
    for (let k = 0; k < cl.length - 1; k++) capsuleMesh(m, cl[k], cl[k + 1], 0.0058, COL.bone, 1, rigid(B('clav')), 10);
    ellipsoidMesh(m, mm(add(J.knee, [0, 0.008, 0.052])), AX, [0.022, 0.027, 0.011], COL.bone, 1, rigid(B('thigh')), 20, 12);
    ellipsoidMesh(m, mm(segPt(SEG.shin, 0.99, 92, 0.006)), AX, [0.010, 0.014, 0.010], COL.bone, 1, rigid(B('shin')), 14, 10);
    ellipsoidMesh(m, mm(segPt(SEG.shin, 0.97, 268, 0.006)), AX, [0.011, 0.014, 0.011], COL.bone, 1, rigid(B('shin')), 14, 10);
    ellipsoidMesh(m, mm(segPt(SEG.upper, 1.0, 178, 0.008)), AX, [0.012, 0.014, 0.012], COL.bone, 1, rigid(B('foreArm')), 14, 10);
    buildFoot(m, side);
  }
}
function buildHand(m, side) {
  const mm = side === 'L' ? (p) => p : mir;
  const skin = rigid(BONE_INDEX['hand' + side]);
  const d = norm(sub(J.handEnd, J.wrist));
  const fwd = norm(sub([0, 0, 1], mul(d, d[2])));
  const lat = norm(cross(fwd, d)); // thumb side (+x for left)
  const w = J.wrist;
  const at = (a, b, c) => add(w, add(add(mul(d, a), mul(lat, b)), mul(fwd, c)));
  // palm
  const palmC = at(0.052, 0.0, 0.0);
  const axes = [lat, d, fwd].map((v) => (side === 'L' ? v : mir(v)));
  ellipsoidMesh(m, mm(palmC), axes, [0.041, 0.05, 0.017], COL.plaster, 1, skin, 28, 18);
  // fingers: index (thumb side) .. little
  const fs = [[0.022, 0.078], [0.007, 0.086], [-0.008, 0.081], [-0.022, 0.066]];
  fs.forEach(([o, L]) => {
    const p0 = at(0.096, o, 0.002), p1 = at(0.096 + L * 0.52, o * 1.05, 0.01), p2 = at(0.096 + L * 0.92, o * 1.08, 0.026);
    capsuleMesh(m, mm(p0), mm(p1), 0.0088, COL.plaster, 1, skin, 12);
    capsuleMesh(m, mm(p1), mm(p2), 0.0078, COL.plaster, 1, skin, 12);
  });
  const t0 = at(0.028, 0.03, 0.006), t1 = at(0.06, 0.05, 0.022), t2 = at(0.088, 0.058, 0.036);
  capsuleMesh(m, mm(t0), mm(t1), 0.0115, COL.plaster, 1, skin, 12);
  capsuleMesh(m, mm(t1), mm(t2), 0.0095, COL.plaster, 1, skin, 12);
}
function buildFoot(m, side) {
  const mm = side === 'L' ? (p) => p : mir;
  const skin = rigid(BONE_INDEX['foot' + side]);
  // path heel -> toes with elliptical sections (half width, half height, centre lift)
  const path = [[0.118, 0.036, -0.064, 0.025, 0.034], [0.12, 0.047, -0.025, 0.032, 0.046], [0.124, 0.042, 0.035, 0.04, 0.04],
    [0.128, 0.026, 0.105, 0.046, 0.025], [0.132, 0.017, 0.148, 0.042, 0.016], [0.134, 0.013, 0.17, 0.034, 0.012]];
  const rings = [];
  const tab = path.map((r, i) => [i, ...r]);
  const steps = 30;
  for (let k = 0; k <= steps; k++) {
    const x = (path.length - 1) * k / steps;
    const cx = interpRaw(tab, x, 1), cy = interpRaw(tab, x, 2), cz = interpRaw(tab, x, 3), hw = interpRaw(tab, x, 4), hh = interpRaw(tab, x, 5);
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const ph = 2 * Math.PI * i / 28, sn = Math.sin(ph);
      const yy = cy + (sn > 0 ? sn * hh : sn * Math.min(hh, cy - 0.001));
      pts.push(mm([cx + Math.cos(ph) * hw, yy, cz]));
    }
    rings.push({ pts, v: k });
  }
  ringsMesh(m, rings, COL.plaster, 1, () => skin, 1, null, true);
  ellipsoidMesh(m, mm([0.122, 0.07, -0.03]), AX, [0.028, 0.03, 0.035], COL.plaster, 1, skin, 22, 14);
}

// ---------------------------------------------------------------- hands in a grip & training equipment
const PART_ID = { handsOpen: 240, handsFist: 241, bench: 250, barbell: 251, dumbbells: 252, mat: 253, dumbbell1: 254, dumbbellR: 255,
  rack: 242, adjSeat: 243, adjBack: 244, decline: 245, pullup: 246, ezbar: 247, kbSwing: 248, kbGoblet: 249, box: 239,
  dip: 238, rings: 237, trapbar: 236, backext: 235, lmBase: 234, lmBar: 233, preacher: 232, abwheel: 231, parallettes: 230, kbRack: 229,
  cables: 228, pulleys: 227, ropes: 226, crossover: 225, tower: 224, latMachine: 223, rowMachine: 222, dhandles: 221, straightBar: 220, latBar: 219, vBar: 218,
  pecDeck: 217, pecArms: 216, chestPress: 215, shoulderPress: 214, pressHandles: 213, legPress: 212, legPressSled: 211, hack: 210, hackSled: 209,
  legExt: 208, extLever: 207, legCurl: 206, curlLever: 205, hipMachine: 204, hipPads: 203, calfStand: 202, calfYoke: 201, calfSeat: 200, calfKnee: 199, tbar: 198, tbarLever: 197,
  ropeThin: 196, ropeThick: 195, jumpHandles: 194, ropeAnchor: 193, wall: 192, medBall: 191 };
const SLOT = { world: 20, barbell: 21, mat: 22, rig: 23, benchBack: 24, landmine: 25, cableA: 26, cableB: 27, pulleyA: 28, pulleyB: 29, ropeA: 30, ropeB: 31 };
const EQUIP = { metal: [0.74, 0.76, 0.79], plate: [0.33, 0.36, 0.41], pad: [0.28, 0.30, 0.33], frame: [0.60, 0.63, 0.67], mat: [0.56, 0.62, 0.70] };
function handFrame() {
  const d = norm(sub(J.handEnd, J.wrist));
  const fwd = norm(sub([0, 0, 1], mul(d, d[2])));
  const lat = norm(cross(fwd, d));
  const w = J.wrist;
  const at = (a, b, c) => add(w, add(add(mul(d, a), mul(lat, b)), mul(fwd, c)));
  return { d, fwd, lat, w, at, grip: at(0.088, 0.004, 0.024) };
}
// grip centre of the left hand in rest pose (the handle axis runs along `lat` through it)
const GRIP_L = handFrame().grip;
function buildFist(m, side) {
  const mm = side === 'L' ? (p) => p : mir;
  const skin = rigid(BONE_INDEX['hand' + side]);
  const { d, fwd, lat, at, grip } = handFrame();
  const axes = [lat, d, fwd].map((v) => (side === 'L' ? v : mir(v)));
  ellipsoidMesh(m, mm(at(0.05, 0.0, 0.0)), axes, [0.041, 0.048, 0.018], COL.plaster, 1, skin, 28, 18);
  const rr = 0.0225;
  [[0.021, 0.078], [0.007, 0.086], [-0.008, 0.081], [-0.022, 0.066]].forEach(([o, L]) => {
    const amax = L / rr, pts = [];
    for (let k = 0; k <= 3; k++) {
      const a = amax * k / 3;
      pts.push(add(add(grip, mul(lat, o)), add(mul(fwd, -rr * Math.cos(a)), mul(d, rr * Math.sin(a) + 0.002))));
    }
    for (let k = 0; k < 3; k++) capsuleMesh(m, mm(pts[k]), mm(pts[k + 1]), 0.0086 - k * 0.0005, COL.plaster, 1, skin, 12);
  });
  const t0 = at(0.028, 0.03, 0.006), t1 = add(grip, add(mul(lat, 0.03), add(mul(fwd, 0.03), mul(d, -0.012)))), t2 = add(grip, add(mul(lat, 0.004), add(mul(fwd, 0.036), mul(d, 0.006))));
  capsuleMesh(m, mm(t0), mm(t1), 0.0112, COL.plaster, 1, skin, 12);
  capsuleMesh(m, mm(t1), mm(t2), 0.0094, COL.plaster, 1, skin, 12);
}
function cylinderMesh(m, a, b, r, col, skin, segs = 28, bevel = 0.003) {
  // separate vertices for side and caps so each keeps its own normal (crisp machined edges)
  const ax = norm(sub(b, a)), L = len(sub(b, a));
  let f = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  f = norm(sub(f, mul(ax, dot(f, ax)))); const l = cross(f, ax);
  const ring = (dd, rr) => Array.from({ length: segs + 1 }, (_, i) => { const ph = 2 * Math.PI * i / segs; return add(add(a, mul(ax, dd)), add(mul(l, Math.cos(ph) * rr), mul(f, Math.sin(ph) * rr))); });
  const bv = Math.min(bevel, L * 0.3, r * 0.3);
  const strip = (r0, r1, outward) => {
    const s0 = m.count; r0.forEach((p) => m.vert(p, col, 1, 0, 0, 1, skin)); r1.forEach((p) => m.vert(p, col, 1, 0, 0, 1, skin));
    const c0 = r0[0], c1 = r0[1], c2 = r1[0];
    const nrm = cross(sub(c1, c0), sub(c2, c0));
    const flip = dot(nrm, outward(c0)) < 0;
    for (let i = 0; i < segs; i++) { const p0 = s0 + i, p1 = p0 + 1, q0 = s0 + segs + 1 + i, q1 = q0 + 1; if (flip) { m.tri(p0, q0, p1); m.tri(p1, q0, q1); } else { m.tri(p0, p1, q0); m.tri(p1, q1, q0); } }
  };
  const radial = (p) => { const d = sub(p, a); return sub(d, mul(ax, dot(d, ax))); };
  strip(ring(bv, r), ring(L - bv, r), radial);
  strip(ring(0, r - bv), ring(bv, r), (p) => add(radial(p), mul(ax, -0.5 * len(radial(p)))));
  strip(ring(L - bv, r), ring(L, r - bv), (p) => add(radial(p), mul(ax, 0.5 * len(radial(p)))));
  for (const [dd, sgn] of [[0, -1], [L, 1]]) {
    const rg = ring(dd, r - bv), c = add(a, mul(ax, dd)), s0 = m.count;
    rg.forEach((p) => m.vert(p, col, 1, 0, 0, 1, skin)); const ci = m.vert(c, col, 1, 0, 0, 1, skin);
    const flip = dot(cross(sub(rg[0], c), sub(rg[1], c)), mul(ax, sgn)) < 0;
    for (let i = 0; i < segs; i++) { if (flip) m.tri(ci, s0 + i + 1, s0 + i); else m.tri(ci, s0 + i, s0 + i + 1); }
  }
}
function boxMesh(m, lo, hi, col, skin) {
  const P = (x, y, z) => [x ? hi[0] : lo[0], y ? hi[1] : lo[1], z ? hi[2] : lo[2]];
  const faces = [
    [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)], [P(0, 0, 1), P(0, 1, 1), P(0, 1, 0), P(0, 0, 0)],
    [P(0, 1, 0), P(0, 1, 1), P(1, 1, 1), P(1, 1, 0)], [P(0, 0, 1), P(0, 0, 0), P(1, 0, 0), P(1, 0, 1)],
    [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)], [P(1, 0, 0), P(0, 0, 0), P(0, 1, 0), P(1, 1, 0)],
  ];
  const c = mul(add(lo, hi), 0.5);
  for (const q of faces) {
    const i0 = m.count;
    q.forEach((p) => m.vert(p, col, 1, 0, 0, 1, skin));
    const flip = dot(cross(sub(q[1], q[0]), sub(q[2], q[0])), sub(q[0], c)) < 0;
    if (flip) { m.tri(i0, i0 + 2, i0 + 1); m.tri(i0, i0 + 3, i0 + 2); } else { m.tri(i0, i0 + 1, i0 + 2); m.tri(i0, i0 + 2, i0 + 3); }
  }
}
function buildDumbbells(m, sides = ['L', 'R']) {
  const { lat, grip } = handFrame();
  for (const side of sides) {
    const mm = side === 'L' ? (p) => p : mir;
    const skin = rigid(BONE_INDEX['hand' + side]);
    const at = (o) => mm(add(grip, mul(lat, o)));
    cylinderMesh(m, at(-0.066), at(0.066), 0.0135, EQUIP.metal, skin, 20, 0.002);
    for (const s of [1, -1]) {
      cylinderMesh(m, at(s * 0.066), at(s * 0.078), 0.022, EQUIP.metal, skin, 24);
      cylinderMesh(m, at(s * 0.078), at(s * 0.118), 0.052, EQUIP.plate, skin, 32, 0.006);
      cylinderMesh(m, at(s * 0.118), at(s * 0.124), 0.02, EQUIP.metal, skin, 20);
    }
  }
}
function buildBarbell(m) {
  const skin = { idx: [SLOT.barbell, 0, 0, 0], w: [1, 0, 0, 0] };
  const X = (x) => [x, 0, 0];
  cylinderMesh(m, X(-0.62), X(0.62), 0.0135, EQUIP.metal, skin, 20, 0.002);
  for (const s of [1, -1]) {
    cylinderMesh(m, X(s * 0.62), X(s * 0.655), 0.032, EQUIP.metal, skin, 24);
    cylinderMesh(m, X(s * 0.655), X(s * 1.05), 0.025, EQUIP.metal, skin, 24);
    cylinderMesh(m, X(s * 0.665), X(s * 0.705), 0.205, EQUIP.plate, skin, 48, 0.01);
    cylinderMesh(m, X(s * 0.705), X(s * 0.735), 0.17, EQUIP.plate, skin, 44, 0.008);
    cylinderMesh(m, X(s * 0.745), X(s * 0.77), 0.035, EQUIP.metal, skin, 24);
  }
}
function buildDumbbellSingle(m) {
  // one dumbbell held vertically from under its top plate (hands at the slot origin)
  const skin = { idx: [SLOT.barbell, 0, 0, 0], w: [1, 0, 0, 0] };
  const Y = (y) => [0, y, 0];
  cylinderMesh(m, Y(0.012), Y(0.052), 0.058, EQUIP.plate, skin, 32, 0.006);
  cylinderMesh(m, Y(-0.004), Y(0.012), 0.024, EQUIP.metal, skin, 20);
  cylinderMesh(m, Y(-0.15), Y(-0.004), 0.0135, EQUIP.metal, skin, 20, 0.002);
  cylinderMesh(m, Y(-0.166), Y(-0.15), 0.024, EQUIP.metal, skin, 20);
  cylinderMesh(m, Y(-0.206), Y(-0.166), 0.058, EQUIP.plate, skin, 32, 0.006);
}
function buildMat(m) {
  const skin = { idx: [SLOT.mat, 0, 0, 0], w: [1, 0, 0, 0] };
  boxMesh(m, [-0.33, -0.002, -0.95], [0.33, 0.006, 0.95], EQUIP.mat, skin);
}
const BENCH = { top: 0.452, z0: -0.88, z1: 0.18, halfW: 0.145 };
function buildBench(m) {
  const skin = { idx: [SLOT.world, 0, 0, 0], w: [1, 0, 0, 0] };
  const { top, z0, z1, halfW } = BENCH;
  boxMesh(m, [-halfW, top - 0.065, z0], [halfW, top, z1], EQUIP.pad, skin);
  boxMesh(m, [-halfW + 0.01, top - 0.09, z0 + 0.02], [halfW - 0.01, top - 0.065, z1 - 0.02], EQUIP.frame, skin);
  for (const z of [z0 + 0.1, z1 - 0.1]) {
    boxMesh(m, [-0.03, 0.04, z - 0.03], [0.03, top - 0.09, z + 0.03], EQUIP.frame, skin);
    boxMesh(m, [-0.21, 0.0, z - 0.035], [0.21, 0.045, z + 0.035], EQUIP.frame, skin);
  }
  boxMesh(m, [-0.025, 0.05, z0 + 0.1], [0.025, 0.09, z1 - 0.1], EQUIP.frame, skin);
}


// ---------------------------------------------------------------- static equipment, round A
function oboxMesh(m, c, ax, half, col, skin) { // oriented box: centre, 3 unit axes, half sizes
  const P = (sx, sy, sz) => add(c, add(add(mul(ax[0], sx * half[0]), mul(ax[1], sy * half[1])), mul(ax[2], sz * half[2])));
  const faces = [[P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1)], [P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), P(-1, -1, -1)],
    [P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1)], [P(-1, -1, 1), P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1)],
    [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], [P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1)]];
  for (const q of faces) {
    const i0 = m.count; q.forEach((p) => m.vert(p, col, 1, 0, 0, 1, skin));
    const flip = dot(cross(sub(q[1], q[0]), sub(q[2], q[0])), sub(q[0], c)) < 0;
    if (flip) { m.tri(i0, i0 + 2, i0 + 1); m.tri(i0, i0 + 3, i0 + 2); } else { m.tri(i0, i0 + 1, i0 + 2); m.tri(i0, i0 + 2, i0 + 3); }
  }
}
const slotSkin = (s) => ({ idx: [s, 0, 0, 0], w: [1, 0, 0, 0] });
// power rack: posts at x ±0.6, z ±0.45 around the origin
function buildRack(m) {
  const sk = slotSkin(SLOT.rig), H = 2.2, X = 0.6, Z = 0.45, t = 0.03;
  for (const x of [-X, X]) for (const z of [-Z, Z]) boxMesh(m, [x - t, 0, z - t], [x + t, H, z + t], EQUIP.frame, sk);
  for (const x of [-X, X]) { boxMesh(m, [x - t, 0, -Z - 0.15], [x + t, 0.05, Z + 0.15], EQUIP.frame, sk); boxMesh(m, [x - t, H - 0.06, -Z], [x + t, H, Z], EQUIP.frame, sk); }
  boxMesh(m, [-X, H - 0.06, -Z - t], [X, H, -Z + t], EQUIP.frame, sk);
  cylinderMesh(m, [-X, H - 0.03, Z], [X, H - 0.03, Z], 0.016, EQUIP.metal, sk, 16);
  for (const x of [-X, X]) {
    boxMesh(m, [x - 0.025, 0.72, -Z], [x + 0.025, 0.76, Z + 0.12], EQUIP.metal, sk); // safety arms
    for (const z of [-Z, Z]) boxMesh(m, [x - 0.025, 1.3, z], [x + 0.025, 1.38, z + 0.07], EQUIP.metal, sk); // J-hooks
  }
}
// adjustable bench: seat fixed on the bench slot, back pad hinged at (0, top, -0.2) on its own slot
const ADJ = { top: 0.452, hingeZ: -0.2, seatZ1: 0.18, backLen: 0.8, halfW: 0.145 };
function buildAdjSeat(m) {
  const sk = slotSkin(SLOT.world), { top, hingeZ, seatZ1, halfW } = ADJ;
  boxMesh(m, [-halfW, top - 0.065, hingeZ + 0.01], [halfW, top, seatZ1], EQUIP.pad, sk);
  boxMesh(m, [-0.03, 0.04, hingeZ - 0.62], [0.03, top - 0.09, hingeZ - 0.56], EQUIP.frame, sk);
  boxMesh(m, [-0.03, 0.04, seatZ1 - 0.12], [0.03, top - 0.09, seatZ1 - 0.06], EQUIP.frame, sk);
  boxMesh(m, [-0.025, 0.05, hingeZ - 0.62], [0.025, 0.09, seatZ1 - 0.06], EQUIP.frame, sk);
  for (const z of [hingeZ - 0.59, seatZ1 - 0.09]) boxMesh(m, [-0.21, 0, z - 0.035], [0.21, 0.045, z + 0.035], EQUIP.frame, sk);
  boxMesh(m, [-0.035, top - 0.2, hingeZ - 0.04], [0.035, top - 0.065, hingeZ + 0.04], EQUIP.frame, sk);
}
function buildAdjBack(m) {
  const sk = slotSkin(SLOT.benchBack), { top, hingeZ, backLen, halfW } = ADJ;
  boxMesh(m, [-halfW, top - 0.065, hingeZ - backLen], [halfW, top, hingeZ - 0.01], EQUIP.pad, sk);
  boxMesh(m, [-0.03, top - 0.1, hingeZ - backLen + 0.1], [0.03, top - 0.065, hingeZ - 0.02], EQUIP.frame, sk);
}
// decline bench: pad slopes from y 0.43 (head, z -0.88) to 0.72 (feet, z 0.18), leg roller beyond the high end
const DECL = { z0: -0.88, z1: 0.18, y0: 0.43, y1: 0.72, halfW: 0.145 };
const declY = (z) => DECL.y0 + (DECL.y1 - DECL.y0) * (z - DECL.z0) / (DECL.z1 - DECL.z0);
function buildDecline(m) {
  const sk = slotSkin(SLOT.world), { z0, z1, halfW } = DECL;
  const dir = norm([0, DECL.y1 - DECL.y0, z1 - z0]), up = norm(cross([1, 0, 0], dir));
  const mid = [0, (DECL.y0 + DECL.y1) / 2, (z0 + z1) / 2];
  oboxMesh(m, add(mid, mul(up, -0.0325)), [[1, 0, 0], up, dir], [halfW, 0.0325, len(sub([0, DECL.y1, z1], [0, DECL.y0, z0])) / 2], EQUIP.pad, sk);
  for (const z of [z0 + 0.12, z1 - 0.1]) { boxMesh(m, [-0.03, 0.04, z - 0.03], [0.03, declY(z) - 0.07, z + 0.03], EQUIP.frame, sk); boxMesh(m, [-0.21, 0, z - 0.035], [0.21, 0.045, z + 0.035], EQUIP.frame, sk); }
  boxMesh(m, [-0.025, 0.05, z0 + 0.12], [0.025, 0.09, z1 - 0.1], EQUIP.frame, sk);
  boxMesh(m, [-0.025, 0.04, z1 + 0.18], [0.025, 0.5, z1 + 0.24], EQUIP.frame, sk);
  boxMesh(m, [-0.025, 0.05, z1 - 0.1], [0.025, 0.09, z1 + 0.24], EQUIP.frame, sk);
  cylinderMesh(m, [-0.17, 0.46, z1 + 0.21], [0.17, 0.46, z1 + 0.21], 0.045, EQUIP.pad, sk, 24, 0.01);
}
// free-standing pull-up station: bar along x at y 2.3, z 0
function buildPullup(m) {
  const sk = slotSkin(SLOT.rig), X = 0.68, H = 2.3;
  cylinderMesh(m, [-X, H, 0], [X, H, 0], 0.016, EQUIP.metal, sk, 18);
  for (const x of [-X, X]) {
    boxMesh(m, [x - 0.03, 0, -0.03], [x + 0.03, H + 0.04, 0.03], EQUIP.frame, sk);
    boxMesh(m, [x - 0.03, 0, -0.45], [x + 0.03, 0.05, 0.45], EQUIP.frame, sk);
    boxMesh(m, [x - 0.025, 1.0, -0.35], [x + 0.025, 1.04, 0.0], EQUIP.frame, sk);
  }
}
// EZ curl bar on the barbell slot (grip midpoint), cambered centre section
function buildEZ(m) {
  const sk = slotSkin(SLOT.barbell), r = 0.0125;
  const pts = [[-0.3, 0, 0], [-0.19, 0, 0], [-0.13, 0, -0.03], [-0.07, 0, 0.015], [0, 0, 0], [0.07, 0, 0.015], [0.13, 0, -0.03], [0.19, 0, 0], [0.3, 0, 0]];
  for (let i = 0; i < pts.length - 1; i++) capsuleMesh(m, pts[i], pts[i + 1], r, EQUIP.metal, 1, sk, 14);
  for (const s of [1, -1]) {
    const X = (x) => [s * x, 0, 0];
    cylinderMesh(m, X(0.3), X(0.33), 0.028, EQUIP.metal, sk, 20);
    cylinderMesh(m, X(0.33), X(0.6), 0.024, EQUIP.metal, sk, 20);
    cylinderMesh(m, X(0.34), X(0.37), 0.16, EQUIP.plate, sk, 40, 0.008);
    cylinderMesh(m, X(0.37), X(0.395), 0.12, EQUIP.plate, sk, 36, 0.006);
  }
}
// kettlebell rigidly on the left hand. swing: handle across both fists, bell beyond the knuckles; goblet: held by the horns, bell below the hands
function buildKettlebell(m, mode) {
  const sk = rigid(BONE_INDEX.handL), f = handFrame(), d = f.d, lat = f.lat, palm = f.fwd;
  const hc = mode === 'swing' ? add(f.grip, mul(lat, 0.048)) : mode === 'rack' ? f.grip : add(f.grip, mul(palm, 0.07));
  const axis = mode === 'goblet' ? palm : lat, down = mode === 'swing' ? d : mode === 'rack' ? norm(add(mul(d, -0.55), mul(palm, -0.85))) : mul(d, -1);
  const c = add(hc, mul(down, 0.13));
  ellipsoidMesh(m, c, [norm(axis), norm(down), norm(cross(axis, down))], [0.088, 0.085, 0.088], EQUIP.plate, 1, sk, 30, 20);
  const side = norm(cross(axis, down)), segs = 10;
  let prev = null;
  for (let k = 0; k <= segs; k++) {
    const a = Math.PI * k / segs;
    const p = add(add(hc, mul(axis, -Math.cos(a) * 0.055)), mul(down, 0.06 - Math.sin(a) * 0.06 + 0.0));
    if (prev) capsuleMesh(m, prev, p, 0.011, EQUIP.plate, 1, sk, 10);
    prev = p;
  }
  void side;
}
// plyo box 0.6 × 0.5 × 0.5 centred at the rig origin
function buildBox(m) {
  const sk = slotSkin(SLOT.rig);
  boxMesh(m, [-0.3, 0, -0.25], [0.3, 0.5, 0.25], EQUIP.frame, sk);
  boxMesh(m, [-0.29, 0.5, -0.24], [0.29, 0.508, 0.24], EQUIP.pad, sk);
}


// ---------------------------------------------------------------- static equipment, round B
// dip station: handles along z at x ±0.27, y 1.3
function buildDipStation(m) {
  const sk = slotSkin(SLOT.rig), X = 0.27, Y = 1.3;
  for (const x of [-X, X]) {
    cylinderMesh(m, [x, Y, -0.32], [x, Y, 0.32], 0.02, EQUIP.metal, sk, 18);
    for (const z of [-0.32, 0.32]) boxMesh(m, [x - 0.025 + (x > 0 ? 0.03 : -0.03), 0, z - 0.025], [x + 0.025 + (x > 0 ? 0.03 : -0.03), Y + 0.02, z + 0.025], EQUIP.frame, sk);
    boxMesh(m, [x - 0.02 + (x > 0 ? 0.03 : -0.03), 0, -0.42], [x + 0.02 + (x > 0 ? 0.03 : -0.03), 0.05, 0.42], EQUIP.frame, sk);
  }
  boxMesh(m, [-X - 0.05, 0.0, -0.36], [X + 0.05, 0.05, -0.3], EQUIP.frame, sk);
}
// gymnastic rings hanging at x ±0.22, ring bottom (grip) at y 1.3, straps up to 2.9
function buildRings(m) {
  const sk = slotSkin(SLOT.rig), Y = 1.3, R = 0.09;
  for (const x of [-0.22, 0.22]) {
    let prev = null;
    for (let k = 0; k <= 28; k++) { const a = 2 * Math.PI * k / 28, p = [x, Y + R - Math.cos(a) * R, Math.sin(a) * R]; if (prev) capsuleMesh(m, prev, p, 0.014, EQUIP.pad, 1, sk, 10); prev = p; }
    boxMesh(m, [x - 0.018, Y + 2 * R + 0.01, -0.004], [x + 0.018, 2.9, 0.004], EQUIP.plate, sk);
  }
  boxMesh(m, [-0.5, 2.9, -0.03], [0.5, 2.95, 0.03], EQUIP.frame, sk);
}
// trap bar on the barbell slot (grip midpoint): handles along z at x ±0.28
function buildTrapBar(m) {
  const sk = slotSkin(SLOT.barbell), r = 0.014;
  const hx = [[-0.55, 0, 0], [-0.36, 0, -0.3], [0.36, 0, -0.3], [0.55, 0, 0], [0.36, 0, 0.3], [-0.36, 0, 0.3], [-0.55, 0, 0]];
  for (let i = 0; i < hx.length - 1; i++) capsuleMesh(m, hx[i], hx[i + 1], r, EQUIP.metal, 1, sk, 12);
  for (const s of [1, -1]) {
    cylinderMesh(m, [s * 0.28, 0, -0.16], [s * 0.28, 0, 0.16], 0.016, EQUIP.metal, sk, 16);
    capsuleMesh(m, [s * 0.28, 0, -0.16], [s * 0.36, 0, -0.3], r, EQUIP.metal, 1, sk, 10);
    capsuleMesh(m, [s * 0.28, 0, 0.16], [s * 0.36, 0, 0.3], r, EQUIP.metal, 1, sk, 10);
    const X = (x) => [s * x, 0, 0];
    cylinderMesh(m, X(0.55), X(0.95), 0.025, EQUIP.metal, sk, 20);
    cylinderMesh(m, X(0.6), X(0.64), 0.205, EQUIP.plate, sk, 48, 0.01);
    cylinderMesh(m, X(0.64), X(0.67), 0.17, EQUIP.plate, sk, 44, 0.008);
  }
}
// 45° back extension: hips at H (0, 0.9, 0.12), legs run down-back at 45°
const BX = { H: [0, 0.9, 0.12] };
function buildBackExt(m) {
  const sk = slotSkin(SLOT.rig), H = BX.H, u = norm([0, -1, -1]), fr = norm([0, -1, 1]), X = [1, 0, 0];
  const ank = add(H, mul(u, 0.83));
  oboxMesh(m, add(add(H, mul(u, 0.17)), mul(fr, 0.13)), [X, fr, u], [0.17, 0.04, 0.16], EQUIP.pad, sk);
  oboxMesh(m, add(add(ank, mul(u, 0.1)), mul(fr, 0.02)), [X, u, fr], [0.18, 0.015, 0.14], EQUIP.frame, sk);
  cylinderMesh(m, add(add(ank, mul(fr, -0.075)), [-0.15, 0, 0]), add(add(ank, mul(fr, -0.075)), [0.15, 0, 0]), 0.04, EQUIP.pad, sk, 22, 0.008);
  const a = add(add(ank, mul(u, 0.1)), mul(fr, 0.06)), b = add(add(H, mul(u, 0.25)), mul(fr, 0.2));
  oboxMesh(m, mul(add(a, b), 0.5), [X, fr, norm(sub(b, a))], [0.03, 0.03, len(sub(b, a)) / 2], EQUIP.frame, sk);
  for (const p of [a, b]) boxMesh(m, [p[0] - 0.03, 0, p[2] - 0.03], [p[0] + 0.03, p[1], p[2] + 0.03], EQUIP.frame, sk);
  boxMesh(m, [-0.25, 0, a[2] - 0.03], [0.25, 0.05, b[2] + 0.03], EQUIP.frame, sk);
}
// landmine: pivot base on the rig slot at the origin; the bar itself on the landmine slot (local +z from the pivot)
function buildLandmineBase(m) {
  const sk = slotSkin(SLOT.rig);
  boxMesh(m, [-0.2, 0, -0.2], [0.2, 0.03, 0.2], EQUIP.frame, sk);
  cylinderMesh(m, [0, 0.03, 0], [0, 0.1, 0], 0.045, EQUIP.metal, sk, 20);
}
function buildLandmineBar(m) {
  const sk = slotSkin(SLOT.landmine), Z = (z) => [0, 0, z];
  cylinderMesh(m, Z(-0.05), Z(0.2), 0.026, EQUIP.metal, sk, 18);
  cylinderMesh(m, Z(0.2), Z(1.55), 0.0135, EQUIP.metal, sk, 18, 0.002);
  cylinderMesh(m, Z(1.55), Z(1.59), 0.032, EQUIP.metal, sk, 20);
  cylinderMesh(m, Z(1.59), Z(1.98), 0.025, EQUIP.metal, sk, 20);
  cylinderMesh(m, Z(1.6), Z(1.64), 0.205, EQUIP.plate, sk, 48, 0.01);
}
// preacher bench: seat at z -0.05, sloped arm pad in front
const PREACH = { seatY: 0.6, padTop: [0, 1.15, 0.2], padBot: [0, 0.9, 0.46] };
function buildPreacher(m) {
  const sk = slotSkin(SLOT.rig), { seatY, padTop, padBot } = PREACH;
  boxMesh(m, [-0.17, seatY - 0.07, -0.2], [0.17, seatY, 0.12], EQUIP.pad, sk);
  boxMesh(m, [-0.03, 0.04, -0.1], [0.03, seatY - 0.07, -0.04], EQUIP.frame, sk);
  const dir = norm(sub(padBot, padTop)), nrm = norm(cross([1, 0, 0], dir));
  oboxMesh(m, add(mul(add(padTop, padBot), 0.5), mul(nrm, -0.04)), [[1, 0, 0], nrm, dir], [0.24, 0.04, len(sub(padBot, padTop)) / 2 + 0.03], EQUIP.pad, sk);
  boxMesh(m, [-0.03, 0.04, 0.4], [0.03, 0.86, 0.46], EQUIP.frame, sk);
  boxMesh(m, [-0.025, 0.05, -0.1], [0.025, 0.09, 0.46], EQUIP.frame, sk);
  for (const z of [-0.07, 0.43]) boxMesh(m, [-0.22, 0, z - 0.035], [0.22, 0.045, z + 0.035], EQUIP.frame, sk);
  boxMesh(m, [-0.32, 0.96, 0.44], [0.32, 1.0, 0.5], EQUIP.metal, sk);
}
// ab wheel on the barbell slot: tyre at the grip midpoint, handles along x
function buildAbWheel(m) {
  const sk = slotSkin(SLOT.barbell);
  cylinderMesh(m, [-0.035, 0, 0], [0.035, 0, 0], 0.09, EQUIP.plate, sk, 40, 0.015);
  cylinderMesh(m, [-0.04, 0, 0], [0.04, 0, 0], 0.035, EQUIP.metal, sk, 20);
  for (const s of [1, -1]) cylinderMesh(m, [s * 0.04, 0, 0], [s * 0.2, 0, 0], 0.017, EQUIP.pad, sk, 18, 0.004);
}
// parallettes: handles along z at x ±0.25, y 0.3
function buildParallettes(m) {
  const sk = slotSkin(SLOT.rig);
  for (const x of [-0.25, 0.25]) {
    cylinderMesh(m, [x, 0.3, -0.2], [x, 0.3, 0.2], 0.017, EQUIP.pad, sk, 18);
    for (const z of [-0.2, 0.2]) capsuleMesh(m, [x, 0.3, z], [x, 0.02, z + Math.sign(z) * 0.08], 0.016, EQUIP.frame, 1, sk, 10);
    cylinderMesh(m, [x, 0.015, -0.3], [x, 0.015, 0.3], 0.016, EQUIP.frame, sk, 14);
  }
}


// ---------------------------------------------------------------- cable system
// a cable column (weight stack + carriage track); local front faces -z. tf maps local points to the rig frame
function towerMesh(m, sk, tf) {
  const B = (lo, hi, col) => { const c = tf(mul(add(lo, hi), 0.5)), a = tf([1, 0, 0]), b = tf([0, 1, 0]), z = tf([0, 0, 1]), o = tf([0, 0, 0]);
    oboxMesh(m, c, [norm(sub(a, o)), norm(sub(b, o)), norm(sub(z, o))], [(hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2, (hi[2] - lo[2]) / 2], col, sk); };
  B([-0.3, 0, -0.25], [0.3, 0.05, 0.3], EQUIP.frame);
  for (const x of [-0.24, 0.24]) B([x - 0.03, 0, 0.1], [x + 0.03, 2.3, 0.16], EQUIP.frame);
  B([-0.27, 2.24, 0.06], [0.27, 2.3, 0.18], EQUIP.frame);
  B([-0.13, 0.05, 0.05], [0.13, 0.85, 0.22], EQUIP.plate);
  B([-0.02, 0.05, 0.02], [0.02, 2.24, 0.05], EQUIP.metal);
  B([-0.05, 0.05, -0.12], [0.05, 2.24, -0.08], EQUIP.frame);
}
const rotY = (a) => (p) => quatRot(quatAxis([0, 1, 0], a), p);
const tfAt = (pos, yaw) => (p) => add(pos, rotY(yaw)(p));
function buildTower(m) { towerMesh(m, slotSkin(SLOT.rig), (p) => p); }
const CROSS = { X: 1.15 };
function buildCrossover(m) {
  const sk = slotSkin(SLOT.rig);
  towerMesh(m, sk, tfAt([CROSS.X, 0, -0.05], Math.PI / 2));
  towerMesh(m, sk, tfAt([-CROSS.X, 0, -0.05], -Math.PI / 2));
  boxMesh(m, [-CROSS.X, 2.24, -0.08], [CROSS.X, 2.3, -0.02], EQUIP.frame, sk);
}
// lat pulldown: seat at z 0, thigh pad, column in front, pulley above the lifter
const LAT = { pulley: [0, 2.35, 0.12], seatY: 0.5 };
function buildLatMachine(m) {
  const sk = slotSkin(SLOT.rig);
  boxMesh(m, [-0.2, LAT.seatY - 0.07, -0.2], [0.2, LAT.seatY, 0.18], EQUIP.pad, sk);
  boxMesh(m, [-0.03, 0.04, -0.05], [0.03, LAT.seatY - 0.07, 0.01], EQUIP.frame, sk);
  boxMesh(m, [-0.03, 0.04, 0.55], [0.03, 2.45, 0.61], EQUIP.frame, sk);
  boxMesh(m, [-0.025, 0.05, -0.05], [0.025, 0.09, 0.6], EQUIP.frame, sk);
  boxMesh(m, [-0.25, 0, 0.45], [0.25, 0.05, 0.75], EQUIP.frame, sk);
  boxMesh(m, [-0.12, 0.05, 0.62], [0.12, 0.85, 0.78], EQUIP.plate, sk);
  boxMesh(m, [-0.025, 2.4, 0.08], [0.025, 2.45, 0.61], EQUIP.frame, sk);
  boxMesh(m, [-0.03, 0.62, 0.14], [0.03, 0.78, 0.2], EQUIP.frame, sk);
  for (const s of [1, -1]) cylinderMesh(m, [s * 0.04, 0.78, 0.17], [s * 0.22, 0.78, 0.17], 0.045, EQUIP.pad, sk, 20, 0.01);
}
// seated row: long seat along z, foot plate, low pulley at the front
const ROW = { pulley: [0, 0.3, 1.02], seatY: 0.42 };
function buildRowMachine(m) {
  const sk = slotSkin(SLOT.rig);
  boxMesh(m, [-0.16, ROW.seatY - 0.07, -0.45], [0.16, ROW.seatY, 0.35], EQUIP.pad, sk);
  for (const z of [-0.4, 0.3]) boxMesh(m, [-0.03, 0.04, z - 0.03], [0.03, ROW.seatY - 0.07, z + 0.03], EQUIP.frame, sk);
  boxMesh(m, [-0.025, 0.04, -0.45], [0.025, 0.09, 1.1], EQUIP.frame, sk);
  oboxMesh(m, [0, 0.27, 0.8], [[1, 0, 0], norm([0, 0.5, -1]), norm([0, 1, 0.5])], [0.25, 0.02, 0.17], EQUIP.frame, sk);
  boxMesh(m, [-0.15, 0, 0.98], [0.15, 0.05, 1.3], EQUIP.frame, sk);
  boxMesh(m, [-0.03, 0.05, 1.05], [0.03, 1.2, 1.11], EQUIP.frame, sk);
  boxMesh(m, [-0.12, 0.05, 1.12], [0.12, 0.85, 1.28], EQUIP.plate, sk);
}
// cables: unit cylinders along +z on pose-driven slots (scaled to length); pulley blocks; rope halves
function buildCables(m) { for (const s of [SLOT.cableA, SLOT.cableB]) cylinderMesh(m, [0, 0, 0], [0, 0, 1], 0.0055, [0.2, 0.22, 0.25], slotSkin(s), 10, 0.0); }
function buildRopes(m) { for (const s of [SLOT.ropeA, SLOT.ropeB]) cylinderMesh(m, [0, 0, 0], [0, 0, 1], 0.013, [0.25, 0.27, 0.3], slotSkin(s), 12, 0.0); }
function buildPulleys(m) {
  for (const s of [SLOT.pulleyA, SLOT.pulleyB]) {
    const sk = slotSkin(s);
    cylinderMesh(m, [-0.018, 0, 0], [0.018, 0, 0], 0.045, EQUIP.metal, sk, 24, 0.006);
    boxMesh(m, [-0.03, 0.03, -0.03], [0.03, 0.09, 0.03], EQUIP.frame, sk);
  }
}
// attachments
const DH = (() => { const f = handFrame(); return { apex: add(f.grip, mul(f.fwd, 0.085)), f }; })();
function buildDHandles(m) {
  const { f, apex } = DH;
  for (const side of ['L', 'R']) {
    const mm = side === 'L' ? (p) => p : mir, sk = rigid(BONE_INDEX['hand' + side]);
    const a = add(f.grip, mul(f.lat, 0.065)), b = add(f.grip, mul(f.lat, -0.065));
    cylinderMesh(m, mm(a), mm(b), 0.016, EQUIP.pad, sk, 16, 0.004);
    capsuleMesh(m, mm(a), mm(apex), 0.007, EQUIP.metal, 1, sk, 8);
    capsuleMesh(m, mm(b), mm(apex), 0.007, EQUIP.metal, 1, sk, 8);
  }
}
function buildStraightBar(m) { const sk = slotSkin(SLOT.barbell); cylinderMesh(m, [-0.28, 0, 0], [0.28, 0, 0], 0.014, EQUIP.metal, sk, 16, 0.003); cylinderMesh(m, [-0.02, 0, 0], [0.02, 0, 0], 0.024, EQUIP.metal, sk, 16); }
function buildLatBar(m) {
  const sk = slotSkin(SLOT.barbell), pts = [[-0.62, -0.1, 0], [-0.5, 0, 0], [0.5, 0, 0], [0.62, -0.1, 0]];
  for (let i = 0; i < 3; i++) capsuleMesh(m, pts[i], pts[i + 1], 0.0135, EQUIP.metal, 1, sk, 12);
  for (const s of [1, -1]) cylinderMesh(m, [s * 0.5, -0.04, 0], [s * 0.6, -0.12, 0], 0.017, EQUIP.pad, sk, 14);
}
function buildVBar(m) {
  const sk = slotSkin(SLOT.barbell);
  for (const s of [1, -1]) { cylinderMesh(m, [s * 0.05, -0.06, 0], [s * 0.05, 0.06, 0], 0.016, EQUIP.pad, sk, 14); capsuleMesh(m, [s * 0.05, 0, 0.0], [0, 0, 0.16], 0.009, EQUIP.metal, 1, sk, 8); }
}


// ---------------------------------------------------------------- selectorized / plate-loaded machines (moving parts on MOV slots)
const MOV = { A: SLOT.cableA, B: SLOT.cableB };
const stackMesh = (m, sk, x, z) => { boxMesh(m, [x - 0.14, 0, z - 0.12], [x + 0.14, 0.05, z + 0.12], EQUIP.frame, sk); boxMesh(m, [x - 0.11, 0.05, z - 0.08], [x + 0.11, 0.8, z + 0.08], EQUIP.plate, sk); boxMesh(m, [x - 0.03, 0.05, z + 0.09], [x + 0.03, 2.0, z + 0.13], EQUIP.frame, sk); };
// upright seat used by pec deck / chest press / shoulder press / abductor: seat top 0.48, back pad at z -0.2
const SEAT = { top: 0.48, backZ: -0.2 };
function seatMesh(m, sk, backH = 0.75, backTilt = 0.08) {
  boxMesh(m, [-0.2, SEAT.top - 0.07, SEAT.backZ], [0.2, SEAT.top, SEAT.backZ + 0.42], EQUIP.pad, sk);
  const c = [0, SEAT.top + backH / 2, SEAT.backZ - 0.04 - Math.sin(backTilt) * backH / 2], up = norm([0, Math.cos(backTilt), -Math.sin(backTilt)]);
  oboxMesh(m, c, [[1, 0, 0], up, norm(cross([1, 0, 0], up))], [0.2, backH / 2, 0.04], EQUIP.pad, sk);
  boxMesh(m, [-0.03, 0.04, SEAT.backZ + 0.15], [0.03, SEAT.top - 0.07, SEAT.backZ + 0.21], EQUIP.frame, sk);
  boxMesh(m, [-0.22, 0, SEAT.backZ - 0.2], [0.22, 0.05, SEAT.backZ + 0.45], EQUIP.frame, sk);
  boxMesh(m, [-0.03, 0.05, SEAT.backZ - 0.2], [0.03, SEAT.top + backH, SEAT.backZ - 0.14], EQUIP.frame, sk);
}
const PEC = { y: 1.08, pivotX: 0.13, pivotZ: -0.06, r: 0.52 };
function buildPecDeck(m) {
  const sk = slotSkin(SLOT.rig); seatMesh(m, sk, 0.85);
  stackMesh(m, sk, 0, SEAT.backZ - 0.42);
  boxMesh(m, [-0.25, PEC.y + 0.42, PEC.pivotZ - 0.05], [0.25, PEC.y + 0.48, PEC.pivotZ + 0.05], EQUIP.frame, sk);
  boxMesh(m, [-0.03, PEC.y + 0.42, SEAT.backZ - 0.5], [0.03, PEC.y + 0.48, PEC.pivotZ], EQUIP.frame, sk);
}
function buildPecArms(m) {
  for (const [slot, sg] of [[MOV.A, 1], [MOV.B, -1]]) {
    const sk = slotSkin(slot), r = PEC.r;
    boxMesh(m, [-0.025, 0, -0.025], [0.025, 0.45, 0.025], EQUIP.frame, sk);
    oboxMesh(m, [sg * r / 2, 0.44, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [r / 2, 0.025, 0.025], EQUIP.frame, sk);
    cylinderMesh(m, [sg * r, 0.44, 0], [sg * r, -0.12, 0], 0.016, EQUIP.metal, sk, 14);
    cylinderMesh(m, [sg * r, 0.08, 0], [sg * r, -0.1, 0], 0.024, EQUIP.pad, sk, 16, 0.004);
  }
}
// chest press / shoulder press: handles slide on rails; moving handle bars on MOV slots
function buildChestPress(m) {
  const sk = slotSkin(SLOT.rig); seatMesh(m, sk, 0.85);
  stackMesh(m, sk, 0, SEAT.backZ - 0.42);
  for (const s of [1, -1]) { boxMesh(m, [s * 0.36 - 0.025, 1.04, -0.05], [s * 0.36 + 0.025, 1.08, 0.62], EQUIP.metal, sk); boxMesh(m, [s * 0.36 - 0.03, 0.04, 0.58], [s * 0.36 + 0.03, 1.08, 0.64], EQUIP.frame, sk); }
}
function buildShoulderPress(m) {
  const sk = slotSkin(SLOT.rig); seatMesh(m, sk, 0.9, 0.04);
  stackMesh(m, sk, 0, SEAT.backZ - 0.42);
  for (const s of [1, -1]) boxMesh(m, [s * 0.4 - 0.025, 0.9, -0.04], [s * 0.4 + 0.025, 1.95, 0.0], EQUIP.metal, sk);
}
function buildPressHandles(m) {
  for (const [slot, sg] of [[MOV.A, 1], [MOV.B, -1]]) {
    const sk = slotSkin(slot);
    cylinderMesh(m, [sg * 0.03, 0, 0], [sg * 0.16, 0, 0], 0.017, EQUIP.pad, sk, 16, 0.004);
    boxMesh(m, [sg * 0.16, -0.03, -0.03], [sg * 0.26, 0.03, 0.03], EQUIP.frame, sk);
  }
}
// leg press 45°: reclined seat at the origin, sled on rails going up-forward (rail dir r)
const LP = { a: 0.75, H: [0, 0.48, 0], r: norm([0, 1, 1]) };
function buildLegPress(m) {
  const sk = slotSkin(SLOT.rig), { a, H, r } = LP, dir = [0, Math.sin(a), -Math.cos(a)];
  oboxMesh(m, add(H, [0, -0.04, 0.12]), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0.22, 0.04, 0.17], EQUIP.pad, sk);
  const bc = add(H, mul(dir, 0.42)), bn = norm(cross([1, 0, 0], dir));
  oboxMesh(m, add(bc, mul(bn, -0.045)), [[1, 0, 0], bn, dir], [0.22, 0.04, 0.38], EQUIP.pad, sk);
  boxMesh(m, [-0.3, 0, -0.65], [0.3, 0.05, 1.6], EQUIP.frame, sk);
  boxMesh(m, [-0.05, 0.05, -0.15], [0.05, 0.42, 0.25], EQUIP.frame, sk);
  for (const s of [1, -1]) { const a0 = [s * 0.32, 0.25, 0.35], a1 = add(a0, mul(r, 1.4)); oboxMesh(m, mul(add(a0, a1), 0.5), [[1, 0, 0], norm(cross([1, 0, 0], r)), r], [0.025, 0.025, 0.7], EQUIP.metal, sk); boxMesh(m, [s * 0.32 - 0.03, 0.05, a1[2] - 0.03], [s * 0.32 + 0.03, a1[1], a1[2] + 0.03], EQUIP.frame, sk); }
}
function buildLegPressSled(m) {
  const sk = slotSkin(MOV.A), r = LP.r, up = norm(cross([1, 0, 0], r));
  oboxMesh(m, mul(r, 0.03), [[1, 0, 0], up, r], [0.34, 0.3, 0.025], EQUIP.frame, sk);
  for (const s of [1, -1]) { oboxMesh(m, add([s * 0.32, 0, 0], mul(r, 0.08)), [[1, 0, 0], up, r], [0.04, 0.12, 0.06], EQUIP.metal, sk); cylinderMesh(m, add([s * 0.36, 0, 0], mul(up, -0.1)), add([s * 0.5, 0, 0], mul(up, -0.1)), 0.025, EQUIP.metal, sk, 16); cylinderMesh(m, add([s * 0.38, 0, 0], mul(up, -0.1)), add([s * 0.42, 0, 0], mul(up, -0.1)), 0.2, EQUIP.plate, sk, 44, 0.01); }
}
// hack squat: fixed foot plate, sled (back pad + shoulder pads) on rails leaning back 45°
const HACK = { r: norm([0, 1, -1]), foot: [0, 0.12, 0.38], tilt: 0.3 };
function buildHackSquat(m) {
  const sk = slotSkin(SLOT.rig), { r, foot, tilt } = HACK;
  oboxMesh(m, add(foot, [0, -0.06, 0]), [[1, 0, 0], norm([0, Math.cos(tilt), -Math.sin(tilt)]), norm([0, Math.sin(tilt), Math.cos(tilt)])], [0.32, 0.025, 0.24], EQUIP.frame, sk);
  boxMesh(m, [-0.35, 0, -1.2], [0.35, 0.05, 0.65], EQUIP.frame, sk);
  for (const s of [1, -1]) { const a0 = [s * 0.3, 0.2, 0.15], a1 = add(a0, mul(r, 2.0)); oboxMesh(m, mul(add(a0, a1), 0.5), [[1, 0, 0], norm(cross([1, 0, 0], r)), r], [0.025, 0.025, 1.0], EQUIP.metal, sk); boxMesh(m, [s * 0.3 - 0.03, 0.05, a1[2] - 0.03], [s * 0.3 + 0.03, a1[1], a1[2] + 0.03], EQUIP.frame, sk); }
}
function buildHackSled(m) {
  const sk = slotSkin(MOV.A), r = HACK.r, f = norm(cross(r, [1, 0, 0]));
  oboxMesh(m, add(mul(r, -0.2), mul(f, 0.035)), [[1, 0, 0], r, f], [0.2, 0.42, 0.035], EQUIP.pad, sk);
  for (const s of [1, -1]) oboxMesh(m, add(add([s * 0.13, 0, 0], mul(r, 0.24)), mul(f, -0.06)), [[1, 0, 0], r, f], [0.06, 0.04, 0.09], EQUIP.pad, sk);
  for (const s of [1, -1]) oboxMesh(m, add(add([s * 0.27, 0, 0], mul(r, -0.2)), mul(f, 0.08)), [[1, 0, 0], r, f], [0.05, 0.4, 0.02], EQUIP.frame, sk);
}
// leg extension / leg curl: knee-axis lever on MOV.A (built pointing down along the shin)
function buildLegExtension(m) {
  const sk = slotSkin(SLOT.rig);
  boxMesh(m, [-0.2, 0.43, -0.3], [0.2, 0.5, 0.2], EQUIP.pad, sk);
  oboxMesh(m, [0, 0.82, -0.36], [[1, 0, 0], norm([0, 1, -0.3]), norm([0, 0.3, 1])], [0.2, 0.33, 0.04], EQUIP.pad, sk);
  boxMesh(m, [-0.03, 0.04, -0.1], [0.03, 0.43, -0.04], EQUIP.frame, sk); boxMesh(m, [-0.24, 0, -0.45], [0.24, 0.05, 0.3], EQUIP.frame, sk);
  for (const s of [1, -1]) boxMesh(m, [s * 0.24 - 0.02, 0.42, -0.1], [s * 0.24 + 0.02, 0.46, 0.08], EQUIP.metal, sk);
  stackMesh(m, sk, -0.5, -0.1);
}
const lever = (m, sk, side) => {
  boxMesh(m, [0.24, -0.02, -0.02], [0.28, 0.02, 0.02], EQUIP.frame, sk);
  boxMesh(m, [0.24, -0.4, -0.02], [0.28, 0.0, 0.02], EQUIP.frame, sk);
  cylinderMesh(m, [-0.24, 0, 0], [0.28, 0, 0], 0.03, EQUIP.metal, sk, 16);
  cylinderMesh(m, [-0.2, -0.38, side * 0.07], [0.24, -0.38, side * 0.07], 0.045, EQUIP.pad, sk, 22, 0.008);
};
function buildExtLever(m) { lever(m, slotSkin(MOV.A), 1); }
function buildLegCurl(m) {
  const sk = slotSkin(SLOT.rig);
  oboxMesh(m, [0, 0.72, 0.35], [[1, 0, 0], norm([0, 1, -0.15]), norm([0, 0.15, 1])], [0.2, 0.04, 0.55], EQUIP.pad, sk);
  for (const z of [-0.1, 0.75]) { boxMesh(m, [-0.03, 0.04, z - 0.03], [0.03, 0.68, z + 0.03], EQUIP.frame, sk); boxMesh(m, [-0.22, 0, z - 0.035], [0.22, 0.045, z + 0.035], EQUIP.frame, sk); }
  for (const s of [1, -1]) cylinderMesh(m, [s * 0.18, 0.6, 0.82], [s * 0.18, 0.6, 0.95], 0.016, EQUIP.pad, sk, 14);
  stackMesh(m, sk, 0.5, -0.3);
}
function buildCurlLever(m) { lever(m, slotSkin(MOV.A), -1); }
// hip abductor / adductor: seat + reclined back, thigh pads on both sides of each knee (rotate with the thigh)
function buildHipMachine(m) { const sk = slotSkin(SLOT.rig); seatMesh(m, sk, 0.75, 0.3); stackMesh(m, sk, 0, SEAT.backZ - 0.45); for (const s of [1, -1]) boxMesh(m, [s * 0.16 - 0.03, 0.12, 0.4], [s * 0.16 + 0.03, 0.16, 0.6], EQUIP.metal, sk); }
function buildHipPads(m) {
  for (const [slot, sg] of [[MOV.A, 1], [MOV.B, -1]]) {
    const sk = slotSkin(slot);
    for (const o of [0.1, -0.1]) oboxMesh(m, [sg * o, 0, 0.33], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0.025, 0.08, 0.1], EQUIP.pad, sk);
    boxMesh(m, [sg * 0.1 - 0.015, -0.3, 0.3], [sg * 0.1 + 0.015, 0, 0.34], EQUIP.frame, sk);
  }
}
// calf raise: step + shoulder yoke (standing) / knee pad (seated) on MOV.A
function buildCalfStanding(m) {
  const sk = slotSkin(SLOT.rig);
  boxMesh(m, [-0.3, 0, -0.05], [0.3, 0.12, 0.25], EQUIP.frame, sk);
  for (const s of [1, -1]) boxMesh(m, [s * 0.42 - 0.03, 0, -0.3], [s * 0.42 + 0.03, 2.1, -0.24], EQUIP.frame, sk);
  boxMesh(m, [-0.45, 2.05, -0.3], [0.45, 2.1, -0.24], EQUIP.frame, sk);
  stackMesh(m, sk, 0, -0.55);
}
function buildCalfYoke(m) {
  const sk = slotSkin(MOV.A);
  for (const s of [1, -1]) { oboxMesh(m, [s * 0.14, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0.07, 0.035, 0.09], EQUIP.pad, sk); cylinderMesh(m, [s * 0.2, 0.05, 0.06], [s * 0.2, 0.18, 0.06], 0.016, EQUIP.pad, sk, 12); }
  boxMesh(m, [-0.45, 0.04, -0.2], [0.45, 0.08, -0.16], EQUIP.frame, sk); boxMesh(m, [-0.03, 0.04, -0.2], [0.03, 0.08, 0.0], EQUIP.frame, sk);
}
function buildCalfSeated(m) {
  const sk = slotSkin(SLOT.rig);
  boxMesh(m, [-0.18, 0.43, -0.25], [0.18, 0.5, 0.15], EQUIP.pad, sk);
  boxMesh(m, [-0.25, 0, -0.3], [0.25, 0.05, 0.7], EQUIP.frame, sk);
  boxMesh(m, [-0.03, 0.05, -0.05], [0.03, 0.43, 0.01], EQUIP.frame, sk);
  boxMesh(m, [-0.25, 0.05, 0.38], [0.25, 0.12, 0.62], EQUIP.frame, sk);
  boxMesh(m, [-0.03, 0.05, 0.62], [0.03, 0.75, 0.68], EQUIP.frame, sk);
}
function buildCalfKneePad(m) {
  const sk = slotSkin(MOV.A);
  cylinderMesh(m, [-0.24, 0, 0], [0.24, 0, 0], 0.05, EQUIP.pad, sk, 22, 0.01);
  boxMesh(m, [-0.03, -0.03, 0.0], [0.03, 0.03, 0.34], EQUIP.frame, sk);
}
// chest-supported T-bar row: inclined chest pad + foot plate; lever on MOV.A from a front pivot
const TBAR = { pivot: [0, 0.12, 1.35], pad: [0, 1.0, 0.25], n: norm([0, 0.77, -0.64]) };
function buildTBar(m) {
  const sk = slotSkin(SLOT.rig);
  oboxMesh(m, TBAR.pad, [[1, 0, 0], TBAR.n, norm(cross(TBAR.n, [1, 0, 0])).map((v) => -v)], [0.17, 0.04, 0.3], EQUIP.pad, sk);
  boxMesh(m, [-0.03, 0.04, 0.0], [0.03, 0.85, 0.06], EQUIP.frame, sk);
  oboxMesh(m, [0, 0.12, -0.42], [[1, 0, 0], norm([0, 1, -0.3]), norm([0, 0.3, 1])], [0.25, 0.02, 0.15], EQUIP.frame, sk);
  boxMesh(m, [-0.25, 0, -0.6], [0.25, 0.05, 1.45], EQUIP.frame, sk);
  boxMesh(m, [-0.06, 0.05, 1.3], [0.06, 0.16, 1.4], EQUIP.metal, sk);
}
function buildTBarLever(m) {
  const sk = slotSkin(MOV.A), L = 1.3; // local +z from the pivot toward the handles
  cylinderMesh(m, [0, 0, 0], [0, 0, L], 0.022, EQUIP.metal, sk, 16);
  cylinderMesh(m, [-0.22, 0, L], [0.22, 0, L], 0.016, EQUIP.pad, sk, 14);
  cylinderMesh(m, [0, 0, 0.8], [0, 0.1, 0.75], 0.025, EQUIP.metal, sk, 14);
  cylinderMesh(m, [-0.03, 0.1, 0.75], [0.03, 0.1, 0.75], 0.2, EQUIP.plate, sk, 44, 0.01);
}


// ---------------------------------------------------------------- flexible ropes (16 pose-driven segments) + small extras
const ROPE_SEG0 = 32, ROPE_SEGS = 16;
// smooth rope: one tube skinned to N control-point slots with clamped uniform cubic B-spline weights
// (each slot = a point on the rope + frame with local z along the tangent; the pose sets them via xf)
function buildRopeSpline(m, r, slot0, N, sides = 10, perSeg = 6) {
  const rings = [], skins = [], S0 = -1, S1 = N, steps = (S1 - S0) * perSeg;
  for (let k = 0; k <= steps; k++) {
    const s = S0 + (S1 - S0) * k / steps, kk = Math.min(N - 1, Math.floor(s)), u = s - kk;
    const b = [(1 - u) ** 3 / 6, (3 * u ** 3 - 6 * u ** 2 + 4) / 6, (-3 * u ** 3 + 3 * u ** 2 + 3 * u + 1) / 6, u ** 3 / 6], w = {};
    for (let j = 0; j < 4; j++) { const ix = Math.max(0, Math.min(N - 1, kk - 1 + j)); w[ix] = (w[ix] || 0) + b[j]; }
    const ent = Object.entries(w).sort((x, y) => y[1] - x[1]).slice(0, 4), tot = ent.reduce((a, e) => a + e[1], 0);
    const skin = { idx: [0, 0, 0, 0], w: [0, 0, 0, 0] };
    ent.forEach(([ix, wt], j) => { skin.idx[j] = slot0 + (+ix); skin.w[j] = wt / tot; });
    const z = (s - (S0 + S1) / 2) * 1e-4, pts = [];
    for (let i = 0; i <= sides; i++) { const a = 2 * Math.PI * i / sides; pts.push([r * Math.cos(a), r * Math.sin(a), z]); }
    rings.push({ pts, v: k / steps }); skins.push(skin);
  }
  const order = []; for (const sk of skins) for (let i = 0; i <= sides; i++) order.push(sk);
  order.push(skins[0], skins[skins.length - 1]);
  let n = 0;
  ringsMesh(m, rings, [0.22, 0.24, 0.27], 1, () => order[n++], 1, null, true);
}
function buildJumpHandles(m) {
  const f = handFrame();
  for (const side of ['L', 'R']) {
    const mm = side === 'L' ? (p) => p : mir, sk = rigid(BONE_INDEX['hand' + side]);
    cylinderMesh(m, mm(add(f.grip, mul(f.lat, -0.07))), mm(add(f.grip, mul(f.lat, 0.07))), 0.014, EQUIP.pad, sk, 14, 0.004);
  }
}
function buildRopeAnchor(m) {
  const sk = slotSkin(SLOT.rig);
  boxMesh(m, [-0.2, 0, -0.2], [0.2, 0.06, 0.2], EQUIP.frame, sk);
  cylinderMesh(m, [0, 0.06, 0], [0, 0.35, 0], 0.05, EQUIP.metal, sk, 18);
}
function buildMedBall(m) { ellipsoidMesh(m, [0, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0.11, 0.11, 0.11], [0.36, 0.40, 0.46], 1, slotSkin(SLOT.barbell), 32, 20); }
function buildWall(m) { boxMesh(m, [-1.1, 0, 0], [1.1, 2.4, 0.12], [0.86, 0.87, 0.89], slotSkin(SLOT.rig)); }

// ---------------------------------------------------------------- assemble
function buildEcorche() {
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const rnd = mulberry(1337);
  const parts = []; // {id, mesh}
  const muscles = [{ id: 0, key: 'none' }];
  for (const def of MUSCLES) {
    for (const side of def.center ? ['C'] : ['L', 'R']) {
      if (def.bone) { const { mesh } = buildMuscle(def, side, rnd); parts.push({ id: 0, mesh, kind: 'plaster' }); continue; }
      const id = muscles.length;
      const grp = GROUPS.find((g) => g.id === def.group);
      const { mesh, anchor } = buildMuscle(def, side === 'C' ? 'L' : side, rnd, grp ? hexRGB(grp.color) : null);
      muscles.push({ id, key: def.key, side, name: def.name, part: def.part || null, group: def.group, anchor, tendon: !!def.tendon });
      parts.push({ id, mesh });
    }
  }
  const deep = new MeshBuf(); buildDeepBody(deep); deep.computeNormals(); parts.push({ id: 0, mesh: deep, kind: 'deep' });
  const plaster = new MeshBuf(); buildPlaster(plaster); plaster.computeNormals(); parts.push({ id: 0, mesh: plaster, kind: 'plaster' });
  const extra = (id, fn) => { const mb = new MeshBuf(); fn(mb); mb.computeNormals(); parts.push({ id, mesh: mb, kind: id === PART_ID.handsOpen ? 'plaster' : 'prop' }); };
  extra(PART_ID.handsOpen, (mb) => { buildHand(mb, 'L'); buildHand(mb, 'R'); });
  extra(PART_ID.handsFist, (mb) => { buildFist(mb, 'L'); buildFist(mb, 'R'); });
  extra(PART_ID.bench, buildBench);
  extra(PART_ID.barbell, buildBarbell);
  extra(PART_ID.dumbbells, (mb) => buildDumbbells(mb, ['L']));
  extra(PART_ID.dumbbellR, (mb) => buildDumbbells(mb, ['R']));
  extra(PART_ID.rack, buildRack); extra(PART_ID.adjSeat, buildAdjSeat); extra(PART_ID.adjBack, buildAdjBack); extra(PART_ID.decline, buildDecline);
  extra(PART_ID.pullup, buildPullup); extra(PART_ID.ezbar, buildEZ); extra(PART_ID.box, buildBox);
  extra(PART_ID.kbSwing, (mb) => buildKettlebell(mb, 'swing')); extra(PART_ID.kbRack, (mb) => buildKettlebell(mb, 'rack'));
  extra(PART_ID.dip, buildDipStation); extra(PART_ID.rings, buildRings); extra(PART_ID.trapbar, buildTrapBar); extra(PART_ID.backext, buildBackExt);
  extra(PART_ID.cables, buildCables); extra(PART_ID.pulleys, buildPulleys); extra(PART_ID.ropes, buildRopes); extra(PART_ID.crossover, buildCrossover);
  extra(PART_ID.tower, buildTower); extra(PART_ID.latMachine, buildLatMachine); extra(PART_ID.rowMachine, buildRowMachine); extra(PART_ID.dhandles, buildDHandles);
  extra(PART_ID.straightBar, buildStraightBar); extra(PART_ID.latBar, buildLatBar); extra(PART_ID.vBar, buildVBar);
  for (const [k, f] of [['pecDeck', buildPecDeck], ['pecArms', buildPecArms], ['chestPress', buildChestPress], ['shoulderPress', buildShoulderPress], ['pressHandles', buildPressHandles],
    ['legPress', buildLegPress], ['legPressSled', buildLegPressSled], ['hack', buildHackSquat], ['hackSled', buildHackSled], ['legExt', buildLegExtension], ['extLever', buildExtLever],
    ['legCurl', buildLegCurl], ['curlLever', buildCurlLever], ['hipMachine', buildHipMachine], ['hipPads', buildHipPads], ['calfStand', buildCalfStanding], ['calfYoke', buildCalfYoke],
    ['calfSeat', buildCalfSeated], ['calfKnee', buildCalfKneePad], ['tbar', buildTBar], ['tbarLever', buildTBarLever]]) extra(PART_ID[k], f);
  extra(PART_ID.ropeThin, (mb) => buildRopeSpline(mb, 0.0055, ROPE_SEG0, ROPE_SEGS, 8, 5)); extra(PART_ID.ropeThick, (mb) => { buildRopeSpline(mb, 0.02, ROPE_SEG0, 8, 12); buildRopeSpline(mb, 0.02, ROPE_SEG0 + 8, 8, 12); });
  extra(PART_ID.jumpHandles, buildJumpHandles); extra(PART_ID.ropeAnchor, buildRopeAnchor); extra(PART_ID.wall, buildWall); extra(PART_ID.medBall, buildMedBall);
  extra(PART_ID.lmBase, buildLandmineBase); extra(PART_ID.lmBar, buildLandmineBar); extra(PART_ID.preacher, buildPreacher); extra(PART_ID.abwheel, buildAbWheel); extra(PART_ID.parallettes, buildParallettes); extra(PART_ID.kbGoblet, (mb) => buildKettlebell(mb, 'goblet'));
  extra(PART_ID.mat, buildMat);
  extra(PART_ID.dumbbell1, buildDumbbellSingle);
  // merge
  let nv = 0, ni = 0; parts.forEach((p) => { nv += p.mesh.count; ni += p.mesh.idx.length; });
  const out = {
    position: new Float32Array(nv * 3), normal: new Float32Array(nv * 3), color: new Uint8Array(nv * 4), misc: new Float32Array(nv * 3),
    muscleId: new Uint16Array(nv), skinIndex: new Uint8Array(nv * 4), skinWeight: new Uint8Array(nv * 4), index: new Uint32Array(ni),
    ranges: [],
  };
  let vo = 0, io = 0;
  for (const p of parts) {
    const m = p.mesh, c = m.count;
    out.position.set(m.pos, vo * 3); out.normal.set(m.nor, vo * 3); out.color.set(m.col, vo * 4); out.misc.set(m.misc, vo * 3);
    out.muscleId.fill(p.id, vo, vo + c); out.skinIndex.set(m.si, vo * 4); out.skinWeight.set(m.sw, vo * 4);
    for (let k = 0; k < m.idx.length; k++) out.index[io + k] = m.idx[k] + vo;
    out.ranges.push({ id: p.id, kind: p.kind || 'muscle', vertexStart: vo, vertexCount: c, indexStart: io, indexCount: m.idx.length });
    vo += c; io += m.idx.length;
  }
  return {
    geometry: out,
    muscles,
    groups: GROUPS,
    bones: BONES.map((b) => ({ name: b.name, parent: b.parentIndex, pivot: b.pivot })),
    stats: { vertices: nv, triangles: ni / 3, fascicles: MUSCLES.reduce((a, d) => a + d.n * (d.center ? 1 : 2), 0), ms: Math.round((typeof performance !== 'undefined' ? performance : Date).now() - t0) },
  };
}
// ---------------------------------------------------------------- mat4 (column-major)
const M4 = {
  ident: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  trans(v) { const m = M4.ident(); m[12] = v[0]; m[13] = v[1]; m[14] = v[2]; return m; },
  quat(q) {
    const [x, y, z, w] = q, m = M4.ident();
    m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y + z * w); m[2] = 2 * (x * z - y * w);
    m[4] = 2 * (x * y - z * w); m[5] = 1 - 2 * (x * x + z * z); m[6] = 2 * (y * z + x * w);
    m[8] = 2 * (x * z + y * w); m[9] = 2 * (y * z - x * w); m[10] = 1 - 2 * (x * x + y * y);
    return m;
  },
  persp(fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m;
  },
  look(e, c, up) {
    const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
  },
  xf(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; },
  xf4(m, p) { return [0, 1, 2, 3].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]); },
  xn(m, n) { return norm([m[0] * n[0] + m[4] * n[1] + m[8] * n[2], m[1] * n[0] + m[5] * n[1] + m[9] * n[2], m[2] * n[0] + m[6] * n[1] + m[10] * n[2]]); },
};
const quatAxis = (ax, a) => { const s = Math.sin(a / 2), n = norm(ax); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(a / 2)]; };
const quatMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];

// ---------------------------------------------------------------- shaders
const VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec4 aCol;
layout(location=3) in vec3 aMisc; layout(location=4) in uint aId; layout(location=5) in uvec4 aSI; layout(location=6) in vec4 aSW;
uniform mat4 uVP; uniform mat4 uBones[48]; uniform sampler2D uState2;
out vec3 vPos; out vec3 vNor; out vec4 vCol; out vec3 vMisc; flat out int vId;
void main(){
  float ws = max(1e-4, aSW.x + aSW.y + aSW.z + aSW.w);
  mat4 sk = (uBones[aSI.x]*aSW.x + uBones[aSI.y]*aSW.y + uBones[aSI.z]*aSW.z + uBones[aSI.w]*aSW.w) * (1.0/ws);
  float tendV = aCol.a > 0.97 ? 1.0 : aCol.a / 0.95;
  float bul = texelFetch(uState2, ivec2(int(aId), 0), 0).r * 0.009 * (1.0 - tendV);
  vec4 wp = sk * vec4(aPos + aNor * bul, 1.0);
  vPos = wp.xyz; vNor = normalize(mat3(sk) * aNor); vCol = aCol; vMisc = aMisc; vId = int(aId);
  gl_Position = uVP * wp;
}`;
const FS = `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNor; in vec4 vCol; in vec3 vMisc; flat in int vId;
uniform sampler2D uState; uniform vec3 uCam; uniform float uDark; uniform vec3 uAccent;
out vec4 o;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){
  vec4 st = texelFetch(uState, ivec2(vId, 0), 0);
  if (st.a < 0.5) discard;
  bool plaster = vCol.a > 0.97;
  float tend = plaster ? 0.0 : clamp(vCol.a/0.95, 0.0, 1.0);
  vec3 alb = pow(vCol.rgb, vec3(2.2));
  vec3 N = normalize(vNor);
  if (!gl_FrontFacing) N = -N;
  // very soft fibre direction hint in the albedo only (no bump): keeps the clay surface smooth
  if (!plaster) alb *= 0.965 + 0.05 * vnoise(vec2(vMisc.x*9.0, vMisc.y*3.0));
  float ao = vMisc.z;
  float emph = st.r, hov = st.g, dim = st.b;
  vec3 ghost = mix(vec3(0.70, 0.72, 0.75), vec3(0.17, 0.19, 0.21), uDark);
  float lum = dot(alb, vec3(0.3, 0.55, 0.15));
  alb = mix(alb, ghost * (0.8 + 0.5*lum), dim * (plaster ? 0.3 : 0.97));
  // selected group: richer, slightly deeper version of its own colour so it reads against the grey
  alb = mix(alb, pow(alb, vec3(1.45)) * 1.08, emph * (1.0 - tend*0.5));
  vec3 V = normalize(uCam - vPos);
  vec3 L1 = normalize(vec3(0.4, 0.85, 0.7)), L2 = normalize(vec3(-0.7, 0.3, 0.45)), L3 = normalize(vec3(0.1, 0.5, -1.0));
  float wrap = 0.45;
  float d1 = max(0.0, (dot(N, L1) + wrap) / (1.0 + wrap)), d2 = max(0.0, (dot(N, L2) + wrap) / (1.0 + wrap)), d3 = max(0.0, dot(N, L3));
  vec3 hemi = mix(vec3(0.30, 0.28, 0.28), vec3(0.62, 0.64, 0.68), N.y*0.5 + 0.5);
  vec3 col = alb * (hemi*0.75*ao + vec3(1.0, 0.98, 0.95)*0.92*d1*mix(0.6, 1.0, ao) + vec3(0.75, 0.8, 0.9)*0.28*d2*ao + vec3(0.85)*0.22*d3*ao);
  vec3 H1 = normalize(L1 + V);
  float spa = (plaster ? 0.04 : mix(0.06, 0.09, tend)) * (1.0 - dim*0.6);
  float sp = pow(max(0.0, dot(N, H1)), 24.0) * spa;
  float fr = pow(1.0 - max(0.0, dot(N, V)), 3.0);
  col += vec3(sp) * ao + fr * 0.05 * ao;
  col += uAccent * fr * hov * 1.2 + alb * hov * 0.22;
  col = aces(col * 0.98);
  o = vec4(pow(col, vec3(1.0/2.2)), 1.0);
}`;
const FS_PICK = `#version 300 es
precision highp float;
flat in int vId; in vec3 vPos; in vec3 vNor; in vec4 vCol; in vec3 vMisc;
uniform sampler2D uState;
out vec4 o;
void main(){
  vec4 st = texelFetch(uState, ivec2(vId, 0), 0);
  if (st.a < 0.5) discard;
  o = vec4(float(vId & 255)/255.0, float((vId >> 8) & 255)/255.0, 0.0, 1.0);
}`;
const VS_SH = `#version 300 es
layout(location=0) in vec2 aQ; uniform mat4 uVP; uniform vec3 uC; uniform vec2 uR; out vec2 vQ;
void main(){ vQ = aQ; gl_Position = uVP * vec4(uC.x + aQ.x*uR.x, 0.0, uC.z + aQ.y*uR.y, 1.0); }`;
const FS_SH = `#version 300 es
precision highp float; in vec2 vQ; uniform float uA; out vec4 o;
void main(){ float d = length(vQ); float a = (1.0 - smoothstep(0.0, 1.0, d)); a = a*a*uA; o = vec4(0.0, 0.0, 0.0, a); }`;

// ---------------------------------------------------------------- viewer
function createEcorcheViewer(canvas, opts = {}) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  if (!gl) throw new Error('WebGL2 tidak tersedia di browser ini.');
  const model = opts.model || buildEcorche();
  const G = model.geometry;

  const compile = (vs, fs) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const nm = info.name.replace('[0]', ''); u[nm] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  };
  const prog = compile(VS, FS), pick = compile(VS, FS_PICK), shp = compile(VS_SH, FS_SH);

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = (data, loc, size, type, normalized, integer) => {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    if (integer) gl.vertexAttribIPointer(loc, size, type, 0, 0); else gl.vertexAttribPointer(loc, size, type, normalized, 0, 0);
  };
  buf(G.position, 0, 3, gl.FLOAT, false); buf(G.normal, 1, 3, gl.FLOAT, false); buf(G.color, 2, 4, gl.UNSIGNED_BYTE, true);
  buf(G.misc, 3, 3, gl.FLOAT, false); buf(G.muscleId, 4, 1, gl.UNSIGNED_SHORT, false, true);
  buf(G.skinIndex, 5, 4, gl.UNSIGNED_BYTE, false, true); buf(G.skinWeight, 6, 4, gl.UNSIGNED_BYTE, true);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, G.index, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  const svao = gl.createVertexArray(); gl.bindVertexArray(svao);
  const sb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);

  // per-muscle state texture
  const stateData = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) stateData[i * 4 + 3] = 255;
  const stateTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, stateTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, stateData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const target = { emph: new Float32Array(256), hov: new Float32Array(256), dim: new Float32Array(256) };
  const cur = { emph: new Float32Array(256), hov: new Float32Array(256), dim: new Float32Array(256) };
  const hidden = new Uint8Array(256);
  const PROP_PARTS = { bench: [PART_ID.bench], barbell: [PART_ID.barbell], dumbbells: [PART_ID.dumbbells, PART_ID.dumbbellR], dumbbellL: [PART_ID.dumbbells], mat: [PART_ID.mat], dumbbell1: [PART_ID.dumbbell1],
    rack: [PART_ID.rack], adjBench: [PART_ID.adjSeat, PART_ID.adjBack], decline: [PART_ID.decline], pullup: [PART_ID.pullup], ezbar: [PART_ID.ezbar],
    kbSwing: [PART_ID.kbSwing], kbGoblet: [PART_ID.kbGoblet], box: [PART_ID.box], kbRack: [PART_ID.kbRack], dip: [PART_ID.dip], rings: [PART_ID.rings],
    trapbar: [PART_ID.trapbar], backext: [PART_ID.backext], landmine: [PART_ID.lmBase, PART_ID.lmBar], preacher: [PART_ID.preacher], abwheel: [PART_ID.abwheel], parallettes: [PART_ID.parallettes],
    cables: [PART_ID.cables, PART_ID.pulleys], ropes: [PART_ID.ropes], crossover: [PART_ID.crossover], tower: [PART_ID.tower], latMachine: [PART_ID.latMachine], rowMachine: [PART_ID.rowMachine],
    dhandles: [PART_ID.dhandles], straightBar: [PART_ID.straightBar], latBar: [PART_ID.latBar], vBar: [PART_ID.vBar],
    pecDeck: [PART_ID.pecDeck, PART_ID.pecArms], chestPress: [PART_ID.chestPress, PART_ID.pressHandles], shoulderPress: [PART_ID.shoulderPress, PART_ID.pressHandles],
    legPress: [PART_ID.legPress, PART_ID.legPressSled], hack: [PART_ID.hack, PART_ID.hackSled], legExt: [PART_ID.legExt, PART_ID.extLever], legCurl: [PART_ID.legCurl, PART_ID.curlLever],
    hipMachine: [PART_ID.hipMachine, PART_ID.hipPads], calfStand: [PART_ID.calfStand, PART_ID.calfYoke], calfSeat: [PART_ID.calfSeat, PART_ID.calfKnee], tbar: [PART_ID.tbar, PART_ID.tbarLever],
    jumpRope: [PART_ID.ropeThin, PART_ID.jumpHandles], battleRopes: [PART_ID.ropeThick, PART_ID.ropeAnchor], wall: [PART_ID.wall], medBall: [PART_ID.medBall] };
  const ALL_PROPS = [...new Set(Object.values(PROP_PARTS).flat())];
  [PART_ID.handsFist, ...ALL_PROPS].forEach((i) => { hidden[i] = 1; });
  let matPos = [0, 0, 0], benchXf = M4.ident(), rigXf = M4.ident(), backXf = M4.ident(), poseXf = {};
  const bulge = new Float32Array(256), state2 = new Uint8Array(256 * 4);
  const stateTex2 = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, stateTex2);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, state2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // pick target
  let pfb = null, ptex = null, pdepth = null, pw = 0, ph = 0;
  function ensurePick() {
    const w = Math.max(1, canvas.width >> 1), h = Math.max(1, canvas.height >> 1);
    if (pfb && w === pw && h === ph) return;
    pw = w; ph = h;
    if (!pfb) { pfb = gl.createFramebuffer(); ptex = gl.createTexture(); pdepth = gl.createRenderbuffer(); }
    gl.bindTexture(gl.TEXTURE_2D, ptex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindRenderbuffer(gl.RENDERBUFFER, pdepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, pfb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ptex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, pdepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ---------------- skeleton / pose
  const bones = model.bones;
  const rot = bones.map(() => [0, 0, 0, 1]);
  let rootOffset = [0, 0, 0], rootPos = [0, 0, 0], rootRot = [0, 0, 0, 1];
  let boneMats = bones.map(() => M4.ident());
  const boneArr = new Float32Array(48 * 16);
  function computeBones() {
    const world = [];
    bones.forEach((b, i) => {
      const local = M4.mul(M4.trans(b.pivot), M4.mul(M4.quat(rot[i]), M4.trans(mul(b.pivot, -1))));
      if (b.parent < 0) {
        const g = M4.mul(M4.trans(add(rootPos, b.pivot)), M4.mul(M4.quat(rootRot), M4.trans(mul(b.pivot, -1))));
        world[i] = M4.mul(g, M4.mul(M4.trans(rootOffset), local));
      } else world[i] = M4.mul(world[b.parent], local);
    });
    return world;
  }
  function updateBones(plantFeet) {
    rootOffset = [0, 0, 0];
    let w = computeBones();
    if (plantFeet) {
      const fl = BONE_INDEX.footL, fr = BONE_INDEX.footR;
      const a = M4.xf(w[fl], bones[fl].pivot), b = M4.xf(w[fr], bones[fr].pivot);
      const avg = mul(add(sub(bones[fl].pivot, a), sub(bones[fr].pivot, b)), 0.5);
      rootOffset = avg; w = computeBones();
    }
    boneMats = w;
    w.forEach((m, i) => boneArr.set(m, i * 16));
    for (let i = w.length; i < 48; i++) boneArr.set(M4.ident(), i * 16);
    // barbell follows the midpoint of both grips
    const gl_ = M4.xf(w[BONE_INDEX.handL], GRIP_L), gr_ = M4.xf(w[BONE_INDEX.handR], mir(GRIP_L));
    boneArr.set(M4.trans(mul(add(gl_, gr_), 0.5)), SLOT.barbell * 16);
    boneArr.set(M4.trans(matPos), SLOT.mat * 16);
    boneArr.set(benchXf, SLOT.world * 16);
    boneArr.set(rigXf, SLOT.rig * 16);
    for (const [k, v] of Object.entries(poseXf)) { const m = M4.mul(M4.trans(v.pos), M4.quat(v.rot || [0, 0, 0, 1])); if (v.scale) for (let a = 0; a < 3; a++) for (let r = 0; r < 3; r++) m[a * 4 + r] *= v.scale[a]; boneArr.set(m, (+k) * 16); }
    boneArr.set(M4.mul(benchXf, backXf), SLOT.benchBack * 16);
  }
  updateBones(false);
  const hingeAxis = (from, to) => { const ax = norm(sub(to, from)); const f = norm(sub([0, 0, 1], mul(ax, ax[2]))); return norm(cross(f, ax)); };
  const AXES = {
    elbowL: hingeAxis(J.elbow, J.wrist), elbowR: hingeAxis(mir(J.elbow), mir(J.wrist)),
    shoulderL: hingeAxis(J.shoulder, J.elbow), shoulderR: hingeAxis(mir(J.shoulder), mir(J.elbow)),
  };
  function setPose(pose) {
    // pose: { boneName: [qx,qy,qz,qw] | {axis:[x,y,z], angle} }, plantFeet
    rot.forEach((q, i) => { rot[i] = [0, 0, 0, 1]; });
    rootPos = pose && pose.root && pose.root.pos ? pose.root.pos : [0, 0, 0];
    rootRot = pose && pose.root && pose.root.rot ? pose.root.rot : [0, 0, 0, 1];
    poseXf = (pose && pose.xf) || {};
    for (const [k, v] of Object.entries(pose || {})) {
      if (!(k in BONE_INDEX)) continue;
      rot[BONE_INDEX[k]] = Array.isArray(v) ? v : quatAxis(v.axis, v.angle);
    }
    updateBones(!!(pose && pose.plantFeet));
    dirty = true;
  }
  const DEMOS = {
    curl: { period: 2.6, pose(a) {
      return { foreArmL: { axis: AXES.elbowL, angle: -1.95 * a }, foreArmR: { axis: AXES.elbowR, angle: -1.95 * a },
        upperArmL: { axis: AXES.shoulderL, angle: -0.22 * a }, upperArmR: { axis: AXES.shoulderR, angle: -0.22 * a } };
    } },
    raise: { period: 2.8, pose(a) {
      return { upperArmL: { axis: [0, 0, 1], angle: 1.2 * a }, upperArmR: { axis: [0, 0, 1], angle: -1.2 * a },
        foreArmL: { axis: AXES.elbowL, angle: -0.15 * a }, foreArmR: { axis: AXES.elbowR, angle: -0.15 * a },
        clavL: { axis: [0, 0, 1], angle: 0.12 * a }, clavR: { axis: [0, 0, 1], angle: -0.12 * a } };
    } },
    squat: { period: 3.2, pose(a) {
      return { plantFeet: true,
        spine1: { axis: [1, 0, 0], angle: 0.28 * a }, spine2: { axis: [1, 0, 0], angle: 0.08 * a },
        thighL: { axis: [1, 0, 0], angle: -1.45 * a }, thighR: { axis: [1, 0, 0], angle: -1.45 * a },
        shinL: { axis: [1, 0, 0], angle: 1.95 * a }, shinR: { axis: [1, 0, 0], angle: 1.95 * a },
        footL: { axis: [1, 0, 0], angle: -0.5 * a }, footR: { axis: [1, 0, 0], angle: -0.5 * a },
        upperArmL: { axis: AXES.shoulderL, angle: -1.35 * a }, upperArmR: { axis: AXES.shoulderR, angle: -1.35 * a },
        foreArmL: { axis: AXES.elbowL, angle: -0.25 * a }, foreArmR: { axis: AXES.elbowR, angle: -0.25 * a } };
    } },
  };
  let demo = null, demoT0 = 0, demoBlend = 0;

  // ---------------- exercise playback
  let exCenter = null, ex = null, exT = 0, exSpeed = 1, exPlaying = false, exRep = 0, exCycle = 1, exPoseDirty = false;
  const easeIO = (u) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1));
  function exSample(t) {
    let c = ex.start, acc = 0;
    for (let i = 0; i < ex.timeline.length; i++) {
      const sg = ex.timeline[i];
      if (t <= acc + sg.dur || i === ex.timeline.length - 1) {
        const u = sg.dur > 0 ? (t - acc) / sg.dur : 1;
        return { c: c + (sg.to - c) * easeIO(u), label: sg.label, index: i };
      }
      c = sg.to; acc += sg.dur;
    }
    return { c, label: '', index: 0 };
  }
  function applyExercise() {
    const smp = exSample(exT);
    setPose(ex.pose(smp.c, exCycle > 0 ? (exT % exCycle) / exCycle : 0));
    bulge.fill(0);
    for (let i = 1; i < model.muscles.length; i++) {
      const k = model.muscles[i].key;
      if (focus.primary.has(k)) bulge[i] = smp.c; else if (focus.secondary.has(k)) bulge[i] = smp.c * 0.4;
    }
    uploadState();
    return smp;
  }
  function exerciseCamera() {
    const asp = canvas.width / Math.max(1, canvas.height), t = Math.tan(fov / 2), e = ex.camera.extent;
    const c = ex.camera.auto && exCenter ? exCenter : [ex.camera.tx || 0, ex.camera.ty || 0.9, ex.camera.tz || 0];
    return { yaw: ex.camera.yaw, pitch: ex.camera.pitch, tx: c[0], ty: c[1], tz: c[2], dist: Math.max(e[1] / t, e[0] / (t * asp)) * 1.12 };
  }
  function setExercise(idOrDef, o = {}) {
    const def = typeof idOrDef === 'string' ? EXERCISES.find((e) => e.id === idOrDef) : idOrDef;
    demo = null; demoBlend = 0;
    if (!def) {
      ex = null; focus = null; exPlaying = false; bulge.fill(0);
      hidden[PART_ID.handsOpen] = 0;
      [PART_ID.handsFist, ...ALL_PROPS].forEach((i) => { hidden[i] = 1; });
      shadowMode = 'standing'; benchXf = M4.ident(); rigXf = M4.ident(); backXf = M4.ident(); setPose({}); recomputeTargets(); uploadState();
      if (o.fly !== false) flyTo({ yaw: 0.35, pitch: 0.06, dist: homeDist, ty: 0.93, tx: 0, tz: 0 });
      return;
    }
    ex = def;
    focus = { primary: new Set(def.primary), secondary: new Set(def.secondary || []) };
    selectedGroup = null;
    exCycle = def.timeline.reduce((a, sg) => a + sg.dur, 0);
    exT = 0; exRep = 0; exPlaying = o.autoplay !== false;
    const fist = def.hands === 'fist';
    hidden[PART_ID.handsOpen] = fist ? 1 : 0; hidden[PART_ID.handsFist] = fist ? 0 : 1;
    ALL_PROPS.forEach((i) => { hidden[i] = 1; });
    for (const k of def.props || []) (PROP_PARTS[k] || []).forEach((i) => { hidden[i] = 0; });
    const place = (a) => (a ? M4.mul(M4.trans(a.pos || [0, 0, 0]), M4.quat(quatAxis([0, 1, 0], a.yaw || 0))) : M4.ident());
    benchXf = place(def.benchAt); rigXf = place(def.rigAt);
    const hz = [0, ADJ.top - 0.065, ADJ.hingeZ];
    backXf = M4.mul(M4.trans(hz), M4.mul(M4.quat(quatAxis([1, 0, 0], def.benchAngle || 0)), M4.trans(mul(hz, -1))));
    shadowMode = def.shadows || 'auto';
    recomputeTargets();
    // frame the whole movement: union of joint positions over one cycle
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let k = 0; k < 12; k++) {
      exT = exCycle * k / 12; applyExercise();
      for (let i = 0; i < bones.length; i++) { const w = M4.xf(boneMats[i], bones[i].pivot); lo = lo.map((v, a) => Math.min(v, w[a])); hi = hi.map((v, a) => Math.max(v, w[a])); }
    }
    exCenter = [(lo[0] + hi[0]) / 2, (Math.max(0, lo[1] - 0.08) + hi[1] + 0.1) / 2, (lo[2] + hi[2]) / 2];
    matPos = [exCenter[0], 0, exCenter[2]];
    exT = 0; applyExercise();
    if (o.fly !== false) { flyTo(exerciseCamera()); if (o.instant) Object.assign(cam, camT); }
    dirty = true;
  }

  // ---------------- equipment showcase: props alone, posed as in a source exercise, body hidden
  let equip = null, equipSnap = null, equipCam = null, equipBox = null, spin = false;
  function propBounds() {
    const P = G.position, I = G.muscleId, SI = G.skinIndex, SW = G.skinWeight;
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let v = 0; v < I.length; v += 2) {
      if (hidden[I[v]] || I[v] < 180) continue;
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], o = [0, 0, 0];
      for (let j = 0; j < 4; j++) {
        const w = SW[v * 4 + j] / 255; if (!w) continue;
        const m = SI[v * 4 + j] * 16;
        for (let a = 0; a < 3; a++) o[a] += w * (boneArr[m + a] * x + boneArr[m + 4 + a] * y + boneArr[m + 8 + a] * z + boneArr[m + 12 + a]);
      }
      if (o[1] < -0.5) continue; // parked (unused) cable / pulley
      for (let a = 0; a < 3; a++) { if (o[a] < lo[a]) lo[a] = o[a]; if (o[a] > hi[a]) hi[a] = o[a]; }
    }
    return lo[0] > hi[0] ? null : { lo, hi };
  }
  function leaveEquipment() { if (!equip) return; equip = null; spin = false; equipBox = null; hidden.set(equipSnap); }
  function setEquipment(item, o = {}) {
    if (typeof item === 'string') item = EQUIPMENT.find((e) => e.id === item || e.name === item);
    if (!item || !item.modeled) { if (equip) { leaveEquipment(); setExercise(null, o); } return false; }
    if (equip) hidden.set(equipSnap); else equipSnap = hidden.slice();
    setExercise(item.src, { autoplay: false, fly: false });
    if (!ex) return false;
    equip = item;
    exT = (item.frac || 0) * exCycle; applyExercise();
    for (let i = 0; i < 256; i++) hidden[i] = 1;
    for (const k of item.props) (PROP_PARTS[k] || []).forEach((i) => { hidden[i] = 0; });
    uploadState();
    equipBox = propBounds() || { lo: [-0.5, 0, -0.5], hi: [0.5, 1, 0.5] };
    const { lo, hi } = equipBox, c = lo.map((v, a) => (v + hi[a]) / 2);
    const r = Math.max(0.25, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2);
    const asp = canvas.width / Math.max(1, canvas.height), t = Math.tan(fov / 2);
    equipCam = { yaw: item.yaw != null ? item.yaw : 0.62, pitch: item.pitch != null ? item.pitch : 0.3, tx: c[0], ty: c[1], tz: c[2], dist: Math.max(r / t, r / (t * asp)) * 1.08 };
    flyTo(equipCam); if (o.instant) Object.assign(cam, camT);
    spin = o.spin !== false;
    dirty = true;
    return true;
  }

  // ---------------- camera
  const cam = { yaw: 0.35, pitch: 0.06, dist: 3.6, ty: 0.93, tx: 0, tz: 0 };
  const camT = { ...cam };
  const fov = 28 * DEG;
  function fitDist() {
    const asp = canvas.width / Math.max(1, canvas.height);
    return Math.max(1.0 / Math.tan(fov / 2), 0.55 / (Math.tan(fov / 2) * asp)) * 1.02;
  }
  let homeDist = 3.6;
  function eye() {
    const t = [cam.tx, cam.ty, cam.tz];
    return [t[0] + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), t[1] + cam.dist * Math.sin(cam.pitch), t[2] + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw)];
  }
  let VP = M4.ident(), viewM = M4.ident();
  function updateVP() {
    const asp = canvas.width / Math.max(1, canvas.height);
    viewM = M4.look(eye(), [cam.tx, cam.ty, cam.tz], [0, 1, 0]);
    VP = M4.mul(M4.persp(fov, asp, 0.05, 30), viewM);
  }

  // ---------------- theme
  let bg = [0.97, 0.97, 0.98], darkAmt = 0, accent = [0.05, 0.4, 0.89];
  function setTheme(t) { if (t.background) bg = t.background; if (t.dark != null) darkAmt = t.dark; if (t.accent) accent = t.accent; dirty = true; }

  // ---------------- resize
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      const nd = fitDist(); if (Math.abs(camT.dist - homeDist) < 0.01) { camT.dist = nd; cam.dist = nd; } homeDist = nd;
    }
    dirty = true;
  }

  // ---------------- draw
  let dirty = true, shadowMode = 'standing';
  function uploadState() {
    for (let i = 0; i < 256; i++) {
      stateData[i * 4] = Math.round(cur.emph[i] * 255); stateData[i * 4 + 1] = Math.round(cur.hov[i] * 255);
      stateData[i * 4 + 2] = Math.round(cur.dim[i] * 255); stateData[i * 4 + 3] = hidden[i] ? 0 : 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, stateTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, stateData);
    for (let i = 0; i < 256; i++) state2[i * 4] = Math.round(clamp(bulge[i], 0, 1) * 255);
    gl.bindTexture(gl.TEXTURE_2D, stateTex2); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, state2);
  }
  function drawBody(pr) {
    gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP);
    gl.uniformMatrix4fv(pr.u.uBones, false, boneArr);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, stateTex); gl.uniform1i(pr.u.uState, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, stateTex2); gl.uniform1i(pr.u.uState2, 1); gl.activeTexture(gl.TEXTURE0);
    if (pr.u.uCam) gl.uniform3fv(pr.u.uCam, eye());
    if (pr.u.uDark) gl.uniform1f(pr.u.uDark, darkAmt);
    if (pr.u.uAccent) gl.uniform3fv(pr.u.uAccent, accent);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, G.index.length, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
  function render() {
    updateVP();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // ground shadow
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
    gl.useProgram(shp.p); gl.uniformMatrix4fv(shp.u.uVP, false, VP); gl.bindVertexArray(svao);
    let blobs;
    if (equip && equipBox) {
      const { lo, hi } = equipBox;
      blobs = [[[(lo[0] + hi[0]) / 2, 0, (lo[2] + hi[2]) / 2], [(hi[0] - lo[0]) / 2 + 0.12, (hi[2] - lo[2]) / 2 + 0.12], lo[1] < 0.25 ? 0.2 : 0.1]];
    } else if (shadowMode === 'auto' || shadowMode === 'standing' && ex) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (let i = 0; i < bones.length; i++) { const m = boneMats[i], p = bones[i].pivot; const w = M4.xf(m, p); x0 = Math.min(x0, w[0]); x1 = Math.max(x1, w[0]); z0 = Math.min(z0, w[2]); z1 = Math.max(z1, w[2]); }
      blobs = [[[(x0 + x1) / 2, 0, (z0 + z1) / 2], [(x1 - x0) / 2 + 0.16, (z1 - z0) / 2 + 0.14], 0.2]];
    } else blobs = shadowMode === 'bench'
      ? [[[0, 0, -0.32], [0.42, 0.78], 0.22], [[0.27, 0, 0.36], [0.08, 0.12], 0.3], [[-0.27, 0, 0.36], [0.08, 0.12], 0.3]]
      : [[[0, 0, 0.02], [0.42, 0.3], 0.2], [[0.125, 0, 0.05], [0.07, 0.14], 0.3], [[-0.125, 0, 0.05], [0.07, 0.14], 0.3]];
    for (const [c, r, a] of blobs) { gl.uniform3fv(shp.u.uC, c); gl.uniform2fv(shp.u.uR, r); gl.uniform1f(shp.u.uA, darkAmt > 0.5 ? a * 2.2 : a); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    gl.bindVertexArray(null); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    drawBody(prog);
    gl.disable(gl.CULL_FACE);
  }
  function pickAt(x, y) {
    ensurePick();
    gl.bindFramebuffer(gl.FRAMEBUFFER, pfb); gl.viewport(0, 0, pw, ph);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    drawBody(pick);
    gl.disable(gl.CULL_FACE);
    const px = new Uint8Array(4);
    const rx = Math.floor(x / canvas.clientWidth * pw), ry = Math.floor((1 - y / canvas.clientHeight) * ph);
    gl.readPixels(clamp(rx, 0, pw - 1), clamp(ry, 0, ph - 1), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const id = px[0] + px[1] * 256;
    return id >= 180 ? 0 : id;
  }

  // ---------------- interaction
  const listeners = { hover: [], select: [], frame: [] };
  const emit = (k, ...a) => listeners[k].forEach((f) => f(...a));
  let hoverId = 0, listHoverKey = null, selectedGroup = null, selectedId = 0;
  let focus = null; // { primary: Set<key>, secondary: Set<key> }
  function recomputeTargets() {
    for (let i = 1; i < model.muscles.length; i++) {
      const m = model.muscles[i];
      if (focus) {
        const p = focus.primary.has(m.key), s2 = focus.secondary.has(m.key);
        target.emph[i] = p ? 1 : 0; target.dim[i] = p ? 0 : s2 ? 0.5 : 1;
      } else {
        const inG = selectedGroup && m.group === selectedGroup;
        target.emph[i] = inG ? 1 : 0;
        target.dim[i] = selectedGroup && !inG ? 1 : 0;
      }
      target.hov[i] = (hoverId === i || (listHoverKey && m.key === listHoverKey) || (selectedId === i)) ? 1 : 0;
    }
    target.dim[0] = selectedGroup || focus ? 1 : 0;
    dirty = true;
  }
  const pointers = new Map();
  let drag = null, pickPending = null, lastPick = 0;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag = { x: e.clientX, y: e.clientY, moved: 0, button: e.button, shift: e.shiftKey };
    spin = false; cancelFlyTo();
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const prev = pointers.get(e.pointerId);
    if (prev && pointers.size === 2) {
      const pts = [...pointers.values()];
      const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const p2 = [...pointers.values()];
      const d1 = Math.hypot(p2[0].x - p2[1].x, p2[0].y - p2[1].y);
      if (d0 > 0) camT.dist = clamp(camT.dist * d0 / d1, 0.7, homeDist * 1.6);
      const my0 = (pts[0].y + pts[1].y) / 2, my1 = (p2[0].y + p2[1].y) / 2;
      camT.ty = clamp(camT.ty + (my1 - my0) / r.height * camT.dist * 0.5, 0.1, 1.75);
      if (drag) drag.moved += 10;
      dirty = true; return;
    }
    if (prev) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag && prev) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.button === 2 || drag.shift) {
        camT.ty = clamp(camT.ty + dy / r.height * camT.dist * 0.5, 0.1, 1.75);
        const s = dx / r.width * camT.dist * 0.5;
        camT.tx -= Math.cos(cam.yaw) * s; camT.tz += Math.sin(cam.yaw) * s;
      } else {
        camT.yaw -= dx * 0.008; camT.pitch = clamp(camT.pitch + dy * 0.006, -0.9, 1.1);
      }
      dirty = true;
      if (hoverId) { hoverId = 0; recomputeTargets(); emit('hover', null); }
      return;
    }
    pickPending = { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY };
    dirty = true;
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (drag && drag.moved < 6 && pointers.size === 0) {
      const r = canvas.getBoundingClientRect();
      const id = pickAt(e.clientX - r.left, e.clientY - r.top);
      const m = id ? model.muscles[id] : null;
      emit('select', m && m.group !== undefined ? m : null, { x: e.clientX, y: e.clientY });
    }
    if (pointers.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { if (!drag && hoverId) { hoverId = 0; recomputeTargets(); emit('hover', null); } });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); cancelFlyTo();
    camT.dist = clamp(camT.dist * Math.exp(e.deltaY * 0.0012), 0.7, homeDist * 1.6); dirty = true;
  }, { passive: false });

  let fly = null;
  function cancelFlyTo() { fly = null; }
  function flyTo(v) {
    // normalise yaw so we turn the short way
    let yaw = v.yaw != null ? v.yaw : camT.yaw;
    const d = yaw - camT.yaw; yaw = camT.yaw + (((d + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    Object.assign(camT, { ...v, yaw });
    dirty = true;
  }
  const VIEWS = { front: { yaw: 0, pitch: 0.06 }, back: { yaw: Math.PI, pitch: 0.06 }, left: { yaw: Math.PI / 2, pitch: 0.06 }, right: { yaw: -Math.PI / 2, pitch: 0.06 } };

  // ---------------- loop
  let raf = 0, lastT = performance.now(), running = true;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const k = 1 - Math.exp(-dt * 9);
    let moving = false;
    for (const key of ['yaw', 'pitch', 'dist', 'ty', 'tx', 'tz']) {
      const d = camT[key] - cam[key];
      if (Math.abs(d) > 1e-4) { cam[key] += d * k; moving = true; } else cam[key] = camT[key];
    }
    if (equip && spin && !drag) { camT.yaw += dt * 0.25; cam.yaw += dt * 0.25; moving = true; }
    let stChanged = false;
    const ks = 1 - Math.exp(-dt * 12);
    for (const key of ['emph', 'hov', 'dim']) {
      const a = cur[key], b = target[key];
      for (let i = 0; i < model.muscles.length; i++) {
        const d = b[i] - a[i];
        if (Math.abs(d) > 0.004) { a[i] += d * ks; stChanged = true; } else if (a[i] !== b[i]) { a[i] = b[i]; stChanged = true; }
      }
    }
    if (stChanged) uploadState();
    if (ex && (exPlaying || exPoseDirty)) {
      if (exPlaying) { exT += dt * exSpeed; while (exT >= exCycle) { exT -= exCycle; exRep++; } }
      applyExercise(); exPoseDirty = false; moving = true;
    }
    if (demo || demoBlend > 0) {
      const D = DEMOS[demo || lastDemo];
      demoBlend = clamp(demoBlend + (demo ? dt : -dt) * 2.5, 0, 1);
      const ph = ((now - demoT0) / 1000) / D.period;
      const a = (0.5 - 0.5 * Math.cos(ph * 2 * Math.PI)) * demoBlend;
      setPose(D.pose(a));
      if (!demo && demoBlend === 0) setPose({});
      moving = true;
    }
    if (pickPending && !drag && now - lastPick > 60) {
      lastPick = now;
      const p = pickPending; pickPending = null;
      const id = pickAt(p.x, p.y);
      if (id !== hoverId) {
        hoverId = id; recomputeTargets();
        emit('hover', id ? model.muscles[id] : null, { x: p.cx, y: p.cy });
      } else if (id) emit('hover', model.muscles[id], { x: p.cx, y: p.cy });
    }
    if (dirty || moving || stChanged) {
      render(); dirty = false;
      emit('frame');
    }
  }
  let lastDemo = 'curl';
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(canvas);
  raf = requestAnimationFrame(frame);

  // ---------------- public API
  return {
    model, gl, canvas,
    on(evt, fn) { listeners[evt].push(fn); return () => { listeners[evt] = listeners[evt].filter((f) => f !== fn); }; },
    selectGroup(gid) { selectedGroup = gid || null; recomputeTargets(); },
    get selectedGroup() { return selectedGroup; },
    highlightMuscle(key) { listHoverKey = key || null; recomputeTargets(); },
    focusMuscle(id) { selectedId = id || 0; recomputeTargets(); },
    setHidden(ids, flag) { ids.forEach((i) => { hidden[i] = flag ? 1 : 0; }); uploadState(); dirty = true; },
    view(name, instant) { const v = typeof name === 'string' ? VIEWS[name] : name; if (!v) return; flyTo(v); if (instant) { Object.assign(cam, camT); dirty = true; } },
    reset() { if (equip) { flyTo(equipCam); return; } flyTo(ex ? exerciseCamera() : { yaw: 0.35, pitch: 0.06, dist: homeDist, ty: 0.93, tx: 0, tz: 0 }); },
    exercises: EXERCISES,
    setExercise(id, o) { leaveEquipment(); return setExercise(id, o); },
    get exercise() { return equip ? null : ex; },
    equipment: EQUIPMENT,
    setEquipment,
    get equipmentItem() { return equip; },
    equipmentSpin(on) { if (on === undefined) return spin; spin = !!on && !!equip; dirty = true; return spin; },
    exercisePlay(on) { if (!ex) return; exPlaying = on !== false; dirty = true; },
    exerciseSeek(frac) { if (!ex) return; exT = clamp(frac, 0, 0.9999) * exCycle; exPoseDirty = true; dirty = true; },
    exerciseSpeed(v) { exSpeed = clamp(v, 0.1, 4); },
    exerciseState() {
      if (!ex || equip) return null;
      const smp = exSample(exT);
      return { t: exT, cycle: exCycle, frac: exT / exCycle, c: smp.c, label: smp.label, phase: smp.index, rep: exRep, playing: exPlaying, speed: exSpeed };
    },
    setFocus(f) { focus = f ? { primary: new Set(f.primary || []), secondary: new Set(f.secondary || []) } : null; recomputeTargets(); },
    flyToGroup(gid) { const g = GROUPS.find((x) => x.id === gid); if (g) flyTo({ yaw: g.yaw, pitch: g.pitch, tx: 0, tz: 0 }); },
    get camera() { return { ...cam }; },
    setPose, play(name) { if (!DEMOS[name]) { demo = null; return; } if (!demo) demoT0 = performance.now(); demo = name; lastDemo = name; dirty = true; },
    stop() { demo = null; },
    demoPose(name, a) { return DEMOS[name] ? DEMOS[name].pose(a) : {}; },
    get playing() { return demo; },
    demos: Object.keys(DEMOS),
    setTheme,
    project(id) {
      // screen position of a muscle anchor (CSS px) and facing amount toward the camera
      const m = model.muscles[id]; if (!m || !m.anchor) return null;
      const a = m.anchor; let sk = new Float32Array(16);
      for (let j = 0; j < 4; j++) { const w = a.skin.w[j]; if (!w) continue; const bm = boneMats[a.skin.idx[j]]; for (let q = 0; q < 16; q++) sk[q] += bm[q] * w; }
      const p = M4.xf(sk, a.p), n = M4.xn(sk, a.n);
      const c = M4.xf4(VP, p);
      if (c[3] <= 0) return null;
      const e = eye(), facing = dot(n, norm(sub(e, p)));
      return { x: (c[0] / c[3] * 0.5 + 0.5) * canvas.clientWidth, y: (1 - (c[1] / c[3] * 0.5 + 0.5)) * canvas.clientHeight, facing };
    },
    resize,
    render() { render(); },
    dispose() { running = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); },
  };
}
// ---------------------------------------------------------------- exercise library (generated from data/exercises.json)
const EXERCISE_LIBRARY = [{"name":"Barbell Bench Press","section":"Dada","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Flat bench","optional":false},{"name":"Power rack / squat cage","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Berbaring di flat bench dengan mata tepat di bawah barbell, kedua kaki menapak di lantai.","Genggam bar sedikit lebih lebar dari bahu, tarik tulang belikat ke belakang dan ke bawah.","Angkat bar dari rack dan tahan di atas dada dengan lengan lurus.","Turunkan bar perlahan hingga menyentuh dada bagian tengah-bawah, siku sekitar 45–70° dari badan.","Dorong bar kembali ke atas hingga lengan lurus, lalu ulangi. Kembalikan bar ke rack setelah selesai."]},{"name":"Incline Barbell Bench Press","section":"Dada","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Adjustable (FID) bench","optional":false},{"name":"Power rack / squat cage","optional":false}],"primary":[{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"steps":["Atur sandaran bench di sudut 30–45°, lalu berbaring dengan mata di bawah barbell.","Genggam bar sedikit lebih lebar dari bahu dan rapatkan tulang belikat.","Angkat bar dari rack, tahan di atas dada atas dengan lengan lurus.","Turunkan bar ke dada atas (di bawah tulang selangka) secara terkontrol.","Dorong kembali ke atas tanpa mengangkat pinggul dari bench."]},{"name":"Decline Bench Press","section":"Dada","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Decline bench","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Kaitkan kaki di bantalan decline bench, lalu berbaring dengan kepala lebih rendah dari pinggul.","Genggam bar sedikit lebih lebar dari bahu dan angkat dari rack.","Turunkan bar ke dada bagian bawah dengan siku sedikit menekuk ke arah badan.","Dorong bar ke atas hingga lengan lurus, lalu ulangi."]},{"name":"Dumbbell Bench Press","section":"Dada","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"steps":["Duduk di ujung bench dengan dumbbell di paha, lalu berbaring sambil membawa dumbbell ke samping dada.","Posisikan dumbbell sejajar dada, telapak menghadap ke arah kaki, tulang belikat rapat.","Dorong kedua dumbbell ke atas hingga lengan lurus dan dumbbell hampir bertemu.","Turunkan perlahan hingga siku sedikit di bawah bench, lalu ulangi."]},{"name":"Incline Dumbbell Press","section":"Dada","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Adjustable (FID) bench","optional":false}],"primary":[{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"steps":["Atur bench di sudut 30–45°, duduk dan bawa dumbbell ke depan bahu.","Bersandar dengan punggung dan kepala menempel di bench, kaki menapak.","Dorong dumbbell ke atas dada atas hingga lengan lurus.","Turunkan perlahan hingga dumbbell sejajar dada atas, lalu ulangi."]},{"name":"Dumbbell Fly","section":"Dada","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"}],"steps":["Berbaring di flat bench, tahan dumbbell di atas dada dengan telapak saling berhadapan.","Tekuk siku sedikit dan pertahankan sudut itu sepanjang gerakan.","Buka lengan ke samping dalam lengkungan lebar sampai dada terasa meregang.","Rapatkan kembali dumbbell di atas dada seperti memeluk pohon, lalu ulangi."]},{"name":"Cable Crossover","section":"Dada","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Cable crossover station","optional":false},{"name":"Cable attachments","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Pasang D-handle di kedua pulley posisi tinggi, pegang satu di tiap tangan.","Melangkah ke depan dengan satu kaki, condongkan badan sedikit, siku sedikit menekuk.","Tarik kedua handle ke bawah dan ke tengah hingga bertemu di depan pinggul.","Tahan sebentar sambil meremas dada, lalu kembalikan perlahan ke posisi awal."]},{"name":"Pec Deck Fly","section":"Dada","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Pec deck / rear delt fly","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Atur tinggi kursi agar handle sejajar dada, lalu duduk dengan punggung menempel sandaran.","Pegang handle dengan siku sedikit menekuk.","Rapatkan kedua lengan ke depan hingga handle hampir bertemu.","Kembalikan perlahan sampai dada terasa meregang, lalu ulangi."]},{"name":"Machine Chest Press","section":"Dada","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Chest press machine","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"steps":["Atur kursi agar handle sejajar dada tengah, duduk dengan punggung menempel.","Genggam handle, tulang belikat rapat ke sandaran.","Dorong handle ke depan hingga lengan hampir lurus.","Kembalikan perlahan sampai siku sedikit di belakang badan, lalu ulangi."]},{"name":"Push-up","section":"Dada","categories":["Bodyweight","Calisthenics"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"steps":["Posisi plank tinggi: telapak tangan di lantai sedikit lebih lebar dari bahu, badan lurus dari kepala ke tumit.","Kencangkan perut dan bokong agar pinggul tidak turun.","Tekuk siku (sekitar 45° dari badan) dan turunkan dada hingga hampir menyentuh lantai.","Dorong lantai hingga lengan lurus kembali, lalu ulangi."]},{"name":"Diamond Push-up","section":"Dada","categories":["Bodyweight","Calisthenics"],"level":"Menengah","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"}],"secondary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Posisi plank tinggi dengan kedua tangan di bawah dada, ibu jari dan telunjuk membentuk berlian.","Jaga badan lurus dan perut kencang.","Turunkan dada ke arah tangan dengan siku tetap dekat badan.","Dorong kembali ke atas hingga lengan lurus."]},{"name":"Archer Push-up","section":"Dada","categories":["Calisthenics"],"level":"Lanjut","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"steps":["Posisi push-up dengan tangan dibuka sangat lebar.","Turunkan badan ke arah satu tangan sambil tangan lain lurus ke samping.","Dorong kembali ke tengah, lalu ulangi ke sisi lain.","Jaga pinggul tetap sejajar dan tidak berputar."]},{"name":"Pseudo Planche Push-up","section":"Dada","categories":["Calisthenics"],"level":"Lanjut","equipment":[{"name":"Parallettes","optional":true}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"}],"steps":["Posisi push-up dengan tangan di samping pinggang, jari menghadap ke samping atau belakang.","Condongkan badan ke depan hingga bahu jauh melewati tangan.","Turunkan dada sambil mempertahankan condong ke depan dan badan lurus.","Dorong kembali ke atas tanpa mengurangi condong, lalu ulangi."]},{"name":"Chest Dip","section":"Dada","categories":["Gym","Calisthenics"],"level":"Menengah","equipment":[{"name":"Dip station / parallel bars","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"steps":["Pegang parallel bar dan angkat badan hingga lengan lurus.","Condongkan badan ke depan sekitar 30° dan tekuk lutut ke belakang.","Turunkan badan dengan menekuk siku hingga bahu sedikit di bawah siku.","Dorong kembali ke atas hingga lengan lurus."]},{"name":"Ring Dip","section":"Dada","categories":["Calisthenics"],"level":"Lanjut","equipment":[{"name":"Gymnastic rings","optional":false}],"primary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"}],"steps":["Pegang ring dan naik ke posisi support dengan lengan lurus, ring rapat ke badan.","Putar ring sedikit keluar untuk menstabilkan bahu.","Turunkan badan perlahan hingga bahu sejajar siku, jaga ring tetap dekat badan.","Dorong kembali ke posisi support, lalu ulangi."]},{"name":"Pull-up","section":"Punggung","categories":["Bodyweight","Calisthenics"],"level":"Menengah","equipment":[{"name":"Pull-up bar","optional":false}],"primary":[{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Teres major","group":"Middle back","groupId":"midback"}],"secondary":[{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"},{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"},{"muscle":"Trapezius (ascending / lower)","group":"Traps","groupId":"traps"},{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Gantung di bar dengan genggaman overhand sedikit lebih lebar dari bahu.","Tarik bahu ke bawah menjauhi telinga dan kencangkan perut.","Tarik badan ke atas hingga dagu melewati bar, siku mengarah ke bawah.","Turunkan perlahan hingga lengan lurus penuh, lalu ulangi."]},{"name":"Chin-up","section":"Punggung","categories":["Bodyweight","Calisthenics"],"level":"Menengah","equipment":[{"name":"Pull-up bar","optional":false}],"primary":[{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"}],"secondary":[{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"},{"muscle":"Teres major","group":"Middle back","groupId":"midback"},{"muscle":"Trapezius (ascending / lower)","group":"Traps","groupId":"traps"},{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"}],"steps":["Gantung di bar dengan genggaman underhand selebar bahu.","Tarik bahu ke bawah dan kencangkan perut.","Tarik badan ke atas hingga dagu melewati bar.","Turunkan perlahan hingga lengan lurus, lalu ulangi."]},{"name":"Lat Pulldown","section":"Punggung","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Lat pulldown","optional":false},{"name":"Cable attachments","optional":false}],"primary":[{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Teres major","group":"Middle back","groupId":"midback"}],"secondary":[{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"},{"muscle":"Trapezius (ascending / lower)","group":"Traps","groupId":"traps"},{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Duduk dengan paha terkunci di bawah bantalan, genggam bar lebih lebar dari bahu.","Condongkan badan sedikit ke belakang dan busungkan dada.","Tarik bar ke dada atas sambil menarik siku ke bawah dan ke belakang.","Kembalikan bar perlahan hingga lengan lurus, lalu ulangi."]},{"name":"Straight-arm Pulldown","section":"Punggung","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Cable crossover station","optional":false},{"name":"Cable attachments","optional":false}],"primary":[{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Teres major","group":"Middle back","groupId":"midback"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Pasang straight bar atau rope di pulley tinggi, berdiri menghadap mesin.","Condongkan badan sedikit ke depan, lengan lurus dengan siku sedikit menekuk.","Tarik bar ke bawah dalam busur hingga menyentuh paha.","Kembalikan perlahan ke atas setinggi kepala, lalu ulangi."]},{"name":"Seated Cable Row","section":"Punggung","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Seated cable row","optional":false},{"name":"Cable attachments","optional":false}],"primary":[{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Trapezius (transverse / middle)","group":"Traps","groupId":"traps"},{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"}],"secondary":[{"muscle":"Teres major","group":"Middle back","groupId":"midback"},{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"}],"steps":["Duduk dengan kaki di pijakan, lutut sedikit menekuk, pegang V-bar.","Duduk tegak dengan dada terbuka dan punggung netral.","Tarik handle ke perut sambil merapatkan tulang belikat.","Kembalikan perlahan hingga lengan lurus tanpa membungkuk, lalu ulangi."]},{"name":"Bent-over Barbell Row","section":"Punggung","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Trapezius (transverse / middle)","group":"Traps","groupId":"traps"}],"secondary":[{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Teres major","group":"Middle back","groupId":"midback"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"}],"steps":["Berdiri dengan kaki selebar pinggul, pegang barbell overhand sedikit lebih lebar dari bahu.","Tekuk lutut sedikit dan bungkukkan badan dari pinggul hingga sekitar 45°, punggung lurus.","Tarik bar ke perut bagian bawah sambil merapatkan tulang belikat.","Turunkan bar perlahan hingga lengan lurus, lalu ulangi."]},{"name":"One-arm Dumbbell Row","section":"Punggung","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"}],"secondary":[{"muscle":"Trapezius (transverse / middle)","group":"Traps","groupId":"traps"},{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Teres major","group":"Middle back","groupId":"midback"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"}],"steps":["Letakkan satu lutut dan satu tangan di bench, punggung sejajar lantai.","Pegang dumbbell dengan tangan lain, lengan lurus ke bawah.","Tarik dumbbell ke arah pinggul dengan siku dekat badan.","Turunkan perlahan, selesaikan semua repetisi lalu ganti sisi."]},{"name":"T-Bar Row","section":"Punggung","categories":["Gym"],"level":"Menengah","equipment":[{"name":"T-bar / chest-supported row","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Trapezius (transverse / middle)","group":"Traps","groupId":"traps"},{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"}],"secondary":[{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Teres major","group":"Middle back","groupId":"midback"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"}],"steps":["Berdiri di pijakan T-bar (atau rebahkan dada di bantalan untuk versi chest-supported).","Pegang handle, bungkukkan badan dari pinggul dengan punggung lurus.","Tarik handle ke dada bawah sambil merapatkan tulang belikat.","Turunkan perlahan hingga lengan lurus, lalu ulangi."]},{"name":"Inverted Row","section":"Punggung","categories":["Bodyweight","Calisthenics"],"level":"Pemula","equipment":[{"name":"Power rack / squat cage","optional":false},{"name":"Smith machine","optional":true},{"name":"Gymnastic rings","optional":true}],"primary":[{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Trapezius (transverse / middle)","group":"Traps","groupId":"traps"},{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"}],"secondary":[{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"steps":["Pasang bar setinggi pinggang (rack atau Smith machine), lalu berbaring di bawahnya.","Pegang bar sedikit lebih lebar dari bahu, badan lurus dari kepala ke tumit.","Tarik dada ke bar sambil merapatkan tulang belikat.","Turunkan perlahan hingga lengan lurus, lalu ulangi."]},{"name":"Face Pull","section":"Punggung","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Cable crossover station","optional":false},{"name":"Cable attachments","optional":false}],"primary":[{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Infraspinatus","group":"Middle back","groupId":"midback"},{"muscle":"Teres minor","group":"Middle back","groupId":"midback"}],"secondary":[{"muscle":"Trapezius (transverse / middle)","group":"Traps","groupId":"traps"},{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Trapezius (ascending / lower)","group":"Traps","groupId":"traps"}],"steps":["Pasang rope di pulley setinggi wajah, pegang kedua ujung dengan ibu jari menghadap ke belakang.","Mundur hingga kabel tegang, berdiri tegak.","Tarik rope ke arah wajah sambil membuka tangan ke samping telinga, siku tinggi.","Tahan sebentar lalu kembalikan perlahan."]},{"name":"Barbell Shrug","section":"Punggung","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"}],"secondary":[{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri tegak memegang barbell di depan paha, genggaman selebar bahu.","Jaga lengan lurus dan dada terbuka.","Angkat bahu lurus ke atas setinggi mungkin ke arah telinga.","Tahan sebentar, lalu turunkan perlahan."]},{"name":"Barbell Deadlift","section":"Punggung","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"}],"secondary":[{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"},{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri dengan kaki selebar pinggul, bar di atas pertengahan telapak kaki.","Tekuk pinggul dan lutut, pegang bar tepat di luar kaki, punggung lurus dan dada terangkat.","Tarik napas, kencangkan perut, lalu dorong lantai dengan kaki sambil menjaga bar dekat badan.","Berdiri tegak penuh dengan pinggul terkunci, tanpa melengkungkan punggung ke belakang.","Turunkan bar dengan mendorong pinggul ke belakang lebih dulu, lalu tekuk lutut."]},{"name":"Trap Bar Deadlift","section":"Punggung","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Trap / hex bar","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri di tengah trap bar, kaki selebar pinggul.","Jongkok dan pegang handle samping, punggung lurus, dada terangkat.","Dorong lantai dan berdiri tegak sambil menjaga badan tegak.","Turunkan kembali dengan terkontrol hingga plate menyentuh lantai."]},{"name":"Back Extension","section":"Punggung","categories":["Gym"],"level":"Pemula","equipment":[{"name":"45° back extension","optional":false}],"primary":[{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"}],"steps":["Atur bantalan agar tepat di bawah tulang pinggul, kunci tumit di bawah penahan.","Silangkan tangan di dada, badan lurus.","Bungkukkan badan dari pinggul hingga hampir 90°.","Angkat kembali hingga badan segaris dengan kaki, tanpa melengkung berlebihan."]},{"name":"Superman","section":"Punggung","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"}],"secondary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Trapezius (ascending / lower)","group":"Traps","groupId":"traps"},{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Telungkup di matras dengan lengan lurus ke depan dan kaki lurus.","Angkat lengan, dada, dan kaki bersamaan dari lantai.","Tahan 2–3 detik sambil meremas bokong dan punggung bawah.","Turunkan perlahan, lalu ulangi."]},{"name":"Muscle-up","section":"Punggung","categories":["Calisthenics"],"level":"Lanjut","equipment":[{"name":"Pull-up bar","optional":false},{"name":"Gymnastic rings","optional":true}],"primary":[{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"secondary":[{"muscle":"Teres major","group":"Middle back","groupId":"midback"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Trapezius (ascending / lower)","group":"Traps","groupId":"traps"}],"steps":["Gantung di bar dengan genggaman sedikit di atas bar (false grip untuk ring).","Lakukan ayunan kecil, lalu tarik bar dengan eksplosif ke arah pinggul.","Saat dada mencapai bar, condongkan badan ke depan dan putar siku ke atas bar.","Dorong ke atas seperti dip hingga lengan lurus di atas bar.","Turunkan perlahan ke posisi gantung, lalu ulangi."]},{"name":"Tuck Front Lever","section":"Punggung","categories":["Calisthenics"],"level":"Lanjut","equipment":[{"name":"Pull-up bar","optional":false}],"primary":[{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Teres major","group":"Middle back","groupId":"midback"}],"secondary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Trapezius (ascending / lower)","group":"Traps","groupId":"traps"},{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"}],"steps":["Gantung di bar dengan genggaman overhand selebar bahu.","Tekan bar ke bawah dengan lengan lurus sambil menarik lutut ke dada.","Angkat pinggul hingga punggung sejajar lantai.","Tahan 5–15 detik dengan lengan tetap lurus, lalu turunkan perlahan."]},{"name":"Barbell Overhead Press","section":"Bahu","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Power rack / squat cage","optional":false}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Ambil bar dari rack setinggi bahu, genggaman sedikit lebih lebar dari bahu.","Berdiri dengan kaki selebar pinggul, kencangkan perut dan bokong.","Dorong bar lurus ke atas sambil menarik kepala sedikit ke belakang agar bar lewat.","Kunci lengan di atas kepala dengan bar di atas pertengahan kaki, lalu turunkan ke bahu."]},{"name":"Seated Dumbbell Shoulder Press","section":"Bahu","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Adjustable (FID) bench","optional":false}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Atur bench tegak, duduk dengan dumbbell di samping bahu, telapak menghadap depan.","Punggung menempel sandaran, perut kencang.","Dorong dumbbell ke atas hingga lengan hampir lurus.","Turunkan perlahan hingga setinggi telinga, lalu ulangi."]},{"name":"Arnold Press","section":"Bahu","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Adjustable (FID) bench","optional":false}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Duduk tegak, pegang dumbbell di depan bahu dengan telapak menghadap badan.","Dorong ke atas sambil memutar telapak tangan hingga menghadap depan.","Kunci lengan di atas kepala.","Turunkan sambil memutar kembali ke posisi awal."]},{"name":"Machine Shoulder Press","section":"Bahu","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Shoulder press machine","optional":false}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"steps":["Atur kursi agar handle sejajar bahu, duduk dengan punggung menempel.","Genggam handle dengan siku di bawah tangan.","Dorong handle ke atas hingga lengan hampir lurus.","Turunkan perlahan, lalu ulangi."]},{"name":"Dumbbell Lateral Raise","section":"Bahu","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false}],"primary":[{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Berdiri tegak dengan dumbbell di samping badan, siku sedikit menekuk.","Angkat dumbbell ke samping hingga lengan sejajar bahu.","Pimpin gerakan dengan siku, jangan mengangkat bahu ke telinga.","Turunkan perlahan, lalu ulangi."]},{"name":"Dumbbell Front Raise","section":"Bahu","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Berdiri dengan dumbbell di depan paha, telapak menghadap badan.","Angkat satu atau kedua dumbbell ke depan dengan lengan hampir lurus.","Berhenti saat lengan sejajar bahu.","Turunkan perlahan tanpa mengayun badan."]},{"name":"Bent-over Reverse Fly","section":"Bahu","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Pec deck / rear delt fly","optional":true}],"primary":[{"muscle":"Deltoid (posterior)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Rhomboid major & minor","group":"Middle back","groupId":"midback"},{"muscle":"Trapezius (transverse / middle)","group":"Traps","groupId":"traps"},{"muscle":"Infraspinatus","group":"Middle back","groupId":"midback"},{"muscle":"Teres minor","group":"Middle back","groupId":"midback"}],"steps":["Bungkukkan badan dari pinggul hingga hampir sejajar lantai, punggung lurus.","Pegang dumbbell di bawah dada, telapak saling berhadapan, siku sedikit menekuk.","Buka lengan ke samping hingga sejajar badan.","Turunkan perlahan, lalu ulangi. (Bisa juga di pec deck posisi rear delt.)"]},{"name":"Upright Row","section":"Bahu","categories":["Gym"],"level":"Menengah","equipment":[{"name":"EZ curl bar","optional":false}],"primary":[{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri memegang EZ bar di depan paha, genggaman selebar bahu.","Tarik bar ke atas dekat badan dengan siku memimpin.","Berhenti saat siku setinggi bahu.","Turunkan perlahan, lalu ulangi."]},{"name":"Landmine Press","section":"Bahu","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Landmine attachment","optional":false},{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"steps":["Pasang satu ujung barbell di landmine, pegang ujung lain di depan bahu.","Berdiri dengan kaki dibuka atau setengah berlutut, perut kencang.","Dorong bar ke atas dan ke depan hingga lengan lurus.","Turunkan kembali ke depan bahu, selesaikan repetisi lalu ganti sisi."]},{"name":"Pike Push-up","section":"Bahu","categories":["Bodyweight","Calisthenics"],"level":"Menengah","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"}],"steps":["Mulai dari posisi push-up, lalu angkat pinggul tinggi membentuk huruf V terbalik.","Tangan selebar bahu, kepala di antara lengan.","Tekuk siku dan turunkan kepala ke lantai di depan tangan.","Dorong kembali hingga lengan lurus."]},{"name":"Wall Handstand Push-up","section":"Bahu","categories":["Calisthenics"],"level":"Lanjut","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Lakukan handstand menghadap atau membelakangi dinding, tangan selebar bahu.","Kencangkan perut dan bokong, badan lurus.","Turunkan kepala perlahan hingga hampir menyentuh lantai.","Dorong kembali hingga lengan lurus."]},{"name":"Barbell Curl","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"}],"secondary":[{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"},{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri tegak memegang barbell underhand selebar bahu.","Jaga siku tetap di samping badan.","Angkat bar ke arah bahu dengan menekuk siku.","Turunkan perlahan hingga lengan lurus, tanpa mengayun badan."]},{"name":"Alternating Dumbbell Curl","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false}],"primary":[{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"}],"secondary":[{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"},{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri dengan dumbbell di samping badan, telapak menghadap paha.","Angkat satu dumbbell sambil memutar telapak hingga menghadap atas.","Remas biceps di atas, lalu turunkan perlahan.","Ulangi dengan tangan lain secara bergantian."]},{"name":"Hammer Curl","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false}],"primary":[{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"},{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"}],"secondary":[{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Extensor carpi radialis (longus & brevis)","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri dengan dumbbell di samping badan, telapak saling berhadapan.","Angkat dumbbell dengan posisi genggaman tetap netral.","Jaga siku di samping badan.","Turunkan perlahan, lalu ulangi."]},{"name":"Preacher Curl","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"EZ curl bar","optional":false},{"name":"Preacher curl bench","optional":false}],"primary":[{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"}],"secondary":[{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"}],"steps":["Duduk di preacher bench dengan lengan atas menempel di bantalan.","Pegang EZ bar underhand.","Angkat bar hingga lengan bawah hampir tegak.","Turunkan perlahan hingga lengan hampir lurus, lalu ulangi."]},{"name":"Incline Dumbbell Curl","section":"Lengan","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Adjustable (FID) bench","optional":false}],"primary":[{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"}],"secondary":[{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"},{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"}],"steps":["Atur bench di sudut 45–60°, berbaring dengan lengan menggantung lurus.","Pegang dumbbell dengan telapak menghadap depan.","Angkat dumbbell tanpa memajukan siku.","Turunkan perlahan hingga lengan lurus penuh."]},{"name":"Reverse Curl","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"EZ curl bar","optional":false}],"primary":[{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"},{"muscle":"Brachialis","group":"Biceps","groupId":"biceps"}],"secondary":[{"muscle":"Extensor carpi radialis (longus & brevis)","group":"Forearms","groupId":"forearms"},{"muscle":"Extensor digitorum","group":"Forearms","groupId":"forearms"},{"muscle":"Biceps brachii (long head)","group":"Biceps","groupId":"biceps"},{"muscle":"Biceps brachii (short head)","group":"Biceps","groupId":"biceps"}],"steps":["Berdiri memegang EZ bar overhand (telapak menghadap bawah).","Jaga siku di samping badan.","Angkat bar ke arah bahu.","Turunkan perlahan, lalu ulangi."]},{"name":"Triceps Pushdown","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Cable crossover station","optional":false},{"name":"Cable attachments","optional":false}],"primary":[{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"}],"steps":["Pasang rope atau straight bar di pulley tinggi.","Berdiri tegak, siku menempel di samping badan.","Dorong handle ke bawah hingga lengan lurus.","Kembalikan perlahan sampai lengan bawah sejajar lantai."]},{"name":"Skull Crusher","section":"Lengan","categories":["Gym"],"level":"Menengah","equipment":[{"name":"EZ curl bar","optional":false},{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"secondary":[],"steps":["Berbaring di flat bench, tahan EZ bar di atas dada dengan lengan lurus.","Condongkan lengan atas sedikit ke arah kepala.","Tekuk siku dan turunkan bar ke dahi atau di belakang kepala.","Luruskan siku kembali tanpa menggerakkan lengan atas."]},{"name":"Overhead Triceps Extension","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false}],"primary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"}],"secondary":[{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"}],"steps":["Berdiri atau duduk, pegang satu dumbbell dengan kedua tangan di atas kepala.","Jaga siku menghadap depan dan dekat kepala.","Turunkan dumbbell ke belakang kepala dengan menekuk siku.","Luruskan kembali ke atas."]},{"name":"Close-grip Bench Press","section":"Lengan","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Flat bench","optional":false},{"name":"Power rack / squat cage","optional":false}],"primary":[{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"}],"secondary":[{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"},{"muscle":"Pectoralis major (clavicular head)","group":"Chest","groupId":"chest"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Berbaring di bench, genggam bar selebar bahu.","Angkat bar dari rack dan tahan di atas dada.","Turunkan bar ke dada bawah dengan siku dekat badan.","Dorong ke atas hingga lengan lurus."]},{"name":"Bench Dip","section":"Lengan","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"}],"steps":["Duduk di tepi bench, letakkan tangan di samping pinggul.","Geser pinggul ke depan dari bench, kaki lurus atau menekuk.","Tekuk siku dan turunkan pinggul hingga siku sekitar 90°.","Dorong kembali ke atas hingga lengan lurus."]},{"name":"Wrist Curl","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Palmaris longus","group":"Forearms","groupId":"forearms"}],"secondary":[],"steps":["Duduk dan letakkan lengan bawah di paha atau bench, telapak menghadap atas.","Biarkan pergelangan tangan menggantung di luar tepi.","Tekuk pergelangan tangan ke atas sejauh mungkin.","Turunkan perlahan, lalu ulangi."]},{"name":"Reverse Wrist Curl","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Extensor carpi radialis (longus & brevis)","group":"Forearms","groupId":"forearms"},{"muscle":"Extensor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Extensor digitorum","group":"Forearms","groupId":"forearms"}],"secondary":[{"muscle":"Brachioradialis","group":"Forearms","groupId":"forearms"}],"steps":["Letakkan lengan bawah di paha atau bench, telapak menghadap bawah.","Biarkan pergelangan tangan menggantung di luar tepi.","Angkat punggung tangan ke atas.","Turunkan perlahan, lalu ulangi."]},{"name":"Farmer's Carry","section":"Lengan","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":false},{"name":"Kettlebells","optional":true}],"primary":[{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"}],"steps":["Ambil dumbbell atau kettlebell berat di kedua tangan.","Berdiri tegak, bahu ke belakang, perut kencang.","Berjalan dengan langkah pendek dan stabil sejauh jarak yang ditentukan.","Letakkan beban dengan menekuk lutut dan pinggul."]},{"name":"Barbell Back Squat","section":"Kaki & Bokong","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Power rack / squat cage","optional":false}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Soleus","group":"Calves","groupId":"calves"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"steps":["Letakkan bar di punggung atas (di atas trapezius), lepaskan dari rack dan mundur dua langkah.","Kaki selebar bahu, ujung kaki sedikit menghadap keluar.","Tarik napas, kencangkan perut, lalu turun dengan mendorong pinggul ke belakang dan menekuk lutut.","Turun hingga paha minimal sejajar lantai, lutut searah ujung kaki.","Dorong lantai dan berdiri kembali hingga pinggul dan lutut lurus."]},{"name":"Front Squat","section":"Kaki & Bokong","categories":["Gym"],"level":"Lanjut","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Power rack / squat cage","optional":false}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"}],"secondary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"}],"steps":["Letakkan bar di depan bahu, siku tinggi ke depan (front rack).","Lepaskan dari rack, kaki selebar bahu.","Turun dengan badan tegak hingga paha di bawah sejajar.","Dorong ke atas sambil menjaga siku tetap tinggi."]},{"name":"Goblet Squat","section":"Kaki & Bokong","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Kettlebells","optional":false},{"name":"Dumbbells (fixed)","optional":true}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Pegang kettlebell atau dumbbell di depan dada dengan kedua tangan.","Kaki sedikit lebih lebar dari bahu.","Turun dengan siku masuk di antara lutut, badan tetap tegak.","Dorong kembali ke atas."]},{"name":"Bodyweight Squat","section":"Kaki & Bokong","categories":["Bodyweight"],"level":"Pemula","equipment":[],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Soleus","group":"Calves","groupId":"calves"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"}],"steps":["Berdiri dengan kaki selebar bahu, tangan lurus ke depan.","Dorong pinggul ke belakang dan tekuk lutut.","Turun hingga paha sejajar lantai, tumit tetap menapak.","Berdiri kembali sambil meremas bokong."]},{"name":"Leg Press","section":"Kaki & Bokong","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Leg press","optional":false}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Soleus","group":"Calves","groupId":"calves"}],"steps":["Duduk dengan punggung menempel, kaki di platform selebar bahu.","Lepaskan pengaman dan luruskan kaki tanpa mengunci lutut.","Turunkan platform hingga lutut sekitar 90°, pinggul tidak terangkat.","Dorong platform kembali ke atas."]},{"name":"Hack Squat","section":"Kaki & Bokong","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Hack squat","optional":false}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"}],"secondary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"}],"steps":["Berdiri di platform dengan punggung dan bahu menempel bantalan.","Kaki selebar bahu di tengah platform, lepaskan pengaman.","Turun dengan menekuk lutut hingga paha sejajar platform.","Dorong kembali ke atas."]},{"name":"Bulgarian Split Squat","section":"Kaki & Bokong","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Dumbbells (fixed)","optional":true},{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Soleus","group":"Calves","groupId":"calves"}],"steps":["Berdiri membelakangi bench, letakkan punggung kaki belakang di atas bench.","Kaki depan maju cukup jauh, pegang dumbbell jika perlu.","Turunkan badan hingga paha depan sejajar lantai.","Dorong dengan kaki depan untuk berdiri kembali. Selesaikan lalu ganti sisi."]},{"name":"Walking Lunge","section":"Kaki & Bokong","categories":["Gym","Bodyweight"],"level":"Pemula","equipment":[{"name":"Dumbbells (fixed)","optional":true}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"}],"steps":["Berdiri tegak, pegang dumbbell di samping jika ingin tambahan beban.","Melangkah lebar ke depan dan turunkan lutut belakang hampir ke lantai.","Kedua lutut membentuk sudut sekitar 90°.","Dorong dengan kaki depan dan langsung melangkah dengan kaki lain."]},{"name":"Step-up","section":"Kaki & Bokong","categories":["Gym","Bodyweight"],"level":"Pemula","equipment":[{"name":"Plyo box","optional":false},{"name":"Dumbbells (fixed)","optional":true}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"}],"steps":["Berdiri di depan box atau bench, letakkan satu kaki di atasnya.","Dorong dengan kaki di atas box hingga berdiri penuh.","Turun perlahan dengan kaki yang sama mengontrol gerakan.","Selesaikan repetisi lalu ganti kaki."]},{"name":"Romanian Deadlift","section":"Kaki & Bokong","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri tegak memegang barbell di depan paha.","Tekuk lutut sedikit dan kunci di sudut itu.","Dorong pinggul ke belakang, turunkan bar dekat kaki hingga hamstring terasa meregang.","Kembali tegak dengan mendorong pinggul ke depan."]},{"name":"Sumo Deadlift","section":"Kaki & Bokong","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false}],"primary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"}],"secondary":[{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Adductor longus","group":"Adductors","groupId":"adductors"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri dengan kaki sangat lebar, ujung kaki menghadap keluar, bar di atas pertengahan kaki.","Pegang bar di antara kaki dengan lengan lurus.","Dada terangkat, dorong lutut keluar, lalu dorong lantai untuk berdiri.","Kunci pinggul di atas, lalu turunkan dengan terkontrol."]},{"name":"Leg Extension","section":"Kaki & Bokong","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Leg extension","optional":false}],"primary":[{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"}],"secondary":[],"steps":["Duduk dengan lutut sejajar sumbu mesin, bantalan di atas pergelangan kaki.","Pegang handle di samping kursi.","Luruskan kaki hingga lutut hampir terkunci.","Turunkan perlahan, lalu ulangi."]},{"name":"Leg Curl","section":"Kaki & Bokong","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Leg curl (lying or seated)","optional":false}],"primary":[{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"}],"secondary":[{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"},{"muscle":"Gracilis","group":"Adductors","groupId":"adductors"},{"muscle":"Sartorius","group":"Quads","groupId":"quads"}],"steps":["Berbaring tengkurap (atau duduk) dengan bantalan di atas tumit.","Pastikan lutut sejajar sumbu mesin.","Tekuk lutut dan tarik tumit ke arah bokong.","Kembalikan perlahan hingga kaki hampir lurus."]},{"name":"Nordic Hamstring Curl","section":"Kaki & Bokong","categories":["Bodyweight","Calisthenics"],"level":"Lanjut","equipment":[{"name":"Exercise / yoga mat","optional":false},{"name":"GHD (glute-ham developer)","optional":true}],"primary":[{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"}],"secondary":[{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"steps":["Berlutut di matras dengan tumit dikunci (oleh partner atau penahan).","Badan lurus dari lutut ke kepala, tangan di depan dada.","Condongkan badan ke depan sepelan mungkin dengan menahan lewat hamstring.","Tangkap badan dengan tangan saat tidak kuat lagi, lalu dorong kembali ke atas."]},{"name":"Barbell Hip Thrust","section":"Kaki & Bokong","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"}],"steps":["Duduk dengan punggung atas bersandar di tepi bench, barbell di atas pinggul.","Kaki menapak selebar pinggul, lutut menekuk.","Dorong pinggul ke atas hingga badan lurus dari bahu ke lutut.","Remas bokong di atas, lalu turunkan perlahan."]},{"name":"Glute Bridge","section":"Kaki & Bokong","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"}],"steps":["Berbaring telentang, lutut menekuk, telapak kaki di lantai.","Tangan di samping badan.","Angkat pinggul hingga badan lurus dari bahu ke lutut.","Tahan sebentar, lalu turunkan perlahan."]},{"name":"Hip Abduction Machine","section":"Kaki & Bokong","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Hip abductor / adductor","optional":false}],"primary":[{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"},{"muscle":"Tensor fasciae latae","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"steps":["Duduk dengan bantalan di sisi luar lutut.","Punggung bersandar, pegang handle.","Buka kaki ke luar sejauh mungkin.","Kembalikan perlahan, lalu ulangi."]},{"name":"Hip Adduction Machine","section":"Kaki & Bokong","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Hip abductor / adductor","optional":false}],"primary":[{"muscle":"Adductor longus","group":"Adductors","groupId":"adductors"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Pectineus","group":"Adductors","groupId":"adductors"},{"muscle":"Gracilis","group":"Adductors","groupId":"adductors"}],"secondary":[],"steps":["Duduk dengan bantalan di sisi dalam lutut, kaki terbuka.","Punggung bersandar, pegang handle.","Rapatkan kaki ke tengah.","Buka kembali perlahan, lalu ulangi."]},{"name":"Copenhagen Plank","section":"Kaki & Bokong","categories":["Bodyweight"],"level":"Lanjut","equipment":[{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Adductor longus","group":"Adductors","groupId":"adductors"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Gracilis","group":"Adductors","groupId":"adductors"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"steps":["Posisi side plank di samping bench, letakkan kaki atas di atas bench.","Tumpu dengan siku di lantai.","Angkat pinggul hingga badan lurus, kaki bawah menggantung.","Tahan 10–30 detik, lalu ganti sisi."]},{"name":"Pistol Squat","section":"Kaki & Bokong","categories":["Calisthenics"],"level":"Lanjut","equipment":[],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"},{"muscle":"Soleus","group":"Calves","groupId":"calves"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Tibialis anterior","group":"Calves","groupId":"calves"}],"steps":["Berdiri dengan satu kaki, kaki lain lurus ke depan.","Tangan lurus ke depan untuk keseimbangan.","Turun perlahan dengan satu kaki hingga bokong mendekati tumit.","Dorong kembali ke atas tanpa kaki depan menyentuh lantai."]},{"name":"Box Jump","section":"Kaki & Bokong","categories":["Gym","Bodyweight"],"level":"Menengah","equipment":[{"name":"Plyo box","optional":false}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"}],"secondary":[{"muscle":"Soleus","group":"Calves","groupId":"calves"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"steps":["Berdiri di depan box, kaki selebar pinggul.","Tekuk lutut dan ayunkan lengan ke belakang.","Lompat eksplosif dan mendarat lembut di atas box dengan lutut menekuk.","Berdiri tegak, lalu turun dengan melangkah."]},{"name":"Standing Calf Raise","section":"Kaki & Bokong","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Calf raise machine","optional":false}],"primary":[{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"}],"secondary":[{"muscle":"Soleus","group":"Calves","groupId":"calves"},{"muscle":"Fibularis longus","group":"Calves","groupId":"calves"}],"steps":["Berdiri di mesin dengan bantalan di bahu, ujung kaki di tepi pijakan.","Turunkan tumit di bawah pijakan hingga betis meregang.","Angkat tumit setinggi mungkin.","Tahan sebentar, lalu turunkan perlahan."]},{"name":"Seated Calf Raise","section":"Kaki & Bokong","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Calf raise machine","optional":false}],"primary":[{"muscle":"Soleus","group":"Calves","groupId":"calves"}],"secondary":[{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"},{"muscle":"Fibularis longus","group":"Calves","groupId":"calves"}],"steps":["Duduk dengan bantalan di atas paha dekat lutut, ujung kaki di pijakan.","Lepaskan pengaman.","Angkat tumit setinggi mungkin.","Turunkan perlahan hingga betis meregang."]},{"name":"Tibialis Raise","section":"Kaki & Bokong","categories":["Bodyweight"],"level":"Pemula","equipment":[],"primary":[{"muscle":"Tibialis anterior","group":"Calves","groupId":"calves"}],"secondary":[{"muscle":"Extensor digitorum longus","group":"Calves","groupId":"calves"}],"steps":["Bersandar di dinding dengan tumit sekitar satu langkah di depan.","Kaki lurus, berat badan di tumit.","Angkat ujung kaki ke arah tulang kering setinggi mungkin.","Turunkan perlahan, lalu ulangi."]},{"name":"Kettlebell Swing","section":"Kaki & Bokong","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Kettlebells","optional":false}],"primary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"}],"secondary":[{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"},{"muscle":"Adductor magnus","group":"Adductors","groupId":"adductors"}],"steps":["Berdiri dengan kaki sedikit lebih lebar dari bahu, kettlebell di depan.","Bungkuk dari pinggul, pegang kettlebell dan ayunkan ke antara kaki.","Dorong pinggul ke depan dengan kuat hingga kettlebell terayun setinggi dada.","Biarkan kettlebell jatuh kembali ke antara kaki dan langsung ulangi."]},{"name":"Plank","section":"Core","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"}],"steps":["Tumpu dengan lengan bawah di lantai, siku di bawah bahu.","Luruskan kaki, badan lurus dari kepala ke tumit.","Kencangkan perut dan bokong.","Tahan selama waktu yang ditentukan tanpa pinggul turun."]},{"name":"Side Plank","section":"Core","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"secondary":[{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Tensor fasciae latae","group":"Glutes","groupId":"glutes"}],"steps":["Berbaring miring, tumpu dengan satu siku di bawah bahu.","Tumpuk kedua kaki.","Angkat pinggul hingga badan lurus.","Tahan, lalu ganti sisi."]},{"name":"Crunch","section":"Core","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"steps":["Berbaring telentang, lutut menekuk, tangan di samping kepala.","Angkat bahu dari lantai dengan menggulung tulang belakang.","Tahan sebentar di atas.","Turunkan perlahan, lalu ulangi."]},{"name":"Bicycle Crunch","section":"Core","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"secondary":[{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"}],"steps":["Berbaring telentang, tangan di samping kepala, angkat kaki.","Tarik satu lutut ke dada sambil memutar siku berlawanan ke arahnya.","Luruskan kaki itu sambil menarik lutut lain.","Ulangi bergantian seperti mengayuh sepeda."]},{"name":"Hanging Leg Raise","section":"Core","categories":["Calisthenics"],"level":"Menengah","equipment":[{"name":"Pull-up bar","optional":false}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Sartorius","group":"Quads","groupId":"quads"},{"muscle":"Tensor fasciae latae","group":"Glutes","groupId":"glutes"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"}],"steps":["Gantung di bar dengan lengan lurus.","Kencangkan perut dan hentikan ayunan.","Angkat kaki lurus hingga sejajar lantai atau lebih tinggi.","Turunkan perlahan tanpa berayun."]},{"name":"Lying Leg Raise","section":"Core","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Sartorius","group":"Quads","groupId":"quads"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"steps":["Berbaring telentang, tangan di samping atau di bawah pinggul.","Angkat kaki lurus hingga tegak lurus lantai.","Turunkan perlahan tanpa punggung bawah terangkat.","Berhenti sebelum kaki menyentuh lantai, lalu ulangi."]},{"name":"Russian Twist","section":"Core","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Medicine ball","optional":true},{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"secondary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"}],"steps":["Duduk dengan lutut menekuk, condongkan badan ke belakang sekitar 45°.","Pegang medicine ball atau satukan tangan di depan dada.","Putar badan ke kanan, lalu ke kiri.","Angkat kaki dari lantai untuk menambah tingkat kesulitan."]},{"name":"Ab Wheel Rollout","section":"Core","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Ab wheel","optional":false},{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"}],"steps":["Berlutut di matras dan pegang ab wheel di depan lutut.","Gulirkan roda ke depan perlahan sambil menjaga punggung lurus.","Berhenti saat badan hampir sejajar lantai.","Tarik kembali dengan perut ke posisi awal."]},{"name":"Cable Crunch","section":"Core","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Cable crossover station","optional":false},{"name":"Cable attachments","optional":false}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"steps":["Pasang rope di pulley tinggi, berlutut menghadap mesin.","Pegang rope di samping kepala.","Bungkukkan badan ke bawah dengan menggulung tulang belakang.","Kembali perlahan, lalu ulangi."]},{"name":"Cable Woodchopper","section":"Core","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Cable crossover station","optional":false},{"name":"Cable attachments","optional":false}],"primary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"secondary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"}],"steps":["Pasang D-handle di pulley tinggi, berdiri menyamping dari mesin.","Pegang handle dengan kedua tangan.","Tarik handle secara diagonal ke bawah melintasi badan sambil memutar torso.","Kembali perlahan, selesaikan lalu ganti sisi."]},{"name":"Pallof Press","section":"Core","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Cable crossover station","optional":false},{"name":"Cable attachments","optional":false},{"name":"Loop resistance bands","optional":true}],"primary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"}],"secondary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Gluteus medius","group":"Glutes","groupId":"glutes"}],"steps":["Pasang handle di pulley setinggi dada, berdiri menyamping dari mesin.","Pegang handle di depan dada dengan kedua tangan.","Dorong handle lurus ke depan tanpa membiarkan badan berputar.","Tahan 2 detik, lalu tarik kembali ke dada."]},{"name":"Mountain Climber","section":"Core","categories":["Bodyweight"],"level":"Pemula","equipment":[],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"steps":["Posisi push-up dengan lengan lurus.","Tarik satu lutut ke arah dada.","Kembalikan kaki dan langsung tarik lutut lain.","Lakukan bergantian dengan cepat sambil menjaga pinggul rendah."]},{"name":"Dead Bug","section":"Core","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"}],"steps":["Berbaring telentang dengan lengan lurus ke atas, lutut 90° di udara.","Tekan punggung bawah ke lantai.","Luruskan satu kaki dan lengan berlawanan menjauh dari badan.","Kembalikan, lalu ulangi dengan sisi lain."]},{"name":"Hollow Body Hold","section":"Core","categories":["Calisthenics"],"level":"Menengah","equipment":[{"name":"Exercise / yoga mat","optional":true}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"}],"steps":["Berbaring telentang, lengan lurus di atas kepala.","Tekan punggung bawah ke lantai.","Angkat bahu dan kaki beberapa sentimeter dari lantai.","Tahan posisi seperti perahu selama waktu yang ditentukan."]},{"name":"L-sit","section":"Core","categories":["Calisthenics"],"level":"Lanjut","equipment":[{"name":"Parallettes","optional":false},{"name":"Dip station / parallel bars","optional":true}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Trapezius (ascending / lower)","group":"Traps","groupId":"traps"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Sartorius","group":"Quads","groupId":"quads"}],"steps":["Letakkan tangan di parallettes atau parallel bar.","Tekan ke bawah hingga lengan lurus dan bahu turun.","Angkat kaki lurus ke depan hingga sejajar lantai.","Tahan selama mungkin sambil menjaga kaki lurus."]},{"name":"Dragon Flag","section":"Core","categories":["Calisthenics"],"level":"Lanjut","equipment":[{"name":"Flat bench","optional":false}],"primary":[{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"}],"secondary":[{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"steps":["Berbaring di bench, pegang tepi bench di belakang kepala.","Angkat badan hingga hanya bahu yang menyentuh bench.","Turunkan badan lurus perlahan seperti papan.","Berhenti sebelum menyentuh bench, lalu angkat kembali."]},{"name":"Burpee","section":"Full body & Kardio","categories":["Bodyweight"],"level":"Menengah","equipment":[],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Pectoralis major (sternocostal head)","group":"Chest","groupId":"chest"}],"secondary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"}],"steps":["Berdiri tegak, lalu jongkok dan letakkan tangan di lantai.","Lompatkan kaki ke belakang ke posisi push-up dan lakukan satu push-up.","Lompatkan kaki kembali ke dekat tangan.","Lompat ke atas dengan tangan di atas kepala, lalu ulangi."]},{"name":"Power Clean","section":"Full body & Kardio","categories":["Gym"],"level":"Lanjut","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Bumper plates","optional":false}],"primary":[{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Biceps femoris (long head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Biceps femoris (short head)","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semitendinosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Semimembranosus","group":"Hamstrings","groupId":"hamstrings"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"}],"secondary":[{"muscle":"Erector spinae (iliocostalis & longissimus)","group":"Lower back","groupId":"lowback"},{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"},{"muscle":"Soleus","group":"Calves","groupId":"calves"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"}],"steps":["Berdiri dengan bar di atas pertengahan kaki, pegang sedikit lebih lebar dari bahu.","Angkat bar dari lantai seperti deadlift hingga di atas lutut.","Lompat eksplosif dengan meluruskan pinggul, lutut, dan pergelangan kaki, lalu angkat bahu.","Tarik badan ke bawah bar dan tangkap di depan bahu dengan siku tinggi.","Berdiri tegak, lalu turunkan bar dengan terkontrol."]},{"name":"Thruster","section":"Full body & Kardio","categories":["Gym"],"level":"Menengah","equipment":[{"name":"Olympic barbell","optional":false},{"name":"Iron / rubber-coated plates","optional":false},{"name":"Dumbbells (fixed)","optional":true}],"primary":[{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Trapezius (descending / upper)","group":"Traps","groupId":"traps"}],"steps":["Pegang barbell di depan bahu (front rack), kaki selebar bahu.","Lakukan front squat hingga paha sejajar lantai.","Dorong ke atas dengan eksplosif dan lanjutkan dengan mendorong bar ke atas kepala.","Turunkan bar ke bahu sambil langsung masuk ke squat berikutnya."]},{"name":"Turkish Get-up","section":"Full body & Kardio","categories":["Gym"],"level":"Lanjut","equipment":[{"name":"Kettlebells","optional":false}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"External oblique","group":"Obliques","groupId":"obliques"},{"muscle":"Gluteus maximus","group":"Glutes","groupId":"glutes"}],"secondary":[{"muscle":"Triceps brachii (long head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (lateral head)","group":"Triceps","groupId":"triceps"},{"muscle":"Triceps brachii (medial head)","group":"Triceps","groupId":"triceps"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Serratus anterior","group":"Obliques","groupId":"obliques"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"}],"steps":["Berbaring telentang, pegang kettlebell dengan lengan lurus ke atas.","Tekuk lutut di sisi yang sama, lalu bangun ke siku dan ke tangan.","Angkat pinggul, tarik kaki lurus ke bawah badan hingga berlutut.","Berdiri penuh sambil mata tetap ke kettlebell.","Balik urutan langkah untuk kembali berbaring."]},{"name":"Jump Rope","section":"Full body & Kardio","categories":["Bodyweight"],"level":"Pemula","equipment":[{"name":"Jump rope","optional":false}],"primary":[{"muscle":"Gastrocnemius (medial head)","group":"Calves","groupId":"calves"},{"muscle":"Gastrocnemius (lateral head)","group":"Calves","groupId":"calves"},{"muscle":"Soleus","group":"Calves","groupId":"calves"}],"secondary":[{"muscle":"Tibialis anterior","group":"Calves","groupId":"calves"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"}],"steps":["Pegang handle tali di samping pinggul.","Putar tali dengan pergelangan tangan, bukan bahu.","Lompat rendah dengan ujung kaki saat tali lewat di bawah.","Jaga ritme stabil selama waktu yang ditentukan."]},{"name":"Battle Rope Waves","section":"Full body & Kardio","categories":["Gym"],"level":"Pemula","equipment":[{"name":"Battle ropes","optional":false}],"primary":[{"muscle":"Deltoid (anterior)","group":"Shoulders","groupId":"shoulders"},{"muscle":"Deltoid (lateral)","group":"Shoulders","groupId":"shoulders"}],"secondary":[{"muscle":"Flexor digitorum superficialis","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi ulnaris","group":"Forearms","groupId":"forearms"},{"muscle":"Flexor carpi radialis","group":"Forearms","groupId":"forearms"},{"muscle":"Rectus abdominis","group":"Abs","groupId":"abs"},{"muscle":"Rectus femoris","group":"Quads","groupId":"quads"},{"muscle":"Vastus lateralis","group":"Quads","groupId":"quads"},{"muscle":"Vastus medialis","group":"Quads","groupId":"quads"},{"muscle":"Latissimus dorsi","group":"Lats","groupId":"lats"}],"steps":["Pegang ujung tali, berdiri dengan lutut sedikit menekuk (quarter squat).","Perut kencang, dada terbuka.","Gerakkan lengan naik-turun bergantian dengan cepat untuk membuat gelombang.","Lakukan selama interval yang ditentukan."]}];
// ---------------------------------------------------------------- exercise library
// An exercise = pose(c) for contraction c in [0,1] + a tempo timeline + muscles to colour.
const quatConj = (q) => [-q[0], -q[1], -q[2], q[3]];
const quatRot = (q, v) => {
  const u = [q[0], q[1], q[2]], s = q[3];
  const t = mul(cross(u, v), 2);
  return add(add(v, mul(t, s)), cross(u, t));
};
function quatFromMat(m) { // m: 3x3 row-major [r0, r1, r2]
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const tr = a + e + i; let x, y, z, w;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = 0.25 * s; x = (h - f) / s; y = (c - g) / s; z = (d - b) / s; }
  else if (a > e && a > i) { const s = Math.sqrt(1 + a - e - i) * 2; w = (h - f) / s; x = 0.25 * s; y = (b + d) / s; z = (c + g) / s; }
  else if (e > i) { const s = Math.sqrt(1 + e - a - i) * 2; w = (c - g) / s; x = (b + d) / s; y = 0.25 * s; z = (f + h) / s; }
  else { const s = Math.sqrt(1 + i - a - e) * 2; w = (d - b) / s; x = (c + g) / s; y = (f + h) / s; z = 0.25 * s; }
  const n = Math.hypot(x, y, z, w); return [x / n, y / n, z / n, w / n];
}
// rotation taking frame (d0, u0) onto (d1, u1)
function quatFrames(d0, u0, d1, u1) {
  const fr = (d, u) => { const a = norm(d), b = norm(sub(u, mul(a, dot(u, a)))), c = cross(a, b); return [a, b, c]; };
  const A = fr(d0, u0), B = fr(d1, u1);
  // R = B * A^T  (columns of A/B are the frame axes)
  const R = [0, 1, 2].map((r) => [0, 1, 2].map((c) => B[0][r] * A[0][c] + B[1][r] * A[1][c] + B[2][r] * A[2][c]));
  return quatFromMat(R);
}
function signedAngle(a, b, axis) { return Math.atan2(dot(cross(a, b), axis), dot(a, b)); }

// ---------------------------------------------------------------- two-bone chains & pose builder
const CHAIN = (() => {
  const make = (S, E, W, hinge) => {
    const a = len(sub(E, S)), b = len(sub(W, E));
    const ua = norm(sub(E, S)), fa = norm(sub(W, E));
    return { S, E, W, a, b, ua, fa, hinge: hinge || norm(cross(norm(sub([0, 0, 1], mul(fa, fa[2]))), fa)) };
  };
  return {
    armL: make(J.shoulder, J.elbow, J.wrist), armR: make(mir(J.shoulder), mir(J.elbow), mir(J.wrist)),
    legL: make(J.hip, J.knee, J.ankle, [-1, 0, 0]), legR: make(mir(J.hip), mir(J.knee), mir(J.ankle), [-1, 0, 0]),
  };
})();
const ARM = { L: CHAIN.armL, R: CHAIN.armR };
// IK in the chain's rest space -> local quaternions [upper, lower (rel. upper), end (rel. lower)]
function twoBone(A, target, pole, palmTarget, twistShare = 0.55) {
  const d = sub(target, A.S), dl = Math.max(1e-6, len(d)), dn = mul(d, 1 / dl);
  const L = clamp(dl, Math.abs(A.a - A.b) + 1e-3, (A.a + A.b) * 0.9995);
  const ca = clamp((A.a * A.a + L * L - A.b * A.b) / (2 * A.a * L), -1, 1), sa = Math.sqrt(1 - ca * ca);
  let pp = sub(pole, mul(dn, dot(pole, dn)));
  if (len(pp) < 1e-5) pp = Math.abs(dn[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
  pp = norm(pp);
  const E = add(A.S, add(mul(dn, A.a * ca), mul(pp, A.a * sa)));
  const W = add(A.S, mul(dn, L));
  const ua1 = norm(sub(E, A.S)), fa1 = norm(sub(W, E));
  const h1 = mul(norm(cross(ua1, fa1)), -1);
  const qU = quatFrames(A.ua, A.hinge, ua1, h1);
  const qL0 = quatFrames(A.fa, A.hinge, fa1, h1);
  let tw = 0;
  if (palmTarget) {
    const n0 = quatRot(qL0, [0, 0, 1]);
    const n1 = norm(sub(palmTarget, mul(fa1, dot(palmTarget, fa1))));
    tw = signedAngle(n0, n1, fa1);
  }
  const qL = quatMul(quatAxis(fa1, tw * twistShare), qL0);
  const qE = quatMul(quatAxis(fa1, tw), qL0);
  return [qU, quatMul(quatConj(qU), qL), quatMul(quatConj(qL), qE)];
}
// legacy body-space arm IK (rest pose spine) used by the bench press
function armIK(side, wristTarget, pole, palmTarget, twistShare = 0.55) {
  const r = twoBone(CHAIN['arm' + side], wristTarget, pole, palmTarget, twistShare);
  return { ['upperArm' + side]: r[0], ['foreArm' + side]: r[1], ['hand' + side]: r[2] };
}
const QI = [0, 0, 0, 1];
const Rx = (a) => quatAxis([1, 0, 0], a), Ry = (a) => quatAxis([0, 1, 0], a), Rz = (a) => quatAxis([0, 0, 1], a);
const SUPINE = Rx(-Math.PI / 2); // lying on the back, head toward -z
const PRONE = Rx(Math.PI / 2);   // lying face down, head toward +z
const xfMul = (A, B) => ({ q: quatMul(A.q, B.q), t: add(quatRot(A.q, B.t), A.t) });
const xfPt = (X, p) => add(quatRot(X.q, p), X.t);
const xfInvPt = (X, p) => quatRot(quatConj(X.q), sub(p, X.t));
const HAND = (() => { const f = handFrame(); return { d: f.d, palm: f.fwd, contact: f.at(0.05, 0, 0.017), wrist: J.wrist }; })();
const sideV = (side, p) => (side === 'L' ? p : mir(p));
// world orientation for a hand: fingers along `fingers`, palm facing `palmN`
function handQuat(side, fingers, palmN) { return quatFrames(sideV(side, HAND.d), sideV(side, HAND.palm), fingers, palmN); }
// wrist position that puts the palm contact point at `contact` with hand orientation q
function wristFor(side, q, contact) { return sub(contact, quatRot(q, sub(sideV(side, HAND.contact), sideV(side, HAND.wrist)))); }
const TOE = [0.134, 0.0, 0.15], HEEL = [0.118, 0.0, -0.07], BALL = [0.13, 0.0, 0.11];

class PoseBuilder {
  constructor() { this.rot = {}; this.rp = [0, 0, 0]; this.rq = QI; this.W = null; }
  set(name, q) { this.rot[name] = q; this.W = null; return this; }
  mul(name, q) { return this.set(name, quatMul(this.rot[name] || QI, q)); }
  root(q, p) { if (q) this.rq = q; if (p) this.rp = p; this.W = null; return this; }
  fk() {
    const W = [];
    for (const b of BONES) {
      const q = this.rot[b.name] || QI;
      const local = { q, t: sub(b.pivot, quatRot(q, b.pivot)) };
      if (b.parentIndex < 0) W[b.index] = xfMul({ q: this.rq, t: sub(add(this.rp, b.pivot), quatRot(this.rq, b.pivot)) }, local);
      else W[b.index] = xfMul(W[b.parentIndex], local);
    }
    this.W = W;
  }
  world(name) { if (!this.W) this.fk(); return this.W[BONE_INDEX[name]]; }
  pt(name, p) { return xfPt(this.world(name), p); }
  dir(name, v) { return quatRot(this.world(name).q, v); }
  shift(d) { this.rp = add(this.rp, d); this.W = null; return this; }
  pin(name, p, target, axes = [1, 1, 1]) { const d = sub(target, this.pt(name, p)); return this.shift([d[0] * axes[0], d[1] * axes[1], d[2] * axes[2]]); }
  orient(name, qWorld) { const b = BONES[BONE_INDEX[name]]; return this.set(name, quatMul(quatConj(this.world(BONES[b.parentIndex].name).q), qWorld)); }
  arm(side, target, pole, palm, share) {
    const P = this.world('clav' + side), ci = quatConj(P.q);
    const r = twoBone(CHAIN['arm' + side], xfInvPt(P, target), quatRot(ci, pole), palm ? quatRot(ci, palm) : null, share);
    return this.set('upperArm' + side, r[0]).set('foreArm' + side, r[1]).set('hand' + side, r[2]);
  }
  leg(side, target, pole) {
    const P = this.world('pelvis'), ci = quatConj(P.q);
    const r = twoBone(CHAIN['leg' + side], xfInvPt(P, target), quatRot(ci, pole), null);
    return this.set('thigh' + side, r[0]).set('shin' + side, r[1]);
  }
  ground(y = 0, pts = CONTACTS) { let m = Infinity; for (const [n, p] of pts) m = Math.min(m, this.pt(n, p)[1]); return this.shift([0, y - m, 0]); }
  out() { return { ...this.rot, root: { pos: this.rp.slice(), rot: this.rq } }; }
}
// body surface sample points (rest space) used to rest a pose on the floor
const CONTACTS = (() => {
  const c = [['head', [0, 1.77, 0]], ['head', [0, 1.665, -0.092]], ['head', [0, 1.66, 0.1]], ['chest', [0, 1.33, -0.115]], ['chest', [0, 1.32, 0.12]],
    ['spine2', [0, 1.18, -0.1]], ['spine2', [0, 1.18, 0.1]], ['spine1', [0, 1.06, -0.09]], ['spine1', [0, 1.04, 0.1]], ['pelvis', [0, 0.92, 0.1]]];
  const s = [['pelvis', [0.07, 0.87, -0.12]], ['pelvis', [0.16, 0.93, 0]], ['chest', [0.12, 1.33, -0.1]], ['upperArm', [0.23, 1.38, -0.02]], ['upperArm', [0.27, 1.115, -0.075]],
    ['foreArm', [0.31, 1.0, -0.04]], ['hand', [0.36, 0.8, 0.02]], ['thigh', [0.1, 0.7, -0.07]], ['thigh', [0.1, 0.7, 0.07]], ['thigh', [0.165, 0.85, 0]],
    ['shin', [0.11, 0.5, 0.06]], ['shin', [0.12, 0.3, -0.06]], ['shin', [0.15, 0.3, 0]], ['foot', HEEL], ['foot', TOE], ['foot', [0.13, 0.085, 0.05]], ['foot', [0.16, 0.02, 0.02]]];
  for (const [n, p] of s) { c.push([boneName(n, 'L'), p]); c.push([boneName(n, 'R'), mir(p)]); }
  return c;
})();
// solve x in [lo,hi] so f(x) ≈ target (f monotone)
function solve(f, target, lo, hi, it = 14) {
  const up = f(hi) > f(lo);
  for (let i = 0; i < it; i++) { const m = (lo + hi) / 2; if ((f(m) < target) === up) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const ease = (a, b, x) => smoothstep(a, b, x);

// ---------------------------------------------------------------- reusable motion pieces
const pinToes = (P, which) => {
  const pts = which ? [P.pt('foot' + which, sideV(which, TOE))] : [P.pt('footL', TOE), P.pt('footR', mir(TOE))];
  const m = mul(pts.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / pts.length);
  return P.shift([0, -m[1], -m[2]]);
};
const shoulderY = (P) => (P.pt('upperArmL', J.shoulder)[1] + P.pt('upperArmR', mir(J.shoulder))[1]) / 2;
// straight prone body on the toes, tilted so the shoulder joints sit at height shY
function proneSupport(P, shY, extra, pinWhich) {
  const setup = (a) => { P.rot = Object.assign({}, extra || {}); P.root(Rx(Math.PI / 2 - a), [0, 0, 0]); pinToes(P, pinWhich); return shoulderY(P); };
  setup(solve(setup, shY, 0, 1.0));
  return P;
}
const handsDown = (P, place) => { // place(side, sg) -> { at, fingers, pole }
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1, o = place(s, sg);
    const q = handQuat(s, norm(o.fingers), [0, -1, 0]);
    P.arm(s, wristFor(s, q, o.at), o.pole, [0, -1, 0]);
    P.orient('hand' + s, q);
  }
  return P;
};
const floorHandsBySide = (P, z) => handsDown(P, (s, sg) => ({ at: [sg * 0.25, 0.004, z], fingers: [0, 0, 1], pole: [sg, 0.7, 0] }));
function pushupFamily(o) {
  let top = null;
  return (c) => {
    if (!top) { const Q = proneSupport(new PoseBuilder(), o.shTop); top = Q.pt('upperArmL', J.shoulder)[2]; }
    const P = proneSupport(new PoseBuilder(), o.shBot + (o.shTop - o.shBot) * c);
    return handsDown(P, (s, sg) => ({ at: [sg * o.width, 0.004, top + o.fwd], fingers: o.fingers(sg), pole: o.pole(sg) })).out();
  };
}
const HOLD = (inhale = 'Tahan · tarik napas', exhale = 'Tahan · buang napas') => [{ to: 0.9, dur: 2.2, label: inhale }, { to: 1, dur: 2.2, label: exhale }];
const CAM = (yaw, pitch, extent) => ({ yaw, pitch, extent, auto: true });

// ---------------------------------------------------------------- motions, keyed by exercise slug
const EX_MOTIONS = {
  'alternating-dumbbell-curl': {
    props: ['dumbbells'], hands: 'fist', shadows: 'standing', start: 0,
    camera: { yaw: 0.62, pitch: 0.06, ty: 1.05, tx: 0, tz: 0.04, extent: [0.55, 0.72] },
    timeline: [{ to: 1, dur: 1.2, label: 'Kiri · angkat' }, { to: 1, dur: 0.3, label: 'Kiri · tahan' }, { to: 0, dur: 1.9, label: 'Kiri · turunkan' }, { to: 0, dur: 0.3, label: 'Ganti tangan' },
      { to: 1, dur: 1.2, label: 'Kanan · angkat' }, { to: 1, dur: 0.3, label: 'Kanan · tahan' }, { to: 0, dur: 1.9, label: 'Kanan · turunkan' }, { to: 0, dur: 0.3, label: 'Ganti tangan' }],
    pose(c, t) {
      const act = t < 0.5 ? 'L' : 'R';
      const flex = (s) => 0.12 + (s === act ? 2.0 * c : 0);
      const lift = (s) => (s === act ? 0.06 * c : 0);
      return {
        upperArmL: quatMul(quatAxis(ARM.L.hinge, -0.06 - lift('L')), Rz(-0.2)), upperArmR: quatMul(quatAxis(ARM.R.hinge, -0.06 - lift('R')), Rz(0.2)),
        foreArmL: quatAxis(ARM.L.hinge, -flex('L')), foreArmR: quatAxis(ARM.R.hinge, -flex('R')),
        handL: quatAxis(ARM.L.hinge, act === 'L' ? 0.12 * c : 0), handR: quatAxis(ARM.R.hinge, act === 'R' ? 0.12 * c : 0),
      };
    },
  },
  'barbell-bench-press': {
    props: ['bench', 'barbell'], hands: 'fist', shadows: 'bench', start: 1,
    camera: { yaw: 0.62, pitch: 0.5, ty: 0.7, tx: 0, tz: -0.25, extent: [1.15, 0.72] },
    timeline: [{ to: 0, dur: 2.0, label: 'Turunkan · eksentrik' }, { to: 0, dur: 0.35, label: 'Sentuh dada' },
      { to: 1, dur: 1.25, label: 'Dorong · konsentrik' }, { to: 1, dur: 0.6, label: 'Tahan di atas' }],
    pose(c) {
      const rot = SUPINE, pos = [0, BENCH.top + 0.113 - J.pelvis[1], -0.02];
      const wy = 1.27 + 0.10 * c, wz = 0.085 + 0.41 * c, wx = 0.36;
      return {
        root: { pos, rot },
        ...armIK('L', [wx, wy, wz], [0.8, -0.2, -0.55], [0, -1, 0]),
        ...armIK('R', [-wx, wy, wz], [-0.8, -0.2, -0.55], [0, -1, 0]),
        thighL: quatMul(Rz(0.24), Rx(0.22)), thighR: quatMul(Rz(-0.24), Rx(0.22)),
        shinL: Rx(1.55), shinR: Rx(1.55), footL: Rx(-0.18), footR: Rx(-0.18),
        spine2: Rx(-0.05), neck: Rx(0.08),
      };
    },
  },
  'push-up': {
    props: ['mat'], start: 1, camera: CAM(0.95, 0.28, [1.0, 0.55]),
    timeline: [{ to: 0, dur: 1.7, label: 'Turunkan dada' }, { to: 0, dur: 0.25, label: 'Hampir menyentuh lantai' }, { to: 1, dur: 1.1, label: 'Dorong lantai' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose: pushupFamily({ shTop: 0.555, shBot: 0.2, width: 0.25, fwd: 0.0, fingers: (sg) => [sg * 0.12, 0, 1], pole: (sg) => [sg * 0.75, 0.45, -0.55] }),
  },
  'diamond-push-up': {
    props: ['mat'], start: 1, camera: CAM(0.95, 0.28, [1.0, 0.55]),
    timeline: [{ to: 0, dur: 1.8, label: 'Turunkan, siku rapat' }, { to: 0, dur: 0.25, label: 'Dada dekat tangan' }, { to: 1, dur: 1.2, label: 'Dorong ke atas' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose: pushupFamily({ shTop: 0.545, shBot: 0.24, width: 0.045, fwd: -0.15, fingers: (sg) => [-sg * 0.75, 0, 0.66], pole: (sg) => [sg * 0.15, 0.55, -0.8] }),
  },
  'plank': {
    props: ['mat'], start: 1, camera: CAM(0.95, 0.24, [1.0, 0.5]), timeline: HOLD(),
    pose(c) {
      const P = proneSupport(new PoseBuilder(), 0.335);
      const sz = P.pt('upperArmL', J.shoulder)[2];
      handsDown(P, (s, sg) => ({ at: [sg * 0.075, 0.004, sz + 0.27], fingers: [-sg * 0.3, 0, 1], pole: [0, -1, -0.25] }));
      return P.mul('chest', Rx(-0.03 * (c - 0.9) * 10)).out();
    },
  },
  'side-plank': {
    props: ['mat'], start: 1, camera: CAM(-Math.PI / 2 + 0.25, 0.12, [1.0, 0.55]), timeline: HOLD(),
    pose(c) {
      const P = new PoseBuilder();
      const setup = (a) => {
        P.rot = { thighL: Rz(-0.11), thighR: Rz(0.11) }; P.W = null;
        P.root(quatFrames([0, 1, 0], [1, 0, 0], [0, Math.sin(a), Math.cos(a)], [0, -Math.cos(a), Math.sin(a)]), [0, 0, 0]);
        const f = P.pt('footL', [0.165, 0.025, 0.02]); P.shift([0, -f[1], -f[2]]);
        return P.pt('upperArmL', J.shoulder)[1];
      };
      setup(solve(setup, 0.335 + 0.004 * (c - 0.9) * 10, 0, 1.0));
      const sL = P.pt('upperArmL', J.shoulder), front = P.dir('chest', [0, 0, 1]);
      const fr = norm([front[0], 0, front[2]]);
      const q = handQuat('L', fr, [0, -1, 0]);
      const at = add([sL[0], 0.004, sL[2]], mul(fr, 0.27));
      P.arm('L', wristFor('L', q, at), [0, -1, 0], [0, -1, 0]); P.orient('handL', q);
      P.arm('R', add(P.pt('pelvis', [-0.15, 0.99, 0.02]), [0, 0.03, 0]), add(P.dir('chest', [0, 0, -1]), [0, 0.6, 0]), null);
      return P.out();
    },
  },
  'bodyweight-squat': {
    props: [], start: 1, shadows: 'standing', camera: CAM(0.7, 0.1, [0.6, 0.95]),
    timeline: [{ to: 0, dur: 1.8, label: 'Duduk ke belakang' }, { to: 0, dur: 0.3, label: 'Paha sejajar lantai' }, { to: 1, dur: 1.2, label: 'Dorong naik' }, { to: 1, dur: 0.5, label: 'Berdiri tegak' }],
    pose(c) {
      const d = 1 - c, P = new PoseBuilder();
      P.root(Rx(0.42 * d), [0, -0.41 * d, -0.1 * d]).set('spine1', Rx(0.06 * d)).set('neck', Rx(-0.25 * d));
      for (const s of ['L', 'R']) {
        const sg = s === 'L' ? 1 : -1;
        P.leg(s, [sg * 0.16, J.ankle[1], J.ankle[2]], [sg * 0.35, 0, 1]);
        P.orient('foot' + s, Ry(sg * 0.26));
        P.set('upperArm' + s, quatMul(Rx(-1.45 * d), Rz(sg * -0.1 * d))).set('foreArm' + s, quatAxis(ARM[s].hinge, -0.2 * d));
      }
      return P.out();
    },
  },
  'walking-lunge': {
    props: [], start: 1, shadows: 'auto', camera: CAM(Math.PI / 2 - 0.35, 0.1, [0.75, 0.95]),
    timeline: [{ to: 0, dur: 1.5, label: 'Kaki kanan melangkah · turun' }, { to: 0, dur: 0.25, label: 'Lutut belakang dekat lantai' }, { to: 1, dur: 1.2, label: 'Dorong naik' },
      { to: 0, dur: 1.5, label: 'Kaki kiri melangkah · turun' }, { to: 0, dur: 0.25, label: 'Lutut belakang dekat lantai' }, { to: 1, dur: 1.2, label: 'Dorong naik' }],
    pose(c, t) {
      const f = t < 0.5 ? 'R' : 'L', b = f === 'R' ? 'L' : 'R', fsg = f === 'L' ? 1 : -1;
      const d = 1 - c, s = ease(0, 0.4, d), dep = ease(0.12, 1, d);
      const P = new PoseBuilder();
      P.root(Rx(0.05 * dep), [0, -0.41 * dep, 0.28 * s]);
      P.leg(f, [fsg * 0.11, J.ankle[1] + 0.06 * Math.sin(Math.PI * s), J.ankle[2] + 0.6 * s], [0, 0.1, 1]);
      P.orient('foot' + f, QI);
      const phi = 0.85 * ease(0.1, 1, d), qb = Rx(phi), B = sideV(b, BALL);
      const Bw = [B[0] * 0.95, 0, B[2] - 0.1 * s];
      P.leg(b, add(Bw, quatRot(qb, sub(sideV(b, J.ankle), B))), [0, -1, 0.35]);
      P.orient('foot' + b, qb);
      for (const sd of ['L', 'R']) P.set('upperArm' + sd, Rz((sd === 'L' ? -1 : 1) * 0.06));
      return P.out();
    },
  },
  'glute-bridge': {
    props: ['mat'], start: 0, camera: CAM(Math.PI / 2 - 0.45, 0.22, [0.85, 0.5]),
    timeline: [{ to: 1, dur: 1.0, label: 'Angkat pinggul' }, { to: 1, dur: 1.0, label: 'Tahan · remas bokong' }, { to: 0, dur: 1.5, label: 'Turunkan perlahan' }, { to: 0, dur: 0.4, label: 'Siap' }],
    pose: (() => {
      let Zf = null;
      const body = (c) => {
        const g = 0.62 * c, P = new PoseBuilder();
        P.root(quatMul(Rx(-g), SUPINE), [0, 0, 0]).set('neck', Rx(0.8 * g)).set('head', Rx(0.15 * g));
        P.pin('chest', [0, 1.37, -0.115], [0, 0, -0.42]);
        return P;
      };
      return (c) => {
        if (Zf === null) Zf = body(0).pt('pelvis', J.pelvis)[2] + 0.4;
        const P = body(c);
        for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1; P.leg(s, [sg * 0.13, J.ankle[1], Zf], [sg * 0.15, 1, 0.3]); P.orient('foot' + s, QI); }
        return floorHandsBySide(P, -0.12).out();
      };
    })(),
  },
  'crunch': {
    props: ['mat'], start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.2, [0.85, 0.5]),
    timeline: [{ to: 1, dur: 0.9, label: 'Gulung badan ke atas' }, { to: 1, dur: 0.5, label: 'Tahan · buang napas' }, { to: 0, dur: 1.3, label: 'Turunkan perlahan' }, { to: 0, dur: 0.4, label: 'Siap' }],
    pose(c) {
      const P = new PoseBuilder();
      P.root(SUPINE, [0, 0, 0]).set('spine1', Rx(0.1 * c)).set('spine2', Rx(0.3 * c)).set('chest', Rx(0.24 * c)).set('neck', Rx(0.18 * c));
      P.pin('pelvis', [0, 0.875, -0.112], [0, 0, 0]);
      const zf = P.pt('pelvis', J.pelvis)[2] + 0.44;
      for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1; P.leg(s, [sg * 0.13, J.ankle[1], zf], [sg * 0.15, 1, 0.3]); P.orient('foot' + s, QI); }
      for (const s of ['L', 'R']) {
        const sg = s === 'L' ? 1 : -1;
        P.arm(s, P.pt('chest', [-sg * 0.075, 1.335 - (s === 'R' ? 0.035 : 0), 0.15 + (s === 'R' ? 0.012 : 0)]), P.dir('chest', [sg, -0.3, 0.2]), null);
      }
      return P.out();
    },
  },
  'lying-leg-raise': {
    props: ['mat'], start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.2, [0.95, 0.55]),
    timeline: [{ to: 1, dur: 1.3, label: 'Angkat kaki lurus' }, { to: 1, dur: 0.35, label: 'Tahan' }, { to: 0, dur: 1.9, label: 'Turunkan perlahan' }, { to: 0, dur: 0.35, label: 'Kaki melayang' }],
    pose(c) {
      const P = new PoseBuilder(), f = 0.12 + 1.42 * c;
      P.root(SUPINE, [0, 0, 0]).set('thighL', Rx(-f)).set('thighR', Rx(-f)).set('footL', Rx(0.3)).set('footR', Rx(0.3));
      P.pin('pelvis', [0, 0.875, -0.112], [0, 0, 0]);
      return floorHandsBySide(P, P.pt('pelvis', J.pelvis)[2] - 0.05).out();
    },
  },
  'superman': {
    props: ['mat'], start: 0, camera: CAM(Math.PI / 2 - 0.55, 0.2, [1.15, 0.5]),
    timeline: [{ to: 1, dur: 1.0, label: 'Angkat lengan, dada & kaki' }, { to: 1, dur: 2.2, label: 'Tahan 2–3 detik' }, { to: 0, dur: 1.2, label: 'Turunkan perlahan' }, { to: 0, dur: 0.6, label: 'Rileks' }],
    pose(c) {
      const P = new PoseBuilder();
      P.root(PRONE, [0, 0, 0]);
      for (const s of ['L', 'R']) {
        const sg = s === 'L' ? 1 : -1;
        P.set('upperArm' + s, quatMul(Rx(-(2.92 + 0.24 * c)), Rz(sg * 0.1))).set('thigh' + s, quatMul(Rx(0.26 * c), Rz(sg * 0.04))).set('foot' + s, Rx(0.7));
      }
      P.set('spine2', Rx(-0.16 * c)).set('chest', Rx(-0.14 * c)).set('neck', Rx(-0.08 * c));
      return P.ground().out();
    },
  },
  'mountain-climber': {
    props: ['mat'], start: 0, camera: CAM(0.95, 0.26, [1.0, 0.55]),
    timeline: [{ to: 1, dur: 0.38, label: 'Lutut kanan ke dada' }, { to: 0, dur: 0.38, label: 'Kembali' }, { to: 1, dur: 0.38, label: 'Lutut kiri ke dada' }, { to: 0, dur: 0.38, label: 'Kembali' }],
    pose: (() => {
      let top = null;
      return (c, t) => {
        if (!top) { const Q = proneSupport(new PoseBuilder(), 0.555); top = Q.pt('upperArmL', J.shoulder)[2]; }
        const dr = t < 0.5 ? 'R' : 'L', pl = dr === 'R' ? 'L' : 'R';
        const P = proneSupport(new PoseBuilder(), 0.555, { ['thigh' + dr]: Rx(-1.05 * c), ['shin' + dr]: Rx(1.85 * c), ['foot' + dr]: Rx(0.5 * c) }, pl);
        return handsDown(P, (s, sg) => ({ at: [sg * 0.24, 0.004, top], fingers: [sg * 0.12, 0, 1], pole: [sg * 0.75, 0.45, -0.55] })).out();
      };
    })(),
  },
  'tibialis-raise': {
    props: [], start: 0, shadows: 'standing', camera: CAM(Math.PI / 2 - 0.25, 0.05, [0.55, 0.95]),
    timeline: [{ to: 1, dur: 0.8, label: 'Angkat ujung kaki' }, { to: 1, dur: 0.4, label: 'Tahan' }, { to: 0, dur: 1.2, label: 'Turunkan perlahan' }, { to: 0, dur: 0.3, label: 'Siap' }],
    pose(c) {
      const P = new PoseBuilder(), q = Rx(-0.48 * c);
      P.root(Rx(-0.06), [0, -0.012, -0.045]);
      for (const s of ['L', 'R']) {
        const H = sideV(s, HEEL);
        P.leg(s, add(H, quatRot(q, sub(sideV(s, J.ankle), H))), [0, 0, 1]);
        P.orient('foot' + s, q);
      }
      return P.out();
    },
  },
};


// ---------------------------------------------------------------- batch 2: dumbbell & barbell (standing / bench)
const shoulderW = (P, s) => P.pt('upperArm' + s, sideV(s, J.shoulder));
const SG = (s) => (s === 'L' ? 1 : -1);
// grip a handle at world point `grip`: fingers (wrist->knuckles) along d, palm facing n
function hold(P, side, grip, d, n, pole) {
  d = norm(d); n = norm(sub(n, mul(d, dot(n, d))));
  const q = handQuat(side, d, n);
  const w = sub(grip, quatRot(q, sub(sideV(side, GRIP_L), sideV(side, J.wrist))));
  P.arm(side, w, pole, n); P.orient('hand' + side, q);
  return P;
}
function standLegs(P, width = 0.13, pole = 0.1) {
  for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * width, J.ankle[1], J.ankle[2]], [sg * pole, 0, 1]); P.orient('foot' + s, Ry(sg * 0.08)); }
  return P;
}
// hip hinge: torso pitched forward `lean` rad, hips pushed back, knees soft
const hinge = (P, lean, back, drop) => standLegs(P.root(Rx(lean), [0, -drop, -back]).set('neck', Rx(-0.45 * lean)), 0.13, 0.12);
// point at distance r from the shoulder, at a given bar height/plane, used for hanging arms
const hangAt = (S, x, z, r = 0.6) => [x, S[1] - Math.sqrt(Math.max(0.01, r * r - (x - S[0]) ** 2 - (z - S[2]) ** 2)), z];
const BENCH_ROOT = { pos: [0, BENCH.top + 0.113 - J.pelvis[1], -0.02], rot: SUPINE };
const benchBody = () => {
  const P = new PoseBuilder();
  P.root(BENCH_ROOT.rot, BENCH_ROOT.pos).set('thighL', quatMul(Rz(0.24), Rx(0.22))).set('thighR', quatMul(Rz(-0.24), Rx(0.22)))
    .set('shinL', Rx(1.55)).set('shinR', Rx(1.55)).set('footL', Rx(-0.18)).set('footR', Rx(-0.18)).set('spine2', Rx(-0.05)).set('neck', Rx(0.08));
  return P;
};
const raiseTimeline = (up = 1.1, top = 0.3, down = 1.8, bottom = 0.35, l = ['Angkat', 'Tahan di atas', 'Turunkan perlahan', 'Siap']) =>
  [{ to: 1, dur: up, label: l[0] }, { to: 1, dur: top, label: l[1] }, { to: 0, dur: down, label: l[2] }, { to: 0, dur: bottom, label: l[3] }];
// arm swinging in the frontal plane (lateral raise / reverse fly): theta from hanging to horizontal
function abductArm(P, s, theta, fwd, r = 0.6, pole) {
  const sg = SG(s), S = shoulderW(P, s);
  const u = norm([sg * Math.sin(theta), -Math.cos(theta), fwd]);
  const n = [-sg * Math.cos(theta), -Math.sin(theta), 0];
  return hold(P, s, add(S, mul(u, r)), u, n, pole || [sg * 0.2, 0.5, -1]);
}

Object.assign(EX_MOTIONS, {
  'dumbbell-lateral-raise': {
    props: ['dumbbells'], hands: 'fist', start: 0, camera: CAM(0.25, 0.08, [0.75, 0.9]),
    timeline: raiseTimeline(1.1, 0.3, 1.8, 0.35, ['Angkat ke samping', 'Sejajar bahu', 'Turunkan perlahan', 'Siap']),
    pose(c) { const P = standLegs(new PoseBuilder()); for (const s of ['L', 'R']) abductArm(P, s, 0.14 + 1.42 * c, 0.18, 0.585); return P.out(); },
  },
  'dumbbell-front-raise': {
    props: ['dumbbells'], hands: 'fist', start: 0, camera: CAM(0.95, 0.06, [0.6, 0.9]),
    timeline: raiseTimeline(1.1, 0.3, 1.8, 0.35, ['Angkat ke depan', 'Sejajar bahu', 'Turunkan perlahan', 'Siap']),
    pose(c) {
      const P = standLegs(new PoseBuilder()), th = 0.12 + 1.45 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s), u = norm([-sg * 0.06, -Math.cos(th), Math.sin(th)]);
        hold(P, s, add(S, mul(u, 0.59)), u, [0, -Math.sin(th), -Math.cos(th)], [sg * 0.6, 0.2, -1]);
      }
      return P.out();
    },
  },
  'hammer-curl': {
    props: ['dumbbells'], hands: 'fist', start: 0, camera: CAM(0.7, 0.06, [0.55, 0.85]),
    timeline: raiseTimeline(1.1, 0.3, 1.9, 0.35, ['Angkat, genggaman netral', 'Tahan di atas', 'Turunkan perlahan', 'Siap']),
    pose(c) {
      const P = standLegs(new PoseBuilder()), ph = 0.12 + 2.0 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), E = [sg * 0.2, 1.11 + 0.02 * c, -0.03 - 0.02 * c], f = [0, -Math.cos(ph), Math.sin(ph)];
        hold(P, s, add(E, mul(f, 0.33)), f, [-sg, 0, 0], [0, -0.3, -1]);
      }
      return P.out();
    },
  },
  'overhead-triceps-extension': {
    props: ['dumbbell1'], hands: 'open', start: 0, camera: CAM(Math.PI / 2 - 0.35, 0.1, [0.72, 1.18]),
    timeline: raiseTimeline(1.2, 0.3, 1.9, 0.3, ['Luruskan ke atas', 'Lengan lurus', 'Turunkan ke belakang kepala', 'Siku menekuk']),
    pose(c) {
      const P = standLegs(new PoseBuilder()).set('spine2', Rx(-0.04)).set('neck', Rx(0.08));
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
      const ang = 2.35 * (1 - c); // forearm angle back from vertical
      const E = add(S, [0, 0.3, 0.02]); // elbows beside the head
      const G = add(E, [0, 0.29 * Math.cos(ang), -0.29 * Math.sin(ang)]);
      for (const s of ['L', 'R']) {
        const sg = SG(s), fa = norm(sub(G, E));
        const q = handQuat(s, norm(add(mul(fa, 0.2), [-sg * 0.6, 0, -0.5])), norm(add(fa, [0, 0, 0])));
        P.arm(s, wristFor(s, q, add(G, [sg * 0.035, -0.015, 0])), [sg * 0.25, 0.1, 1], null);
        P.orient('hand' + s, q);
      }
      return P.out();
    },
  },
  'bent-over-reverse-fly': {
    props: ['dumbbells'], hands: 'fist', start: 0, camera: CAM(0.45, 0.25, [0.8, 0.75]),
    timeline: raiseTimeline(1.0, 0.35, 1.7, 0.35, ['Buka lengan ke samping', 'Remas belikat', 'Turunkan perlahan', 'Siap']),
    pose(c) {
      const P = hinge(new PoseBuilder(), 1.2, 0.32, 0.09);
      for (const s of ['L', 'R']) abductArm(P, s, 0.08 + 1.3 * c, 0.0, 0.57, [SG(s) * 0.6, 0.6, 0]);
      return P.out();
    },
  },
  'farmer-s-carry': {
    props: ['dumbbells'], hands: 'fist', start: 1, camera: CAM(0.9, 0.06, [0.6, 0.95]),
    timeline: [{ to: 1, dur: 0.6, label: 'Langkah kiri' }, { to: 1, dur: 0.6, label: 'Langkah kanan' }],
    pose(c, t) {
      const P = new PoseBuilder();
      P.root(Ry(0.05 * Math.sin(2 * Math.PI * t)), [0, -0.035 + 0.012 * Math.cos(4 * Math.PI * t), 0]);
      for (const s of ['L', 'R']) {
        const sg = SG(s), ph = (t + (s === 'L' ? 0 : 0.5)) % 1;
        let z, y = J.ankle[1], q = QI;
        if (ph < 0.6) z = 0.19 - 0.38 * (ph / 0.6);
        else { const u = (ph - 0.6) / 0.4; z = -0.19 + 0.38 * ease(0, 1, u); y += 0.07 * Math.sin(Math.PI * u); q = Rx(-0.2 * Math.sin(Math.PI * u)); }
        P.leg(s, [sg * 0.12, y, J.ankle[2] + z], [0, 0, 1]); P.orient('foot' + s, q);
      }
      for (const s of ['L', 'R']) { const S = shoulderW(P, s); hold(P, s, add(S, [SG(s) * 0.07, -0.6, 0.01]), [0, -1, 0], [-SG(s), 0, 0], [SG(s) * 0.3, 0, -1]); }
      return P.out();
    },
  },
  'barbell-curl': {
    props: ['barbell'], hands: 'fist', start: 0, camera: CAM(0.65, 0.06, [0.7, 0.85]),
    timeline: raiseTimeline(1.2, 0.3, 2.0, 0.35, ['Angkat bar', 'Tahan di atas', 'Turunkan perlahan', 'Siap']),
    pose(c) {
      const P = standLegs(new PoseBuilder()), ph = 0.15 + 2.0 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), E = [sg * 0.205, 1.11 + 0.02 * c, -0.02 - 0.02 * c], f = [0, -Math.cos(ph), Math.sin(ph)];
        hold(P, s, [sg * 0.23, E[1] + f[1] * 0.33, E[2] + f[2] * 0.33], f, [0, Math.sin(ph), Math.cos(ph)], [0, -0.3, -1]);
      }
      return P.out();
    },
  },
  'barbell-shrug': {
    props: ['barbell'], hands: 'fist', start: 0, camera: CAM(0.6, 0.08, [0.75, 0.85]),
    timeline: raiseTimeline(0.8, 0.8, 1.3, 0.3, ['Angkat bahu', 'Tahan sebentar', 'Turunkan perlahan', 'Siap']),
    pose(c) {
      const P = standLegs(new PoseBuilder()).set('clavL', Rz(0.2 * c)).set('clavR', Rz(-0.2 * c));
      for (const s of ['L', 'R']) { const S = shoulderW(P, s); hold(P, s, hangAt(S, SG(s) * 0.23, S[2] + 0.11, 0.6), [0, -1, 0], [0, 0, -1], [SG(s) * 0.3, 0, -1]); }
      return P.out();
    },
  },
  'barbell-deadlift': {
    props: ['barbell'], hands: 'fist', start: 0, camera: CAM(Math.PI / 2 - 0.45, 0.08, [0.85, 0.95]),
    timeline: [{ to: 1, dur: 1.6, label: 'Dorong lantai · tarik' }, { to: 1, dur: 0.6, label: 'Kunci pinggul' }, { to: 0, dur: 1.9, label: 'Pinggul ke belakang · turun' }, { to: 0, dur: 0.6, label: 'Bar di lantai' }],
    pose(c) {
      const d = 1 - c, k = ease(0, 1, Math.min(1, d * 1.25)), h = Math.pow(d, 0.85);
      const P = hinge(new PoseBuilder(), 1.0 * h, 0.3 * h, 0.36 * k);
      for (const s of ['L', 'R']) {
        const S = shoulderW(P, s), g = hangAt(S, SG(s) * 0.24, 0.06 + 0.07 * c, 0.6);
        g[1] = Math.max(0.226, g[1]);
        hold(P, s, g, sub(g, S), [0, 0, -1], [SG(s) * 0.2, 0, -1]);
      }
      return P.out();
    },
  },
  'romanian-deadlift': {
    props: ['barbell'], hands: 'fist', start: 1, camera: CAM(Math.PI / 2 - 0.45, 0.08, [0.8, 0.95]),
    timeline: [{ to: 0, dur: 2.2, label: 'Pinggul ke belakang · turun' }, { to: 0, dur: 0.4, label: 'Hamstring meregang' }, { to: 1, dur: 1.4, label: 'Dorong pinggul ke depan' }, { to: 1, dur: 0.5, label: 'Berdiri tegak' }],
    pose(c) {
      const d = 1 - c, P = hinge(new PoseBuilder(), 1.2 * d, 0.34 * d, 0.03 + 0.06 * d);
      for (const s of ['L', 'R']) { const S = shoulderW(P, s), g = hangAt(S, SG(s) * 0.24, S[2] + 0.03 * (1 - d), 0.6); hold(P, s, g, sub(g, S), [0, 0, -1], [SG(s) * 0.2, 0, -1]); }
      return P.out();
    },
  },
  'bent-over-barbell-row': {
    props: ['barbell'], hands: 'fist', start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.1, [0.8, 0.85]),
    timeline: raiseTimeline(1.0, 0.4, 1.6, 0.35, ['Tarik ke perut', 'Remas belikat', 'Turunkan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = hinge(new PoseBuilder(), 0.85, 0.24, 0.1);
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s);
        const hang = hangAt(S, sg * 0.25, S[2], 0.6), pull = add(P.pt('spine1', [0, 1.0, 0.0]), [sg * 0.25, -0.13, 0.17]);
        const g = add(mul(hang, 1 - c), mul(pull, c));
        hold(P, s, g, [0, -1, 0], [0, 0, -1], add(P.dir('chest', [0, 0, -1]), [sg * 0.35, 0, 0]));
      }
      return P.out();
    },
  },
  'dumbbell-bench-press': {
    props: ['bench', 'dumbbells'], hands: 'fist', shadows: 'bench', start: 1,
    camera: { yaw: 0.62, pitch: 0.5, ty: 0.7, tx: 0, tz: -0.25, extent: [1.0, 0.65] },
    timeline: [{ to: 0, dur: 2.0, label: 'Turunkan ke samping dada' }, { to: 0, dur: 0.3, label: 'Siku sedikit di bawah bench' }, { to: 1, dur: 1.2, label: 'Dorong ke atas' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose(c) {
      const P = benchBody();
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s);
        const g = [sg * (0.33 - 0.2 * c), S[1] + 0.12 + 0.46 * c, S[2] + 0.06];
        hold(P, s, g, [0, 1, 0], [0, 0, 1], [sg, -0.6, 0.2]);
      }
      return P.out();
    },
  },
  'dumbbell-fly': {
    props: ['bench', 'dumbbells'], hands: 'fist', shadows: 'bench', start: 1,
    camera: { yaw: 0.35, pitch: 0.55, ty: 0.8, tx: 0, tz: -0.3, extent: [1.1, 0.78] },
    timeline: [{ to: 0, dur: 2.2, label: 'Buka lengan lebar' }, { to: 0, dur: 0.3, label: 'Dada meregang' }, { to: 1, dur: 1.4, label: 'Rapatkan seperti memeluk' }, { to: 1, dur: 0.4, label: 'Di atas dada' }],
    pose(c) {
      const P = benchBody(), b = 1.32 * (1 - c);
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s);
        const u = norm([sg * Math.sin(b) - sg * 0.18 * Math.cos(b), Math.cos(b), 0]);
        hold(P, s, add(S, add(mul(u, 0.55), [0, 0, 0.04])), u, [-sg * Math.cos(b), Math.sin(b), 0], [sg * 0.3, -1, 0.3]);
      }
      return P.out();
    },
  },
});


// ---------------------------------------------------------------- batch 3: bench variations, wrist work, olympic-style
function keyed(keys, t) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[i + 1], u = ease(0, 1, (t - t0) / Math.max(1e-6, t1 - t0)), o = {};
  for (const k in a) o[k] = a[k] + ((b[k] ?? a[k]) - a[k]) * u;
  return o;
}
const wristHold = (P, s, W, d, n, pole) => { d = norm(d); n = norm(sub(n, mul(d, dot(n, d)))); const q = handQuat(s, d, n); P.arm(s, W, pole, n); return P.orient('hand' + s, q); };
const BT = BENCH.top;
// sitting on the bench end (bench along z), facing +z
function seated(P, lean) {
  P.root(Rx(lean), [0, BT + 0.115 - J.pelvis[1], 0.06 - J.pelvis[2]]);
  for (const s of ['L', 'R']) { const sg = SG(s), H = P.pt('thigh' + s, sideV(s, J.hip)); P.leg(s, [sg * 0.17, J.ankle[1], H[2] + 0.46], [sg * 0.2, 1, 0.4]); P.orient('foot' + s, Ry(sg * 0.1)); }
  return P;
}
// front squat / clean catch / thruster: torso fairly upright, knees out
function squatBody(P, depth, lean, back) {
  P.root(Rx(lean), [0, -depth, -back]).set('neck', Rx(-0.5 * lean));
  for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.17, J.ankle[1], J.ankle[2]], [sg * 0.4, 0, 1]); P.orient('foot' + s, Ry(sg * 0.3)); }
  return P;
}
// bar in front rack (rack=1), hanging (rack=0) or overhead (press=1)
function barArms(P, rack, press, hangZ) {
  const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
  const rackBar = P.pt('chest', [0, 1.425, 0.14]);
  const over = add(S, [0, 0.62, -0.03]);
  for (const s of ['L', 'R']) {
    const sg = SG(s), Ss = shoulderW(P, s);
    const hang = hangAt(Ss, sg * 0.25, hangZ == null ? Ss[2] + 0.04 : hangZ, 0.6); hang[1] = Math.max(0.226, hang[1]);
    const xr = sg * (0.24 + 0.04 * press);
    let g = add(mul(hang, 1 - rack), mul([xr, rackBar[1], rackBar[2]], rack));
    g = add(mul(g, 1 - press), mul([xr, over[1], over[2]], press));
    const dHang = norm(sub(hang, Ss)), dRack = norm(add(P.dir('chest', [0, 0.25, -1]), [0, 0.2, 0]));
    let d = norm(add(mul(dHang, (1 - rack) * (1 - press)), add(mul(dRack, rack * (1 - press)), mul([0, 1, 0], press))));
    let n = norm(add(mul([0, 0, -1], (1 - rack) * (1 - press)), add(mul([0, 1, 0.2], rack * (1 - press)), mul([0, 0, 1], press))));
    const pole = norm(add(mul([sg * 0.3, 0, -1], (1 - rack) * (1 - press)), add(mul([sg * 0.2, -0.4, 1], rack * (1 - press)), mul([sg, -0.1, 0], press))));
    hold(P, s, g, d, n, pole);
  }
  return P;
}

Object.assign(EX_MOTIONS, {
  'one-arm-dumbbell-row': {
    props: ['bench', 'dumbbellL'], hands: 'fist', start: 0, camera: CAM(Math.PI / 2 - 0.55, 0.22, [0.85, 0.7]),
    timeline: raiseTimeline(1.0, 0.4, 1.6, 0.35, ['Tarik ke pinggul (kiri)', 'Siku ke belakang', 'Turunkan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = new PoseBuilder();
      P.root(quatMul(Ry(0.06), Rx(1.32)), sub([0.08, 0.93, -0.5], J.pelvis)).set('chest', Ry(0.12 * c));
      const hR = P.pt('thighR', mir(J.hip));
      P.leg('R', [hR[0] + 0.02, BT + 0.05, hR[2] - 0.4], [0, -1, 0.1]); P.orient('footR', Rx(Math.PI * 0.94));
      const hL = P.pt('thighL', J.hip);
      P.leg('L', [hL[0] + 0.2, J.ankle[1], hL[2] + 0.12], [0.3, 0, 1]); P.orient('footL', Ry(0.3));
      const SR = shoulderW(P, 'R'), q = handQuat('R', [0, 0, 1], [0, -1, 0]);
      P.arm('R', wristFor('R', q, [SR[0] + 0.03, BT + 0.004, SR[2] + 0.06]), [-0.3, 0.3, -1], [0, -1, 0]); P.orient('handR', q);
      const SL = shoulderW(P, 'L');
      const hang = add(SL, [0.03, -0.57, 0.02]), pull = [SL[0] + 0.06, hL[1] - 0.04, hL[2] + 0.12];
      hold(P, 'L', add(mul(hang, 1 - c), mul(pull, c)), [0, -1, 0], [-1, 0, 0], [0.15, 1, -0.6]);
      return P.out();
    },
  },
  'bench-dip': {
    props: ['bench'], benchAt: { pos: [0.35, 0, -0.145], yaw: Math.PI / 2 }, start: 1, camera: CAM(Math.PI / 2 - 0.6, 0.12, [0.75, 0.75]),
    timeline: [{ to: 0, dur: 1.7, label: 'Tekuk siku · turun' }, { to: 0, dur: 0.25, label: 'Siku sekitar 90°' }, { to: 1, dur: 1.1, label: 'Dorong ke atas' }, { to: 1, dur: 0.4, label: 'Lengan lurus' }],
    pose(c) {
      const P = new PoseBuilder();
      P.root(Rx(-0.06), [0, 0, 0]);
      P.pin('upperArmL', J.shoulder, [0.18, BT + 0.3 + 0.27 * c, 0.14]);
      const mid = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5); P.shift([-mid[0], 0, 0]);
      for (const s of ['L', 'R']) {
        const sg = SG(s), q = handQuat(s, [0, -0.15, 1], [0, -1, 0]);
        P.arm(s, wristFor(s, q, [sg * 0.19, BT + 0.004, -0.04]), [sg * 0.2, 0, -1], [0, -1, 0]); P.orient('hand' + s, q);
        P.leg(s, [sg * 0.15, J.ankle[1], 0.62], [sg * 0.15, 1, 0.5]); P.orient('foot' + s, Ry(sg * 0.1));
      }
      return P.out();
    },
  },
  'wrist-curl': {
    props: ['bench', 'dumbbells'], hands: 'fist', start: 0, camera: CAM(0.75, 0.22, [0.82, 0.8]),
    timeline: raiseTimeline(0.8, 0.3, 1.3, 0.3, ['Tekuk pergelangan ke atas', 'Tahan', 'Turunkan perlahan', 'Pergelangan menggantung']),
    pose(c) {
      const P = seated(new PoseBuilder(), 0.5), ph = -0.75 + 1.35 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), K = P.pt('shin' + s, sideV(s, J.knee));
        wristHold(P, s, [K[0] - sg * 0.02, K[1] + 0.06, K[2] + 0.03], [0, Math.sin(ph), Math.cos(ph)], [0, Math.cos(ph), -Math.sin(ph)], [sg * 0.4, 0.2, -1]);
      }
      return P.out();
    },
  },
  'reverse-wrist-curl': {
    props: ['bench', 'dumbbells'], hands: 'fist', start: 0, camera: CAM(0.75, 0.22, [0.82, 0.8]),
    timeline: raiseTimeline(0.8, 0.3, 1.3, 0.3, ['Angkat punggung tangan', 'Tahan', 'Turunkan perlahan', 'Pergelangan menggantung']),
    pose(c) {
      const P = seated(new PoseBuilder(), 0.5), ph = -0.6 + 1.05 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), K = P.pt('shin' + s, sideV(s, J.knee));
        wristHold(P, s, [K[0] - sg * 0.02, K[1] + 0.06, K[2] + 0.03], [0, Math.sin(ph), Math.cos(ph)], [0, -Math.cos(ph), Math.sin(ph)], [sg * 0.4, 0.2, -1]);
      }
      return P.out();
    },
  },
  'bulgarian-split-squat': {
    props: ['bench'], start: 1, camera: CAM(Math.PI / 2 - 0.4, 0.1, [0.8, 0.9]),
    timeline: [{ to: 0, dur: 1.7, label: 'Turun (kaki kiri di depan)' }, { to: 0, dur: 0.3, label: 'Paha depan sejajar lantai' }, { to: 1, dur: 1.2, label: 'Dorong dengan kaki depan' }, { to: 1, dur: 0.4, label: 'Berdiri' }],
    pose(c) {
      const d = 1 - c, P = new PoseBuilder();
      P.root(Rx(0.12 + 0.12 * d), sub([0, 0.89 - 0.36 * d, 0.47 - 0.05 * d], J.pelvis));
      P.leg('L', [0.13, J.ankle[1], 0.86], [0.1, 0, 1]); P.orient('footL', QI);
      P.leg('R', [-0.12, BT + 0.06, 0.1], [0, -1, 0.15]); P.orient('footR', Rx(2.5));
      return P.out();
    },
  },
  'sumo-deadlift': {
    props: ['barbell'], hands: 'fist', start: 0, camera: CAM(0.55, 0.1, [0.85, 0.9]),
    timeline: [{ to: 1, dur: 1.6, label: 'Lutut keluar · dorong lantai' }, { to: 1, dur: 0.6, label: 'Kunci pinggul' }, { to: 0, dur: 1.9, label: 'Turun terkontrol' }, { to: 0, dur: 0.6, label: 'Bar di lantai' }],
    pose(c) {
      const d = 1 - c, h = Math.pow(d, 0.85), P = new PoseBuilder();
      P.root(Rx(0.6 * h), [0, -0.4 * ease(0, 1, Math.min(1, d * 1.2)), -0.14 * h]).set('neck', Rx(-0.3 * h));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.34, J.ankle[1], J.ankle[2]], [sg, 0, 0.6]); P.orient('foot' + s, Ry(sg * 0.6)); }
      for (const s of ['L', 'R']) { const sg = SG(s), S = shoulderW(P, s), g = hangAt(S, sg * 0.16, 0.05, 0.6); g[1] = Math.max(0.226, g[1]); hold(P, s, g, sub(g, S), [0, 0, -1], [sg * 0.4, 0, -1]); }
      return P.out();
    },
  },
  'nordic-hamstring-curl': {
    props: ['mat'], start: 1, camera: CAM(Math.PI / 2 - 0.35, 0.15, [0.85, 0.7]),
    timeline: [{ to: 0, dur: 3.0, label: 'Condong ke depan perlahan' }, { to: 0, dur: 0.35, label: 'Tangkap dengan tangan' }, { to: 1, dur: 1.2, label: 'Dorong & tarik kembali' }, { to: 1, dur: 0.5, label: 'Tegak di lutut' }],
    pose(c) {
      const b = 1.3 * (1 - c), P = new PoseBuilder();
      P.root(Rx(b), [0, 0, 0]);
      for (const s of ['L', 'R']) { P.orient('shin' + s, Rx(Math.PI / 2)); P.orient('foot' + s, Rx(Math.PI / 2 + 0.25)); }
      const kn = mul(add(P.pt('shinL', J.knee), P.pt('shinR', mir(J.knee))), 0.5);
      P.shift([0, 0.05 - kn[1], -kn[2]]);
      const reach = Math.pow(1 - c, 2.5);
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s);
        const chestT = P.pt('chest', [sg * 0.09, 1.25, 0.2]), floorT = [S[0] + sg * 0.04, 0.06, S[2] + 0.08];
        P.arm(s, add(mul(chestT, 1 - reach), mul(floorT, reach)), add(mul([sg * 0.5, -1, -0.2], 1 - reach), mul([sg * 0.3, 0.2, -1], reach)), null);
      }
      return P.out();
    },
  },
  'barbell-hip-thrust': {
    props: ['bench', 'barbell'], hands: 'fist', benchAt: { pos: [0.35, 0, -0.145], yaw: Math.PI / 2 }, start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.18, [0.95, 0.65]),
    timeline: [{ to: 1, dur: 1.1, label: 'Dorong pinggul ke atas' }, { to: 1, dur: 0.8, label: 'Remas bokong' }, { to: 0, dur: 1.6, label: 'Turunkan perlahan' }, { to: 0, dur: 0.4, label: 'Siap' }],
    pose: (() => {
      let Zf = null;
      const body = (c) => {
        const g = 0.62 * (1 - c), P = new PoseBuilder();
        P.root(quatMul(Rx(g), SUPINE), [0, 0, 0]).set('neck', Rx(0.25 + 0.3 * c)).set('spine2', Rx(0.05));
        P.pin('chest', [0, 1.34, -0.115], [0, BT + 0.01, -0.03]);
        return P;
      };
      return (c) => {
        if (Zf === null) Zf = body(1).pt('pelvis', J.pelvis)[2] + 0.43;
        const P = body(c);
        for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.16, J.ankle[1], Zf], [sg * 0.2, 1, 0.3]); P.orient('foot' + s, Ry(sg * 0.12)); }
        const bar = P.pt('pelvis', [0, 0.9, 0.17]); bar[1] = Math.max(bar[1], 0.226);
        for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.34, bar[1], bar[2]], [0, -0.5, 1], [0, -1, -0.3], [SG(s), 1, -0.3]);
        return P.out();
      };
    })(),
  },
  'copenhagen-plank': {
    props: ['bench'], start: 1, camera: CAM(-Math.PI / 2 + 0.3, 0.1, [1.0, 0.6]), timeline: HOLD(),
    pose(c) {
      const P = new PoseBuilder();
      const setup = (a) => {
        P.rot = { thighL: Rz(0.42), shinL: Rx(0.2) }; P.W = null;
        P.root(quatFrames([0, 1, 0], [1, 0, 0], [0, Math.sin(a), Math.cos(a)], [0, -Math.cos(a), Math.sin(a)]), [0, 0, 0]);
        const f = P.pt('footR', [-0.085, 0.03, 0.02]); P.shift([-f[0], BT + 0.004 - f[1], -0.55 - f[2]]);
        return P.pt('upperArmL', J.shoulder)[1];
      };
      setup(solve(setup, 0.335 + 0.004 * (c - 0.9) * 10, -0.6, 0.6));
      const sL = shoulderW(P, 'L'), fr0 = P.dir('chest', [0, 0, 1]), fr = norm([fr0[0], 0, fr0[2]]);
      const q = handQuat('L', fr, [0, -1, 0]);
      P.arm('L', wristFor('L', q, add([sL[0], 0.004, sL[2]], mul(fr, 0.27))), [0, -1, 0], [0, -1, 0]); P.orient('handL', q);
      P.arm('R', add(P.pt('pelvis', [-0.15, 0.99, 0.02]), [0, 0.03, 0]), add(P.dir('chest', [0, 0, -1]), [0, 0.6, 0]), null);
      return P.out();
    },
  },
  'dragon-flag': {
    props: ['bench'], hands: 'fist', start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.12, [0.95, 0.85]),
    timeline: [{ to: 1, dur: 1.4, label: 'Angkat badan lurus' }, { to: 1, dur: 0.4, label: 'Hanya bahu di bench' }, { to: 0, dur: 2.6, label: 'Turunkan seperti papan' }, { to: 0, dur: 0.3, label: 'Berhenti sebelum bench' }],
    pose(c) {
      const th = 0.12 + 1.12 * c, P = new PoseBuilder();
      P.root(quatMul(Rx(-th), SUPINE), [0, 0, 0]).set('neck', Rx(0.75 * th)).set('footL', Rx(0.5)).set('footR', Rx(0.5));
      P.pin('chest', [0, 1.37, -0.115], [0, BT + 0.01, -0.62]);
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.15, BT - 0.03, -0.86], [0, -0.6, -0.8], [-SG(s), 0, 0], [SG(s) * 0.7, 1, 0.3]);
      return P.out();
    },
  },
  'power-clean': {
    props: ['barbell'], hands: 'fist', start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.08, [0.85, 1.0]),
    timeline: [{ to: 0.6, dur: 0.9, label: 'Tarik dari lantai' }, { to: 1, dur: 0.35, label: 'Ekstensi eksplosif' }, { to: 0.8, dur: 0.3, label: 'Tangkap di bahu' },
      { to: 0.5, dur: 0.8, label: 'Berdiri tegak' }, { to: 0.3, dur: 0.8, label: 'Turunkan ke paha' }, { to: 0, dur: 0.9, label: 'Kembali ke lantai' }],
    pose: (() => {
      const K0 = { lean: 1.0, back: 0.3, drop: 0.36, rack: 0, rise: 0, shrug: 0 };
      const keys = [[0, K0], [0.222, { lean: 0.7, back: 0.24, drop: 0.12, rack: 0, rise: 0, shrug: 0 }],
        [0.31, { lean: -0.06, back: 0, drop: 0, rack: 0, rise: 0.45, shrug: 0.22 }], [0.383, { lean: 0.18, back: 0.05, drop: 0.24, rack: 1, rise: 0, shrug: 0 }],
        [0.58, { lean: 0, back: 0, drop: 0, rack: 1, rise: 0, shrug: 0 }], [0.66, { lean: 0, back: 0, drop: 0, rack: 1, rise: 0, shrug: 0 }],
        [0.8, { lean: 0.05, back: 0.02, drop: 0.02, rack: 0, rise: 0, shrug: 0 }], [1, K0]];
      return (c, t) => {
        const k = keyed(keys, t), P = new PoseBuilder();
        const lift = k.rise * 0.085;
        P.root(Rx(k.lean), [0, -k.drop + lift, -k.back]).set('neck', Rx(-0.45 * k.lean)).set('clavL', Rz(k.shrug)).set('clavR', Rz(-k.shrug));
        for (const s of ['L', 'R']) {
          const sg = SG(s), qf = Rx(k.rise), B = sideV(s, BALL);
          P.leg(s, add([B[0] + sg * 0.02, 0, B[2]], quatRot(qf, sub(sideV(s, J.ankle), B))), [sg * (0.12 + 0.3 * k.rack), 0, 1]); P.orient('foot' + s, quatMul(qf, Ry(sg * 0.1)));
        }
        return barArms(P, k.rack, 0, 0.06).out();
      };
    })(),
  },
  'thruster': {
    props: ['barbell'], hands: 'fist', start: 0.3, camera: CAM(0.75, 0.08, [0.8, 1.05]),
    timeline: [{ to: 0, dur: 1.3, label: 'Front squat · turun' }, { to: 0.5, dur: 0.7, label: 'Dorong naik eksplosif' }, { to: 1, dur: 0.5, label: 'Dorong bar ke atas kepala' },
      { to: 1, dur: 0.4, label: 'Kunci di atas' }, { to: 0.3, dur: 0.9, label: 'Turunkan ke bahu' }],
    pose: (() => {
      const keys = [[0, { dep: 0, press: 0 }], [0.342, { dep: 1, press: 0 }], [0.526, { dep: 0, press: 0.15 }], [0.658, { dep: 0, press: 1 }], [0.763, { dep: 0, press: 1 }], [1, { dep: 0, press: 0 }]];
      return (c, t) => {
        const k = keyed(keys, t), P = squatBody(new PoseBuilder(), 0.42 * k.dep, 0.28 * k.dep, 0.1 * k.dep);
        return barArms(P, 1, k.press).out();
      };
    })(),
  },
});


// ---------------------------------------------------------------- batch 4: rack, adjustable bench, pull-up bar, EZ bar, kettlebell, box
// lying on the adjustable bench with the back pad raised `a` rad (incline); body rests on the pad
function inclineBody(a) {
  const P = new PoseBuilder();
  P.root(quatMul(Rx(a), SUPINE), [0, 0, 0]).set('neck', Rx(0.1));
  const H = [0, ADJ.top, ADJ.hingeZ], dir = [0, Math.sin(a), -Math.cos(a)];
  P.pin('chest', [0, 1.34, -0.115], add(H, mul(dir, 0.47)));
  for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.2, J.ankle[1], 0.5], [sg * 0.3, 1, 0.4]); P.orient('foot' + s, Ry(sg * 0.15)); }
  return P;
}
// sitting upright against an almost vertical back pad
function uprightSeat(a = 1.4) {
  const P = new PoseBuilder();
  P.root(Rx(-(Math.PI / 2 - a)), [0, 0, 0]);
  const H = [0, ADJ.top, ADJ.hingeZ], dir = [0, Math.sin(a), -Math.cos(a)];
  P.pin('chest', [0, 1.34, -0.115], add(add(H, mul(dir, 0.52)), [0, 0, 0.02]));
  for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.2, J.ankle[1], 0.45], [sg * 0.3, 1, 0.5]); P.orient('foot' + s, Ry(sg * 0.15)); }
  return P;
}
const hangFromBar = (P, barY, x, n, pole, reach = 0.6, lean = 0) => {
  const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
  for (const s of ['L', 'R']) hold(P, s, [SG(s) * x, barY, 0], [0, 1, 0], n, pole(SG(s)));
  return P;
};
// body hanging so the shoulder joints are `drop` below the bar (bar along x at z 0)
function hangBody(P, barY, drop, lean = 0) {
  P.root(Rx(lean), P.rp);
  const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
  return P.shift(sub([0, barY - drop, 0.02], S));
}
const PULLBAR = 2.3;

Object.assign(EX_MOTIONS, {
  // ---------- rack + barbell
  'barbell-back-squat': {
    props: ['rack', 'barbell'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(0.75, 0.1, [0.95, 1.15]),
    timeline: [{ to: 0, dur: 2.0, label: 'Turun · pinggul ke belakang' }, { to: 0, dur: 0.3, label: 'Paha sejajar lantai' }, { to: 1, dur: 1.3, label: 'Dorong naik' }, { to: 1, dur: 0.5, label: 'Berdiri tegak' }],
    pose(c) {
      const d = 1 - c, P = squatBody(new PoseBuilder(), 0.43 * d, 0.62 * d, 0.13 * d);
      const bar = P.pt('chest', [0, 1.475, -0.1]);
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.42, bar[1], bar[2]], [0, 0.6, -0.8], P.dir('chest', [0, 0, 1]), [SG(s) * 0.4, -1, -0.5]);
      return P.out();
    },
  },
  'front-squat': {
    props: ['rack', 'barbell'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(0.75, 0.1, [0.95, 1.15]),
    timeline: [{ to: 0, dur: 2.0, label: 'Turun · siku tetap tinggi' }, { to: 0, dur: 0.3, label: 'Paha sejajar lantai' }, { to: 1, dur: 1.3, label: 'Dorong naik' }, { to: 1, dur: 0.5, label: 'Berdiri tegak' }],
    pose(c) { const d = 1 - c; return barArms(squatBody(new PoseBuilder(), 0.44 * d, 0.3 * d, 0.1 * d), 1, 0).out(); },
  },
  'barbell-overhead-press': {
    props: ['rack', 'barbell'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(0.85, 0.1, [0.95, 1.2]),
    timeline: [{ to: 1, dur: 1.3, label: 'Dorong ke atas kepala' }, { to: 1, dur: 0.4, label: 'Kunci di atas' }, { to: 0, dur: 1.8, label: 'Turunkan ke bahu' }, { to: 0, dur: 0.4, label: 'Bar di depan bahu' }],
    pose(c) {
      const P = standLegs(new PoseBuilder()), head = Math.sin(Math.PI * Math.min(1, c * 1.6));
      P.set('neck', Rx(-0.25 * head)).set('spine2', Rx(-0.05 * c));
      return barArms(P, 1, c).out();
    },
  },
  'close-grip-bench-press': {
    props: ['bench', 'barbell', 'rack'], hands: 'fist', shadows: 'bench', rigAt: { pos: [0, 0, -0.62] }, start: 1,
    camera: { yaw: 0.62, pitch: 0.5, ty: 0.75, tx: 0, tz: -0.35, extent: [1.15, 0.85] },
    timeline: [{ to: 0, dur: 2.0, label: 'Turunkan, siku rapat' }, { to: 0, dur: 0.3, label: 'Sentuh dada bawah' }, { to: 1, dur: 1.2, label: 'Dorong ke atas' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose(c) {
      const P = benchBody();
      for (const s of ['L', 'R']) {
        const sg = SG(s), g = P.pt('chest', [sg * 0.18, 1.25 + 0.09 * c, 0.15 + 0.38 * c]);
        hold(P, s, g, P.dir('chest', [0, 0, 1]), P.dir('chest', [0, -1, 0]), P.dir('chest', [sg * 0.35, -0.3, -1]));
      }
      return P.out();
    },
  },
  'incline-barbell-bench-press': {
    props: ['adjBench', 'barbell', 'rack'], hands: 'fist', benchAngle: 0.6, rigAt: { pos: [0, 0, -0.62] }, start: 1, camera: CAM(0.75, 0.35, [1.1, 0.95]),
    timeline: [{ to: 0, dur: 2.0, label: 'Turunkan ke dada atas' }, { to: 0, dur: 0.3, label: 'Di bawah tulang selangka' }, { to: 1, dur: 1.2, label: 'Dorong ke atas' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose(c) {
      const P = inclineBody(0.6), S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
      const low = P.pt('chest', [0, 1.38, 0.17]), top = add(S, [0, 0.6, 0.02]);
      const b = add(mul(low, 1 - c), mul(top, c));
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.36, b[1], b[2]], [0, 1, 0], P.dir('chest', [0, -1, 0]), [SG(s), -0.6, 0.2]);
      return P.out();
    },
  },
  'decline-bench-press': {
    props: ['decline', 'barbell'], hands: 'fist', start: 1, camera: CAM(0.7, 0.42, [1.1, 0.8]),
    timeline: [{ to: 0, dur: 2.0, label: 'Turunkan ke dada bawah' }, { to: 0, dur: 0.3, label: 'Sentuh dada' }, { to: 1, dur: 1.2, label: 'Dorong ke atas' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose(c) {
      const th = Math.atan2(DECL.y1 - DECL.y0, DECL.z1 - DECL.z0), P = new PoseBuilder();
      P.root(quatMul(Rx(-th), SUPINE), [0, 0, 0]).set('neck', Rx(0.15));
      const zb = -0.6; P.pin('chest', [0, 1.36, -0.115], [0, declY(zb) + 0.005, zb]);
      for (const s of ['L', 'R']) { P.set('thigh' + s, Rx(-0.25)).set('shin' + s, Rx(1.75)).set('foot' + s, Rx(-0.2)); }
      for (const s of ['L', 'R']) {
        const sg = SG(s), g = P.pt('chest', [sg * 0.36, 1.25 + 0.06 * c, 0.15 + 0.42 * c]);
        hold(P, s, g, P.dir('chest', [0, 0, 1]), P.dir('chest', [0, -1, 0]), P.dir('chest', [sg, -0.2, -0.55]));
      }
      return P.out();
    },
  },
  'inverted-row': {
    props: ['rack', 'barbell'], hands: 'fist', rigAt: { pos: [0, 0, -0.45] }, start: 0, camera: CAM(Math.PI / 2 - 0.45, 0.12, [1.0, 0.75]),
    timeline: raiseTimeline(1.0, 0.4, 1.5, 0.35, ['Tarik dada ke bar', 'Remas belikat', 'Turunkan perlahan', 'Lengan lurus']),
    pose(c) {
      const bar = [0, 0.95, 0], P = new PoseBuilder();
      const setup = (a) => {
        P.rot = { footL: Rx(-0.25), footR: Rx(-0.25) }; P.W = null; P.root(quatMul(Rx(a), SUPINE), [0, 0, 0]);
        const h = mul(add(P.pt('footL', HEEL), P.pt('footR', mir(HEEL))), 0.5); P.shift(sub([0, 0.0, 1.05], h));
        const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
        return len(sub(S, bar));
      };
      setup(solve(setup, 0.6 - 0.36 * c, 0.05, 1.2));
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.3, bar[1], bar[2]], [0, 1, 0], [0, 0, 1], [SG(s) * 0.5, -1, 0.5]);
      return P.out();
    },
  },
  // ---------- adjustable bench + dumbbells
  'incline-dumbbell-press': {
    props: ['adjBench', 'dumbbells'], hands: 'fist', benchAngle: 0.6, start: 1, camera: CAM(0.75, 0.35, [1.0, 0.85]),
    timeline: [{ to: 0, dur: 2.0, label: 'Turunkan ke dada atas' }, { to: 0, dur: 0.3, label: 'Sejajar dada atas' }, { to: 1, dur: 1.2, label: 'Dorong ke atas' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose(c) {
      const P = inclineBody(0.6);
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s);
        hold(P, s, [sg * (0.33 - 0.2 * c), S[1] + 0.1 + 0.48 * c, S[2] + 0.06 - 0.02 * c], [0, 1, 0], P.dir('chest', [0, -1, 0]), [sg, -0.6, 0.3]);
      }
      return P.out();
    },
  },
  'seated-dumbbell-shoulder-press': {
    props: ['adjBench', 'dumbbells'], hands: 'fist', benchAngle: 1.4, start: 0, camera: CAM(0.6, 0.12, [0.85, 0.95]),
    timeline: [{ to: 1, dur: 1.3, label: 'Dorong ke atas kepala' }, { to: 1, dur: 0.4, label: 'Lengan lurus' }, { to: 0, dur: 1.8, label: 'Turunkan ke telinga' }, { to: 0, dur: 0.35, label: 'Siku 90°' }],
    pose(c) {
      const P = uprightSeat(1.4);
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s);
        hold(P, s, [sg * (0.33 - 0.19 * c), S[1] + 0.06 + 0.52 * c, S[2] + 0.05], [0, 1, 0], [0, 0, 1], [sg, -0.4, -0.1]);
      }
      return P.out();
    },
  },
  'arnold-press': {
    props: ['adjBench', 'dumbbells'], hands: 'fist', benchAngle: 1.4, start: 0, camera: CAM(0.6, 0.12, [0.85, 0.95]),
    timeline: [{ to: 1, dur: 1.5, label: 'Putar & dorong ke atas' }, { to: 1, dur: 0.4, label: 'Telapak menghadap depan' }, { to: 0, dur: 2.0, label: 'Turun sambil memutar' }, { to: 0, dur: 0.35, label: 'Telapak menghadap badan' }],
    pose(c) {
      const P = uprightSeat(1.4), r = ease(0, 0.75, c);
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s);
        const lo = [sg * 0.13, S[1] + 0.04, S[2] + 0.17], mid = [sg * 0.32, S[1] + 0.12, S[2] + 0.06], hi = [sg * 0.13, S[1] + 0.58, S[2] + 0.04];
        const g = c < 0.45 ? add(mul(lo, 1 - c / 0.45), mul(mid, c / 0.45)) : add(mul(mid, 1 - (c - 0.45) / 0.55), mul(hi, (c - 0.45) / 0.55));
        const n = [-sg * Math.sin(Math.PI * r), 0, -Math.cos(Math.PI * r)];
        const pole = norm(add(mul([0, -1, 1], 1 - r), mul([sg, -0.4, 0], r)));
        hold(P, s, g, [0, 1, 0], n, pole);
      }
      return P.out();
    },
  },
  'incline-dumbbell-curl': {
    props: ['adjBench', 'dumbbells'], hands: 'fist', benchAngle: 0.85, start: 0, camera: CAM(Math.PI / 2 - 0.55, 0.15, [0.85, 0.8]),
    timeline: raiseTimeline(1.2, 0.3, 2.0, 0.35, ['Angkat, siku diam', 'Tahan di atas', 'Turunkan sampai lurus', 'Lengan meregang']),
    pose(c) {
      const P = inclineBody(0.85), ph = 0.15 + 1.95 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s), E = add(S, [sg * 0.03, -0.29, -0.02]), f = [0, -Math.cos(ph), Math.sin(ph)];
        hold(P, s, add(E, mul(f, 0.33)), f, [0, Math.sin(ph), Math.cos(ph)], [0, -0.5, -1]);
      }
      return P.out();
    },
  },
  // ---------- pull-up bar
  'pull-up': {
    props: ['pullup'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI - 0.55, 0.05, [0.85, 1.3]),
    timeline: raiseTimeline(1.1, 0.35, 1.8, 0.4, ['Tarik dagu melewati bar', 'Tahan di atas', 'Turunkan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = hangBody(new PoseBuilder().set('shinL', Rx(0.35)).set('shinR', Rx(0.35)).set('footL', Rx(0.3)).set('footR', Rx(0.3)), PULLBAR, 0.6 - 0.46 * c, -0.08 * c);
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.34, PULLBAR, 0], [0, 1, 0], [0, 0, 1], [SG(s), -1, -0.15]);
      return P.out();
    },
  },
  'chin-up': {
    props: ['pullup'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(0.55, 0.05, [0.85, 1.3]),
    timeline: raiseTimeline(1.1, 0.35, 1.8, 0.4, ['Tarik dagu melewati bar', 'Tahan di atas', 'Turunkan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = hangBody(new PoseBuilder().set('shinL', Rx(0.35)).set('shinR', Rx(0.35)).set('footL', Rx(0.3)).set('footR', Rx(0.3)), PULLBAR, 0.6 - 0.46 * c, -0.05 * c);
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.2, PULLBAR, 0], [0, 1, 0], [0, 0, -1], [SG(s) * 0.3, -1, 0.5]);
      return P.out();
    },
  },
  'hanging-leg-raise': {
    props: ['pullup'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.45, 0.05, [0.85, 1.3]),
    timeline: raiseTimeline(1.2, 0.4, 1.9, 0.4, ['Angkat kaki lurus', 'Tahan sejajar lantai', 'Turunkan perlahan', 'Menggantung diam']),
    pose(c) {
      const f = 1.5 * c, P0 = new PoseBuilder().set('thighL', Rx(-f)).set('thighR', Rx(-f)).set('footL', Rx(0.35)).set('footR', Rx(0.35)).set('spine1', Rx(0.12 * c));
      const P = hangBody(P0, PULLBAR, 0.6, -0.1 * c);
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.32, PULLBAR, 0], [0, 1, 0], [0, 0, 1], [SG(s), -1, -0.1]);
      return P.out();
    },
  },
  'tuck-front-lever': {
    props: ['pullup'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(Math.PI / 2 - 0.35, 0.05, [1.0, 1.15]), timeline: HOLD(),
    pose(c) {
      const P = new PoseBuilder();
      P.root(SUPINE, [0, 0, 0]).set('thighL', Rx(-2.0)).set('thighR', Rx(-2.0)).set('shinL', Rx(2.3)).set('shinR', Rx(2.3)).set('footL', Rx(0.5)).set('footR', Rx(0.5)).set('neck', Rx(0.25));
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
      P.shift(sub([0, PULLBAR - 0.56, 0.14], S));
      P.mul('spine1', Rx(0.02 * (c - 0.9) * 10));
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.3, PULLBAR, 0], [0, 1, 0], [0, 0, 1], [SG(s), -0.2, 1]);
      return P.out();
    },
  },
  // ---------- EZ bar
  'upright-row': {
    props: ['ezbar'], hands: 'fist', start: 0, camera: CAM(0.6, 0.08, [0.6, 0.85]),
    timeline: raiseTimeline(1.0, 0.35, 1.6, 0.35, ['Tarik ke dada, siku tinggi', 'Tahan', 'Turunkan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = standLegs(new PoseBuilder()).set('clavL', Rz(0.08 * c)).set('clavR', Rz(-0.08 * c));
      for (const s of ['L', 'R']) {
        const sg = SG(s), y = 0.79 + 0.55 * ease(0, 1, c);
        hold(P, s, [sg * 0.1, y, 0.11 + 0.03 * Math.sin(Math.PI * c)], [0, -1, 0], [0, 0, -1], [sg, 0.6 * c, -0.3]);
      }
      return P.out();
    },
  },
  'reverse-curl': {
    props: ['ezbar'], hands: 'fist', start: 0, camera: CAM(0.65, 0.06, [0.6, 0.85]),
    timeline: raiseTimeline(1.2, 0.3, 2.0, 0.35, ['Angkat, genggaman overhand', 'Tahan di atas', 'Turunkan perlahan', 'Siap']),
    pose(c) {
      const P = standLegs(new PoseBuilder()), ph = 0.15 + 1.95 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), E = [sg * 0.2, 1.11 + 0.02 * c, -0.02 - 0.02 * c], f = [0, -Math.cos(ph), Math.sin(ph)];
        hold(P, s, [sg * 0.17, E[1] + f[1] * 0.33, E[2] + f[2] * 0.33], f, [0, -Math.sin(ph), -Math.cos(ph)], [0, -0.3, -1]);
      }
      return P.out();
    },
  },
  'skull-crusher': {
    props: ['bench', 'ezbar'], hands: 'fist', shadows: 'bench', start: 1, camera: CAM(0.6, 0.45, [0.95, 0.75]),
    timeline: [{ to: 0, dur: 2.0, label: 'Turunkan ke dahi' }, { to: 0, dur: 0.3, label: 'Siku menekuk' }, { to: 1, dur: 1.2, label: 'Luruskan siku' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose(c) {
      const P = benchBody(), b = 0.22 + 1.95 * (1 - c);
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s), E = add(S, [-sg * 0.04, 0.28, -0.08]), f = [0, Math.cos(b), -Math.sin(b)];
        hold(P, s, [sg * 0.13, E[1] + f[1] * 0.33, E[2] + f[2] * 0.33], f, [0, Math.sin(b), Math.cos(b)], [sg * 0.15, 0.2, 1]);
      }
      return P.out();
    },
  },
  // ---------- kettlebell
  'goblet-squat': {
    props: ['kbGoblet'], hands: 'fist', start: 1, camera: CAM(0.75, 0.1, [0.65, 0.95]),
    timeline: [{ to: 0, dur: 1.9, label: 'Turun, dada tegak' }, { to: 0, dur: 0.35, label: 'Siku di antara lutut' }, { to: 1, dur: 1.2, label: 'Dorong naik' }, { to: 1, dur: 0.5, label: 'Berdiri tegak' }],
    pose(c) {
      const d = 1 - c, P = squatBody(new PoseBuilder(), 0.44 * d, 0.3 * d, 0.1 * d);
      for (const s of ['L', 'R']) hold(P, s, P.pt('chest', [SG(s) * 0.055, 1.24, 0.21]), P.dir('chest', [0, 1, 0.25]), P.dir('chest', [-SG(s), 0, 0]), P.dir('chest', [SG(s) * 0.3, -1, 0.2]));
      return P.out();
    },
  },
  'kettlebell-swing': {
    props: ['kbSwing'], hands: 'fist', start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.08, [0.85, 0.95]),
    timeline: [{ to: 1, dur: 0.55, label: 'Dorong pinggul ke depan' }, { to: 1, dur: 0.2, label: 'Bel setinggi dada' }, { to: 0, dur: 0.6, label: 'Hinge · bel di antara kaki' }],
    pose(c) {
      const h = 1 - c, P = hinge(new PoseBuilder(), 0.95 * h, 0.26 * h, 0.12 * h);
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5), al = -0.55 + 2.0 * c;
      const u = [0, -Math.cos(al), Math.sin(al)], n = [0, -Math.sin(al), -Math.cos(al)];
      for (const s of ['L', 'R']) hold(P, s, add(S, add(mul(u, 0.6), [SG(s) * 0.045, 0, 0])), u, n, [SG(s) * 0.3, 0, -1]);
      return P.out();
    },
  },
  // ---------- plyo box
  'step-up': {
    props: ['box'], rigAt: { pos: [0, 0, 0.47] }, start: 0, camera: CAM(Math.PI / 2 - 0.55, 0.1, [0.85, 1.05]),
    timeline: [{ to: 0.3, dur: 0.8, label: 'Kaki kiri ke atas box' }, { to: 1, dur: 1.28, label: 'Dorong naik' }, { to: 1, dur: 0.52, label: 'Berdiri di atas box' }, { to: 0, dur: 1.4, label: 'Turun satu per satu' }],
    pose: (() => {
      const A = J.ankle[1], T = 0.508 + J.ankle[1], Z = 0.45, F = J.ankle[2];
      const k0 = { py: 0, pz: 0, ly: A, lz: F, ry: A, rz: F };
      const keys = [[0, k0], [0.1, { ...k0, ly: 0.66, lz: 0.2 }], [0.2, { ...k0, ly: T, lz: Z }],
        [0.42, { py: 0.46, pz: 0.42, ly: T, lz: Z, ry: 0.42, rz: 0.25 }], [0.52, { py: 0.5, pz: 0.45, ly: T, lz: Z, ry: T, rz: Z }],
        [0.65, { py: 0.5, pz: 0.45, ly: T, lz: Z, ry: T, rz: Z }], [0.73, { py: 0.4, pz: 0.36, ly: T, lz: Z, ry: 0.42, rz: 0.2 }],
        [0.85, { py: 0, pz: 0.04, ly: T, lz: Z, ry: A, rz: F }], [0.92, { py: 0, pz: 0.02, ly: 0.64, lz: 0.2, ry: A, rz: F }], [1, k0]];
      return (c, t) => {
        const k = keyed(keys, t), P = new PoseBuilder();
        P.root(Rx(0.12 * Math.sin(Math.PI * Math.min(1, t / 0.52))), [0, k.py - 0.02, k.pz]);
        P.leg('L', [0.12, k.ly, k.lz], [0.1, 0, 1]); P.orient('footL', QI);
        P.leg('R', [-0.12, k.ry, k.rz], [-0.1, 0, 1]); P.orient('footR', QI);
        return P.out();
      };
    })(),
  },
  'box-jump': {
    props: ['box'], rigAt: { pos: [0, 0, 0.62] }, start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.1, [0.95, 1.1]),
    timeline: [{ to: 0.4, dur: 0.6, label: 'Ayun lengan · jongkok' }, { to: 1, dur: 0.45, label: 'Lompat eksplosif' }, { to: 0.6, dur: 0.4, label: 'Mendarat lembut' },
      { to: 0.2, dur: 0.6, label: 'Berdiri di atas box' }, { to: 0, dur: 0.95, label: 'Turun dari box' }],
    pose: (() => {
      const A = J.ankle[1], T = 0.508 + A, Z = 0.6;
      const k0 = { py: 0, pz: 0, lean: 0, fy: A, fz: 0, rise: 0, arm: 0.05 };
      const keys = [[0, k0], [0.2, { py: -0.26, pz: -0.05, lean: 0.55, fy: A, fz: 0, rise: 0, arm: -0.7 }],
        [0.3, { py: 0.04, pz: 0.08, lean: 0.05, fy: A + 0.02, fz: 0.02, rise: 0.6, arm: 2.4 }], [0.4, { py: 0.42, pz: 0.36, lean: 0.25, fy: 0.5, fz: 0.36, rise: 0.2, arm: 1.6 }],
        [0.47, { py: 0.508 - 0.3, pz: Z - 0.05, lean: 0.5, fy: T, fz: Z, rise: 0, arm: 0.9 }], [0.62, { py: 0.508, pz: Z, lean: 0, fy: T, fz: Z, rise: 0, arm: 0.05 }],
        [0.72, { py: 0.508, pz: Z, lean: 0, fy: T, fz: Z, rise: 0, arm: 0.05 }], [0.84, { py: 0.3, pz: 0.3, lean: 0.1, fy: 0.42, fz: 0.25, rise: 0.2, arm: 0.3 }],
        [0.92, { py: -0.08, pz: 0.02, lean: 0.15, fy: A, fz: 0, rise: 0, arm: 0.2 }], [1, k0]];
      return (c, t) => {
        const k = keyed(keys, t), P = new PoseBuilder();
        P.root(Rx(k.lean), [0, k.py, k.pz - 0.1 * k.lean]).set('neck', Rx(-0.4 * k.lean));
        for (const s of ['L', 'R']) {
          const sg = SG(s), qf = Rx(k.rise), B = sideV(s, BALL), base = [B[0], k.fy - A, k.fz + B[2]];
          P.leg(s, add(base, quatRot(qf, sub(sideV(s, J.ankle), B))), [sg * 0.15, 0, 1]); P.orient('foot' + s, qf);
          P.set('upperArm' + s, quatMul(Rx(-k.arm), Rz(-sg * 0.08))).set('foreArm' + s, quatAxis(ARM[s].hinge, -0.3));
        }
        return P.out();
      };
    })(),
  },
});


// ---------------------------------------------------------------- batch 5: dip bars, rings, trap bar, back extension, landmine, preacher, ab wheel, parallettes, muscle-up, get-up
const nlerpQ = (a, b, t) => { const s = dot4(a, b) < 0 ? -1 : 1; const q = [0, 1, 2, 3].map((i) => a[i] * (1 - t) + b[i] * s * t); const l = Math.hypot(...q); return q.map((v) => v / l); };
const dot4 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
// support on two handles along z at x ±hx, height hy: shoulders `rise` above the handles
function support(P, hx, hy, rise, lean, dz = 0, pole) {
  P.root(Rx(lean), P.rp);
  const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
  P.shift(sub([0, hy + rise, dz], S));
  for (const s of ['L', 'R']) hold(P, s, [SG(s) * hx, hy, 0], [0, -1, 0], [-SG(s), 0, 0], pole ? pole(SG(s)) : [SG(s) * 0.25, 0.2, -1]);
  return P;
}
const crossArms = (P) => {
  for (const s of ['L', 'R']) { const sg = SG(s); P.arm(s, P.pt('chest', [-sg * 0.075, 1.335 - (s === 'R' ? 0.035 : 0), 0.15 + (s === 'R' ? 0.012 : 0)]), P.dir('chest', [sg, -0.3, 0.2]), null); }
  return P;
};

Object.assign(EX_MOTIONS, {
  'chest-dip': {
    props: ['dip'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(0.8, 0.08, [0.85, 1.3]),
    timeline: [{ to: 0, dur: 1.8, label: 'Condong ke depan · turun' }, { to: 0, dur: 0.3, label: 'Bahu sedikit di bawah siku' }, { to: 1, dur: 1.2, label: 'Dorong ke atas' }, { to: 1, dur: 0.5, label: 'Lengan lurus' }],
    pose(c) {
      const P0 = new PoseBuilder().set('shinL', Rx(1.45)).set('shinR', Rx(1.45)).set('thighL', Rx(0.15)).set('thighR', Rx(0.15)).set('footL', Rx(0.4)).set('footR', Rx(0.4));
      return support(P0, 0.27, 1.3, 0.13 + 0.43 * c, 0.5 - 0.15 * c, -0.03).out();
    },
  },
  'ring-dip': {
    props: ['rings'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(0.8, 0.08, [0.8, 1.2]),
    timeline: [{ to: 0, dur: 2.0, label: 'Turun perlahan, ring rapat' }, { to: 0, dur: 0.3, label: 'Bahu sejajar siku' }, { to: 1, dur: 1.3, label: 'Dorong ke support' }, { to: 1, dur: 0.5, label: 'Ring diputar keluar' }],
    pose(c) {
      const P0 = new PoseBuilder().set('shinL', Rx(0.5)).set('shinR', Rx(0.5)).set('footL', Rx(0.4)).set('footR', Rx(0.4));
      const P = support(P0, 0.22, 1.3, 0.16 + 0.42 * c, 0.25 - 0.15 * c, -0.02, (sg) => [sg * 0.1, 0.2, -1]);
      return P.out();
    },
  },
  'trap-bar-deadlift': {
    props: ['trapbar'], hands: 'fist', start: 0, camera: CAM(0.65, 0.12, [0.85, 0.95]),
    timeline: [{ to: 1, dur: 1.5, label: 'Dorong lantai · berdiri' }, { to: 1, dur: 0.6, label: 'Kunci pinggul' }, { to: 0, dur: 1.8, label: 'Turun terkontrol' }, { to: 0, dur: 0.6, label: 'Plate di lantai' }],
    pose(c) {
      const d = 1 - c, P = squatBody(new PoseBuilder(), 0.4 * d, 0.55 * d, 0.1 * d);
      for (const s of ['L', 'R']) { const sg = SG(s), S = shoulderW(P, s), g = hangAt(S, sg * 0.28, 0.0, 0.6); g[1] = Math.max(0.226, g[1]); hold(P, s, g, [0, -1, 0], [-sg, 0, 0], [sg, 0, -0.4]); }
      return P.out();
    },
  },
  'back-extension': {
    props: ['backext'], rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(Math.PI / 2 - 0.4, 0.12, [0.95, 0.85]),
    timeline: [{ to: 0, dur: 1.8, label: 'Bungkuk dari pinggul' }, { to: 0, dur: 0.3, label: 'Hampir 90°' }, { to: 1, dur: 1.3, label: 'Angkat sampai segaris' }, { to: 1, dur: 0.5, label: 'Tahan' }],
    pose(c) {
      const P = new PoseBuilder(), lean = Math.PI / 4 + 1.3 * (1 - c), u = norm([0, -1, -1]);
      P.root(Rx(lean), [0, 0, 0]).set('neck', Rx(-0.3 * (1 - c)));
      const hm = mul(add(P.pt('thighL', J.hip), P.pt('thighR', mir(J.hip))), 0.5); P.shift(sub(BX.H, hm));
      for (const s of ['L', 'R']) {
        const sg = SG(s), hp = P.pt('thigh' + s, sideV(s, J.hip));
        P.leg(s, add(add(hp, mul(u, 0.835)), [sg * 0.02, 0, 0]), [0, -1, 1]); P.orient('foot' + s, Rx(Math.PI / 4));
      }
      return crossArms(P).out();
    },
  },
  'landmine-press': {
    props: ['landmine'], hands: 'fist', rigAt: { pos: [0, 0, 1.55] }, start: 0, camera: CAM(Math.PI / 2 - 0.25, 0.12, [1.1, 0.95]),
    timeline: raiseTimeline(1.1, 0.35, 1.7, 0.35, ['Dorong ke atas & depan (kiri)', 'Lengan lurus', 'Turunkan ke bahu', 'Bar di depan bahu']),
    pose(c) {
      const P = new PoseBuilder(), pivot = [0, 0.08, 1.55], L = 1.82;
      P.root(Rx(0.14), [0, -0.03, 0]);
      P.leg('L', [0.13, J.ankle[1], -0.22], [0.1, 0, 1]); P.orient('footL', Rx(0.15)); P.leg('R', [-0.13, J.ankle[1], 0.3], [-0.1, 0, 1]); P.orient('footR', QI);
      const th = 0.79 + 0.27 * c, x = 0.14 - 0.08 * c;
      const E = add(pivot, [x, L * Math.sin(th), -L * Math.cos(th)]), dir = norm(sub(E, pivot));
      const n = [-1, 0, 0], d = norm(cross(mul(dir, -1), n));
      hold(P, 'L', E, d, n, [0.6, -1, 0.2]);
      P.arm('R', P.pt('pelvis', [-0.17, 0.97, 0.03]), [-1, 0.2, -0.3], null);
      const o = P.out();
      o.xf = { [SLOT.landmine]: { pos: pivot, rot: quatFrames([0, 0, 1], [1, 0, 0], mul(dir, -1).map((v) => -v), [1, 0, 0]) } };
      return o;
    },
  },
  'preacher-curl': {
    props: ['preacher', 'ezbar'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.15, [0.8, 0.75]),
    timeline: raiseTimeline(1.1, 0.3, 2.0, 0.35, ['Angkat bar', 'Lengan bawah hampir tegak', 'Turunkan perlahan', 'Lengan hampir lurus']),
    pose(c) {
      const P = new PoseBuilder(), { padTop, padBot } = PREACH, dir = norm(sub(padBot, padTop)), nrm = norm(cross([1, 0, 0], dir));
      P.root(Rx(0.32), [0, 0, 0]).set('neck', Rx(-0.15));
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
      P.shift(sub(add(add(padTop, mul(nrm, 0.07)), [0, 0.05, -0.04]), S));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.2, J.ankle[1], 0.25], [sg * 0.2, 1, 0.5]); P.orient('foot' + s, Ry(sg * 0.12)); }
      const ph = 0.95 + 1.85 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), Ss = shoulderW(P, s);
        const E = add(add(Ss, mul(dir, 0.29)), [-sg * 0.03, 0, 0]), f = [0, -Math.cos(ph), Math.sin(ph)];
        hold(P, s, [sg * 0.15, E[1] + f[1] * 0.33, E[2] + f[2] * 0.33], f, [0, Math.sin(ph), Math.cos(ph)], add(mul(nrm, -1), [0, 0, 0.2]));
      }
      return P.out();
    },
  },
  'ab-wheel-rollout': {
    props: ['abwheel', 'mat'], hands: 'fist', start: 1, camera: CAM(Math.PI / 2 - 0.45, 0.15, [1.0, 0.6]),
    timeline: [{ to: 0, dur: 2.2, label: 'Gulirkan ke depan perlahan' }, { to: 0, dur: 0.3, label: 'Hampir sejajar lantai' }, { to: 1, dur: 1.5, label: 'Tarik kembali dengan perut' }, { to: 1, dur: 0.4, label: 'Berlutut' }],
    pose(c) {
      const a = 1.15 - 1.05 * c, b = 1.43 - 0.45 * c, P = new PoseBuilder();
      P.root(Rx(b), [0, 0, 0]);
      for (const s of ['L', 'R']) { P.orient('thigh' + s, Rx(a)); P.orient('shin' + s, Rx(Math.PI / 2)); P.orient('foot' + s, Rx(Math.PI / 2 + 1.2)); }
      const kn = mul(add(P.pt('shinL', J.knee), P.pt('shinR', mir(J.knee))), 0.5); P.shift([0, 0.05 - kn[1], -kn[2]]);
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5), dy = S[1] - 0.09;
      const W = [0, 0.09, S[2] + Math.sqrt(Math.max(0.0004, 0.6 * 0.6 - dy * dy))];
      for (const s of ['L', 'R']) { const sg = SG(s), Ss = shoulderW(P, s), g = [sg * 0.12, W[1], W[2]], dd = norm(sub(g, Ss)); hold(P, s, g, dd, norm(cross([1, 0, 0], dd)), [sg * 0.4, 0.3, -1]); }
      return P.out();
    },
  },
  'l-sit': {
    props: ['parallettes'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(0.95, 0.14, [0.95, 0.78]), timeline: HOLD('Tahan · kaki lurus', 'Tahan · bahu turun'),
    pose(c) {
      const P0 = new PoseBuilder().set('thighL', Rx(-1.52 - 0.03 * (c - 0.9) * 10)).set('thighR', Rx(-1.52 - 0.03 * (c - 0.9) * 10)).set('footL', Rx(0.6)).set('footR', Rx(0.6)).set('neck', Rx(0.05));
      return support(P0, 0.25, 0.3, 0.55, -0.06, -0.02, (sg) => [sg * 0.2, 0.2, -1]).out();
    },
  },
  'muscle-up': {
    props: ['pullup'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.45, 0.06, [0.95, 1.4]),
    timeline: [{ to: 0.6, dur: 0.6, label: 'Tarik eksplosif ke pinggul' }, { to: 0.8, dur: 0.35, label: 'Transisi · siku ke atas bar' }, { to: 1, dur: 0.6, label: 'Dorong seperti dip' },
      { to: 1, dur: 0.4, label: 'Lengan lurus di atas bar' }, { to: 0.3, dur: 0.9, label: 'Turun ke posisi gantung' }, { to: 0, dur: 0.45, label: 'Menggantung' }],
    pose: (() => {
      const k0 = { dy: -0.6, dz: 0.03, lean: 0, m: 0 };
      const keys = [[0, k0], [0.18, { dy: -0.12, dz: 0.06, lean: -0.25, m: 0 }], [0.29, { dy: 0.08, dz: -0.08, lean: 0.55, m: 0.85 }],
        [0.38, { dy: 0.18, dz: -0.06, lean: 0.4, m: 1 }], [0.5, { dy: 0.55, dz: -0.04, lean: 0.12, m: 1 }], [0.6, { dy: 0.55, dz: -0.04, lean: 0.12, m: 1 }],
        [0.74, { dy: 0.15, dz: -0.07, lean: 0.45, m: 1 }], [0.86, { dy: -0.2, dz: 0.05, lean: -0.1, m: 0.2 }], [1, k0]];
      return (c, t) => {
        const k = keyed(keys, t), P = new PoseBuilder().set('shinL', Rx(0.3)).set('shinR', Rx(0.3)).set('thighL', Rx(-0.25 * k.m)).set('thighR', Rx(-0.25 * k.m)).set('footL', Rx(0.4)).set('footR', Rx(0.4));
        P.root(Rx(k.lean), [0, 0, 0]);
        const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5); P.shift(sub([0, PULLBAR + k.dy, k.dz], S));
        for (const s of ['L', 'R']) {
          const sg = SG(s), m = k.m;
          const d = norm(add(mul([0, 1, 0], 1 - m), mul([0, -0.35, 1], m))), n = norm(add(mul([0, 0, 1], 1 - m), mul([0, -1, -0.3], m)));
          hold(P, s, [sg * 0.3, PULLBAR, 0], d, n, norm(add(mul([sg, -1, -0.1], 1 - m), mul([sg * 0.3, 0.1, -1], m))));
        }
        return P.out();
      };
    })(),
  },
  'turkish-get-up': {
    props: ['kbRack', 'mat'], hands: 'fist', start: 0, camera: CAM(-0.9, 0.18, [1.0, 1.0]),
    timeline: [{ to: 0.3, dur: 1.0, label: 'Bangun ke siku' }, { to: 0.5, dur: 0.9, label: 'Ke tangan' }, { to: 0.7, dur: 0.9, label: 'Angkat pinggul' }, { to: 0.8, dur: 1.0, label: 'Sapu kaki · berlutut' },
      { to: 1, dur: 1.1, label: 'Berdiri penuh' }, { to: 1, dur: 0.6, label: 'Mata ke kettlebell' }, { to: 0, dur: 3.0, label: 'Balik urutan · berbaring' }],
    pose: (() => {
      const keys = [
        [0.0, { pitch: -1.57, roll: 0, yaw: 0, flex: 0, lhf: 0.95, lks: 1.7, rhf: 0.0, rab: 0.3, rks: 0, sup: 1, seat: 1, px: 0, pz: 0 }],
        [0.12, { pitch: -1.05, roll: -0.35, yaw: 0, flex: 0.25, lhf: 0.95, lks: 1.7, rhf: 0.0, rab: 0.3, rks: 0, sup: 1, seat: 1, px: 0, pz: 0 }],
        [0.23, { pitch: -0.6, roll: -0.45, yaw: 0, flex: 0.25, lhf: 1.0, lks: 1.8, rhf: 0.0, rab: 0.3, rks: 0, sup: 1, seat: 1, px: 0, pz: 0 }],
        [0.34, { pitch: -0.95, roll: -0.75, yaw: 0, flex: 0.05, lhf: 0.55, lks: 1.6, rhf: -0.35, rab: 0.15, rks: 0, sup: 1, seat: 1, px: -0.05, pz: 0.02 }],
        [0.46, { pitch: 0.05, roll: -0.2, yaw: -0.6, flex: 0, lhf: 1.5, lks: 1.6, rhf: 0.15, rab: 0, rks: 1.6, sup: 0.2, seat: 0, px: -0.05, pz: 0.05 }],
        [0.6, { pitch: 0, roll: 0, yaw: -0.6, flex: 0, lhf: 0, lks: 0, rhf: 0, rab: 0, rks: 0, sup: 0, seat: 0, px: -0.05, pz: 0.2 }],
        [0.68, { pitch: 0, roll: 0, yaw: -0.6, flex: 0, lhf: 0, lks: 0, rhf: 0, rab: 0, rks: 0, sup: 0, seat: 0, px: -0.05, pz: 0.2 }]];
      const Hf = [-0.62, 0.03, 0.15];
      return (c, t) => {
        const tt = t <= 0.68 ? t : 0.68 * (1 - (t - 0.68) / 0.32);
        const k = keyed(keys, tt), P = new PoseBuilder();
        P.root(quatMul(Ry(k.yaw), quatMul(Rx(k.pitch), Ry(k.roll))), [k.px, 0, k.pz]).set('spine2', Rx(k.flex)).set('chest', Rx(k.flex * 0.6)).set('neck', Rx(-0.3 * Math.min(1, -k.pitch)));
        const comp = k.seat * (Math.PI / 2 + k.pitch);
        P.set('thighL', Rx(-(k.lhf + comp))).set('shinL', Rx(k.lks)).set('thighR', quatMul(Rx(-(k.rhf + comp)), Rz(-k.rab))).set('shinR', Rx(k.rks));
        const qArmFree = { upperArmR: Rz(0.1), foreArmR: QI, handR: QI };
        P.arm('R', Hf, [-0.6, 0.8, 0.2], [0, -1, 0]);
        if (k.sup < 1) for (const [b, q] of Object.entries(qArmFree)) P.set(b, nlerpQ(q, P.rot[b] || QI, k.sup));
        P.ground();
        const SL = shoulderW(P, 'L');
        hold(P, 'L', add(SL, [0.02, 0.6, 0]), [0, 1, 0], [-1, 0, 0], [1, 0, 0]);
        return P.out();
      };
    })(),
  },
});


// ---------------------------------------------------------------- batch 6: cable system
function cableXf(a, b) {
  const v = sub(b, a), L = Math.max(1e-4, len(v)), d = mul(v, 1 / L);
  return { pos: a, rot: quatFrames([0, 0, 1], [1, 0, 0], d, Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]), scale: [1, 1, L] };
}
const gripW = (P, s) => P.pt('hand' + s, sideV(s, GRIP_L));
const apexW = (P, s) => P.pt('hand' + s, sideV(s, DH.apex));
const midGrip = (P) => mul(add(gripW(P, 'L'), gripW(P, 'R')), 0.5);
// attach output: cables from pulleys to ends, optional rope halves from a knot to both hands
function withCables(P, list, rope) {
  const o = P.out(); o.xf = {};
  const cs = [SLOT.cableA, SLOT.cableB], ps = [SLOT.pulleyA, SLOT.pulleyB];
  list.forEach(([pul, end], i) => { o.xf[cs[i]] = cableXf(pul, end); o.xf[ps[i]] = { pos: pul, rot: QI }; });
  for (let i = list.length; i < 2; i++) { o.xf[cs[i]] = { pos: [0, -5, 0], rot: QI, scale: [1, 1, 0.001] }; o.xf[ps[i]] = { pos: [0, -5, 0], rot: QI }; }
  if (rope) { o.xf[SLOT.ropeA] = cableXf(rope, gripW(P, 'L')); o.xf[SLOT.ropeB] = cableXf(rope, gripW(P, 'R')); }
  return o;
}
const TOWER_FRONT = { pos: [0, 0, 0.95], yaw: 0 };
const towerPulley = (y) => [0, y, 0.95 - 0.13];

Object.assign(EX_MOTIONS, {
  'cable-crossover': {
    props: ['crossover', 'cables', 'dhandles'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(0.45, 0.12, [1.35, 1.2]),
    timeline: raiseTimeline(1.2, 0.5, 1.8, 0.35, ['Tarik ke bawah & ke tengah', 'Remas dada', 'Kembali perlahan', 'Lengan terbuka']),
    pose(c) {
      const P = new PoseBuilder();
      P.root(Rx(0.25), [0, -0.02, 0.32]).set('neck', Rx(-0.15));
      P.leg('L', [0.13, J.ankle[1], 0.62], [0.1, 0, 1]); P.orient('footL', QI); P.leg('R', [-0.13, J.ankle[1], 0.12], [-0.1, 0, 1]); P.orient('footR', Rx(0.25));
      const ends = [];
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s), pul = [sg * (CROSS.X - 0.12), 2.05, -0.05];
        const out = norm(sub(pul, S)), inn = norm(sub([sg * 0.05, 0.98, S[2] + 0.42], S));
        const u = norm(add(mul(out, 1 - c), mul(inn, c)));
        hold(P, s, add(S, mul(u, 0.56)), u, [-sg, 0, 0.35], [sg, 0.35, -0.6]);
        ends.push([pul, apexW(P, s)]);
      }
      return withCables(P, ends);
    },
  },
  'lat-pulldown': {
    props: ['latMachine', 'cables', 'latBar'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI - 0.6, 0.15, [0.95, 1.25]),
    timeline: raiseTimeline(1.1, 0.4, 1.8, 0.35, ['Tarik bar ke dada atas', 'Siku ke bawah & belakang', 'Kembalikan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = new PoseBuilder();
      P.root(Rx(-0.12 - 0.12 * c), sub([0, LAT.seatY + 0.11, -0.03], J.pelvis));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.16, J.ankle[1], 0.42], [sg * 0.2, 1, 0.5]); P.orient('foot' + s, QI); }
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
      const top = [0, S[1] + 0.6, S[2] + 0.12], low = add(P.pt('chest', [0, 1.38, 0.17]), [0, 0.06, 0.04]);
      const b = add(mul(top, 1 - c), mul(low, c));
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.4, b[1], b[2]], [0, 1, 0], [0, 0, 1], [SG(s), -1, -0.1 - 0.3 * c]);
      return withCables(P, [[LAT.pulley, add(midGrip(P), [0, 0.01, 0])]]);
    },
  },
  'straight-arm-pulldown': {
    props: ['tower', 'cables', 'straightBar'], hands: 'fist', rigAt: TOWER_FRONT, start: 0, camera: CAM(Math.PI / 2 - 0.55, 0.1, [1.0, 1.15]),
    timeline: raiseTimeline(1.1, 0.35, 1.7, 0.35, ['Tarik bar ke paha', 'Lengan lurus', 'Kembali ke atas', 'Setinggi kepala']),
    pose(c) {
      const P = new PoseBuilder();
      P.root(Rx(0.3), [0, -0.04, -0.05]).set('neck', Rx(-0.2));
      standLegs(P, 0.14, 0.15);
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5), a = 1.85 - 1.62 * c;
      const u = [0, -Math.cos(a), Math.sin(a)];
      for (const s of ['L', 'R']) { const sg = SG(s); hold(P, s, add(S, add(mul(u, 0.58), [sg * 0.19 - (S[0]), 0, 0])), u, [0, -Math.sin(a), -Math.cos(a)], [sg * 0.3, 0.3, -1]); }
      return withCables(P, [[towerPulley(2.05), midGrip(P)]]);
    },
  },
  'seated-cable-row': {
    props: ['rowMachine', 'cables', 'vBar'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.45, 0.15, [1.05, 0.75]),
    timeline: raiseTimeline(1.0, 0.45, 1.6, 0.35, ['Tarik ke perut', 'Rapatkan belikat', 'Kembalikan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = new PoseBuilder();
      P.root(Rx(0.28 * (1 - c) - 0.06 * c), sub([0, ROW.seatY + 0.11, -0.15], J.pelvis));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.13, 0.31, 0.72], [sg * 0.2, 1, 0.3]); P.orient('foot' + s, Rx(-0.45)); }
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
      const ext = [0, S[1] - 0.18, S[2] + 0.57], pull = P.pt('spine1', [0, 1.06, 0.22]);
      const g = add(mul(ext, 1 - c), mul(pull, c));
      for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.05, g[1], g[2]], [0, 0, 1], [-SG(s), 0, 0], [SG(s) * 0.25, -0.2, -1]);
      return withCables(P, [[ROW.pulley, add(midGrip(P), [0, 0, 0.16])]]);
    },
  },
  'face-pull': {
    props: ['tower', 'cables', 'ropes'], hands: 'fist', rigAt: TOWER_FRONT, start: 0, camera: CAM(0.6, 0.12, [1.0, 1.15]),
    timeline: raiseTimeline(1.0, 0.5, 1.5, 0.35, ['Tarik ke wajah, siku tinggi', 'Tangan di samping telinga', 'Kembalikan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = standLegs(new PoseBuilder(), 0.15, 0.12).set('spine2', Rx(-0.04 * c));
      const pul = towerPulley(1.62);
      for (const s of ['L', 'R']) {
        const sg = SG(s), S = shoulderW(P, s);
        const ext = [sg * 0.06, 1.58, S[2] + 0.56], end = [sg * 0.24, 1.62, S[2] + 0.04];
        hold(P, s, add(mul(ext, 1 - c), mul(end, c)), norm([sg * 0.25 * c, 0.15 + 0.4 * c, 1]), [-sg, 0, -0.2 * c], [sg, 0.5 + 0.4 * c, -0.4]);
      }
      const knot = add(midGrip(P), [0, 0.02, 0.1]);
      return withCables(P, [[pul, knot]], knot);
    },
  },
  'triceps-pushdown': {
    props: ['tower', 'cables', 'straightBar'], hands: 'fist', rigAt: TOWER_FRONT, start: 0, camera: CAM(Math.PI / 2 - 0.6, 0.1, [0.9, 1.15]),
    timeline: raiseTimeline(1.0, 0.35, 1.6, 0.35, ['Dorong ke bawah', 'Lengan lurus', 'Kembali perlahan', 'Lengan bawah sejajar lantai']),
    pose(c) {
      const P = standLegs(new PoseBuilder()).root(Rx(0.08)).set('neck', Rx(-0.08)), ph = 1.55 - 1.45 * c;
      for (const s of ['L', 'R']) {
        const sg = SG(s), E = add(shoulderW(P, s), [-sg * 0.01, -0.29, 0.03]), f = [0, -Math.cos(ph), Math.sin(ph)];
        hold(P, s, [sg * 0.1, E[1] + f[1] * 0.33, E[2] + f[2] * 0.33], f, [0, -Math.sin(ph), -Math.cos(ph)], [0, -0.3, -1]);
      }
      return withCables(P, [[towerPulley(2.05), midGrip(P)]]);
    },
  },
  'cable-crunch': {
    props: ['tower', 'cables', 'ropes', 'mat'], hands: 'fist', rigAt: TOWER_FRONT, start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.12, [1.12, 1.1]),
    timeline: raiseTimeline(1.0, 0.45, 1.5, 0.35, ['Gulung badan ke bawah', 'Remas perut', 'Kembali perlahan', 'Tegak berlutut']),
    pose(c) {
      const P = new PoseBuilder();
      P.root(Rx(0.32 + 0.3 * c), [0, 0, 0]).set('spine1', Rx(0.25 * c)).set('spine2', Rx(0.3 * c)).set('chest', Rx(0.2 * c)).set('neck', Rx(0.15 * c));
      for (const s of ['L', 'R']) { P.orient('shin' + s, Rx(Math.PI / 2)); P.orient('foot' + s, Rx(Math.PI / 2 + 0.25)); }
      const kn = mul(add(P.pt('shinL', J.knee), P.pt('shinR', mir(J.knee))), 0.5); P.shift([0, 0.05 - kn[1], -0.3 - kn[2]]);
      for (const s of ['L', 'R']) { const sg = SG(s); hold(P, s, P.pt('head', [sg * 0.1, 1.6, 0.06]), P.dir('head', [0, 1, 0.3]), P.dir('head', [-sg, 0, 0]), P.dir('chest', [sg * 0.3, -1, 0.4])); }
      const knot = add(P.pt('head', [0, 1.74, 0.1]), [0, 0, 0]);
      return withCables(P, [[towerPulley(2.05), knot]], knot);
    },
  },
  'cable-woodchopper': {
    props: ['tower', 'cables', 'dhandles'], hands: 'fist', rigAt: { pos: [-1.05, 0, 0], yaw: -Math.PI / 2 }, start: 0, camera: CAM(0.25, 0.1, [1.25, 1.15]),
    timeline: raiseTimeline(1.0, 0.3, 1.6, 0.35, ['Tarik diagonal ke bawah', 'Torso berputar', 'Kembali perlahan', 'Lengan ke arah katrol']),
    pose(c) {
      const P = new PoseBuilder(), yaw = -0.55 + 1.0 * c;
      P.root(Ry(yaw), [0, -0.05 - 0.05 * Math.sin(Math.PI * c), 0]).set('chest', Ry(0.2 * (c - 0.5)));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.2, J.ankle[1], J.ankle[2]], [sg * 0.3, 0, 1]); P.orient('foot' + s, Ry(sg * 0.2)); }
      const hi = [-0.55, 1.75, 0.22], lo = [0.36, 0.88, 0.32], g = add(mul(hi, 1 - c), mul(lo, c));
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5), d = norm(sub(g, S));
      for (const s of ['L', 'R']) hold(P, s, add(g, mul([0, 1, 0], SG(s) * 0.035)), d, norm(cross(d, [0, 1, 0])), [SG(s) * 0.2, -0.5, -1]);
      const pul = [-1.05 + 0.13, 2.05, 0];
      return withCables(P, [[pul, apexW(P, 'L')]]);
    },
  },
  'pallof-press': {
    props: ['tower', 'cables', 'dhandles'], hands: 'fist', rigAt: { pos: [-1.05, 0, 0], yaw: -Math.PI / 2 }, start: 0, camera: CAM(0.3, 0.12, [1.25, 1.1]),
    timeline: [{ to: 1, dur: 0.9, label: 'Dorong lurus ke depan' }, { to: 1, dur: 2.0, label: 'Tahan, badan tidak berputar' }, { to: 0, dur: 1.0, label: 'Tarik kembali ke dada' }, { to: 0, dur: 0.5, label: 'Siap' }],
    pose(c) {
      const P = standLegs(new PoseBuilder(), 0.2, 0.25).root(null, [0, -0.06, 0]);
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.2, J.ankle[1], J.ankle[2]], [sg * 0.3, 0, 1]); }
      const g = [0, 1.22, 0.16 + 0.42 * c];
      for (const s of ['L', 'R']) hold(P, s, add(g, [0, SG(s) * 0.035, 0]), [0, 0.15, 1], [-SG(s) * 0.3, -SG(s), 0], [SG(s), -1, -0.3]);
      return withCables(P, [[[-1.05 + 0.13, 1.22, 0], apexW(P, 'L')]]);
    },
  },
});


// ---------------------------------------------------------------- batch 7: machines
function seatUp(lean = 0.06, fz = 0.42) {
  const P = new PoseBuilder();
  P.root(Rx(-lean), sub([0, SEAT.top + 0.115, SEAT.backZ + 0.15], J.pelvis));
  for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.17, J.ankle[1], fz], [sg * 0.2, 1, 0.5]); P.orient('foot' + s, Ry(sg * 0.1)); }
  return P;
}
const sideHandles = (P, y = 0.47, z = -0.02) => { for (const s of ['L', 'R']) hold(P, s, [SG(s) * 0.25, y, z], [0, -0.2, 1], [-SG(s), 0, 0], [SG(s), 0.2, -1]); return P; };
const kneeMid = (P) => mul(add(P.pt('shinL', J.knee), P.pt('shinR', mir(J.knee))), 0.5);
const outXf = (P, xf) => { const o = P.out(); o.xf = xf; return o; };

Object.assign(EX_MOTIONS, {
  'pec-deck-fly': {
    props: ['pecDeck'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(0.45, 0.15, [0.95, 1.0]),
    timeline: raiseTimeline(1.1, 0.5, 1.8, 0.35, ['Rapatkan lengan ke depan', 'Remas dada', 'Kembali perlahan', 'Dada meregang']),
    pose(c) {
      const P = seatUp(), xf = {};
      for (const [s, slot] of [['L', MOV.A], ['R', MOV.B]]) {
        const sg = SG(s), th = sg * (0.15 - 1.4 * c), piv = [sg * PEC.pivotX, PEC.y, PEC.pivotZ];
        const dir = quatRot(Ry(th), [sg, 0, 0]), n = mul(cross(dir, [0, 1, 0]), sg);
        hold(P, s, add(piv, mul(dir, PEC.r)), dir, n, add(mul(n, -1), [0, -0.7, 0]));
        xf[slot] = { pos: piv, rot: Ry(th) };
      }
      return outXf(P, xf);
    },
  },
  'machine-chest-press': {
    props: ['chestPress'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(0.75, 0.15, [0.95, 1.0]),
    timeline: raiseTimeline(1.1, 0.35, 1.8, 0.35, ['Dorong ke depan', 'Lengan hampir lurus', 'Kembali perlahan', 'Siku di belakang badan']),
    pose(c) {
      const P = seatUp(), xf = {};
      for (const [s, slot] of [['L', MOV.A], ['R', MOV.B]]) {
        const sg = SG(s), g = [sg * (0.25 - 0.04 * c), 1.06, 0.02 + 0.5 * c];
        hold(P, s, g, [0, 1, 0], [0, 0, 1], [sg, -0.4, -0.6]);
        xf[slot] = { pos: sub(g, [sg * 0.095, 0, 0]), rot: QI };
      }
      return outXf(P, xf);
    },
  },
  'machine-shoulder-press': {
    props: ['shoulderPress'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(0.65, 0.12, [0.95, 1.05]),
    timeline: raiseTimeline(1.2, 0.35, 1.8, 0.35, ['Dorong ke atas', 'Lengan hampir lurus', 'Turunkan perlahan', 'Handle sejajar bahu']),
    pose(c) {
      const P = seatUp(0.03), xf = {};
      for (const [s, slot] of [['L', MOV.A], ['R', MOV.B]]) {
        const sg = SG(s), g = [sg * (0.29 - 0.08 * c), 1.1 + 0.5 * c, 0.0];
        hold(P, s, g, [0, 1, 0], [0, 0, 1], [sg, -0.4, -0.1]);
        xf[slot] = { pos: sub(g, [sg * 0.095, 0, 0]), rot: QI };
      }
      return outXf(P, xf);
    },
  },
  't-bar-row': {
    props: ['tbar'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.15, [1.05, 0.9]),
    timeline: raiseTimeline(1.0, 0.45, 1.6, 0.35, ['Tarik ke dada bawah', 'Rapatkan belikat', 'Turunkan perlahan', 'Lengan lurus']),
    pose(c) {
      const P = new PoseBuilder();
      P.root(Rx(0.88), [0, 0, 0]).set('neck', Rx(-0.35));
      P.pin('chest', [0, 1.28, 0.125], add(TBAR.pad, mul(TBAR.n, 0.045)));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.14, 0.2, -0.42], [sg * 0.15, 0, 1]); P.orient('foot' + s, Rx(-0.3)); }
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
      const tgt = add(mul(add(S, [0, -0.58, 0.04]), 1 - c), mul(add(S, [0, -0.3, -0.1]), c));
      const dir = norm(sub(tgt, TBAR.pivot)), mid = add(TBAR.pivot, mul(dir, 1.3));
      for (const s of ['L', 'R']) hold(P, s, add(mid, [SG(s) * 0.17, 0, 0]), [0, -1, 0.2], [0, 0, -1], add(P.dir('chest', [0, 0, -1]), [SG(s) * 0.4, 0, 0]));
      return outXf(P, { [MOV.A]: { pos: TBAR.pivot, rot: quatFrames([0, 0, 1], [1, 0, 0], dir, [1, 0, 0]) } });
    },
  },
  'leg-press': {
    props: ['legPress'], rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(Math.PI / 2 - 0.45, 0.2, [1.1, 0.85]),
    timeline: [{ to: 0, dur: 1.9, label: 'Turunkan platform' }, { to: 0, dur: 0.3, label: 'Lutut sekitar 90°' }, { to: 1, dur: 1.3, label: 'Dorong platform' }, { to: 1, dur: 0.4, label: 'Kaki hampir lurus' }],
    pose(c) {
      const P = new PoseBuilder(), { a, H, r } = LP, dir = [0, Math.sin(a), -Math.cos(a)];
      P.root(quatMul(Rx(a), SUPINE), [0, 0, 0]).set('neck', Rx(0.2));
      P.pin('chest', [0, 1.34, -0.115], add(H, mul(dir, 0.47)));
      const HM = mul(add(P.pt('thighL', J.hip), P.pt('thighR', mir(J.hip))), 0.5), D = 0.42 + 0.36 * c, toe = norm(cross(r, [1, 0, 0]));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, add(add(HM, [sg * 0.15, 0, 0]), mul(r, D)), [sg * 0.25, 1, -0.6]); P.orient('foot' + s, quatFrames([0, 0, 1], [0, -1, 0], toe, r)); }
      return outXf(P, { [MOV.A]: { pos: add([0, HM[1], HM[2]], mul(r, D + 0.09)), rot: QI } });
    },
  },
  'hack-squat': {
    props: ['hack'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 1, camera: CAM(Math.PI / 2 - 0.5, 0.15, [1.1, 1.05]),
    timeline: [{ to: 0, dur: 1.9, label: 'Turun, punggung di bantalan' }, { to: 0, dur: 0.3, label: 'Paha sejajar platform' }, { to: 1, dur: 1.3, label: 'Dorong naik' }, { to: 1, dur: 0.4, label: 'Kaki hampir lurus' }],
    pose(c) {
      const d = 1 - c, { r, foot, tilt } = HACK, A = [0, foot[1] + 0.085, foot[2]];
      const pel = add(add(A, [0, 0.79, -0.27]), mul(r, -0.44 * d)), P = new PoseBuilder();
      P.root(Rx(-0.72), sub(pel, J.pelvis)).set('neck', Rx(0.3));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.14, A[1], A[2]], [sg * 0.2, 0, 1]); P.orient('foot' + s, quatMul(Rx(-tilt), Ry(sg * 0.15))); }
      for (const s of ['L', 'R']) P.arm(s, P.pt('chest', [SG(s) * 0.3, 1.42, 0.12]), P.dir('chest', [SG(s), -1, 0]), null);
      return outXf(P, { [MOV.A]: { pos: P.pt('chest', [0, 1.25, -0.125]), rot: QI } });
    },
  },
  'leg-extension': {
    props: ['legExt'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.15, [0.85, 0.75]),
    timeline: raiseTimeline(1.0, 0.45, 1.6, 0.35, ['Luruskan kaki', 'Tahan', 'Turunkan perlahan', 'Lutut 90°']),
    pose(c) {
      const P = new PoseBuilder(), k = 1.45 - 1.35 * c;
      P.root(Rx(-0.18), sub([0, 0.615, -0.12], J.pelvis));
      for (const s of ['L', 'R']) { P.orient('thigh' + s, Rx(-Math.PI / 2)); P.set('shin' + s, Rx(k)).set('foot' + s, Rx(-0.15)); }
      sideHandles(P, 0.46, -0.05);
      const K = kneeMid(P);
      return outXf(P, { [MOV.A]: { pos: [0, K[1], K[2]], rot: Rx(k - Math.PI / 2) } });
    },
  },
  'leg-curl': {
    props: ['legCurl'], rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.55, 0.2, [1.05, 0.7]),
    timeline: raiseTimeline(1.0, 0.4, 1.7, 0.35, ['Tarik tumit ke bokong', 'Tahan', 'Kembalikan perlahan', 'Kaki hampir lurus']),
    pose(c) {
      const P = new PoseBuilder(), k = 0.12 + 1.75 * c;
      P.root(PRONE, [0, 0, 0]).set('neck', Rx(-0.3));
      P.pin('pelvis', [0, 0.92, 0.115], [0, 0.785, 0.2]);
      for (const s of ['L', 'R']) P.set('shin' + s, Rx(k)).set('foot' + s, Rx(-0.2));
      for (const s of ['L', 'R']) P.arm(s, [SG(s) * 0.2, 0.62, 0.86], [SG(s), 0.3, -0.3], null);
      const K = kneeMid(P);
      return outXf(P, { [MOV.A]: { pos: [0, K[1], K[2]], rot: quatMul(PRONE, Rx(k)) } });
    },
  },
  'hip-abduction-machine': {
    props: ['hipMachine'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(0.35, 0.35, [0.9, 0.85]),
    timeline: raiseTimeline(1.0, 0.45, 1.5, 0.35, ['Buka kaki ke luar', 'Tahan', 'Kembali perlahan', 'Kaki rapat']),
    pose(c) { return hipMachinePose(0.08 + 0.6 * c); },
  },
  'hip-adduction-machine': {
    props: ['hipMachine'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(0.35, 0.35, [0.9, 0.85]),
    timeline: raiseTimeline(1.0, 0.45, 1.5, 0.35, ['Rapatkan kaki', 'Tahan', 'Buka perlahan', 'Kaki terbuka']),
    pose(c) { return hipMachinePose(0.68 - 0.6 * c); },
  },
  'standing-calf-raise': {
    props: ['calfStand'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.45, 0.06, [0.85, 1.15]),
    timeline: raiseTimeline(0.8, 0.5, 1.3, 0.35, ['Angkat tumit setinggi mungkin', 'Tahan', 'Turunkan perlahan', 'Betis meregang']),
    pose(c) {
      const P = new PoseBuilder(), q = Rx(-0.35 + 0.85 * c), ank = [];
      for (const s of ['L', 'R']) { const B = sideV(s, BALL), Bw = [B[0], 0.122, 0.22]; ank.push(add(Bw, quatRot(q, sub(sideV(s, J.ankle), B)))); }
      P.root(QI, [0, (ank[0][1] + ank[1][1]) / 2 - J.ankle[1] - 0.004, 0.11]);
      ['L', 'R'].forEach((s, i) => { P.leg(s, ank[i], [SG(s) * 0.1, 0, 1]); P.orient('foot' + s, q); });
      const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5), Y = add(S, [0, 0.075, -0.01]);
      for (const s of ['L', 'R']) hold(P, s, add(Y, [SG(s) * 0.2, 0.12, 0.06]), [0, 1, 0], [0, 0, 1], [SG(s), -1, 0]);
      return outXf(P, { [MOV.A]: { pos: Y, rot: QI } });
    },
  },
  'seated-calf-raise': {
    props: ['calfSeat'], hands: 'fist', rigAt: { pos: [0, 0, 0] }, start: 0, camera: CAM(Math.PI / 2 - 0.5, 0.12, [0.8, 0.75]),
    timeline: raiseTimeline(0.8, 0.5, 1.3, 0.35, ['Angkat tumit setinggi mungkin', 'Tahan', 'Turunkan perlahan', 'Betis meregang']),
    pose(c) {
      const P = new PoseBuilder(), q = Rx(-0.3 + 0.8 * c);
      P.root(QI, sub([0, 0.615, -0.08], J.pelvis));
      for (const s of ['L', 'R']) { const B = sideV(s, BALL), Bw = [B[0] * 0.95, 0.125, 0.42]; P.leg(s, add(Bw, quatRot(q, sub(sideV(s, J.ankle), B))), [SG(s) * 0.1, 1, 0.6]); P.orient('foot' + s, q); }
      const K = kneeMid(P), pad = [0, K[1] + 0.08, K[2] - 0.02];
      for (const s of ['L', 'R']) P.arm(s, add(pad, [SG(s) * 0.2, 0.05, -0.03]), [SG(s), -0.5, -0.5], null);
      return outXf(P, { [MOV.A]: { pos: pad, rot: QI } });
    },
  },
});
function hipMachinePose(th) {
  const P = new PoseBuilder(), xf = {};
  P.root(Rx(-0.28), sub([0, SEAT.top + 0.115, SEAT.backZ + 0.15], J.pelvis));
  for (const [s, slot] of [['L', MOV.A], ['R', MOV.B]]) {
    const sg = SG(s), y = Ry(sg * th);
    P.orient('thigh' + s, quatMul(y, Rx(-Math.PI / 2))); P.orient('shin' + s, y); P.orient('foot' + s, y);
    const hp = P.pt('thigh' + s, sideV(s, J.hip));
    xf[slot] = { pos: hp, rot: y };
  }
  sideHandles(P, 0.5, -0.04);
  return outXf(P, xf);
}



// ---------------------------------------------------------------- batch 8: bodyweight finals, jump rope, battle ropes
const lerpV = (a, b, u) => add(mul(a, 1 - u), mul(b, u));
// blend two pose outputs (bone quats + root)
function blendPose(A, B, u) {
  const o = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (k !== 'root' && k !== 'xf') o[k] = nlerpQ(A[k] || QI, B[k] || QI, u);
  o.root = { pos: lerpV(A.root.pos, B.root.pos, u), rot: nlerpQ(A.root.rot, B.root.rot, u) };
  return o;
}
// rope control points -> slot frames (z along the tangent, normal parallel-transported so the tube doesn't twist)
const ropeChain = (xf, pts, first = 0) => {
  let n = null;
  pts.forEach((p, j) => {
    const t = norm(sub(pts[Math.min(pts.length - 1, j + 1)], pts[Math.max(0, j - 1)]));
    if (!n) n = norm(cross(t, Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    n = norm(sub(n, mul(t, dot(n, t))));
    xf[ROPE_SEG0 + first + j] = { pos: p, rot: quatFrames([0, 0, 1], [1, 0, 0], t, n) };
  });
  return xf;
};
// lower end (pinky side) of a handle held in the fist
const handleEnd = (P, s, off = 0.075) => {
  const f = handFrame(), a = P.pt('hand' + s, sideV(s, add(f.grip, mul(f.lat, off)))), b = P.pt('hand' + s, sideV(s, add(f.grip, mul(f.lat, -off))));
  return a[1] < b[1] ? a : b;
};
// supine on the floor, lower back as pivot
const supineBase = (P) => P.root(SUPINE, [0, 0, 0]);
const handsToHead = (P) => {
  for (const s of ['L', 'R']) { const sg = SG(s); P.arm(s, P.pt('head', [sg * 0.075, 1.62, -0.06]), P.dir('chest', [sg, 0.25, -0.15]), P.dir('head', [-sg, 0, -0.3])); }
  return P;
};
const WALL_HS = (() => {
  // handstand facing away from the wall (+z), heels resting on it
  const build = (c) => {
    const P = new PoseBuilder();
    P.root(quatMul(Rx(-0.1), Rz(Math.PI)), [0, 0, 0]).set('spine2', Rx(-0.06)).set('chest', Rx(-0.04)).set('neck', Rx(-0.35 - 0.25 * (1 - c)));
    for (const s of ['L', 'R']) P.set('foot' + s, Rx(0.55)).set('thigh' + s, Rz(SG(s) * 0.03));
    const S = mul(add(shoulderW(P, 'L'), shoulderW(P, 'R')), 0.5);
    P.shift([-S[0], 0.33 + 0.27 * c - S[1], -S[2]]);
    return P;
  };
  const top = build(1), heel = Math.min(top.pt('footL', HEEL)[2], top.pt('footR', mir(HEEL))[2]);
  return { build, wallZ: heel - 0.018 };
})();

Object.assign(EX_MOTIONS, {
  'archer-push-up': {
    props: ['mat'], start: 1, camera: CAM(0.55, 0.32, [1.15, 0.55]),
    timeline: [{ to: 0, dur: 1.6, label: 'Turun ke tangan kiri' }, { to: 0, dur: 0.25, label: 'Lengan kanan lurus' }, { to: 1, dur: 1.1, label: 'Dorong ke tengah' },
      { to: 0, dur: 1.6, label: 'Turun ke tangan kanan' }, { to: 0, dur: 0.25, label: 'Lengan kiri lurus' }, { to: 1, dur: 1.1, label: 'Dorong ke tengah' }],
    pose: (() => {
      let top = null;
      return (c, t) => {
        if (top === null) top = proneSupport(new PoseBuilder(), 0.47, { thighL: Rz(-0.1), thighR: Rz(0.1) }).pt('upperArmL', J.shoulder)[2];
        const act = t < 0.5 ? 'L' : 'R', d = 1 - c;
        const P = proneSupport(new PoseBuilder(), 0.47 - 0.25 * d, { thighL: Rz(-0.1), thighR: Rz(0.1) });
        P.shift([SG(act) * 0.24 * ease(0, 1, d), 0, 0]);
        return handsDown(P, (s, sg) => ({ at: [sg * 0.56, 0.004, top + 0.02], fingers: [sg * 0.85, 0, 0.5], pole: s === act ? [sg * 0.2, 0.4, -1] : [sg * 0.2, 1, 0.2] })).out();
      };
    })(),
  },
  'pseudo-planche-push-up': {
    props: ['mat'], start: 1, camera: CAM(Math.PI / 2 - 0.5, 0.2, [1.0, 0.55]),
    timeline: [{ to: 0, dur: 1.9, label: 'Condong ke depan · turunkan dada' }, { to: 0, dur: 0.3, label: 'Bahu jauh melewati tangan' }, { to: 1, dur: 1.3, label: 'Dorong, tetap condong' }, { to: 1, dur: 0.5, label: 'Protraksi bahu' }],
    pose: pushupFamily({ shTop: 0.5, shBot: 0.24, width: 0.21, fwd: -0.27, fingers: (sg) => [sg * 0.8, 0, -0.6], pole: (sg) => [sg * 0.15, 0.4, -1] }),
  },
  'pike-push-up': {
    props: ['mat'], start: 1, camera: CAM(Math.PI / 2 - 0.4, 0.15, [1.0, 0.75]),
    timeline: [{ to: 0, dur: 1.7, label: 'Turunkan kepala ke depan tangan' }, { to: 0, dur: 0.25, label: 'Kepala dekat lantai' }, { to: 1, dur: 1.1, label: 'Dorong naik' }, { to: 1, dur: 0.5, label: 'Pinggul tinggi · huruf V' }],
    pose: (() => {
      const body = (shY) => {
        const P = new PoseBuilder();
        const setup = (a) => { P.rot = { thighL: Rx(-1.85), thighR: Rx(-1.85), footL: Rx(-0.55), footR: Rx(-0.55), neck: Rx(-0.15) }; P.W = null; P.root(Rx(Math.PI / 2 + a), [0, 0, 0]); pinToes(P); return shoulderY(P); };
        setup(solve(setup, shY, 0.2, 1.4));
        return P;
      };
      let hz = null;
      return (c) => {
        if (hz === null) hz = body(0.56).pt('upperArmL', J.shoulder)[2] + 0.04;
        const P = body(0.27 + 0.29 * c);
        return handsDown(P, (s, sg) => ({ at: [sg * 0.26, 0.004, hz], fingers: [sg * 0.15, 0, 1], pole: [sg * 0.7, 0.2, 0.7] })).out();
      };
    })(),
  },
  'wall-handstand-push-up': {
    props: ['wall', 'mat'], rigAt: { pos: [0, 0, WALL_HS.wallZ - 0.12] }, start: 1, camera: CAM(Math.PI / 2 - 0.55, 0.05, [0.85, 1.25]),
    timeline: [{ to: 0, dur: 1.9, label: 'Turunkan kepala perlahan' }, { to: 0, dur: 0.3, label: 'Kepala dekat lantai' }, { to: 1, dur: 1.3, label: 'Dorong ke atas' }, { to: 1, dur: 0.6, label: 'Lengan lurus · tumit di dinding' }],
    pose(c) {
      const P = WALL_HS.build(c);
      return handsDown(P, (s, sg) => ({ at: [-sg * 0.27, 0.004, 0.06], fingers: [-sg * 0.25, 0, 1], pole: [-sg * 0.8, 0.2, 0.6] })).out();
    },
  },
  'pistol-squat': {
    props: [], start: 1, shadows: 'auto', camera: CAM(Math.PI / 2 - 0.55, 0.08, [0.85, 0.95]),
    timeline: [{ to: 0, dur: 2.0, label: 'Kiri · turun perlahan' }, { to: 0, dur: 0.3, label: 'Paha bawah menyentuh betis' }, { to: 1, dur: 1.4, label: 'Kiri · dorong naik' }, { to: 1, dur: 0.4, label: 'Ganti kaki' },
      { to: 0, dur: 2.0, label: 'Kanan · turun perlahan' }, { to: 0, dur: 0.3, label: 'Paha bawah menyentuh betis' }, { to: 1, dur: 1.4, label: 'Kanan · dorong naik' }, { to: 1, dur: 0.4, label: 'Ganti kaki' }],
    pose(c, t) {
      const st = t < 0.5 ? 'L' : 'R', fr = st === 'L' ? 'R' : 'L', ss = SG(st), d = 1 - c, dd = ease(0, 1, d);
      const P = new PoseBuilder();
      P.root(Rx(0.62 * dd), [ss * 0.07, -0.6 * dd, -0.17 * dd]).set('spine1', Rx(0.12 * dd)).set('spine2', Rx(0.1 * dd)).set('neck', Rx(-0.45 * dd));
      P.leg(st, [ss * 0.1, J.ankle[1], J.ankle[2] + 0.02], [ss * 0.12, 0, 1]); P.orient('foot' + st, Ry(ss * 0.08));
      const lift = 0.25 + 1.05 * dd;
      P.orient('thigh' + fr, quatMul(Rx(-lift), Rz(-SG(fr) * 0.04))).set('shin' + fr, Rx(0.12 + 0.1 * (1 - dd))).set('foot' + fr, Rx(-0.15));
      for (const s of ['L', 'R']) P.orient('upperArm' + s, quatMul(Rx(-0.2 - 1.3 * ease(0, 0.6, d)), Rz(-SG(s) * 0.05))).set('foreArm' + s, quatAxis(ARM[s].hinge, -0.1));
      return P.out();
    },
  },
  'bicycle-crunch': {
    props: ['mat'], start: 0, camera: CAM(Math.PI / 2 - 0.4, 0.3, [0.9, 0.55]),
    timeline: [{ to: 1, dur: 0.7, label: 'Siku kanan ke lutut kiri' }, { to: 0, dur: 0.6, label: 'Ganti sisi' }, { to: 1, dur: 0.7, label: 'Siku kiri ke lutut kanan' }, { to: 0, dur: 0.6, label: 'Ganti sisi' }],
    pose(c, t) {
      const w = Math.sin(2 * Math.PI * t), kL = 0.5 + 0.5 * w, kR = 1 - kL; // knee in: L at t=.25
      const P = supineBase(new PoseBuilder());
      const tw = -0.32 * w;
      P.set('spine1', Rx(0.1)).set('spine2', quatMul(Rx(0.28), Ry(tw * 0.45))).set('chest', quatMul(Rx(0.22), Ry(tw * 0.55))).set('neck', Rx(0.15));
      for (const [s, k] of [['L', kL], ['R', kR]]) P.set('thigh' + s, Rx(-(0.45 + 1.05 * k))).set('shin' + s, Rx(0.15 + 1.5 * k)).set('foot' + s, Rx(0.3));
      handsToHead(P);
      return P.ground().out();
    },
  },
  'russian-twist': {
    props: ['medBall', 'mat'], start: 0.5, camera: CAM(0.12, 0.42, [0.8, 0.6]),
    timeline: [{ to: 1, dur: 0.75, label: 'Putar ke kanan' }, { to: 0.5, dur: 0.6, label: 'Tengah' }, { to: 0, dur: 0.75, label: 'Putar ke kiri' }, { to: 0.5, dur: 0.6, label: 'Tengah' }],
    pose(c) {
      const tw = (c - 0.5) * 2 * -0.9; // c=1 -> right (toward -x)
      const P = new PoseBuilder();
      P.root(Rx(-0.72), [0, 0, 0]).set('spine1', quatMul(Rx(0.08), Ry(tw * 0.25))).set('spine2', quatMul(Rx(0.12), Ry(tw * 0.35))).set('chest', quatMul(Rx(0.06), Ry(tw * 0.4))).set('neck', Rx(0.3));
      for (const s of ['L', 'R']) { const sg = SG(s); P.orient('thigh' + s, quatMul(Rx(-2.05), Rz(-sg * 0.08))); P.orient('shin' + s, Rx(-1.2)); P.orient('foot' + s, Rx(-0.9)); }
      const B = P.pt('chest', [0, 1.2, 0.42]);
      for (const s of ['L', 'R']) {
        const sg = SG(s), lat = P.dir('chest', [sg, 0, 0]), fwd = P.dir('chest', [0, 0, 1]);
        const q = handQuat(s, norm(add(fwd, mul(P.dir('chest', [0, 1, 0]), 0.2))), mul(lat, -1));
        P.arm(s, wristFor(s, q, add(B, mul(lat, 0.105))), add(P.dir('chest', [sg, -0.6, 0]), [0, -0.3, 0]), mul(lat, -1)); P.orient('hand' + s, q);
      }
      return P.ground().out();
    },
  },
  'dead-bug': {
    props: ['mat'], start: 0, camera: CAM(Math.PI / 2 - 0.55, 0.3, [0.95, 0.6]),
    timeline: [{ to: 1, dur: 1.3, label: 'Lengan kanan & kaki kiri lurus' }, { to: 1, dur: 0.35, label: 'Punggung tetap menempel' }, { to: 0, dur: 1.1, label: 'Kembali ke tengah' },
      { to: 1, dur: 1.3, label: 'Lengan kiri & kaki kanan lurus' }, { to: 1, dur: 0.35, label: 'Punggung tetap menempel' }, { to: 0, dur: 1.1, label: 'Kembali ke tengah' }],
    pose(c, t) {
      const arm = t < 0.5 ? 'R' : 'L', leg = arm === 'R' ? 'L' : 'R', e = ease(0, 1, c);
      const P = supineBase(new PoseBuilder()).set('neck', Rx(0.08));
      for (const s of ['L', 'R']) {
        const sg = SG(s), a = s === arm ? e : 0, l = s === leg ? e : 0;
        P.set('upperArm' + s, quatMul(Rx(-1.55 - 1.4 * a), Rz(-sg * 0.06))).set('foreArm' + s, quatAxis(ARM[s].hinge, -0.05));
        P.set('thigh' + s, Rx(-1.57 + 1.35 * l)).set('shin' + s, Rx(1.57 * (1 - l) + 0.05)).set('foot' + s, Rx(0.15));
      }
      P.pin('pelvis', [0, 0.875, -0.112], [0, 0, 0]);
      return P.out();
    },
  },
  'hollow-body-hold': {
    props: ['mat'], start: 1, camera: CAM(Math.PI / 2 - 0.5, 0.22, [1.1, 0.55]), timeline: HOLD('Tahan · punggung bawah menempel', 'Tahan · napas pendek'),
    pose(c) {
      const k = 1 + 0.03 * (c - 0.9) * 10;
      const P = supineBase(new PoseBuilder());
      P.set('spine2', Rx(0.18 * k)).set('chest', Rx(0.16 * k)).set('neck', Rx(0.22));
      for (const s of ['L', 'R']) { const sg = SG(s); P.set('upperArm' + s, quatMul(Rx(-2.75), Rz(-sg * 0.06))).set('thigh' + s, quatMul(Rx(-0.36 * k), Rz(sg * 0.01))).set('foot' + s, Rx(0.6)); }
      return P.ground().out();
    },
  },
  'burpee': {
    props: [], start: 1, shadows: 'auto', camera: CAM(Math.PI / 2 - 0.6, 0.12, [1.05, 1.1]),
    timeline: [{ to: 0.6, dur: 0.55, label: 'Jongkok · tangan ke lantai' }, { to: 0.3, dur: 0.4, label: 'Lompat kaki ke belakang' }, { to: 0, dur: 0.55, label: 'Push-up · turun' },
      { to: 0.3, dur: 0.5, label: 'Push-up · naik' }, { to: 0.6, dur: 0.4, label: 'Lompat kaki ke depan' }, { to: 1, dur: 0.5, label: 'Lompat · tangan ke atas' }, { to: 1, dur: 0.45, label: 'Mendarat lembut' }],
    pose: (() => {
      let K = null;
      const HZ = 0.42;
      const plank = (shY) => {
        const P = proneSupport(new PoseBuilder(), shY);
        const top = proneSupport(new PoseBuilder(), 0.555).pt('upperArmL', J.shoulder)[2];
        return P.shift([0, 0, HZ - top]);
      };
      const crouchBody = (P) => {
        P.root(Rx(0.95), [0, -0.5, -0.12]).set('spine1', Rx(0.15)).set('neck', Rx(-0.5));
        for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.14, J.ankle[1], J.ankle[2]], [sg * 0.4, 0, 1]); P.orient('foot' + s, Ry(sg * 0.15)); }
        return P;
      };
      const hands = (P, pole) => handsDown(P, (s, sg) => ({ at: [sg * 0.24, 0.004, HZ], fingers: [sg * 0.12, 0, 1], pole: pole(sg) }));
      const init = () => {
        const cr = crouchBody(new PoseBuilder()), pl = plank(0.555);
        const legs = (P) => ['L', 'R'].map((s) => ({ a: P.pt('shin' + s, sideV(s, J.ankle)), q: P.world('foot' + s).q }));
        K = { cr, pl, crL: legs(cr), plL: legs(pl), crO: cr.out(), plO: pl.out() };
      };
      // u: 0 crouch .. 1 plank, hands planted
      const planted = (u, lift) => {
        const P = new PoseBuilder(), A = K.crO, B = K.plO;
        P.root(nlerpQ(A.root.rot, B.root.rot, u), add(lerpV(A.root.pos, B.root.pos, u), [0, 0.08 * lift, 0]));
        for (const b of ['spine1', 'spine2', 'chest', 'neck', 'head']) P.set(b, nlerpQ(A[b] || QI, B[b] || QI, u));
        ['L', 'R'].forEach((s, i) => {
          const sg = SG(s), a = add(lerpV(K.crL[i].a, K.plL[i].a, u), [0, 0.1 * lift, 0]);
          P.leg(s, a, lerpV([sg * 0.4, 0, 1], [sg * 0.1, -1, 0], u)); P.orient('foot' + s, nlerpQ(K.crL[i].q, K.plL[i].q, u));
        });
        return hands(P, (sg) => lerpV([sg * 0.6, 0.2, -0.5], [sg * 0.75, 0.45, -0.55], u)).out();
      };
      const stand = (h, arms) => {
        const P = new PoseBuilder().root(null, [0, h, 0]);
        for (const s of ['L', 'R']) {
          const sg = SG(s); P.set('upperArm' + s, quatMul(Rx(-arms), Rz(-sg * (0.06 + 0.2 * Math.min(1, arms / 2.9))))).set('foreArm' + s, quatAxis(ARM[s].hinge, -0.15));
          P.leg(s, [sg * 0.12, J.ankle[1] + h, J.ankle[2]], [sg * 0.1, 0, 1]); P.set('foot' + s, Rx(h > 0.01 ? 0.55 : 0));
        }
        return P.out();
      };
      const half = () => { const P = new PoseBuilder().root(Rx(0.45), [0, -0.22, -0.08]).set('neck', Rx(-0.3)); for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.12, J.ankle[1], J.ankle[2]], [sg * 0.25, 0, 1]); P.orient('foot' + s, QI); P.set('upperArm' + s, Rx(0.3)); } return P.out(); };
      const seg = (t, a, b) => ease(0, 1, (t - a) / (b - a));
      return (c, t) => {
        if (!K) init();
        // phase boundaries from the timeline durations (total 3.35)
        const T = [0, 0.164, 0.284, 0.448, 0.597, 0.716, 0.866, 1];
        if (t < T[1]) return blendPose(stand(0, 0.05), planted(0, 0), seg(t, T[0], T[1]));
        if (t < T[2]) { const u = seg(t, T[1], T[2]); return planted(u, Math.sin(Math.PI * u)); }
        if (t < T[4]) {
          const dn = t < T[3] ? seg(t, T[2], T[3]) : 1 - seg(t, T[3], T[4]);
          const P = plank(0.555 - 0.33 * dn);
          return hands(P, (sg) => [sg * 0.75, 0.45, -0.55]).out();
        }
        if (t < T[5]) { const u = 1 - seg(t, T[4], T[5]); return planted(u, Math.sin(Math.PI * u)); }
        if (t < T[6]) {
          const u = (t - T[5]) / (T[6] - T[5]);
          if (u < 0.45) return blendPose(planted(0, 0), half(), ease(0, 1, u / 0.45));
          return blendPose(half(), stand(0.24, 2.9), ease(0, 1, (u - 0.45) / 0.55));
        }
        const u = (t - T[6]) / (T[7] - T[6]);
        return u < 0.5 ? blendPose(stand(0.24, 2.9), half(), ease(0, 1, u / 0.5)) : blendPose(half(), stand(0, 0.05), ease(0, 1, (u - 0.5) / 0.5));
      };
    })(),
  },
  'jump-rope': {
    props: ['jumpRope'], hands: 'fist', start: 0, shadows: 'auto', camera: CAM(Math.PI / 2 - 0.65, 0.08, [1.0, 1.15]),
    timeline: [{ to: 1, dur: 0.24, label: 'Lompat kecil · tali lewat' }, { to: 0, dur: 0.24, label: 'Mendarat di ujung kaki' }, { to: 1, dur: 0.24, label: 'Lompat kecil · tali lewat' }, { to: 0, dur: 0.24, label: 'Mendarat di ujung kaki' }],
    pose(c, t) {
      const phi = 4 * Math.PI * (t - 0.25), h = 0.045 * c, P = new PoseBuilder();
      P.root(Rx(0.04), [0, h - 0.025 * (1 - c), 0]).set('neck', Rx(-0.04));
      for (const s of ['L', 'R']) {
        const sg = SG(s), qf = Rx(0.35 + 0.25 * c), B = sideV(s, BALL), base = [B[0], h, B[2]];
        P.leg(s, add(base, quatRot(qf, sub(sideV(s, J.ankle), B))), [sg * 0.1, 0, 1]); P.orient('foot' + s, qf);
      }
      const ring = [0, -Math.cos(phi), -Math.sin(phi)];
      for (const s of ['L', 'R']) {
        const sg = SG(s), g = add([sg * 0.3, 0.93 + h, 0.12], mul(ring, 0.035));
        hold(P, s, g, [sg * 0.25, -0.05, 1], [-sg, 0.1, 0], [sg * 0.4, -0.2, -1]);
      }
      const EL = handleEnd(P, 'L'), ER = handleEnd(P, 'R'), M = mul(add(EL, ER), 0.5), R = M[1] - 0.012;
      const pts = [];
      for (let i = 0; i < ROPE_SEGS; i++) {
        const u = i / (ROPE_SEGS - 1), r = R * Math.pow(Math.sin(Math.PI * u), 0.45), x = lerpV(EL, ER, u);
        const p = add(x, mul(ring, r)); p[0] *= 1 + 0.25 * Math.sin(Math.PI * u); p[1] = Math.max(0.008, p[1]);
        pts.push(p);
      }
      const o = P.out(); o.xf = ropeChain({}, pts); return o;
    },
  },
  'battle-rope-waves': {
    props: ['battleRopes'], hands: 'fist', rigAt: { pos: [0, 0, 2.7] }, start: 0, shadows: 'auto', camera: { yaw: Math.PI / 2 - 0.42, pitch: 0.16, extent: [1.75, 0.9], auto: true },
    timeline: [{ to: 1, dur: 0.3, label: 'Kiri naik · kanan turun' }, { to: 0, dur: 0.3, label: 'Kanan naik · kiri turun' }, { to: 1, dur: 0.3, label: 'Kiri naik · kanan turun' }, { to: 0, dur: 0.3, label: 'Kanan naik · kiri turun' }],
    pose(c, t) {
      const ph = 4 * Math.PI * t, P = new PoseBuilder();
      P.root(Rx(0.3), [0, -0.13, -0.08]).set('neck', Rx(-0.25)).set('spine2', Rx(0.04));
      for (const s of ['L', 'R']) { const sg = SG(s); P.leg(s, [sg * 0.2, J.ankle[1], J.ankle[2] + (s === 'L' ? 0.04 : -0.04)], [sg * 0.35, 0, 1]); P.orient('foot' + s, Ry(sg * 0.2)); }
      const xf = {}, AZ = 2.7 - 0.06;
      ['L', 'R'].forEach((s, i) => {
        const sg = SG(s), phase = ph + (s === 'L' ? 0 : Math.PI), y = 0.95 + 0.17 * Math.sin(phase);
        hold(P, s, [sg * 0.22, y, 0.48], [sg * 0.1, -0.1, 1], [-sg, 0, 0], [sg * 0.6, -0.4, -1]);
        const E = handleEnd(P, s, 0.05), far = [sg * 0.1, 0.024, 2.05], pts = [E], Y0 = 0.92;
        for (let k = 1; k <= 6; k++) {
          const u = k / 6, base = lerpV(E, far, u);
          const env = Math.pow(1 - u, 0.7) * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, u * 1.6 + 0.2)));
          let yy = 0.024 + (Y0 - 0.024) * (1 - u) * (1 - u) * (1 - 0.3 * u) + 0.21 * env * Math.sin(phase - 2 * Math.PI * 1.15 * u);
          yy += (E[1] - (0.024 + (Y0 - 0.024) + 0.17 * Math.sin(phase))) * Math.pow(1 - u, 3);
          pts.push([base[0], Math.max(0.024, yy), base[2]]);
        }
        pts.push([sg * 0.05, 0.3, AZ]);
        ropeChain(xf, pts, i * 8);
      });
      const o = P.out(); o.xf = xf; return o;
    },
  },
});


// ---------------------------------------------------------------- library -> playable exercises
const exSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const muscleKeyOf = (() => {
  const nrm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const map = {}; for (const d of MUSCLES) map[nrm(d.name + ' ' + (d.part || ''))] = d.key;
  return (n) => map[nrm(n)];
})();
function makeExercise(e, motion) {
  return Object.assign({
    id: exSlug(e.name), name: e.name, section: e.section, level: e.level, categories: e.categories || [],
    equipment: e.equipment || [], steps: e.steps || [],
    primary: (e.primary || []).map((m) => muscleKeyOf(m.muscle)).filter(Boolean),
    secondary: (e.secondary || []).map((m) => muscleKeyOf(m.muscle)).filter(Boolean),
    props: [], hands: 'open', shadows: 'auto', start: 0,
  }, motion);
}
const EXERCISES = (typeof EXERCISE_LIBRARY !== 'undefined' ? EXERCISE_LIBRARY : [])
  .filter((e) => EX_MOTIONS[exSlug(e.name)]).map((e) => makeExercise(e, EX_MOTIONS[exSlug(e.name)]));

// ---------------------------------------------------------------- equipment catalogue (Equipment tab)
// each modelled item is shown on its own, posed as in a source exercise (`src` at cycle fraction `frac`), body hidden
const EQUIPMENT_CATEGORIES = ['Beban bebas', 'Bench & rak', 'Bodyweight', 'Kardio & kondisi', 'Stasiun kabel', 'Mesin'];
const EQUIPMENT = [
  ['Dumbbells (fixed)', 'Beban bebas', ['dumbbells'], 'dumbbell-bench-press', 0, 'Sepasang dumbbell heksagonal dengan pegangan bertekstur.'],
  ['Olympic barbell', 'Beban bebas', ['barbell'], 'barbell-deadlift', 0, 'Bar 2,2 m dengan sleeve berputar, ditampilkan dengan plate terpasang.'],
  ['Iron / rubber-coated plates', 'Beban bebas', ['barbell'], 'barbell-deadlift', 0, 'Ditampilkan terpasang di barbell.'],
  ['Bumper plates', 'Beban bebas', ['barbell'], 'power-clean', 0, 'Ditampilkan terpasang di barbell, diameter penuh untuk dijatuhkan.'],
  ['EZ curl bar', 'Beban bebas', ['ezbar'], 'upright-row', 0, 'Bar pendek dengan tekukan untuk pegangan semi-supinasi.'],
  ['Trap / hex bar', 'Beban bebas', ['trapbar'], 'trap-bar-deadlift', 0, 'Bar heksagonal; badan berdiri di dalam bar.'],
  ['Kettlebells', 'Beban bebas', ['kbSwing'], 'kettlebell-swing', 0, 'Kettlebell besi tuang dengan pegangan lebar.'],
  ['Medicine ball', 'Beban bebas', ['medBall'], 'russian-twist', 0, 'Bola beban karet, dipegang dua tangan.'],
  ['Flat bench', 'Bench & rak', ['bench'], 'barbell-bench-press', 0, 'Bench datar dengan bantalan dan rangka baja.'],
  ['Adjustable (FID) bench', 'Bench & rak', ['adjBench'], 'incline-dumbbell-press', 0, 'Sandaran bisa diatur datar, incline, sampai tegak.'],
  ['Decline bench', 'Bench & rak', ['decline'], 'decline-bench-press', 0, 'Bench menurun dengan pengait kaki.'],
  ['Power rack / squat cage', 'Bench & rak', ['rack'], 'barbell-back-squat', 0, 'Rak empat tiang dengan J-hook dan safety bar.'],
  ['Preacher curl bench', 'Bench & rak', ['preacher'], 'preacher-curl', 0, 'Bantalan miring untuk menahan lengan atas saat curl.'],
  ['45° back extension', 'Bench & rak', ['backext'], 'back-extension', 0, 'Bantalan pinggul dan penahan pergelangan kaki pada sudut 45°.'],
  ['Landmine attachment', 'Bench & rak', ['landmine'], 'landmine-press', 0, 'Engsel di lantai untuk satu ujung barbell.'],
  ['Plyo box', 'Bench & rak', ['box'], 'box-jump', 0, 'Kotak lompat yang kokoh.'],
  ['Pull-up bar', 'Bodyweight', ['pullup'], 'pull-up', 0, 'Palang gantung berdiri bebas.'],
  ['Dip station / parallel bars', 'Bodyweight', ['dip'], 'chest-dip', 0, 'Dua palang sejajar untuk dip.'],
  ['Gymnastic rings', 'Bodyweight', ['rings'], 'ring-dip', 0, 'Sepasang ring kayu dengan tali.'],
  ['Parallettes', 'Bodyweight', ['parallettes'], 'l-sit', 0, 'Palang rendah untuk L-sit dan push-up.'],
  ['Ab wheel', 'Bodyweight', ['abwheel'], 'ab-wheel-rollout', 0, 'Roda dengan pegangan di kedua sisi.'],
  ['Exercise / yoga mat', 'Bodyweight', ['mat'], 'plank', 0, 'Matras latihan untuk gerakan di lantai.'],
  ['Jump rope', 'Kardio & kondisi', ['jumpRope'], 'jump-rope', 0.2, 'Tali skipping dengan dua gagang.'],
  ['Battle ropes', 'Kardio & kondisi', ['battleRopes'], 'battle-rope-waves', 0.1, 'Dua tali tebal yang ditambatkan di jangkar.'],
  ['Cable crossover station', 'Stasiun kabel', ['crossover', 'cables', 'dhandles'], 'cable-crossover', 0, 'Dua tower kabel dengan katrol yang bisa diatur tingginya.'],
  ['Cable attachments', 'Stasiun kabel', ['ropes'], 'face-pull', 0, 'Rope, D-handle, straight bar, lat bar, dan V-bar. Yang ditampilkan: rope attachment.'],
  ['Lat pulldown', 'Stasiun kabel', ['latMachine', 'cables', 'latBar'], 'lat-pulldown', 0, 'Stasiun tarik dari atas dengan penahan paha.'],
  ['Seated cable row', 'Stasiun kabel', ['rowMachine', 'cables', 'vBar'], 'seated-cable-row', 0, 'Bangku rendah dengan pijakan kaki dan kabel horizontal.'],
  ['Pec deck / rear delt fly', 'Mesin', ['pecDeck'], 'pec-deck-fly', 0, 'Mesin fly dengan dua lengan berputar.'],
  ['Chest press machine', 'Mesin', ['chestPress'], 'machine-chest-press', 0, 'Mesin dorong dada dengan jalur tetap.'],
  ['Shoulder press machine', 'Mesin', ['shoulderPress'], 'machine-shoulder-press', 0, 'Mesin dorong ke atas dengan jalur tetap.'],
  ['Leg press', 'Mesin', ['legPress'], 'leg-press', 0, 'Leg press 45° dengan sled di rel.'],
  ['Hack squat', 'Mesin', ['hack'], 'hack-squat', 0, 'Sled squat miring dengan bantalan bahu.'],
  ['Leg extension', 'Mesin', ['legExt'], 'leg-extension', 0, 'Kursi dengan lengan bantalan di pergelangan kaki.'],
  ['Leg curl (lying or seated)', 'Mesin', ['legCurl'], 'leg-curl', 0, 'Versi berbaring; tuas bantalan di belakang tumit.'],
  ['Calf raise machine', 'Mesin', ['calfStand'], 'standing-calf-raise', 0, 'Versi berdiri dengan yoke bahu dan pijakan.'],
  ['Hip abductor / adductor', 'Mesin', ['hipMachine'], 'hip-abduction-machine', 0, 'Kursi dengan bantalan paha yang membuka dan menutup.'],
  ['T-bar / chest-supported row', 'Mesin', ['tbar'], 't-bar-row', 0, 'Tuas T-bar dengan bantalan dada.'],
].map(([name, category, props, src, frac, desc]) => ({ id: exSlug(name), name, category, props, src, frac, desc, modeled: true }));
// listed in the library but not modelled yet
(() => {
  const have = new Set(EQUIPMENT.map((e) => e.name));
  const extra = new Set();
  for (const e of (typeof EXERCISE_LIBRARY !== 'undefined' ? EXERCISE_LIBRARY : [])) for (const q of e.equipment || []) if (!have.has(q.name)) extra.add(q.name);
  for (const name of extra) EQUIPMENT.push({ id: exSlug(name), name, category: 'Belum ada model', props: [], modeled: false, desc: 'Belum ada model 3D.' });
})();
for (const it of EQUIPMENT) {
  it.usedBy = (typeof EXERCISE_LIBRARY !== 'undefined' ? EXERCISE_LIBRARY : []).filter((e) => (e.equipment || []).some((q) => q.name === it.name))
    .map((e) => ({ id: exSlug(e.name), name: e.name, optional: !!(e.equipment.find((q) => q.name === it.name) || {}).optional }));
}
// ---------------------------------------------------------------- three.js adapter (optional)
// const { group, skeleton, bones, meshes, selectGroup, setBoneRotation } = toThree(THREE, buildEcorche());
// scene.add(group);  // one SkinnedMesh per muscle, all sharing one Skeleton
function toThree(THREE, model = buildEcorche(), opts = {}) {
  const G = model.geometry;
  const group = new THREE.Group();
  group.name = 'Ecorche';

  // skeleton: bones keep identity rest rotation, so a rotation on a bone is a rotation about its joint
  const bones = model.bones.map((b) => { const bone = new THREE.Bone(); bone.name = b.name; return bone; });
  model.bones.forEach((b, i) => {
    const parent = b.parent >= 0 ? model.bones[b.parent].pivot : [0, 0, 0];
    bones[i].position.set(b.pivot[0] - parent[0], b.pivot[1] - parent[1], b.pivot[2] - parent[2]);
    if (b.parent >= 0) bones[b.parent].add(bones[i]);
  });
  const root = bones[model.bones.findIndex((b) => b.parent < 0)];
  group.add(root);
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);

  // procedural fibre texture (browser only)
  let fibre = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const ctx = c.getContext('2d'), img = ctx.createImageData(128, 128), rnd = mulberry(7);
    const cols = Array.from({ length: 128 }, () => rnd());
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const k = (y * 128 + x) * 4, v = 200 + 55 * (0.6 * cols[x] + 0.4 * cols[(x + ((y / 16) | 0)) % 128]);
      img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    fibre = new THREE.CanvasTexture(c);
    fibre.wrapS = fibre.wrapT = THREE.RepeatWrapping; fibre.repeat.set(2, 7);
  }
  const muscleMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
  const plainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 });
  const ghostMat = new THREE.MeshStandardMaterial({ color: opts.ghostColor || 0xc7ccd3, roughness: 0.7, metalness: 0 });

  const toLin = (x) => Math.pow(x / 255, 2.2);
  const meshes = [];
  for (const r of G.ranges) {
    if (r.id >= 241) continue; // grip hands & equipment use viewer-only slots
    const n = r.vertexCount, v0 = r.vertexStart;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(G.position.slice(v0 * 3, (v0 + n) * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(G.normal.slice(v0 * 3, (v0 + n) * 3), 3));
    const col = new Float32Array(n * 3), uv = new Float32Array(n * 2), sw = new Float32Array(n * 4), si = new Uint16Array(n * 4);
    for (let i = 0; i < n; i++) {
      const k = v0 + i;
      for (let c = 0; c < 3; c++) col[i * 3 + c] = toLin(G.color[k * 4 + c]);
      uv[i * 2] = G.misc[k * 3]; uv[i * 2 + 1] = G.misc[k * 3 + 1];
      let s = 0; for (let c = 0; c < 4; c++) s += G.skinWeight[k * 4 + c];
      for (let c = 0; c < 4; c++) { sw[i * 4 + c] = s ? G.skinWeight[k * 4 + c] / s : (c === 0 ? 1 : 0); si[i * 4 + c] = G.skinIndex[k * 4 + c]; }
    }
    // bake the ambient-occlusion term into the vertex colour
    for (let i = 0; i < n; i++) { const ao = 0.35 + 0.65 * G.misc[(v0 + i) * 3 + 2]; for (let c = 0; c < 3; c++) col[i * 3 + c] *= ao; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const idx = new Uint32Array(r.indexCount);
    for (let i = 0; i < r.indexCount; i++) idx[i] = G.index[r.indexStart + i] - v0;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    const isMuscle = r.kind === 'muscle';
    const mat = isMuscle ? muscleMat.clone() : plainMat;
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.bind(skeleton, new THREE.Matrix4());
    mesh.frustumCulled = false;
    const info = isMuscle ? model.muscles[r.id] : null;
    mesh.name = info ? `${info.name}${info.part ? ' (' + info.part + ')' : ''} ${info.side}` : r.kind;
    mesh.userData = { muscleId: r.id, kind: r.kind, muscle: info, baseMaterial: mat };
    group.add(mesh);
    meshes.push(mesh);
  }

  const bonesByName = Object.fromEntries(bones.map((b) => [b.name, b]));
  return {
    group, skeleton, bones: bonesByName, meshes, model,
    selectGroup(gid) {
      for (const m of meshes) {
        const mu = m.userData.muscle;
        if (!gid) { m.material = m.userData.baseMaterial; if (mu) m.material.emissive.setHex(0x000000); continue; }
        if (mu && mu.group === gid) { m.material = m.userData.baseMaterial; m.material.emissive.setHex(0x2a0402); }
        else m.material = m.userData.kind === 'plaster' ? m.userData.baseMaterial : ghostMat;
      }
    },
    setBoneRotation(name, axis, angle) {
      const b = bonesByName[name]; if (!b) return;
      b.quaternion.setFromAxisAngle(new THREE.Vector3(axis[0], axis[1], axis[2]).normalize(), angle);
    },
  };
}

window.Ecorche = { buildEcorche, createEcorcheViewer, GROUPS, MUSCLES, BONES, EXERCISES, EXERCISE_LIBRARY, EX_MOTIONS, makeExercise, PoseBuilder, EQUIPMENT, EQUIPMENT_CATEGORIES, toThree };
})();


/* Added for this app: marks the file as an ES module so it can be dynamically
   imported for its side effect of defining window.Ecorche. */
export {};
