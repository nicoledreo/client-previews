/* parts/home.js — homepage behaviour: the split-flap menu board, the dealt hand of learn cards (a fan on wide screens,
   a swipe deck on phones). The deal stubs flip through the shared [data-flip] hook. Static under reduced motion. */
(function () {
  'use strict';
  var doc = document;
  if (!doc.body || !doc.body.classList.contains('page-home')) return;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(hover: hover) and (pointer: fine)');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var canAnimate = typeof Element !== 'undefined' && !!Element.prototype.animate;

  /* ---------- split-flap menu board ---------- */
  (function () {
    var strip = $('[data-flapstrip]'); if (!strip || reduce || !canAnimate) return;
    var board = $('[data-flapboard]', strip), holder = $('.flapstrip__in', strip);
    var phrases = $$('.flapstrip__list li', strip).map(function (li) { return li.textContent.trim().toUpperCase(); }).filter(Boolean);
    if (!board || !holder || !phrases.length) return;
    var DRUM = 'ABCDEFGHIJKLMNOPRSTUVWY0123456789';
    var cols = 0, rows = 0, cells = [], idx = -1, timer = 0, busy = false, inView = false, first = true;

    function lines(p, n) { var out = [], cur = ''; p.split(/\s+/).forEach(function (w) { if (!cur) cur = w; else if ((cur + ' ' + w).length <= n) cur += ' ' + w; else { out.push(cur); cur = w; } }); if (cur) out.push(cur); return out; }
    function frame(p) {
      var ls = lines(p, cols).slice(0, rows), top = Math.floor((rows - ls.length) / 2), out = [];
      for (var r = 0; r < rows; r++) {
        var l = (ls[r - top] || '').slice(0, cols), left = Math.floor((cols - l.length) / 2);
        for (var c = 0; c < cols; c++) { var ch = l.charAt(c - left); out.push(c >= left && ch ? ch : ' '); }
      }
      return out;
    }
    function half(cls) { var h = doc.createElement('span'); h.className = 'flap__h ' + cls; h.appendChild(doc.createElement('span')); return h; }
    function show(c, ch) { var t = ch === ' ' ? '' : ch; c.t.textContent = t; c.b.textContent = t; c.ft.textContent = t; c.fb.textContent = t; c.cur = ch; }
    function build() {
      var w = holder.clientWidth, two = w < 900, nc = two ? 13 : 25, nr = two ? 2 : 1, gap = w < 520 ? 4 : 6, pad = w < 520 ? 18 : 26;
      var cw = Math.max(16, Math.min(two ? 38 : 46, Math.floor((w - pad - gap * (nc - 1)) / nc)));
      board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--chh', Math.round(cw * 1.38) + 'px');
      board.style.setProperty('--fg', gap + 'px'); board.style.setProperty('--rg', gap + 'px');
      if (nc === cols && nr === rows) return;
      cols = nc; rows = nr; cells = []; board.textContent = '';
      for (var r = 0; r < rows; r++) {
        var row = doc.createElement('div'); row.className = 'flaprow';
        for (var c = 0; c < cols; c++) {
          var el = doc.createElement('span'), t = half('flap__t'), b = half('flap__b'), ft = half('flap__ft'), fb = half('flap__fb');
          el.className = 'flap'; el.appendChild(t); el.appendChild(b); el.appendChild(ft); el.appendChild(fb); row.appendChild(el);
          cells.push({ t: t.firstChild, b: b.firstChild, ft: ft.firstChild, fb: fb.firstChild, ftH: ft, fbH: fb, cur: ' ' });
        }
        board.appendChild(row);
      }
      if (idx < 0) idx = 0; var f = frame(phrases[idx]); cells.forEach(function (c, i) { show(c, f[i]); });
      strip.classList.add('is-live');
    }
    function flipOnce(c, to, dur) {
      return new Promise(function (res) {
        var t = to === ' ' ? '' : to;
        c.t.textContent = t; c.fb.textContent = t;
        var a1 = c.ftH.animate([{ transform: 'rotateX(0deg)', filter: 'brightness(1)' }, { transform: 'rotateX(-90deg)', filter: 'brightness(.42)' }], { duration: dur * 0.5, easing: 'cubic-bezier(.55,0,.9,.45)', fill: 'forwards' });
        var a2 = c.fbH.animate([{ transform: 'rotateX(90deg)', filter: 'brightness(1.7)' }, { transform: 'rotateX(0deg)', filter: 'brightness(1)' }], { duration: dur * 0.5, delay: dur * 0.5, easing: 'cubic-bezier(.25,.9,.35,1.3)', fill: 'forwards' });
        a2.onfinish = function () { c.b.textContent = t; c.ft.textContent = t; c.cur = to; a1.cancel(); a2.cancel(); res(); };
        a2.oncancel = function () { res(); };
      });
    }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function roll(c, to, steps) {
      var p = Promise.resolve();
      for (var i = 0; i < steps; i++) p = p.then(function () { return flipOnce(c, DRUM.charAt(Math.floor(Math.random() * DRUM.length)), 78); });
      return p.then(function () { return flipOnce(c, to, 180); });
    }
    function next() {
      if (busy || !inView || doc.hidden) return;
      first = false; busy = true; idx = (idx + 1) % phrases.length;
      var f = frame(phrases[idx]), jobs = [];
      cells.forEach(function (c, i) {
        var to = f[i]; if (to === c.cur) return;
        var steps = (to === ' ' || c.cur === ' ') ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4);
        jobs.push(wait((i % cols) * 26 + Math.floor(i / cols) * 90).then(function () { return roll(c, to, steps); }));
      });
      Promise.all(jobs).then(function () { busy = false; schedule(); });
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(next, first ? 450 : 2700); }
    build();
    var rt = 0; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (!busy) build(); }, 200); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView && !busy) schedule(); }, { threshold: 0.2 }).observe(strip);
    else { inView = true; schedule(); }
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && inView && !busy) schedule(); });
  })();

  /* ---------- the hand: dealt onto the felt, lift + flip on hover/focus, tap to flip, swipe deck on phones ---------- */
  (function () {
    var hand = $('[data-hand]'); if (!hand) return;
    var cards = $$('[data-hcard]', hand), dots = $$('.hand__dots span');
    var isDeck = function () { return window.innerWidth < 700; };
    function deal() {
      if (hand.classList.contains('is-dealt')) return;
      if (reduce) { hand.classList.add('is-dealt'); return; }
      hand.classList.add('is-dealing', 'is-dealt');
      setTimeout(function () { hand.classList.remove('is-dealing'); }, cards.length * 125 + 1150);
    }
    if (reduce || !('IntersectionObserver' in window)) deal();
    else {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { deal(); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(hand);
      // a fast fling can skip the observer: when scrolling settles, a hand at or above the viewport is dealt
      var sweep = function () { if (hand.getBoundingClientRect().top < window.innerHeight * 0.92) { deal(); io.disconnect(); } };
      var st = 0; window.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(sweep, 140); }, { passive: true });
      window.addEventListener('load', function () { setTimeout(sweep, 3000); });
      window.addEventListener('hashchange', function () { setTimeout(sweep, 60); });
    }
    function setHot(k) { cards.forEach(function (c, i) { c.classList.toggle('is-hot', i === k); c.style.setProperty('--push', k < 0 || i === k ? '0' : (i < k ? '-1' : '1')); }); }
    // hover is decided by the pointer's x against the cards' resting centres, so a lifted card never runs from the pointer
    if (fine && !reduce) {
      hand.addEventListener('pointermove', function (e) {
        if (isDeck() || !hand.classList.contains('is-dealt') || hand.classList.contains('is-dealing')) return;
        var r = hand.getBoundingClientRect(), w = cards[0].offsetWidth, fan = parseFloat(getComputedStyle(hand).getPropertyValue('--fan')) || 0.64;
        var step = w * fan, mid = r.left + r.width / 2, best = -1, bd = 1e9;
        cards.forEach(function (c, i) { var cx = mid + (i - (cards.length - 1) / 2) * step, d = Math.abs(e.clientX - cx); if (d < bd) { bd = d; best = i; } });
        setHot(bd <= Math.max(step * 0.55, w * 0.5) ? best : -1);
      });
      hand.addEventListener('pointerleave', function () { setHot(-1); });
    }
    cards.forEach(function (c) {
      c.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        if (fine && !isDeck()) return;
        var on = !c.classList.contains('is-turned');
        cards.forEach(function (o) { o.classList.remove('is-turned'); });
        c.classList.toggle('is-turned', on);
      });
    });
    if ('IntersectionObserver' in window) {
      var dio = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!isDeck()) return;
          var k = cards.indexOf(en.target);
          if (en.intersectionRatio >= 0.6) { cards.forEach(function (c, i) { c.classList.toggle('is-active', i === k); }); dots.forEach(function (d, i) { d.classList.toggle('is-on', i === k); }); }
          else en.target.classList.remove('is-turned');
        });
      }, { root: hand, threshold: [0.3, 0.6] });
      cards.forEach(function (c) { dio.observe(c); });
    }
  })();
})();
