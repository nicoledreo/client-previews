/* parts/signature.js — the SIGNATURE effects for My Dealer, concept "After hours at the counter".

   HOOK API (the markup contract for HOME / HERO / SECTIONS; motion.js + signature.js + styles/pages/signature.css)
   --------------------------------------------------------------------------------------------------------------
   data-words                Neon switch-on for a heading: words light up like a neon sign (staggered flicker per
                             letter, then hold); words inside <em> bloom warm gold. Real text stays for screen readers
                             (one visually hidden copy per text run; the painted letters are aria-hidden). One painter
                             per glyph: no text copies, no -webkit-text-stroke. If the heading (or a child) paints
                             gradient text (background-clip: text), it is NOT split: the whole element flickers on.
   data-words="neon"         Same, plus the full neon-tube look (cream tubes with a white core and a warm halo, gold em)
                             and a rare one-letter buzz after it holds. Use on dark grounds only (hero H1s, closing
                             bands, the footer finale).
   data-reveal               Entrance, fired by IntersectionObserver, with a scroll-settle sweep so a fast fling never
                             leaves anything hidden. --i (0..7) = stagger index (90 ms steps, capped).
     ""  / "shadow"          The element comes up out of the dark (brightness/contrast + a small rise and scale).
     "develop"               An image develops like a darkroom print (dark, warm, flat -> full). Opacity never drops.
     "deal"                  A card is dealt onto the table: siblings marked "deal" fly out of the first card's spot
                             (the stack), rotated, land and settle. Old values: "left"/"right" = shadow from the side,
                             "pop" = deal.
   data-develop              Same as data-reveal="develop" (for photos).
   data-lamp                 Hover lamp: light follows the pointer across the surface, the border nearest the pointer
                             lights up, the surface presses in slightly (no lift, no tilt). AUTO on .card, .cat,
                             .ticket, .post-card, .store-card, .pricecard (and old [data-tilt]). data-lamp="off" opts out.
                             Fine pointers only; touch gets a press on :active.
   data-magnetic             Buttons pull a few px toward the pointer; gold light fills from the side the pointer
                             entered and drains out of the side it left. AUTO on .btn--gold and .btn--ghost (fine
                             pointers). data-magnetic="off" opts out. Keyboard focus fills from the centre.
   data-flip                 3D card flip. Markup: <div data-flip><div class="flip__inner"><div class="flip__front">…
                             </div><div class="flip__back">…</div></div></div>. Hover/focus flips on fine pointers;
                             a tap flips on touch (a tap on a real link/button inside the visible face follows it;
                             a whole-card <a data-flip> follows on the second tap); Enter/Space flips when the card
                             itself has focus (it gets tabindex=0 when nothing inside is focusable); Esc flips back.
                             A focusable card that is not a link/button gets role="button" + aria-pressed (= flipped).
                             Tab landing on a control on the back face flips the card on every device.
                             Both faces share one grid cell, so the card is as tall as its taller face. Without JS or
                             under reduced motion the back is shown below the front (all text visible).
   data-disco                On a section: disco-ball light while it is in view: sharp 2-4 px gold facet specks that
                             twinkle (some with a thin glint cross) and slide a short way as the ball turns. CSS-drawn,
                             never an image; placed only in the section's open space (kept clear of every heading, line
                             of copy, button, image and card), at most ~12 per viewport, re-placed on reflow. Behind
                             the content.
   data-depth="0.12"         Scroll parallax: sets --py on the element (use it in translate). Kept from round 1.
   data-blinds               Generic venetian-blind slats over a media box (position is made relative), opening on
                             entry; data-blinds="10" sets the slat count. Ignored inside [data-hero] / .phero / .hero
                             (HERO owns the hero version) and on boxes that already hold their own slats.
   home blinds intro         Automatic on .page-home with a [data-hero]: first visit per session, <= 1.6 s, any
                             click / wheel / key / touch / scroll skips it; skipped when sessionStorage
                             'mydealer-intro' === '1' (set when it plays) or under reduced motion. Black slats rotate
                             open, then the hero's [data-words] switches on (motion.js holds the hero until then).
   data-neon-sign            The live OPEN / CLOSED neon sign (footer finale): Minnesota time, noon to 8 every day,
                             re-checked every 30 s; it also keeps every [data-open-status] text live (same strings as
                             site.js).
   window.MD.refresh(el)     Call after inserting markup that carries these hooks (scans el, default document).
   States/classes: .is-in (revealed), .is-instant (revealed without animation), .is-flipped, .lamp-host, .mag-host,
   .disco-host / .disco--live, html.intro-hold / .intro-run / .intro-wait, html.motion-on.
   Under prefers-reduced-motion every hook is static and fully visible; with no JS everything is visible. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var mq = function (q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(hover: hover) and (pointer: fine)');
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var MD = window.MD = window.MD || {};
  var hash = function (a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  var outside = function (el) { return !!(el.closest && el.closest('.mega, .drawer, .agegate, .film')); };
  var staticPos = function (el) { if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; };

  /* ---------- shared "in view" watcher with a settle sweep (for slats and signs) ---------- */
  var watched = [];
  var vio = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) fire(en.target); });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }) : null;
  function fire(el) { var i = watched.indexOf(el); if (i < 0) return; watched.splice(i, 1); if (vio) vio.unobserve(el); try { el.__onview(); } catch (e) {} }
  function watch(el, cb) { el.__onview = cb; watched.push(el); if (vio) vio.observe(el); else fire(el); }
  function sweep() { var vh = window.innerHeight; watched.slice().forEach(function (el) { if (el.getBoundingClientRect().top < vh * 1.02) fire(el); }); }
  var settle = 0;
  window.addEventListener('scroll', function () { clearTimeout(settle); settle = setTimeout(sweep, 130); }, { passive: true });
  window.addEventListener('load', function () { setTimeout(sweep, 400); });

  /* ---------- lamp hover ---------- */
  var LAMP = '.card, .cat, .ticket, .post-card, .store-card, .pricecard, [data-lamp], [data-tilt]';
  function painted(n) {
    var cs = getComputedStyle(n);
    return cs.backgroundImage !== 'none' || !/^(transparent|rgba\(\d+, \d+, \d+, 0\))$/.test(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
  }
  function surfaceIn(el) {
    var hr = el.getBoundingClientRect(), need = hr.width * hr.height * 0.35, best = null, bestA = 0;
    $$('*', el).forEach(function (n) {
      if (n.classList.contains('lamp') || /^(IMG|SVG|PICTURE|VIDEO|svg)$/.test(n.tagName)) return;
      var r = n.getBoundingClientRect(), A = r.width * r.height;
      if (A > bestA && A >= need && painted(n)) { best = n; bestA = A; }
    });
    return best;
  }
  function lampify(el) {
    if (el.__lamp || el.getAttribute('data-lamp') === 'off' || outside(el)) return;
    el.__lamp = 1;
    el.classList.add('lamp-host');
    if (!fine || reduce) return;
    staticPos(el);
    var lamp = doc.createElement('span'); lamp.className = 'lamp'; lamp.setAttribute('aria-hidden', 'true');
    el.appendChild(lamp);
    /* a host with no painted surface of its own (a flip wrapper, a niche tile) lights its largest painted child:
       the lamp is laid over that child's box with its corner radius, but stays a child of the host (never flips) */
    var surf = null;
    var place = function () {
      if (surf === null) surf = painted(el) ? el : (surfaceIn(el) || el);
      if (surf === el) return;
      var hr = el.getBoundingClientRect(), sr = surf.getBoundingClientRect(), cs = getComputedStyle(surf);
      lamp.style.cssText = 'inset:auto;left:' + (sr.left - hr.left).toFixed(1) + 'px;top:' + (sr.top - hr.top).toFixed(1) + 'px;width:' + sr.width.toFixed(1) + 'px;height:' + sr.height.toFixed(1) + 'px;border-radius:' + cs.borderRadius;
    };
    var raf = 0, px = 0, py = 0;
    var paint = function () { raf = 0; var r = (surf && surf !== el ? surf : el).getBoundingClientRect(); el.style.setProperty('--lx', (px - r.left).toFixed(1) + 'px'); el.style.setProperty('--ly', (py - r.top).toFixed(1) + 'px'); };
    el.addEventListener('pointerenter', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; place(); paint(); el.classList.add('is-lamp'); });
    el.addEventListener('pointermove', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); });
    el.addEventListener('pointerleave', function () { el.classList.remove('is-lamp'); });
  }

  /* ---------- magnetic buttons + directional gold fill ---------- */
  var MAG = '[data-magnetic], .btn--gold, .btn--ghost';
  function magnetize(btn) {
    if (btn.__mag || btn.getAttribute('data-magnetic') === 'off' || outside(btn)) return;
    btn.__mag = 1;
    if (!fine || reduce) return;
    staticPos(btn);
    btn.classList.add('mag-host');
    var fill = doc.createElement('span'); fill.className = 'mag-fill'; fill.setAttribute('aria-hidden', 'true');
    btn.insertBefore(fill, btn.firstChild);
    var raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    var size = function () { var r = btn.getBoundingClientRect(); btn.style.setProperty('--fd', Math.ceil(2.1 * Math.sqrt(r.width * r.width + r.height * r.height)) + 'px'); return r; };
    var at = function (e, r) { btn.style.setProperty('--fx', Math.round(e.clientX - r.left) + 'px'); btn.style.setProperty('--fy', Math.round(e.clientY - r.top) + 'px'); };
    var step = function () { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; btn.style.translate = cx.toFixed(2) + 'px ' + cy.toFixed(2) + 'px'; if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) raf = requestAnimationFrame(step); else { raf = 0; if (!tx && !ty) btn.style.translate = ''; } };
    btn.addEventListener('pointerenter', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; at(e, size()); btn.classList.add('is-fill'); });
    btn.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = btn.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)) * 6;
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)) * 4;
      if (!raf) raf = requestAnimationFrame(step);
    });
    btn.addEventListener('pointerleave', function (e) { at(e, btn.getBoundingClientRect()); btn.classList.remove('is-fill'); tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
    btn.addEventListener('focus', function () { size(); btn.style.setProperty('--fx', '50%'); btn.style.setProperty('--fy', '50%'); });
  }

  /* ---------- 3D flip cards ---------- */
  function flipify(card) {
    if (card.__flip) return; card.__flip = 1;
    var focusable = card.matches('a[href], button, [tabindex]') || card.querySelector('a[href], button, input, select, textarea, [tabindex]');
    if (!focusable) card.setAttribute('tabindex', '0');
    /* a focusable card that is not itself a link or button is a toggle: it says so, and says whether it is turned */
    var toggle = card.hasAttribute('tabindex') && !/^(A|BUTTON)$/.test(card.tagName);
    if (toggle) { if (!card.getAttribute('role')) card.setAttribute('role', 'button'); card.setAttribute('aria-pressed', 'false'); }
    var set = function (on) { card.classList.toggle('is-flipped', on); if (toggle) card.setAttribute('aria-pressed', on ? 'true' : 'false'); };
    card.addEventListener('keydown', function (e) {
      if (e.target !== card) return;
      if ((e.key === 'Enter' && card.tagName !== 'A') || e.key === ' ') { e.preventDefault(); set(!card.classList.contains('is-flipped')); }
      else if (e.key === 'Escape') set(false);
    });
    card.addEventListener('click', function (e) {
      if (fine) return;
      var ctl = e.target.closest && e.target.closest('a[href], button, input, select, textarea, label');
      if (ctl && ctl !== card && card.contains(ctl)) return;
      if (ctl === card && card.classList.contains('is-flipped')) return;
      e.preventDefault();
      set(!card.classList.contains('is-flipped'));
    });
    /* focus landing on the back face (Tab on any device) turns the card so the focused control is visible */
    card.addEventListener('focusin', function (e) { var b = e.target.closest && e.target.closest('.flip__back'); if (b && card.contains(b)) set(true); });
    card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) set(false); });
  }

  /* ---------- disco-ball light flecks ---------- */
  var dio = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { en.target.classList.toggle('disco--live', en.isIntersecting); });
  }, { rootMargin: '120px 0px' }) : null;
  var DISCO_KEEP = 'h1, h2, h3, h4, h5, h6, p, li, dt, dd, blockquote, figcaption, address, label, .btn, .kicker, .chip, .status-pill, img, picture, video, .stub, .ticket, .card, .pricecard, .deli-card, .store-card';
  function discoify(host, n) {
    if (host.__disco) return; host.__disco = 1;
    /* the layer is appended to a band, never into a grid / flex row of cards (it would shift :nth-child rules) */
    var sec = host;
    if (host.tagName !== 'SECTION' && /grid|flex/.test(getComputedStyle(host).display)) sec = host.closest('section, .band') || host;
    if (sec !== host && sec.__disco) return; sec.__disco = 1;
    staticPos(sec);
    sec.classList.add('disco-host');
    var layer = doc.createElement('div'); layer.className = 'disco'; layer.setAttribute('aria-hidden', 'true');
    sec.appendChild(layer);
    /* sharp 2-4 px facet specks, at most ~12 in a viewport, placed only in the section's open space: every heading,
       line of copy, button, image and card (padded, plus the speck's short drift path) is kept clear, so no speck ever
       sits over or between the letters. Re-placed when the section's width changes (the layout reflows). */
    var lastW = -1;
    var lay = function () {
      var r = sec.getBoundingClientRect();
      if (!r.width || !r.height || Math.abs(r.width - lastW) < 2) return;
      lastW = r.width;
      var narrow = r.width < 700, pad = narrow ? 8 : 30, dd = narrow ? 14 : 40;
      var keep = $$(DISCO_KEEP, sec).filter(function (el) { return !el.closest('.disco, [aria-hidden="true"]') && el.getClientRects().length; }).map(function (el) {
        var b = el.getBoundingClientRect();
        return [b.left - r.left - pad, b.top - r.top - pad, b.right - r.left + pad + dd, b.bottom - r.top + pad];
      });
      var target = Math.round(Math.max(5, Math.min(12, (r.width * Math.min(r.height, 1000)) / 100000)));
      var spots = [], tries = 0;
      while (spots.length < target && tries < 600) {
        tries++;
        var x = 30 + hash(tries + n * 53, 7) * (r.width - 60), y = 46 + hash(n * 17 + 3, tries + 29) * (r.height - 92);
        if (keep.some(function (k) { return x >= k[0] && x <= k[2] && y >= k[1] && y <= k[3]; })) continue;
        if (spots.some(function (p) { return Math.abs(p[0] - x) < (narrow ? 40 : 90) && Math.abs(p[1] - y) < 70; })) continue;
        spots.push([x, y]);
      }
      layer.textContent = '';
      spots.forEach(function (p, i) {
        var c = hash(i + 7, n + 13), d = hash(i + 19 + n, 17), e = hash(i + 31, n + 5);
        var dur = 15 + c * 9, tw = 2.6 + d * 2.4;
        var f = doc.createElement('i'); f.className = 'disco__f' + (d > 0.62 ? ' disco__f--hi' : '') + (e > 0.7 ? ' disco__f--plain' : '');
        f.style.cssText = '--x:' + p[0].toFixed(1) + 'px;--y:' + p[1].toFixed(1) + 'px;--s:' + (2 + c * 2).toFixed(1) + 'px;--o:' + (0.7 + d * 0.3).toFixed(2) + ';--dd:' + dd + 'px;--dur:' + dur.toFixed(1) + 's;--td:-' + (e * dur).toFixed(1) + 's;--tw:' + tw.toFixed(2) + 's;--tt:-' + (c * tw).toFixed(2) + 's';
        layer.appendChild(f);
      });
    };
    lay();
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(lay, 220); }, { passive: true });
    window.addEventListener('load', function () { lastW = -1; lay(); });
    try { doc.fonts.ready.then(function () { lastW = -1; lay(); }); } catch (e) {}
    if (reduce) return;
    if (dio) dio.observe(sec); else sec.classList.add('disco--live');
  }

  /* ---------- generic venetian blinds over a media box ---------- */
  function blindify(box) {
    if (box.__blinds || reduce || box.closest('[data-hero], .phero, .hero') || box.querySelector('[class*="slat"]')) return;
    box.__blinds = 1;
    staticPos(box);
    var n = Math.max(4, Math.min(16, parseInt(box.getAttribute('data-blinds'), 10) || 8));
    var fx = doc.createElement('span'); fx.className = 'blinds-fx'; fx.setAttribute('aria-hidden', 'true'); fx.style.setProperty('--n', n);
    for (var k = 0; k < n; k++) { var s = doc.createElement('span'); s.style.setProperty('--k', k); fx.appendChild(s); }
    box.appendChild(fx);
    watch(box, function () { fx.classList.add('is-open'); setTimeout(function () { if (fx.parentNode) fx.parentNode.removeChild(fx); }, 1600); });
  }

  /* ---------- live OPEN / CLOSED (Minnesota time, noon to 8 every day; same logic and strings as site.js) ---------- */
  function mnNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var m = {}; parts.forEach(function (p) { m[p.type] = p.value; });
      return (parseInt(m.hour, 10) % 24) + parseInt(m.minute, 10) / 60;
    } catch (e) { var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  }
  function signs() {
    var h = mnNow(), open = h >= 12 && h < 20;
    var txt = open ? 'Open now · until 8 pm' : (h < 12 ? 'Closed · opens at noon today' : 'Closed · opens at noon tomorrow');
    $$('[data-neon-sign]').forEach(function (s) { s.classList.toggle('is-open', open); s.classList.toggle('is-closed', !open); });
    $$('[data-open-status]').forEach(function (el) { if (el.textContent !== txt) el.textContent = txt; el.classList.toggle('is-closed', !open); });
  }
  function signify(s) {
    if (s.__sign) return; s.__sign = 1;
    if (reduce) { s.classList.add('is-on'); return; }
    watch(s, function () { s.classList.add('is-on'); });
  }

  /* ---------- home blinds intro ---------- */
  function intro() {
    if (!root.classList.contains('intro-hold')) return;
    var released = false, finished = false, timers = [];
    var release = function () { if (released) return; released = true; root.classList.remove('intro-hold'); try { window.dispatchEvent(new CustomEvent('md:intro-done')); } catch (e) {} };
    if (window.scrollY > 120) { release(); return; }
    var n = window.innerWidth < 760 ? 7 : 11;
    var ov = doc.createElement('div'); ov.className = 'intro'; ov.setAttribute('aria-hidden', 'true'); ov.style.setProperty('--n', n);
    for (var k = 0; k < n; k++) { var s = doc.createElement('span'); s.className = 'intro__slat'; s.style.setProperty('--k', k); s.style.setProperty('--c', Math.abs(k - (n - 1) / 2).toFixed(1)); ov.appendChild(s); }
    body.appendChild(ov);
    var EV = ['pointerdown', 'wheel', 'keydown', 'touchstart'];
    var finish = function (fast) {
      if (finished) return; finished = true;
      timers.forEach(clearTimeout);
      EV.forEach(function (t) { window.removeEventListener(t, skip, true); });
      window.removeEventListener('scroll', skip);
      release();
      ov.classList.add(fast ? 'is-skip' : 'is-gone');
      root.classList.remove('intro-run', 'intro-wait');
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, fast ? 260 : 420);
    };
    var skip = function () { finish(true); };
    var play = function () {
      root.classList.remove('intro-wait'); root.classList.add('intro-run');
      try { sessionStorage.setItem('mydealer-intro', '1'); } catch (e) {}
      requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('is-open'); }); });
      timers.push(setTimeout(release, 1020));
      timers.push(setTimeout(function () { finish(false); }, 1300));
      EV.forEach(function (t) { window.addEventListener(t, skip, { passive: true, capture: true }); });
      window.addEventListener('scroll', skip, { passive: true });
    };
    var gate = doc.querySelector('[data-agegate]');
    if (root.classList.contains('age-ok') || !gate) play();
    else {
      root.classList.add('intro-wait');
      var mo = new MutationObserver(function () { if (root.classList.contains('age-ok')) { mo.disconnect(); play(); } });
      mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------- scan + public refresh ---------- */
  function scan(ctx) {
    ctx = ctx || doc;
    $$(LAMP, ctx).forEach(lampify);
    $$(MAG, ctx).forEach(magnetize);
    $$('[data-flip]', ctx).forEach(flipify);
    $$('[data-disco]', ctx).forEach(discoify);
    $$('[data-blinds]', ctx).forEach(blindify);
    $$('[data-neon-sign]', ctx).forEach(signify);
  }
  MD.refresh = function (ctx) { try { if (MD.scan) MD.scan(ctx); } catch (e) {} scan(ctx); };
  try { intro(); } catch (e) { root.classList.remove('intro-hold', 'intro-run', 'intro-wait'); try { window.dispatchEvent(new CustomEvent('md:intro-done')); } catch (x) {} }
  scan(doc);
  signs(); setInterval(signs, 30000);
})();
