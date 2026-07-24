/* ========================================
   KEBAB STATION KUMEU — Reviews deck
   Draggable fanned-card stack. Dragging the
   front card past the threshold sends it to
   the back of the deck and promotes the next.

   Gesture detection (pointerdown/move/up) stays hand-rolled — Motion's
   vanilla build has no standalone `drag` gesture (that's React-only, tied
   to React's reconciliation). What Motion adds here is real spring physics
   on release: the fly-off/snap-back picks up the velocity of the flick
   instead of animating on a fixed CSS easing curve.
   ======================================== */

import { animate } from "https://cdn.jsdelivr.net/npm/motion@11/+esm";

(function () {
  'use strict';

  var deck = document.getElementById('reviews-deck');
  if (!deck) return;

  var prevBtn = document.getElementById('reviews-deck-prev');
  var nextBtn = document.getElementById('reviews-deck-next');
  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  var DRAG_THRESHOLD = 90;
  var VELOCITY_SAMPLE_WINDOW = 100; // ms of pointer history used to estimate release velocity

  var dragging = false;
  var activeCard = null;
  var startX = 0;
  var startY = 0;
  var dx = 0;
  var dy = 0;
  var velocitySamples = [];

  function frontCard() {
    return deck.firstElementChild;
  }

  function trackVelocitySample(x) {
    var now = performance.now();
    velocitySamples.push({ t: now, x: x });
    while (
      velocitySamples.length > 2 &&
      now - velocitySamples[0].t > VELOCITY_SAMPLE_WINDOW
    ) {
      velocitySamples.shift();
    }
  }

  // px/s, from the last ~100ms of pointer movement — fed into the spring as
  // its initial velocity so a fast flick keeps carrying the card afterwards
  // instead of the release feeling disconnected from the gesture.
  function releaseVelocityX() {
    if (velocitySamples.length < 2) return 0;
    var first = velocitySamples[0];
    var last = velocitySamples[velocitySamples.length - 1];
    var dt = (last.t - first.t) / 1000;
    if (dt <= 0) return 0;
    return (last.x - first.x) / dt;
  }

  function sendToBack(card, fromX, fromY, fromRotate, flyX, flyY, flyRotate, velocity) {
    if (prefersReducedMotion || flyX === undefined) {
      deck.appendChild(card);
      card.style.transform = '';
      card.style.opacity = '';
      return;
    }

    // is-dragging suspends the base CSS transition so it doesn't fight the
    // WAAPI-driven spring while Motion is animating this card's transform.
    card.classList.add('is-dragging');

    // The x/y/rotate spring is overdamped (damping set above critical for
    // this stiffness/mass) so it settles in one decisive motion instead of
    // oscillating — a flung-away card shouldn't wobble. It regularly
    // outlasts the fixed-duration fade below.
    var flight = animate(
      card,
      { x: [fromX, flyX], y: [fromY, flyY], rotate: [fromRotate, flyRotate] },
      { type: 'spring', velocity: velocity || 0, stiffness: 280, damping: 36, mass: 0.7 }
    );

    // Fixed-duration fade drives the DOM reorder timing, so promoting the
    // next card never has to wait on the spring settling.
    var fade = animate(card, { opacity: [1, 0] }, { duration: 0.28, easing: 'ease-out' });
    fade.then(function () {
      deck.appendChild(card);
    });

    // Motion shares one render loop per element across all of its active
    // animations, so as long as the spring is still ticking it keeps
    // re-applying this card's *entire* cached style — including opacity,
    // already finished above — on every frame. Resetting inline styles
    // before every animation on the card has actually finished lets a
    // trailing spring frame stomp the reset right back, permanently
    // stranding the card invisible off-screen the next time it cycles
    // back to the front of the deck.
    Promise.all([flight, fade]).then(function () {
      card.classList.remove('is-dragging');
      card.style.transform = '';
      card.style.opacity = '';
    });
  }

  function snapBack(card, fromX, fromY, fromRotate, velocity) {
    if (prefersReducedMotion) {
      card.classList.remove('is-dragging');
      card.style.transform = '';
      return;
    }
    // Just under critical damping for this stiffness/mass — a small, quick
    // settle-in wobble rather than the slower float a lower damping gives.
    animate(
      card,
      { x: [fromX, 0], y: [fromY, 0], rotate: [fromRotate, 0] },
      { type: 'spring', velocity: velocity || 0, stiffness: 500, damping: 30, mass: 0.5 }
    ).then(function () {
      card.classList.remove('is-dragging');
      card.style.transform = '';
    });
  }

  function bringToFront() {
    // Move the last card to the front (used for the "previous" control).
    var last = deck.lastElementChild;
    if (!last) return;
    deck.insertBefore(last, deck.firstElementChild);
  }

  function onPointerDown(e) {
    var card = e.target.closest('.review-card');
    if (!card || card !== frontCard()) return;

    activeCard = card;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dy = 0;
    velocitySamples = [{ t: performance.now(), x: e.clientX }];
    card.classList.add('is-dragging');
    if (card.setPointerCapture) card.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging || !activeCard) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    trackVelocitySample(e.clientX);
    var rotate = dx / 18;
    activeCard.style.transform =
      'translate(' + dx + 'px,' + dy + 'px) rotate(' + rotate + 'deg)';
  }

  function onPointerUp() {
    if (!dragging || !activeCard) return;
    dragging = false;
    var card = activeCard;
    activeCard = null;
    var rotate = dx / 18;
    var velocity = releaseVelocityX();

    if (Math.abs(dx) > DRAG_THRESHOLD) {
      var flyX = dx > 0 ? window.innerWidth : -window.innerWidth;
      var flyRotate = dx > 0 ? 26 : -26;
      sendToBack(card, dx, dy, rotate, flyX, dy, flyRotate, velocity);
    } else {
      snapBack(card, dx, dy, rotate, velocity);
    }
  }

  deck.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      var card = frontCard();
      if (!card) return;
      sendToBack(card, 0, 0, 0, window.innerWidth, 0, 26, 900);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      bringToFront();
    });
  }
})();
