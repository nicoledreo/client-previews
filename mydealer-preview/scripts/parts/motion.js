/* parts/motion.js — SIGNATURE motion layer: neon switch-on headlines ([data-words]), entrances ([data-reveal]
   shadow / develop / deal, [data-develop]) with a scroll-settle sweep, scroll parallax ([data-depth]) and the hold that
   keeps the home hero dark until the blinds intro (signature.js) opens. The hook API is documented at the top of
   parts/signature.js. Under reduced motion everything is shown at once, unsplit and static. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var mq = function (q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var MD = window.MD = window.MD || {};
  var SEL = '[data-reveal], [data-words], [data-develop]';
  var hash = function (a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  root.classList.add('motion-on');

  /* ---------- home intro hold (signature.js plays the blinds, then fires md:intro-done) ---------- */
  var seen = '1'; try { seen = sessionStorage.getItem('mydealer-intro'); } catch (e) {}
  if (!reduce && body.classList.contains('page-home') && seen !== '1' && doc.querySelector('[data-hero]')) root.classList.add('intro-hold');
  var held = function (el) { return root.classList.contains('intro-hold') && !!(el.closest && el.closest('[data-hero]')); };

  /* ---------- neon split: words -> letters; one visually hidden copy per text run keeps the real text ---------- */
  function clipsText(el) {
    var list = [el].concat($$('*', el));
    for (var i = 0; i < list.length; i++) { var cs = getComputedStyle(list[i]); if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') return true; }
    return false;
  }
  function split(el) {
    if (el.hasAttribute('data-split')) return;
    if (clipsText(el)) { el.setAttribute('data-split', 'whole'); return; }
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var nWords = text ? text.split(' ').length : 1;
    var step = Math.max(55, Math.min(150, 720 / nWords));
    var wi = 0;
    (function walk(node, em) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var v = n.nodeValue;
          if (!/\S/.test(v)) return;
          var frag = doc.createDocumentFragment();
          var sr = doc.createElement('span'); sr.className = 'sr-only'; sr.textContent = v; frag.appendChild(sr);
          v.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(p)); return; }
            var w = doc.createElement('span'); w.className = em ? 'w w--em' : 'w'; w.setAttribute('aria-hidden', 'true');
            w.style.setProperty('--wd', Math.round(wi * step) + 'ms');
            Array.from(p).forEach(function (ch, k) {
              var l = doc.createElement('span'); l.textContent = ch;
              var r = hash(wi + 3, k + 5), late = k > 0 && p.length > 2 && r > 0.9;
              l.className = late ? 'l l--late' : (r < 0.5 ? 'l l--b' : 'l');
              l.style.setProperty('--d', Math.round(wi * step + r * 120 + (late ? 300 : 0)) + 'ms');
              w.appendChild(l);
            });
            frag.appendChild(w); wi++;
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(svg|img|br|picture|video|script|style|input|select|textarea)$/i.test(n.tagName) && !n.classList.contains('sr-only')) {
          walk(n, em || n.tagName === 'EM');
        }
      });
    })(el, false);
    el.setAttribute('data-split', 'letters');
    if (el.getAttribute('data-words') === 'neon') { var ls = el.querySelectorAll('.l'); if (ls.length > 5) ls[1 + Math.floor(hash(ls.length, 7) * (ls.length - 2))].classList.add('l--buzz'); }
  }

  /* ---------- entrances + settle sweep ---------- */
  var items = [];
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting && !held(en.target)) show(en.target); });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }) : null;
  var isDeal = function (el) { var v = el.getAttribute('data-reveal'); return v === 'deal' || v === 'pop'; };
  function prepDeal(el) {
    var p = el.parentNode; if (!p || !p.children) return;
    var group = Array.prototype.filter.call(p.children, isDeal);
    var i = Math.max(0, group.indexOf(el));
    var a = group[0].getBoundingClientRect(), r = el.getBoundingClientRect();
    var dx = i ? a.left - r.left : -30, dy = i ? a.top - r.top - 16 : -86;
    dx = Math.max(-560, Math.min(560, dx)); dy = Math.max(-200, Math.min(40, dy));
    el.style.setProperty('--dx', Math.round(dx) + 'px');
    el.style.setProperty('--dy', Math.round(dy) + 'px');
    el.style.setProperty('--dr', ((i % 2 ? 1 : -1) * (8 + (i * 5) % 9)) + 'deg');
    if (!getComputedStyle(el).getPropertyValue('--i').trim()) el.style.setProperty('--i', String(Math.min(i, 7)));
  }
  function show(el, instant) {
    if (el.classList.contains('is-in')) return;
    if (instant) el.classList.add('is-instant');
    else if (isDeal(el)) { try { prepDeal(el); } catch (e) {} }
    el.classList.add('is-in');
    if (io) io.unobserve(el);
  }
  function sweep() {
    var vh = window.innerHeight;
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (el.classList.contains('is-in') || held(el)) continue;
      if (el.closest('details:not([open])')) { show(el, true); continue; }
      var r = el.getBoundingClientRect();
      if (r.bottom < 0) show(el, true);
      else if (r.top < vh * 1.02) show(el);
    }
  }
  function scan(ctx) {
    $$(SEL, ctx || doc).forEach(function (el) {
      if (el.__md) return; el.__md = 1;
      items.push(el);
      if (reduce) { el.classList.add('is-in', 'is-instant'); return; }
      if (el.hasAttribute('data-words')) { try { split(el); } catch (e) { el.setAttribute('data-split', 'whole'); } }
      if (io) io.observe(el); else show(el, true);
    });
  }
  scan(doc);
  MD.scan = scan; MD.sweep = sweep; MD.show = show;

  if (!reduce) {
    var settle = 0;
    window.addEventListener('scroll', function () { clearTimeout(settle); settle = setTimeout(sweep, 130); }, { passive: true });
    window.addEventListener('resize', function () { clearTimeout(settle); settle = setTimeout(sweep, 200); });
    window.addEventListener('hashchange', function () { setTimeout(sweep, 80); });
    window.addEventListener('load', function () { setTimeout(sweep, 300); setTimeout(sweep, 2200); });
    setTimeout(sweep, 700);
  }

  /* ---------- intro release (with a failsafe if signature.js never takes the hold) ---------- */
  function release() { if (!root.classList.contains('intro-hold')) return; root.classList.remove('intro-hold'); sweep(); }
  window.addEventListener('md:intro-done', function () { root.classList.remove('intro-hold'); sweep(); });
  if (root.classList.contains('intro-hold')) {
    var waits = 0;
    var check = function () {
      if (!root.classList.contains('intro-hold')) return;
      if (root.classList.contains('intro-wait')) { setTimeout(check, 1500); return; }
      if (root.classList.contains('intro-run') && ++waits < 3) { setTimeout(check, 1500); return; }
      release();
    };
    setTimeout(check, 900);
  }

  /* ---------- scroll parallax ---------- */
  var layers = $$('[data-depth]');
  function parallax() {
    if (reduce || !layers.length) return;
    var vh = window.innerHeight;
    for (var i = 0; i < layers.length; i++) {
      var el = layers[i], r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) continue;
      var d = parseFloat(el.getAttribute('data-depth')) || 0;
      el.style.setProperty('--py', (-(r.top + r.height / 2 - vh / 2) * d).toFixed(1) + 'px');
    }
  }
  var pTick = false;
  window.addEventListener('scroll', function () { if (!pTick) { pTick = true; requestAnimationFrame(function () { parallax(); pTick = false; }); } }, { passive: true });
  parallax();
})();
