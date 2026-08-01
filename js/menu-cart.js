/* ========================================
   KEBAB STATION KUMEU — Menu → Cart
   Injects an "add to order" control onto every static menu item so
   picks from the Menu section land in the same cart as Build Your
   Kebab, rather than needing a separate ordering path for each.
   ======================================== */

(function () {
  'use strict';

  if (!window.KebabCart) return;

  function parsePrice(text) {
    var match = text.match(/\$([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  function pulse(el) {
    el.classList.remove('is-added');
    void el.offsetWidth;
    el.classList.add('is-added');
  }

  // Panels point at their own tab via aria-labelledby, so the tab's label
  // ("Doner Kebab", "Sides", ...) is already the category name — no second
  // list of category strings to keep in sync with the markup.
  function categoryFor(article) {
    var panel = article.closest('.menu__panel');
    if (!panel) return 'Other';
    var tab = document.getElementById(panel.getAttribute('aria-labelledby'));
    return tab ? tab.textContent.replace(/\s+/g, ' ').trim() : 'Other';
  }

  function addIcon() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon-plus');
    svg.appendChild(use);
    return svg;
  }

  document.querySelectorAll('.menu-item').forEach(function (article) {
    var nameEl = article.querySelector('.menu-item__name');
    if (!nameEl) return;
    var name = nameEl.textContent.trim();

    // The item's own menu category, read off the tab that labels the panel
    // it sits in, so the order can be grouped the same way the menu is.
    // The description deliberately isn't carried into the order: it's menu
    // blurb ("Lamb cooked on a vertical spit and shaved into thin
    // slices."), which just buries the actual items for whoever reads the
    // text at the shop.
    var detail = '';
    var category = categoryFor(article);

    var sizedPrice = article.querySelector('.menu-item__price--sizes');
    if (sizedPrice) {
      var rows = sizedPrice.querySelectorAll('.menu-item__price-row');
      rows.forEach(function (row) {
        var text = row.textContent.trim();
        var price = parsePrice(text);
        var sizeLabel = text.replace(/\$[\d.]+/, '').trim();
        row.classList.add('menu-item__price-row--addable');
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label', 'Add ' + name + ', ' + sizeLabel + ' size, to order');

        function trigger() {
          window.KebabCart.add({
            name: name + ' (' + sizeLabel + ')',
            detail: detail,
            category: category,
            price: price
          }, article);
          pulse(row);
        }
        row.addEventListener('click', trigger);
        row.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            trigger();
          }
        });
      });
      return;
    }

    var priceEl = article.querySelector('.menu-item__price');
    if (!priceEl) return;
    var price = parsePrice(priceEl.textContent);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-item__add';
    btn.setAttribute('aria-label', 'Add ' + name + ' to order');
    btn.appendChild(addIcon());
    btn.addEventListener('click', function () {
      window.KebabCart.add({ name: name, detail: detail, category: category, price: price }, article);
      pulse(btn);
    });
    priceEl.appendChild(btn);
  });

  // ── Combo / add-on cards ──
  // These carry their own explicit "Add to Order" button (data-name/
  // -detail/-price) rather than the injected controls above, since
  // there are only a handful of them and each is a delta price on top
  // of another item, not a standalone menu item.
  document.querySelectorAll('.combo-card__add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.KebabCart.add({
        name: btn.dataset.name,
        detail: '',
        category: 'Add-ons',
        price: parseFloat(btn.dataset.price) || 0
      }, btn.closest('.combo-card'));
      pulse(btn);
    });
  });
})();
