/**
 * Homepage behavior: role typewriter.
 * Theme, clock, year, and uptime live in assets/js/site.js.
 */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, root = document) => root.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, prefersReducedMotion ? 0 : ms));

  /* ── role typewriter ─────────────────────────────────── */
  function reserveRoleHeight(el, roles) {
    const row = el.closest(".landing-role");
    if (!row) return;

    // Measure the tallest role at the current width so typing / role swaps
    // never shift the bio and content below.
    const previous = el.textContent;
    let maxH = 0;
    for (const role of roles) {
      el.textContent = role;
      maxH = Math.max(maxH, row.getBoundingClientRect().height);
    }
    el.textContent = previous;
    if (maxH > 0) row.style.minHeight = `${Math.ceil(maxH)}px`;
  }

  async function typeRoles() {
    const el = $("#role-typewriter");
    if (!el) return;

    const roles = [
      "Security Researcher",
      "Vulnerability Hunter",
      "Offensive Security Enthusiast",
      "PoC Engineer",
      "Bug Bounty Operator",
    ];

    reserveRoleHeight(el, roles);

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => reserveRoleHeight(el, roles), 120);
    });

    if (prefersReducedMotion) {
      el.textContent = roles[0];
      return;
    }

    let i = 0;
    while (true) {
      const text = roles[i % roles.length];
      for (let c = 0; c <= text.length; c++) {
        el.textContent = text.slice(0, c);
        await sleep(38);
      }
      await sleep(1800);
      for (let c = text.length; c >= 0; c--) {
        el.textContent = text.slice(0, c);
        await sleep(18);
      }
      await sleep(280);
      i++;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    typeRoles();
  });
})();
