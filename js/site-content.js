/* ============================================================
   site-content.js — Renders editable site content (homepage &
   about page blocks) from HT_Store.getContent().
   Markup hooks:
     [data-c-render="TYPE"]  container filled by renderer
     [data-c-title="path"]   text content (multilingual)
     [data-c-sub="path"]     text content (multilingual)
     [data-c-img="path"]     <img> src
   Content is multilingual ({en,zh,vi,th,id,es,fr,pt}) and
   editable from Admin > Content. Language switch re-renders
   via the ht:i18n-applied event.
   ============================================================ */
(function () {
  "use strict";

  var Store = window.HT_Store;
  var Util = window.HT_Util;
  var LANGS = ["en", "zh", "vi", "th", "id", "es", "fr", "pt"];

  function cur() { return window.HT_I18N ? window.HT_I18N.current : "en"; }
  function L(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    var c = cur();
    if (typeof v[c] === "string" && v[c] !== "") return v[c];
    if (typeof v.en === "string") return v.en;
    return "";
  }
  function esc(s) { return Util.esc(s); }
  function getPath(obj, path) {
    var node = obj;
    String(path).split(".").forEach(function (k) {
      if (node == null) return;
      if (/^\d+$/.test(k)) k = parseInt(k, 10);
      node = node[k];
    });
    return node;
  }
  function icon(name) {
    var paths = {
      star: '<path d="M12 2l2.4 6.9H21l-5.4 4.2 2 6.9-5.6-4.1-5.6 4.1 2-6.9L3 8.9h6.6L12 2z"/>',
      shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/>',
      heart: '<path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 12c-2.5 4.4-9.5 9-9.5 9z"/><path d="M9 12l2 2 4-4"/>',
      cart: '<path d="M3 3h2l2.4 12.6a2 2 0 002 1.6h8.9a2 2 0 002-1.6L21 7H6"/><circle cx="10" cy="20.5" r="1.5"/><circle cx="18" cy="20.5" r="1.5"/>',
      truck: '<path d="M3 17h18M5 17l2-8h10l2 8"/><path d="M7 10V7a2 2 0 012-2h6a2 2 0 012 2v3"/><circle cx="8" cy="20" r="1.5"/><circle cx="16" cy="20" r="1.5"/>',
      card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 4 5.6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-5.6-4-9s1.5-6.3 4-9z"/>',
      globe2: '<circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 010 18M12 3a15 15 0 000 18M3 12h18"/>',
      plus: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
      building: '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>',
      pin: '<path d="M12 2c4 3 6 6 6 10a6 6 0 01-12 0c0-4 2-7 6-10z"/><path d="M12 22v-4"/>',
      check: '<path d="M20 6L9 17l-5-5"/>',
      label: '<path d="M3 3h5v5H3V3zM16 3h5v5h-5V3zM3 16h5v5H3v-5zM16 16h5v5h-5v-5z"/><path d="M6.5 8v2.5a2 2 0 002 2h7a2 2 0 002-2V8M12 12.5V17"/>',
      bolt: '<path d="M13 2L4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2z"/>',
      mold: '<path d="M12 2l2.4 2.4L12 6.8 9.6 4.4 12 2zM4 9h4v2H4V9zM16 9h4v2h-4V9zM7 14h10v2H7v-2z"/><rect x="3" y="17" width="18" height="4" rx="1"/>',
      cert: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/>',
      box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
      gear: '<path d="M14.7 6.3a4.5 4.5 0 00-6 6L3 18v3h3l5.7-5.7a4.5 4.5 0 006-6L14 13l-3-3 3.7-3.7z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + (paths[name] || paths.check) + "</svg>";
  }
  function svg(paths, sw) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '">' + paths + "</svg>";
  }
  var STARS = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/></svg>';
  var MARKET_ICONS = ["globe", "heart", "plus", "building", "globe2", "pin"];

  /* ---------- renderers ---------- */
  var R = {};

  R.heroSlides = function (c) {
    var list = (c.hero && c.hero.slides) || [];
    return list.map(function (s, i) {
      return '<div class="slide' + (i === 0 ? " active" : "") + '">'
        + '<div class="slide-bg" style="background-image:url(\'' + esc(s.img || "") + '\')"></div>'
        + '<div class="container"><div class="slide-content">'
        + '<span class="badge-live">' + esc(L(s.badge)) + "</span>"
        + "<h1>" + esc(L(s.title)) + "</h1>"
        + "<p>" + esc(L(s.sub)) + "</p>"
        + '<div class="btn-row">'
        + '<a href="' + esc(s.btn1Href || "#") + '" class="btn btn-primary">' + esc(L(s.btn1)) + "</a>"
        + '<a href="' + esc(s.btn2Href || "#") + '" class="btn btn-white-outline">' + esc(L(s.btn2)) + "</a>"
        + "</div></div></div></div>";
    }).join("");
  };

  R.stats = function (c) {
    return (c.stats || []).map(function (s) {
      return '<div class="stat"><div class="v">' + esc(s.v) + '</div><div class="l">' + esc(L(s.l)) + "</div></div>";
    }).join("");
  };

  R.advantages = function (c) {
    return (c.advantages || []).map(function (a) {
      return '<div class="card adv-card reveal">'
        + '<div class="icon">' + icon(a.icon || "star") + "</div>"
        + "<h3>" + esc(L(a.title)) + "</h3>"
        + "<p>" + esc(L(a.desc)) + "</p></div>";
    }).join("");
  };

  R.why = function (c) {
    return (c.why || []).map(function (w) {
      return '<div class="card why-card reveal">'
        + '<div class="icon">' + icon(w.icon || "check") + "</div>"
        + "<div><h3>" + esc(L(w.title)) + "</h3><p>" + esc(L(w.desc)) + "</p></div></div>";
    }).join("");
  };

  R.testimonials = function (c) {
    return (c.testimonials || []).map(function (t) {
      return '<div class="card t-card reveal">'
        + '<div class="stars">' + STARS.repeat(5) + "</div>"
        + "<blockquote>" + esc(L(t.text)) + "</blockquote>"
        + '<div class="t-person"><span class="avatar">' + esc(t.initial || "★") + "</span><div>"
        + '<div class="t-name">' + esc(L(t.name)) + "</div>"
        + '<div class="t-country">' + esc(L(t.role)) + "</div></div></div></div>";
    }).join("");
  };

  R.markets = function (c) {
    return (c.markets || []).map(function (m, i) {
      return '<div class="market-card reveal"><h3>' + icon(MARKET_ICONS[i] || "globe")
        + "<span>" + esc(L(m.title)) + "</span></h3><p>" + esc(L(m.desc)) + "</p></div>";
    }).join("");
  };

  R.quoteFeats = function (c) {
    return (c.quote && c.quote.feats || []).map(function (f) {
      return '<li>' + svg('<path d="M20 6L9 17l-5-5"/>')
        + "<div><b>" + esc(L(f.t)) + "</b><br><span>" + esc(L(f.d)) + "</span></div></li>";
    }).join("");
  };

  R.aboutStory = function (c) {
    var s = (c.about && c.about.story) || {};
    var t = L(getPath(c, "sections.about.storyT"));
    return '<div class="ai-text reveal">'
      + '<span class="kicker">' + esc(t) + "</span>"
      + "<h2>" + esc(t) + "</h2>"
      + "<p>" + esc(L(s.p1)) + "</p>"
      + "<p>" + esc(L(s.p2)) + "</p></div>"
      + '<div class="ai-img reveal"><img src="' + esc(s.img || "") + '" alt="" loading="lazy"></div>';
  };

  R.aboutTimeline = function (c) {
    return (c.about && c.about.timeline || []).map(function (t) {
      return '<div class="tl-item reveal"><div class="tl-year">' + esc(t.year) + "</div>"
        + '<div class="tl-dot"></div>'
        + '<div class="tl-content"><h3>' + esc(L(t.title)) + "</h3><p>" + esc(L(t.desc)) + "</p></div></div>";
    }).join("");
  };

  R.aboutFactory = function (c) {
    return (c.about && c.about.factory || []).map(function (f) {
      return '<figure class="f-img reveal"><img src="' + esc(f.img) + '" alt="" loading="lazy">'
        + '<figcaption class="f-cap">' + esc(L(f.cap)) + "</figcaption></figure>";
    }).join("");
  };

  R.aboutQc = function (c) {
    return (c.about && c.about.qc || []).map(function (q, i) {
      return '<div class="qc-step reveal"><div class="n">' + (i + 1) + "</div>"
        + "<h3>" + esc(L(q.title)) + "</h3><p>" + esc(L(q.desc)) + "</p></div>";
    }).join("");
  };

  R.aboutCerts = function (c) {
    return (c.about && c.about.certs || []).map(function (crt) {
      return '<span class="cert-badge">' + icon("shield") + esc(crt) + "</span>";
    }).join("");
  };

  R.aboutOem = function (c) {
    return (c.about && c.about.oem || []).map(function (o) {
      return '<div class="card oem-card reveal"><div class="icon">' + icon(o.icon || "check") + "</div>"
        + "<h3>" + esc(L(o.title)) + "</h3><p>" + esc(L(o.desc)) + "</p></div>";
    }).join("");
  };

  /* product-line chip row shared by about page & homepage */
  function plChipRow(c) {
    var pl = (c.about && c.about.productLines) || {};
    var items = pl.items || [];
    return '<div class="filter-chips" style="justify-content:center;max-width:960px;margin:0 auto">'
      + items.map(function (it) {
          return '<span class="chip reveal" style="cursor:default">' + esc(L(it.name)) + "</span>";
        }).join("")
      + "</div>";
  }

  R.aboutProductLines = function (c) {
    var pl = (c.about && c.about.productLines) || {};
    var title = L(pl.title);
    var paras = String(L(pl.intro) || "").split(/\n\n+/).filter(function (p) { return p; });
    var html = '<div class="sec-head reveal"><span class="kicker">' + esc(title) + "</span><h2>" + esc(title) + "</h2></div>";
    html += '<div class="pl-intro reveal" style="max-width:860px;margin:0 auto 32px;text-align:center;color:var(--ink-2);font-size:16px;line-height:1.8">'
      + paras.map(function (p) { return '<p style="margin-bottom:14px">' + esc(p) + "</p>"; }).join("")
      + "</div>";
    html += plChipRow(c);
    return html;
  };

  R.homeAbout = function (c) {
    var t = L(getPath(c, "sections.homeAbout.title"));
    var s = L(getPath(c, "sections.homeAbout.sub"));
    var more = L(getPath(c, "sections.homeAbout.more"));
    var html = '<div class="sec-head reveal"><span class="kicker">' + esc(t) + "</span><h2>" + esc(t) + "</h2><p>" + esc(s) + "</p></div>";
    html += plChipRow(c);
    html += '<div class="btn-row reveal" style="justify-content:center;margin-top:28px"><a href="about.html" class="btn btn-primary">' + esc(more) + "</a></div>";
    return html;
  };

  /* ---------- hero slider ---------- */
  function initHero() {
    var wrap = document.querySelector("[data-c-render=heroSlides]");
    if (!wrap) return;
    var dotsEl = document.querySelector("[data-c-dots]");
    var slides = wrap.querySelectorAll(".slide");
    if (!slides.length) { if (dotsEl) dotsEl.innerHTML = ""; return; }
    var dots = [];
    if (dotsEl) {
      dotsEl.innerHTML = Array.prototype.map.call(slides, function (_, i) {
        return '<button' + (i === 0 ? ' class="active"' : "") + ' aria-label="Slide ' + (i + 1) + '"></button>';
      }).join("");
      dots = dotsEl.querySelectorAll("button");
    }
    var idx = 0, timer;
    function go(n) {
      slides[idx].classList.remove("active");
      if (dots[idx]) dots[idx].classList.remove("active");
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add("active");
      if (dots[idx]) dots[idx].classList.add("active");
    }
    function play() { clearInterval(timer); timer = setInterval(function () { go(idx + 1); }, 6000); }
    Array.prototype.forEach.call(dots, function (d, i) {
      d.addEventListener("click", function () { go(i); play(); });
    });
    play();
  }

  /* ---------- reveal (for dynamically inserted cards) ---------- */
  function initReveal() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal:not(.in)").forEach(function (el) { io.observe(el); });
  }

  /* ---------- full render ---------- */

  function renderCatCards() {
    var wrap = document.getElementById("cat-cards");
    if (!wrap) return;
    var cats = window.HT_Store.getCats();
    var lang = (window.HT_I18N && window.HT_I18N.current) || "en";
    var html = "";
    cats.forEach(function (c) {
      var id = typeof c === "string" ? c : c.id;
      var img = (typeof c === "object" && c.image) ? c.image : "assets/images/product-p1.jpg";
      var nm = id;
      if (typeof c === "object" && c.name) nm = c.name[lang] || c.name.en || id;
      html += '<a href="products.html?cat=' + encodeURIComponent(id) + '" class="card cat-card reveal">'
        + '<div class="cat-img"><img src="' + img + '" alt="' + String(nm).replace(/"/g, "&quot;") + '" loading="lazy"></div>'
        + '<div class="cat-body"><h3>' + String(nm).replace(/</g, "&lt;") + '</h3>'
        + '<span class="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></a>';
    });
    wrap.innerHTML = html;
  }

  function render() {
    var c = Store.getContent();
    document.querySelectorAll("[data-c-title]").forEach(function (el) {
      var v = getPath(c, el.getAttribute("data-c-title"));
      if (v != null) el.textContent = L(v);
    });
    document.querySelectorAll("[data-c-sub]").forEach(function (el) {
      var v = getPath(c, el.getAttribute("data-c-sub"));
      if (v != null) el.textContent = L(v);
    });
    document.querySelectorAll("[data-c-img]").forEach(function (el) {
      var v = getPath(c, el.getAttribute("data-c-img"));
      if (typeof v === "string" && v) el.setAttribute("src", v);
    });
    document.querySelectorAll("[data-c-render]").forEach(function (el) {
      var fn = R[el.getAttribute("data-c-render")];
      if (fn) el.innerHTML = fn(c);
    });
    renderCatCards();
    initHero();
    initReveal();
  }

  window.HT_Content = { render: render, L: L, getPath: getPath, LANGS: LANGS };

  document.addEventListener("DOMContentLoaded", function () { render(); });
  document.addEventListener("ht:i18n-applied", function () { render(); });
})();
