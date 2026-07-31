/* ========================================
   KEBAB STATION KUMEU — Order Cart
   Shared cart used by both the static menu (js/menu-cart.js) and the
   Build Your Kebab customizer (js/builder.js) — either can push a line
   item in via window.KebabCart.add(), and everything ends up in one
   list the shopper reviews, edits and sends as a single SMS.
   ======================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'ksk_cart_v1';
  var SMS_NUMBER = '+6494126030';

  var cartBtn = document.getElementById('nav-cart-btn');
  var cartCount = document.getElementById('nav-cart-count');
  var drawer = document.getElementById('cart-drawer');
  var backdrop = document.getElementById('cart-drawer-backdrop');
  var closeBtn = document.getElementById('cart-drawer-close');
  var body = document.getElementById('cart-drawer-body');
  var totalEl = document.getElementById('cart-drawer-total');
  var smsBtn = document.getElementById('cart-sms-btn');
  var clearBtn = document.getElementById('cart-drawer-clear');
  if (!cartBtn || !drawer || !body) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cart = [];

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      cart = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      cart = [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      // Storage unavailable (private browsing, quota, etc.) — cart just
      // won't survive a reload; nothing else depends on it existing.
    }
  }

  // Identical name+detail+price merges into one line with a higher
  // quantity instead of listing the same pick twice.
  function signature(item) {
    return item.name + '||' + (item.detail || '') + '||' + item.price.toFixed(2);
  }

  function addItem(item) {
    var qty = item.qty || 1;
    var sig = signature(item);
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
      if (signature(cart[i]) === sig) {
        existing = cart[i];
        break;
      }
    }
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: item.name,
        detail: item.detail || '',
        price: item.price,
        qty: qty
      });
    }
    persist();
    render();
    bumpBadge();
  }

  function removeItem(id) {
    cart = cart.filter(function (c) { return c.id !== id; });
    persist();
    render();
  }

  function setQty(id, qty) {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) {
        cart[i].qty = qty;
        break;
      }
    }
    persist();
    render();
  }

  function clearCart() {
    cart = [];
    persist();
    render();
  }

  function totalCount() {
    var n = 0;
    cart.forEach(function (c) { n += c.qty; });
    return n;
  }

  function totalPrice() {
    var sum = 0;
    cart.forEach(function (c) { sum += c.qty * c.price; });
    return sum;
  }

  function bumpBadge() {
    if (!cartCount || prefersReducedMotion) return;
    cartCount.classList.remove('is-bumping');
    void cartCount.offsetWidth;
    cartCount.classList.add('is-bumping');
  }

  function renderBadge() {
    if (!cartCount) return;
    var n = totalCount();
    cartCount.textContent = String(n);
    cartCount.hidden = n === 0;
  }

  function buildSmsBody() {
    var lines = ["Hi, I'd like to order:"];
    cart.forEach(function (c) {
      var qtyPrefix = c.qty > 1 ? c.qty + 'x ' : '';
      var line = qtyPrefix + c.name;
      if (c.detail) line += ' (' + c.detail + ')';
      lines.push(line);
    });
    lines.push('Total: $' + totalPrice().toFixed(2));
    return lines.join('\n');
  }

  // The "?&" before body (rather than a plain "?") is the one query form
  // that both iOS and Android Messages reliably prefill from.
  function updateSmsHref() {
    if (!smsBtn) return;
    smsBtn.href = 'sms:' + SMS_NUMBER + '?&body=' + encodeURIComponent(buildSmsBody());
  }

  function qtyButton(iconId, label, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cart-item__qty-btn';
    btn.setAttribute('aria-label', label);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + iconId);
    svg.appendChild(use);
    btn.appendChild(svg);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function itemRow(item) {
    var row = document.createElement('div');
    row.className = 'cart-item';
    row.dataset.id = item.id;

    var info = document.createElement('div');
    info.className = 'cart-item__info';
    var name = document.createElement('p');
    name.className = 'cart-item__name';
    name.textContent = item.name;
    info.appendChild(name);
    if (item.detail) {
      var detail = document.createElement('p');
      detail.className = 'cart-item__detail';
      detail.textContent = item.detail;
      info.appendChild(detail);
    }
    row.appendChild(info);

    var controls = document.createElement('div');
    controls.className = 'cart-item__controls';

    var topRow = document.createElement('div');
    topRow.className = 'cart-item__controls-row';
    var price = document.createElement('span');
    price.className = 'cart-item__price';
    price.textContent = '$' + (item.price * item.qty).toFixed(2);
    topRow.appendChild(price);
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'cart-item__remove';
    remove.setAttribute('aria-label', 'Remove ' + item.name + ' from order');
    var removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    removeSvg.setAttribute('class', 'icon');
    removeSvg.setAttribute('aria-hidden', 'true');
    var removeUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    removeUse.setAttribute('href', '#icon-trash');
    removeSvg.appendChild(removeUse);
    remove.appendChild(removeSvg);
    remove.addEventListener('click', function () { removeItem(item.id); });
    topRow.appendChild(remove);
    controls.appendChild(topRow);

    var qtyWrap = document.createElement('div');
    qtyWrap.className = 'cart-item__qty';
    qtyWrap.appendChild(qtyButton('icon-minus', 'Decrease quantity of ' + item.name, function () {
      setQty(item.id, item.qty - 1);
    }));
    var qtyVal = document.createElement('span');
    qtyVal.className = 'cart-item__qty-value';
    qtyVal.textContent = item.qty;
    qtyWrap.appendChild(qtyVal);
    qtyWrap.appendChild(qtyButton('icon-plus', 'Increase quantity of ' + item.name, function () {
      setQty(item.id, item.qty + 1);
    }));
    controls.appendChild(qtyWrap);

    row.appendChild(controls);
    return row;
  }

  function render() {
    renderBadge();
    body.innerHTML = '';
    if (!cart.length) {
      var empty = document.createElement('p');
      empty.className = 'cart-drawer__empty';
      empty.textContent = 'Your order is empty. Add something from the menu or build your own kebab.';
      body.appendChild(empty);
    } else {
      cart.forEach(function (item) {
        body.appendChild(itemRow(item));
      });
    }
    if (totalEl) totalEl.textContent = '$' + totalPrice().toFixed(2);
    if (clearBtn) clearBtn.hidden = cart.length === 0;
    if (smsBtn) {
      smsBtn.classList.toggle('is-disabled', cart.length === 0);
      smsBtn.setAttribute('aria-disabled', cart.length === 0 ? 'true' : 'false');
    }
    updateSmsHref();
  }

  // ── Drawer open/close ──
  function openDrawer() {
    drawer.classList.add('is-open');
    drawer.inert = false;
    cartBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('cart-drawer-open');
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.inert = true;
    cartBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('cart-drawer-open');
    cartBtn.focus();
  }

  cartBtn.addEventListener('click', function () {
    if (drawer.classList.contains('is-open')) closeDrawer();
    else openDrawer();
  });
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
  });
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (!cart.length) return;
      if (window.confirm('Clear your whole order?')) clearCart();
    });
  }

  load();
  render();

  // Public API for js/menu-cart.js and js/builder.js.
  window.KebabCart = {
    add: addItem
  };
})();
