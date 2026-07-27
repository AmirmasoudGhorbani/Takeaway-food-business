/* ========================================
   KEBAB STATION KUMEU — Build Your Kebab
   Reads option data-attributes, renders a
   live preview stack + summary + running total

   Pricing matches the real menu exactly, which prices Falafel/Super
   differently per base (e.g. Falafel is -$1 on a Wrap but -$2 on Rice) —
   so each base button carries its own data-price / data-price-falafel /
   data-price-super, and Falafel/Super are disabled on bases where the
   menu doesn't actually offer them (e.g. Meat on Chips is only ever
   Chicken/Lamb/Mixed).
   ======================================== */

(function () {
  'use strict';

  var stack = document.getElementById('builder-stack');
  var stack3d = document.getElementById('builder-stack-3d');
  var summary = document.getElementById('builder-summary');
  var totalEl = document.getElementById('builder-total');
  if (!stack || !stack3d || !summary || !totalEl) return;

  var groups = document.querySelectorAll('.builder__group');

  groups.forEach(function (group) {
    var mode = group.getAttribute('data-mode');
    var options = group.querySelectorAll('.builder__option');

    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (opt.disabled) return;
        if (mode === 'single') {
          if (opt.classList.contains('is-active')) return;
          options.forEach(function (o) {
            o.classList.remove('is-active');
            o.setAttribute('aria-checked', 'false');
          });
          opt.classList.add('is-active');
          opt.setAttribute('aria-checked', 'true');
        } else {
          var nowActive = opt.classList.toggle('is-active');
          opt.setAttribute('aria-pressed', nowActive ? 'true' : 'false');
        }
        update();
      });
    });
  });

  function getActive(groupName) {
    var group = document.querySelector('.builder__group[data-group="' + groupName + '"]');
    if (!group) return [];
    return Array.prototype.slice.call(group.querySelectorAll('.builder__option.is-active'));
  }

  // Disable Falafel/Super for whichever base doesn't offer them on the real
  // menu, and fall back the selection to Chicken if it's no longer valid.
  function syncMeatAvailability() {
    var base = getActive('base')[0];
    var meatGroup = document.querySelector('.builder__group[data-group="meat"]');
    var chickenBtn = meatGroup.querySelector('.builder__option[data-id="chicken"]');

    [
      { btn: meatGroup.querySelector('.builder__option[data-id="falafel"]'), key: 'priceFalafel' },
      { btn: meatGroup.querySelector('.builder__option[data-id="super"]'), key: 'priceSuper' }
    ].forEach(function (entry) {
      var available = !!(base && base.dataset[entry.key] !== undefined);
      entry.btn.disabled = !available;
      entry.btn.classList.toggle('is-disabled', !available);
      entry.btn.setAttribute('aria-disabled', available ? 'false' : 'true');
      if (!available && entry.btn.classList.contains('is-active')) {
        entry.btn.classList.remove('is-active');
        entry.btn.setAttribute('aria-checked', 'false');
        chickenBtn.classList.add('is-active');
        chickenBtn.setAttribute('aria-checked', 'true');
      }
    });
  }

  // Disable remaining inactive options once a capped multi-select group
  // (e.g. Sauces, data-max="3") has hit its limit.
  function syncMultiCaps() {
    document.querySelectorAll('.builder__group[data-mode="multi"][data-max]').forEach(function (group) {
      var max = parseInt(group.getAttribute('data-max'), 10);
      var options = group.querySelectorAll('.builder__option');
      var atMax = group.querySelectorAll('.builder__option.is-active').length >= max;
      options.forEach(function (opt) {
        if (opt.classList.contains('is-active')) return;
        opt.disabled = atMax;
        opt.classList.toggle('is-disabled', atMax);
        opt.setAttribute('aria-disabled', atMax ? 'true' : 'false');
      });
    });
  }

  function priceForCombo(base, meatId) {
    if (!base) return 0;
    if (meatId === 'falafel' && base.dataset.priceFalafel !== undefined) return parseFloat(base.dataset.priceFalafel);
    if (meatId === 'super' && base.dataset.priceSuper !== undefined) return parseFloat(base.dataset.priceSuper);
    return parseFloat(base.dataset.price) || 0;
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function iconSrc(option) {
    if (!option) return null;
    var img = option.querySelector('.builder__option-icon');
    return img ? img.getAttribute('src') : null;
  }

  function swatchColor(option) {
    var swatch = option.querySelector('.builder__option-swatch');
    return swatch ? swatch.style.getPropertyValue('--swatch').trim() : '#fff';
  }

  // ── Live "assembly bowl" preview ──
  // One universal container works for every base (a wrap, a rice box, a
  // salad bowl, a chip tray) — see the conversation this replaced the old
  // stacked-band preview from: swapping the container's *shape* per base
  // would mean every base+topping combination has to be checked in
  // whichever shape that base landed in. Here only what's scattered inside
  // ever changes; picking something drops its actual icon into the bowl at
  // a spot appropriate to what it is, instead of standing in for it with a
  // flat colored bar.
  var bowl = document.createElement('div');
  bowl.className = 'builder__bowl';
  bowl.setAttribute('aria-hidden', 'true');
  stack3d.appendChild(bowl);

  var particleLayer = document.createElement('div');
  particleLayer.className = 'builder__particle-layer';
  bowl.appendChild(particleLayer);

  // Fixed (not randomized-per-render) scatter tables, in % of the bowl's
  // own box. Base gets the most/largest points since it's filling the
  // whole floor; meat piles centrally; each salad gets its own fixed spot
  // around the rim (see saladSpots) so multiple salads read as separate
  // little piles instead of one blob; sauce is a thin drizzled trail
  // (see sauceSpots), drawn last/on top, same as real assembly order.
  var BASE_SPOTS = [
    { x: 24, y: 34, r: -12 }, { x: 38, y: 24, r: 18 }, { x: 52, y: 21, r: -6 },
    { x: 66, y: 26, r: 10 }, { x: 78, y: 36, r: -20 }, { x: 82, y: 52, r: 14 },
    { x: 75, y: 67, r: -8 }, { x: 60, y: 75, r: 6 }, { x: 44, y: 76, r: -16 },
    { x: 28, y: 68, r: 12 }, { x: 19, y: 52, r: -4 }, { x: 31, y: 49, r: 20 },
    { x: 50, y: 50, r: -10 }, { x: 66, y: 49, r: 8 }, { x: 45, y: 36, r: -18 },
    { x: 58, y: 61, r: 16 }
  ];
  var MEAT_SPOTS = [
    { x: 44, y: 45, r: -10 }, { x: 57, y: 43, r: 16 }, { x: 50, y: 55, r: -6 },
    { x: 38, y: 57, r: 12 }, { x: 62, y: 58, r: -14 }, { x: 50, y: 39, r: 8 }
  ];
  // 5 salad options, spread 72deg apart around the rim.
  var SALAD_ANGLES = { onion: 250, parsley: 322, tomato: 34, mixedcabbage: 106, lettuce: 178 };
  var SALAD_RX = 39, SALAD_RY = 33;
  var SALAD_JITTER = [{ x: -5, y: -3, r: -16 }, { x: 5, y: 4, r: 10 }, { x: -2, y: 6, r: 24 }];

  function saladSpots(option) {
    var angle = SALAD_ANGLES[option.dataset.id];
    if (angle === undefined) return [{ x: 50, y: 50, r: 0 }];
    var rad = (angle * Math.PI) / 180;
    var cx = 50 + Math.cos(rad) * SALAD_RX;
    var cy = 50 + Math.sin(rad) * SALAD_RY;
    return SALAD_JITTER.map(function (j) {
      return { x: cx + j.x, y: cy + j.y, r: j.r };
    });
  }

  // Each active sauce gets its own horizontal wavy trail, stacked in bands
  // so up to 3 sauces don't just draw over each other.
  function sauceSpots(band) {
    var y = 20 + band * 12;
    var pts = [];
    var count = 7;
    for (var i = 0; i < count; i++) {
      var t = i / (count - 1);
      pts.push({ x: 15 + t * 70, y: y + (i % 2 === 0 ? -3 : 3) });
    }
    return pts;
  }

  // Sauces need a stable trail band per option, not just their position in
  // the active array — an existing sauce's dots would otherwise jump to a
  // different band whenever another sauce gets added earlier in DOM order
  // (bands are assigned by array index, but the array is in fixed markup
  // order, not pick order). Each sauce keeps whichever of the 3 bands it's
  // first given until it's cleared, freeing that band back up.
  var sauceBandOf = {};

  function bandForSauce(id) {
    if (sauceBandOf[id] !== undefined) return sauceBandOf[id];
    var used = {};
    Object.keys(sauceBandOf).forEach(function (k) { used[sauceBandOf[k]] = true; });
    for (var b = 0; b < 3; b++) {
      if (!used[b]) {
        sauceBandOf[id] = b;
        return b;
      }
    }
    sauceBandOf[id] = 0; // shouldn't happen — sauces are capped at 3 active
    return 0;
  }

  var particleGroups = {}; // "prefix:optionId" -> element[]

  function makeParticle(src, spot, delayIndex, sizePx, zIndex) {
    var p = document.createElement('div');
    p.className = 'builder__particle' + (prefersReducedMotion ? '' : ' is-dropping');
    p.style.left = spot.x + '%';
    p.style.top = spot.y + '%';
    p.style.zIndex = zIndex;
    p.style.setProperty('--p-rot', (spot.r || 0) + 'deg');
    if (!prefersReducedMotion) p.style.animationDelay = (delayIndex * 0.05).toFixed(2) + 's';
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.width = sizePx;
    img.height = sizePx;
    p.appendChild(img);
    return p;
  }

  function makeDrizzleDot(color, spot, delayIndex) {
    var dot = document.createElement('div');
    dot.className = 'builder__drizzle-dot';
    dot.style.left = spot.x + '%';
    dot.style.top = spot.y + '%';
    dot.style.zIndex = 4;
    dot.style.background = color;
    if (!prefersReducedMotion) dot.style.animationDelay = (delayIndex * 0.04).toFixed(2) + 's';
    return dot;
  }

  function removeParticleEl(el) {
    if (prefersReducedMotion) {
      el.remove();
      return;
    }
    el.classList.add('is-leaving');
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', finish);
      el.remove();
    }
    el.addEventListener('transitionend', finish);
    setTimeout(finish, 300); // safety net if transitionend never fires
  }

  function clearGroup(key) {
    var els = particleGroups[key];
    if (!els) return;
    els.forEach(removeParticleEl);
    delete particleGroups[key];
  }

  // Diffs the active options in one category against what's currently on
  // the plate: removes groups for options no longer picked, leaves already-
  // settled ones alone (re-picking something already there shouldn't replay
  // its drop), and drops in anything newly active. buildFn(option, index)
  // returns the array of particle elements for that one option.
  function syncGroups(prefix, activeOptions, buildFn, onRemove) {
    var activeIds = {};
    activeOptions.forEach(function (o) { activeIds[o.dataset.id] = true; });
    Object.keys(particleGroups).forEach(function (key) {
      if (key.indexOf(prefix + ':') !== 0) return;
      var id = key.slice(prefix.length + 1);
      if (!activeIds[id]) {
        clearGroup(key);
        if (onRemove) onRemove(id);
      }
    });
    activeOptions.forEach(function (option, i) {
      var key = prefix + ':' + option.dataset.id;
      if (particleGroups[key]) return;
      var els = buildFn(option, i);
      els.forEach(function (el) { particleLayer.appendChild(el); });
      particleGroups[key] = els;
    });
  }

  // ── Look around the stack ──
  // --stack-rx/--stack-rz are set on .builder__stack itself (not the 3D
  // group directly) and read by .builder__stack-3d's transform through
  // ordinary CSS inheritance, so nothing here has to reach into the 3D
  // group or fight over who owns its transform. Mouse-only, same as the
  // card tilt in main.js — a touch "hover" would just pin the tilt wherever
  // the tap landed and never move it.
  if (!prefersReducedMotion) {
    var STACK_TILT_MAX_DEG = 10;
    stack.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var rect = stack.getBoundingClientRect();
      var xFrac = (e.clientX - rect.left) / rect.width;
      var yFrac = (e.clientY - rect.top) / rect.height;
      stack.style.setProperty('--stack-rx', ((0.5 - yFrac) * 2 * STACK_TILT_MAX_DEG).toFixed(2) + 'deg');
      stack.style.setProperty('--stack-rz', ((xFrac - 0.5) * 2 * STACK_TILT_MAX_DEG).toFixed(2) + 'deg');
    });
    stack.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      stack.style.setProperty('--stack-rx', '0deg');
      stack.style.setProperty('--stack-rz', '0deg');
    });
  }

  function bumpTotal(text) {
    var changed = totalEl.textContent !== text;
    totalEl.textContent = text;
    if (!changed || prefersReducedMotion) return;
    totalEl.classList.remove('is-bumping');
    void totalEl.offsetWidth;
    totalEl.classList.add('is-bumping');
  }

  function summaryRow(label, value) {
    var row = document.createElement('div');
    row.className = 'builder__summary-row';
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');
    dd.textContent = value || '—';
    row.appendChild(dt);
    row.appendChild(dd);
    return row;
  }

  function names(list) {
    return list.map(function (o) { return o.dataset.name; }).join(', ');
  }

  function update() {
    syncMeatAvailability();
    syncMultiCaps();

    var base = getActive('base')[0];
    var meat = getActive('meat')[0];
    var salads = getActive('salads');
    var sauces = getActive('sauces');
    var extras = getActive('extras');

    // ── bowl preview ──
    // Base and meat are single-select, but run through the same diffing
    // machinery as the multi-select salads/sauces below (just called with a
    // 0-or-1-item array) — swapping Chicken for Lamb then reads as exactly
    // what it is: the old group cleared, the new one dropped in, not a
    // special case.
    syncGroups('base', base ? [base] : [], function (option) {
      var src = iconSrc(option);
      if (!src) return [];
      return BASE_SPOTS.map(function (spot, i) {
        return makeParticle(src, spot, i, 24, 1);
      });
    });

    syncGroups('meat', meat ? [meat] : [], function (option) {
      var src = iconSrc(option);
      if (!src) return [];
      return MEAT_SPOTS.map(function (spot, i) {
        return makeParticle(src, spot, i, 27, 2);
      });
    });

    syncGroups('salads', salads, function (option) {
      var src = iconSrc(option);
      if (!src) return [];
      return saladSpots(option).map(function (spot, i) {
        return makeParticle(src, spot, i, 20, 3);
      });
    });

    syncGroups('sauces', sauces, function (option) {
      var color = swatchColor(option);
      var band = bandForSauce(option.dataset.id);
      return sauceSpots(band).map(function (spot, i) {
        return makeDrizzleDot(color, spot, i);
      });
    }, function (id) {
      delete sauceBandOf[id];
    });

    // ── summary ──
    summary.innerHTML = '';
    summary.appendChild(summaryRow('Base', base ? base.dataset.name : ''));
    summary.appendChild(summaryRow('Meat', meat ? meat.dataset.name : ''));
    summary.appendChild(summaryRow('Salad', names(salads)));
    summary.appendChild(summaryRow('Sauce', names(sauces)));
    if (extras.length) summary.appendChild(summaryRow('Extras', names(extras)));

    // ── total ──
    var total = priceForCombo(base, meat ? meat.dataset.id : '');
    extras.forEach(function (o) { total += parseFloat(o.dataset.price) || 0; });
    bumpTotal('$' + total.toFixed(2));
  }

  update();
})();
