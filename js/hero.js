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

  // ── Scroll-scrubbed rotation (prototype) ──
  // Instead of looping on its own timer, the donor's rotation is driven
  // directly by scroll position through the hero: scrolling down spins it,
  // stopping freezes it mid-turn. Manual currentTime seeking replaces
  // autoplay/loop entirely — the two would otherwise fight each other.
  video.removeAttribute('autoplay');
  video.removeAttribute('loop');
  video.pause();

  var duration = 0;
  var ticking = false;
  var seekingNow = false;
  video.addEventListener('seeking', function () { seekingNow = true; });
  video.addEventListener('seeked', function () { seekingNow = false; });

  var track = document.getElementById('hero-scroll-track') || hero;

  function applyScrubFrame() {
    ticking = false;
    if (!duration || seekingNow) return;

    // The hero is pinned (position: sticky) inside a taller track, so its
    // own rect stays put at top:0 while stuck — progress has to come from
    // how far we've scrolled through the taller track instead. Dividing by
    // the full track height (not just the sticky portion) spreads the
    // rotation across the pin phase *and* the natural scroll-off that
    // follows, so the donor is still visibly turning as the next section
    // slides into view instead of sitting frozen for that whole stretch.
    var rect = track.getBoundingClientRect();
    var progress = rect.height > 0 ? -rect.top / rect.height : 0;
    progress = Math.max(0, Math.min(1, progress));

    // The source clip is a boomerang (forward half, then the same frames
    // played in reverse) built for ambient looping, not a real 360° spin —
    // see feedback_video_loops memory. Only the forward half is a genuine
    // one-direction turn, so that's the only part scroll should scrub
    // through; scrubbing the back half would visibly un-rotate the donor.
    // One full scroll pass through the hero = one single pass through it,
    // slow and deliberate rather than looping multiple times.
    var forwardHalf = duration / 2;
    var time = progress * forwardHalf;

    // Never land exactly on the half-duration boundary — some browsers
    // stall/flicker seeking right at a boundary.
    time = Math.min(time, forwardHalf - 0.05);

    if (Math.abs(video.currentTime - time) > 0.01) {
      video.currentTime = time;
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyScrubFrame);
  }

  function init() {
    duration = video.duration || 0;
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (video.readyState >= 1) {
    init();
  } else {
    video.addEventListener('loadedmetadata', init, { once: true });
  }
})();
