/* ========================================
   KEBAB STATION KUMEU — Hero Video
   Respects reduced motion, pauses off-screen
   ======================================== */

(function () {
  'use strict';

  var hero = document.getElementById('hero');
  if (!hero) return;

  // Hand off each headline line from its one-time entrance animation to the
  // perpetual float on the real animationend event, rather than lining up
  // two separate animations by matching delay/duration numbers — a class
  // swap driven by an actual event can't drift out of sync and pop.
  var titleLines = hero.querySelectorAll('.hero__title > span');
  titleLines.forEach(function (line) {
    line.addEventListener('animationend', function (e) {
      if (e.animationName === 'hero-word-in') {
        line.classList.add('hero__title--float');
      }
    });
  });

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var video = document.getElementById('hero-video');
  if (!video) return;

  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var isDataConscious = !!(connection && (connection.saveData || /2g/.test(connection.effectiveType || '')));

  // Reduced-motion and data-saver/slow-connection visitors both get the same
  // treatment: don't fetch the video at all, just show the static poster.
  if (prefersReducedMotion || isDataConscious) {
    video.removeAttribute('autoplay');
    video.pause();
    video.removeAttribute('src');
    video.load();
    return;
  }

  // ── Scroll-locked rotation ──
  // Real scrolling is held (see .hero-scroll-locked in styles.css) until the
  // donor has turned all the way through once: wheel/touch input advances a
  // virtual progress instead of moving the page, and only once that's
  // finished is the visitor let past the hero into the rest of the site.
  // Manual currentTime seeking replaces autoplay/loop entirely — the two
  // would otherwise fight each other.
  video.removeAttribute('autoplay');
  video.removeAttribute('loop');
  video.pause();

  var duration = 0;
  var seekingNow = false;
  video.addEventListener('seeking', function () { seekingNow = true; });
  video.addEventListener('seeked', function () { seekingNow = false; });

  var track = document.getElementById('hero-scroll-track') || hero;

  function applyProgress(progress) {
    if (!duration || seekingNow) return;

    // The source clip used to be a boomerang (a forward pass, then the
    // same frames in reverse) built for ambient looping. The shipped file
    // is trimmed to that forward pass alone, so one full pass through
    // `progress` 0→1 is one single, deliberate pass through the turn.
    var time = progress * duration;

    // Never land exactly on the final frame — some browsers stall or
    // flicker seeking right at a boundary.
    time = Math.min(time, duration - 0.05);

    if (Math.abs(video.currentTime - time) > 0.01) {
      video.currentTime = time;
    }
  }

  function trackHeight() {
    var height = track.getBoundingClientRect().height;
    return height > 0 ? height : 1;
  }

  var locked = false;
  // inputProgress is the raw target, advanced directly by wheel/touch deltas
  // (it can jump around a lot — trackpad momentum sends uneven, sometimes
  // large deltas in quick bursts). smoothedProgress is what's actually
  // applied to the video, eased toward that target every frame rather than
  // snapped straight to it — video seeking has real decode latency, and
  // applying every raw input delta synchronously is what read as stutter
  // the first time this shipped. Gating the lock's release on the *smoothed*
  // value reaching the end (not the raw input) means a fast flick can't
  // release the page before the rotation has actually finished playing out
  // on screen — the actual point of holding scroll here in the first place.
  var inputProgress = 0;
  var smoothedProgress = 0;
  var touchStartY = null;
  var rafId = null;

  var SMOOTHING = 0.15;
  var SETTLE_EPSILON = 0.0006;

  function engageLock() {
    locked = true;
    document.documentElement.classList.add('hero-scroll-locked');
  }

  function releaseLock() {
    locked = false;
    document.documentElement.classList.remove('hero-scroll-locked');
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick() {
    rafId = null;
    var delta = inputProgress - smoothedProgress;
    if (Math.abs(delta) < SETTLE_EPSILON) {
      smoothedProgress = inputProgress;
      applyProgress(smoothedProgress);
      if (smoothedProgress >= 1 - SETTLE_EPSILON) releaseLock();
      return; // caught up — stop ticking until the next input restarts it
    }
    smoothedProgress += delta * SMOOTHING;
    applyProgress(smoothedProgress);
    rafId = requestAnimationFrame(tick);
  }

  function requestTick() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  function advance(deltaY) {
    if (!locked) return;
    inputProgress = Math.max(0, Math.min(1, inputProgress + deltaY / trackHeight()));
    requestTick();
  }

  function onWheel(e) {
    if (!locked) return;
    e.preventDefault();
    advance(e.deltaY);
  }

  function onTouchStart(e) {
    if (!locked) return;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (!locked || touchStartY === null) return;
    e.preventDefault();
    var y = e.touches[0].clientY;
    advance(touchStartY - y);
    touchStartY = y;
  }

  function onTouchEnd() {
    touchStartY = null;
  }

  // Keyboard scrolling releases the lock outright rather than being eased
  // like wheel/touch: overflow: hidden (see styles.css) would otherwise
  // block a keyboard user's Space/Page Down/arrow-key scrolling exactly as
  // hard as it blocks the mouse, and unlike a mouse or thumb there's no
  // other gesture for them to retry with. Not preventing default here means
  // the key's normal scroll behaviour still runs immediately after, on a
  // now-unlocked page.
  var SCROLL_KEYS = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'];
  function onKeydown(e) {
    if (!locked) return;
    if (SCROLL_KEYS.indexOf(e.key) === -1) return;
    releaseLock();
  }

  // A nav-link click (main.js) is explicit "take me there now" intent —
  // release the lock rather than fight that scroll or make someone who
  // already knows where they're going sit through the rest of the video.
  window.addEventListener('navscrollstart', function () {
    if (locked) releaseLock();
  });

  function init() {
    duration = video.duration || 0;
    applyProgress(0);

    // Only lock if the visitor is actually starting at the hero. A direct
    // link straight to e.g. #menu is the clearest case to skip — but the
    // browser's own scroll-to-fragment for it can happen on its own
    // schedule, sometimes after this runs, so checking scroll position
    // alone isn't reliable: engaging the lock (and its overflow: hidden)
    // right before that happens would block the fragment scroll completely,
    // trapping the visitor at the hero they specifically linked past. The
    // hash is known upfront and never changes underneath this check.
    if (window.location.hash && window.location.hash !== '#') return;
    if (track.getBoundingClientRect().top > 40) return;

    engageLock();
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  if (video.readyState >= 1) {
    init();
  } else {
    video.addEventListener('loadedmetadata', init, { once: true });
  }
})();
