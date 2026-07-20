/**
 * Global site effects — atmosphere, cyber neural mesh, clock helpers,
 * HTTP request/response code highlighting.
 * Include on every page:
 *   <script src="/assets/js/site.js" defer></script>
 *   (posts / projects: ../assets/js/site.js)
 *
 * Auto-runs on DOMContentLoaded. Page scripts can use window.TVH.
 * Mesh control API: TVH.mesh.{ recon, breach, calm, compromiseAt }
 * HTTP highlight: TVH.enhanceHttpHighlighting()
 */
(function (global) {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const $ = (sel, root = document) => root.querySelector(sel);

  function assetBase() {
    const forced = document.documentElement.getAttribute("data-asset-base");
    if (forced != null) return forced.replace(/\/?$/, "/");

    const script =
      document.currentScript ||
      document.querySelector('script[src*="site.js"]');
    if (script && script.src) {
      try {
        const u = new URL(script.src, window.location.href);
        return u.pathname.replace(/assets\/js\/site\.js.*$/, "");
      } catch (_) {
        /* fall through */
      }
    }
    if (/\/posts\//.test(window.location.pathname)) return "../";
    if (/\/projects\//.test(window.location.pathname)) return "../";
    return "/";
  }

  function randomHex(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  function resolveMeshCanvas(canvas) {
    if (canvas) return canvas;

    let el = $("#cyber-mesh");
    if (el) return el;

    el = $("#hex-rain");
    if (el) {
      el.id = "cyber-mesh";
      el.classList.remove("hex-rain");
      el.classList.add("cyber-mesh");
      return el;
    }
    return null;
  }

  function injectAtmosphere() {
    if ($(".landing-atmosphere")) return;

    const wrap = document.createElement("div");
    wrap.className = "landing-atmosphere";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<div class="landing-grid"></div>' +
      '<div class="landing-scanline"></div>' +
      '<canvas id="cyber-mesh" class="cyber-mesh"></canvas>';

    document.body.insertBefore(wrap, document.body.firstChild);
    document.body.classList.add("has-site-fx");
  }

  /**
   * Cyber neural mesh — floating host nodes, proximity links,
   * data packets, scan pulses, mouse influence, interactive modes.
   */
  function initCyberMesh(canvas) {
    canvas = resolveMeshCanvas(canvas);
    if (!canvas || prefersReducedMotion) {
      if (canvas) canvas.style.display = "none";
      TVH.mesh = null;
      return null;
    }
    if (canvas.dataset.tvhMesh === "1") return TVH.mesh || null;
    canvas.dataset.tvhMesh = "1";

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      TVH.mesh = null;
      return null;
    }

    /* Black + red cyber mesh palette */
    const CYAN = [255, 42, 61];   /* primary red (legacy name) */
    const GREEN = [255, 107, 122]; /* soft red secondary */
    const AMBER = [212, 160, 84];
    const RED = [255, 31, 51];

    const PWN_LABELS = ["PWNED", "RCE", "SHELL", "0DAY", "ROOT"];

    let w = 0;
    let h = 0;
    let dpr = 1;
    let nodes = [];
    let packets = [];
    let pulses = [];
    let fragments = [];
    let raf = 0;
    let running = true;
    let lastT = 0;
    let spawnAcc = 0;
    let pulseAcc = 0;
    let fragAcc = 0;
    let scanY = -80;
    let mouse = { x: -9999, y: -9999, active: false };
    let breachUntil = 0;
    let calmUntil = 0;
    let breachTimer = 0;
    let calmTimer = 0;

    const glyphs = "0123456789abcdef{}[]<>/\\|#*$@";
    const tags = [
      "RCE",
      "XSS",
      "IDOR",
      "ATO",
      "SQLi",
      "0DAY",
      "CVE",
      "AUTH",
      "JWT",
      "SSRF",
    ];

    function now() {
      return performance.now();
    }

    function isBreach() {
      return now() < breachUntil;
    }

    function isCalm() {
      return now() < calmUntil;
    }

    function rgba(c, a) {
      return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    }

    function nodeCount() {
      const area = w * h;
      return Math.max(28, Math.min(72, Math.floor(area / 18000)));
    }

    function linkDist() {
      return Math.min(170, Math.max(110, Math.sqrt(w * h) * 0.09));
    }

    function makeNode() {
      const kind = Math.random();
      const role = kind > 0.92 ? 2 : kind > 0.7 ? 1 : 0;
      const color = role === 2 ? AMBER : role === 1 ? GREEN : CYAN;
      const label = role === 2 ? tags[Math.floor(Math.random() * tags.length)] : null;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: role === 2 ? 2.6 + Math.random() * 1.2 : 1.4 + Math.random() * 1.6,
        role,
        baseRole: role,
        color,
        baseColor: color,
        phase: Math.random() * Math.PI * 2,
        pulse: Math.random(),
        label,
        baseLabel: label,
        hex: Math.random() > 0.55 ? randomHex(2) : null,
        compromised: false,
        healAt: 0,
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = nodeCount();
      if (!nodes.length) {
        nodes = Array.from({ length: n }, makeNode);
      } else if (nodes.length < n) {
        while (nodes.length < n) nodes.push(makeNode());
      } else if (nodes.length > n + 8) {
        nodes.length = n;
      }
      for (const node of nodes) {
        node.x = Math.min(w - 8, Math.max(8, node.x));
        node.y = Math.min(h - 8, Math.max(8, node.y));
      }
    }

    function onPointer(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }

    function onLeave() {
      mouse.active = false;
    }

    function spawnPacket(a, b, color) {
      packets.push({
        a,
        b,
        t: 0,
        speed: 0.004 + Math.random() * 0.01,
        color:
          color ||
          (isBreach()
            ? Math.random() > 0.35
              ? RED
              : AMBER
            : Math.random() > 0.85
              ? RED
              : Math.random() > 0.45
                ? GREEN
                : CYAN),
        trail: [],
      });
      if (packets.length > 64) packets.splice(0, packets.length - 64);
    }

    function spawnPulse(node, opts) {
      const o = opts || {};
      pulses.push({
        x: node.x,
        y: node.y,
        r: 0,
        max: o.max || 50 + Math.random() * 90,
        color: o.color || (node.compromised ? RED : node.role === 2 ? AMBER : CYAN),
        life: 1,
      });
      if (pulses.length > 18) pulses.shift();
    }

    function spawnFragment(forceColor) {
      fragments.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.15 - Math.random() * 0.35,
        life: 1,
        decay: 0.003 + Math.random() * 0.004,
        text:
          Math.random() > 0.5
            ? "0x" + randomHex(4)
            : glyphs[Math.floor(Math.random() * glyphs.length)] +
              glyphs[Math.floor(Math.random() * glyphs.length)] +
              glyphs[Math.floor(Math.random() * glyphs.length)] +
              glyphs[Math.floor(Math.random() * glyphs.length)],
        color: forceColor || (isBreach() ? RED : Math.random() > 0.8 ? GREEN : CYAN),
      });
      if (fragments.length > 36) fragments.shift();
    }

    function nearestNeighbors(node, maxD) {
      const out = [];
      const maxD2 = maxD * maxD;
      for (const other of nodes) {
        if (other === node) continue;
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < maxD2) out.push(other);
      }
      return out;
    }

    function setBadgeBreach(on) {
      document.body.classList.toggle("mesh-breach", on);
      const badge = $(".session-badge");
      if (!badge) return;

      let textEl = badge.querySelector("[data-badge-text]");
      if (!textEl) {
        const texts = [];
        badge.childNodes.forEach((n) => {
          if (n.nodeType === 3 && n.textContent.trim()) texts.push(n);
        });
        textEl = document.createElement("span");
        textEl.setAttribute("data-badge-text", "1");
        textEl.textContent =
          texts.map((n) => n.textContent.trim()).join(" ") ||
          "SESSION ACTIVE · RESEARCH NODE";
        texts.forEach((n) => n.remove());
        badge.appendChild(textEl);
      }
      if (!textEl.dataset.default) {
        textEl.dataset.default = textEl.textContent.trim();
      }
      textEl.textContent = on
        ? "SESSION COMPROMISED · BREACH MODE"
        : textEl.dataset.default;
    }

    function healNode(n) {
      n.compromised = false;
      n.healAt = 0;
      n.role = n.baseRole;
      n.color = n.baseColor;
      n.label = n.baseLabel;
    }

    function compromiseNode(n) {
      if (!n || n.compromised) return false;
      n.compromised = true;
      n.healAt = now() + 4500 + Math.random() * 1500;
      n.role = 2;
      n.color = RED;
      n.label = PWN_LABELS[Math.floor(Math.random() * PWN_LABELS.length)];
      n.r = Math.max(n.r, 2.8);

      spawnPulse(n, { max: 90 + Math.random() * 70, color: RED });
      spawnPulse(n, { max: 40 + Math.random() * 30, color: AMBER });

      const neighbors = nearestNeighbors(n, linkDist() * 1.25);
      for (const other of neighbors) {
        spawnPacket(n, other, RED);
        if (Math.random() > 0.55) spawnPacket(other, n, AMBER);
      }
      // Extra storm along a few random edges
      for (let i = 0; i < 4; i++) {
        const t = nodes[Math.floor(Math.random() * nodes.length)];
        if (t && t !== n) spawnPacket(n, t, RED);
      }
      for (let i = 0; i < 3; i++) spawnFragment(RED);

      document.dispatchEvent(
        new CustomEvent("tvh:mesh-compromise", {
          detail: { x: n.x, y: n.y, label: n.label },
        })
      );
      return true;
    }

    function compromiseAt(x, y) {
      if (!nodes.length) return null;
      let best = null;
      let bestD = 30;
      for (const n of nodes) {
        const d = Math.hypot(n.x - x, n.y - y);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
      if (best && compromiseNode(best)) return best;
      return null;
    }

    function recon() {
      calmUntil = 0;
      // Center sweep
      pulses.push({
        x: w * 0.5,
        y: h * 0.4,
        r: 0,
        max: Math.max(w, h) * 0.55,
        color: CYAN,
        life: 1,
      });
      pulses.push({
        x: w * 0.5,
        y: h * 0.4,
        r: 0,
        max: Math.max(w, h) * 0.28,
        color: GREEN,
        life: 1,
      });

      const order = nodes.slice().sort(() => Math.random() - 0.5);
      const count = Math.min(12, order.length);
      for (let i = 0; i < count; i++) {
        const n = order[i];
        setTimeout(() => {
          if (!running) return;
          spawnPulse(n, {
            max: 60 + Math.random() * 50,
            color: i % 3 === 0 ? GREEN : CYAN,
          });
        }, i * 70);
      }

      // Packet fan-out
      const maxD = linkDist();
      let spawned = 0;
      for (let i = 0; i < nodes.length && spawned < 28; i++) {
        for (let j = i + 1; j < nodes.length && spawned < 28; j++) {
          const a = nodes[i];
          const b = nodes[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) < maxD) {
            spawnPacket(a, b, Math.random() > 0.5 ? GREEN : CYAN);
            spawned++;
          }
        }
      }
      for (let i = 0; i < 8; i++) spawnFragment(CYAN);

      document.dispatchEvent(new CustomEvent("tvh:mesh-recon"));
    }

    function breach(durationMs) {
      const ms = durationMs == null ? 8000 : durationMs;
      breachUntil = now() + ms;
      calmUntil = 0;
      setBadgeBreach(true);

      if (breachTimer) clearTimeout(breachTimer);
      breachTimer = setTimeout(() => {
        if (!isBreach()) setBadgeBreach(false);
      }, ms + 40);

      // Immediate chaos
      for (let i = 0; i < Math.min(10, nodes.length); i++) {
        const n = nodes[Math.floor(Math.random() * nodes.length)];
        spawnPulse(n, { max: 70 + Math.random() * 80, color: RED });
      }
      for (let i = 0; i < 20; i++) {
        const a = nodes[Math.floor(Math.random() * nodes.length)];
        const b = nodes[Math.floor(Math.random() * nodes.length)];
        if (a && b && a !== b) spawnPacket(a, b, Math.random() > 0.4 ? RED : AMBER);
      }
      // Compromise a couple of hot targets
      const hot = nodes.filter((n) => n.role >= 1 && !n.compromised);
      for (let i = 0; i < Math.min(2, hot.length); i++) {
        compromiseNode(hot[Math.floor(Math.random() * hot.length)]);
      }

      document.dispatchEvent(
        new CustomEvent("tvh:mesh-breach", { detail: { ms } })
      );
    }

    function calm(durationMs) {
      const ms = durationMs == null ? 2800 : durationMs;
      calmUntil = now() + ms;
      packets.length = 0;
      fragments.length = 0;
      // Softly end breach early
      if (isBreach()) {
        breachUntil = now();
        setBadgeBreach(false);
      }
      if (calmTimer) clearTimeout(calmTimer);
      calmTimer = setTimeout(() => {}, ms);

      document.dispatchEvent(
        new CustomEvent("tvh:mesh-calm", { detail: { ms } })
      );
    }

    function step(dt) {
      const maxDist = linkDist();
      const maxDist2 = maxDist * maxDist;
      const t = now();
      const breach = isBreach();
      const calmMode = isCalm();

      if (breachUntil && t >= breachUntil) {
        breachUntil = 0;
        setBadgeBreach(false);
      }

      for (const n of nodes) {
        if (n.compromised && t >= n.healAt) healNode(n);

        n.phase += dt * (breach ? 0.0035 : 0.002);
        n.pulse += dt * (breach ? 0.0025 : 0.0015);

        if (mouse.active) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 220 * 220 && d2 > 1) {
            const d = Math.sqrt(d2);
            const f = (1 - d / 220) * (breach ? 0.028 : 0.018);
            n.vx += (dx / d) * f;
            n.vy += (dy / d) * f;
          }
        }

        n.vx *= 0.992;
        n.vy *= 0.992;
        n.vx += Math.sin(n.phase * 0.7) * (breach ? 0.004 : 0.002);
        n.vy += Math.cos(n.phase * 0.55) * (breach ? 0.004 : 0.002);

        n.x += n.vx * dt * (breach ? 0.09 : 0.06);
        n.y += n.vy * dt * (breach ? 0.09 : 0.06);

        if (n.x < 10) {
          n.x = 10;
          n.vx *= -0.8;
        } else if (n.x > w - 10) {
          n.x = w - 10;
          n.vx *= -0.8;
        }
        if (n.y < 10) {
          n.y = 10;
          n.vy *= -0.8;
        } else if (n.y > h - 10) {
          n.y = h - 10;
          n.vy *= -0.8;
        }
      }

      const links = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxDist2) {
            const d = Math.sqrt(d2);
            links.push({ a, b, d, strength: 1 - d / maxDist });
          }
        }
      }

      spawnAcc += dt;
      const spawnEvery = calmMode ? 99999 : breach ? 70 : 180;
      if (spawnAcc > spawnEvery && links.length && !calmMode) {
        spawnAcc = 0;
        const bursts = breach ? 3 : 1;
        for (let b = 0; b < bursts; b++) {
          const pick = links[Math.floor(Math.random() * links.length)];
          if (pick) spawnPacket(pick.a, pick.b);
        }
      }

      pulseAcc += dt;
      const pulseEvery = calmMode ? 2800 : breach ? 500 : 1400;
      if (pulseAcc > pulseEvery) {
        pulseAcc = 0;
        const hot = nodes.filter((n) => n.role >= 1 || n.compromised);
        const pool = hot.length ? hot : nodes;
        const src = pool[Math.floor(Math.random() * pool.length)];
        if (src) spawnPulse(src);
      }

      fragAcc += dt;
      const fragEvery = calmMode ? 900 : breach ? 90 : 220;
      if (fragAcc > fragEvery) {
        fragAcc = 0;
        if (!calmMode && Math.random() > (breach ? 0.15 : 0.35)) {
          spawnFragment();
        }
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed * dt * (breach ? 1.35 : 1);
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        p.trail.push({ x, y });
        if (p.trail.length > 8) p.trail.shift();
        if (p.t >= 1) packets.splice(i, 1);
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.r += dt * (breach ? 0.11 : 0.08);
        p.life = 1 - p.r / p.max;
        if (p.life <= 0) pulses.splice(i, 1);
      }

      for (let i = fragments.length - 1; i >= 0; i--) {
        const f = fragments[i];
        f.x += f.vx * dt * 0.05;
        f.y += f.vy * dt * 0.05;
        f.life -= f.decay * dt;
        if (f.life <= 0) fragments.splice(i, 1);
      }

      scanY += dt * (breach ? 0.09 : 0.045);
      if (scanY > h + 40) scanY = -80;

      return links;
    }

    function draw(links) {
      ctx.clearRect(0, 0, w, h);
      const breach = isBreach();

      const g = ctx.createRadialGradient(
        w * 0.5,
        h * 0.28,
        40,
        w * 0.5,
        h * 0.45,
        Math.max(w, h) * 0.7
      );
      if (breach) {
        g.addColorStop(0, "rgba(255,31,51,0.06)");
        g.addColorStop(0.5, "rgba(212,160,84,0.025)");
        g.addColorStop(1, "rgba(10,9,11,0)");
      } else {
        g.addColorStop(0, "rgba(255,42,61,0.035)");
        g.addColorStop(1, "rgba(10,9,11,0)");
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Breach glitch bars
      if (breach && Math.random() > 0.86) {
        const gy = Math.random() * h;
        ctx.fillStyle = rgba(RED, 0.045 + Math.random() * 0.05);
        ctx.fillRect(0, gy, w, 1 + Math.random() * 3);
      }

      const beamColor = breach ? RED : CYAN;
      const beam = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      beam.addColorStop(0, rgba(beamColor, 0));
      beam.addColorStop(0.5, rgba(beamColor, breach ? 0.07 : 0.04));
      beam.addColorStop(1, rgba(beamColor, 0));
      ctx.fillStyle = beam;
      ctx.fillRect(0, scanY - 30, w, 60);

      for (const link of links) {
        const a = link.a;
        const b = link.b;
        let alpha = 0.04 + link.strength * 0.14;
        if (isCalm()) alpha *= 0.45;
        if (mouse.active) {
          const mx = (a.x + b.x) * 0.5;
          const my = (a.y + b.y) * 0.5;
          const md = Math.hypot(mouse.x - mx, mouse.y - my);
          if (md < 160) alpha += (1 - md / 160) * 0.16;
        }
        const hot =
          a.role === 2 || b.role === 2 || a.compromised || b.compromised;
        const hostile = a.compromised || b.compromised || breach;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = hostile
          ? rgba(a.compromised || b.compromised ? RED : AMBER, alpha * (breach ? 1.1 : 0.9))
          : hot
            ? rgba(AMBER, alpha * 0.9)
            : rgba(CYAN, alpha);
        ctx.lineWidth = hot || hostile ? 1.15 : 0.7 + link.strength * 0.6;
        ctx.stroke();
      }

      for (const p of pulses) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(p.color, 0.22 * p.life);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      for (const p of packets) {
        for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          const a = ((i + 1) / p.trail.length) * 0.45;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = rgba(p.color, a);
          ctx.fill();
        }
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.color, 0.9);
        ctx.shadowColor = rgba(p.color, 0.7);
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
      for (const f of fragments) {
        ctx.fillStyle = rgba(f.color, 0.12 + f.life * 0.28);
        ctx.fillText(f.text, f.x, f.y);
      }

      ctx.font = "9px 'JetBrains Mono', ui-monospace, monospace";
      for (const n of nodes) {
        const breathe = 0.55 + Math.sin(n.pulse * 3) * 0.45;
        let glow = n.compromised
          ? 0.75
          : n.role === 2
            ? 0.55
            : n.role === 1
              ? 0.35
              : 0.22;
        if (mouse.active) {
          const d = Math.hypot(mouse.x - n.x, mouse.y - n.y);
          if (d < 140) glow += (1 - d / 140) * 0.45;
        }

        const col = n.color;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (2.8 + breathe + (n.compromised ? 0.8 : 0)), 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, 0.05 + glow * 0.08);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, 0.45 + glow * 0.4);
        ctx.shadowColor = rgba(col, 0.6);
        ctx.shadowBlur = n.compromised || n.role === 2 ? 12 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (n.compromised || n.role === 2) {
          ctx.beginPath();
          ctx.arc(
            n.x,
            n.y,
            n.r + 3 + Math.sin(n.phase * 2) * 1.2,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = rgba(
            n.compromised ? RED : AMBER,
            0.25 + breathe * 0.2
          );
          ctx.lineWidth = 1;
          ctx.stroke();
          if (n.label) {
            ctx.fillStyle = rgba(
              n.compromised ? RED : AMBER,
              0.4 + breathe * 0.2
            );
            ctx.fillText(n.label, n.x + 8, n.y - 6);
          }
        } else if (n.hex && glow > 0.35) {
          ctx.fillStyle = rgba(CYAN, 0.18 + glow * 0.15);
          ctx.fillText(n.hex, n.x + 6, n.y - 4);
        }
      }

      if (mouse.active) {
        // Probe lines to nearest nodes
        const nearest = nodes
          .map((n) => ({ n, d: Math.hypot(mouse.x - n.x, mouse.y - n.y) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
          .filter((x) => x.d < 160);

        for (const { n, d } of nearest) {
          const a = 0.06 + (1 - d / 160) * 0.12;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.strokeStyle = rgba(breach ? RED : CYAN, a);
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 46, 0, Math.PI * 2);
        ctx.strokeStyle = breach
          ? "rgba(255,31,51,0.14)"
          : "rgba(255,42,61,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = breach
          ? "rgba(255,31,51,0.5)"
          : "rgba(255,42,61,0.4)";
        ctx.fill();

        if (nearest[0] && nearest[0].d < 120) {
          const ms = Math.round(8 + nearest[0].d * 0.12);
          ctx.font = "9px 'JetBrains Mono', ui-monospace, monospace";
          ctx.fillStyle = rgba(breach ? RED : CYAN, 0.35);
          ctx.fillText(ms + "ms", mouse.x + 10, mouse.y - 10);
        }
      }
    }

    function frame(ts) {
      if (!running) return;
      if (!lastT) lastT = ts;
      let dt = ts - lastT;
      lastT = ts;
      if (dt > 50) dt = 50;
      if (dt < 0) dt = 16;

      const links = step(dt);
      draw(links);
      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        lastT = 0;
      } else if (running) {
        lastT = 0;
        raf = requestAnimationFrame(frame);
      }
    }

    function onClick(e) {
      if (e.button != null && e.button !== 0) return;
      // Don't steal clicks from interactive UI
      if (
        e.target.closest(
          "a, button, input, textarea, select, label, summary, .term-window, .top-nav, .nav-link, .social-link, .htag, .cve-section, .contact-link, .service-card, .boot-overlay"
        )
      ) {
        return;
      }
      compromiseAt(e.clientX, e.clientY);
    }

    resize();
    for (let i = 0; i < 4; i++) {
      if (nodes[i] && nodes[i + 1]) spawnPacket(nodes[i], nodes[i + 1]);
    }
    if (nodes[0]) spawnPulse(nodes[0]);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick);
    raf = requestAnimationFrame(frame);

    const controller = {
      recon,
      breach,
      calm,
      compromiseAt,
      isBreach,
      isCalm,
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        if (breachTimer) clearTimeout(breachTimer);
        if (calmTimer) clearTimeout(calmTimer);
        setBadgeBreach(false);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
        document.removeEventListener("click", onClick);
        if (TVH.mesh === controller) TVH.mesh = null;
      },
    };

    TVH.mesh = controller;
    return controller;
  }

  /** @deprecated Use initCyberMesh — kept as alias for older callers. */
  function initHexRain(canvas) {
    return initCyberMesh(canvas);
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

  function elevateContent() {
    document.body.classList.add("has-site-fx");
  }

  function $$(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── HTTP request / response highlighting ─────────────── */
  const HTTP_METHODS =
    "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE|PRI";
  const RE_HTTP_METHOD = new RegExp("^(" + HTTP_METHODS + ")(\\s+)(\\S+)(?:(\\s+)(HTTP\\/[0-9.]+))?\\s*$", "i");
  const RE_HTTP_STATUS = /^(HTTP\/[0-9.]+)\s+(\d{3})(?:\s+(.*))?$/i;
  const RE_HTTP_HEADER =
    /^([A-Za-z0-9!#$%&'*+.^_`|~-]+)(\s*:\s*)(.*)$/;

  function detectHttpKind(text) {
    const first = String(text || "")
      .trim()
      .split(/\r?\n/, 1)[0]
      .trim();
    if (!first) return null;
    if (/^HTTP\/[0-9.]+/i.test(first)) return "response";
    if (new RegExp("^(" + HTTP_METHODS + ")\\s+\\S+", "i").test(first)) {
      return "request";
    }
    return null;
  }

  function highlightHttpBody(body) {
    if (!body) return "";
    const trimmed = body.trim();
    if (
      window.hljs &&
      (trimmed.startsWith("{") || trimmed.startsWith("["))
    ) {
      try {
        const lead = body.match(/^\s*/)?.[0] || "";
        const core = body.slice(lead.length);
        const result = window.hljs.highlight(core, {
          language: "json",
          ignoreIllegals: true,
        });
        return lead + result.value;
      } catch (_) {
        /* fall through */
      }
    }
    // Lightweight XML/HTML body hint
    if (trimmed.startsWith("<") && window.hljs) {
      try {
        const lead = body.match(/^\s*/)?.[0] || "";
        const core = body.slice(lead.length);
        const result = window.hljs.highlight(core, {
          language: "xml",
          ignoreIllegals: true,
        });
        return lead + result.value;
      } catch (_) {
        /* fall through */
      }
    }
    return escapeHtml(body);
  }

  function formatHttpStartLine(line, kind) {
    if (kind === "response") {
      const m = line.match(RE_HTTP_STATUS);
      if (m) {
        const code = m[2];
        const bucket = code[0];
        const cls =
          bucket === "1"
            ? "http-status-1xx"
            : bucket === "2"
              ? "http-status-2xx"
              : bucket === "3"
                ? "http-status-3xx"
                : bucket === "4"
                  ? "http-status-4xx"
                  : bucket === "5"
                    ? "http-status-5xx"
                    : "http-status";
        return (
          `<span class="http-version">${escapeHtml(m[1])}</span> ` +
          `<span class="http-status ${cls}">${escapeHtml(code)}</span>` +
          (m[3]
            ? ` <span class="http-reason">${escapeHtml(m[3])}</span>`
            : "")
        );
      }
    } else {
      const m = line.match(RE_HTTP_METHOD);
      if (m) {
        return (
          `<span class="http-method">${escapeHtml(m[1].toUpperCase())}</span>` +
          escapeHtml(m[2]) +
          `<span class="http-path">${escapeHtml(m[3])}</span>` +
          (m[5]
            ? escapeHtml(m[4]) +
              `<span class="http-version">${escapeHtml(m[5])}</span>`
            : "")
        );
      }
    }
    return escapeHtml(line);
  }

  function formatHttpHeader(line) {
    const m = line.match(RE_HTTP_HEADER);
    if (!m) return escapeHtml(line);
    const name = m[1];
    const sensitive = /^(authorization|cookie|set-cookie|x-api-key|proxy-authorization)$/i.test(
      name
    );
    return (
      `<span class="http-header-name">${escapeHtml(name)}</span>` +
      `<span class="http-colon">${escapeHtml(m[2])}</span>` +
      `<span class="http-header-value${
        sensitive ? " http-sensitive" : ""
      }">${escapeHtml(m[3])}</span>`
    );
  }

  function renderHttpBlock(text, kind) {
    let raw = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Trim a single leading/trailing newline from pretty-printed <pre> blocks
    if (raw.startsWith("\n")) raw = raw.slice(1);
    if (raw.endsWith("\n")) raw = raw.slice(0, -1);

    const splitAt = raw.search(/\n\n/);
    let head = raw;
    let body = null;
    if (splitAt !== -1) {
      head = raw.slice(0, splitAt);
      body = raw.slice(splitAt + 2);
    }

    const headLines = head.split("\n");
    const parts = [];

    if (headLines.length) {
      parts.push(
        `<span class="http-start">${formatHttpStartLine(
          headLines[0],
          kind
        )}</span>`
      );
      for (let i = 1; i < headLines.length; i++) {
        if (headLines[i] === "") continue;
        parts.push(
          `<span class="http-header">${formatHttpHeader(headLines[i])}</span>`
        );
      }
    }

    if (body != null) {
      parts.push(`<span class="http-gap"></span>`);
      if (body.length) {
        parts.push(
          `<span class="http-body">${highlightHttpBody(body)}</span>`
        );
      }
    }

    return parts.join("\n");
  }

  /**
   * Auto-detect HTTP request/response code blocks (even when marked
   * language-text) and apply security-research-friendly highlighting.
   */
  function enhanceHttpHighlighting() {
    const blocks = $$("pre code");
    for (const block of blocks) {
      if (block.dataset.tvhHttp === "1") continue;

      const text = block.textContent;
      const forced =
        /\blanguage-http\b/i.test(block.className) ||
        /\bhttp\b/i.test(block.getAttribute("data-language") || "");
      const kind = detectHttpKind(text) || (forced ? "request" : null);
      if (!kind) continue;

      // Skip false positives: request line must look like method + target
      if (!forced && kind === "request") {
        const first = text.trim().split(/\r?\n/, 1)[0];
        if (!new RegExp("^(" + HTTP_METHODS + ")\\s+\\S+", "i").test(first)) {
          continue;
        }
      }

      block.dataset.tvhHttp = "1";
      block.dataset.httpKind = kind;
      block.classList.add("language-http", "hljs", "http-highlighted");
      block.classList.remove(
        "language-text",
        "language-plaintext",
        "language-txt"
      );
      block.innerHTML = renderHttpBlock(text, kind);
    }
  }

  function initHttpHighlighting() {
    // hljs often runs via a sync script just before deferred site.js.
    // Run now, then once more on next frame / short delay to catch late paint.
    enhanceHttpHighlighting();
    requestAnimationFrame(() => enhanceHttpHighlighting());
    setTimeout(enhanceHttpHighlighting, 120);
  }

  function init(options) {
    const raw = options || {};
    const opts = Object.assign(
      {
        atmosphere: true,
        cyberMesh: true,
        clock: true,
        monoFont: true,
        httpHighlight: true,
      },
      raw
    );

    if (raw.hexRain !== undefined && raw.cyberMesh === undefined) {
      opts.cyberMesh = raw.hexRain;
    }

    if (opts.monoFont) ensureMonoFont();
    if (opts.atmosphere) injectAtmosphere();
    elevateContent();
    if (opts.cyberMesh) initCyberMesh();
    if (opts.clock) initClock();
    if (opts.httpHighlight) initHttpHighlighting();

    document.dispatchEvent(new CustomEvent("tvh:ready", { detail: TVH }));
    return TVH;
  }

  const TVH = {
    version: "1.3.0",
    prefersReducedMotion,
    mesh: null,
    assetBase,
    injectAtmosphere,
    initCyberMesh,
    initHexRain,
    initClock,
    enhanceHttpHighlighting,
    initHttpHighlighting,
    init,
    $,
    sleep(ms) {
      return new Promise((r) =>
        setTimeout(r, prefersReducedMotion ? 0 : ms)
      );
    },
    escapeHtml,
  };

  global.TVH = TVH;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
