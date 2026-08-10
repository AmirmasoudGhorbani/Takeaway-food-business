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

  // ── Scroll-scrubbed rotation ──
  // The donor's rotation tracks real scroll position through the hero —
  // scrolling down spins it, scrolling back up rewinds it. This never
  // touches native scrolling itself: no overflow: hidden, no
  // preventDefault on wheel/touch, nothing that could ever leave a visitor
  // unable to scroll. An earlier version held scroll entirely until the
  // rotation finished once, which broke scrolling outright on at least one
  // real phone — gone now in favour of this simpler, always-native-scroll
  // approach, at the cost of a fast scroll being able to carry a visitor
  // past the hero before the turn fully plays out.
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

  // The hero is pinned (position: sticky) inside a taller track, so its own
  // rect stays put at top:0 while stuck — progress has to come from how far
  // we've scrolled through the taller track instead. Dividing by the full
  // track height (not just the sticky portion) spreads the rotation across
  // the pin phase *and* the natural scroll-off that follows, so the donor
  // is still visibly turning as the next section slides into view instead
  // of sitting frozen for that whole stretch.
  function computeTargetProgress() {
    var rect = track.getBoundingClientRect();
    var progress = rect.height > 0 ? -rect.top / trackHeight() : 0;
    return Math.max(0, Math.min(1, progress));
  }

  // Eases the displayed frame toward wherever scroll currently is, instead
  // of snapping straight to it on every scroll tick. Scroll input itself is
  // naturally uneven (mouse-wheel notches, trackpad momentum), and video
  // seeking has real decode latency, so a direct 1:1 mapping reads as
  // stutter — this smooths over both without changing how far a given
  // amount of scrolling turns the donor.
  var SMOOTHING = 0.08;
  var SETTLE_EPSILON = 0.0006;
  var smoothedProgress = 0;
  var rafId = null;

  function tick() {
    rafId = null;

    // A nav-link click can trigger a long native smooth-scroll back through
    // this pinned track. Seeking the video on every tick of that animation
    // would compete with it for the main thread and show up as scroll
    // jank, so scrubbing sits the animation out here and catches up in a
    // single seek once main.js dispatches 'navscrollend'.
    if (window.__navScrolling) return;

    var target = computeTargetProgress();
    var delta = target - smoothedProgress;
    if (Math.abs(delta) < SETTLE_EPSILON) {
      smoothedProgress = target;
      applyProgress(smoothedProgress);
      return; // caught up — stop ticking until the next scroll restarts it
    }
    smoothedProgress += delta * SMOOTHING;
    applyProgress(smoothedProgress);
    rafId = requestAnimationFrame(tick);
  }

  function onScroll() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('navscrollend', function () {
    // Catches up in one immediate jump once a nav-triggered scroll settles,
    // rather than easing all the way from wherever this was paused.
    smoothedProgress = computeTargetProgress();
    applyProgress(smoothedProgress);
  });

  function init() {
    duration = video.duration || 0;
    smoothedProgress = computeTargetProgress();
    applyProgress(smoothedProgress);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (video.readyState >= 1) {
    init();
  } else {
    video.addEventListener('loadedmetadata', init, { once: true });
  }
})();
