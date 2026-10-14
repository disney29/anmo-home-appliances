/* ============================================================
   app.js — Shared front-end behaviors
   nav · language switcher · cookie consent · chat widget ·
   inquiry forms · contact injection · reveal · toast
   ============================================================ */
(function () {
  "use strict";

  var T = function (k) { return window.HT_I18N.t(k); };
  var Store = window.HT_Store;

  /* ---------- Toast ---------- */
  function toast(msg, type) {
    var box = document.getElementById("toast-box");
    if (!box) { box = document.createElement("div"); box.id = "toast-box"; document.body.appendChild(box); }
    var el = document.createElement("div");
    el.className = "toast " + (type || "ok");
    var icon = type === "err"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
    el.innerHTML = icon + "<span></span>";
    el.querySelector("span").textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 3200);
    setTimeout(function () { el.remove(); }, 3700);
  }
  window.HT_Toast = toast;

  /* ---------- Mobile nav ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.querySelector(".nav-toggle");
    var menu = document.querySelector(".nav-menu");
    var closeBtn = document.querySelector(".nav-close");
    if (toggle && menu) {
      toggle.addEventListener("click", function () { menu.classList.toggle("open"); });
      if (closeBtn) closeBtn.addEventListener("click", function () { menu.classList.remove("open"); });
      document.addEventListener("click", function (e) {
        if (!menu.contains(e.target) && !toggle.contains(e.target)) menu.classList.remove("open");
      });
    }

    /* ---------- Language switcher ---------- */
    var langBtn = document.querySelector(".lang-btn");
    var langDrop = document.querySelector(".lang-drop");
    if (langBtn && langDrop) {
      langBtn.addEventListener("click", function (e) { e.stopPropagation(); langDrop.classList.toggle("open"); });
      document.addEventListener("click", function (e) { if (!langDrop.contains(e.target)) langDrop.classList.remove("open"); });
    }
    document.querySelectorAll(".lang-drop button[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () {
        window.HT_I18N.setLang(b.getAttribute("data-lang"));
        langDrop.classList.remove("open");
      });
    });

    /* ---------- Cookie consent ---------- */
    var cookieBar = document.getElementById("cookie-bar");
    if (cookieBar) {
      var consent = null;
      try { consent = localStorage.getItem("ht_cookie"); } catch (e) {}
      if (!consent) cookieBar.classList.remove("hidden");
      var decide = function (v) {
        try { localStorage.setItem("ht_cookie", v); } catch (e) {}
        cookieBar.classList.add("hidden");
        if (v === "all") loadAnalytics();
      };
      var a = cookieBar.querySelector("[data-cookie-accept]");
      var d = cookieBar.querySelector("[data-cookie-decline]");
      if (a) a.addEventListener("click", function () { decide("all"); });
      if (d) d.addEventListener("click", function () { decide("essential"); });
      // already consented? load analytics if allowed
      if (consent === "all") loadAnalytics();
    }

    /* ---------- Inject contact data ---------- */
    var settings = Store.getSettings();
    document.querySelectorAll("[data-ht-email]").forEach(function (el) {
      el.setAttribute("href", "mailto:" + settings.email); el.textContent = settings.email;
    });
    document.querySelectorAll("[data-ht-phone]").forEach(function (el) {
      el.setAttribute("href", "tel:" + settings.phone.replace(/[^+\d]/g, "")); el.textContent = settings.phone;
    });
    document.querySelectorAll("[data-ht-address]").forEach(function (el) { el.textContent = settings.address; });
    document.querySelectorAll("[data-ht-map]").forEach(function (el) {
      el.src = settings.mapEmbed || "https://www.google.com/maps?q=Yiwu,Jinhua,Zhejiang,China&output=embed";
    });
    document.querySelectorAll("[data-ht-name]").forEach(function (el) { el.textContent = settings.companyName; });
    document.querySelectorAll("[data-ht-wa]").forEach(function (el) {
      var num = settings.whatsapp.replace(/[^\d]/g, "");
      el.setAttribute("href", "https://wa.me/" + num);
    });
    document.querySelectorAll("[data-ht-wa-text]").forEach(function (el) {
      var num = settings.whatsapp.replace(/[^\d]/g, "");
      var txt = el.getAttribute("data-ht-wa-text") || "";
      var msg = encodeURIComponent(txt);
      el.setAttribute("href", "https://wa.me/" + num + "?text=" + msg);
    });

    /* ---------- Reveal on scroll ---------- */
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.08 });
      document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    }

    /* ---------- Footer year ---------- */
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

    /* ---------- Chat widget ---------- */
    initChat();

    /* ---------- Inquiry forms ---------- */
    initInquiryForms();
  });

  function loadAnalytics() {
    var settings = Store.getSettings();
    if (!settings.gaId) return;
    if (window.__htGaLoaded) return;
    window.__htGaLoaded = true;
    var s1 = document.createElement("script");
    s1.async = true;
    s1.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(settings.gaId);
    document.head.appendChild(s1);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", settings.gaId);
  }

  /* ---------- Chat widget ---------- */
  function initChat() {
    var fab = document.querySelector(".chat-fab");
    var panel = document.getElementById("chat-panel");
    if (!fab || !panel) return;
    var openBtn = fab.querySelector(".main-fab");
    var closeBtn = panel.querySelector(".m-close");
    var form = panel.querySelector(".chat-form");
    var input = panel.querySelector(".chat-input-field");
    var body = panel.querySelector(".chat-body");

    openBtn.addEventListener("click", function () { panel.classList.toggle("open"); });
    if (closeBtn) closeBtn.addEventListener("click", function () { panel.classList.remove("open"); });

    // inject quick links
    var settings = Store.getSettings();
    var waQuick = panel.querySelector("[data-ht-wa-chat]");
    if (waQuick) {
      var num = settings.whatsapp.replace(/[^\d]/g, "");
      waQuick.setAttribute("href", "https://wa.me/" + num);
    }
    var emailQuick = panel.querySelector("[data-ht-email-chat]");
    if (emailQuick) emailQuick.setAttribute("href", "mailto:" + settings.email);

    if (form && input && body) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var msg = input.value.trim();
        if (!msg) return;
        sendChatMsg(msg);
      });

      /* ---------- FAQ smart quick replies (requirement 15) ---------- */
      var faqZone = document.createElement("div");
      faqZone.className = "chat-faq";
      var fqTitle = document.createElement("div");
      fqTitle.className = "chat-faq-title";
      fqTitle.textContent = T("chat.faqTitle");
      faqZone.appendChild(fqTitle);
      var qs = [];
      for (var qi = 1; qi <= 6; qi++) {
        var qq = T("chat.faq" + qi + "q");
        var aa = T("chat.faq" + qi + "a");
        if (qq && qq.indexOf("chat.faq") !== 0 && aa && aa.indexOf("chat.faq") !== 0) {
          qs.push({ q: qq, a: aa });
        }
      }
      qs.forEach(function (fq) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chat-faq-btn";
        b.textContent = fq.q;
        b.addEventListener("click", function () {
          sendChatMsg(fq.q);
          var d = document.createElement("div");
          d.className = "chat-msg bot";
          d.textContent = fq.a + " " + T("chat.faqHint");
          body.appendChild(d);
          body.scrollTop = body.scrollHeight;
        });
        faqZone.appendChild(b);
      });
      if (qs.length) panel.insertBefore(faqZone, form);
    }

    function sendChatMsg(msg) {
      if (!msg) return;
      var item = { from: "website-chat", text: msg, time: new Date().toISOString() };
      var list = Store.getChat();
      list.push(item);
      Store.saveChat(list);
      var d = document.createElement("div");
      d.className = "chat-msg user";
      d.textContent = msg;
      body.appendChild(d);
      input.value = "";
      body.scrollTop = body.scrollHeight;
      toast(T("common.successSend"));
    }
  }

  /* ---------- Inquiry forms ---------- */
  function initInquiryForms() {
    document.querySelectorAll("form.ht-form").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = {};
        var requiredOk = true;
        form.querySelectorAll("[name]").forEach(function (f) {
          var v = f.value.trim();
          if (f.hasAttribute("required") && !v) requiredOk = false;
          data[f.name] = v;
        });
        if (!requiredOk) { toast(T("common.required"), "err"); return; }

        var btn = form.querySelector("button[type=submit]");
        if (btn) { btn.disabled = true; btn.classList.add("loading-dots"); }

        // attachment(s): support multiple files (requirement 12)
        var fileInput = form.querySelector('input[type="file"]');
        var attachMeta = [];
        var pending = [];
        if (fileInput && fileInput.files && fileInput.files.length) {
          Array.prototype.forEach.call(fileInput.files, function (f) {
            var meta = f.name + " (" + Math.round(f.size / 1024) + " KB)";
            attachMeta.push(meta);
            if (f.size <= 200 * 1024) {
              pending.push({ meta: meta, f: f });
            }
          });
        }
        data._attachments = attachMeta;
        if (pending.length) {
          var doneCount = 0;
          pending.forEach(function (p) {
            var reader = new FileReader();
            reader.onload = function () {
              data["_attach:" + p.meta] = reader.result;
              doneCount++;
              if (doneCount === pending.length) finish();
            };
            reader.readAsDataURL(p.f);
          });
          return;
        }
        finish();
        function finish() {
          data._type = form.getAttribute("data-form-type") || "inquiry";
          data._date = new Date().toISOString();
          data._status = "new";
          var list = Store.getInquiries();
          list.unshift(data);
          Store.saveInquiries(list);
          if (btn) { btn.disabled = false; btn.classList.remove("loading-dots"); }
          form.reset();
          showFormSuccess(form, data);
        }
      });
    });
  }

  function showFormSuccess(form, data) {
    var box = form.querySelector(".form-success");
    var settings = Store.getSettings();
    if (box) {
      box.classList.remove("hidden");
      box.querySelector("[data-suc-title]").textContent = T("quote.successTitle");
      box.querySelector("[data-suc-msg]").textContent = T("quote.successMsg");
      var wa = box.querySelector("[data-suc-wa]");
      if (wa) {
        var num = settings.whatsapp.replace(/[^\d]/g, "");
        var msg = encodeURIComponent("Inquiry: " + (data.name || "") + " | " + (data.email || "") + " | " + (data.product || "") + " | " + (data.msg || ""));
        wa.setAttribute("href", "https://wa.me/" + num + "?text=" + msg);
      }
      box.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      toast(T("common.successSend"));
    }
  }

  /* expose a way to re-inject contact data after settings change (same tab) */
  window.HT_RefreshContact = function () {
    var settings = Store.getSettings();
    document.querySelectorAll("[data-ht-email]").forEach(function (el) { el.setAttribute("href", "mailto:" + settings.email); el.textContent = settings.email; });
    document.querySelectorAll("[data-ht-phone]").forEach(function (el) { el.setAttribute("href", "tel:" + settings.phone.replace(/[^+\d]/g, "")); el.textContent = settings.phone; });
    document.querySelectorAll("[data-ht-map]").forEach(function (el) { el.src = settings.mapEmbed; });
  };
})();
