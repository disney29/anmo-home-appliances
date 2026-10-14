/* ============================================================
   i18n.js — Multi-language engine (15 languages)
   en (default) statically included; others injected on demand.
   Missing keys fall back to English automatically.
   Elements: [data-i18n] text · [data-i18n-ph] placeholder ·
   [data-i18n-title] title · [data-i18n-html] innerHTML ·
   [data-title] document.title · [data-meta-desc] · [data-meta-keys]
   ============================================================ */
(function () {
  "use strict";

  var LANGS = ["en", "zh", "vi", "th", "id", "es", "fr", "pt", "ru", "ja", "ko", "it", "de", "nl", "ar"];
  var LS_KEY = "ht_lang";

  function getDefaultLang() {
    var m = (location.search || "").match(/[?&]lang=([a-z]{2})/i);
    if (m && LANGS.indexOf(m[1].toLowerCase()) > -1) return m[1].toLowerCase();
    try {
      var s = localStorage.getItem(LS_KEY);
      if (s && LANGS.indexOf(s) > -1) return s;
    } catch (e) {}
    return "en";
  }

  function lookup(d, lang, key) {
    var v = d[lang];
    if (!v) return null;
    var parts = key.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return null;
      v = v[parts[i]];
    }
    return (v === undefined || v === null) ? null : v;
  }

  window.HT_I18N = {
    current: getDefaultLang(),
    langs: LANGS,
    t: function (key) {
      var d = window.I18N_DATA || {};
      var v = lookup(d, this.current, key);
      if (v === null || v === undefined) v = lookup(d, "en", key); /* fallback to English */
      return (v === null || v === undefined) ? key : v;
    },
    t2: function (lang, key) { /* lookup in a specific language (falls back to en) */
      var d = window.I18N_DATA || {};
      var v = lookup(d, lang, key);
      if (v === null || v === undefined) v = lookup(d, "en", key);
      return (v === null || v === undefined) ? key : v;
    },
    setLang: function (lang) {
      if (LANGS.indexOf(lang) === -1) lang = "en";
      var self = this;
      var apply = function () {
        self.current = lang;
        try { localStorage.setItem(LS_KEY, lang); } catch (e) {}
        self.apply();
        document.dispatchEvent(new CustomEvent("ht:langchange", { detail: { lang: lang } }));
      };
      if (lang === "en" || (window.I18N_DATA && window.I18N_DATA[lang])) {
        apply();
      } else {
        var s = document.createElement("script");
        s.src = "langs/" + lang + ".js";
        s.onload = apply;
        s.onerror = function () { apply(); };
        document.head.appendChild(s);
      }
    },
    apply: function () {
      var d = (window.I18N_DATA && window.I18N_DATA[this.current]) || {};
      document.documentElement.lang = this.current;
      document.documentElement.dir = d.dir || "ltr";
      document.title = this.t("meta." + (document.body.getAttribute("data-page") || "home") + ".title");

      var self = this;
      // text nodes
      var els = document.querySelectorAll("[data-i18n]");
      for (var i = 0; i < els.length; i++) {
        var v = self.t(els[i].getAttribute("data-i18n"));
        if (v !== els[i].getAttribute("data-i18n")) els[i].textContent = v;
      }
      // placeholders
      els = document.querySelectorAll("[data-i18n-ph]");
      for (i = 0; i < els.length; i++) {
        var p = self.t(els[i].getAttribute("data-i18n-ph"));
        if (p !== els[i].getAttribute("data-i18n-ph")) els[i].setAttribute("placeholder", p);
      }
      // titles / alt
      els = document.querySelectorAll("[data-i18n-title]");
      for (i = 0; i < els.length; i++) {
        var tt = self.t(els[i].getAttribute("data-i18n-title"));
        if (tt !== els[i].getAttribute("data-i18n-title")) els[i].setAttribute("title", tt);
      }
      // innerHTML (small trusted fragments)
      els = document.querySelectorAll("[data-i18n-html]");
      for (i = 0; i < els.length; i++) {
        var h = self.t(els[i].getAttribute("data-i18n-html"));
        if (h !== els[i].getAttribute("data-i18n-html")) els[i].innerHTML = h;
      }
      // meta description / keywords
      var md = document.querySelector('meta[name="description"]');
      if (md) { var dd = self.t("meta." + (document.body.getAttribute("data-page") || "home") + ".desc"); if (dd) md.setAttribute("content", dd); }
      var mk = document.querySelector('meta[name="keywords"]');
      if (mk) { var kk = self.t("meta." + (document.body.getAttribute("data-page") || "home") + ".keys"); if (kk) mk.setAttribute("content", kk); }
      // active lang buttons
      var btns = document.querySelectorAll(".lang-drop button");
      for (i = 0; i < btns.length; i++) {
        var code = btns[i].getAttribute("data-lang");
        if (code === this.current) btns[i].classList.add("active");
        else btns[i].classList.remove("active");
      }
      var cur = document.querySelector(".lang-btn .cur");
      if (cur) cur.textContent = this.current.toUpperCase();
      // html fragments that need re-render
      document.dispatchEvent(new CustomEvent("ht:i18n-applied"));
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.HT_I18N.apply();
  });
})();
