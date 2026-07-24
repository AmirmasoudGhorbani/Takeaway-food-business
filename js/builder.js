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

  function makeBand(label, c1, c2, txt, widthPercent) {
    var el = document.createElement('div');
    el.className = 'builder__band';
    el.style.setProperty('--band-c1', c1);
    el.style.setProperty('--band-c2', c2);
    el.style.setProperty('--band-txt', txt);
    el.style.setProperty('--band-w', widthPercent + '%');
    el.textContent = label;
    return el;
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
    stack.innerHTML = '';
    var emptyHint = document.createElement('span');
    emptyHint.className = 'builder__stack-empty';
    emptyHint.setAttribute('aria-hidden', 'true');
    emptyHint.innerHTML = '<svg class="icon"><use href="#icon-wrap"></use></svg>';
    stack.appendChild(emptyHint);

    if (base) stack.appendChild(makeBand(base.dataset.band, base.dataset.c1, base.dataset.c2, base.dataset.txt, 100));
    if (meat) stack.appendChild(makeBand(meat.dataset.band, meat.dataset.c1, meat.dataset.c2, meat.dataset.txt, 88));
    if (salads.length) stack.appendChild(makeBand('SALAD', '#5a8f3a', '#3f6b27', '#eafbd9', 80));
    if (sauces.length) stack.appendChild(makeBand('SAUCE', '#f0c24a', '#e89a2e', '#5a3a10', 72));

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
    totalEl.textContent = '$' + total.toFixed(2);
  }

  update();
})();
