/* ============================================================
   cart.js — Shopping cart drawer + multi-item checkout.
   Injected into every frontend page. Cart lives in
   localStorage (ht_cart) via HT_Store. Prices always follow
   the active currency (USD/CNY) set in admin > Settings.
   ============================================================ */
(function () {
  "use strict";

  var Store = window.HT_Store;
  var Util = window.HT_Util;
  function T(k) { return window.HT_I18N.t(k); }
  function cur() { return window.HT_I18N.current; }
  function esc(s) { return Util.esc(s); }
  function pName(p) {
    if (p && p.names && typeof p.names === "object") {
      var n = p.names[cur()];
      if (n) return n;
      if (p.names.en) return p.names.en;
    }
    return p ? p.name : "";
  }
  function unitTxt(p) {
    var u = (p && p.unit) || "pcs";
    var k = "units." + u;
    var tr = T(k);
    return tr && tr !== k ? tr : u;
  }
  function prodById(id) {
    var ps = Store.getProducts();
    for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return null;
  }
  function getCart() { return Store.getCart(); }
  function saveCart(v) { Store.saveCart(v); updateBadge(); }
  function cartCount() {
    return getCart().reduce(function (s, x) { return s + (parseInt(x.qty, 10) || 0); }, 0);
  }
  function updateBadge() {
    document.querySelectorAll("[data-cart-count]").forEach(function (b) {
      var n = cartCount();
      b.textContent = n > 99 ? "99+" : String(n);
      b.style.display = n ? "" : "none";
    });
  }
  function addToCart(pid, qty, sku) {
    var p = prodById(pid);
    if (!p) return;
    sku = sku || "";
    var cart = getCart().slice();
    var found = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].pid === pid && (cart[i].sku || "") === sku) { found = cart[i]; break; }
    var q = packQty(parseInt(qty, 10) || (p.moq ? parseInt(p.moq, 10) : packingOf(p)), packingOf(p));
    if (found) found.qty += q; else cart.push({ pid: pid, qty: q, sku: sku });
    saveCart(cart);
    window.HT_Toast((pName(p) || pid) + " → " + T("cart.added"));
    if (document.getElementById("cart-items")) renderCart();
  }

  /* carton packing: cart quantity must be a multiple of p.packing (default 24) */
  function packingOf(p) { return parseInt(p && p.packing, 10) || 24; }
  function packQty(q, pk) { q = parseInt(q, 10) || pk; return Math.ceil(q / pk) * pk; }

  function keyOf(c) { return c.pid + "|" + (c.sku || ""); }
  function setQty(key, q) {
    var cart = getCart().slice();
    var item = null;
    for (var i = 0; i < cart.length; i++) if (keyOf(cart[i]) === key) { item = cart[i]; break; }
    if (!item) return;
    var p = prodById(item.pid);
    var pk = packingOf(p);
    var moq = p ? (parseInt(p.moq, 10) || 0) : 0;
    q = parseInt(q, 10) || (moq || pk);
    if (moq && q < moq) q = moq;
    if (q < 1) q = pk;
    item.qty = packQty(q, pk);
    saveCart(cart);
    renderCart();
  }
  function removeItem(key) {
    saveCart(getCart().filter(function (x) { return keyOf(x) !== key; }));
    renderCart();
  }
  function clearCart() { saveCart([]); renderCart(); }

  function itemSub(p, q) {
    var up = Util.curPrice(p);
    return up !== null ? Util.curSym() + Util.money(up * q) : T("common.priceOnRequest");
  }
  function cartTotal() {
    var sum = 0, has = false;
    getCart().forEach(function (c) {
      var p = prodById(c.pid);
      if (p && Util.curPrice(p) !== null) { sum += Util.curPrice(p) * (parseInt(c.qty, 10) || 0); has = true; }
    });
    return has ? Util.curSym() + Util.money(sum) : "—";
  }
  function cartTotalUsd() {
    var sum = 0;
    getCart().forEach(function (c) {
      var p = prodById(c.pid);
      if (p && p.price) sum += parseFloat(p.price) * (parseInt(c.qty, 10) || 0);
    });
    return sum;
  }

  /* ---------- render cart drawer ---------- */
  function renderCart() {
    var wrap = document.getElementById("cart-items");
    var empty = document.getElementById("cart-empty");
    var foot = document.getElementById("cart-foot");
    var totalEl = document.getElementById("cart-total");
    var cart = getCart();
    if (!wrap) return;
    if (!cart.length) {
      wrap.innerHTML = "";
      if (empty) empty.style.display = "";
      if (foot) foot.style.display = "none";
      updateBadge();
      return;
    }
    if (empty) empty.style.display = "none";
    if (foot) foot.style.display = "";
    var html = "";
    cart.forEach(function (c) {
      var p = prodById(c.pid);
      if (!p) return;
      var moq = parseInt(p.moq, 10) || 0;
      var pk = packingOf(p);
      html += '<div class="cart-item" data-pid="' + esc(c.pid) + '" data-key="' + esc(keyOf(c)) + '">'
        + '<img src="' + esc(_uv(p.image)) + '" alt="' + esc(pName(p)) + '" loading="lazy">'
        + '<div class="ci-info"><b>' + esc(pName(p))
        + (c.sku ? ' <span style="color:var(--orange-600,#f97316);font-size:11px;font-weight:600">' + esc(c.sku) + "</span>" : "")
        + "</b>"
        + '<small>' + esc((Util.priceFmt(p) || T("common.priceOnRequest")) + " / " + unitTxt(p)) + "</small>"
        + '<div class="ci-ctrl"><button data-step="-' + pk + '" aria-label="Decrease">−</button>'
        + '<input type="number" min="' + (moq || pk) + '" step="' + pk + '" value="' + c.qty + '" data-qty-input>'
        + '<button data-step="' + pk + '" aria-label="Increase">+</button>'
        + (moq && c.qty < moq ? '<small class="ci-moq" style="color:#d64545">' + esc(T("products.moqHint").replace("{moq}", moq).replace("{unit}", unitTxt(p))) + "</small>" : "")
        + '<small class="ci-carton" style="display:block;color:#64748b;font-size:10.5px;margin-top:2px">' + esc(T("cart.cartonNote").replace("{n}", pk)) + "</small>"
        + "</div></div>"
        + '<div class="ci-sub"><b>' + esc(itemSub(p, c.qty)) + "</b>"
        + '<button class="ci-del" data-del aria-label="Remove">' + esc(T("cart.remove")) + "</button></div>"
        + "</div>";
    });
    wrap.innerHTML = html;
    if (totalEl) totalEl.textContent = cartTotal();
    updateBadge();
  }

  /* ---------- checkout ---------- */
  function openCheckout() {
    var cart = getCart();
    if (!cart.length) { window.HT_Toast(T("cart.empty"), "err"); return; }
    var m = document.getElementById("checkout-modal");
    if (!m) return;
    /* order summary */
    var sum = document.getElementById("co-items");
    var html = "";
    cart.forEach(function (c) {
      var p = prodById(c.pid);
      if (!p) return;
      html += '<div class="co-row"><span><b>' + esc(pName(p)) + (c.sku ? ' <em style="color:var(--ink-3,#6b7688);font-weight:600">(' + esc(c.sku) + ")</em>" : "") + '</b> × <span data-co-qty>' + c.qty + "</span></span><span>" + esc(itemSub(p, c.qty)) + "</span></div>";
    });
    sum.innerHTML = html;
    var tot = document.getElementById("co-total");
    if (tot) tot.textContent = cartTotal();
    var form = document.getElementById("checkout-form");
    var pay = document.getElementById("co-pay");
    if (form) form.classList.remove("hidden");
    if (pay) pay.classList.add("hidden");
    m.classList.add("open");
  }

  function submitCheckout(e) {
    e.preventDefault();
    var form = document.getElementById("checkout-form");
    var data = {};
    form.querySelectorAll("[name]").forEach(function (f) { data[f.name] = f.value.trim(); });
    if (!data.name || !data.email) { window.HT_Toast(T("common.required"), "err"); return; }
    var cart = getCart();
    if (!cart.length) return;
    var bad = null;
    cart.forEach(function (c) {
      var pp = prodById(c.pid);
      var moq = pp ? (parseInt(pp.moq, 10) || 0) : 0;
      if (moq && (parseInt(c.qty, 10) || 0) < moq) bad = pName(pp) + " (" + T("products.moqHint").replace("{moq}", moq).replace("{unit}", unitTxt(pp)) + ")";
    });
    if (bad) { window.HT_Toast(bad, "err"); return; }
    var items = [];
    cart.forEach(function (c) {
      var p = prodById(c.pid);
      if (p) items.push({ pid: p.id, name: pName(p), qty: parseInt(c.qty, 10) || 1, price: Util.curPrice(p) || 0, term: p.term || "FOB", unit: p.unit || "pcs", sku: c.sku || "" });
    });
    var total = items.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
    var settings = Store.getSettings();
    var order = {
      id: Util.uid("ord"), items: items, product: items.map(function (it) { return it.name + (it.sku ? " (" + it.sku + ")" : "") + " ×" + it.qty; }).join("; "),
      qty: items.reduce(function (s, it) { return s + it.qty; }, 0), total: total,
      customer: data.name, email: data.email, whatsapp: data.whatsapp, country: data.country,
      note: data.note || "", currency: "USD",
      payMethod: "", status: "pending", date: new Date().toISOString()
    };
    var orders = Store.getOrders();
    orders.unshift(order);
    Store.saveOrders(orders);
    Store.saveCart([]);
    renderCart();

    /* show payment step */
    form.classList.add("hidden");
    var pay = document.getElementById("co-pay");
    pay.classList.remove("hidden");
    pay.querySelector("[data-co-no]").textContent = order.id;
    var conv = Util.curPrice({ price: 1 }); /* rate factor only for display? no: compute directly */
    var shown = 0;
    items.forEach(function (it) { shown += (Util.curPrice({ price: it.price }) || 0) * it.qty; });
    pay.querySelector("[data-co-total]").textContent = Util.curSym() + Util.money(shown);
    var okBar = pay.querySelector("[data-co-ok]");
    if (okBar) okBar.classList.remove("hidden");
    pay.querySelector("[data-bank-name]").textContent = (settings && settings.bankName) || "—";
    pay.querySelector("[data-bank-ben]").textContent = (settings && settings.beneficiary) || "—";
    pay.querySelector("[data-bank-acct]").textContent = (settings && settings.account) || "—";
    pay.querySelector("[data-bank-swift]").textContent = (settings && settings.swift) || "—";
    var pp = pay.querySelector("form.paypal-form");
    if (pp) {
      pp.business.value = (settings && settings.paypal) || "";
      pp.item_name.value = "ANMO order " + order.id;
      pp.amount.value = total.toFixed(2);
      pp.custom.value = order.id;
    }
    /* reset payment view */
    var bankBox = pay.querySelector("[data-co-bank]");
    if (bankBox) bankBox.classList.add("hidden");
    if (pp) pp.style.display = total ? "" : "none";
  }

  /* ---------- inject DOM ---------- */
  function inject() {
    if (document.getElementById("cart-root")) return;
    var style = document.createElement("style");
    style.textContent = [
      "#cart-root .cart-overlay{position:fixed;inset:0;background:rgba(9,17,33,.45);opacity:0;pointer-events:none;transition:opacity .25s;z-index:1200}",
      "#cart-root.open .cart-overlay{opacity:1;pointer-events:auto}",
      "#cart-root .cart-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,92vw);background:#fff;z-index:1201;transform:translateX(105%);transition:transform .3s;display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(9,17,33,.18)}",
      "#cart-root.open .cart-drawer{transform:none}",
      "#cart-root .cart-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line,#e3e9f1)}",
      "#cart-root .cart-head h3{margin:0;font-size:18px}",
      "#cart-root .cart-items{flex:1;overflow-y:auto;padding:12px 20px}",
      "#cart-root .cart-item{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line,#eef2f7);align-items:center}",
      "#cart-root .cart-item img{width:64px;height:64px;object-fit:contain;border:1px solid var(--line,#e3e9f1);border-radius:8px;background:var(--navy-50,#f3f6fa)}",
      "#cart-root .ci-info{flex:1;min-width:0}",
      "#cart-root .ci-info b{font-size:13.5px;display:block;line-height:1.35}",
      "#cart-root .ci-info small{color:var(--ink-3,#6b7688);font-size:12px}",
      "#cart-root .ci-ctrl{display:flex;gap:6px;align-items:center;margin-top:8px}",
      "#cart-root .ci-ctrl button{width:28px;height:28px;border:1px solid var(--line,#d9e1ec);background:#fff;border-radius:6px;cursor:pointer;font-size:15px;line-height:1}",
      "#cart-root .ci-ctrl input{width:52px;height:28px;text-align:center;border:1px solid var(--line,#d9e1ec);border-radius:6px}",
      "#cart-root .ci-ctrl .ci-moq{margin-left:4px;font-size:11px}",
      "#cart-root .ci-sub{text-align:right;min-width:84px}",
      "#cart-root .ci-sub b{color:var(--orange-600,#f97316);font-size:14px}",
      "#cart-root .ci-del{background:none;border:none;color:var(--ink-3,#6b7688);font-size:11.5px;cursor:pointer;margin-top:6px;text-decoration:underline}",
      "#cart-root .cart-empty{padding:48px 20px;text-align:center;color:var(--ink-3,#6b7688)}",
      "#cart-root .cart-foot{border-top:1px solid var(--line,#e3e9f1);padding:16px 20px}",
      "#cart-root .cart-total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}",
      "#cart-root .cart-total-row b{font-size:20px;color:var(--orange-600,#f97316)}",
      "#cart-root .co-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px dashed var(--line,#e3e9f1);font-size:13.5px}",
      "#cart-root .co-total-row{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:16px}",
      "#cart-root .co-total-row b{color:var(--orange-600,#f97316);font-size:20px}",
      "@media(max-width:560px){#cart-root .cart-drawer{width:100vw}}"
    ].join("\n");
    document.head.appendChild(style);

    var div = document.createElement("div");
    div.id = "cart-root";
    div.innerHTML =
      '<div class="cart-overlay" data-cart-close></div>'
      + '<aside class="cart-drawer" aria-label="Shopping cart">'
      + '<div class="cart-head"><h3 data-i18n="cart.title">Shopping Cart</h3><button class="m-close" data-cart-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>'
      + '<div class="cart-items" id="cart-items"></div>'
      + '<div class="cart-empty" id="cart-empty" style="display:none"><p data-i18n="cart.empty">Your cart is empty.</p><p style="font-size:13px"><a href="products.html" data-i18n="cart.continue">Browse products</a></p></div>'
      + '<div class="cart-foot" id="cart-foot" style="display:none">'
      + '<div class="cart-total-row"><span data-i18n="cart.total">Total</span><b id="cart-total"></b></div>'
      + '<button class="btn btn-primary btn-block" id="cart-checkout" data-i18n="cart.checkout">Checkout</button>'
      + "</div></aside>"
      + '<div id="checkout-modal" class="modal"><div class="modal-box">'
      + '<div class="m-head"><h3 data-i18n="cart.checkoutTitle">Checkout</h3><button class="m-close" data-checkout-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>'
      + '<div class="m-body">'
      + '<div id="co-items" style="margin-bottom:14px"></div>'
      + '<div class="co-total-row"><span data-i18n="cart.total">Total</span><b id="co-total"></b></div>'
      + '<form id="checkout-form" novalidate style="margin-top:14px">'
      + '<div class="form-grid">'
      + '<div class="field"><label data-i18n="quote.name"><span class="req">*</span> Your Name</label><input name="name" required></div>'
      + '<div class="field"><label data-i18n="quote.company">Company</label><input name="company"></div>'
      + '<div class="field"><label data-i18n="quote.email"><span class="req">*</span> Email</label><input name="email" type="email" required></div>'
      + '<div class="field"><label data-i18n="quote.whatsapp">WhatsApp Number</label><input name="whatsapp"></div>'
      + '<div class="field"><label data-i18n="quote.country">Country</label><input name="country"></div>'
      + '<div class="field"><label data-i18n="products.note">Order Notes</label><textarea name="note" rows="2" style="min-height:52px" data-i18n-ph="products.notePh"></textarea></div>'
      + '</div>'
      + '<p style="font-size:12.5px;color:var(--ink-3,#6b7688);margin:10px 0" data-o-note>' + esc(T("products.priceNote").replace("{term}", "EXW")) + "</p>"
      + '<button type="submit" class="btn btn-primary btn-block mt-2" data-i18n="cart.placeOrder">Place Order</button>'
      + "</form>"
      + '<div id="co-pay" class="hidden">'
      + '<div class="form-success" data-co-ok style="background:var(--ok,#16a34a);color:#fff;border-radius:10px;padding:14px 16px;margin-bottom:14px"><b data-i18n="products.orderDone">Order submitted. Our team will confirm payment details within 12 hours.</b></div>'
      + '<h3 data-i18n="payment.title">Secure Payment</h3>'
      + '<p style="color:var(--ink-2,#475569);font-size:14px;margin:6px 0 4px"><span data-i18n="payment.orderNo">Order No.</span>: <b data-co-no></b> · <span data-i18n="products.total">Estimated Total</span>: <b data-co-total style="color:var(--orange-600,#f97316);font-size:20px"></b></p>'
      + '<p style="color:var(--ink-3,#6b7688);font-size:12.5px;margin:0 0 16px" data-i18n="payment.sub">Choose your preferred payment method. All major currencies supported.</p>'
      + '<div class="row-gap" style="margin-bottom:16px">'
      + '<button class="btn btn-primary" data-paymethod="paypal" data-act="paypal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 12h10"/></svg> <span data-i18n="products.paypal">Pay with PayPal</span></button>'
      + '<button class="btn btn-outline" data-paymethod="bank" id="co-bank-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="11" rx="2"/><path d="M3 8l9-5 9 5M6 12v4M10 12v4M14 12v4M18 12v4"/></svg> <span data-i18n="products.bank">Bank Transfer (T/T)</span></button>'
      + "</div>"
      + '<form class="paypal-form" method="post" action="https://www.paypal.com/cgi-bin/webscr" target="_blank" rel="noopener" style="display:none">'
      + '<input type="hidden" name="cmd" value="_xclick"><input type="hidden" name="business"><input type="hidden" name="item_name"><input type="hidden" name="amount"><input type="hidden" name="currency_code" value="USD"><input type="hidden" name="custom">'
      + '<button type="submit" class="btn btn-primary btn-block" data-i18n="products.paypal">Pay with PayPal</button>'
      + "</form>"
      + '<div id="co-bank" class="hidden" style="background:var(--navy-50,#f3f6fa);border:1px solid var(--line,#e3e9f1);border-radius:12px;padding:16px">'
      + '<h4 data-i18n="payment.bankTitle">Bank Transfer Details</h4>'
      + "<p style='font-size:13px;line-height:1.9'><span data-i18n='payment.bankName'>Bank</span>: <b data-bank-name></b><br><span data-i18n='payment.beneficiary'>Beneficiary</span>: <b data-bank-ben></b><br><span data-i18n='payment.account'>Account</span>: <b data-bank-acct></b><br><span data-i18n='payment.swift'>SWIFT/IBAN</span>: <b data-bank-swift></b></p>"
      + '<p style="font-size:12.5px;color:var(--ink-3,#6b7688)"><span data-i18n="payment.bankNote">After transfer, reply to our confirmation email with the order number.</span></p>'
      + "</div>"
      + "</div>"
      + "</div></div></div>";
    document.body.appendChild(div);
    bind();
    renderCart();
  }

  function openCart() {
    inject();
    document.getElementById("cart-root").classList.add("open");
    renderCart();
  }
  function closeCart() {
    var r = document.getElementById("cart-root");
    if (r) r.classList.remove("open");
  }

  function bind() {
    var root = document.getElementById("cart-root");
    root.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cart-close]");
      if (c) { closeCart(); return; }
      var step = e.target.closest("[data-step]");
      if (step) {
        var item = step.closest(".cart-item");
        if (item) {
          var q = parseInt(item.querySelector("[data-qty-input]").value, 10) || 1;
          q += parseInt(step.getAttribute("data-step"), 10) || 0;
          if (q < 1) q = 1;
          setQty(item.getAttribute("data-key"), q);
        }
        return;
      }
      var del = e.target.closest("[data-del]");
      if (del) { removeItem(del.closest(".cart-item").getAttribute("data-key")); return; }
      var ck = e.target.closest("#cart-checkout");
      if (ck) { openCheckout(); return; }
      var ccl = e.target.closest("[data-checkout-close]");
      if (ccl) { document.getElementById("checkout-modal").classList.remove("open"); return; }
      var cm = e.target.closest("#checkout-modal");
      if (cm && e.target === cm) { cm.classList.remove("open"); return; }
      var pm = e.target.closest("[data-paymethod]");
      if (pm) {
        var method = pm.getAttribute("data-paymethod");
        var bankBox = document.getElementById("co-bank");
        var ppForm = root.querySelector("#co-pay form.paypal-form");
        if (method === "bank") {
          if (bankBox) bankBox.classList.remove("hidden");
          if (ppForm) ppForm.style.display = "none";
        } else {
          if (bankBox) bankBox.classList.add("hidden");
          if (ppForm) ppForm.style.display = "";
        }
        /* record payment method on latest order */
        var orders = Store.getOrders();
        if (orders[0]) { orders[0].payMethod = method; Store.saveOrders(orders); }
        return;
      }
    });
    root.addEventListener("input", function (e) {
      var inp = e.target.closest("[data-qty-input]");
      if (inp) {
        var item = inp.closest(".cart-item");
        if (item) {
          var q = parseInt(inp.value, 10) || 1;
          if (q < 1) q = 1;
          inp.value = q;
          setQty(item.getAttribute("data-key"), q);
        }
      }
    });
    var form = document.getElementById("checkout-form");
    if (form) form.addEventListener("submit", submitCheckout);
  }

  /* global openers */
  document.addEventListener("click", function (e) {
    var o = e.target.closest("[data-cart-open]");
    if (o) { e.preventDefault(); openCart(); return; }
    var ad = e.target.closest("[data-add-cart]");
    if (ad) { addToCart(ad.getAttribute("data-add-cart"), ad.getAttribute("data-qty")); return; }
  });
  document.addEventListener("DOMContentLoaded", function () {
    inject();
  });
  document.addEventListener("ht:i18n-applied", function () {
    renderCart();
    /* refresh dynamic price note in checkout */
    var note = document.querySelector("#checkout-form [data-o-note]");
    if (note) note.textContent = T("products.priceNote").replace("{term}", "EXW");
  });
  window.HT_Cart = { add: addToCart, open: openCart, close: closeCart, count: cartCount, refresh: renderCart };
})();
