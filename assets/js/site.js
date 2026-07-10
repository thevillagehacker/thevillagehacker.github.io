/**
 * Global site effects — atmosphere, hex rain, clock helpers.
 * Include on every page:
 *   <script src="/assets/js/site.js" defer></script>
 *   (posts: ../assets/js/site.js)
 *
 * Auto-runs on DOMContentLoaded. Page scripts can use window.TVH.
 */
(function (global) {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const $ = (sel, root = document) => root.querySelector(sel);

  function assetBase() {
    // Prefer explicit data attribute, else infer from script src
    const forced = document.documentElement.getAttribute("data-asset-base");
    if (forced != null) return forced.replace(/\/?$/, "/");

    const script = document.currentScript ||
      document.querySelector('script[src*="site.js"]');
    if (script && script.src) {
      try {
        const u = new URL(script.src, window.location.href);
        // .../assets/js/site.js → .../
        return u.pathname.replace(/assets\/js\/site\.js.*$/, "");
      } catch (_) {
        /* fall through */
      }
    }
    // Fallback: posts live one level down
    if (/\/posts\//.test(window.location.pathname)) return "../";
    if (/\/projects\//.test(window.location.pathname)) return "../";
    return "/";
  }

  function injectAtmosphere() {
    if ($(".landing-atmosphere")) return;

    const wrap = document.createElement("div");
    wrap.className = "landing-atmosphere";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<div class="landing-grid"></div>' +
      '<div class="landing-scanline"></div>' +
      '<canvas id="hex-rain" class="hex-rain"></canvas>';

    document.body.insertBefore(wrap, document.body.firstChild);
    document.body.classList.add("has-site-fx");
  }

  function initHexRain(canvas) {
    canvas = canvas || $("#hex-rain");
    if (!canvas || prefersReducedMotion) {
      if (canvas) canvas.style.display = "none";
      return null;
    }
    if (canvas.dataset.tvhRain === "1") return null;
    canvas.dataset.tvhRain = "1";

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    let w, h, drops;
    const glyphs = "0123456789abcdef{}[]<>/\\|$#*+@";
    let raf = 0;
    let running = true;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const cols = Math.floor(w / 18);
      drops = Array.from({ length: cols }, () => Math.random() * h);
    }

    function draw() {
      if (!running) return;
      ctx.fillStyle = "rgba(15, 19, 24, 0.12)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
      for (let i = 0; i < drops.length; i++) {
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * 18;
        const y = drops[i] * 16;
        ctx.fillStyle =
          i % 7 === 0 ? "rgba(107,184,212,0.32)" : "rgba(107,184,212,0.1)";
        ctx.fillText(ch, x, y);
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.3 + Math.random() * 0.4;
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();

    return {
      stop() {
        running = false;
        cancelAnimationFrame(raf);
      },
    };
  }

  function initClock(selector) {
    const el = $(selector || "#nav-clock");
    if (!el) return;
    const tick = () => {
      el.textContent =
        new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
    };
    tick();
    setInterval(tick, 1000);
  }

  function ensureMonoFont() {
    // Soft-load JetBrains Mono if missing (used by hex rain + code)
    const links = Array.from(
      document.querySelectorAll('link[href*="fonts.googleapis.com"]')
    );
    const already = links.some((l) =>
      (l.getAttribute("href") || "").includes("JetBrains")
    );
    if (already) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap";
    document.head.appendChild(link);
  }

  /**
   * Mark body so CSS can stack content above atmosphere.
   * Never rewrite position on .top-nav (must stay fixed).
   */
  function elevateContent() {
    document.body.classList.add("has-site-fx");
  }

  function $$(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function init(options) {
    const opts = Object.assign(
      {
        atmosphere: true,
        hexRain: true,
        clock: true,
        monoFont: true,
      },
      options || {}
    );

    if (opts.monoFont) ensureMonoFont();
    if (opts.atmosphere) injectAtmosphere();
    elevateContent();
    if (opts.hexRain) initHexRain();
    if (opts.clock) initClock();

    document.dispatchEvent(new CustomEvent("tvh:ready", { detail: TVH }));
    return TVH;
  }

  const TVH = {
    version: "1.0.0",
    prefersReducedMotion,
    assetBase,
    injectAtmosphere,
    initHexRain,
    initClock,
    init,
    $,
    sleep(ms) {
      return new Promise((r) =>
        setTimeout(r, prefersReducedMotion ? 0 : ms)
      );
    },
    escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },
  };

  global.TVH = TVH;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
