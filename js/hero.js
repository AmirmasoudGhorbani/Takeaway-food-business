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
  // treatment: never set a src, so the video is never fetched and the
  // static poster stays.
  if (prefersReducedMotion || isDataConscious) {
    video.removeAttribute('autoplay');
    return;
  }

  var isPortraitSmall = window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;
  video.src = (isPortraitSmall && video.dataset.srcPortrait) || video.dataset.src;

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

  var poster = document.getElementById('hero-poster');
  var scrubbing = false;
  var posterHandedOff = false;
  var firstSeekComplete = false;
  var firstFramePresented = false;
  var duration = 0;
  var seekTimer = null;
  var lastSeekAt = -Infinity;
  var warming = false;
  var warmTimer = null;
  var mediaUnlocked = false;
  var warmGeneration = 0;
  var warmCleanup = null;
  var firstFrameTime = 0.001;

  // Turning the donor and handing off from the poster are two separate jobs,
  // deliberately not gated on each other.
  //
  // Scrubbing needs nothing but the clip's duration, so it starts as soon as
  // metadata lands. It must never wait on decoded media: iOS treats `preload`
  // as advisory and withholds media data until playback starts, so
  // `loadeddata`, readyState 2 and a presented frame can all be missing for
  // an entire visit. Holding the scroll listener behind those signals is what
  // left the hero frozen on real iPhones.
  function startScrubbing() {
    if (scrubbing || !duration) return;
    scrubbing = true;
    smoothedProgress = computeTargetProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Include scrolling that happened while the video was loading.
  }

  // The cosmetic half, which does wait for a real frame — that wait is what
  // keeps the first scroll from exposing a video with nothing drawn in it. If
  // the frame never comes, the poster just stays and scrolling carries on.
  function handOffPoster() {
    if (posterHandedOff || video.error || !firstSeekComplete || !firstFramePresented) return;
    posterHandedOff = true;
    if (poster) poster.classList.add('is-hidden');
    // Pick up wherever scroll has actually reached, rather than easing out of
    // whatever position startup happened to leave behind.
    smoothedProgress = computeTargetProgress();
    applyProgress(smoothedProgress);
  }

  // Runs from every event that can first make a frame drawable: on iOS the
  // completed seek and the arrival of data land in either order, so a
  // one-shot check inside a single handler misses whichever comes second.
  function noteFrameReady() {
    if (firstSeekComplete || video.seeking || video.readyState < 2) return;
    firstSeekComplete = true;
    // requestVideoFrameCallback is the precise signal where it fires, but a
    // paused video may never deliver one for a seek this small, so the
    // completed-seek paint runs too. Having the API must not be able to leave
    // the poster up forever.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        firstFramePresented = true;
        handOffPoster();
      });
    });
    handOffPoster();
  }

  video.addEventListener('error', function () {
    posterHandedOff = false;
    if (poster) poster.classList.remove('is-hidden');
  });
  video.addEventListener('seeked', function () {
    clearTimeout(seekTimer);
    seekTimer = null;
    noteFrameReady();
    if (scrubbing) onScroll();
  });
  video.addEventListener('canplay', noteFrameReady);
  video.addEventListener('loadeddata', noteFrameReady);

  var track = document.getElementById('hero-scroll-track') || hero;

  function seekTo(time) {
    clearTimeout(seekTimer);
    lastSeekAt = performance.now();
    try { video.currentTime = time; } catch (_) { return; }
    // Some suspended media pipelines omit seeked. Retry from current scroll
    // instead of keeping a separate event-driven seeking latch forever.
    seekTimer = setTimeout(function () {
      seekTimer = null;
      if (!document.hidden) applyProgress(computeTargetProgress(), true);
    }, 1000);
  }

  function applyProgress(progress, force) {
    // No readyState gate here: assigning currentTime on a metadata-only
    // video is precisely what makes iOS fetch and draw that frame. A failed
    // one is a different matter — seeking that throws, so it stays untouched
    // behind its poster while the page goes on scrolling normally.
    if (!scrubbing || !duration || video.error || document.hidden || warming) return;
    if (!force && video.seeking && performance.now() - lastSeekAt < 1000) return;

    // The source clip used to be a boomerang (a forward pass, then the
    // same frames in reverse) built for ambient looping. The shipped file
    // is trimmed to that forward pass alone, so one full pass through
    // `progress` 0→1 is one single, deliberate pass through the turn.
    var time = progress * duration;

    // Never land exactly on the final frame — some browsers stall or
    // flicker seeking right at a boundary.
    time = Math.max(firstFrameTime, Math.min(time, duration - 0.05));

    if (force || Math.abs(video.currentTime - time) > 0.01) {
      seekTo(time);
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
    if (!scrubbing || document.hidden || window.__navScrolling) return;

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
    if (!document.hidden && rafId === null) rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('navscrollend', function () {
    // Catches up in one immediate jump once a nav-triggered scroll settles,
    // rather than easing all the way from wherever this was paused.
    smoothedProgress = computeTargetProgress();
    applyProgress(smoothedProgress);
  });

  var started = false;

  function init() {
    if (started) return true;
    duration = video.duration;
    // readyState can report metadata before the duration is actually
    // readable, so a single early attempt must not be the only one.
    if (!Number.isFinite(duration) || duration <= 0) return false;
    started = true;
    firstFrameTime = Math.min(0.001, duration / 2);
    if (video.requestVideoFrameCallback) {
      video.requestVideoFrameCallback(function () {
        firstFramePresented = true;
        handOffPoster();
      });
    }
    // A paused video at exactly zero can still be displaying only its native
    // poster, even after loadeddata. Prime the decoder now, not on first
    // scroll — and on iOS this seek is also what prompts the fetch that
    // `preload` never triggered.
    seekTo(firstFrameTime);
    startScrubbing();
    return true;
  }

  // Muted play/pause primes media on devices that do not decode from preload
  // or seeks alone. A denied attempt is retried from an actual touch/click.
  function warmMedia() {
    if (warming || mediaUnlocked || document.hidden || video.error) return;
    warming = true;
    var generation = ++warmGeneration;
    video.muted = true;
    video.playsInline = true;
    function finish(success) {
      if (!warming || generation !== warmGeneration) return;
      clearTimeout(warmTimer);
      if (warmCleanup) { warmCleanup(); warmCleanup = null; }
      warming = false;
      if (success) mediaUnlocked = true;
      video.pause();
      init();
      noteFrameReady();
      if (scrubbing && success) applyProgress(computeTargetProgress(), true);
    }
    function waitForPicture() {
      if (!warming || generation !== warmGeneration) return;
      var startTime = video.currentTime;
      var frameId = null;
      function progressed() {
        if (!video.paused && !video.seeking && video.readyState >= 2 &&
            Math.abs(video.currentTime - startTime) >= 0.04) finish(true);
      }
      function presented() {
        if (!warming || generation !== warmGeneration) return;
        if (!video.seeking && video.readyState >= 2) finish(true);
        else frameId = video.requestVideoFrameCallback(presented);
      }
      warmCleanup = function () {
        video.removeEventListener('timeupdate', progressed);
        if (frameId !== null && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameId);
      };
      video.addEventListener('timeupdate', progressed);
      if (video.requestVideoFrameCallback) frameId = video.requestVideoFrameCallback(presented);
      // play() resolving only grants playback. Let Safari actually present a
      // new picture before pausing; immediate pause can preserve a stale frame.
    }
    warmTimer = setTimeout(function () { finish(false); }, 1500);
    try {
      var playing = video.play();
      if (playing && playing.then) playing.then(waitForPicture, function () { finish(false); });
      else waitForPicture();
    } catch (_) { finish(false); }
  }

  function suspend() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    clearTimeout(seekTimer);
    clearTimeout(warmTimer);
    if (warmCleanup) { warmCleanup(); warmCleanup = null; }
    seekTimer = null;
    warming = false;
    warmGeneration++;
    mediaUnlocked = false;
    video.pause();
  }

  function resume() {
    if (document.hidden) return;
    suspend();
    init();
    // Re-seek even if currentTime already matches: the compositor may have
    // discarded the displayed frame while this tab was in the background.
    smoothedProgress = computeTargetProgress();
    if (scrubbing) applyProgress(smoothedProgress, true);
    // readyState describes buffered data, not whether a suspended decoder is
    // presenting frames again. Re-prime after every return, even at state 4.
    warmMedia();
    onScroll();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) suspend();
    else resume();
  });
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', resume);
  window.addEventListener('touchend', warmMedia, { passive: true });
  window.addEventListener('click', warmMedia, { passive: true });

  // Metadata is the whole prerequisite: it carries the duration, and it is
  // the last readiness event an iPhone guarantees without playback. Whichever
  // of these first yields a usable duration starts the hero; the rest are
  // no-ops after that.
  if (!init()) {
    video.addEventListener('loadedmetadata', init);
    video.addEventListener('durationchange', init);
  }
  warmMedia();
})();
