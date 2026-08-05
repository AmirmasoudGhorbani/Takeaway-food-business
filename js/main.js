/* ========================================
   KEBAB STATION KUMEU — Main JS
   Animations, scroll effects, interactions
   ======================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Preloader ──
  // Keeps the page hidden behind a full-screen overlay until fonts, the
  // hero video's metadata, and every other initially-requested resource
  // have settled — so the first thing a visitor sees is the finished
  // layout, not fonts swapping in or the hero popping in mid-fetch. Runs
  // after hero.js (see index.html's script order: the two hero.js branches
  // that touch #hero-video's src both execute synchronously before this
  // module code runs), so checking the video's current src/readyState here
  // already reflects whichever path hero.js took. Capped at 5s so a slow
  // or blocked resource can never strand a visitor behind it, and the
  // <noscript> rule in index.html hides the overlay outright when this
  // script never runs at all.
  (function preload() {
    var preloader = document.getElementById('preloader');
    if (!preloader) return;

    var pageLoaded = new Promise(function (resolve) {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });

    var fontsReady =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    var heroVideo = document.getElementById('hero-video');
    var videoReady = new Promise(function (resolve) {
      if (!heroVideo || !heroVideo.hasAttribute('src') || heroVideo.readyState >= 1) {
        resolve();
        return;
      }
      heroVideo.addEventListener('loadedmetadata', resolve, { once: true });
      heroVideo.addEventListener('error', resolve, { once: true });
    });

    var timeout = new Promise(function (resolve) {
      setTimeout(resolve, 5000);
    });

    var ready = Promise.race([Promise.all([pageLoaded, fontsReady, videoReady]), timeout]);

    // The animated mark is a deliberate flourish, not just a stall
    // indicator, so it's held on screen for a minimum stretch even when
    // everything's ready instantly (a warm cache, a fast connection) —
    // otherwise it'd just flash. Reduced-motion visitors skip this: there's
    // no animation for the wait to show off, so it'd just be a delay.
    var minDisplay = prefersReducedMotion
      ? Promise.resolve()
      : new Promise(function (resolve) {
          setTimeout(resolve, 3000);
        });

    Promise.all([ready, minDisplay]).then(function () {
      preloader.classList.add('is-hidden');
      // transitionend covers the normal fade; the fallback timer catches
      // reduced-motion visitors, whose CSS drops the transition entirely
      // (so transitionend would never fire) and anyone else it might miss.
      var remove = function () {
        preloader.hidden = true;
      };
      preloader.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 700);
    });
  })();

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
  // Browsers with scroll-driven animations run this entirely in CSS off
  // the main thread (see .scroll-progress in styles.css); this JS path is
  // the fallback for the ones that don't, so it bails out rather than
  // fighting the CSS animation for control of the same element.
  var scrollProgress = document.getElementById('scroll-progress');
  var nativeScrollTimeline =
    window.CSS &&
    CSS.supports &&
    CSS.supports('animation-timeline: scroll()');

  function updateScrollProgress() {
    if (nativeScrollTimeline) return;
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

  // ── Mobile section jump bar + back to top ──
  // Both ride the same signal as the order bar: once the hero is behind
  // you, you are deep enough in a ~9-screen page to need a way around it.
  // `inert` keeps each out of the tab/AT order while hidden.
  var jumpBar = document.getElementById('jump-bar');
  var toTop = document.getElementById('to-top');
  var jumpLinks = jumpBar
    ? Array.prototype.slice.call(jumpBar.querySelectorAll('.jump-bar__link'))
    : [];

  function updateJumpBar() {
    if (!heroSection) return;
    var pastHero = heroSection.getBoundingClientRect().bottom < 0;
    var navOpen = navLinks.classList.contains('open');
    var show = pastHero && !navOpen;

    if (jumpBar) {
      jumpBar.classList.toggle('is-visible', show);
      jumpBar.inert = !show;
    }
    if (toTop) {
      toTop.classList.toggle('is-visible', show);
      toTop.inert = !show;
    }
    if (!show || !jumpLinks.length) return;

    // Highlight whichever section currently owns the upper third of the
    // viewport, so the bar doubles as a "you are here" indicator.
    // Picks the *lowest* section that has already started, by comparing
    // positions rather than by taking the last match in link order — the
    // chips don't have to be listed in document order for this to be
    // right, which they previously weren't (Combos sits above Build
    // Yours on the page but was listed after it, so Combos won every
    // time and Build Yours could never light up).
    var marker = window.innerHeight * 0.33;
    var current = null;
    var currentTop = -Infinity;
    jumpLinks.forEach(function (link) {
      var section = document.querySelector(link.getAttribute('href'));
      if (!section) return;
      var top = section.getBoundingClientRect().top;
      if (top <= marker && top > currentTop) {
        currentTop = top;
        current = link;
      }
    });
    jumpLinks.forEach(function (link) {
      link.classList.toggle('is-current', link === current);
    });
  }

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });
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

  // ── Find Us map: fade in once actually loaded ──
  // A live Google Maps embed takes a beat to fetch and paint — it's a real
  // page, not a static asset — so it starts at opacity 0 (see styles.css)
  // and only fades in on its own 'load' event, with the pulsing pin
  // placeholder showing underneath until then.
  var mapFrame = document.getElementById('find-us-map-frame');
  if (mapFrame) {
    var revealMap = function () {
      mapFrame.classList.add('is-loaded');
    };
    mapFrame.addEventListener('load', revealMap, { once: true });

    // The frame is loading="lazy" and sits far down the page, so its fetch
    // only begins once it nears the viewport — a fallback timer set at
    // page-load time would fire long before that. Starting it instead once
    // the frame actually scrolls into view keeps the safety net (never
    // leave the map permanently hidden behind the placeholder if 'load'
    // is somehow missed) correctly tied to when loading really starts.
    if ('IntersectionObserver' in window) {
      var mapObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              setTimeout(revealMap, 6000);
              mapObserver.disconnect();
            }
          });
        },
        { rootMargin: '200px' }
      );
      mapObserver.observe(mapFrame);
    } else {
      setTimeout(revealMap, 6000);
    }
  }

  // ── Scroll-linked ambient glow ──
  // Drifts the .scroll-glow radial gradient (see index.html/styles.css)
  // slowly down the viewport as the page scrolls, so the sections read as
  // one continuous, gently lit space instead of each sitting flat on the
  // same static background.
  var docEl = document.documentElement;
  var scrollGlow = document.getElementById('scroll-glow') || document.querySelector('.scroll-glow');

  function updateAmbientGlow() {
    if (!scrollGlow) return;
    var docHeight = docEl.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? Math.max(0, Math.min(1, window.pageYOffset / docHeight)) : 0;
    docEl.style.setProperty('--glow-y', (15 + progress * 70).toFixed(1) + '%');
  }

  function onScroll() {
    updateScrollProgress();
    updateStickyOrder();
    updateJumpBar();
    updateHeaderFooterAvoidance();
    updateAmbientGlow();
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
    updateJumpBar();
  });

  navLinks.querySelectorAll('.nav__link').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open menu');
      document.body.style.overflow = '';
      updateStickyOrder();
      updateJumpBar();
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

  // ── Count-up stats ──
  // Animates any [data-count-to] element from 0 to its target once it
  // scrolls into view. A plain rAF tween rather than routing through
  // Motion — the one place on the page a number actually counts up
  // shouldn't need a CDN fetch to succeed first.
  var countEls = document.querySelectorAll('[data-count-to]');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    countEls.forEach(function (el) {
      el.textContent = el.getAttribute('data-count-to') + (el.getAttribute('data-count-suffix') || '');
    });
  } else {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          countObserver.unobserve(el);
          var target = parseFloat(el.getAttribute('data-count-to'));
          var suffix = el.getAttribute('data-count-suffix') || '';
          var duration = 900;
          var start = null;
          function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
          }
          function tick(ts) {
            if (start === null) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            el.textContent = Math.round(target * easeOutCubic(progress)) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 }
    );
    countEls.forEach(function (el) {
      countObserver.observe(el);
    });
  }

  // ── Call-to-order click feedback ──
  // A quick confirm pulse on every tel: CTA before the browser hands off to
  // the dialer — the tap otherwise gets zero visual acknowledgement beyond
  // the browser's own (inconsistent) native tap highlight.
  if (!prefersReducedMotion) {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      var confirmTimer = null;
      link.addEventListener('click', function () {
        link.classList.remove('is-confirming');
        void link.offsetWidth;
        link.classList.add('is-confirming');
        // Removed afterwards rather than left permanently on: .is-confirming
        // repurposes .btn's existing ::after (the plasticity press "dent",
        // see below) for the ring instead, and that has to be free again
        // for the next press.
        window.clearTimeout(confirmTimer);
        confirmTimer = window.setTimeout(function () {
          link.classList.remove('is-confirming');
        }, 600);
      });
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

  // ── Card spotlight + magnetic tilt: cursor-follow glow and a subtle 3D
  // lean toward the pointer ──
  // Mouse-only (a touch "hover" would just pin the glow/tilt wherever the
  // tap landed and never move it, which reads as a mistake rather than an
  // effect). The glow's fade in/out is handled by the :hover rule in CSS;
  // this keeps --mx/--my tracking the pointer and --tilt-x/--tilt-y driving the
  // perspective(...) rotate in the .combo-card / .menu-item / .story__image
  // transform.
  if (!prefersReducedMotion) {
    var TILT_MAX_DEG = 6;
    document.querySelectorAll('.combo-card, .menu-item, .story__image').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var rect = card.getBoundingClientRect();
        var xFrac = (e.clientX - rect.left) / rect.width;
        var yFrac = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', xFrac * 100 + '%');
        card.style.setProperty('--my', yFrac * 100 + '%');
        card.style.setProperty('--tilt-x', ((xFrac - 0.5) * 2 * TILT_MAX_DEG).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', ((0.5 - yFrac) * 2 * TILT_MAX_DEG).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse') return;
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

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
      { opacity: [0, 1], y: [40, 0], scale: [0.96, 1] },
      {
        type: 'spring',
        stiffness: 140,
        damping: 15,
        mass: 0.8,
        delay: staggerDelayFor(el),
      }
    ).then(function () {
      el.classList.add('visible');
      // Motion shares one render loop per element across all of its active
      // animations (see the same note in reviews-deck.js), so a trailing
      // settle frame can still land — and re-apply this animation's cached
      // inline opacity/transform — one tick after this .then() fires.
      // Clearing on the next frame instead of immediately lets that
      // trailing write happen first, so it's not the one stomping the
      // clear back. Without it the inline style (opacity:1; transform:none)
      // just sits there outranking anything else .reveal.visible's
      // transform also needs to carry — the card tilt's --tilt-x/--tilt-y
      // rotate, added below.
      requestAnimationFrame(function () {
        el.style.opacity = '';
        el.style.transform = '';
      });
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
  var tabList = Array.prototype.slice.call(tabs);

  function swapPanels(tab) {
    var category = tab.getAttribute('data-category');

    tabs.forEach(function (t) {
      var isActive = t === tab;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      // Roving tabindex: only the selected tab is in the tab order, so Tab
      // moves past the whole tablist in one press and the arrow keys below
      // are what move between tabs — the pattern role="tablist" implies.
      t.setAttribute('tabindex', isActive ? '0' : '-1');
    });

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
  }

  // startViewTransition defers its callback until the browser has snapshot
  // the old state, so two swaps started close together can run their
  // callbacks out of order and leave the wrong panel showing. Tracking the
  // latest requested tab and reading it *inside* the callback (rather than
  // closing over whichever tab started that particular transition) means
  // every callback converges on the same, most-recent answer no matter
  // what order they land in.
  var pendingTab = null;

  // `animate: false` skips the transition entirely — used for keyboard
  // arrow navigation, where waiting on a crossfade before the panel
  // updates would make arrowing through nine tabs feel unresponsive.
  function activateTab(tab, opts) {
    pendingTab = tab;
    var animate = !(opts && opts.animate === false);

    if (!animate || prefersReducedMotion || !document.startViewTransition) {
      swapPanels(pendingTab);
      return;
    }
    try {
      document.startViewTransition(function () {
        swapPanels(pendingTab);
      });
    } catch (e) {
      swapPanels(pendingTab);
    }
  }

  tabs.forEach(function (tab, i) {
    tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');

    tab.addEventListener('click', function () {
      activateTab(tab);
    });

    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = tabList[(i + 1) % tabList.length];
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = tabList[(i - 1 + tabList.length) % tabList.length];
      } else if (e.key === 'Home') {
        next = tabList[0];
      } else if (e.key === 'End') {
        next = tabList[tabList.length - 1];
      }
      if (!next) return;
      e.preventDefault();
      activateTab(next, { animate: false });
      next.focus();
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

        // A nav click is explicit "take me there now" intent — jumping
        // straight past the hero's scroll lock (js/hero.js) rather than
        // making someone who already knows where they're going sit through
        // the rest of a video first.
        window.dispatchEvent(new Event('navscrollstart'));

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
})();
