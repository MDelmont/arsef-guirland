class Component extends Renderer {
  componentDidMount() {
    var self = this;
    this._h = function () {
      if (self._raf) return;
      self._raf = requestAnimationFrame(function () { self._raf = 0; self._measure(); });
    };
    window.addEventListener('scroll', this._h, { passive: true });
    document.addEventListener('scroll', this._h, true);
    window.addEventListener('resize', this._h);
    this._measure();
    this._t = setTimeout(this._h, 400);
  }
  componentWillUnmount() {
    window.removeEventListener('scroll', this._h);
    document.removeEventListener('scroll', this._h, true);
    window.removeEventListener('resize', this._h);
    clearTimeout(this._t);
    if (this._anim) cancelAnimationFrame(this._anim);
    document.body.style.overflow = '';
  }
  // ---------- Zoom : la caméra suit la guirlande ----------
  _vp() { return { w: window.innerWidth || 1200, h: window.innerHeight || 800 }; }
  _zFor(it) {
    var v = this._vp(), ph = it.pw / 0.86;
    return Math.min(v.h * 0.58 / ph, (v.w - 160) * 0.62 / it.pw, 6);
  }
  _pointAt(s) {
    var p = this._geo.pts, lo = 0, hi = p.length - 1;
    if (s <= p[0].s) return p[0];
    if (s >= p[hi].s) return p[hi];
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (p[mid].s < s) lo = mid; else hi = mid; }
    var k = (s - p[lo].s) / Math.max(1e-6, p[hi].s - p[lo].s);
    return { x: p[lo].x + k * (p[hi].x - p[lo].x), y: p[lo].y + k * (p[hi].y - p[lo].y) };
  }
  _tf(cam) {
    var v = this._vp(), p = this._pointAt(cam.s);
    return 'translate(' + (v.w / 2).toFixed(1) + 'px,' + (v.h / 2).toFixed(1) + 'px) scale(' + cam.z.toFixed(4) + ') translate(' + (-p.x).toFixed(2) + 'px,' + (-(p.y + cam.off)).toFixed(2) + 'px)';
  }
  _camFor(i) {
    var it = this._geo.items[i];
    return { s: it.s, z: this._zFor(it), off: it.pw / 0.86 * 0.45 };
  }
  _fly(to, dur) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) dur = 1;
    var self = this;
    if (this._anim) cancelAnimationFrame(this._anim);
    var from = this._cam || to;
    var t0 = performance.now();
    var dist = Math.abs(to.s - from.s);
    var dip = dist > 1 ? Math.min(0.28, dist / 1400) : 0;
    function step(now) {
      var t = Math.min(1, (now - t0) / dur);
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var cam = {
        s: from.s + (to.s - from.s) * e,
        z: (from.z + (to.z - from.z) * e) * (1 - dip * Math.sin(Math.PI * e)),
        off: from.off + (to.off - from.off) * e
      };
      self._cam = cam;
      var el = document.getElementById('scene');
      if (el) el.style.transform = self._tf(cam);
      if (t < 1) self._anim = requestAnimationFrame(step);
      else { self._anim = 0; self.setState({ cam: cam }); }
    }
    this._anim = requestAnimationFrame(step);
  }
  // Cale le balancement des fanions zoomés sur ceux de la page, pour une transition sans saut.
  _syncSwing() {
    try {
      var a = document.querySelectorAll('#guirlande .swing'), b = document.querySelectorAll('#scene .swing');
      for (var i = 0; i < Math.min(a.length, b.length); i++) {
        var pa = a[i].getAnimations ? a[i].getAnimations()[0] : null;
        var pb = b[i].getAnimations ? b[i].getAnimations()[0] : null;
        if (pa && pb && pa.startTime != null) pb.startTime = pa.startTime;
      }
    } catch (e) {}
  }
  _open(i) {
    var self = this, to = this._camFor(i);
    this._cam = { s: to.s, z: to.z * 0.35, off: to.off };
    document.body.style.overflow = 'hidden';
    this.setState({ zoom: true, idx: i, cam: this._cam });
    setTimeout(function () {
      self._syncSwing();
      self._fly(to, 700);
      var z = document.getElementById('zoom');
      if (z && z.focus) z.focus();
    }, 30);
  }
  _goTo(j) {
    var n = this._geo.items.length;
    if (j < 0 || j >= n || (this.state && this.state.closing)) return;
    var to = this._camFor(j);
    var dist = Math.abs(to.s - (this._cam ? this._cam.s : to.s));
    this.setState({ idx: j });
    this._fly(to, Math.max(650, Math.min(2200, 420 + dist * 1.8)));
  }
  _close() {
    var self = this;
    var st = this.state || {}, g = this._geo, el = document.getElementById('guirlande');
    if (st.closing) return;
    if (this._anim) cancelAnimationFrame(this._anim);
    this._anim = 0;
    var it = g && g.items[st.idx];
    var from = this._cam;
    if (!el || !it || !from) {
      document.body.style.overflow = '';
      this.setState({ zoom: false, closing: false });
      return;
    }
    // 1. Placer la page (sans animation) pour que le fanion soit à l'écran, derrière le zoom.
    var r0 = el.getBoundingClientRect();
    var y = window.scrollY + r0.top + (it.y / g.H) * r0.height - (window.innerHeight || 800) * 0.4;
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    this._measure();
    this._syncSwing();
    this.setState({ closing: true });
    // 2. Dézoomer la scène jusqu'à recouvrir exactement la guirlande de la page.
    var v = this._vp();
    var pFrom = this._pointAt(from.s);
    var ax = pFrom.x, ay = pFrom.y + from.off;
    var sx0 = v.w / 2, sy0 = v.h / 2;
    var t0 = performance.now(), dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 850;
    function step(now) {
      var r = el.getBoundingClientRect();
      var z1 = r.width / g.W;
      var sx1 = r.left + ax * z1, sy1 = r.top + ay * z1;
      var t = Math.min(1, (now - t0) / dur);
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var z = from.z * Math.pow(z1 / from.z, e);
      var sx = sx0 + (sx1 - sx0) * e, sy = sy0 + (sy1 - sy0) * e;
      var sc = document.getElementById('scene'), zm = document.getElementById('zoom');
      if (sc) sc.style.transform = 'translate(' + (sx - ax * z).toFixed(2) + 'px,' + (sy - ay * z).toFixed(2) + 'px) scale(' + z.toFixed(4) + ')';
      if (t < 1) { self._anim = requestAnimationFrame(step); return; }
      self._anim = 0;
      self._cam = null;
      document.body.style.overflow = '';
      self.setState({ zoom: false, closing: false, cam: null });
    }
    this._anim = requestAnimationFrame(step);
  }
  _measure() {
    var el = document.getElementById('guirlande');
    var g = this._geo;
    if (!el || !g) return;
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var yv = (vh * 0.72 - r.top) / Math.max(1, r.height) * g.H;
    var drawn = this._lenAt(g, yv);
    var narrow = el.clientWidth > 0 && el.clientWidth < 640;
    var st = this.state || {};
    if (Math.abs(drawn - (st.drawn || 0)) > 0.5 || narrow !== !!st.narrow) this.setState({ drawn: drawn, narrow: narrow });
  }
  _lenAt(g, yv) {
    var p = g.pts;
    if (yv <= p[0].vy) return 0;
    for (var i = 1; i < p.length; i++) {
      if (p[i].vy >= yv) {
        var k = (yv - p[i - 1].vy) / Math.max(1e-6, p[i].vy - p[i - 1].vy);
        return p[i - 1].s + k * (p[i].s - p[i - 1].s);
      }
    }
    return g.total;
  }
  _build(n, perRow) {
    var W = 1200, xL = 110, xR = 1090, top = 70, gap = 250, sag = 44, slope = 24;
    var rows = Math.ceil(n / perRow);
    var pts = [], items = [];
    var s = 0, last = null;
    function push(x, y, vy) {
      if (last) s += Math.hypot(x - last.x, y - last.y);
      last = { x: x, y: y, s: s, vy: vy };
      pts.push(last);
    }
    function q(a, b, c, t) { return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c; }
    function cub(a, b, c, d, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }
    // amorce
    for (var i = 0; i <= 12; i++) {
      var t0 = i / 12;
      push(cub(-10, 30, 60, xL, t0), cub(top - 60, top - 50, top - 10, top, t0), top - 1 + t0);
    }
    for (var r = 0; r < rows; r++) {
      var dir = r % 2 === 0 ? 1 : -1;
      var ys = top + r * gap, ye = ys + slope;
      var x0 = dir > 0 ? xL : xR, x1 = dir > 0 ? xR : xL;
      var cx = (xL + xR) / 2, cy = (ys + ye) / 2 + 2 * sag;
      var rowStart = pts.length, s0 = s;
      var N = 80;
      for (var j = 1; j <= N; j++) {
        var t = j / N;
        push(q(x0, cx, x1, t), q(ys, cy, ye, t), ys + t * gap * 0.8);
      }
      var rowPts = pts.slice(rowStart - 1);
      var rowLen = s - s0;
      var slot = (xR - xL) / perRow;
      var pw = slot * 0.9;
      for (var k = 0; k < perRow; k++) {
        var idx = r * perRow + k;
        if (idx >= n) break;
        var target = rowLen * (k + 0.5) / perRow;
        var m = 1;
        while (m < rowPts.length - 1 && rowPts[m].s - s0 < target) m++;
        var A = rowPts[m - 1], B = rowPts[m];
        var kk = (target - (A.s - s0)) / Math.max(1e-6, B.s - A.s);
        var x = A.x + kk * (B.x - A.x), y = A.y + kk * (B.y - A.y);
        var dx = B.x - A.x, dy = B.y - A.y;
        if (dx < 0) { dx = -dx; dy = -dy; }
        items.push({ x: x, y: y, a: Math.atan2(dy, dx) * 180 / Math.PI, s: s0 + target, pw: pw });
      }
      var ox = dir > 0 ? x1 + 80 : x1 - 80;
      var yb = top + (r + 1) * gap;
      if (r < rows - 1) {
        for (var jj = 1; jj <= 24; jj++) {
          var tt = jj / 24;
          push(cub(x1, ox, ox, x1, tt), cub(ye, ye + 20, yb - 20, yb, tt), ys + gap * 0.8 + tt * gap * 0.2);
        }
      } else {
        for (var je = 1; je <= 16; je++) {
          var te = je / 16;
          push(cub(x1, ox * 0.5 + x1 * 0.5, ox, ox, te), cub(ye, ye + 10, ye + 80, ye + 150, te), ys + gap * 0.8 + te * 40);
        }
      }
    }
    var H = Math.round(top + (rows - 1) * gap + slope + sag + ((xR - xL) / perRow) * 0.9 / 0.86 + 90);
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
    return { W: W, H: H, d: d, pts: pts, items: items, total: s };
  }
  renderVals() {
    // Remplir SCANS avec les URLs des fanions scannés, dans l'ordre (le 1er = premier fanion).
    var SCANS = this.files;
    var COULEURS = ['#E6327F','#F4C21A','#18A9D6','#F26B1D','#34A83F','#7A3FC2','#DE2A2E','#2167D6'];
    var POIS = 'radial-gradient(circle, rgba(255,255,255,0.92) 0 22%, transparent 25%)';
    var st = this.state || {};
    var n = SCANS.length;
    var perRow = st.narrow ? 4 : Math.max(2, this.props.perRow ?? 7);
    var key = n + ':' + perRow;
    if (!this._geo || this._geoKey !== key) { this._geo = this._build(n, perRow); this._geoKey = key; }
    var g = this._geo;
    var showAll = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var drawn = showAll ? g.total : (st.drawn || 0);
    var sway = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    var shown = 0;
    var self = this;
    var zOpen = !!st.zoom;
    var idx = st.idx || 0;
    var fanions = g.items.map(function (it, i) {
      var on = drawn >= it.s;
      if (on) shown++;
      var src = SCANS[i] || '';
      var dots = i % 3 === 2;
      return {
        num: String(i + 1).padStart(2, '0'),
        src: src, hasScan: !!src, noScan: !src,
        color: COULEURS[i % COULEURS.length],
        motif: dots ? POIS : 'none',
        motifSize: dots ? '24% 20%' : 'auto',
        left: (it.x / g.W * 100).toFixed(3) + '%',
        top: (it.y / g.H * 100).toFixed(3) + '%',
        width: (it.pw / g.W * 100).toFixed(3) + '%',
        op: on ? 1 : 0,
        tf: 'translateX(-50%) rotate(' + (on ? it.a : it.a - 22).toFixed(2) + 'deg) scale(' + (on ? 1 : 0.4) + ')',
        swingClass: sway ? 'swing on' : 'swing',
        delay: (-(i * 0.37) % 3.4).toFixed(2) + 's',
        tfOn: 'translateX(-50%) rotate(' + it.a.toFixed(2) + 'deg)',
        zOp: st.closing ? (on ? 1 : 0) : (i === idx ? 1 : 0.45),
        open: function () { self._open(i); },
        jump: function () { self._goTo(i); }
      };
    });
    var cam = this._cam || st.cam ||(g.items[idx] ? this._camFor(idx) : { s: 0, z: 1, off: 0 });
    return {
      zOpen: zOpen,
      showUi: !st.closing,
      sceneDash: st.closing ? g.total.toFixed(1) : 'none',
      sceneOff: st.closing ? Math.max(0, g.total - drawn).toFixed(1) : '0',
      zNum: String(idx + 1).padStart(2, '0'),
      zPos: idx + 1,
      atStart: idx <= 0,
      atEnd: idx >= g.items.length - 1,
      Hpx: g.H + 'px',
      stageTf: zOpen ? this._tf(cam) : 'none',
      prev: function () { self._goTo(idx - 1); },
      next: function () { self._goTo(idx + 1); },
      close: function () { self._close(); },
      onKey: function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); self._goTo(idx + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); self._goTo(idx - 1); }
        else if (e.key === 'Escape') { self._close(); }
      },
      onTouchStart: function (e) { self._tx = e.touches && e.touches[0] ? e.touches[0].clientX : null; },
      onTouchEnd: function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        if (self._tx == null || !t) return;
        var dx = t.clientX - self._tx;
        self._tx = null;
        if (Math.abs(dx) > 50) self._goTo(idx + (dx < 0 ? 1 : -1));
      },
      n: n, shown: shown, fanions: fanions,
      ratio: g.W + ' / ' + g.H,
      viewBox: '0 0 ' + g.W + ' ' + g.H,
      ropeD: g.d,
      total: g.total.toFixed(1),
      offset: Math.max(0, g.total - drawn).toFixed(1),
      rope: this.props.rope ?? '#A9784A'
    };
  }
}

start(Component);
