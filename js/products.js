/* ============================================================
   products.js — Product grid, filtering, quote & order (payment)
   Used on products.html (and anywhere a #prod-grid exists)
   ============================================================ */
(function () {
  "use strict";

  var T = function (k) { return window.HT_I18N.t(k); };
  var Store = window.HT_Store;
  var Util = window.HT_Util;

  function pName(p) {
    var names = window.HT_PRODUCT_NAMES || {};
    var byLang = names[window.HT_I18N.current] || {};
    // v2: per-product multilingual names (editable in admin) take priority
    if (p.names && typeof p.names === 'object') {
      var n = p.names[window.HT_I18N.current];
      if (n) return n;
      if (p.names.en) return p.names.en;
    }
    return byLang[p.id] || p.name;
  }
  function catName(c) {
    var cats = Store.getCats();
    for (var i = 0; i < cats.length; i++) {
      var x = cats[i];
      var id = typeof x === "string" ? x : x.id;
      if (id === c && typeof x === "object" && x.name) {
        var lang = (window.HT_I18N && window.HT_I18N.current) || "en";
        return x.name[lang] || x.name.en || T("categories." + c);
      }
    }
    return T("categories." + c);
  }

  function unitTxt(p) {
    var u = (p && p.unit) || "pcs";
    var k = "units." + u;
    var tr = T(k);
    return tr && tr !== k ? tr : u;
  }
  function priceTxt(p) {
    var price = Util.priceFmt(p);
    if (!price) return T("common.priceOnRequest");
    return price + " / " + unitTxt(p);
  }
  function priceNoteTxt() {
    return T("products.priceNote").replace("{term}", "FOB");
  }

  function buildFilters() {
    var wrap = document.getElementById("filter-chips");
    if (!wrap) return;
    var cats = Store.getCats();
    var html = '<button class="chip active" data-cat="all">' + Util.esc(T("common.all")) + "</button>";
    cats.forEach(function (c) {
      var id = typeof c === "string" ? c : c.id;
      html += '<button class="chip" data-cat="' + Util.esc(id) + '">' + Util.esc(catName(id)) + "</button>";
    });
    wrap.innerHTML = html;
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      wrap.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      state.cat = b.getAttribute("data-cat");
      render();
    });
  }

  var state = { cat: "all", q: "" };

  function render() {
    var grid = document.getElementById("prod-grid");
    if (!grid) return;
    var list = Store.getProducts();
    var q = state.q.toLowerCase();
    var filtered = list.filter(function (p) {
      if (!p.active) return false;
      if (state.cat !== "all" && p.category !== state.cat) return false;
      if (q) {
        var hay = (p.name + " " + p.category + " " + (p.certs || "") + " " + (p.features || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var count = document.getElementById("prod-count");
    if (count) count.innerHTML = "<b>" + filtered.length + "</b> " + Util.esc(T("products.results"));

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><p>' + Util.esc(T("products.noResults")) + "</p></div>";
      return;
    }
    var html = "";
    filtered.forEach(function (p) {
      var priceHtml = '<div class="p-price">' + Util.esc(priceTxt(p)) + "</div>";
      if (p.priceTiers && p.priceTiers.length > 1) priceHtml += '<div class="p-tier-hint">' + Util.esc(T("product.tierTitle")) + "</div>";
      html += '<article class="card prod-card reveal in">'
        + '<div class="p-img"><span class="p-cat' + (p.hot ? " hot" : "") + '">' + Util.esc(catName(p.category)) + "</span>"
        + '<a href="product.html?id=' + encodeURIComponent(p.id) + '" class="p-img-link" aria-label="' + Util.esc(pName(p)) + '"><img src="' + Util.esc(p.image) + '" alt="' + Util.esc(pName(p)) + '" loading="lazy"></a></div>'
        + '<div class="p-body"><h3><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + Util.esc(pName(p)) + "</a></h3>"
        + '<div class="p-specs">'
        + "<span><b>" + Util.esc(T("common.voltage")) + '</b>' + Util.esc(p.voltage || "—") + "</span>"
        + "<span><b>" + Util.esc(T("common.capacity")) + '</b>' + Util.esc(p.capacity || "—") + "</span>"
        + "<span><b>" + Util.esc(T("common.material")) + '</b>' + Util.esc(p.material || "—") + "</span>"
        + "<span><b>" + Util.esc(T("common.moq")) + "</b>" + (p.moq || "—") + " " + Util.esc(T("common.pcs")) + "</span>"
        + (p.certs ? "<span><b>" + Util.esc(T("common.certsLabel")) + '</b>' + Util.esc(p.certs) + "</span>" : "")
        + "</div>"
        + priceHtml
        + '<div class="p-foot"><a class="btn btn-outline btn-sm" href="product.html?id=' + p.id + '">' + Util.esc(T("products.details")) + '</a>'
        + '<button class="btn btn-outline btn-sm" data-add-inquiry="' + p.id + '">' + Util.esc(T("inquiry.add")) + '</button>'
        + '<button class="btn btn-outline btn-sm" data-act="quote" data-id="' + p.id + '">' + Util.esc(T("products.addQuote")) + '</button>'
        + '<button class="btn btn-primary btn-sm" data-add-cart="' + p.id + '">' + Util.esc(T("cart.add")) + "</button></div>"
        + "</div></article>";
    });
    grid.innerHTML = html;
    grid.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = list.find(function (x) { return x.id === b.getAttribute("data-id"); });
        if (b.getAttribute("data-act") === "quote") openQuote(p);
        else if (b.getAttribute("data-act") === "order") openOrder(p);
      });
    });
  }

  function collectContact(form) {
    var data = {};
    form.querySelectorAll("[name]").forEach(function (f) { data[f.name] = f.value.trim(); });
    return data;
  }

  /* ---------- Quote modal ---------- */
  function openQuote(p) {
    var m = document.getElementById("quote-modal");
    if (!m) return;
    m.querySelector("[data-q-name]").textContent = pName(p);
    m.querySelector("img").src = p.image;
    m.querySelector("img").alt = pName(p);
    var modelTag = (p.model || p.id || "").toUpperCase();
    m.querySelector("[name=product]").value = (modelTag ? modelTag + " · " : "") + pName(p);
    m.querySelector(".form-success").classList.add("hidden");
    m.classList.add("open");
  }

  /* ---------- Order (payment) modal ---------- */
  function openOrder(p) {
    var m = document.getElementById("order-modal");
    if (!m) return;
    m.querySelector("[data-o-name]").textContent = pName(p);
    m.querySelector("[data-o-img]").src = p.image;
    m.querySelector("[name=product]").value = pName(p);
    var pidEl = m.querySelector("[name=pid]");
    if (pidEl) pidEl.value = p.id;
    var unit = document.getElementById("o-unit");
    var totalEl = document.getElementById("o-total");
    var qty = document.getElementById("o-qty");
    var hint = document.getElementById("o-moq-hint");
    if (qty && p.moq) qty.value = p.moq;
    function calc() {
      var q = parseInt(qty.value, 10) || 1;
      var up = Util.curPrice(p);
      if (unit) unit.textContent = up !== null ? Util.priceFmt(p) + " / " + unitTxt(p) : T("common.priceOnRequest");
      if (totalEl) totalEl.textContent = up !== null ? Util.curSym() + Util.money(up * q) : T("common.priceOnRequest");
      if (hint) {
        var moq = parseInt(p.moq, 10) || 0;
        var msg = moq && q < moq ? T("products.moqHint").replace("{moq}", moq).replace("{unit}", unitTxt(p)) : "";
        hint.textContent = msg;
        hint.style.display = msg ? "" : "none";
      }
      var payBtn = m.querySelector("[data-act=paypal]");
      if (payBtn) payBtn.style.display = up !== null ? "" : "none";
    }
    qty.addEventListener("input", calc);
    calc();
    m.querySelector(".form-success").classList.add("hidden");
    var noteEl = m.querySelector("[data-o-note]");
    if (noteEl) noteEl.textContent = T("products.priceNote").replace("{term}", p.term || "FOB");
    m.classList.add("open");
  }

  document.addEventListener("DOMContentLoaded", function () {
    // preset category from URL
    var mc = (location.search || "").match(/[?&]cat=([a-z]+)/i);
    if (mc) state.cat = mc[1];

    buildFilters();

    var search = document.getElementById("prod-search");
    if (search) {
      search.addEventListener("input", function () { state.q = search.value; render(); });
      search.setAttribute("placeholder", T("products.search"));
    }

    render();

    /* close modals */
    document.querySelectorAll(".modal").forEach(function (m) {
      m.addEventListener("click", function (e) {
        var sb = e.target.closest("[data-step]");
        if (sb) {
          var inp = m.querySelector("#o-qty");
          if (inp) {
            var q = parseInt(inp.value, 10) || 1;
            var nq = q + (parseInt(sb.getAttribute("data-step"), 10) || 0);
            if (nq < 1) nq = 1;
            inp.value = nq;
            var evt = document.createEvent("Event");
            evt.initEvent("input", true, true);
            inp.dispatchEvent(evt);
          }
          return;
        }
        if (e.target === m || (e.target.closest && e.target.closest(".m-close"))) m.classList.remove("open");
      });
    });

    /* quote modal submit */
    var qForm = document.getElementById("quote-form");
    if (qForm) {
      qForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = collectContact(qForm);
        if (!data.name || !data.email) { window.HT_Toast(T("common.required"), "err"); return; }
        data._type = "product-quote";
        data._date = new Date().toISOString();
        data._status = "new";
        var list = Store.getInquiries();
        list.unshift(data);
        Store.saveInquiries(list);
        qForm.reset();
        var suc = qForm.querySelector(".form-success");
        suc.classList.remove("hidden");
        suc.querySelector("[data-suc-msg]").textContent = T("quote.successMsg");
        setTimeout(function () { document.getElementById("quote-modal").classList.remove("open"); }, 2600);
      });
    }

    /* order modal submit -> create order -> show payment options */
    var oForm = document.getElementById("order-form");
    if (oForm) {
      oForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = collectContact(oForm);
        if (!data.name || !data.email) { window.HT_Toast(T("common.required"), "err"); return; }
        var p = Store.getProducts().find(function (x) { return x.id === data.pid; });
        var qty = parseInt(data.qty, 10) || 1;
        var uprice = p ? (Util.curPrice(p) || 0) : 0;
        var total = uprice ? (uprice * qty) : 0;
        var curS = Store.getSettings();
        var order = {
          id: Util.uid("ord"), pid: p ? p.id : "", product: data.product, qty: qty,
          total: total, customer: data.name, email: data.email, whatsapp: data.whatsapp,
          country: data.country, note: data.note || "", term: p ? (p.term || "FOB") : "FOB",
          unit: p ? (p.unit || "pcs") : "pcs", currency: "USD",
          payMethod: "", status: "pending", date: new Date().toISOString()
        };
        var orders = Store.getOrders();
        orders.unshift(order);
        Store.saveOrders(orders);
        // show payment options step
        oForm.classList.add("hidden");
        var payBox = document.getElementById("order-pay");
        payBox.classList.remove("hidden");
        payBox.querySelector("[data-o-no]").textContent = order.id;
        var conv = p ? Util.curPrice(p) : null;
        var totalTxt = total ? Util.curSym() + Util.money((conv || 0) * qty) : T("common.priceOnRequest");
        payBox.querySelector("[data-o-total]").textContent = totalTxt;
        var unitLine = payBox.querySelector("[data-o-unit]");
        if (unitLine) unitLine.textContent = p && conv !== null ? Util.priceFmt(p) + " / " + unitTxt(p) : "";
        var okBar = payBox.querySelector("[data-o-ok]");
        if (okBar) okBar.classList.remove("hidden");
        var settings = Store.getSettings();
        payBox.querySelector("[data-bank-name]").textContent = settings.bankName || "—";
        payBox.querySelector("[data-bank-ben]").textContent = settings.beneficiary || "—";
        payBox.querySelector("[data-bank-acct]").textContent = settings.account || "—";
        payBox.querySelector("[data-bank-swift]").textContent = settings.swift || "—";
        var ppForm = payBox.querySelector("form.paypal-form");
        if (ppForm) {
          ppForm.business.value = settings.paypal || "";
          ppForm.item_name.value = data.product + " x" + qty;
          ppForm.amount.value = total ? total.toFixed(2) : "";
          ppForm.custom.value = order.id;
          ppForm.style.display = total ? "" : "none";
        }
      });
    }

    /* update order payment method on selection */
    document.querySelectorAll("[data-paymethod]").forEach(function (b) {
      b.addEventListener("click", function () {
        var orders = Store.getOrders();
        if (orders[0]) { orders[0].payMethod = b.getAttribute("data-paymethod"); Store.saveOrders(orders); }
        var method = b.getAttribute("data-paymethod");
        var bankBox = document.getElementById("bank-box");
        var ppForm = document.querySelector(".paypal-form");
        if (method === "bank") {
          if (bankBox) bankBox.classList.remove("hidden");
          if (ppForm) ppForm.style.display = "none";
        } else {
          if (bankBox) bankBox.classList.add("hidden");
          if (ppForm) ppForm.style.display = "";
        }
      });
    });

    /* re-render on language change */
    document.addEventListener("ht:i18n-applied", function () {
      render();
      var s = document.getElementById("prod-search");
      if (s) s.setAttribute("placeholder", T("products.search"));
      document.querySelectorAll(".modal").forEach(function (m) { m.classList.remove("open"); });
    });
  });

  /* expose for product detail page (product.html) */
  window.HT_ProductActions = { openQuote: openQuote, openOrder: openOrder };
})();
