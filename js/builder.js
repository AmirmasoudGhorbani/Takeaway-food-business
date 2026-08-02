/* ========================================
   KEBAB STATION KUMEU — Build Your Kebab
   Reads option data-attributes, renders a
   live summary + running total

   Pricing matches the real menu exactly, which prices Falafel/Super
   differently per base (e.g. Falafel is -$1 on a Wrap but -$2 on Rice) —
   so each base button carries its own data-price / data-price-falafel /
   data-price-super, and Falafel/Super are disabled on bases where the
   menu doesn't actually offer them (e.g. Meat on Chips is only ever
   Chicken/Lamb/Mixed).
   ======================================== */

(function () {
  'use strict';

  var dishTitle = document.getElementById('builder-dish-title');
  var dishSubtitle = document.getElementById('builder-dish-subtitle');
  var summary = document.getElementById('builder-summary');
  var totalEl = document.getElementById('builder-total');
  var mobileBar = document.getElementById('builder-mobile-bar');
  var mobileTotalEl = document.getElementById('builder-mobile-total');
  var addBtn = document.getElementById('builder-add-btn');
  var mobileAddBtn = document.getElementById('builder-mobile-add-btn');
  var builderSection = document.getElementById('builder');
  if (!summary || !totalEl) return;

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
  // to that step instead of leaving the shopper to scroll and hunt. This is
  // the only place selections are shown — once you've picked something, it
  // shows up here with the running total, nothing else.
  function jumpToGroup(groupName) {
    var group = document.querySelector('.builder__group[data-group="' + groupName + '"]');
    if (!group) return;
    // Under the mobile accordion the target step is probably collapsed,
    // so scrolling to it alone would land on a closed header.
    if (accordionOn) openGroup(group);
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

  // ── Single source of truth for what has been built ──
  // Both the card (title/subtitle/total) and the line item sent to the
  // cart derive from this. They used to be read back out of the rendered
  // subtitle instead, which silently dropped Extras from the order: the
  // subtitle never listed them, so a kebab with cheese was *charged* for
  // the cheese but reached the shop with no mention of it. Anything that
  // affects the price has to be described here.
  function currentSelection() {
    var base = getActive('base')[0];
    var meat = getActive('meat')[0];
    var salads = getActive('salads');
    var sauces = getActive('sauces');
    var extras = getActive('extras');

    var meatName = meat ? cleanName(meat.dataset.name) : '';
    var dishNoun = BASE_NOUN[base ? base.dataset.id : 'wrap'] || 'Kebab';

    var parts = [];
    if (base && base.dataset.band) parts.push(titleCase(base.dataset.band));
    salads.forEach(function (o) { parts.push(o.dataset.name); });
    sauces.forEach(function (o) { parts.push(o.dataset.name); });
    // Marked with a + so a paid addition is not mistaken for one of the
    // included salads/sauces when the order is read off a phone.
    extras.forEach(function (o) { parts.push('+ ' + o.dataset.name); });

    var price = priceForCombo(base, meat ? meat.dataset.id : '');
    extras.forEach(function (o) { price += parseFloat(o.dataset.price) || 0; });

    return {
      name: meatName ? meatName + ' ' + dishNoun : dishNoun,
      detail: parts.join(' · '),
      price: price,
      base: base,
      meat: meat,
      salads: salads,
      sauces: sauces,
      extras: extras
    };
  }

  // ── Add current build to the shared cart ──
  // Reuses whatever's already rendered (dish title/subtitle/total) rather
  // than re-deriving it, since update() keeps all three in sync already.
  // After adding, every group resets to its original default selection so
  // the shopper can build a second, different kebab without the previous
  // picks lingering.
  var DEFAULT_ACTIVE = {
    base: ['wrap'],
    meat: ['chicken'],
    salads: ['tomato', 'lettuce'],
    sauces: ['garlicyoghurt'],
    extras: []
  };

  function resetSelections() {
    groups.forEach(function (group) {
      var groupName = group.getAttribute('data-group');
      var mode = group.getAttribute('data-mode');
      var defaults = DEFAULT_ACTIVE[groupName] || [];
      group.querySelectorAll('.builder__option').forEach(function (opt) {
        opt.disabled = false;
        opt.classList.remove('is-disabled');
        opt.setAttribute('aria-disabled', 'false');
        var shouldBeActive = defaults.indexOf(opt.dataset.id) !== -1;
        opt.classList.toggle('is-active', shouldBeActive);
        if (mode === 'single') opt.setAttribute('aria-checked', shouldBeActive ? 'true' : 'false');
        else opt.setAttribute('aria-pressed', shouldBeActive ? 'true' : 'false');
      });
    });
    update();
  }

  function addCurrentToCart() {
    if (!window.KebabCart) return;
    var sel = currentSelection();
    // Unlike the fixed menu items, `detail` here is the build itself
    // (base / salad / sauce / extras), so it travels with the order
    // rather than being dropped as blurb.
    window.KebabCart.add(
      {
        name: sel.name,
        detail: sel.detail,
        category: 'Build Your Own',
        price: sel.price
      },
      document.querySelector('.builder__card')
    );
    resetSelections();
  }

  if (addBtn) addBtn.addEventListener('click', addCurrentToCart);
  if (mobileAddBtn) mobileAddBtn.addEventListener('click', addCurrentToCart);

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

    // Everything below renders from this one object, so the card can
    // never describe a different kebab than the one the cart receives.
    var sel = currentSelection();
    var base = sel.base;
    var meat = sel.meat;

    // ── dynamic title + subtitle ──
    if (dishTitle) dishTitle.textContent = 'Your ' + sel.name;
    if (dishSubtitle) {
      dishSubtitle.textContent = sel.detail || 'Made exactly the way you like it.';
    }

    // ── summary ──
    summary.innerHTML = '';
    summary.appendChild(summaryRow('base', 'Base', base ? base.dataset.name : '', iconImg(base, 18)));
    summary.appendChild(summaryRow('meat', 'Meat', meat ? meat.dataset.name : '', iconImg(meat, 18)));
    summary.appendChild(summaryRow('salads', 'Salad', names(sel.salads), sel.salads[0] ? iconImg(sel.salads[0], 18) : null));
    summary.appendChild(summaryRow('sauces', 'Sauce', names(sel.sauces), sel.sauces[0] ? swatchDot(sel.sauces[0], 16) : null));
    if (sel.extras.length) {
      summary.appendChild(summaryRow('extras', 'Extras', names(sel.extras), iconImg(sel.extras[0], 18)));
    }

    // ── total ──
    bumpTotal('$' + sel.price.toFixed(2));

    syncAccordionValues();
    updateMobileBar();
  }

  // ── Mobile step accordion ──
  // The five option groups stack to ~1716px on a phone — a wall of chips
  // with no sense of progress. Collapsing all but the open one turns the
  // same markup into a guided 1-2-3 flow. Layered on at runtime and only
  // while the query matches, so the desktop layout and the underlying
  // markup are untouched; with JS off every group simply stays open as
  // it does today.
  var accordionQuery = window.matchMedia('(max-width: 768px)');
  var accordionOn = false;

  function groupHead(group) {
    return group.querySelector('.builder__group-head');
  }

  function openGroup(target) {
    groups.forEach(function (group) {
      var isTarget = group === target;
      group.classList.toggle('is-collapsed', !isTarget);
      var head = groupHead(group);
      if (head) head.setAttribute('aria-expanded', isTarget ? 'true' : 'false');
    });
  }

  // Mirrors each group's current pick into its header, so a collapsed
  // step still says what it holds instead of just its number.
  function syncAccordionValues() {
    groups.forEach(function (group) {
      var valueEl = group.querySelector('.builder__group-value');
      if (!valueEl) return;
      var picked = group.querySelectorAll('.builder__option.is-active');
      valueEl.textContent = picked.length
        ? Array.prototype.map.call(picked, function (o) { return o.dataset.name; }).join(', ')
        : 'None';
    });
  }

  function enableAccordion() {
    if (accordionOn) return;
    accordionOn = true;
    groups.forEach(function (group) {
      var head = groupHead(group);
      if (!head) return;
      if (!group.querySelector('.builder__group-value')) {
        var value = document.createElement('span');
        value.className = 'builder__group-value';
        head.appendChild(value);
      }
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      if (!head.dataset.accordionBound) {
        head.dataset.accordionBound = '1';
        head.addEventListener('click', function () {
          if (!accordionOn) return;
          openGroup(group.classList.contains('is-collapsed') ? group : null);
        });
        head.addEventListener('keydown', function (e) {
          if (!accordionOn) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openGroup(group.classList.contains('is-collapsed') ? group : null);
          }
        });
      }
    });
    document.body.classList.add('builder-accordion');
    openGroup(groups[0]);
    syncAccordionValues();
  }

  function disableAccordion() {
    if (!accordionOn) return;
    accordionOn = false;
    document.body.classList.remove('builder-accordion');
    groups.forEach(function (group) {
      group.classList.remove('is-collapsed');
      var head = groupHead(group);
      if (head) {
        head.removeAttribute('role');
        head.removeAttribute('tabindex');
        head.removeAttribute('aria-expanded');
      }
    });
  }

  function syncAccordion() {
    if (accordionQuery.matches) enableAccordion();
    else disableAccordion();
  }

  if (accordionQuery.addEventListener) {
    accordionQuery.addEventListener('change', syncAccordion);
  } else if (accordionQuery.addListener) {
    accordionQuery.addListener(syncAccordion); // Safari < 14
  }

  // Picking in a single-choice step advances to the next one, so the
  // flow moves forward on its own instead of needing a second tap on the
  // next header. Multi-select steps stay put — you are usually adding
  // several things at once there.
  groups.forEach(function (group, i) {
    if (group.getAttribute('data-mode') !== 'single') return;
    group.querySelectorAll('.builder__option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (!accordionOn || opt.disabled) return;
        var next = groups[i + 1];
        if (next) openGroup(next);
      });
    });
  });

  syncAccordion();
  update();
})();
