/* Lightweight 3D mannequin renderer (canvas 2D, no dependencies). */
(function () {
  var D2R = Math.PI / 180;
  var GF = (window.GF = window.GF || {});

  function rotY(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function rotX(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function add(a, b, k) { k = k === undefined ? 1 : k; return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  GF.lerp = function (a, b, t) { return a + (b - a) * t; };

  /* Pose (degrees) -> joints. a lean, h hip, k knee, s shoulder swing, e elbow, ab abduction,
     th body rotation about x, pf plantar flexion, lift extra heel lift (m). */
  GF.build = function (p) {
    var a = (p.a || 0) * D2R, h = (p.h || 0) * D2R, k = (p.k || 0) * D2R;
    var s = (p.s || 0) * D2R, e = (p.e || 0) * D2R, ab = (p.ab || 0) * D2R, pf = (p.pf || 0) * D2R;
    var J = {}, P = [0, 0, 0];
    var u = [0, Math.cos(a), Math.sin(a)];
    J.P = P; J.S = add(P, u, 0.48); J.head = add(J.S, u, 0.2); J.neck = add(J.S, u, 0.04);
    [-1, 1].forEach(function (sx) {
      var n = sx < 0 ? 'L' : 'R';
      var hip = [sx * 0.09, 0, 0];
      var dT = [0, -Math.cos(h), Math.sin(h)];
      var K = add(hip, dT, 0.44);
      var sa = h - k;
      var A = add(K, [0, -Math.cos(sa), Math.sin(sa)], 0.44);
      var phi = sa - pf;
      var toe = add(A, [0, Math.sin(phi), Math.cos(phi)], 0.14);
      var sh = add(add(J.S, u, -0.04), [sx * 0.21, 0, 0]);
      var d1 = [sx * Math.sin(ab), -Math.cos(ab) * Math.cos(s), Math.cos(ab) * Math.sin(s)];
      var E = add(sh, d1, 0.3);
      var s2 = s + e;
      var d2 = [sx * Math.sin(ab), -Math.cos(ab) * Math.cos(s2), Math.cos(ab) * Math.sin(s2)];
      var W = add(E, d2, 0.27);
      J['hip' + n] = hip; J['knee' + n] = K; J['ank' + n] = A; J['toe' + n] = toe;
      J['sh' + n] = sh; J['el' + n] = E; J['wr' + n] = W; J['hand' + n] = add(W, d2, 0.06);
    });
    var th = (p.th || 0) * D2R;
    if (th) for (var key in J) J[key] = rotX(J[key], th);
    // grounding
    var lowest;
    if (p.ground === 'min') {
      lowest = 9;
      for (var q in J) lowest = Math.min(lowest, J[q][1] - (q === 'head' ? 0.1 : 0.06));
      lowest += 0.0;
    } else {
      lowest = Math.min(J.ankL[1], J.ankR[1], J.toeL[1], J.toeR[1]) - 0.03;
    }
    var dy = -lowest + (p.lift || 0);
    var dz = p.anchor === 'pelvis' ? 0 : -(J.ankL[2] + J.ankR[2]) / 2;
    for (var j in J) J[j] = [J[j][0], J[j][1] + dy, J[j][2] + dz];
    J.u = rotX(u, th);
    return J;
  };

  /* muscle regions: seg, t along, f front offset, x lateral offset, r radius, nz facing */
  GF.MUSCLES = [
    { id: 'chest', name: 'Chest', blobs: [{ seg: 'torso', t: 0.26, x: 0.085, f: 0.1, r: 0.085, nz: 1, mirror: 1 }] },
    { id: 'shoulders', name: 'Shoulders', blobs: [{ seg: 'uarm', t: 0.04, x: 0.025, f: 0, r: 0.075, nz: 0, mirror: 1 }] },
    { id: 'biceps', name: 'Biceps', blobs: [{ seg: 'uarm', t: 0.55, x: 0, f: 0.045, r: 0.05, nz: 1, mirror: 1 }] },
    { id: 'triceps', name: 'Triceps', blobs: [{ seg: 'uarm', t: 0.55, x: 0, f: -0.045, r: 0.05, nz: -1, mirror: 1 }] },
    { id: 'forearms', name: 'Forearms', blobs: [{ seg: 'farm', t: 0.4, x: 0, f: 0, r: 0.046, nz: 0, mirror: 1 }] },
    { id: 'abs', name: 'Abs', blobs: [{ seg: 'torso', t: 0.6, x: 0, f: 0.1, r: 0.075, nz: 1 }, { seg: 'torso', t: 0.84, x: 0, f: 0.095, r: 0.07, nz: 1 }] },
    { id: 'obliques', name: 'Obliques', blobs: [{ seg: 'torso', t: 0.58, x: 0.115, f: 0.02, r: 0.065, nz: 0, mirror: 1 }] },
    { id: 'traps', name: 'Traps', blobs: [{ seg: 'torso', t: 0.04, x: 0.07, f: -0.07, r: 0.065, nz: -1, mirror: 1 }] },
    { id: 'midback', name: 'Middle back', blobs: [{ seg: 'torso', t: 0.22, x: 0.075, f: -0.085, r: 0.07, nz: -1, mirror: 1 }] },
    { id: 'lats', name: 'Lats', blobs: [{ seg: 'torso', t: 0.4, x: 0.1, f: -0.09, r: 0.09, nz: -1, mirror: 1 }] },
    { id: 'lowback', name: 'Lower back', blobs: [{ seg: 'torso', t: 0.8, x: 0.05, f: -0.1, r: 0.06, nz: -1, mirror: 1 }] },
    { id: 'glutes', name: 'Glutes', blobs: [{ seg: 'torso', t: 1.0, x: 0.09, f: -0.1, r: 0.09, nz: -1, mirror: 1 }] },
    { id: 'adductors', name: 'Adductors', blobs: [{ seg: 'thigh', t: 0.3, x: -0.028, f: 0.05, r: 0.055, nz: 1, mirror: 1 }] },
    { id: 'quads', name: 'Quads', blobs: [{ seg: 'thigh', t: 0.4, x: 0, f: 0.068, r: 0.077, nz: 1, mirror: 1 }, { seg: 'thigh', t: 0.76, x: 0, f: 0.058, r: 0.065, nz: 1, mirror: 1 }] },
    { id: 'hamstrings', name: 'Hamstrings', blobs: [{ seg: 'thigh', t: 0.4, x: 0, f: -0.068, r: 0.077, nz: -1, mirror: 1 }, { seg: 'thigh', t: 0.76, x: 0, f: -0.058, r: 0.065, nz: -1, mirror: 1 }] },
    { id: 'calves', name: 'Calves', blobs: [{ seg: 'shin', t: 0.3, x: 0, f: -0.046, r: 0.06, nz: -1, mirror: 1 }] }
  ];

  function segment(J, seg, side) {
    var n = side < 0 ? 'L' : 'R';
    if (seg === 'torso') return [J.S, J.P, 0, J.u];
    if (seg === 'uarm') return [J['sh' + n], J['el' + n]];
    if (seg === 'farm') return [J['el' + n], J['wr' + n]];
    if (seg === 'thigh') return [add(J.P, [side * 0.09, 0, 0]), J['knee' + n]];
    return [J['knee' + n], J['ank' + n]];
  }
  GF.blobsFor = function (J, ids) {
    var out = [];
    GF.MUSCLES.forEach(function (m) {
      if (ids && ids.indexOf(m.id) < 0) return;
      m.blobs.forEach(function (b) {
        (b.mirror ? [-1, 1] : [0]).forEach(function (sd) {
          var side = sd || 1;
          var sg = segment(J, b.seg, side), A = sg[0], B = sg[1];
          var d = norm(sub(B, A));
          var sideAx = [1, 0, 0];
          var front = norm(cross(d, sideAx));
          if (b.seg === 'torso') { sideAx = norm(cross(J.u, [0, 0, 1])); sideAx = [1, 0, 0]; front = norm(cross(d, sideAx)); }
          var c = add(A, sub(B, A), b.t);
          c = add(c, front, b.f);
          c = add(c, sideAx, (b.x || 0) * (sd || 1));
          var nrm = norm(add(front, sideAx, (sd || 0) * 0.0));
          if (b.nz === 0) nrm = [sd || 1, 0, 0];
          else nrm = [front[0] * b.nz * Math.sign(b.f || 1) * (b.f < 0 ? -1 : 1), front[1] * b.nz * (b.f < 0 ? -1 : 1), front[2] * b.nz * (b.f < 0 ? -1 : 1)];
          out.push({ id: m.id, c: c, r: b.r, n: b.nz === 0 ? [sd || 1, 0, 0] : (b.f < 0 ? [-front[0], -front[1], -front[2]] : front) });
        });
      });
    });
    return out;
  };

  /* ---------- renderer ---------- */
  var BODY = { base: '#C3CEE0', shade: '#9FAEC8', hi: '#EEF2FA' };

  function View(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.yaw = 0.5; this.pitch = 0.12; this.W = 0; this.H = 0; this.dpr = 1;
    this.focusY = 0.95; this.zoom = 1;
  }
  View.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (this.cv.width !== w * dpr || this.cv.height !== h * dpr) { this.cv.width = w * dpr; this.cv.height = h * dpr; }
    this.W = w; this.H = h; this.dpr = dpr;
  };
  View.prototype.proj = function (p) {
    var q = [p[0], p[1] - this.focusY, p[2]];
    var r = rotX(rotY(q, this.yaw), this.pitch);
    var S = this.H * 0.47 * this.zoom, k = 4 / (4 - r[2]);
    return { x: this.W / 2 + r[0] * S * k, y: this.H / 2 - r[1] * S * k, z: r[2], k: k, S: S };
  };
  View.prototype.rotN = function (n) { return rotX(rotY(n, this.yaw), this.pitch); };

  GF.drawFigure = function (view, J, opt) {
    var ctx = view.ctx; opt = opt || {};
    var C = opt.colors || {};
    var brand = C.brand || '#0C66E4';
    var items = [];
    function cap(a, b, r, col) { var pa = view.proj(a), pb = view.proj(b); items.push({ z: (pa.z + pb.z) / 2, t: 'c', pa: pa, pb: pb, r: r, col: col || BODY }); }
    function sph(c, r, col) { var p = view.proj(c); items.push({ z: p.z, t: 's', p: p, r: r, col: col || BODY }); }
    var Sx = function (sx) { return [sx * 0.075, 0, 0]; };
    // torso (two columns), shoulders, neck, head
    cap(add(J.S, Sx(-1)), add(J.P, Sx(-1)), 0.1); cap(add(J.S, Sx(1)), add(J.P, Sx(1)), 0.1);
    cap(add(J.P, Sx(-1)), add(J.P, Sx(1)), 0.1);
    cap(J.shL, J.shR, 0.062);
    cap(J.neck, add(J.head, norm(sub(J.head, J.neck)), -0.03), 0.04);
    sph(J.head, 0.105);
    ['L', 'R'].forEach(function (n) {
      cap(J['sh' + n], J['el' + n], 0.05); cap(J['el' + n], J['wr' + n], 0.042); sph(J['hand' + n], 0.04);
      cap(add(J.P, [n === 'L' ? -0.09 : 0.09, 0, 0]), J['knee' + n], 0.074); cap(J['knee' + n], J['ank' + n], 0.056);
      cap(J['ank' + n], J['toe' + n], 0.034);
    });
    // equipment
    (opt.extra || []).forEach(function (x) {
      if (x.k === 'cap') cap(x.a, x.b, x.r, x.col); else sph(x.c, x.r, x.col);
    });
    // muscle blobs
    var hits = [];
    var blobs = GF.blobsFor(J, opt.ids);
    blobs.forEach(function (b) {
      var nr = view.rotN(b.n);
      if (nr[2] < -0.25) return;
      var p = view.proj(add(b.c, b.n, 0.012));
      var on = opt.selected && opt.selected.indexOf(b.id) >= 0;
      if (opt.only && !on) return;
      items.push({ z: p.z + 0.02, t: 'b', p: p, r: b.r, on: on, id: b.id, vis: nr[2] });
      hits.push({ id: b.id, x: p.x, y: p.y, rad: b.r * p.S * p.k, z: p.z });
    });
    items.sort(function (a, b) { return a.z - b.z; });
    ctx.save(); ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.W, view.H);
    // floor
    var fc = view.proj([0, 0, 0]);
    ctx.beginPath(); ctx.ellipse(fc.x, fc.y, view.H * 0.2 * view.zoom, view.H * 0.2 * view.zoom * Math.sin(Math.abs(view.pitch) + 0.28) * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.floor || 'rgba(23,43,77,0.05)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = C.floorLine || 'rgba(23,43,77,0.14)'; ctx.stroke();
    ctx.lineCap = 'round';
    items.forEach(function (it) {
      if (it.t === 'c') {
        var w = it.r * 2 * it.pa.S * (it.pa.k + it.pb.k) / 2;
        ctx.strokeStyle = it.col.shade; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(it.pa.x, it.pa.y); ctx.lineTo(it.pb.x, it.pb.y); ctx.stroke();
        ctx.strokeStyle = it.col.base; ctx.lineWidth = w * 0.78;
        ctx.beginPath(); ctx.moveTo(it.pa.x - w * 0.06, it.pa.y - w * 0.06); ctx.lineTo(it.pb.x - w * 0.06, it.pb.y - w * 0.06); ctx.stroke();
        ctx.strokeStyle = it.col.hi; ctx.lineWidth = w * 0.26; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(it.pa.x - w * 0.2, it.pa.y - w * 0.12); ctx.lineTo(it.pb.x - w * 0.2, it.pb.y - w * 0.12); ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        var rad = it.r * it.p.S * it.p.k;
        if (it.t === 's') {
          var g = ctx.createRadialGradient(it.p.x - rad * 0.35, it.p.y - rad * 0.4, rad * 0.1, it.p.x, it.p.y, rad);
          g.addColorStop(0, it.col.hi); g.addColorStop(0.55, it.col.base); g.addColorStop(1, it.col.shade);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(it.p.x, it.p.y, rad, 0, 7); ctx.fill();
        } else {
          var fade = Math.max(0.35, Math.min(1, it.vis + 0.6));
          if (it.on) {
            var g2 = ctx.createRadialGradient(it.p.x - rad * 0.3, it.p.y - rad * 0.35, rad * 0.1, it.p.x, it.p.y, rad);
            g2.addColorStop(0, C.brandHi || '#579DFF'); g2.addColorStop(1, brand);
            ctx.globalAlpha = 0.95 * fade; ctx.fillStyle = g2;
            ctx.beginPath(); ctx.arc(it.p.x, it.p.y, rad, 0, 7); ctx.fill();
            ctx.globalAlpha = 1;
          } else if (!opt.noIdle) {
            ctx.globalAlpha = fade; ctx.fillStyle = 'rgba(12,102,228,0.07)'; ctx.strokeStyle = 'rgba(12,102,228,0.28)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(it.p.x, it.p.y, rad, 0, 7); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
          }
        }
      }
    });
    ctx.restore();
    return hits;
  };

  /* ---------- anatomy mount: drag to rotate, tap to toggle ---------- */
  GF.mountAnatomy = function (cv) {
    var view = new View(cv), st = { selected: [], drag: null, auto: true, hits: [], idle: 0 };
    var J = GF.build({ ab: 14, e: 6, a: 0 });
    var ctl = { selected: [], onToggle: null, view: view, setSelected: function (a) { st.selected = a.slice(); }, face: function (back) { st.target = back ? Math.PI : 0.0; st.auto = false; } };
    cv.style.touchAction = 'pan-y';
    cv.addEventListener('pointerdown', function (e) { st.drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, moved: false }; st.auto = false; st.target = null; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) {
      if (!st.drag) return; var dx = e.clientX - st.drag.x;
      if (Math.abs(dx) > 5) st.drag.moved = true;
      if (st.drag.moved) view.yaw = st.drag.yaw + dx * 0.012;
    });
    cv.addEventListener('pointerup', function (e) {
      var d = st.drag; st.drag = null; if (!d) return;
      if (!d.moved) {
        var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null;
        st.hits.forEach(function (h) { var dd = Math.hypot(h.x - x, h.y - y); if (dd <= h.rad + 6 && (!best || h.z > best.z)) best = h; });
        if (best && ctl.onToggle) ctl.onToggle(best.id);
      }
    });
    function frame() {
      if (!cv.isConnected) return;
      view.resize();
      if (st.target != null) { var dd = Math.atan2(Math.sin(st.target - view.yaw), Math.cos(st.target - view.yaw)); view.yaw += dd * 0.14; if (Math.abs(dd) < 0.01) st.target = null; }
      else if (!st.drag && st.auto) view.yaw += 0.006;
      st.hits = GF.drawFigure(view, J, { selected: st.selected, colors: ctl.colors });
      requestAnimationFrame(frame);
    }
    ctl.colors = null; frame();
    return ctl;
  };
  GF.View = View;
})();

/* Added for this app: the file is otherwise byte-identical to the Atlas artifact.
   This marks it as an ES module so it can be dynamically imported for its side
   effect of defining window.GF. */
export {};
