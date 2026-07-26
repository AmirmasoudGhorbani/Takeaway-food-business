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
  var summary = document.getElementById('builder-summary');
  var totalEl = document.getElementById('builder-total');
  if (!stack || !summary || !totalEl) return;

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
  var bandEls = {};
  var bandSignatures = {};

  function insertBandInOrder(el, key) {
    var idx = SLOT_ORDER.indexOf(key);
    var before = null;
    for (var i = idx + 1; i < SLOT_ORDER.length; i++) {
      if (bandEls[SLOT_ORDER[i]]) {
        before = bandEls[SLOT_ORDER[i]];
        break;
      }
    }
    if (before) stack.insertBefore(el, before);
    else stack.appendChild(el);
  }

  function iconImg(option, size) {
    if (!option) return null;
    var src = option.querySelector('.builder__option-icon');
    if (!src) return null;
    var img = document.createElement('img');
    img.src = src.getAttribute('src');
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.className = 'builder__band-icon';
    img.width = size;
    img.height = size;
    return img;
  }

  function swatchDot(option) {
    var swatch = option.querySelector('.builder__option-swatch');
    var dot = document.createElement('span');
    dot.className = 'builder__band-dot';
    dot.style.background = swatch ? swatch.style.getPropertyValue('--swatch') : '#fff';
    return dot;
  }

  function paintBand(el, opts) {
    el.style.setProperty('--band-c1', opts.c1);
    el.style.setProperty('--band-c2', opts.c2);
    el.style.setProperty('--band-txt', opts.txt);
    el.style.setProperty('--band-w', opts.width + '%');
    el.innerHTML = '';
    if (opts.icon) el.appendChild(opts.icon);
    var label = document.createElement('span');
    label.className = 'builder__band-label';
    label.textContent = opts.label;
    el.appendChild(label);
    if (opts.miniIcons && opts.miniIcons.length) {
      var row = document.createElement('span');
      row.className = 'builder__band-minis';
      opts.miniIcons.forEach(function (m) {
        row.appendChild(m);
      });
      el.appendChild(row);
    }
  }

  function showBand(key, signature, opts) {
    var el = bandEls[key];
    if (!el) {
      el = document.createElement('div');
      el.className = 'builder__band';
      el.dataset.slot = key;
      paintBand(el, opts);
      bandEls[key] = el;
      bandSignatures[key] = signature;
      el.style.opacity = '0';
      el.style.transform = 'scale(0.6) translateY(14px)';
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
    el.style.transform = 'scale(0.6) translateY(14px)';
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
        icon: iconImg(base, 16)
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
        icon: iconImg(meat, 16)
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
        miniIcons: salads.map(function (o) { return iconImg(o, 14); }).filter(Boolean)
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
        miniIcons: sauces.map(swatchDot)
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
