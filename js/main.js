/* ========================================
   KEBAB STATION KUMEU — Main JS
   Animations, scroll effects, interactions
   ======================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Motion library: loaded on the side, never blocking ──
  // This used to be a static top-level `import` of the CDN module. That
  // meant a blocked/slow/failed fetch (ad-blockers, flaky mobile networks,
  // a CDN outage) threw before a single line below ran — killing the nav
  // toggle, menu tabs, scroll-spy, and smooth-scroll along with the
  // animations. A dynamic import — raced against a timeout — lets
  // everything else wire up immediately regardless of whether this
  // resolves; only the reveal animations depend on its result.
  var motionReady = prefersReducedMotion
    ? Promise.resolve(null)
    : Promise.race([
        import('https://cdn.jsdelivr.net/npm/motion@11/+esm').catch(function () {
          return null;
        }),
        new Promise(function (resolve) {
          setTimeout(function () {
            resolve(null);
          }, 4000);
        }),
      ]);

  // ── Scroll progress bar ──
  var scrollProgress = document.getElementById('scroll-progress');

  function updateScrollProgress() {
    var scrollTop = window.pageYOffset;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgress.style.width = progress + '%';
  }

  // ── Header scroll effect ──
  var header = document.getElementById('header');

  // ── Mobile navigation ──
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');

  // ── Sticky mobile order bar ──
  // Shows once the hero (which has its own Call to Order button) has
  // scrolled out of view, so it never duplicates a CTA already on screen.
  // `inert` keeps it out of the tab/AT order while slid off-screen.
  var stickyOrder = document.getElementById('sticky-order');
  var heroSection = document.getElementById('hero');

  function updateStickyOrder() {
    if (!stickyOrder || !heroSection) return;
    var shouldShow =
      heroSection.getBoundingClientRect().bottom < 0 &&
      !navLinks.classList.contains('open');
    stickyOrder.classList.toggle('is-visible', shouldShow);
    stickyOrder.inert = !shouldShow;
  }

  // ── Keep the fixed header off the footer's own logo ──
  // The footer carries its own logo + tagline right at its top edge. On
  // short documents (mostly stacked single-column mobile layouts) that
  // lockup can scroll up far enough to sit directly under the fixed header,
  // reading as a confusing duplicate logo. Sliding the header away just
  // before the footer reaches it avoids the collision at any viewport
  // height, rather than guessing a fixed scroll-padding value.
  var footerEl = document.querySelector('.footer');

  function updateHeaderFooterAvoidance() {
    if (!footerEl) return;
    var tooClose = footerEl.getBoundingClientRect().top < header.offsetHeight;
    header.classList.toggle('at-footer', tooClose);
  }

  function onScroll() {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    updateScrollProgress();
    updateStickyOrder();
    updateHeaderFooterAvoidance();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener('click', function () {
    var isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', isOpen);
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    updateStickyOrder();
  });

  navLinks.querySelectorAll('.nav__link').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open menu');
      document.body.style.overflow = '';
      updateStickyOrder();
    });
  });

  // ── Scroll-spy nav ──
  // Highlights whichever section's nav link matches what's currently in
  // view. Only anchor links (not the tel: CTA) participate. A thin
  // horizontal band at viewport center — rather than the whole section —
  // decides "in view", so the swap happens once, near the middle of the
  // scroll through a section, instead of flickering at its edges.
  if ('IntersectionObserver' in window) {
    var spyLinkForId = {};
    document.querySelectorAll('.nav__link[href^="#"]').forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      if (document.getElementById(id)) spyLinkForId[id] = link;
    });

    var spyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = spyLinkForId[entry.target.id];
          if (link) link.classList.toggle('nav__link--active', entry.isIntersecting);
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    Object.keys(spyLinkForId).forEach(function (id) {
      spyObserver.observe(document.getElementById(id));
    });
  }

  // ── Plasticity buttons: squish reactive to where & how hard you press ──
  // Drives --px-frac/--py-frac/--pf custom properties (read by .is-pressed
  // rules in styles.css, for both .btn and .menu__tab) from live pointer
  // position + force. Real analog pressure (pen / Force Touch) is used when
  // the device reports it; mouse and plain touch report a flat 0.5 while
  // down, so those instead ramp up over the hold duration — a deliberate
  // press reads "harder" than a quick tap.
  if (!prefersReducedMotion) {
    document.querySelectorAll('.btn, .menu__tab').forEach(function (btn) {
      var pointerId = null;
      var pressStart = 0;
      var frameId = null;
      var lastPressure = 0;
      var lastPointerType = '';

      function clamp01(v) {
        return Math.max(0, Math.min(1, v));
      }

      function setPosition(clientX, clientY) {
        var rect = btn.getBoundingClientRect();
        btn.style.setProperty('--px-frac', clamp01((clientX - rect.left) / rect.width).toFixed(3));
        btn.style.setProperty('--py-frac', clamp01((clientY - rect.top) / rect.height).toFixed(3));
      }

      function tick() {
        var held = performance.now() - pressStart;
        var ramped = Math.min(held / 260, 1);
        var hasRealPressure = lastPointerType === 'pen' && lastPressure > 0 && lastPressure !== 0.5;
        var force = hasRealPressure ? lastPressure : 0.32 + ramped * 0.68;
        btn.style.setProperty('--pf', force.toFixed(3));
        if (pointerId !== null) {
          frameId = requestAnimationFrame(tick);
        }
      }

      function release() {
        pointerId = null;
        if (frameId) cancelAnimationFrame(frameId);
        btn.classList.remove('is-pressed');
        btn.style.setProperty('--pf', '0');
      }

      btn.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pointerId = e.pointerId;
        pressStart = performance.now();
        lastPressure = e.pressure;
        lastPointerType = e.pointerType;
        setPosition(e.clientX, e.clientY);
        btn.classList.add('is-pressed');
        tick();
      });

      btn.addEventListener('pointermove', function (e) {
        if (pointerId === null || e.pointerId !== pointerId) return;
        lastPressure = e.pressure;
        lastPointerType = e.pointerType;
        setPosition(e.clientX, e.clientY);
      });

      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
        btn.addEventListener(type, function (e) {
          if (pointerId !== null && e.pointerId === pointerId) release();
        });
      });
    });
  }

  // ── Combo card spotlight: cursor-follow glow ──
  // Mouse-only (a touch "hover" would just pin the glow wherever the tap
  // landed and never move it, which reads as a mistake rather than an
  // effect). Fade in/out is handled by the :hover rule in CSS; this just
  // keeps --mx/--my tracking the pointer while it's over the card.
  document.querySelectorAll('.combo-card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    });
  });

  // ── Scroll reveal: Motion inView() + spring animate() ──
  // .reveal elements start hidden via plain CSS (no transition — Motion now
  // owns the animated middle). revealStoppers holds each element's inView()
  // cancel function so the menu-tab switcher (below) can cut a pending
  // scroll-trigger short when a panel is shown before it was ever scrolled to.
  var revealStoppers = new Map();
  var animateFn = null; // filled in once motionReady resolves, if it does

  // Any [data-stagger] ancestor makes its .reveal descendants cascade in
  // with an incrementing delay instead of moving as one block — e.g. a
  // section's tag, then its heading, then its body, one after another.
  // Combo cards use the same mechanism for their card grid. Because
  // siblings inside one small group cross the inView threshold within a
  // few scroll-pixels of each other anyway, each still gets its own
  // independent inView() trigger below — the stagger comes entirely from
  // this delay, not from a shared group-level trigger.
  function staggerDelayFor(el) {
    var group = el.closest('[data-stagger]');
    if (!group) return 0;
    var siblings = Array.prototype.slice.call(group.querySelectorAll('.reveal'));
    var idx = siblings.indexOf(el);
    return idx > 0 ? idx * 0.1 : 0;
  }

  // Tracks which .reveal elements have already been triggered. Used instead
  // of checking classList for 'visible' because that class is no longer
  // added up front for the animated path (see below).
  var revealedEls = new WeakSet();

  function revealElement(el, shouldAnimate) {
    if (revealedEls.has(el)) return;
    revealedEls.add(el);
    if (!shouldAnimate || !animateFn) {
      el.classList.add('visible'); // CSS alone snaps it visible instantly
      return;
    }
    // Adding 'visible' here (as this used to) triggers the plain CSS
    // `.reveal.visible` rule — opacity:1, no transition — which paints the
    // element fully visible for one frame before Motion's spring animation
    // takes over and resets it back to the start. That read as a visible
    // flash-then-reset-then-animate glitch on every single section reveal.
    // Waiting until the animation finishes to add the class means the
    // element only ever shows the animation's own in-progress values.
    animateFn(
      el,
      { opacity: [0, 1], y: [28, 0] },
      {
        type: 'spring',
        stiffness: 120,
        damping: 18,
        mass: 0.8,
        delay: staggerDelayFor(el),
      }
    ).then(function () {
      el.classList.add('visible');
    });
  }

  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('visible');
    });
  } else {
    motionReady.then(function (mod) {
      if (!mod) {
        // Motion never arrived (CDN blocked/slow/down) — reveal everything
        // immediately rather than leaving content waiting on a library that
        // isn't coming.
        document.querySelectorAll('.reveal').forEach(function (el) {
          el.classList.add('visible');
        });
        return;
      }
      animateFn = mod.animate;
      document.querySelectorAll('.reveal').forEach(function (el) {
        var stop = mod.inView(
          el,
          function () {
            revealStoppers.delete(el);
            revealElement(el, true);
          },
          { amount: 0.12, margin: '0px 0px -30px 0px' }
        );
        revealStoppers.set(el, stop);
      });
    });
  }

  // ── Menu tabs ──
  var tabs = document.querySelectorAll('.menu__tab');
  var panels = document.querySelectorAll('.menu__panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var category = tab.getAttribute('data-category');

      tabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      panels.forEach(function (panel) {
        if (panel.getAttribute('data-panel') === category) {
          panel.classList.add('active');
          panel.querySelectorAll('.reveal').forEach(function (el) {
            var stop = revealStoppers.get(el);
            if (stop) {
              stop();
              revealStoppers.delete(el);
            }
            revealElement(el, false);
          });
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // ── Hero fade-up elements ──
  function revealHeroElements() {
    var fadeEls = document.querySelectorAll('.hero .fade-up');
    fadeEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // Trigger hero animations on load
  if (!prefersReducedMotion) {
    setTimeout(revealHeroElements, 300);
  } else {
    document.querySelectorAll('.fade-up').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var headerOffset = 84;
        var elementPosition = target.getBoundingClientRect().top;
        var offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
})();
