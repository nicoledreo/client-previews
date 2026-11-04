/* parts/hero-inner.js — the inner-page hero (HERO). The entrance (blinds opening, light switching on, the plate being
   dealt) is pure CSS and needs no script. This adds the life on top: --ph-s (0..1) as the hero scrolls away, so the
   blinds close and the photo drifts; and, on fine pointers only, the slats nearest the pointer open a little wider
   (a hand parting the blinds). rAF-throttled, only while the hero is on screen, and a no-op under reduced motion. */
(function () {
  'use strict';
  var hero = document.querySelector('[data-ph]');
  if (!hero) return;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };
  if (mq('(prefers-reduced-motion: reduce)')) return;
  var fine = mq('(hover: hover) and (pointer: fine)');
  var media = hero.querySelector('.ph__media');
  var slats = Array.prototype.slice.call(hero.querySelectorAll('.ph__slat'));
  var n = slats.length;
  var peekT = [], peekN = [];
  for (var k = 0; k < n; k++) { peekT.push(0); peekN.push(0); }
  var sT = 0, sN = 0, raf = 0, onScreen = true;

  function frame() {
    raf = 0;
    var moving = false;
    sN += (sT - sN) * 0.18;
    if (Math.abs(sT - sN) < 0.0008) sN = sT; else moving = true;
    hero.style.setProperty('--ph-s', sN.toFixed(4));
    for (var i = 0; i < n; i++) {
      var d = peekT[i] - peekN[i];
      if (Math.abs(d) < 0.002) peekN[i] = peekT[i]; else { peekN[i] += d * 0.14; moving = true; }
      slats[i].style.setProperty('--peek', peekN[i].toFixed(3));
    }
    if (moving) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function readScroll() {
    var r = hero.getBoundingClientRect();
    var p = r.height > 0 ? -r.top / r.height : 0;
    sT = p < 0 ? 0 : p > 1 ? 1 : p;
    kick();
  }
  var sTick = false;
  window.addEventListener('scroll', function () {
    if (!onScreen || sTick) return;
    sTick = true;
    requestAnimationFrame(function () { sTick = false; readScroll(); });
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) readScroll(); }, { rootMargin: '80px 0px' }).observe(hero);
  }
  readScroll();

  if (fine && n && media) {
    // the slats live in a rotated rig that overhangs the media box: measure each slat's centre once (relative to the
    // media box) and follow its tilted centre line to the pointer's x; re-measure after a resize
    var pTick = false, lastX = 0, lastY = 0, geo = null, tan = 0, sigma = 60;
    var measure = function () {
      var m = media.getBoundingClientRect();
      var cs = getComputedStyle(hero);
      tan = Math.tan((parseFloat(cs.getPropertyValue('--tilt')) || 0) * Math.PI / 180);
      sigma = Math.max((parseFloat(cs.getPropertyValue('--pitch')) || 56) * 1.6, 60);
      geo = slats.map(function (s) { var r = s.getBoundingClientRect(); return { x: (r.left + r.right) / 2 - m.left, y: (r.top + r.bottom) / 2 - m.top }; });
    };
    window.addEventListener('resize', function () { geo = null; }, { passive: true });
    var aim = function () {
      pTick = false;
      var m = media.getBoundingClientRect();
      if (!m.height) return;
      if (!geo) measure();
      var x = lastX - m.left, y = lastY - m.top;
      for (var i = 0; i < n; i++) { var c = geo[i].y + (x - geo[i].x) * tan; var z = (c - y) / sigma; peekT[i] = Math.exp(-z * z); }
      kick();
    };
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      lastX = e.clientX; lastY = e.clientY;
      if (!pTick) { pTick = true; requestAnimationFrame(aim); }
    });
    hero.addEventListener('pointerleave', function () { for (var i = 0; i < n; i++) peekT[i] = 0; kick(); });
  }
})();
