/* Lady L Cannabis redesign — interactions & motion (no dependencies). */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- age gate (fails closed: visible until confirmed) ---------- */
  var gate = $('[data-agegate]');
  if (gate && !root.classList.contains('age-ok')) {
    body.classList.add('gate-open');
    var yes = $('[data-age-yes]', gate);
    setTimeout(function () { try { yes.focus(); } catch (e) {} }, 60);
    yes.addEventListener('click', function () {
      try { localStorage.setItem('ladyl-age-ok', String(Date.now())); } catch (e) {}
      root.classList.add('age-ok'); body.classList.remove('gate-open');
    });
    $('[data-age-no]', gate).addEventListener('click', function () { gate.classList.add('is-denied'); });
    gate.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('button, a[href]', gate); var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- header: glass on scroll, hide on scroll down ---------- */
  var header = $('[data-header]');
  var meter = $('.scroll-meter');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 24);
      var drawerOpen = body.classList.contains('drawer-open');
      var megaOpen = !!$('.nav__item.is-open');
      if (!drawerOpen && !megaOpen) header.classList.toggle('is-hidden', y > 420 && y > lastY + 4);
      if (y < lastY - 4) header.classList.remove('is-hidden');
    }
    if (meter) { var h = doc.documentElement.scrollHeight - window.innerHeight; meter.style.setProperty('--progress', h > 0 ? Math.min(1, y / h).toFixed(4) : 0); }
    lastY = y;
    parallax();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- mega menus ---------- */
  var items = $$('[data-mega]');
  function closeAll(except) { items.forEach(function (it) { if (it !== except) { it.classList.remove('is-open'); var b = $('.nav__top', it); if (b) b.setAttribute('aria-expanded', 'false'); } }); }
  items.forEach(function (it) {
    var btn = $('.nav__top', it); var timer; var openedAt = 0;
    function open() { clearTimeout(timer); if (!it.classList.contains('is-open')) openedAt = Date.now(); closeAll(it); it.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    function close() { timer = setTimeout(function () { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 160); }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      // a click right after the hover opened it means "open", not "toggle closed"
      if (it.classList.contains('is-open') && Date.now() - openedAt > 400) { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
      else open();
    });
    if (finePointer) { it.addEventListener('mouseenter', open); it.addEventListener('mouseleave', close); }
    it.addEventListener('focusout', function (e) { if (!it.contains(e.relatedTarget)) close(); });
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); toggleDrawer(false); } });
  doc.addEventListener('click', function (e) { if (!e.target.closest('[data-mega]')) closeAll(); });

  /* ---------- mobile drawer ---------- */
  var burger = $('[data-burger]'), drawer = $('[data-drawer]');
  function toggleDrawer(force) {
    if (!burger || !drawer) return;
    var open = typeof force === 'boolean' ? force : burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.classList.toggle('is-open', open); body.classList.toggle('drawer-open', open);
    if (open && header) header.classList.remove('is-hidden');
  }
  if (burger) burger.addEventListener('click', function () { toggleDrawer(); });
  if (drawer) drawer.addEventListener('click', function (e) { if (e.target.closest('a')) toggleDrawer(false); });

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    revealEls.forEach(function (el) { io.observe(el); });
    // safety: anything still hidden after load + 4s is shown (fast scroll, print, capture)
    window.addEventListener('load', function () { setTimeout(function () { revealEls.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 1.2) el.classList.add('is-in'); }); }, 4000); });
  } else { revealEls.forEach(function (el) { el.classList.add('is-in'); }); }

  /* ---------- parallax layers ---------- */
  var layers = $$('[data-depth]');
  function parallax() {
    if (reduce || !layers.length) return;
    var vh = window.innerHeight;
    for (var i = 0; i < layers.length; i++) {
      var el = layers[i]; var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      var d = parseFloat(el.getAttribute('data-depth')) || 0;
      var center = r.top + r.height / 2 - vh / 2;
      el.style.setProperty('--py', (-center * d).toFixed(1) + 'px');
    }
  }
  parallax();

  /* ---------- hero mouse parallax ---------- */
  var stage = $('[data-stage]');
  if (stage && finePointer && !reduce) {
    var hero = stage.closest('[data-hero]') || stage;
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var movers = $$('.float', stage);
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(step);
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
    function step() {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      movers.forEach(function (m, i) {
        var k = m.classList.contains('hero__leaf') ? 18 : [24, 32, 20, 28, 36, 40][i % 6];
        m.style.setProperty('--px', (cx * k).toFixed(1) + 'px');
        m.style.translate = '0 ' + (cy * k).toFixed(1) + 'px';
      });
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(step); else raf = 0;
    }
  }

  /* ---------- 3D tilt + glare ---------- */
  if (finePointer && !reduce) {
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 9).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 11).toFixed(2) + 'deg) translateZ(0)';
        card.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- sparkles ---------- */
  $$('[data-sparkle]').forEach(function (box, bi) {
    var n = parseInt(box.getAttribute('data-sparkle'), 10) || 12; var seed = 7 + bi * 13;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var frag = doc.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var s = doc.createElement('i'); var k = rnd();
      s.className = 'spark' + (k < 0.25 ? ' spark--sun' : k < 0.45 ? ' spark--pink' : '');
      s.style.left = (rnd() * 100).toFixed(2) + '%'; s.style.top = (rnd() * 100).toFixed(2) + '%';
      s.style.setProperty('--s', (6 + rnd() * 16).toFixed(1) + 'px');
      s.style.setProperty('--d', (2.6 + rnd() * 3.4).toFixed(2) + 's');
      s.style.setProperty('--delay', (-rnd() * 5).toFixed(2) + 's');
      frag.appendChild(s);
    }
    box.appendChild(frag);
  });

  /* ---------- open / closed status (America/New_York) ---------- */
  var HOURS = { store: { 0: [11, 20], 1: [10, 21], 2: [10, 21], 3: [10, 21], 4: [10, 21], 5: [10, 22], 6: [10, 22] },
    delivery: { 0: [12, 20], 1: [14, 21], 2: [14, 21], 3: [14, 21], 4: [12, 21], 5: [12, 22], 6: [12, 22] } };
  function nyNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var map = {}; parts.forEach(function (p) { map[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      var h = parseInt(map.hour, 10) % 24; return { day: days[map.weekday], hour: h + parseInt(map.minute, 10) / 60 };
    } catch (e) { var d = new Date(); return { day: d.getDay(), hour: d.getHours() + d.getMinutes() / 60 }; }
  }
  function fmt(h) { var ap = h >= 12 ? 'pm' : 'am'; var x = h % 12 || 12; return x + ap; }
  var now = nyNow();
  $$('[data-open-status]').forEach(function (el) {
    var kind = el.getAttribute('data-kind') || 'store'; var t = HOURS[kind][now.day];
    var label = kind === 'delivery' ? 'Delivery' : 'Open';
    var open = now.hour >= t[0] && now.hour < t[1];
    if (open) { el.textContent = (kind === 'delivery' ? 'Delivering now' : 'Open now') + ' · until ' + fmt(t[1]); el.classList.remove('is-closed'); }
    else {
      var next = now.hour < t[0] ? t : HOURS[kind][(now.day + 1) % 7];
      el.textContent = (kind === 'delivery' ? 'Delivery opens ' : 'Opens ') + (now.hour < t[0] ? fmt(t[0]) + ' today' : fmt(next[0]) + ' tomorrow');
      el.classList.add('is-closed');
    }
  });
  // highlight today in hours lists
  var dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  $$('.hours').forEach(function (list) {
    $$('li', list).forEach(function (li) {
      var t = (li.textContent || '').toLowerCase(); var span = t.match(/(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:\s*-\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday))?/);
      if (!span) return; var a = dayNames.indexOf(span[1]); var b = span[2] ? dayNames.indexOf(span[2]) : a;
      var d = now.day; if ((a <= b && d >= a && d <= b) || (a > b && (d >= a || d <= b))) li.classList.add('is-today');
    });
  });

  /* ---------- hero video ---------- */
  var vid = $('[data-hero-video]');
  if (vid) {
    if (reduce) { vid.removeAttribute('autoplay'); vid.pause(); }
    else {
      var showVid = function () { vid.classList.add('is-playing'); };
      vid.addEventListener('playing', showVid);
      var tryPlay = function () { var p = vid.play(); if (p && p.catch) p.catch(function () {}); };
      tryPlay();
      var retry = function () { tryPlay(); doc.removeEventListener('touchstart', retry); doc.removeEventListener('click', retry); };
      doc.addEventListener('touchstart', retry, { passive: true, once: true }); doc.addEventListener('click', retry, { once: true });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) tryPlay(); else vid.pause(); }); }, { threshold: 0.05 }).observe(vid);
    }
  }

  /* ---------- review rails ---------- */
  $$('[data-rail]').forEach(function (rail) {
    var wrap = rail.parentElement; var prev = $('[data-rail-prev]', wrap), next = $('[data-rail-next]', wrap);
    var by = function (dir) { rail.scrollBy({ left: dir * Math.max(rail.clientWidth * 0.8, 300), behavior: reduce ? 'auto' : 'smooth' }); };
    if (prev) prev.addEventListener('click', function () { by(-1); });
    if (next) next.addEventListener('click', function () { by(1); });
    var down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; rail.style.scrollSnapType = 'none'; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; rail.scrollLeft = sl - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; rail.style.scrollSnapType = ''; });
    rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  /* ---------- review rails: slow continuous auto-scroll (owner: "not too fast, just enough to be easily read") ----------
     ~28px/s on desktop, ~16px/s on phones (about one card every 14-20s). Seamless loop through a cloned set
     (aria-hidden + inert, so it is never read twice or focused). Pauses on hover, focus, touch/drag, wheel/swipe and
     the arrows (resumes a few seconds later), when off-screen or the tab is hidden; off for reduced motion. */
  $$('[data-rail-auto]').forEach(function (rail) {
    if (reduce) return;
    var kids = Array.prototype.slice.call(rail.children);
    if (kids.length < 2) return;
    kids.forEach(function (k) { var c = k.cloneNode(true); c.removeAttribute('data-reveal'); c.classList.add('is-in', 'is-clone'); c.setAttribute('aria-hidden', 'true'); c.setAttribute('inert', ''); rail.appendChild(c); });
    var wrap = rail.parentElement || rail;
    var setW = function () { return kids[kids.length - 1].nextElementSibling.offsetLeft - kids[0].offsetLeft; };
    var speed = function () { return Math.max(16, Math.min(28, rail.clientWidth / 40)); };
    var pos = rail.scrollLeft, last = 0, hold = 0, hover = false, focus = false, visible = true, raf = 0, setByUs = -1;
    var pauseFor = function (ms) { hold = Math.max(hold, performance.now() + ms); };
    var tick = function (t) {
      raf = requestAnimationFrame(tick);
      var dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t;
      if (hover || focus || !visible || doc.hidden || t < hold) { pos = rail.scrollLeft; return; } // paused: leave the position alone (no snap jump under the cursor)
      rail.style.scrollSnapType = 'none';
      var w = setW();
      pos += speed() * dt;
      if (w > 0 && pos >= w) pos -= w;
      setByUs = Math.round(pos); rail.scrollLeft = pos;
    };
    rail.addEventListener('scroll', function () { if (setByUs >= 0 && Math.abs(rail.scrollLeft - setByUs) > 3) { pauseFor(5000); setByUs = -1; } }, { passive: true });
    wrap.addEventListener('mouseenter', function () { hover = true; });
    wrap.addEventListener('mouseleave', function () { hover = false; pauseFor(800); });
    // pause for KEYBOARD focus only: a mouse click leaves focus on the arrow button and must not stop the rail for good
    wrap.addEventListener('focusin', function (e) { var t = e.target; try { focus = !!(t && t.matches && t.matches(':focus-visible')); } catch (x) { focus = false; } });
    wrap.addEventListener('focusout', function () { focus = false; pauseFor(1500); });
    rail.addEventListener('pointerdown', function () { pauseFor(6000); }, { passive: true });
    rail.addEventListener('touchstart', function () { rail.style.scrollSnapType = ''; pauseFor(6000); }, { passive: true }); // swipe lands on a card
    rail.addEventListener('wheel', function () { pauseFor(5000); }, { passive: true });
    // arrows: re-enable snapping BEFORE the arrow's own scroll handler runs so the step lands on a card
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-rail-prev],[data-rail-next]')) { rail.style.scrollSnapType = ''; pauseFor(7000); } }, true);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.1 }).observe(rail);
    raf = requestAnimationFrame(tick);
  });

  /* ---------- preview forms (not connected) ---------- */
  var toast = $('[data-toast]'); var tt;
  function say(msg) { if (!toast) return; toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('is-on'); }, 4200); }
  $$('[data-preview-form]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); say('Thanks! This is a design preview — the form isn’t connected yet, so nothing was sent.'); }); });

  onScroll();
})();

/* editorial: blog post table of contents (open on wide screens, scroll-spy, close after picking on phones). */
(function () {
  'use strict';
  var body = document.body;
  if (!body || !body.classList.contains('page-post')) return;
  var toc = document.querySelector('.page-post [data-toc]');
  if (!toc) return;
  var wide = window.matchMedia ? window.matchMedia('(min-width: 1100px)') : { matches: true };
  function sync() { if (wide.matches) toc.open = true; }
  sync();
  if (wide.addEventListener) wide.addEventListener('change', sync);
  else if (wide.addListener) wide.addListener(sync);

  var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
  var list = toc.querySelector('.ed-toc__list');
  var items = [];
  links.forEach(function (a) {
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    var h = document.getElementById(id);
    if (h) items.push({ a: a, h: h });
    a.addEventListener('click', function () { if (!wide.matches) toc.open = false; });
  });
  if (!items.length) return;

  var current = null, ticking = false;
  function update() {
    ticking = false;
    var line = window.innerHeight * 0.3, active = null;
    for (var i = 0; i < items.length; i++) { if (items[i].h.getBoundingClientRect().top <= line) active = items[i]; else break; }
    if (active === current) return;
    if (current) current.a.removeAttribute('aria-current');
    current = active;
    if (!current) return;
    current.a.setAttribute('aria-current', 'location');
    if (wide.matches && list && list.scrollHeight > list.clientHeight) {
      var top = current.a.offsetTop, bottom = top + current.a.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top - 8;
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 8;
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

/* Lady L redesign — local area: delivery-town finder on /service/ (search + county filter). No-op elsewhere. */
(function () {
  'use strict';
  var root = document.querySelector('[data-town-finder]');
  if (!root) return;
  var input = root.querySelector('[data-town-search]');
  var tools = root.querySelector('[data-finder-tools]');
  var count = root.querySelector('[data-town-count]');
  var empty = root.querySelector('[data-town-empty]');
  var groups = Array.prototype.slice.call(root.querySelectorAll('[data-group]'));
  var filters = Array.prototype.slice.call(root.querySelectorAll('[data-county-filter]'));
  var total = parseInt((count && count.getAttribute('data-total')) || '0', 10) || root.querySelectorAll('[data-town]').length;
  var county = 'all';
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function apply() {
    var q = norm(input && input.value);
    var shown = 0;
    groups.forEach(function (g) {
      var inCounty = county === 'all' || g.getAttribute('data-county') === county;
      var n = 0;
      Array.prototype.forEach.call(g.querySelectorAll('[data-town]'), function (li) {
        var ok = inCounty && (!q || norm(li.getAttribute('data-town')).indexOf(q) !== -1);
        li.hidden = !ok;
        if (ok) n++;
      });
      g.hidden = n === 0;
      shown += n;
    });
    if (count) count.textContent = shown === total ? total + ' towns' : 'Showing ' + shown + ' of ' + total + ' towns';
    if (empty) empty.hidden = shown !== 0;
  }
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      county = b.getAttribute('data-county-filter') || 'all';
      filters.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      apply();
    });
  });
  if (input) {
    input.addEventListener('input', apply);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; apply(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        var first = root.querySelector('[data-town]:not([hidden]) a');
        if (first && input.value.trim()) first.focus();
      }
    });
  }
  if (tools) tools.hidden = false;
  apply();
})();

/* Pages area: FAQ search filter, referral-code copy, on-page contents highlight. Each part no-ops when its markup is absent. */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var all = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var toastEl = doc.querySelector('[data-toast]');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3600);
  }

  /* ---------- FAQ search (without JS the form stays hidden and every answer is listed) ---------- */
  var form = doc.querySelector('[data-faq-search]');
  if (form) {
    var input = form.querySelector('input');
    var status = doc.querySelector('[data-faq-status]');
    var empty = doc.querySelector('[data-faq-empty]');
    var items = all('[data-faq-item]');
    var groups = all('[data-faq-group]');
    var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9$%+]+/g, ' ').trim(); };
    var texts = items.map(function (it) { return norm(it.textContent); });
    form.hidden = false;
    var run = function () {
      var q = norm(input.value);
      var terms = q ? q.split(' ') : [];
      var shown = 0;
      items.forEach(function (it, i) {
        var ok = terms.every(function (t) { return texts[i].indexOf(t) >= 0; });
        it.hidden = !ok;
        if (ok) { shown++; it.classList.add('is-in'); }
      });
      groups.forEach(function (g) { g.hidden = !g.querySelector('[data-faq-item]:not([hidden])'); });
      if (empty) empty.hidden = shown > 0;
      if (status) status.textContent = q ? shown + (shown === 1 ? ' answer' : ' answers') + ' for “' + input.value.trim() + '”' : '';
    };
    input.addEventListener('input', run);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); run();
      var first = doc.querySelector('[data-faq-item]:not([hidden])');
      if (!first) return;
      first.open = true;
      first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      var s = first.querySelector('summary'); if (s) s.focus({ preventScroll: true });
    });
  }

  /* ---------- copy the referral code ---------- */
  all('[data-copy]').forEach(function (btn) {
    var code = btn.getAttribute('data-copy');
    var label = btn.textContent;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var done = function () {
        btn.textContent = 'Copied!'; toast('Code ' + code + ' copied. Paste it at checkout.');
        setTimeout(function () { btn.textContent = label; }, 2200);
      };
      var fallback = function () {
        try {
          var ta = doc.createElement('textarea'); ta.value = code; ta.setAttribute('readonly', '');
          ta.style.position = 'fixed'; ta.style.opacity = '0'; doc.body.appendChild(ta); ta.select();
          var ok = doc.execCommand('copy'); doc.body.removeChild(ta);
          if (ok) done(); else toast('Your code is ' + code + '.');
        } catch (e) { toast('Your code is ' + code + '.'); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, fallback);
      else fallback();
    });
  });

  /* ---------- on-page contents: highlight the section in view, close the mobile list after a jump ---------- */
  var links = all('[data-toc-link]');
  if (links.length) {
    all('.pg-toc--m a').forEach(function (a) { a.addEventListener('click', function () { var d = a.closest('details'); if (d) d.open = false; }); });
    if ('IntersectionObserver' in window) {
      var byId = {};
      links.forEach(function (a) { var id = decodeURIComponent((a.getAttribute('href') || '').slice(1)); (byId[id] = byId[id] || []).push(a); });
      var current = null;
      var mark = function (id) {
        if (id === current) return;
        if (current && byId[current]) byId[current].forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        current = id;
        if (byId[id]) byId[id].forEach(function (a) { a.classList.add('is-active'); a.setAttribute('aria-current', 'location'); });
      };
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) mark(en.target.id); });
      }, { rootMargin: '-18% 0px -72% 0px', threshold: 0 });
      Object.keys(byId).forEach(function (id) { var el = doc.getElementById(id); if (el) io.observe(el); });
    }
  }
})();
