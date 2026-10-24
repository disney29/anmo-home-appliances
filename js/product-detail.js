/* ============================================================
   product-detail.js — Renders product.html (independent detail
   page, Google-indexable, ?id= routing).
   Layout follows the LILIPRO-style detail structure:
   top: gallery (main image + spec bubbles + thumbnails + social
        proof + Add to Inquiry Basket) / info column (price, key
        specs, actions);
   bottom: tabbed body — Product Details / Supplier Details
        (collapsible highlights & attributes, tiered pricing,
        detail photo, feature icon grid).
   Reuses quote/order modals bound by products.js and the shared
   Inquiry Basket (js/inquiry-basket.js).
   ============================================================ */
(function () {
  "use strict";

  var Store = window.HT_Store;
  var Util = window.HT_Util;

  function T(k) { return window.HT_I18N.t(k); }
  function cur() { return window.HT_I18N.current; }
  function L(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    var c = cur();
    if (typeof v[c] === "string" && v[c] !== "") return v[c];
    if (typeof v.en === "string") return v.en;
    return "";
  }
  function pName(p) {
    if (p.names && typeof p.names === "object") {
      var n = p.names[cur()];
      if (n) return n;
      if (p.names.en) return p.names.en;
    }
    var names = window.HT_PRODUCT_NAMES || {};
    var byLang = names[cur()] || {};
    return byLang[p.id] || p.name;
  }
  function esc(s) { return Util.esc(s); }
  function getParam(name) {
    var m = (location.search || "").match(new RegExp("[?&]" + name + "=([^&]+)"));
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  }
  function catName(c) { return T("categories." + c); }
  function money(n) {
    if (n === null || n === undefined || n === "" || isNaN(n)) return null;
    return Util.money(n);
  }
  function unitTxt(p) {
    var u = (p && p.unit) || "pcs";
    var k = "units." + u;
    var tr = T(k);
    return tr && tr !== k ? tr : u;
  }
  /* unit price WITHOUT trade term (term shown as hint below) */
  function unitPriceTxt(p) {
    var price = Util.priceFmt(p);
    if (!price) return T("common.priceOnRequest");
    return price + " / " + unitTxt(p);
  }
  function modelOf(p) {
    if (p && p.model) return p.model;
    /* extract real model from product name (e.g. "KM-2381 Professional Hair Clipper") */
    if (p && p.name) {
      var m = String(p.name).match(/(PROKM-|KM-PG|KM-)[A-Z0-9-]+/i);
      if (m) return m[0].toUpperCase();
    }
    return p && p.id ? String(p.id).toUpperCase() : "";
  }
  /* tiered pricing table html (only when priceTiers present) */
  function tiersHtml(p) {
    if (!p || !p.priceTiers || !p.priceTiers.length) return "";
    var rows = p.priceTiers.filter(function (t) { return t && t.price != null; });
    if (!rows.length) return "";
    var html = '<div class="pd-block"><h3>' + esc(T("product.tierTitle")) + '</h3><table class="pd-specs pd-tiers"><tbody>';
    rows.forEach(function (t) {
      var range = t.qtyMax ? t.qtyMin + " – " + t.qtyMax : t.qtyMin + "+";
      html += "<tr><th>" + esc(range) + " " + esc(T("common.pcs")) + "</th><td>" + esc("$" + money(t.price)) + " / " + esc(unitTxt(p)) + "</td></tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  function clampBlock(id, innerHtml, maxLines) {
    return '<div class="pd-block"><div class="clamp-wrap" data-clamp-lines="' + maxLines + '">' + innerHtml
      + '</div><button class="btn btn-ghost btn-sm clamp-toggle" type="button">' + esc(T("product.viewMore")) + "</button></div>";
  }

  /* ---------- spec list (Product Description style) ---------- */
  function specListHtml(p) {
    var rows = [];
    function add(label, v) { if (v !== undefined && v !== null && v !== "") rows.push([label, String(v)]); }
    add(T("common.model"), modelOf(p));
    add(T("common.voltage"), p.voltage);
    if (p.power) add(T("product.power"), p.power);
    add(T("common.material"), p.material);
    add(T("common.capacity"), p.capacity);
    if (p.size) add(T("common.size"), p.size);
    if (p.color) add(T("common.color"), p.color);
    if (p.packaging) add(T("common.packaging"), p.packaging);
    if (p.accessories) add(T("product.accessories"), p.accessories);
    if (!rows.length) return "";
    var html = '<div class="pd-block"><h3>' + esc(T("product.descShort")) + '</h3><ul class="pd-spec-list">';
    rows.forEach(function (r) {
      html += "<li><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2'><path d='M20 6L9 17l-5-5'/></svg><span>" + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></li>";
    });
    html += "</ul></div>";
    return html;
  }

  /* ---------- feature icon grid (6 tiles) ---------- */
  var FEAT_ICONS = [
    '<path d="M13 2L4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2z"/>',           /* bolt   */
    '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/>', /* shield */
    '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/>', /* star   */
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',             /* clock  */
    '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>', /* cpu */
    '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.7 1.5 1.7 1.5 2.5h5c0-.8.7-1.8 1.5-2.5A6 6 0 0012 3z"/>' /* bulb */
  ];
  function featGridHtml(p) {
    if (!p.features) return "";
    var items = String(p.features).split("\n").map(function (f) { return f.trim(); }).filter(Boolean).slice(0, 6);
    if (!items.length) return "";
    var html = '<div class="pd-block"><h3>' + esc(T("product.features")) + '</h3><div class="pd-feat-grid">';
    items.forEach(function (f, i) {
      html += '<div class="pd-feat-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">' + FEAT_ICONS[i % FEAT_ICONS.length] + "</svg><span>" + esc(f) + "</span></div>";
    });
    html += "</div></div>";
    return html;
  }

  /* ---------- detail photo (multi-image grid, auto height) ---------- */
  function detailPhotoHtml(p, detailImgs) {
    var extra = detailImgs.filter(function (x) { return x; });
    if (!extra.length) return "";
    var html = '<div class="pd-block"><h3>' + esc(T("product.detailedPhoto")) + '</h3><div class="pd-photo-grid">';
    extra.forEach(function (im, i) {
      html += '<figure class="pd-photo-item"><img src="' + esc(im) + '" alt="' + esc(pName(p)) + ' Detail ' + (i + 1) + '" loading="lazy" data-pd-detail="' + i + '"></figure>';
    });
    html += "</div></div>";
    return html;
  }

  /* ---------- tabs ---------- */
  function tabsHtml() {
    return '<div class="pd-tabs" role="tablist">'
      + '<button class="pd-tab-btn active" data-tab="details" role="tab" aria-selected="true">' + esc(T("product.tabDetails")) + "</button>"
      + '<button class="pd-tab-btn" data-tab="supplier" role="tab" aria-selected="false">' + esc(T("product.tabSupplier")) + "</button>"
      + "</div>";
  }

  /* ---------- supplier tab ---------- */
  function supplierTabHtml(p) {
    var s = Store.getSettings();
    var waNum = (s.whatsapp || "").replace(/[^\d]/g, "");
    var html = '<div class="pd-block">'
      + '<h3>' + esc(s.companyName || "ANMO HOME APPLIANCES") + "</h3>"
      + '<p class="pd-desc-text">' + esc(T("supplier.intro")) + "</p></div>"
      + '<div class="pd-block"><h3>' + esc(T("supplier.certTitle")) + "</h3><ul class='pd-supplier-list'>";
    var certs = ["CE", "CB", "UL", "RoHS", "ERP"];
    certs.forEach(function (c) {
      html += "<li><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2'><path d='M20 6L9 17l-5-5'/></svg>" + esc(c) + "</li>";
    });
    if (p.certs) html += "<li><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2'><path d='M20 6L9 17l-5-5'/></svg>" + esc(p.certs) + "</li>";
    html += "</ul></div>"
      + '<div class="pd-block"><h3>' + esc(T("supplier.oemTitle")) + "</h3><p class=\"pd-desc-text\">" + esc(T("supplier.oem")) + "</p></div>"
      + '<div class="pd-block"><h3>' + esc(T("supplier.factoryTitle")) + "</h3><p class=\"pd-desc-text\">" + esc(T("supplier.factory")) + "</p>"
      + "<p style='margin-top:8px;color:var(--ink-2);font-size:14px'>" + esc(s.address || "") + "</p></div>"
      + '<div class="pd-block"><h3>' + esc(T("supplier.contactTitle")) + "</h3><ul class='pd-supplier-list'>"
      + "<li><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='2' y='4' width='20' height='16' rx='2'/><path d='M22 7l-10 6L2 7'/></svg><a href='mailto:" + esc(s.email || "") + "'>" + esc(s.email || "") + "</a></li>"
      + "<li><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L8 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z'/></svg><a href='tel:" + esc(s.phone || "") + "'>" + esc(s.phone || "") + "</a></li>"
      + "<li><svg viewBox='0 0 24 24' fill='currentColor'><path d='M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.1.2-.2.4-.4.6l-.5.6c-.2.2-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.4.7 1.7.8.3.1.5.2.6.3.1.1.1.5-.1 1z'/></svg><a href='https://wa.me/" + esc(waNum) + "' target='_blank' rel='noopener'>WhatsApp</a></li>"
      + "</ul></div>";
    return html;
  }

  function render() {
    var id = getParam("id");
    var list = Store.getProducts();
    var p = id
      ? list.find(function (x) { return x.id === id; })
      : list.find(function (x) { return x.active; });
    var main = document.getElementById("pd-main");
    if (!main) return;

    /* remove old JSON-LD to avoid duplicates on re-render */
    document.querySelectorAll("script[data-pd-ld]").forEach(function (s) { s.remove(); });

    if (!p) {
      main.innerHTML = '<div class="empty-state" style="padding:60px 0"><p>' + esc(T("product.notFound")) + '</p><a class="btn btn-primary" href="products.html" style="margin-top:16px">' + esc(T("product.backTo")) + "</a></div>";
      document.title = T("product.notFound") + " | " + T("common.brandName");
      return;
    }

    var name = pName(p);
    var settings = Store.getSettings();
    document.title = name + " | " + T("common.brandName") + " Appliances";
    var md = document.querySelector('meta[name="description"]');
    if (md) {
      var d = L(p.desc) || (name + ". " + T("product.metaDesc"));
      md.setAttribute("content", d.slice(0, 180));
    }

    /* breadcrumb */
    var crumb = document.getElementById("pd-crumb");
    if (crumb) crumb.textContent = name;
    var h1 = document.getElementById("pd-title");
    if (h1) h1.textContent = name;

    /* gallery */
    var imgs = [p.image ? _uv(p.image) : ""];
    if (p.gallery) {
      String(p.gallery).split(",").map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (g) { imgs.push(_uv(g)); });
    }

    /* detail images (shown in the Detailed Photo section) */
    var detailImgs = [];
    if (p.detailImages) {
      String(p.detailImages).split(",").map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (g) { detailImgs.push(_uv(g)); });
    }
    if (!detailImgs.length) { detailImgs = imgs.slice(1); }

    var priceHtml = '<div class="pd-price"><b>' + esc(unitPriceTxt(p)) + "</b></div>";

    /* key specs on the right (no duplicates with the attributes table below) */
    var keySpecs = '<div class="pd-key">';
    var mo = modelOf(p);
    var pk = parseInt(p.packing, 10) || 24;
    var moqVal = parseInt(p.moq, 10) || (pk * 4);
    var leadTxt = (p.lead !== null && p.lead !== undefined && p.lead !== "") ? String(p.lead) : "15-30";
    if (mo) keySpecs += "<span><b>" + esc(T("common.model")) + "</b>" + esc(mo) + "</span>";
    keySpecs += "<span><b>" + esc(T("products.packing")) + "</b>" + pk + " " + esc(T("common.pcs")) + "/" + esc(T("common.carton")) + "</span>"
      + "<span><b>" + esc(T("common.moq")) + "</b>" + moqVal + " " + esc(T("common.pcs")) + "</span>"
      + "<span><b>" + esc(T("products.lead")) + "</b>" + esc(leadTxt) + " " + esc(T("product.days")) + "</span>"
      + (p.certs ? "<span><b>" + esc(T("common.certsLabel")) + "</b>" + esc(p.certs) + "</span>" : "")
      + "</div>";

    /* Product Highlights (description, collapsible) */
    var descHtml = L(p.desc)
      ? '<div class="pd-block"><h3>' + esc(T("product.desc")) + '</h3><div class="clamp-wrap" data-clamp-lines="4"><p class="pd-desc-text">' + esc(L(p.desc)) + "</p></div>"
        + '<button class="btn btn-ghost btn-sm clamp-toggle" type="button">' + esc(T("product.viewMore")) + "</button></div>"
      : "";

    var downloadsHtml = "";
    if (p.datasheet || p.certFile) {
      var links = "";
      if (p.datasheet) links += '<a class="btn btn-outline btn-sm" href="' + esc(p.datasheet) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg> ' + esc(T("product.datasheet")) + "</a>";
      if (p.certFile) links += '<a class="btn btn-outline btn-sm" href="' + esc(p.certFile) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg> ' + esc(T("product.certFile")) + "</a>";
      downloadsHtml = '<div class="pd-block"><h3>' + esc(T("product.downloads")) + "</h3><div class=\"row-gap\">" + links + "</div><p class=\"hint\" style=\"margin-top:10px\">" + esc(T("product.downloadHint")) + "</p></div>";
    }

    /* tab panels */
    var detailsTab = specListHtml(p)
      + descHtml
      + tiersHtml(p)
      + featGridHtml(p)
      + detailPhotoHtml(p, detailImgs)
      + downloadsHtml;

    /* WhatsApp CTA */
    var waNum = (settings.whatsapp || "").replace(/[^\d]/g, "");
    var waLink = 'https://wa.me/' + waNum + "?text=" + encodeURIComponent("Inquiry about " + name + " (" + p.id + ")");

    /* SKU option groups (colors/variants) — rendered only when data exists */
    var skuHtml = "";
    var selSku = "";
    if (p.skuOptions && p.skuOptions.length) {
      skuHtml = '<div class="pd-sku" data-sku-wrap>';
      p.skuOptions.forEach(function (g, gi) {
        var optImgs = g.optionImages || {};
        skuHtml += '<div class="pd-sku-group"><span class="pd-sku-label">' + esc(g.name || T("product.sku")) + '</span><div class="pd-sku-opts">';
        (g.options || []).forEach(function (o, oi) {
          var sw = optImgs[o]
            ? '<img src="' + esc(_uv(optImgs[o])) + '" alt="" style="width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px;border:1px solid var(--line,#e2e8f0)">'
            : "";
          skuHtml += '<button type="button" class="pd-sku-opt' + (oi === 0 ? " active" : "") + '" data-sku-g="' + gi + '" data-sku-v="' + esc(String(o).toLowerCase()) + '" data-sku-label="' + esc(o) + '">' + sw + esc(o) + "</button>";
        });
        skuHtml += "</div></div>";
      });
      skuHtml += "</div>";
      var f0 = p.skuOptions[0] && p.skuOptions[0].options && p.skuOptions[0].options[0];
      selSku = f0 ? String(f0) : "";
    }

    /* quantity stepper (carton multiple) + tier price line */
    var defQty = moqVal;
    var orderBox = '<div class="pd-order-box">'
      + skuHtml
      + '<div class="pd-qty-row">'
      + '<span class="pd-qty-label">' + esc(T("product.qty")) + '</span>'
      + '<div class="pd-stepper"><button type="button" data-qty-step="-1" aria-label="Decrease">−</button>'
      + '<input type="text" inputmode="numeric" data-qty value="' + defQty + '" aria-label="Quantity">'
      + '<button type="button" data-qty-step="1" aria-label="Increase">+</button></div>'
      + '<span class="pd-qty-hint">' + esc(T("product.qtyHint").replace("{moq}", String(moqVal)).replace("{boxes}", String(Math.ceil(moqVal / pk))).replace("{pk}", String(pk))) + "</span>"
      + "</div>"
      + '<div class="pd-tier-line" data-tier-line></div>'
      + "</div>";

    main.innerHTML = '<div class="pd-layout">'
            + '<div class="pd-gallery">'
      + '<div class="pd-gallery-inner">'
      + (imgs.length > 1 ? '<div class="pd-thumbs-wrap">'
          + '<button type="button" class="pd-thumb-arrow up" data-thumb-scroll="-1" aria-label="Previous images"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 15l6-6 6 6"/></svg></button>'
          + '<div class="pd-thumbs">' + imgs.map(function (im, i) {
              return '<button class="pd-thumb' + (i === 0 ? " active" : "") + '" data-img="' + esc(im) + '"><img src="' + esc(im) + '" alt=""></button>';
            }).join("") + "</div>"
          + '<button type="button" class="pd-thumb-arrow down" data-thumb-scroll="1" aria-label="Next images"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></button>'
          + "</div>" : "")
      + '<div class="pd-main-img"><img id="pd-img-main" src="' + esc(imgs[0]) + '" alt="' + esc(name) + '"></div>'
      + "</div>"
      + "</div>"
      + '<div class="pd-info">'
      + '<span class="p-cat' + (p.hot ? " hot" : "") + '">' + esc(catName(p.category)) + "</span>"
      + "<h2>" + esc(name) + "</h2>"
      + priceHtml
      + '<p class="pd-note">' + esc(T("products.priceNote").replace("{term}", p.term || "FOB")) + "</p>"
      + keySpecs
      + orderBox
      + '<div class="pd-actions">'
      + '<button class="btn btn-primary" data-pd-addcart>' + esc(T("cart.add")) + "</button>"
      + '<button class="btn btn-outline" data-pd-inquiry="' + esc(p.id) + '">' + esc(T("inquiry.add")) + "</button>"
      + '<a class="btn btn-whatsapp" href="' + waLink + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.1.2-.2.4-.4.6l-.5.6c-.2.2-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.4.7 1.7.8.3.1.5.2.6.3.1.1.1.5-.1 1z"/></svg> WhatsApp</a>'
      + "</div>"
      + "</div></div>"
      + '<div class="pd-body">'
      + tabsHtml()
      + '<div class="pd-tab-panel active" data-panel="details">' + detailsTab + "</div>"
      + '<div class="pd-tab-panel" data-panel="supplier">' + supplierTabHtml(p) + "</div>"
      + "</div>";

    /* related products (same category) — below the tabs */
    var related = list.filter(function (x) { return x.active && x.id !== p.id && x.category === p.category; }).slice(0, 4);
    if (related.length) {
      var relWrap = document.createElement("div");
      relWrap.innerHTML = '<div class="pd-block"><h3>' + esc(T("product.related")) + '</h3><div class="prod-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">'
        + related.map(function (r) {
          var rp = money(r.price);
          return '<article class="card prod-card reveal in"><div class="p-img"><span class="p-cat' + (r.hot ? " hot" : "") + '">' + esc(catName(r.category)) + "</span>"
            + '<a href="product.html?id=' + r.id + '"><img src="' + esc(_uv(r.image)) + '" alt="' + esc(pName(r)) + '" loading="lazy"></a></div>'
            + '<div class="p-body"><h3><a href="product.html?id=' + r.id + '">' + esc(pName(r)) + "</a></h3>"
            + '<div class="p-specs"><span><b>' + esc(T("common.capacity")) + "</b>" + esc(r.capacity || "—") + "</span>"
            + "<span><b>" + esc(T("common.moq")) + "</b>" + (r.moq || "—") + " " + esc(T("common.pcs")) + "</span></div>"
            + (rp ? '<div class="p-price">' + esc(unitPriceTxt(r)) + "</div>" : '<div class="p-price">' + esc(T("common.priceOnRequest")) + "</div>")
            + '<div class="p-foot"><a class="btn btn-outline btn-sm" href="product.html?id=' + r.id + '">' + esc(T("products.details")) + "</a>"
            + '<button class="btn btn-outline btn-sm" data-add-inquiry="' + esc(r.id) + '">' + esc(T("inquiry.add")) + "</button></div>"
            + "</div></article>";
        }).join("") + "</div></div>";
      main.appendChild(relWrap.firstChild);
    }

    /* ---------- qty stepper + tier price ---------- */
    var qtyInput = main.querySelector("[data-qty]");
    var tierLine = main.querySelector("[data-tier-line]");
    function tierPriceFor(q) {
      if (p.priceTiers && p.priceTiers.length) {
        var last = null;
        for (var i = 0; i < p.priceTiers.length; i++) {
          var t = p.priceTiers[i];
          if (!t || t.price == null) continue;
          last = t;
          var mn = parseInt(t.qtyMin, 10) || 0;
          var mx = t.qtyMax ? parseInt(t.qtyMax, 10) : Infinity;
          if (q >= mn && q <= mx) return Number(t.price);
        }
        return last ? Number(last.price) : null;
      }
      return null;
    }
    function normQty(q) {
      q = parseInt(q, 10);
      if (!q || isNaN(q)) q = moqVal;
      if (q < moqVal) q = moqVal;
      return Math.ceil(q / pk) * pk;
    }
    function renderTier() {
      if (!qtyInput || !tierLine) return;
      var q = normQty(qtyInput.value);
      var tp = tierPriceFor(q);
      if (tp != null) {
        tierLine.innerHTML = '<span class="pd-tier-price">' + esc(Util.money(tp)) + ' / ' + esc(unitTxt(p)) + "</span>"
          + '<span class="pd-tier-note">' + esc(T("product.tierFor")) + " " + q + " " + esc(T("common.pcs")) + "</span>";
      } else {
        var base = Util.priceFmt(p);
        tierLine.innerHTML = base ? '<span class="pd-tier-note">' + esc(T("product.tierBase")) + "</span>" : "";
      }
    }
    if (qtyInput) {
      main.querySelectorAll("[data-qty-step]").forEach(function (b) {
        b.addEventListener("click", function () {
          var cur = parseInt(qtyInput.value, 10) || moqVal;
          var next = b.getAttribute("data-qty-step") === "1" ? cur + pk : cur - pk;
          if (next < moqVal) next = moqVal;
          qtyInput.value = next;
          renderTier();
        });
      });
      qtyInput.addEventListener("change", function () { qtyInput.value = normQty(qtyInput.value); renderTier(); });
      qtyInput.addEventListener("input", function () { renderTier(); });
      renderTier();
    }
    /* SKU option selection — remember the chosen option and link it to qty/orders */
    main.querySelectorAll("[data-sku-g]").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = b.getAttribute("data-sku-g");
        main.querySelectorAll('[data-sku-g="' + g + '"]').forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        selSku = b.getAttribute("data-sku-label") || b.getAttribute("data-sku-v") || "";
      });
    });

    /* bind actions */
    var qBtn = main.querySelector("[data-pd-quote]");
    if (qBtn) qBtn.addEventListener("click", function () { window.HT_ProductActions.openQuote(p, selSku); });
    var acBtn = main.querySelector("[data-pd-addcart]");
    if (acBtn) acBtn.addEventListener("click", function () {
      var q = qtyInput ? normQty(qtyInput.value) : moqVal;
      window.HT_Cart.add(p.id, q, selSku);
    });
    var mainImg = document.getElementById("pd-img-main");
    /* thumbs switch the main image — no lightbox popup */
    main.querySelectorAll(".pd-thumb").forEach(function (t) {
      t.addEventListener("click", function () {
        if (!mainImg) return;
        mainImg.src = t.getAttribute("data-img");
        main.querySelectorAll(".pd-thumb").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
      });
    });

    /* thumbnails vertical scroll arrows (hidden when nothing overflows) */
    var thumbsWrap = main.querySelector(".pd-thumbs-wrap");
    var thumbsBox = main.querySelector(".pd-thumbs");
    if (thumbsWrap && thumbsBox) {
      var THUMB_STEP = 122;
      function syncThumbArrows() {
        var show = thumbsBox.scrollHeight > thumbsBox.clientHeight + 2;
        thumbsWrap.querySelectorAll(".pd-thumb-arrow").forEach(function (a) { a.style.display = show ? "" : "none"; });
      }
      thumbsWrap.querySelectorAll(".pd-thumb-arrow").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.stopPropagation();
          thumbsBox.scrollTop += parseInt(a.getAttribute("data-thumb-scroll"), 10) * THUMB_STEP;
        });
      });
      syncThumbArrows();
      window.addEventListener("resize", syncThumbArrows);
      setTimeout(syncThumbArrows, 300);
    }

    /* collapsible blocks */
    main.querySelectorAll(".clamp-toggle").forEach(function (b) {
      b.addEventListener("click", function () {
        var wrap = b.previousElementSibling;
        if (!wrap || !wrap.classList.contains("clamp-wrap")) return;
        var opened = wrap.classList.toggle("open");
        b.textContent = opened ? T("product.viewLess") : T("product.viewMore");
      });
    });

    /* tab switching */
    main.querySelectorAll(".pd-tab-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var tab = b.getAttribute("data-tab");
        main.querySelectorAll(".pd-tab-btn").forEach(function (x) {
          x.classList.toggle("active", x === b);
          x.setAttribute("aria-selected", x === b ? "true" : "false");
        });
        main.querySelectorAll(".pd-tab-panel").forEach(function (pn) {
          pn.classList.toggle("active", pn.getAttribute("data-panel") === tab);
        });
      });
    });

    /* Product JSON-LD (offers use first tier price when available) */
    var ldPrice = (p.priceTiers && p.priceTiers.length && p.priceTiers[0].price != null)
      ? Number(p.priceTiers[0].price) : Number(p.price);
    var ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "image": imgs[0],
      "description": L(p.desc) || name,
      "brand": { "@type": "Brand", "name": settings.companyName },
      "offers": { "@type": "Offer", "priceCurrency": "USD", "price": isNaN(ldPrice) ? undefined : ldPrice.toFixed(2), "availability": "https://schema.org/InStock" }
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-pd-ld", "1");
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  /* ---------- lightbox ---------- */
  function openLightbox(idx) {
    var id = getParam("id");
    var p = (Store.getProducts() || []).find(function (x) { return x.id === id; });
    if (!p) return;
    var imgs = [p.image ? _uv(p.image) : ""];
    if (p.gallery) {
      String(p.gallery).split(",").map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (g) { imgs.push(_uv(g)); });
    }
    if (p.detailImages) {
      String(p.detailImages).split(",").map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (g) { imgs.push(_uv(g)); });
    }
    var box = document.getElementById("pd-lightbox");
    if (!box) {
      box = document.createElement("div");
      box.id = "pd-lightbox";
      box.className = "pd-lightbox";
      box.innerHTML = '<div class="pd-lb-inner"><button class="pd-lb-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>'
        + '<button class="pd-lb-prev" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>'
        + '<img class="pd-lb-img" src="" alt="">'
        + '<button class="pd-lb-next" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button></div>';
      document.body.appendChild(box);
      box.addEventListener("click", function (e) {
        if (e.target === box || e.target.closest(".pd-lb-close")) box.classList.remove("open");
      });
      box.querySelector(".pd-lb-prev").addEventListener("click", function (e) { e.stopPropagation(); lbStep(-1); });
      box.querySelector(".pd-lb-next").addEventListener("click", function (e) { e.stopPropagation(); lbStep(1); });
      window.__pdLb = { imgs: imgs, idx: 0 };
    } else {
      window.__pdLb.imgs = imgs;
    }
    window.__pdLb.idx = Math.max(0, Math.min(idx, imgs.length - 1));
    var img = box.querySelector(".pd-lb-img");
    img.src = imgs[window.__pdLb.idx];
    box.classList.add("open");
  }
  function lbStep(d) {
    var lb = window.__pdLb;
    if (!lb || !lb.imgs.length) return;
    lb.idx = (lb.idx + d + lb.imgs.length) % lb.imgs.length;
    var box = document.getElementById("pd-lightbox");
    if (box) box.querySelector(".pd-lb-img").src = lb.imgs[lb.idx];
  }

  document.addEventListener("DOMContentLoaded", function () { render(); });
  document.addEventListener("ht:i18n-applied", function () { render(); });
})();
