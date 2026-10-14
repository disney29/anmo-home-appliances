/* ============================================================
   inquiry-basket.js — Inquiry Basket (询价篮)
   A lightweight "collect & compare then send one inquiry" basket,
   separate from the shopping cart. Products can be added from
   the product grid (products.html) and the product detail page
   (product.html). One shared basket across all pages (localStorage
   key: ht_inquiry). Submitting sends ONE inquiry covering all
   basket items, stored into ht_inquiries (same inbox as admin).
   Global API: window.HT_Inquiry = {add, open, close, count, refresh}
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

  var LS = "ht_inquiry";
  function load() {
    try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch (e) { return []; }
  }
  function save(v) {
    try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {}
    updateBadge();
  }
  function count() {
    return load().length;
  }
  function updateBadge() {
    document.querySelectorAll("[data-inquiry-count]").forEach(function (b) {
      var n = count();
      b.textContent = n > 99 ? "99+" : String(n);
      b.style.display = n ? "" : "none";
    });
  }

  /* ---------- add / remove / qty ---------- */
  function add(pid, qty) {
    var p = prodById(pid);
    if (!p) return;
    var list = load().slice();
    var found = null;
    for (var i = 0; i < list.length; i++) if (list[i].pid === pid) { found = list[i]; break; }
    var q = packQty(parseInt(qty, 10) || (p.moq ? parseInt(p.moq, 10) : packingOf(p)), packingOf(p));
    if (found) found.qty += q; else list.push({ pid: pid, qty: q });
    save(list);
    window.HT_Toast((pName(p) || pid) + " → " + T("inquiry.added"));
    if (document.getElementById("inquiry-items")) renderBasket();
    /* reflect "added" state on the clicked button (if any) */
  }

  /* carton packing: cart quantity must be a multiple of p.packing (default 24) */
  function packingOf(p) { return parseInt(p && p.packing, 10) || 24; }
  function packQty(q, pk) { q = parseInt(q, 10) || pk; return Math.ceil(q / pk) * pk; }

  function setQty(pid, q) {
    var list = load().slice();
    var item = null;
    for (var i = 0; i < list.length; i++) if (list[i].pid === pid) { item = list[i]; break; }
    if (!item) return;
    var p = prodById(pid);
    var pk = packingOf(p);
    var moq = p ? (parseInt(p.moq, 10) || 0) : 0;
    q = parseInt(q, 10) || (moq || pk);
    if (moq && q < moq) q = moq;
    if (q < 1) q = pk;
    item.qty = packQty(q, pk);
    save(list);
    renderBasket();
  }
  function remove(pid) {
    save(load().filter(function (x) { return x.pid !== pid; }));
    renderBasket();
  }
  function clear() { save([]); renderBasket(); }

  /* ---------- drawer render ---------- */
  function renderBasket() {
    var wrap = document.getElementById("inquiry-items");
    var empty = document.getElementById("inquiry-empty");
    var foot = document.getElementById("inquiry-foot");
    var totalEl = document.getElementById("inquiry-count-num");
    var list = load();
    if (!wrap) return;
    if (!list.length) {
      wrap.innerHTML = "";
      if (empty) empty.style.display = "";
      if (foot) foot.style.display = "none";
      updateBadge();
      return;
    }
    if (empty) empty.style.display = "none";
    if (foot) foot.style.display = "";
    var html = "";
    list.forEach(function (c) {
      var p = prodById(c.pid);
      if (!p) return;
      var moq = parseInt(p.moq, 10) || 0;
      var pk = packingOf(p);
      html += '<div class="inquiry-item" data-pid="' + esc(c.pid) + '">'
        + '<img src="' + esc(p.image) + '" alt="' + esc(pName(p)) + '" loading="lazy">'
        + '<div class="ii-info"><b>' + esc(pName(p)) + "</b>"
        + "<small>" + esc((p.model || p.id || "").toUpperCase()) + " · " + esc((Util.priceFmt(p) || T("common.priceOnRequest")) + " / " + unitTxt(p)) + "</small>"
        + '<div class="ii-ctrl"><button data-step="-' + pk + '" aria-label="Decrease">−</button>'
        + '<input type="number" min="' + (moq || pk) + '" step="' + pk + '" value="' + c.qty + '" data-qty-input>'
        + '<button data-step="' + pk + '" aria-label="Increase">+</button>'
        + '<small class="ii-carton" style="display:block;color:#64748b;font-size:10.5px;margin-top:2px">' + esc(T("inquiry.cartonNote").replace("{n}", pk)) + "</small>"
        + "</div></div>"
        + '<button class="ii-del" data-del aria-label="Remove">' + esc(T("inquiry.remove")) + "</button>"
        + "</div>";
    });
    wrap.innerHTML = html;
    if (totalEl) totalEl.textContent = String(list.length);
    updateBadge();
  }

  /* ---------- submit inquiry ---------- */
  function submitInquiry(e) {
    e.preventDefault();
    var form = document.getElementById("inquiry-form");
    if (!form) return;
    var data = {};
    form.querySelectorAll("[name]").forEach(function (f) { data[f.name] = f.value.trim(); });
    if (!data.name || !data.email) { window.HT_Toast(T("common.required"), "err"); return; }
    var list = load();
    if (!list.length) { window.HT_Toast(T("inquiry.empty"), "err"); return; }
    var items = [];
    list.forEach(function (c) {
      var p = prodById(c.pid);
      if (p) items.push({ pid: p.id, model: p.model || p.id, name: pName(p), qty: parseInt(c.qty, 10) || 1, unit: p.unit || "pcs", term: p.term || "FOB" });
    });
    var payload = {
      name: data.name, company: data.company, email: data.email,
      whatsapp: data.whatsapp, country: data.country, msg: data.msg || "",
      items: items,
      product: items.map(function (it) { return it.model + " " + it.name + " ×" + it.qty + " " + it.unit; }).join("; "),
      qty: items.reduce(function (s, it) { return s + it.qty; }, 0),
      _type: "basket-inquiry", _date: new Date().toISOString(), _status: "new"
    };
    var list2 = Store.getInquiries();
    list2.unshift(payload);
    Store.saveInquiries(list2);
    clear();
    form.reset();
    var suc = document.getElementById("inquiry-success");
    if (suc) suc.classList.remove("hidden");
    closeBasket();
    setTimeout(function () {
      if (suc) suc.classList.add("hidden");
      window.HT_Toast(T("inquiry.submitted"));
    }, 400);
  }

  /* ---------- open / close ---------- */
  function openBasket() {
    inject();
    renderBasket();
    document.getElementById("inquiry-root").classList.add("open");
    var suc = document.getElementById("inquiry-success");
    if (suc) suc.classList.add("hidden");
  }
  function closeBasket() {
    var r = document.getElementById("inquiry-root");
    if (r) r.classList.remove("open");
  }

  /* ---------- DOM injection ---------- */
  function inject() {
    if (document.getElementById("inquiry-root")) return;
    var style = document.createElement("style");
    style.textContent = [
      "#inquiry-root .inquiry-overlay{position:fixed;inset:0;background:rgba(9,17,33,.45);opacity:0;pointer-events:none;transition:opacity .25s;z-index:1250}",
      "#inquiry-root.open .inquiry-overlay{opacity:1;pointer-events:auto}",
      "#inquiry-root .inquiry-drawer{position:fixed;top:0;right:0;bottom:0;width:min(440px,94vw);background:#fff;z-index:1251;transform:translateX(105%);transition:transform .3s;display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(9,17,33,.18)}",
      "#inquiry-root.open .inquiry-drawer{transform:none}",
      "#inquiry-root .inquiry-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line,#e3e9f1);background:var(--navy-800,#14213d);color:#fff}",
      "#inquiry-root .inquiry-head h3{margin:0;font-size:17px;display:flex;align-items:center;gap:8px}",
      "#inquiry-root .inquiry-head .m-close{color:#fff}",
      "#inquiry-root .inquiry-items{flex:1;overflow-y:auto;padding:12px 20px}",
      "#inquiry-root .inquiry-item{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line,#eef2f7);align-items:center}",
      "#inquiry-root .inquiry-item img{width:60px;height:60px;object-fit:contain;border:1px solid var(--line,#e3e9f1);border-radius:8px;background:var(--navy-50,#f3f6fa)}",
      "#inquiry-root .ii-info{flex:1;min-width:0}",
      "#inquiry-root .ii-info b{font-size:13.5px;display:block;line-height:1.35}",
      "#inquiry-root .ii-info small{color:var(--ink-3,#6b7688);font-size:11.5px}",
      "#inquiry-root .ii-ctrl{display:flex;gap:6px;align-items:center;margin-top:8px}",
      "#inquiry-root .ii-ctrl button{width:26px;height:26px;border:1px solid var(--line,#d9e1ec);background:#fff;border-radius:6px;cursor:pointer;font-size:14px;line-height:1}",
      "#inquiry-root .ii-ctrl input{width:52px;height:26px;text-align:center;border:1px solid var(--line,#d9e1ec);border-radius:6px}",
      "#inquiry-root .ii-del{background:none;border:none;color:var(--ink-3,#6b7688);font-size:11.5px;cursor:pointer;text-decoration:underline;align-self:flex-start;margin-top:6px}",
      "#inquiry-root .inquiry-empty{padding:48px 20px;text-align:center;color:var(--ink-3,#6b7688)}",
      "#inquiry-root .inquiry-foot{border-top:1px solid var(--line,#e3e9f1);padding:16px 20px}",
      "#inquiry-root .inquiry-total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;color:var(--ink-2,#475569)}",
      "#inquiry-root .inquiry-total-row b{font-size:17px;color:var(--orange-600,#f97316)}",
      "#inquiry-root .inquiry-form .form-grid{grid-template-columns:1fr 1fr}",
      "#inquiry-root .inquiry-success{background:var(--ok,#16a34a);color:#fff;border-radius:10px;padding:14px 16px;margin-bottom:14px;font-size:13.5px}",
      "@media(max-width:560px){#inquiry-root .inquiry-drawer{width:100vw}#inquiry-root .inquiry-form .form-grid{grid-template-columns:1fr}}"
    ].join("\n");
    document.head.appendChild(style);

    var div = document.createElement("div");
    div.id = "inquiry-root";
    div.innerHTML =
      '<div class="inquiry-overlay" data-inquiry-close></div>'
      + '<aside class="inquiry-drawer" aria-label="Inquiry basket">'
      + '<div class="inquiry-head"><h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:19px;height:19px"><path d="M9 6.75V15m6-8.25V15M9 6.75a2.25 2.25 0 012.25-2.25h1.5A2.25 2.25 0 0115 6.75M4.5 9.75h15M5.25 6.75h13.5l1.5 13.5H3.75L5.25 6.75z"/></svg> ' + esc(T("inquiry.title")) + "</h3><button class='m-close' data-inquiry-close aria-label='Close'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M18 6L6 18M6 6l12 12'/></svg></button></div>"
      + '<div class="inquiry-items" id="inquiry-items"></div>'
      + '<div class="inquiry-empty" id="inquiry-empty" style="display:none"><p>' + esc(T("inquiry.empty")) + '</p><p style="font-size:13px"><a href="products.html">' + esc(T("inquiry.browse")) + "</a></p></div>"
      + '<div class="inquiry-foot" id="inquiry-foot" style="display:none">'
      + '<div class="inquiry-total-row"><span>' + esc(T("inquiry.items")) + '</span><b><span id="inquiry-count-num"></span> ' + esc(T("inquiry.products")) + "</b></div>"
      + '<div id="inquiry-success" class="inquiry-success hidden">' + esc(T("inquiry.submitted")) + "</div>"
      + '<form id="inquiry-form" class="inquiry-form" novalidate>'
      + '<div class="form-grid">'
      + '<div class="field"><label data-i18n="quote.name"><span class="req">*</span> ' + esc(T("quote.name")) + '</label><input name="name" required></div>'
      + '<div class="field"><label data-i18n="quote.company">' + esc(T("quote.company")) + '</label><input name="company"></div>'
      + '<div class="field"><label data-i18n="quote.email"><span class="req">*</span> ' + esc(T("quote.email")) + '</label><input name="email" type="email" required></div>'
      + '<div class="field"><label data-i18n="quote.whatsapp">' + esc(T("quote.whatsapp")) + '</label><input name="whatsapp"></div>'
      + '<div class="field"><label data-i18n="quote.country">' + esc(T("quote.country")) + '</label><input name="country"></div>'
      + '<div class="field full"><label data-i18n="products.requestSub">' + esc(T("products.requestSub")) + '</label><textarea name="msg" rows="2" style="min-height:52px"></textarea></div>'
      + "</div>"
      + '<button type="submit" class="btn btn-primary btn-block mt-2" data-inquiry-submit>' + esc(T("inquiry.submit")) + "</button>"
      + "</form>"
      + "</div></aside>";
    document.body.appendChild(div);
    bind();
    renderBasket();
  }

  function bind() {
    var root = document.getElementById("inquiry-root");
    root.addEventListener("click", function (e) {
      var c = e.target.closest("[data-inquiry-close]");
      if (c) { closeBasket(); return; }
      var step = e.target.closest("[data-step]");
      if (step) {
        var item = step.closest(".inquiry-item");
        if (item) {
          var q = parseInt(item.querySelector("[data-qty-input]").value, 10) || 1;
          q += parseInt(step.getAttribute("data-step"), 10) || 0;
          if (q < 1) q = 1;
          setQty(item.getAttribute("data-pid"), q);
        }
        return;
      }
      var del = e.target.closest("[data-del]");
      if (del) { remove(del.closest(".inquiry-item").getAttribute("data-pid")); return; }
    });
    root.addEventListener("input", function (e) {
      var inp = e.target.closest("[data-qty-input]");
      if (inp) {
        var item = inp.closest(".inquiry-item");
        if (item) {
          var q = parseInt(inp.value, 10) || 1;
          if (q < 1) q = 1;
          inp.value = q;
          setQty(item.getAttribute("data-pid"), q);
        }
      }
    });
    var form = document.getElementById("inquiry-form");
    if (form) form.addEventListener("submit", submitInquiry);
  }

  /* ---------- global delegation: open + add ---------- */
  document.addEventListener("click", function (e) {
    var o = e.target.closest("[data-inquiry-open]");
    if (o) { e.preventDefault(); openBasket(); return; }
    var ad = e.target.closest("[data-add-inquiry]");
    if (ad) { add(ad.getAttribute("data-add-inquiry"), ad.getAttribute("data-qty")); return; }
    var pd = e.target.closest("[data-pd-inquiry]");
    if (pd) { add(pd.getAttribute("data-pd-inquiry"), pd.getAttribute("data-qty")); return; }
  });

  document.addEventListener("DOMContentLoaded", function () {
    inject();
  });
  document.addEventListener("ht:i18n-applied", function () {
    renderBasket();
  });

  window.HT_Inquiry = { add: add, open: openBasket, close: closeBasket, count: count, refresh: renderBasket };
})();
