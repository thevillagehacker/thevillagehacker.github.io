/**
 * Shared page behavior for the live site: theme, nav clock, year, uptime.
 */
(function () {
  "use strict";

  const THEME_KEY = "tvh_theme";
  const $ = (sel, root = document) => root.querySelector(sel);

  function getStoredTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (_) {
      /* private mode */
    }
    return "light";
  }

  function syncThemeToggleUi() {
    const btn = $("#theme-toggle");
    if (!btn) return;
    const isLight = getStoredTheme() === "light";
    btn.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    btn.setAttribute("title", isLight ? "Dark mode" : "Light mode");
    const icon = btn.querySelector(".theme-toggle-icon");
    const label = btn.querySelector(".theme-toggle-label");
    if (icon) icon.textContent = isLight ? "☾" : "☀";
    if (label) label.textContent = isLight ? "Dark" : "Light";
  }

  function applyTheme(theme) {
    const mode = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (_) {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode === "light" ? "#ffffff" : "#121318");
    syncThemeToggleUi();
  }

  function toggleTheme() {
    applyTheme(getStoredTheme() === "light" ? "dark" : "light");
  }

  function injectThemeToggle() {
    if ($("#theme-toggle")) {
      syncThemeToggleUi();
      return;
    }
    const host = $(".nav-right") || $("nav");
    if (!host) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "theme-toggle";
    btn.className = "theme-toggle";
    btn.innerHTML =
      '<span class="theme-toggle-icon" aria-hidden="true">☀</span>' +
      '<span class="theme-toggle-label">Light</span>';
    btn.addEventListener("click", toggleTheme);
    host.appendChild(btn);
    syncThemeToggleUi();
  }

  try {
    applyTheme(getStoredTheme());
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "light");
  }

  function initClock() {
    const el = $("#nav-clock");
    if (!el) return;
    const tick = () => {
      el.textContent = new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
    };
    tick();
    setInterval(tick, 1000);
  }

  function initPageMeta() {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());

    const uptime = $("#uptime");
    if (!uptime) return;
    const pageStart = Date.now();
    const tick = () => {
      const sec = Math.floor((Date.now() - pageStart) / 1000);
      const h = String(Math.floor(sec / 3600)).padStart(2, "0");
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      uptime.textContent = `uptime: ${h}:${m}:${s}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  function init() {
    injectThemeToggle();
    initClock();
    initPageMeta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
