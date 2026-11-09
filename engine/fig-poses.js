/* Exercise animation templates + player. Each template: start pose A, end pose B (degrees). */
(function () {
  var GF = (window.GF = window.GF || {});
  var T = {
    squat: { A: { s: 85, e: 5 }, B: { a: 38, h: 92, k: 105, s: 85, e: 5 }, eq: 'none' },
    gobletsquat: { A: { s: 20, e: 135 }, B: { a: 30, h: 92, k: 105, s: 20, e: 135 }, eq: 'kb' },
    deadlift: { A: { a: 62, h: 62, k: 58, s: 0 }, B: { a: 0, h: 0, k: 0, s: 0 }, eq: 'bar' },
    row: { A: { a: 66, h: 56, k: 28, s: 0, e: 0 }, B: { a: 66, h: 56, k: 28, s: -55, e: 85 }, eq: 'db' },
    curl: { A: { s: 4, e: 4 }, B: { s: 10, e: 140 }, eq: 'db' },
    press: { A: { s: 15, e: 150, ab: 12 }, B: { s: 172, e: 4, ab: 8 }, eq: 'db' },
    lateral: { A: { s: 0, e: 12, ab: 4 }, B: { s: 0, e: 12, ab: 82 }, eq: 'db' },
    triext: { A: { s: 172, e: 150 }, B: { s: 172, e: 6 }, eq: 'db' },
    pushup: { A: { th: 74, s: 88, e: 0, ground: 'min', anchor: 'feet' }, B: { th: 84, s: 22, e: 68, ground: 'min', anchor: 'feet' }, eq: 'none' },
    plank: { A: { th: 80, s: 88, e: 2, ground: 'min' }, B: { th: 81, s: 88, e: 2, ground: 'min' }, eq: 'none' },
    bench: { A: { th: -90, h: 0, k: 90, s: 88, e: 0, ground: 'feet', anchor: 'pelvis', _h: -90 }, B: { th: -90, h: 0, k: 90, s: 70, e: 90 }, eq: 'bar', bench: 1 },
    crunch: { A: { th: -90, a: -5, h: 70, k: 105, s: 60, e: 120, ground: 'min', anchor: 'pelvis' }, B: { th: -90, a: 38, h: 70, k: 105, s: 60, e: 120, ground: 'min', anchor: 'pelvis' }, eq: 'none' },
    bridge: { A: { th: -90, h: 70, k: 105, s: 0, ground: 'feet', anchor: 'pelvis' }, B: { th: -128, h: 0, k: 100, s: 0, ground: 'feet', anchor: 'pelvis' }, eq: 'none' },
    calf: { A: { s: 4, pf: 0, lift: 0 }, B: { s: 4, pf: 40, lift: 0.1 }, eq: 'none' }
  };
  GF.ANIMS = T;
  var DEF = { a: 0, h: 0, k: 0, s: 0, e: 0, ab: 0, th: 0, pf: 0, lift: 0 };
  var BC = { base: '#7A8CA8', shade: '#5B6C88', hi: '#C9D4E6' };
  var BENCHC = { base: '#DDE3EE', shade: '#B9C3D6', hi: '#F7F9FC' };

  function mix(A, B, u, tpl) {
    var o = {}, k;
    for (k in DEF) o[k] = GF.lerp(A[k] === undefined ? DEF[k] : A[k], B[k] === undefined ? DEF[k] : B[k], u);
    o.ground = B.ground || A.ground || 'feet'; o.anchor = B.anchor || A.anchor || 'feet';
    return o;
  }

  GF.mountExercise = function (cv) {
    var view = new GF.View(cv);
    var ctl = { anim: 'squat', primary: [], colors: null, rate: 1, setAnim: function (a, prim) { ctl.anim = a; ctl.primary = prim || []; } };
    var st = { drag: null, t0: performance.now(), off: 0 };
    view.yaw = 0.75; view.pitch = 0.1;
    cv.style.touchAction = 'pan-y';
    cv.addEventListener('pointerdown', function (e) { st.drag = { x: e.clientX, yaw: view.yaw }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) { if (st.drag) view.yaw = st.drag.yaw + (e.clientX - st.drag.x) * 0.012; });
    cv.addEventListener('pointerup', function () { st.drag = null; });
    function frame(now) {
      if (!cv.isConnected) return;
      view.resize();
      var tpl = T[ctl.anim] || T.squat;
      var ph = ((now - st.t0) / 1000) / (tpl === T.plank ? 3.2 : 2.8);
      var u = 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
      u = Math.max(0, Math.min(1, (u - 0.08) / 0.84));
      var pose = mix(tpl.A, tpl.B, u, tpl);
      var J = GF.build(pose);
      var wantY = Math.abs(pose.th) > 30 ? 0.38 : 0.92;
      view.focusY += (wantY - view.focusY) * 0.2;
      var extra = [];
      var hl = J.handL, hr = J.handR;
      if (tpl.eq === 'db') [hl, hr].forEach(function (h) {
        extra.push({ k: 'cap', a: [h[0] - 0.05, h[1], h[2]], b: [h[0] + 0.05, h[1], h[2]], r: 0.016, col: BC });
        extra.push({ k: 's', c: [h[0] - 0.06, h[1], h[2]], r: 0.04, col: BC }); extra.push({ k: 's', c: [h[0] + 0.06, h[1], h[2]], r: 0.04, col: BC });
      });
      if (tpl.eq === 'bar') {
        var m = [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2, (hl[2] + hr[2]) / 2];
        extra.push({ k: 'cap', a: [m[0] - 0.5, m[1], m[2]], b: [m[0] + 0.5, m[1], m[2]], r: 0.013, col: BC });
        [-0.42, 0.42].forEach(function (x) { extra.push({ k: 's', c: [m[0] + x, m[1], m[2]], r: 0.1, col: BC }); });
      }
      if (tpl.eq === 'kb') {
        var c = [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 0.02, (hl[2] + hr[2]) / 2 + 0.03];
        extra.push({ k: 's', c: c, r: 0.075, col: BC });
      }
      if (tpl.bench) {
        var y = J.P[1] - 0.15;
        extra.push({ k: 'cap', a: [0, y, J.P[2] - 0.62], b: [0, y, J.P[2] + 0.28], r: 0.055, col: BENCHC });
        [-0.5, 0.2].forEach(function (z) { extra.push({ k: 'cap', a: [0, y, J.P[2] + z], b: [0, 0.03, J.P[2] + z], r: 0.025, col: BENCHC }); });
      }
      GF.drawFigure(view, J, { selected: ctl.primary, only: true, colors: ctl.colors, extra: extra });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return ctl;
  };

  /* mount every unmounted canvas[data-gf] under root */
  GF.scan = function (root, cfg) {
    root = root || document;
    var list = root.querySelectorAll('canvas[data-gf]');
    for (var i = 0; i < list.length; i++) {
      var cv = list[i];
      if (!cv._gf) {
        cv._gf = cv.getAttribute('data-gf') === 'anatomy' ? GF.mountAnatomy(cv) : GF.mountExercise(cv);
        if (cfg && cfg.colors) cv._gf.colors = cfg.colors;
      }
    }
  };
})();

/* Added for this app: the file is otherwise byte-identical to the Atlas artifact.
   This marks it as an ES module so it can be dynamically imported for its side
   effect of defining window.GF. */
export {};
