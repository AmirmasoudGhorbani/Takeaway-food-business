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

  // ── Live stack preview ──
  // Each category keeps one persistent DOM node (rather than the stack being
  // torn down and rebuilt on every click) so it can animate in when picked,
  // out when cleared, and pulse in place when the pick within it changes —
  // a full innerHTML replace can only ever hard-cut between states.
  var SLOT_ORDER = ['base', 'meat', 'salad', 'sauce'];
  // Depth (px) each slot sits at along the stack's own Z axis inside
  // .builder__stack-3d — this is what actually separates the layers in
  // space, not just their visual stacking order. The old 34px increments
  // only projected to a sliver of vertical separation at this viewing
  // angle, so each layer mostly hid the one under it — wide enough now
  // that a layer's own label clears the one above it instead of being
  // covered by it.
  var LAYER_Z = { base: 0, meat: 56, salad: 112, sauce: 168 };
  // A picked layer floats in from above its resting depth and fades in;
  // cleared, it floats back up and out the same way.
  var LAYER_Z_OFFSCREEN = 90;
  var bandEls = {};
  var bandSignatures = {};

  function offscreenTransform(key) {
    return 'translate(-50%, -50%) translateZ(' + (LAYER_Z[key] + LAYER_Z_OFFSCREEN) + 'px) scale(0.85)';
  }

  function insertBandInOrder(el, key) {
    var idx = SLOT_ORDER.indexOf(key);
    var before = null;
    for (var i = idx + 1; i < SLOT_ORDER.length; i++) {
      if (bandEls[SLOT_ORDER[i]]) {
        before = bandEls[SLOT_ORDER[i]];
        break;
      }
    }
    if (before) stack3d.insertBefore(el, before);
    else stack3d.appendChild(el);
  }

  function iconSrc(option) {
    if (!option) return null;
    var img = option.querySelector('.builder__option-icon');
    return img ? img.getAttribute('src') : null;
  }

  function iconImg(option, size) {
    var src = iconSrc(option);
    if (!src) return null;
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.className = 'builder__band-icon';
    img.width = size;
    img.height = size;
    return img;
  }

  function swatchColor(option) {
    var swatch = option.querySelector('.builder__option-swatch');
    return swatch ? swatch.style.getPropertyValue('--swatch').trim() : '#fff';
  }

  function swatchDot(option) {
    var dot = document.createElement('span');
    dot.className = 'builder__band-dot';
    dot.style.background = swatchColor(option);
    return dot;
  }

  // ── Layer texture ──
  // A flat gradient pill reads as "a colored bar labelled SALAD", not as
  // salad. Tiling the ingredient's own icon across the band (single icon
  // for base/meat, an interleaved multi-icon weave for salad, a speckled
  // dot drizzle in each active sauce's own color for sauce — sauces have no
  // icon, only a swatch colour) gives each layer a surface that actually
  // looks like what it is, not just a color standing in for it.
  var TILE = 36;

  function singleIconTexture(src) {
    if (!src) return null;
    return {
      backgroundImage: 'url("' + src + '")',
      backgroundSize: TILE + 'px ' + TILE + 'px',
      backgroundRepeat: 'repeat',
      backgroundPosition: '0 0'
    };
  }

  function multiIconTexture(srcs) {
    srcs = srcs.filter(Boolean);
    if (!srcs.length) return null;
    var images = [], sizes = [], repeats = [], positions = [];
    srcs.forEach(function (src, i) {
      var stagger = (i * TILE) / srcs.length;
      images.push('url("' + src + '")');
      sizes.push(TILE + 'px ' + TILE + 'px');
      repeats.push('repeat');
      positions.push(stagger.toFixed(1) + 'px ' + (stagger * 0.6).toFixed(1) + 'px');
    });
    return {
      backgroundImage: images.join(', '),
      backgroundSize: sizes.join(', '),
      backgroundRepeat: repeats.join(', '),
      backgroundPosition: positions.join(', ')
    };
  }

  function drizzleTexture(colors) {
    if (!colors.length) return null;
    var layers = colors.map(function (color, i) {
      var ox = i * 12;
      var oy = i * 8;
      return 'repeating-radial-gradient(circle at ' + ox + 'px ' + oy + 'px, ' +
        color + ' 0 4px, transparent 4px 19px)';
    });
    return { backgroundImage: layers.join(', ') };
  }

  function clearTexture(el) {
    el.style.backgroundImage = '';
    el.style.backgroundSize = '';
    el.style.backgroundRepeat = '';
    el.style.backgroundPosition = '';
  }

  function paintBand(el, opts) {
    el.style.setProperty('--band-c1', opts.c1);
    el.style.setProperty('--band-c2', opts.c2);
    el.style.setProperty('--band-txt', opts.txt);
    el.style.setProperty('--band-w', opts.width + '%');
    el.innerHTML = '';

    var texture = document.createElement('span');
    texture.className = 'builder__band-texture';
    texture.setAttribute('aria-hidden', 'true');
    if (opts.texture) {
      Object.keys(opts.texture).forEach(function (prop) {
        texture.style[prop] = opts.texture[prop];
      });
    } else {
      clearTexture(texture);
    }
    el.appendChild(texture);

    var content = document.createElement('span');
    content.className = 'builder__band-content';
    if (opts.icon) content.appendChild(opts.icon);
    var label = document.createElement('span');
    label.className = 'builder__band-label';
    label.textContent = opts.label;
    content.appendChild(label);
    if (opts.miniIcons && opts.miniIcons.length) {
      var row = document.createElement('span');
      row.className = 'builder__band-minis';
      opts.miniIcons.forEach(function (m) {
        row.appendChild(m);
      });
      content.appendChild(row);
    }
    el.appendChild(content);
  }

  function showBand(key, signature, opts) {
    var el = bandEls[key];
    if (!el) {
      el = document.createElement('div');
      el.className = 'builder__band';
      el.dataset.slot = key;
      el.style.setProperty('--layer-z', LAYER_Z[key] + 'px');
      paintBand(el, opts);
      bandEls[key] = el;
      bandSignatures[key] = signature;
      el.style.opacity = '0';
      el.style.transform = offscreenTransform(key);
      insertBandInOrder(el, key);
      void el.offsetWidth; // force layout so the reset below actually transitions
      requestAnimationFrame(function () {
        el.style.opacity = '';
        el.style.transform = '';
      });
      return;
    }
    if (bandSignatures[key] === signature) return;
    bandSignatures[key] = signature;
    paintBand(el, opts);
    if (!prefersReducedMotion) {
      el.classList.remove('is-pulsing');
      void el.offsetWidth;
      el.classList.add('is-pulsing');
    }
  }

  function hideBand(key) {
    var el = bandEls[key];
    if (!el) return;
    delete bandEls[key];
    delete bandSignatures[key];
    if (prefersReducedMotion) {
      el.remove();
      return;
    }
    el.style.opacity = '0';
    el.style.transform = offscreenTransform(key);
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', finish);
      el.remove();
    }
    el.addEventListener('transitionend', finish);
    setTimeout(finish, 420); // safety net if transitionend never fires
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

    // ── stack preview ──
    if (base) {
      showBand('base', base.dataset.id, {
        c1: base.dataset.c1,
        c2: base.dataset.c2,
        txt: base.dataset.txt,
        label: base.dataset.band,
        width: 100,
        icon: iconImg(base, 16),
        texture: singleIconTexture(iconSrc(base))
      });
    } else {
      hideBand('base');
    }

    if (meat) {
      showBand('meat', meat.dataset.id, {
        c1: meat.dataset.c1,
        c2: meat.dataset.c2,
        txt: meat.dataset.txt,
        label: meat.dataset.band,
        width: 88,
        icon: iconImg(meat, 16),
        texture: singleIconTexture(iconSrc(meat))
      });
    } else {
      hideBand('meat');
    }

    if (salads.length) {
      showBand('salad', salads.map(function (o) { return o.dataset.id; }).join(','), {
        c1: '#5a8f3a',
        c2: '#3f6b27',
        txt: '#eafbd9',
        label: 'SALAD',
        width: 80,
        miniIcons: salads.map(function (o) { return iconImg(o, 14); }).filter(Boolean),
        texture: multiIconTexture(salads.map(iconSrc))
      });
    } else {
      hideBand('salad');
    }

    if (sauces.length) {
      showBand('sauce', sauces.map(function (o) { return o.dataset.id; }).join(','), {
        c1: '#f0c24a',
        c2: '#e89a2e',
        txt: '#5a3a10',
        label: 'SAUCE',
        width: 72,
        miniIcons: sauces.map(swatchDot),
        texture: drizzleTexture(sauces.map(swatchColor))
      });
    } else {
      hideBand('sauce');
    }

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
