/* My Dealer redesign — interactions & motion (no dependencies). */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var finePointer = mq('(hover: hover) and (pointer: fine)');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- age gate: shown until confirmed (fails closed) ---------- */
  var gate = $('[data-agegate]');
  if (gate && !root.classList.contains('age-ok')) {
    body.classList.add('gate-open');
    var yes = $('[data-age-yes]', gate);
    setTimeout(function () { try { yes.focus(); } catch (e) {} }, 60);
    yes.addEventListener('click', function () {
      try { localStorage.setItem('mydealer-age-ok', String(Date.now())); } catch (e) {}
      root.classList.add('age-ok'); body.classList.remove('gate-open');
      var v = $('[data-hero-video]'); if (v && !reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
    $('[data-age-no]', gate).addEventListener('click', function () { gate.classList.add('is-denied'); });
    gate.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('button, a[href]', gate), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- header (pinned; glass once scrolled) ---------- */
  var header = $('[data-header]');
  var util = $('.utility');
  function setUtilH() { root.style.setProperty('--utility-h', util ? Math.max(0, util.getBoundingClientRect().bottom) + 'px' : '0px'); }
  var pickupSync = null, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 30);
    setUtilH();
    parallax();
    if (pickupSync) pickupSync();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- mega menus ---------- */
  var items = $$('[data-mega]');
  function closeAll(except) { items.forEach(function (it) { if (it !== except) { it.classList.remove('is-open'); var b = $('.nav__top', it); if (b) b.setAttribute('aria-expanded', 'false'); } }); }
  items.forEach(function (it) {
    var btn = $('.nav__top', it), timer, openedAt = 0;
    function open() { clearTimeout(timer); if (!it.classList.contains('is-open')) openedAt = Date.now(); closeAll(it); it.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    function close() { timer = setTimeout(function () { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 180); }
    btn.addEventListener('click', function (e) { e.preventDefault(); if (it.classList.contains('is-open') && Date.now() - openedAt > 400) { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } else open(); });
    if (finePointer) { it.addEventListener('mouseenter', open); it.addEventListener('mouseleave', close); }
    it.addEventListener('focusout', function (e) { if (!it.contains(e.relatedTarget)) close(); });
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); toggleDrawer(false); closeFilm(); } });
  doc.addEventListener('click', function (e) { if (!e.target.closest('[data-mega]')) closeAll(); });

  /* ---------- drawer ---------- */
  var burger = $('[data-burger]'), drawer = $('[data-drawer]');
  function toggleDrawer(force) {
    if (!burger || !drawer) return;
    var open = typeof force === 'boolean' ? force : burger.getAttribute('aria-expanded') !== 'true';
    if (open) setUtilH();
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.classList.toggle('is-open', open); body.classList.toggle('drawer-open', open);
  }
  if (burger) burger.addEventListener('click', function () { toggleDrawer(); });
  if (drawer) drawer.addEventListener('click', function (e) { if (e.target.closest('a')) toggleDrawer(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1180) toggleDrawer(false); });

  /* ---------- word-by-word headline reveal ---------- */
  $$('[data-words]').forEach(function (el) {
    if (reduce) return;
    var i = 0;
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.nodeValue.split(/(\s+)/); var frag = doc.createDocumentFragment();
          parts.forEach(function (p) { if (!p) return; if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(p)); return; } var s = doc.createElement('span'); s.className = 'w'; s.style.setProperty('--w', i++); s.textContent = p; frag.appendChild(s); });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(svg|img|br)$/i.test(n.tagName)) split(n);
      });
    })(el);
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$('[data-reveal], [data-words]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -7% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
    // a fast fling can carry an element through the viewport between two frames, so the observer never fires:
    // when scrolling settles, everything above the viewport's bottom edge is revealed
    var sweep = function () { for (var i = 0; i < revealEls.length; i++) { var el = revealEls[i]; if (el.classList.contains('is-in')) continue; if (el.getBoundingClientRect().top < window.innerHeight * 1.05) { el.classList.add('is-in'); io.unobserve(el); } } };
    var settle = 0; window.addEventListener('scroll', function () { clearTimeout(settle); settle = setTimeout(sweep, 140); }, { passive: true });
    window.addEventListener('load', function () { setTimeout(sweep, 3500); });
    window.addEventListener('hashchange', function () { setTimeout(sweep, 60); });
  } else revealEls.forEach(function (el) { el.classList.add('is-in'); });

  /* ---------- scroll parallax ---------- */
  var layers = $$('[data-depth]');
  function parallax() {
    if (reduce || !layers.length) return;
    var vh = window.innerHeight;
    for (var i = 0; i < layers.length; i++) {
      var el = layers[i], r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) continue;
      var d = parseFloat(el.getAttribute('data-depth')) || 0;
      var c = r.top + r.height / 2 - vh / 2;
      el.style.setProperty('--py', (-c * d).toFixed(1) + 'px');
    }
  }

  /* ---------- hero: pointer spotlight + pointer parallax ---------- */
  var stage = $('[data-stage]');
  if (stage && finePointer && !reduce) {
    var tx = 0.5, ty = 0.4, cx = 0.5, cy = 0.4, raf = 0;
    var movers = $$('.float', stage);
    stage.addEventListener('pointermove', function (e) { var r = stage.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; if (!raf) raf = requestAnimationFrame(step); });
    stage.addEventListener('pointerleave', function () { tx = 0.7; ty = 0.35; if (!raf) raf = requestAnimationFrame(step); });
    function step() {
      cx += (tx - cx) * 0.09; cy += (ty - cy) * 0.09;
      stage.style.setProperty('--mx', (cx * 100).toFixed(2) + '%'); stage.style.setProperty('--my', (cy * 100).toFixed(2) + '%');
      movers.forEach(function (m, i) { var k = [26, 40, 18, 32][i % 4]; m.style.setProperty('--px', ((cx - 0.5) * k).toFixed(1) + 'px'); });
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(step); else raf = 0;
    }
  }

  /* ---------- 3D tilt + glare ---------- */
  if (finePointer && !reduce) {
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 7).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 9).toFixed(2) + 'deg) translateY(-6px)';
        card.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- open / closed (Minnesota time, noon to 8 every day) ---------- */
  function mnNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var m = {}; parts.forEach(function (p) { m[p.type] = p.value; });
      return (parseInt(m.hour, 10) % 24) + parseInt(m.minute, 10) / 60;
    } catch (e) { var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  }
  var h = mnNow(), OPEN = 12, CLOSE = 20;
  $$('[data-open-status]').forEach(function (el) {
    if (h >= OPEN && h < CLOSE) { el.textContent = 'Open now · until 8 pm'; el.classList.remove('is-closed'); }
    else { el.textContent = h < OPEN ? 'Closed · opens at noon today' : 'Closed · opens at noon tomorrow'; el.classList.add('is-closed'); }
  });

  /* ---------- hero video ---------- */
  var vid = $('[data-hero-video]');
  if (vid) {
    if (reduce) { vid.removeAttribute('autoplay'); try { vid.pause(); } catch (e) {} }
    else {
      vid.addEventListener('playing', function () { vid.classList.add('is-playing'); });
      var tryPlay = function () { var p = vid.play(); if (p && p.catch) p.catch(function () {}); };
      tryPlay();
      var retry = function () { tryPlay(); doc.removeEventListener('touchstart', retry); doc.removeEventListener('click', retry); };
      doc.addEventListener('touchstart', retry, { passive: true, once: true }); doc.addEventListener('click', retry, { once: true });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) tryPlay(); else vid.pause(); }); }, { threshold: 0.05 }).observe(vid);
    }
  }

  /* ---------- brand film dialog ---------- */
  var film = $('[data-film]'), filmVid = film && $('video', film), filmOpener = null;
  function closeFilm() { if (!film || !film.classList.contains('is-open')) return; film.classList.remove('is-open'); try { filmVid.pause(); } catch (e) {} body.style.overflow = ''; if (filmOpener) filmOpener.focus(); }
  $$('[data-film-open]').forEach(function (b) { b.addEventListener('click', function () { if (!film) return; filmOpener = b; film.classList.add('is-open'); body.style.overflow = 'hidden'; var c = $('[data-film-close]', film); if (c) c.focus(); var p = filmVid.play(); if (p && p.catch) p.catch(function () {}); }); });
  if (film) { $('[data-film-close]', film).addEventListener('click', closeFilm); film.addEventListener('click', function (e) { if (e.target === film) closeFilm(); }); }

  /* ---------- sticky "Preorder for pickup" bar: shows past the hero; hides at the footer, with the drawer open and
     while typing; the x hides it for the session; --bottom-stack keeps the footer clear of it ---------- */
  (function () {
    var bar = $('[data-pickup-bar]'); if (!bar) return;
    var hero = $('[data-hero]') || ($('main') && $('main').firstElementChild); var foot = $('.site-footer');
    var dismissed = false; try { dismissed = sessionStorage.getItem('mydealer-pickup-x') === '1'; } catch (e) {}
    var footIn = false, typing = false;
    pickupSync = function () {
      var past = hero ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.35 : window.scrollY > window.innerHeight * 0.8;
      var on = !dismissed && past && !footIn && !typing && !body.classList.contains('drawer-open') && !body.classList.contains('gate-open');
      if (on !== bar.classList.contains('is-visible')) bar.classList.toggle('is-visible', on);
      root.style.setProperty('--bottom-stack', on ? (bar.offsetHeight + 24) + 'px' : '0px');
    };
    if (foot && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { footIn = es[0].isIntersecting; pickupSync(); }, { rootMargin: '0px 0px 60px 0px' }).observe(foot);
    doc.addEventListener('focusin', function (e) { var t = e.target; if (t && t.matches && t.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select')) { typing = true; pickupSync(); } });
    doc.addEventListener('focusout', function () { typing = false; setTimeout(pickupSync, 60); });
    var x = $('[data-pickup-close]', bar);
    if (x) x.addEventListener('click', function () { dismissed = true; try { sessionStorage.setItem('mydealer-pickup-x', '1'); } catch (e) {} pickupSync(); });
    if ('MutationObserver' in window) new MutationObserver(pickupSync).observe(body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', pickupSync);
    pickupSync();
  })();

  /* ---------- FAQ search ---------- */
  var search = $('[data-faq-search]');
  if (search) {
    var qs = $$('.faq__item'), groups = $$('[data-faq-group]'), empty = $('[data-faq-empty]'), count = $('[data-faq-count]');
    var norm = function (s) { return (s || '').toLowerCase().replace(/[^a-z0-9%$ ]+/g, ' '); };
    search.addEventListener('input', function () {
      var q = norm(search.value).trim(), terms = q.split(/\s+/).filter(Boolean), shown = 0;
      qs.forEach(function (it) { var t = norm(it.textContent); var hit = terms.every(function (w) { return t.indexOf(w) >= 0; }); it.hidden = !hit; if (hit) shown++; if (q && hit && terms.length) it.open = true; if (!q) it.open = false; });
      groups.forEach(function (g) { g.hidden = !$$('.faq__item', g).some(function (i) { return !i.hidden; }); });
      if (empty) empty.classList.toggle('is-on', shown === 0);
      if (count) count.textContent = q ? shown + (shown === 1 ? ' question' : ' questions') : '';
    });
  }

  /* ---------- before / after sliders ---------- */
  $$('[data-ba]').forEach(function (ba) {
    var r = $('input[type=range]', ba);
    var set = function (v) { ba.style.setProperty('--pos', v + '%'); };
    r.addEventListener('input', function () { set(r.value); });
    set(r.value);
  });

  /* ---------- table of contents scroll-spy ---------- */
  var tocLinks = $$('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {}; tocLinks.forEach(function (a) { map[decodeURIComponent(a.getAttribute('href').slice(1))] = a; });
    var spy = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { tocLinks.forEach(function (a) { a.classList.remove('is-active'); }); var a = map[en.target.id]; if (a) a.classList.add('is-active'); } }); }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var t = doc.getElementById(id); if (t) spy.observe(t); });
  }

  setUtilH();
  onScroll();
})();
