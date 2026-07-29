/* ========================================
   KEBAB STATION KUMEU — Build Your Kebab
   Reads option data-attributes, renders a
   live photo preview + summary + running total

   Pricing matches the real menu exactly, which prices Falafel/Super
   differently per base (e.g. Falafel is -$1 on a Wrap but -$2 on Rice) —
   so each base button carries its own data-price / data-price-falafel /
   data-price-super, and Falafel/Super are disabled on bases where the
   menu doesn't actually offer them (e.g. Meat on Chips is only ever
   Chicken/Lamb/Mixed).
   ======================================== */

(function () {
  'use strict';

  var photoBase = document.getElementById('builder-photo-base');
  var cutaway = document.getElementById('builder-cutaway');
  var collage = document.getElementById('builder-cutaway-collage');
  var dishTitle = document.getElementById('builder-dish-title');
  var dishSubtitle = document.getElementById('builder-dish-subtitle');
  var summary = document.getElementById('builder-summary');
  var totalEl = document.getElementById('builder-total');
  var mobileBar = document.getElementById('builder-mobile-bar');
  var mobileTotalEl = document.getElementById('builder-mobile-total');
  var builderSection = document.getElementById('builder');
  if (!photoBase || !cutaway || !collage || !summary || !totalEl) return;

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

  // ── Finished-dish photo, swapped per base ──
  // A real photo of the actual dish reads as the order far more directly
  // than an abstract diagram — each base has its own genuine photo of that
  // dish (wrap-in-hand, rice box, loaded chips, salad bowl), crossfaded in
  // rather than hard-cut so a base change doesn't flash.
  var BASE_PHOTOS = {
    wrap: 'assets/images/donor-kebab.webp',
    rice: 'assets/images/donor-on-rice.webp',
    chips: 'assets/images/donor-on-chips.webp',
    salad: 'assets/images/menu-salad.webp'
  };

  function setBasePhoto(src) {
    if (photoBase.dataset.src === src) return;
    photoBase.dataset.src = src;
    if (prefersReducedMotion) {
      photoBase.src = src;
      return;
    }
    photoBase.classList.add('is-swapping');
    var done = false;
    function swap() {
      if (done) return;
      done = true;
      photoBase.removeEventListener('transitionend', swap);
      photoBase.src = src;
      requestAnimationFrame(function () {
        photoBase.classList.remove('is-swapping');
      });
    }
    photoBase.addEventListener('transitionend', swap);
    setTimeout(swap, 320); // safety net if transitionend never fires
  }

  // ── Cutaway ingredient window ──
  // A small round window over the dish photo, collaging real photos of
  // whichever ingredients are actually picked — falls back to that
  // option's own icon on a matching swatch colour for the handful of
  // ingredients that don't have their own close-up photo yet.
  var INGREDIENT_PHOTOS = {
    chicken: 'assets/ingredients/chicken.webp',
    lamb: 'assets/ingredients/lamb.webp',
    mixed: 'assets/ingredients/chicken.webp',
    falafel: 'assets/ingredients/falafel.webp',
    falafelx: 'assets/ingredients/falafel.webp',
    tomato: 'assets/ingredients/tomato.webp',
    mixedcabbage: 'assets/ingredients/mixedcabbage.webp',
    parsley: 'assets/ingredients/parsley.webp',
    cheese: 'assets/ingredients/cheese.webp'
  };

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
    img.className = 'icon';
    img.setAttribute('aria-hidden', 'true');
    img.width = size;
    img.height = size;
    return img;
  }

  function swatchColor(option) {
    var swatch = option.querySelector('.builder__option-swatch');
    return swatch ? swatch.style.getPropertyValue('--swatch').trim() : null;
  }

  function swatchDot(option, size) {
    var color = swatchColor(option);
    if (!color) return null;
    var dot = document.createElement('span');
    dot.style.display = 'inline-block';
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.borderRadius = '50%';
    dot.style.background = color;
    dot.style.border = '1px solid rgba(0, 0, 0, 0.25)';
    return dot;
  }

  function cutawayItem(option, fallbackBg) {
    return {
      photo: INGREDIENT_PHOTOS[option.dataset.id] || null,
      icon: iconImg(option, 20),
      bg: option.dataset.c1 || swatchColor(option) || fallbackBg
    };
  }

  var lastCutawaySignature = null;

  function renderCutaway(items, signature) {
    if (signature === lastCutawaySignature) return;
    lastCutawaySignature = signature;

    collage.innerHTML = '';
    if (!items.length) {
      cutaway.style.opacity = '0';
      cutaway.style.transform = 'scale(0.85)';
      return;
    }
    cutaway.style.opacity = '';
    cutaway.style.transform = '';
    var n = items.length;
    items.slice(0, 4).forEach(function (item, i) {
      var tile = document.createElement('div');
      tile.className = 'builder__cutaway-tile';
      tile.style.animationDelay = (i * 40) + 'ms';
      if (n === 1) {
        tile.style.gridColumn = '1 / span 2';
        tile.style.gridRow = '1 / span 2';
      } else if (n === 2) {
        tile.style.gridRow = '1 / span 2';
      } else if (n === 3 && i === 2) {
        tile.style.gridColumn = '1 / span 2';
      }
      if (item.photo) {
        var img = document.createElement('img');
        img.src = item.photo;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        tile.appendChild(img);
      } else {
        tile.style.setProperty('--tile-bg', item.bg || '#2a1c12');
        var wrap = document.createElement('span');
        wrap.className = 'builder__cutaway-icon';
        if (item.icon) wrap.appendChild(item.icon);
        tile.appendChild(wrap);
      }
      collage.appendChild(tile);
    });
  }

  function bumpTotal(text) {
    var changed = totalEl.textContent !== text;
    totalEl.textContent = text;
    if (mobileTotalEl) mobileTotalEl.textContent = text;
    if (!changed || prefersReducedMotion) return;
    totalEl.classList.remove('is-bumping');
    void totalEl.offsetWidth;
    totalEl.classList.add('is-bumping');
  }

  // ── Summary rows ──
  // Each row is its own small card: an icon thumbnail, the category label
  // over the picked value, and a "Change" link that jumps straight back up
  // to that step instead of leaving the shopper to scroll and hunt.
  function jumpToGroup(groupName) {
    var group = document.querySelector('.builder__group[data-group="' + groupName + '"]');
    if (!group) return;
    group.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center'
    });
  }

  function summaryRow(groupName, label, value, iconEl) {
    var row = document.createElement('div');
    row.className = 'builder__summary-row';

    var media = document.createElement('span');
    media.className = 'builder__summary-icon';
    if (iconEl) media.appendChild(iconEl);
    row.appendChild(media);

    var text = document.createElement('span');
    text.className = 'builder__summary-text';
    var dt = document.createElement('span');
    dt.className = 'builder__summary-label';
    dt.textContent = label;
    var dd = document.createElement('span');
    dd.className = 'builder__summary-value';
    dd.textContent = value || 'Not selected';
    text.appendChild(dt);
    text.appendChild(dd);
    row.appendChild(text);

    var change = document.createElement('button');
    change.type = 'button';
    change.className = 'builder__summary-change';
    change.textContent = 'Change';
    change.addEventListener('click', function () {
      jumpToGroup(groupName);
    });
    row.appendChild(change);

    return row;
  }

  function names(list) {
    return list.map(function (o) { return o.dataset.name; }).join(', ');
  }

  // Strips a trailing parenthetical off a menu name for use inside the
  // dish title — "Falafel (V)" reads as "Falafel", not "Falafel (V) Kebab".
  function cleanName(name) {
    return name.replace(/\s*\([^)]*\)\s*$/, '');
  }

  function titleCase(text) {
    return text.replace(/\w\S*/g, function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  var BASE_NOUN = {
    wrap: 'Kebab',
    rice: 'Rice Box',
    salad: 'Salad Bowl',
    chips: 'Loaded Chips'
  };

  // ── Mobile sticky total bar ──
  // Mirrors the site-wide sticky order bar's own visibility logic (see
  // main.js), scoped to whether Build Your Kebab itself is in view, so the
  // running total/CTA stay on screen while actively building without ever
  // showing both bars stacked at once.
  function updateMobileBar() {
    if (!mobileBar || !builderSection) return;
    var rect = builderSection.getBoundingClientRect();
    var shouldShow = rect.top < window.innerHeight * 0.6 && rect.bottom > 90;
    mobileBar.classList.toggle('is-visible', shouldShow);
    mobileBar.inert = !shouldShow;
    document.body.classList.toggle('builder-bar-active', shouldShow);
  }

  window.addEventListener('scroll', updateMobileBar, { passive: true });
  window.addEventListener('resize', updateMobileBar);

  function update() {
    syncMeatAvailability();
    syncMultiCaps();

    var base = getActive('base')[0];
    var meat = getActive('meat')[0];
    var salads = getActive('salads');
    var sauces = getActive('sauces');
    var extras = getActive('extras');

    // ── dish photo ──
    setBasePhoto(BASE_PHOTOS[base ? base.dataset.id : 'wrap'] || BASE_PHOTOS.wrap);

    // ── cutaway collage: meat first, then salads, up to 4 tiles ──
    var cutawaySalads = salads.slice(0, 3);
    var cutawayItems = [];
    if (meat) cutawayItems.push(cutawayItem(meat, '#8a3f22'));
    cutawaySalads.forEach(function (o) {
      cutawayItems.push(cutawayItem(o, '#3f6b27'));
    });
    var cutawaySignature = (meat ? meat.dataset.id : '') + '|' +
      cutawaySalads.map(function (o) { return o.dataset.id; }).join(',');
    renderCutaway(cutawayItems, cutawaySignature);

    // ── dynamic title + subtitle ──
    var meatName = meat ? cleanName(meat.dataset.name) : '';
    var baseId = base ? base.dataset.id : 'wrap';
    var dishNoun = BASE_NOUN[baseId] || 'Kebab';
    if (dishTitle) {
      dishTitle.textContent = meatName ? 'Your ' + meatName + ' ' + dishNoun : 'Your ' + dishNoun;
    }
    if (dishSubtitle) {
      var subtitleParts = [];
      if (base && base.dataset.band) subtitleParts.push(titleCase(base.dataset.band));
      salads.forEach(function (o) { subtitleParts.push(o.dataset.name); });
      sauces.forEach(function (o) { subtitleParts.push(o.dataset.name); });
      dishSubtitle.textContent = subtitleParts.length
        ? subtitleParts.join(' · ')
        : 'Made exactly the way you like it.';
    }

    // ── summary ──
    summary.innerHTML = '';
    summary.appendChild(summaryRow('base', 'Base', base ? base.dataset.name : '', iconImg(base, 18)));
    summary.appendChild(summaryRow('meat', 'Meat', meat ? meat.dataset.name : '', iconImg(meat, 18)));
    summary.appendChild(summaryRow('salads', 'Salad', names(salads), salads[0] ? iconImg(salads[0], 18) : null));
    summary.appendChild(summaryRow('sauces', 'Sauce', names(sauces), sauces[0] ? swatchDot(sauces[0], 16) : null));
    if (extras.length) {
      summary.appendChild(summaryRow('extras', 'Extras', names(extras), iconImg(extras[0], 18)));
    }

    // ── total ──
    var total = priceForCombo(base, meat ? meat.dataset.id : '');
    extras.forEach(function (o) { total += parseFloat(o.dataset.price) || 0; });
    bumpTotal('$' + total.toFixed(2));

    updateMobileBar();
  }

  update();
})();
