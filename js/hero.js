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
  // Instead of looping on its own timer, the donor's rotation is driven by
  // scroll input: scrolling down spins it, stopping freezes it mid-turn.
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

    var time = progress * duration;

    // Never land exactly on the final frame — some browsers stall or
    // flicker seeking right at a boundary.
    time = Math.min(time, duration - 0.05);

    if (Math.abs(video.currentTime - time) > 0.01) {
      video.currentTime = time;
    }
  }

  // The page is held still — real scrolling never happens — until the clip
  // has been scrubbed all the way through once; only then is the visitor
  // let past the hero into the rest of the page. lockProgress is a virtual
  // scroll position, advanced directly by wheel/touch input rather than by
  // watching real scroll position (which can't move while locked).
  //
  // Keyboard scrolling is never throttled the way wheel/touch are — arrow
  // keys, Page Down/Up and Space just release the lock outright (see
  // onKeydown below) and let that key's normal scroll run immediately
  // after, so a keyboard-only visitor is never trapped behind an animation.
  // That's a one-way door only mouse/touch scrolling opens gradually; the
  // full site is still one key-press away for anyone using a keyboard.
  var locked = false;
  var lockProgress = 0;
  var touchStartY = null;

  function trackHeight() {
    var height = track.getBoundingClientRect().height;
    return height > 0 ? height : 1;
  }

  function engageLock() {
    locked = true;
    document.documentElement.classList.add('hero-scroll-locked');
  }

  function releaseLock() {
    locked = false;
    document.documentElement.classList.remove('hero-scroll-locked');
  }

  function advance(deltaY) {
    if (!locked) return;
    lockProgress = Math.max(0, Math.min(1, lockProgress + deltaY / trackHeight()));
    applyProgress(lockProgress);
    if (lockProgress >= 1) releaseLock();
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

  // Keyboard scrolling releases the lock outright rather than being
  // throttled like wheel/touch: overflow: hidden (see styles.css) would
  // otherwise block a keyboard user's Space/Page Down/arrow-key scrolling
  // just as completely as it blocks the mouse, and unlike a mouse or thumb
  // there's no gesture left for them to retry with. Not preventing default
  // here means the key's normal scroll behaviour still runs immediately
  // afterward, on a now-unlocked page.
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
