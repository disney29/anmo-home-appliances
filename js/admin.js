/* ============================================================
   admin.js — Visual admin panel (admin.html)
   Login · dashboard · products CRUD · inquiries · orders ·
   chat · settings (company/payment/site) · data reset
   Data persists in localStorage (shared with front-end).
   ============================================================ */
(function () {
  "use strict";

  var T = function (k) { return window.HT_I18N.t(k); };
  var Store = window.HT_Store;
  var Util = window.HT_Util;
  var state = { tab: "dash", editId: null };

  /* ---------- Auth ---------- */
  function checkAuth() {
    var logged = false;
    try { logged = sessionStorage.getItem("ht_admin") === "1"; } catch (e) {}
    return logged;
  }
  function doLogin() {
    var input = document.getElementById("login-pass");
    var pass = input ? input.value : "";
    if (pass === Store.getPassword()) {
      try { sessionStorage.setItem("ht_admin", "1"); } catch (e) {}
      showShell();
    } else {
      window.HT_Toast(T("admin.wrongPass"), "err");
    }
  }
  function doLogout() {
    try { sessionStorage.removeItem("ht_admin"); } catch (e) {}
    location.reload();
  }
  function showShell() {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("admin-shell").classList.remove("hidden");
    document.querySelectorAll("[data-i18n]").forEach(function () {}); // i18n re-applied by lib
    switchTab("dash");
  }

  /* ---------- Tab switching ---------- */
  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab-pane").forEach(function (p) { p.classList.remove("active"); });
    document.querySelectorAll(".admin-side nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-tab") === tab);
    });
    var pane = document.getElementById("pane-" + tab);
    if (pane) pane.classList.add("active");
    if (tab === "dash") renderDash();
    if (tab === "products") renderProducts();
    if (tab === "inquiries") renderInquiries();
    if (tab === "orders") renderOrders();
    if (tab === "chat") renderChat();
    if (tab === "content") renderContentTab();
    if (tab === "settings") renderSettings();
    if (tab === "cats") renderCats();
    document.querySelector(".admin-side").classList.remove("open");
  }

  /* ---------- Dashboard ---------- */
  function renderDash() {
    var set = [
      ["stProducts", Store.getProducts().length],
      ["stInquiries", Store.getInquiries().length],
      ["stOrders", Store.getOrders().length],
      ["stChat", Store.getChat().length]
    ];
    set.forEach(function (s, i) {
      var el = document.getElementById("stat-" + (i + 1));
      if (el) el.textContent = s[1];
      var lab = document.getElementById("statlab-" + (i + 1));
      if (lab) lab.textContent = T("admin." + s[0]);
    });
  }

  
  /* ---------- Categories CRUD ---------- */
  var catEditIdx = -1;
  function renderCats() {
    var tbody = document.getElementById("cat-tbody");
    if (!tbody) return;
    var cats = Store.getCats();
    var products = Store.getProducts();
    var html = "";
    cats.forEach(function (c, i) {
      var id = typeof c === "string" ? c : c.id;
      var nm = (typeof c === "object" && c.name && c.name.en) ? c.name.en : id;
      var img = (typeof c === "object" && c.image) ? c.image : "";
      var sub = "";
      if (typeof c === "object" && c.name) {
        var zhs = c.name.zh ? " · " + c.name.zh : "";
        var ess = c.name.es ? " · " + c.name.es : "";
        sub = '<div class="a-sub" style="font-size:11px">' + Util.esc(nm + zhs + ess) + "</div>";
      }
      var cnt = products.filter(function (p) { return p.category === id; }).length;
      html += "<tr><td><strong>" + Util.esc(nm) + "</strong>" + sub + "</td>"
        + "<td><code>" + Util.esc(id) + "</code></td>"
        + "<td>" + cnt + "</td>"
        + "<td>" + (img ? '<img src="' + Util.esc(img) + '" style="width:48px;height:48px;object-fit:cover;border-radius:6px">' : "—") + "</td>"
        + '<td><button class="btn btn-ghost btn-sm" data-act="edit" data-idx="' + i + '">' + T("admin.edit") + '</button> <button class="btn btn-ghost btn-sm danger" data-act="del" data-idx="' + i + '">' + T("admin.delete") + "</button></td></tr>";
    });
    tbody.innerHTML = html || '<tr><td colspan="5">' + Util.esc(T("admin.noData")) + "</td></tr>";
  }
  function openCatModal(idx) {
    var cats = Store.getCats();
    catEditIdx = idx;
    var c = idx >= 0 ? cats[idx] : null;
    var langs = ["en", "zh", "vi", "th", "id", "es", "fr", "pt", "ru", "ja", "ko", "it", "de", "nl", "ar"];
    document.getElementById("catm-title").textContent = T(idx >= 0 ? "admin.editProduct" : "admin.addCat");
    var idEl = document.getElementById("catm-id");
    idEl.value = c ? (typeof c === "string" ? c : c.id) : "";
    idEl.disabled = idx >= 0;
    langs.forEach(function (L2) {
      var el = document.getElementById("catm-n-" + L2);
      var v = "";
      if (c && typeof c === "object" && c.name) v = c.name[L2] || "";
      el.value = v;
    });
    document.getElementById("catm-image").value = (c && typeof c === "object" && c.image) ? c.image : "";
    document.getElementById("cat-modal").classList.add("open");
  }
  function closeCatModal() { document.getElementById("cat-modal").classList.remove("open"); }
  function saveCat() {
    var cats = Store.getCats().slice();
    var id = (document.getElementById("catm-id").value || "").trim().toLowerCase().replace(/\s+/g, "-");
    if (!id) { alert("ID required"); return; }
    if (catEditIdx < 0 && cats.some(function (x) { return (typeof x === "string" ? x : x.id) === id; })) {
      alert(T("admin.catIdUsed")); return;
    }
    var langs = ["en", "zh", "vi", "th", "id", "es", "fr", "pt", "ru", "ja", "ko", "it", "de", "nl", "ar"];
    var name = {};
    langs.forEach(function (L2) { name[L2] = (document.getElementById("catm-n-" + L2).value || "").trim(); });
    if (!name.en) name.en = id;
    var image = (document.getElementById("catm-image").value || "").trim();
    var obj = { id: id, name: name, image: image };
    if (catEditIdx >= 0 && catEditIdx < cats.length) cats[catEditIdx] = obj; else cats.push(obj);
    var s = Store.getSettings();
    s._cats = cats;
    Store.saveSettings(s);
    closeCatModal();
    renderCats();
    toast(T("admin.saved"));
  }
  function delCat(i) {
    if (!confirm(T("admin.catDelConfirm"))) return;
    var cats = Store.getCats().slice();
    cats.splice(i, 1);
    var s = Store.getSettings();
    s._cats = cats;
    Store.saveSettings(s);
    renderCats();
    toast(T("admin.deleted"));
  }
  document.addEventListener("DOMContentLoaded", function () {
    var addBtn = document.getElementById("cat-add-btn");
    if (addBtn) addBtn.addEventListener("click", function () { openCatModal(-1); });
    document.querySelectorAll(".catm-close").forEach(function (b) {
      b.addEventListener("click", closeCatModal);
    });
    var saveBtn = document.getElementById("catm-save");
    if (saveBtn) saveBtn.addEventListener("click", saveCat);
    var tbody = document.getElementById("cat-tbody");
    if (tbody) tbody.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-act]");
      if (!btn) return;
      var i = parseInt(btn.getAttribute("data-idx"), 10);
      if (btn.getAttribute("data-act") === "edit") openCatModal(i);
      else delCat(i);
    });
  });


/* ---------- Products CRUD ---------- */
  function catOptions(sel) {
    var cats = Store.getCats();
    return cats.map(function (c) {
      var id = typeof c === "string" ? c : c.id;
      var nm = (typeof c === "object" && c.name && c.name.en) ? c.name.en : T("categories." + id);
      return '<option value="' + id + '"' + (id === sel ? " selected" : "") + ">" + Util.esc(nm) + "</option>";
    }).join("");
  }

  function renderProducts() {
    var list = Store.getProducts();
    var tbody = document.getElementById("prod-tbody");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>' + Util.esc(T("admin.noData")) + "</p></div></td></tr>";
      return;
    }
    var html = "";
    list.forEach(function (p) {
      var disp = p.price;
      if (p.priceTiers && p.priceTiers.length && p.priceTiers[0].price != null) disp = p.priceTiers[0].price;
      var price = disp ? "$" + Util.money(disp) + '<br><small style="color:var(--ink-3)">' + "\u00a5" + Util.money(disp * Util.curRate()) + "</small>" : "—";
      var status = p.active
        ? '<span class="a-badge done">ON</span>'
        : '<span class="a-badge off">OFF</span>';
      html += "<tr>"
        + '<td><img class="t-img" src="' + Util.esc(p.image) + '" alt=""></td>'
        + "<td><b>" + Util.esc(p.name) + "</b></td>"
        + "<td>" + Util.esc(T("categories." + p.category)) + "</td>"
        + "<td>" + price + "</td>"
        + "<td>" + Util.esc(p.moq || "—") + "</td>"
        + "<td>" + status + "</td>"
        + '<td><div class="a-actions">'
        + '<button class="a-icon-btn" data-act="edit" data-id="' + p.id + '" title="' + Util.esc(T("admin.edit")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>'
        + '<button class="a-icon-btn" data-act="toggle" data-id="' + p.id + '" title="' + Util.esc(T("admin.pActive")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button>'
        + '<button class="a-icon-btn" data-act="view" data-id="' + p.id + '" title="View detail page"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg></button>'
        + '<button class="a-icon-btn danger" data-act="del" data-id="' + p.id + '" title="' + Util.esc(T("admin.delete")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>'
        + "</div></td></tr>";
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id");
        var act = b.getAttribute("data-act");
        if (act === "edit") openProductModal(id);
        else if (act === "toggle") { toggleProduct(id); }
        else if (act === "view") { window.open("product.html?id=" + encodeURIComponent(id), "_blank"); }
        else if (act === "del") { deleteProduct(id); }
      });
    });
  }

  function toggleProduct(id) {
    var list = Store.getProducts();
    var p = list.find(function (x) { return x.id === id; });
    if (p) { p.active = !p.active; Store.saveProducts(list); renderProducts(); }
  }
  function deleteProduct(id) {
    if (!confirm(T("admin.confirmDel"))) return;
    var list = Store.getProducts().filter(function (x) { return x.id !== id; });
    Store.saveProducts(list);
    renderProducts();
    window.HT_Toast(T("admin.deleted"));
  }

  function openProductModal(id) {
    state.editId = id;
    var form = document.getElementById("product-form");
    form.reset();
    var p = Store.getProducts().find(function (x) { return x.id === id; });
    document.getElementById("pm-title").textContent = p ? T("admin.editProduct") : T("admin.addProduct");
    var f = function (n) { return document.getElementById("pf-" + n); };
    if (p) {
      f("name").value = p.name || "";
      f("category").value = p.category || "hair-clipper";
      f("image").value = p.image || "";
      f("price").value = p.price || "";
      f("term").value = p.term || "EXW";
      f("unit").value = p.unit || "pcs";
      f("moq").value = p.moq || "";
      f("voltage").value = p.voltage || "";
      f("material").value = p.material || "";
      f("capacity").value = p.capacity || "";
      f("certs").value = p.certs || "";
      f("features").value = (p.features || "").split("\n").join("\n");
      f("lead").value = p.lead || "";
      f("active").checked = p.active !== false;
      f("hot").checked = !!p.hot;
      fillLangInputs(p.names, "pf-names");
      fillLangInputs(p.desc, "pf-desc");
      f("gallery").value = p.gallery || "";
      f("detailImages").value = p.detailImages || "";
      f("datasheet").value = p.datasheet || "";
      f("certFile").value = p.certFile || "";
      f("model").value = p.model || (p.id ? String(p.id).toUpperCase() : "");
      f("priceTiers").value = (p.priceTiers || []).map(function (t) { return (t.qtyMin || "") + "-" + (t.qtyMax || "") + "," + (t.price != null ? t.price : ""); }).join("\n");
      f("skuOptions").value = (p.skuOptions || []).map(function (g) { return g.name + ":" + (g.options || []).join(","); }).join("\n");
      renderSkuEditor();
      f("packing").value = p.packing || "";
    } else {
      f("category").innerHTML = catOptions("hair-clipper");
      f("active").checked = true;
    }
    renderGalPreviews(((p ? (p.gallery || "") : "") || "").split(",").filter(Boolean));
    renderDetailPreviews(((p ? (p.detailImages || "") : "") || "").split(",").filter(Boolean));
    pfSetStep(1);
    document.getElementById("product-modal").classList.add("open");
    var imgPrev = document.getElementById("pf-preview");
    imgPrev.src = p ? p.image : "";
    var mEl = document.getElementById("product-modal");
    mEl.classList.add("fullscreen");
    mEl.setAttribute("data-fs", "1");
  }

  function parsePriceTiers(raw) {
    var out = [];
    String(raw || "").split(/[\n;]+/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var m = line.match(/^\s*(\d+)\s*-\s*(\d*)\s*,\s*([\d.]+)\s*$/);
      if (!m) return;
      out.push({ qtyMin: parseInt(m[1], 10), qtyMax: m[2] ? parseInt(m[2], 10) : null, price: parseFloat(m[3]) });
    });
    return out;
  }

  function parseSkuOptions(raw) {
    var out = [];
    String(raw || "").split(/[\n;]+/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var idx = line.indexOf(":");
      if (idx < 1) return;
      var name = line.slice(0, idx).trim();
      var opts = line.slice(idx + 1).split(",").map(function (o) { return o.trim(); }).filter(Boolean);
      if (!name || !opts.length) return;
      out.push({ name: name, options: opts });
    });
    return out;
  }

  /* ---------- SKU visual editor (groups + option chips, add/remove) ---------- */
  function renderSkuEditor() {
    var box = document.getElementById("pf-sku-editor");
    var hid = document.getElementById("pf-skuOptions");
    if (!box || !hid) return;
    var groups = parseSkuOptions(hid.value);
    box.innerHTML = groups.map(function (g, gi) {
      var chips = (g.options || []).map(function (o, oi) {
        return '<span class="sku-chip" data-opt="' + Util.esc(o) + '">' + Util.esc(o)
          + '<button type="button" class="sku-chip-x" data-del-opt="' + gi + '" data-opt-val="' + Util.esc(o) + '" aria-label="Remove">×</button></span>';
      }).join("");
      return '<div class="sku-group" data-gi="' + gi + '">'
        + '<input class="sku-group-name" data-gi="' + gi + '" placeholder="Group name (e.g. Color)" value="' + Util.esc(g.name || "") + '">'
        + '<span class="sku-chips">' + (chips || '<span style="font-size:12px;color:var(--slate-400,#94a3b8)">no options yet</span>') + "</span>"
        + '<input class="sku-add-opt" data-gi="' + gi + '" placeholder="+ option (e.g. Gold)">'
        + '<button type="button" class="btn btn-sm" data-add-opt="' + gi + '">Add</button>'
        + '<button type="button" class="sku-del-group" data-del-group="' + gi + '">Delete group</button>'
        + "</div>";
    }).join("");
    if (!groups.length) {
      box.innerHTML = '<p class="hint" style="margin:2px 0">No SKU options yet — add a group below (e.g. Color with Gold, Blue).</p>';
    }
    syncSkuInput();
  }
  function syncSkuInput() {
    var box = document.getElementById("pf-sku-editor");
    var hid = document.getElementById("pf-skuOptions");
    if (!box || !hid) return;
    var lines = [];
    box.querySelectorAll(".sku-group").forEach(function (g) {
      var name = g.querySelector(".sku-group-name").value.trim();
      if (!name) return;
      var opts = Array.prototype.map.call(g.querySelectorAll(".sku-chip"), function (c) {
        return c.getAttribute("data-opt");
      }).filter(Boolean);
      if (opts.length) lines.push(name + ":" + opts.join(","));
    });
    hid.value = lines.join("\n");
  }

  /* SKU editor events (delegated once) */
  document.addEventListener("click", function (e) {
    var delOpt = e.target.closest("[data-del-opt]");
    if (delOpt) {
      var gi = delOpt.getAttribute("data-del-opt");
      var val = delOpt.getAttribute("data-opt-val");
      var group = document.querySelector('#pf-sku-editor .sku-group[data-gi="' + gi + '"]');
      if (group) {
        var chip = group.querySelector('.sku-chip[data-opt="' + Util.esc(val) + '"]');
        if (chip) chip.remove();
        syncSkuInput();
      }
      return;
    }
    var addOpt = e.target.closest("[data-add-opt]");
    if (addOpt) {
      var gi2 = addOpt.getAttribute("data-add-opt");
      var group2 = document.querySelector('#pf-sku-editor .sku-group[data-gi="' + gi2 + '"]');
      if (group2) {
        var inp = group2.querySelector(".sku-add-opt");
        var v = (inp.value || "").trim();
        if (v) {
          var exists = Array.prototype.some.call(group2.querySelectorAll(".sku-chip"), function (c) { return c.getAttribute("data-opt") === v; });
          if (!exists) {
            var chip2 = document.createElement("span");
            chip2.className = "sku-chip";
            chip2.setAttribute("data-opt", v);
            chip2.innerHTML = Util.esc(v) + '<button type="button" class="sku-chip-x" data-del-opt="' + gi2 + '" data-opt-val="' + Util.esc(v) + '" aria-label="Remove">×</button>';
            var chipsBox = group2.querySelector(".sku-chips");
            var hint = group2.querySelector('[style*="no options yet"]');
            if (hint) hint.remove();
            chipsBox.appendChild(chip2);
          }
          inp.value = "";
          syncSkuInput();
        }
      }
      return;
    }
    var delGroup = e.target.closest("[data-del-group]");
    if (delGroup) {
      var gi3 = delGroup.getAttribute("data-del-group");
      var g3 = document.querySelector('#pf-sku-editor .sku-group[data-gi="' + gi3 + '"]');
      if (g3) { g3.remove(); syncSkuInput(); }
      return;
    }
    var addGroup = e.target.closest("#pf-sku-add-group");
    if (addGroup) {
      var box = document.getElementById("pf-sku-editor");
      if (!box) return;
      var gi4 = box.querySelectorAll(".sku-group").length;
      var div = document.createElement("div");
      div.className = "sku-group";
      div.setAttribute("data-gi", String(gi4));
      div.innerHTML = '<input class="sku-group-name" data-gi="' + gi4 + '" placeholder="Group name (e.g. Color)">'
        + '<span class="sku-chips"><span style="font-size:12px;color:#94a3b8">no options yet</span></span>'
        + '<input class="sku-add-opt" data-gi="' + gi4 + '" placeholder="+ option (e.g. Gold)">'
        + '<button type="button" class="btn btn-sm" data-add-opt="' + gi4 + '">Add</button>'
        + '<button type="button" class="sku-del-group" data-del-group="' + gi4 + '">Delete group</button>';
      box.appendChild(div);
      return;
    }
  });
  document.addEventListener("input", function (e) {
    if (e.target.closest(".sku-group-name") || e.target.closest(".sku-add-opt")) {
      syncSkuInput();
    }
  });

  function saveProduct() {
    var form = document.getElementById("product-form");
    var f = function (n) { return document.getElementById("pf-" + n).value.trim(); };
    var list = Store.getProducts();
    var data = {
      name: f("name") || "Product",
      category: f("category"),
      image: f("image") || Util.catImage(f("category")),
      price: f("price") === "" ? null : parseFloat(f("price")) || null,
      term: f("term") || "EXW",
      unit: f("unit") || "pcs",
      moq: f("moq") === "" ? null : parseInt(f("moq"), 10) || null,
      voltage: f("voltage"), material: f("material"), capacity: f("capacity"),
      certs: f("certs"), features: f("features"), lead: f("lead"),
      active: document.getElementById("pf-active").checked,
      hot: document.getElementById("pf-hot").checked,
      names: collectLangInputs("pf-names"),
      desc: collectLangInputs("pf-desc"),
      gallery: f("gallery"),
      detailImages: f("detailImages"),
      datasheet: f("datasheet"),
      certFile: f("certFile"),
      model: f("model"),
      packing: f("packing") === "" ? null : (parseInt(f("packing"), 10) || 24),
      priceTiers: parsePriceTiers(f("priceTiers")),
      skuOptions: parseSkuOptions(f("skuOptions"))
    };
    if (state.editId) {
      var i = list.findIndex(function (x) { return x.id === state.editId; });
      if (i > -1) { list[i] = Object.assign({}, list[i], data); }
    } else {
      data.id = Util.uid("p");
      list.push(data);
    }
    Store.saveProducts(list);
    document.getElementById("product-modal").classList.remove("open");
    renderProducts();
    window.HT_Toast(T("admin.saved"));
  }

  function initProductImageUpload() {
    var input = document.getElementById("pf-file");
    if (!input) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { window.HT_Toast(T("admin.imgSize"), "err"); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var MAX = 1200;
          var w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          var cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          var out = cv.toDataURL("image/jpeg", 0.82);
          if (out.length > 900 * 1024) { out = cv.toDataURL("image/jpeg", 0.6); }
          document.getElementById("pf-image").value = out;
          var prev = document.getElementById("pf-preview");
          prev.src = out; prev.style.display = "block";
          window.HT_Toast(T("admin.imgOk"));
        };
        img.onerror = function () { window.HT_Toast(T("admin.imgSize"), "err"); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    /* multiple gallery images -> append to pf-gallery field */
    var gal = document.getElementById("pf-file-gallery");
    if (gal) gal.addEventListener("change", function () {
      var files = Array.prototype.slice.call(gal.files || []);
      if (!files.length) return;
      var pending = files.length, urls = [];
      files.forEach(function (file) {
        if (file.size > 5 * 1024 * 1024) { pending--; return; }
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            var MAX = 1200;
            var w = img.width, h = img.height;
            if (w > MAX || h > MAX) {
              if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
              else { w = Math.round(w * MAX / h); h = MAX; }
            }
            var cv = document.createElement("canvas");
            cv.width = w; cv.height = h;
            cv.getContext("2d").drawImage(img, 0, 0, w, h);
            var out = cv.toDataURL("image/jpeg", 0.82);
            if (out.length > 700 * 1024) { out = cv.toDataURL("image/jpeg", 0.55); }
            urls.push(out);
            pending--;
            if (pending === 0) {
              var field = document.getElementById("pf-gallery");
              var cur = (field.value || "").trim();
              var parts = cur ? cur.split(",") : [];
              urls.forEach(function (u) { if (parts.indexOf(u) === -1) parts.push(u); });
              field.value = parts.join(",");
              renderGalPreviews(parts);
              window.HT_Toast(urls.length + " image(s) added");
            }
          };
          img.onerror = function () { pending--; };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    });

    /* multiple detail images -> append to pf-detailImages field */
    var gal = document.getElementById("pf-file-detail");
    if (gal) gal.addEventListener("change", function () {
      var files = Array.prototype.slice.call(gal.files || []);
      if (!files.length) return;
      var pending = files.length, urls = [];
      files.forEach(function (file) {
        if (file.size > 5 * 1024 * 1024) { pending--; return; }
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            var MAX = 1200;
            var w = img.width, h = img.height;
            if (w > MAX || h > MAX) {
              if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
              else { w = Math.round(w * MAX / h); h = MAX; }
            }
            var cv = document.createElement("canvas");
            cv.width = w; cv.height = h;
            cv.getContext("2d").drawImage(img, 0, 0, w, h);
            var out = cv.toDataURL("image/jpeg", 0.82);
            if (out.length > 700 * 1024) { out = cv.toDataURL("image/jpeg", 0.55); }
            urls.push(out);
            pending--;
            if (pending === 0) {
              var field = document.getElementById("pf-detailImages");
              var cur = (field.value || "").trim();
              var parts = cur ? cur.split(",") : [];
              urls.forEach(function (u) { if (parts.indexOf(u) === -1) parts.push(u); });
              field.value = parts.join(",");
              renderDetailPreviews(parts);
              window.HT_Toast(urls.length + " detail image(s) added");
            }
          };
          img.onerror = function () { pending--; };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    });

    /* multiple datasheet / cert files -> fill filenames */
    ["datasheet", "certFile"].forEach(function (kind) {
      var fi = document.getElementById("pf-file-" + kind);
      if (!fi) return;
      fi.addEventListener("change", function () {
        var names = Array.prototype.slice.call(fi.files || []).map(function (f) { return "assets/docs/" + f.name; });
        var field = document.getElementById("pf-" + kind);
        if (field && names.length) {
          var cur = (field.value || "").trim();
          var parts = cur ? cur.split(",") : [];
          names.forEach(function (n) { if (parts.indexOf(n) === -1) parts.push(n); });
          field.value = parts.join(",");
        }
        window.HT_Toast(names.length + " file path(s) added — upload the real files to assets/docs/ on your server");
      });
    });
  }

  function renderGalPreviews(parts) {
    renderThumbPreviews("pf-gallery-previews", parts, "pf-gallery");
  }

  function renderDetailPreviews(parts) {
    renderThumbPreviews("pf-detail-previews", parts, "pf-detailImages");
  }

  function renderThumbPreviews(boxId, parts, fieldId) {
    var box = document.getElementById(boxId);
    if (!box) return;
    box.innerHTML = "";
    parts = (parts || []).filter(Boolean);
    parts.forEach(function (u, idx) {
      var wrap = document.createElement("div");
      wrap.className = "thumb";
      var im = document.createElement("img");
      im.src = u; im.alt = ""; im.loading = "lazy";
      var del = document.createElement("button");
      del.type = "button"; del.innerHTML = "\u00d7"; del.title = "Remove";
      del.addEventListener("click", function () {
        parts.splice(idx, 1);
        var field = document.getElementById(fieldId);
        if (field) field.value = parts.join(",");
        renderThumbPreviews(boxId, parts, fieldId);
      });
      wrap.appendChild(im); wrap.appendChild(del);
      box.appendChild(wrap);
    });
  }


  /* ---------- Product wizard steps ---------- */
  function pfSetStep(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) n = state.pfStep || 1;
    state.pfStep = Math.max(1, Math.min(4, n));
    document.querySelectorAll(".pf-panel").forEach(function (p) {
      p.style.display = p.getAttribute("data-panel") === String(state.pfStep) ? "" : "none";
    });
    document.querySelectorAll(".pf-step-item").forEach(function (it) {
      var st = parseInt(it.getAttribute("data-pfstep"), 10);
      it.classList.toggle("active", st === state.pfStep);
      it.classList.toggle("done", st < state.pfStep);
    });
    var prev = document.getElementById("prod-prev-btn");
    var next = document.getElementById("prod-next-btn");
    var save = document.getElementById("prod-save-btn");
    if (prev) prev.style.display = state.pfStep === 1 ? "none" : "";
    if (next) next.style.display = state.pfStep === 4 ? "none" : "";
    if (save) save.style.display = state.pfStep === 4 ? "" : "none";
    var m = document.getElementById("product-modal");
    if (m) m.classList.toggle("fullscreen", state.pfStep > 1);
  }

  function initProductWizard() {
    var nextBtn = document.getElementById("prod-next-btn");
    if (nextBtn) nextBtn.addEventListener("click", function () { pfSetStep((state.pfStep || 1) + 1); });
    var prevBtn = document.getElementById("prod-prev-btn");
    if (prevBtn) prevBtn.addEventListener("click", function () { pfSetStep((state.pfStep || 1) - 1); });
    document.querySelectorAll(".pf-step-item").forEach(function (it) {
      it.addEventListener("click", function () { pfSetStep(parseInt(it.getAttribute("data-pfstep"), 10)); });
    });
  }

  /* ---------- Inquiries ---------- */
  function renderInquiries() {
    var list = Store.getInquiries();
    var tbody = document.getElementById("inq-tbody");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>' + Util.esc(T("admin.noData")) + "</p></div></td></tr>";
      return;
    }
    var html = "";
    list.forEach(function (q, idx) {
      var contact = [q.name, q.company].filter(Boolean).join(" · ") || "—";
      var email = q.email || "—";
      var wa = q.whatsapp || "—";
      var status = q._status === "handled"
        ? '<span class="a-badge done">' + Util.esc(T("admin.markHandled")) + "</span>"
        : '<span class="a-badge new">NEW</span>';
      var date = q._date ? new Date(q._date).toLocaleString() : "—";
      html += "<tr>"
        + "<td><b>" + Util.esc(contact) + "</b><br><small>" + Util.esc(email) + "<br>" + Util.esc(wa) + "</small></td>"
        + "<td>" + Util.esc(q.country || "—") + "</td>"
        + "<td>" + Util.esc(q.product || "—") + "</td>"
        + "<td>" + Util.esc((q.msg || "—").slice(0, 120)) + (q._attachment ? "<br><small>📎 " + Util.esc(q._attachment) + "</small>" : "") + "</td>"
        + "<td>" + Util.esc(date) + "</td>"
        + "<td>" + status + '<div class="a-actions mt-1">'
        + '<button class="a-icon-btn" data-act="handled" data-idx="' + idx + '" title="' + Util.esc(T("admin.markHandled")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></button>'
        + '<button class="a-icon-btn danger" data-act="del" data-idx="' + idx + '" title="' + Util.esc(T("admin.delete")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>'
        + "</div></td></tr>";
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var idx = parseInt(b.getAttribute("data-idx"), 10);
        var list2 = Store.getInquiries();
        if (b.getAttribute("data-act") === "handled") {
          if (list2[idx]) { list2[idx]._status = "handled"; Store.saveInquiries(list2); }
        } else {
          if (confirm(T("admin.confirmDel"))) { list2.splice(idx, 1); Store.saveInquiries(list2); }
        }
        renderInquiries();
      });
    });
  }

  function exportInquiriesCSV() {
    var list = Store.getInquiries();
    if (!list.length) { window.HT_Toast(T("admin.noData"), "err"); return; }
    var head = ["date", "name", "company", "email", "whatsapp", "country", "product", "message", "status", "attachment"];
    var rows = list.map(function (q) {
      return head.map(function (k) {
        var v = q[k] || q["_" + k] || "";
        return '"' + String(v).replace(/"/g, '""') + '"';
      }).join(",");
    });
    var csv = head.join(",") + "\n" + rows.join("\n");
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inquiries_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Orders ---------- */
  function renderOrders() {
    var list = Store.getOrders();
    var tbody = document.getElementById("ord-tbody");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>' + Util.esc(T("admin.noData")) + "</p></div></td></tr>";
      return;
    }
    var html = "";
    list.forEach(function (o, idx) {
      var total = o.total ? "$" + Util.money(o.total) : "—";
      var statusMap = { pending: '<span class="a-badge new">PENDING</span>', confirmed: '<span class="a-badge pending">CONFIRMED</span>', paid: '<span class="a-badge done">PAID</span>' };
      var statusHtml = statusMap[o.status] || statusMap.pending;
      html += "<tr>"
        + "<td><b>" + Util.esc(o.id) + "</b><br><small>" + Util.esc(o.customer) + " · " + Util.esc(o.country || "—") + "</small></td>"
        + "<td>" + (Array.isArray(o.items) && o.items.length
            ? o.items.map(function (it) { return Util.esc(it.name + " ×" + it.qty); }).join("<br>")
            : Util.esc(o.product || "—")) + "</td>"
        + "<td>" + Util.esc(Array.isArray(o.items) ? o.items.reduce(function (s2, it) { return s2 + (parseInt(it.qty, 10) || 0); }, 0) : o.qty) + "</td>"
        + "<td>" + total + (o.currency && o.currency === "CNY" ? '<br><small style="color:var(--ink-3)">CNY view</small>' : "") + "</td>"
        + "<td>" + Util.esc(o.payMethod || "—") + "</td>"
        + "<td>" + statusHtml
        + '<div class="a-actions mt-1"><select class="ord-status" data-idx="' + idx + '" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;font-family:var(--font);font-size:13px">'
        + '<option value="pending"' + (o.status === "pending" ? " selected" : "") + ">PENDING</option>"
        + '<option value="confirmed"' + (o.status === "confirmed" ? " selected" : "") + ">CONFIRMED</option>"
        + '<option value="paid"' + (o.status === "paid" ? " selected" : "") + ">PAID</option>"
        + "</select></div></td></tr>";
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll(".ord-status").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var idx = parseInt(sel.getAttribute("data-idx"), 10);
        var list2 = Store.getOrders();
        if (list2[idx]) { list2[idx].status = sel.value; Store.saveOrders(list2); window.HT_Toast(T("admin.saved")); }
      });
    });
  }

  /* ---------- Chat ---------- */
  function renderChat() {
    var list = Store.getChat();
    var tbody = document.getElementById("chat-tbody");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><p>' + Util.esc(T("admin.noData")) + "</p></div></td></tr>";
      return;
    }
    var html = "";
    list.slice().reverse().forEach(function (m, idx) {
      var realIdx = list.length - 1 - idx;
      html += "<tr><td>" + Util.esc(m.from || "—") + "</td>"
        + "<td>" + Util.esc(m.text) + "</td>"
        + "<td>" + new Date(m.time).toLocaleString() + ' <button class="a-icon-btn danger" data-del="' + realIdx + '" title="' + Util.esc(T("admin.delete")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button></td></tr>';
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var list2 = Store.getChat();
        list2.splice(parseInt(b.getAttribute("data-del"), 10), 1);
        Store.saveChat(list2);
        renderChat();
      });
    });
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    var s = Store.getSettings();
    var f = function (n) { return document.getElementById("sf-" + n); };
    if (f("companyName")) f("companyName").value = s.companyName || "";
    if (f("slogan")) f("slogan").value = s.slogan || "";
    if (f("email")) f("email").value = s.email || "";
    if (f("whatsapp")) f("whatsapp").value = s.whatsapp || "";
    if (f("phone")) f("phone").value = s.phone || "";
    if (f("address")) f("address").value = s.address || "";
    if (f("mapEmbed")) f("mapEmbed").value = s.mapEmbed || "";
    if (f("paypal")) f("paypal").value = s.paypal || "";
    if (f("bankName")) f("bankName").value = s.bankName || "";
    if (f("beneficiary")) f("beneficiary").value = s.beneficiary || "";
    if (f("account")) f("account").value = s.account || "";
    if (f("swift")) f("swift").value = s.swift || "";
    if (f("gaId")) f("gaId").value = s.gaId || "";
    var r2 = document.getElementById("sf-usdCnyRate");
    if (r2) r2.value = s.usdCnyRate || 7.2;
  }

  function saveSettings() {
    var s = Store.getSettings();
    var f = function (n) { return document.getElementById("sf-" + n).value.trim(); };
    s.companyName = f("companyName"); s.slogan = f("slogan"); s.email = f("email");
    s.whatsapp = f("whatsapp"); s.phone = f("phone"); s.address = f("address");
    s.mapEmbed = f("mapEmbed"); s.paypal = f("paypal"); s.bankName = f("bankName");
    s.beneficiary = f("beneficiary"); s.account = f("account"); s.swift = f("swift");
    s.gaId = f("gaId");
    var rate = parseFloat(f("usdCnyRate"));
    s.usdCnyRate = isNaN(rate) || rate <= 0 ? 7.2 : rate;
    Store.saveSettings(s);
    window.HT_Toast(T("admin.saved"));
    window.HT_Toast(T("admin.rateSaved"));
  }

  function changePassword() {
    var input = document.getElementById("sf-newPwd");
    var v = input.value.trim();
    if (v.length < 4) { window.HT_Toast(T("common.required"), "err"); return; }
    Store.savePassword(v);
    input.value = "";
    window.HT_Toast(T("admin.saved"));
  }

  function resetData() {
    if (!confirm(T("admin.resetConfirm"))) return;
    Store.resetAll();
    location.reload();
  }

  /* ---------- Content management ---------- */
  var CLANGS = ["en", "zh", "vi", "th", "id", "es", "fr", "pt", "ru", "ja", "ko", "it", "de", "nl", "ar"];
  var ctab = "home";

  function contentPath(obj, path) {
    var node = obj;
    String(path).split(".").forEach(function (k) {
      if (node == null) return;
      if (/^\d+$/.test(k)) k = parseInt(k, 10);
      node = node[k];
    });
    return node;
  }
  function setContentPath(obj, path, v) {
    var parts = String(path).split(".");
    var node = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (node[parts[i]] == null) node[parts[i]] = {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = v;
  }
  function fldObj(item, k) {
    if (!item[k] || typeof item[k] !== "object") item[k] = {};
    return item[k];
  }
  function fillLangInputs(obj, prefix) {
    var o = obj || {};
    CLANGS.forEach(function (lg) {
      var el = document.getElementById(prefix + "-" + lg);
      if (el) el.value = o[lg] || "";
    });
  }
  function collectLangInputs(prefix) {
    var o = {};
    CLANGS.forEach(function (lg) {
      var el = document.getElementById(prefix + "-" + lg);
      if (el) o[lg] = el.value.trim();
    });
    return o;
  }
  function firstLang(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v.en || v.zh || "";
  }
  function collectLeafPaths(obj, prefix, out) {
    Object.keys(obj).forEach(function (k) {
      var p = prefix ? prefix + "." + k : k;
      var v = obj[k];
      if (v && typeof v === "object" && !Array.isArray(v) && typeof v.en !== "string") {
        collectLeafPaths(v, p, out);
      } else {
        out.push({ path: p, val: v });
      }
    });
  }
  function leafGet(obj, path) {
    return String(path).split(".").reduce(function (n, k) { return n == null ? null : n[k]; }, obj);
  }
  function leafSet(obj, path, v) {
    var parts = String(path).split(".");
    var n = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (n[parts[i]] == null) n[parts[i]] = {};
      n = n[parts[i]];
    }
    n[parts[parts.length - 1]] = v;
  }

  var ICON_OPTIONS = ["star", "shield", "heart", "cart", "truck", "card", "globe", "check", "label", "bolt", "mold", "cert", "box", "gear"];
  function iconSelect(sel) {
    return '<select class="c-plain" data-fk="icon">'
      + ICON_OPTIONS.map(function (i) { return '<option value="' + i + '"' + (i === sel ? " selected" : "") + ">" + i + "</option>"; }).join("")
      + "</select>";
  }

  var CGROUPS = {
    home: [
      { key: "hero.slides", fields: [
        { k: "badge", t: "Badge", lang: true }, { k: "title", t: "Title", lang: true },
        { k: "sub", t: "Subtitle", lang: true }, { k: "img", t: "Background image path", lang: false },
        { k: "btn1", t: "Button 1 text", lang: true }, { k: "btn1Href", t: "Button 1 link", lang: false },
        { k: "btn2", t: "Button 2 text", lang: true }, { k: "btn2Href", t: "Button 2 link", lang: false }
      ] },
      { key: "stats", fields: [
        { k: "v", t: "Number", lang: false }, { k: "l", t: "Label", lang: true }
      ] },
      { key: "advantages", fields: [
        { k: "icon", t: "Icon", lang: false, icon: true }, { k: "title", t: "Title", lang: true }, { k: "desc", t: "Description", lang: true }
      ] },
      { key: "why", fields: [
        { k: "icon", t: "Icon", lang: false, icon: true }, { k: "title", t: "Title", lang: true }, { k: "desc", t: "Description", lang: true }
      ] },
      { key: "testimonials", fields: [
        { k: "text", t: "Quote", lang: true }, { k: "name", t: "Name", lang: true }, { k: "role", t: "Country / Role", lang: true }, { k: "initial", t: "Avatar initials", lang: false }
      ] },
      { key: "markets", fields: [
        { k: "title", t: "Market name", lang: true }, { k: "desc", t: "Description", lang: true }
      ] },
      { key: "quote.feats", fields: [
        { k: "t", t: "Title", lang: true }, { k: "d", t: "Description", lang: true }
      ] }
    ],
    about: [
      { key: "about.story", type: "single", fields: [
        { k: "p1", t: "Paragraph 1", lang: true }, { k: "p2", t: "Paragraph 2", lang: true }, { k: "img", t: "Image path", lang: false }
      ] },
      { key: "about.timeline", fields: [
        { k: "year", t: "Year", lang: false }, { k: "title", t: "Title", lang: true }, { k: "desc", t: "Description", lang: true }
      ] },
      { key: "about.factory", fields: [
        { k: "img", t: "Image path", lang: false }, { k: "cap", t: "Caption", lang: true }
      ] },
      { key: "about.qc", fields: [
        { k: "title", t: "Title", lang: true }, { k: "desc", t: "Description", lang: true }
      ] },
      { key: "about.certs", type: "plainlist", fields: [
        { k: "name", t: "Certification name", lang: false }
      ] },
      { key: "about.oem", fields: [
        { k: "icon", t: "Icon", lang: false, icon: true }, { k: "title", t: "Title", lang: true }, { k: "desc", t: "Description", lang: true }
      ] }
    ]
  };

  var SVG_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
  var SVG_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5m0 0l-6 6m6-6l6 6"/></svg>';
  var SVG_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m0 0l6-6m-6 6l-6-6"/></svg>';
  var SVG_DEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>';

  function renderContentTab() {
    var wrap = document.getElementById("content-lists");
    if (!wrap) return;
    var c = Store.getContent();
    var html = "";
    if (ctab === "sections") {
      var leaves = [];
      collectLeafPaths(c.sections || {}, "", leaves);
      html = '<div class="c-group"><div class="c-group-head"><b>sections.*</b></div><div class="c-items">';
      leaves.forEach(function (leaf) {
        html += '<div class="c-item"><span class="c-idx">§</span><span class="c-summary"><b>' + Util.esc(leaf.path) + "</b> — " + Util.esc(firstLang(leaf.val)) + '</span>'
          + '<div class="a-actions"><button class="a-icon-btn" data-sedit="' + Util.esc(leaf.path) + '" title="Edit">' + SVG_EDIT + "</button></div></div>";
      });
      html += "</div></div>";
    } else {
      var groups = CGROUPS[ctab] || [];
      groups.forEach(function (g) {
        var arr = contentPath(c, g.key);
        if (!Array.isArray(arr)) arr = [];
        html += '<div class="c-group"><div class="c-group-head"><b>' + Util.esc(g.key) + "</b>"
          + (g.type !== "single" ? '<button class="btn btn-primary btn-xs" data-cadd="' + Util.esc(g.key) + '" data-ctype="' + (g.type || "list") + '">' + Util.esc(T("admin.addItem")) + "</button>" : "")
          + '</div><div class="c-items">';
        if (g.type === "single") {
          var item = arr[0] || {};
          html += '<div class="c-item"><span class="c-idx">§</span><span class="c-summary">' + Util.esc(firstLang(item[g.fields[0].k])) + '</span>'
            + '<div class="a-actions"><button class="a-icon-btn" data-cedit="' + Util.esc(g.key) + '" data-i="0">' + SVG_EDIT + "</button></div></div>";
        } else {
          arr.forEach(function (item, i) {
            var f0 = g.fields[0];
            var sv = f0 ? firstLang(item[f0.k]) : "";
            html += '<div class="c-item"><span class="c-idx">' + (i + 1) + '</span><span class="c-summary">' + Util.esc(sv || "…") + '</span>'
              + '<div class="a-actions">'
              + '<button class="a-icon-btn" data-cedit="' + Util.esc(g.key) + '" data-i="' + i + '" title="' + Util.esc(T("admin.editItem")) + '">' + SVG_EDIT + "</button>"
              + '<button class="a-icon-btn" data-cup="' + Util.esc(g.key) + '" data-i="' + i + '" title="' + Util.esc(T("admin.moveUp")) + '">' + SVG_UP + "</button>"
              + '<button class="a-icon-btn" data-cdown="' + Util.esc(g.key) + '" data-i="' + i + '" title="' + Util.esc(T("admin.moveDown")) + '">' + SVG_DOWN + "</button>"
              + '<button class="a-icon-btn danger" data-cdel="' + Util.esc(g.key) + '" data-i="' + i + '" title="' + Util.esc(T("admin.delItem")) + '">' + SVG_DEL + "</button>"
              + "</div></div>";
          });
        }
        html += "</div></div>";
      });
    }
    wrap.innerHTML = html;
    bindContentActions();
  }

  function bindContentActions() {
    var wrap = document.getElementById("content-lists");
    if (!wrap) return;
    wrap.querySelectorAll("[data-cedit]").forEach(function (b) {
      b.addEventListener("click", function () {
        openCModal(b.getAttribute("data-cedit"), parseInt(b.getAttribute("data-i"), 10));
      });
    });
    wrap.querySelectorAll("[data-cadd]").forEach(function (b) {
      b.addEventListener("click", function () {
        openCModal(b.getAttribute("data-cadd"), null);
      });
    });
    wrap.querySelectorAll("[data-cup]").forEach(function (b) {
      b.addEventListener("click", function () { moveCItem(b.getAttribute("data-cup"), parseInt(b.getAttribute("data-i"), 10), -1); });
    });
    wrap.querySelectorAll("[data-cdown]").forEach(function (b) {
      b.addEventListener("click", function () { moveCItem(b.getAttribute("data-cdown"), parseInt(b.getAttribute("data-i"), 10), 1); });
    });
    wrap.querySelectorAll("[data-cdel]").forEach(function (b) {
      b.addEventListener("click", function () { delCItem(b.getAttribute("data-cdel"), parseInt(b.getAttribute("data-i"), 10)); });
    });
    wrap.querySelectorAll("[data-sedit]").forEach(function (b) {
      b.addEventListener("click", function () { openSModal(b.getAttribute("data-sedit")); });
    });
  }

  function findGroup(path) {
    var groups = CGROUPS[ctab] || [];
    for (var i = 0; i < groups.length; i++) if (groups[i].key === path) return groups[i];
    return null;
  }

  function openCModal(path, idx) {
    var g = findGroup(path);
    if (!g) return;
    var c = Store.getContent();
    var arr = contentPath(c, path);
    if (!Array.isArray(arr)) { arr = []; setContentPath(c, path, arr); }
    var item = idx === null ? {} : (arr[idx] || {});
    var html = "";
    g.fields.forEach(function (f) {
      html += '<div class="f-row"><label>' + Util.esc(f.t) + "</label>";
      if (f.icon) {
        html += iconSelect(item.icon);
      } else if (f.lang) {
        var o = item[f.k] || {};
        html += '<input class="c-lang" data-fk="' + f.k + '" data-lang="en" value="' + Util.esc(o.en || "") + '">';
        html += '<details class="lang-more"><summary>' + Util.esc(T("admin.langMore")) + "</summary>";
        CLANGS.slice(1).forEach(function (lg) {
          html += '<label class="c-lang-l">' + lg.toUpperCase() + '</label><input class="c-lang" data-fk="' + f.k + '" data-lang="' + lg + '" value="' + Util.esc(o[lg] || "") + '">';
        });
        html += "</details>";
      } else {
        html += '<input class="c-plain" data-fk="' + f.k + '" value="' + Util.esc(item[f.k] || "") + '">';
      }
      html += "</div>";
    });
    document.getElementById("cm-form").innerHTML = html;
    document.getElementById("cm-title").textContent = (idx === null ? T("admin.addItem") : T("admin.editItem")) + " · " + path;
    state.cedit = { path: path, idx: idx };
    document.getElementById("content-modal").classList.add("open");
  }

  function saveCItem() {
    var st = state.cedit;
    if (!st) return;
    var c = Store.getContent();
    var arr = contentPath(c, st.path);
    if (!Array.isArray(arr)) { arr = []; setContentPath(c, st.path, arr); }
    var item = st.idx === null ? {} : (arr[st.idx] || {});
    document.querySelectorAll("#cm-form .c-lang").forEach(function (inp) {
      var o = fldObj(item, inp.getAttribute("data-fk"));
      o[inp.getAttribute("data-lang")] = inp.value;
    });
    document.querySelectorAll("#cm-form .c-plain").forEach(function (inp) {
      item[inp.getAttribute("data-fk")] = inp.value;
    });
    if (st.idx === null) arr.push(item); else arr[st.idx] = item;
    Store.saveContent(c);
    document.getElementById("content-modal").classList.remove("open");
    state.cedit = null;
    renderContentTab();
    window.HT_Toast(T("admin.contentSaved"));
  }

  function openSModal(path) {
    var c = Store.getContent();
    var v = leafGet(c.sections || {}, path) || {};
    if (typeof v !== "object") v = {};
    var html = '<div class="f-row"><label><b>sections.' + Util.esc(path) + "</b></label>";
    html += '<input class="c-lang" data-lang="en" value="' + Util.esc(v.en || "") + '">';
    html += '<details class="lang-more"><summary>' + Util.esc(T("admin.langMore")) + "</summary>";
    CLANGS.slice(1).forEach(function (lg) {
      html += '<label class="c-lang-l">' + lg.toUpperCase() + '</label><input class="c-lang" data-lang="' + lg + '" value="' + Util.esc(v[lg] || "") + '">';
    });
    html += "</details></div>";
    document.getElementById("cm-form").innerHTML = html;
    document.getElementById("cm-title").textContent = "sections." + path;
    state.cedit = { section: path };
    document.getElementById("content-modal").classList.add("open");
  }

  function saveSItem() {
    var st = state.cedit;
    if (!st || !st.section) return;
    var c = Store.getContent();
    if (!c.sections) c.sections = {};
    var v = leafGet(c.sections, st.section) || {};
    if (typeof v !== "object") v = {};
    document.querySelectorAll("#cm-form .c-lang").forEach(function (inp) {
      v[inp.getAttribute("data-lang")] = inp.value;
    });
    leafSet(c.sections, st.section, v);
    Store.saveContent(c);
    document.getElementById("content-modal").classList.remove("open");
    state.cedit = null;
    renderContentTab();
    window.HT_Toast(T("admin.contentSaved"));
  }

  function moveCItem(path, i, dir) {
    var c = Store.getContent();
    var arr = contentPath(c, path);
    var j = i + dir;
    if (!Array.isArray(arr) || j < 0 || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    Store.saveContent(c);
    renderContentTab();
  }

  function delCItem(path, i) {
    if (!confirm(T("admin.confirmDel"))) return;
    var c = Store.getContent();
    var arr = contentPath(c, path);
    if (!Array.isArray(arr)) return;
    arr.splice(i, 1);
    Store.saveContent(c);
    renderContentTab();
  }

  /* ---------- Export / Import configuration ---------- */
  function buildOverrideJS() {
    return "window.HT_OVERRIDE=" + JSON.stringify({
      content: Store.getContent(),
      settings: Store.getSettings(),
      products: Store.getProducts()
    }) + ";";
  }
  function exportOverride() {
    var code = buildOverrideJS();
    var area = document.getElementById("set-export-area");
    if (area) area.value = code;
    var blob = new Blob([code], { type: "text/javascript;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data-override.js";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    window.HT_Toast(T("admin.saved"));
  }
  function copyOverride() {
    var code = buildOverrideJS();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () { window.HT_Toast(T("admin.overrideCopied")); });
    } else {
      var area = document.getElementById("set-export-area");
      if (area) { area.value = code; area.select(); document.execCommand("copy"); window.HT_Toast(T("admin.overrideCopied")); }
    }
  }
  function importOverride() {
    var area = document.getElementById("set-import-area");
    var code = (area && area.value || "").trim();
    if (!code) { window.HT_Toast(T("common.required"), "err"); return; }
    var obj = null;
    try {
      var body = code.replace(/^window\.HT_OVERRIDE\s*=\s*/, "").replace(/;\s*$/, "");
      obj = JSON.parse(body);
    } catch (e) {
      window.HT_Toast(T("admin.wrongJson"), "err");
      return;
    }
    if (!obj) { window.HT_Toast(T("admin.wrongJson"), "err"); return; }
    if (obj.content) Store.saveContent(obj.content);
    if (obj.settings) Store.saveSettings(obj.settings);
    if (obj.products) Store.saveProducts(obj.products);
    window.HT_Toast(T("admin.importOk"));
    setTimeout(function () { location.reload(); }, 900);
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.addEventListener("submit", function (e) { e.preventDefault(); doLogin(); });

    var logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", doLogout);

    document.querySelectorAll(".admin-side nav a[data-tab]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); switchTab(a.getAttribute("data-tab")); });
    });

    var menuBtn = document.getElementById("admin-menu-btn");
    if (menuBtn) menuBtn.addEventListener("click", function () { document.querySelector(".admin-side").classList.toggle("open"); });

    /* add/edit product buttons */
    var addBtn = document.getElementById("prod-add-btn");
    if (addBtn) addBtn.addEventListener("click", function () { openProductModal(null); });
    var saveBtn = document.getElementById("prod-save-btn");
    if (saveBtn) saveBtn.addEventListener("click", saveProduct);
    var cancelBtn = document.getElementById("prod-cancel-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", function () { document.getElementById("product-modal").classList.remove("open"); });

    /* close modals on backdrop */
    document.querySelectorAll(".modal").forEach(function (m) {
      m.addEventListener("click", function (e) {
        if (e.target === m) m.classList.remove("open");
      });
    });
    document.querySelectorAll(".modal .m-close").forEach(function (b) {
      b.addEventListener("click", function () { b.closest(".modal").classList.remove("open"); });
    });

    initProductImageUpload();
    initProductWizard();

    var exportBtn = document.getElementById("inq-export-btn");
    if (exportBtn) exportBtn.addEventListener("click", exportInquiriesCSV);

    var saveSetBtn = document.getElementById("set-save-btn");
    if (saveSetBtn) saveSetBtn.addEventListener("click", saveSettings);
    var pwdBtn = document.getElementById("set-pwd-btn");
    if (pwdBtn) pwdBtn.addEventListener("click", changePassword);
    var resetBtn = document.getElementById("set-reset-btn");
    if (resetBtn) resetBtn.addEventListener("click", resetData);

    var goHome = document.getElementById("go-home-btn");
    if (goHome) goHome.setAttribute("href", "index.html");

    /* content tabs */
    document.querySelectorAll(".c-tab").forEach(function (b) {
      b.addEventListener("click", function () {
        ctab = b.getAttribute("data-ctab");
        document.querySelectorAll(".c-tab").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        renderContentTab();
      });
    });
    var cmSave = document.getElementById("cm-save-btn");
    if (cmSave) cmSave.addEventListener("click", function () {
      if (state.cedit && state.cedit.section) saveSItem(); else saveCItem();
    });
    var cmCancel = document.getElementById("cm-cancel-btn");
    if (cmCancel) cmCancel.addEventListener("click", function () { document.getElementById("content-modal").classList.remove("open"); state.cedit = null; });

    /* export / import */
    var expBtn = document.getElementById("set-export-btn");
    if (expBtn) expBtn.addEventListener("click", exportOverride);
    var copyBtn = document.getElementById("set-copy-btn");
    if (copyBtn) copyBtn.addEventListener("click", copyOverride);
    var impBtn = document.getElementById("set-import-btn");
    if (impBtn) impBtn.addEventListener("click", importOverride);

    /* admin language switcher (EN/ZH quick toggle) */
    document.querySelectorAll("[data-admin-lang]").forEach(function (wrap) {
      wrap.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-alang]");
        if (!b) return;
        var lang = b.getAttribute("data-alang");
        if (!window.HT_I18N) return;
        window.HT_I18N.setLang(lang); /* always re-apply — covers remembered-language mismatch */
        window.HT_I18N.apply();
        wrap.querySelectorAll("[data-alang]").forEach(function (x) { x.classList.toggle("active", x === b); });
        document.querySelectorAll("[data-admin-lang]").forEach(function (w2) {
          w2.querySelectorAll("[data-alang]").forEach(function (x2) {
            x2.classList.toggle("active", x2.getAttribute("data-alang") === lang);
          });
        });
        /* re-render current tab with new language */
        if (checkAuth()) switchTab(state.tab);
      });
    });

    if (checkAuth()) showShell();
  });
})();
