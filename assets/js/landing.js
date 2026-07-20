/**
 * Landing page simulations — boot sequence, terminal, recon HUD.
 * Atmosphere / cyber mesh: assets/js/site.js (global).
 * Purely cosmetic; no real scanning or network activity.
 */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pageStart = Date.now();

  /* ── helpers ─────────────────────────────────────────── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, prefersReducedMotion ? 0 : ms));

  function randomHex(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  /* ── clock + uptime ──────────────────────────────────── */
  function tickClock() {
    const el = $("#nav-clock");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toISOString().replace("T", " ").slice(0, 19) + "Z";
  }

  function tickUptime() {
    const el = $("#uptime");
    if (!el) return;
    const sec = Math.floor((Date.now() - pageStart) / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    el.textContent = `uptime: ${h}:${m}:${s}`;
  }

  /* ── boot overlay · cyber ops dashboard ──────────────── */
  let bootMapController = null;
  let bootClockTimer = 0;

  function finishBoot(overlay) {
    if (!overlay) return;
    overlay.classList.remove("boot-visible");
    overlay.classList.add("boot-done");
    overlay.setAttribute("aria-hidden", "true");
    const log = $("#boot-log");
    if (log) log.textContent = "";
    if (bootMapController) {
      bootMapController.stop();
      bootMapController = null;
    }
    if (bootClockTimer) {
      clearInterval(bootClockTimer);
      bootClockTimer = 0;
    }
  }

  function setBootProgress(pct, label) {
    const bar = $("#boot-progress");
    const pctEl = $("#boot-progress-pct");
    const labelEl = $("#boot-progress-label");
    const phase = $("#boot-op-phase");
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (bar) bar.style.width = clamped + "%";
    if (pctEl) pctEl.textContent = clamped + "%";
    if (labelEl && label) labelEl.textContent = label;
    if (phase) {
      if (clamped < 20) phase.textContent = "PHASE 1 · BOOT";
      else if (clamped < 45) phase.textContent = "PHASE 2 · SENSOR GRID";
      else if (clamped < 70) phase.textContent = "PHASE 3 · TRAFFIC MAP";
      else if (clamped < 92) phase.textContent = "PHASE 4 · RECON LINK";
      else phase.textContent = "PHASE 5 · HANDSHAKE";
    }
  }

  function appendBootLine(log, text, cls) {
    const span = document.createElement("div");
    span.className = "boot-line " + (cls || "");
    span.textContent = text;
    log.appendChild(span);
    log.scrollTop = log.scrollHeight;
    return span;
  }

  async function typeBootLine(log, text, cls, charDelay) {
    const span = document.createElement("div");
    span.className = "boot-line " + (cls || "");
    log.appendChild(span);
    const cursor = document.createElement("span");
    cursor.className = "boot-cursor";
    cursor.setAttribute("aria-hidden", "true");
    for (let i = 0; i < text.length; i++) {
      span.textContent = text.slice(0, i + 1);
      if (!cursor.isConnected) span.appendChild(cursor);
      log.scrollTop = log.scrollHeight;
      await sleep(charDelay + Math.random() * 12);
    }
    cursor.remove();
    span.textContent = text;
    log.scrollTop = log.scrollHeight;
    return span;
  }

  /**
   * Simulated global traffic / attack-surface map (cosmetic only).
   * Nodes = cities; arcs = packet routes; pulses = alerts.
   */
  function initBootMap(canvas) {
    if (!canvas || prefersReducedMotion) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // [name, lon, lat] — rough equirectangular anchors
    const CITIES = [
      ["NYC", -74.0, 40.7],
      ["LON", -0.1, 51.5],
      ["PAR", 2.3, 48.9],
      ["FRA", 8.7, 50.1],
      ["DXB", 55.3, 25.2],
      ["BOM", 72.9, 19.1],
      ["DEL", 77.2, 28.6],
      ["SGP", 103.8, 1.3],
      ["TYO", 139.7, 35.7],
      ["SYD", 151.2, -33.9],
      ["SFO", -122.4, 37.8],
      ["SAO", -46.6, -23.5],
      ["JNB", 28.0, -26.2],
      ["MOS", 37.6, 55.8],
      ["SEL", 126.9, 37.5],
      ["HKG", 114.2, 22.3],
    ];

    const RED = [255, 42, 61];
    const SOFT = [255, 107, 122];
    const AMBER = [212, 160, 84];

    let w = 0;
    let h = 0;
    let dpr = 1;
    let nodes = [];
    let arcs = [];
    let packets = [];
    let blips = [];
    let raf = 0;
    let running = true;
    let lastT = 0;
    let intensity = 0.35;
    let spawnAcc = 0;
    let pktRate = 0;
    let alertCount = 0;
    let activeRoute = "—";

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    function rgba(c, a) {
      return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    }

    function project(lon, lat) {
      const x = ((lon + 180) / 360) * w;
      // slight vertical padding so poles aren't clipped
      const y = ((90 - lat) / 180) * h * 0.86 + h * 0.07;
      return { x, y };
    }

    function resize() {
      const rect = canvas.parentElement
        ? canvas.parentElement.getBoundingClientRect()
        : canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = CITIES.map(([name, lon, lat]) => {
        const p = project(lon, lat);
        return {
          name,
          lon,
          lat,
          x: p.x,
          y: p.y,
          phase: Math.random() * Math.PI * 2,
          hot: Math.random() > 0.72,
        };
      });

      arcs = [];
      for (let i = 0; i < 18; i++) {
        const a = nodes[Math.floor(Math.random() * nodes.length)];
        let b = nodes[Math.floor(Math.random() * nodes.length)];
        if (a === b) b = nodes[(nodes.indexOf(a) + 3) % nodes.length];
        arcs.push({ a, b, hostile: Math.random() > 0.55 });
      }
    }

    function spawnPacket() {
      if (!arcs.length) return;
      const link = arcs[Math.floor(Math.random() * arcs.length)];
      const hostile = link.hostile || Math.random() > 0.6;
      packets.push({
        a: link.a,
        b: link.b,
        t: 0,
        speed: 0.0035 + Math.random() * 0.008 * (0.6 + intensity),
        hostile,
        color: hostile ? RED : Math.random() > 0.5 ? SOFT : AMBER,
      });
      if (packets.length > 48) packets.splice(0, packets.length - 48);
      activeRoute = link.a.name + " → " + link.b.name;
      if (hostile && Math.random() > 0.55) {
        alertCount++;
        blips.push({
          x: link.b.x,
          y: link.b.y,
          r: 0,
          max: 18 + Math.random() * 28,
          life: 1,
          color: RED,
        });
      }
    }

    function setIntensity(v) {
      intensity = Math.max(0.15, Math.min(1.4, v));
    }

    function step(dt) {
      spawnAcc += dt;
      const every = Math.max(40, 220 - intensity * 140);
      if (spawnAcc > every) {
        spawnAcc = 0;
        const burst = intensity > 0.9 ? 3 : intensity > 0.55 ? 2 : 1;
        for (let i = 0; i < burst; i++) spawnPacket();
      }

      pktRate = Math.round(packets.length * 7 + intensity * 40 + Math.random() * 12);

      for (const n of nodes) {
        n.phase += dt * 0.0025;
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed * dt;
        if (p.t >= 1) packets.splice(i, 1);
      }

      for (let i = blips.length - 1; i >= 0; i--) {
        const b = blips[i];
        b.r += dt * 0.09;
        b.life = 1 - b.r / b.max;
        if (b.life <= 0) blips.splice(i, 1);
      }

      setText("boot-stat-pkt", String(pktRate));
      setText("boot-stat-nodes", String(nodes.length));
      setText("boot-stat-alerts", String(alertCount));
      setText("boot-stat-route", activeRoute);
      setText(
        "boot-map-meta",
        intensity > 1
          ? "hostile corridors elevated"
          : intensity > 0.7
            ? "correlating global routes"
            : "passive sensor sweep"
      );
    }

    function drawContinentHints() {
      // Soft world silhouette via faint meridians / latitudes (not a real geo map)
      ctx.save();
      ctx.strokeStyle = "rgba(255,42,61,0.06)";
      ctx.lineWidth = 1;
      for (let lon = -150; lon <= 150; lon += 30) {
        const a = project(lon, 75);
        const b = project(lon, -75);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const a = project(-170, lat);
        const b = project(170, lat);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // equator emphasis
      const e0 = project(-170, 0);
      const e1 = project(170, 0);
      ctx.strokeStyle = "rgba(255,42,61,0.1)";
      ctx.beginPath();
      ctx.moveTo(e0.x, e0.y);
      ctx.lineTo(e1.x, e1.y);
      ctx.stroke();
      ctx.restore();
    }

    function drawArc(a, b, color, alpha, width) {
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5 - Math.hypot(b.x - a.x, b.y - a.y) * 0.22;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = width;
      ctx.stroke();
      return { mx, my };
    }

    function pointOnArc(a, b, t) {
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5 - Math.hypot(b.x - a.x, b.y - a.y) * 0.22;
      const u = 1 - t;
      return {
        x: u * u * a.x + 2 * u * t * mx + t * t * b.x,
        y: u * u * a.y + 2 * u * t * my + t * t * b.y,
      };
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // vignette fill already from CSS; soft core glow
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.55);
      g.addColorStop(0, "rgba(255,42,61," + (0.03 + intensity * 0.03) + ")");
      g.addColorStop(1, "rgba(5,4,6,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      drawContinentHints();

      for (const link of arcs) {
        drawArc(
          link.a,
          link.b,
          link.hostile ? RED : SOFT,
          0.05 + intensity * 0.06,
          link.hostile ? 1.1 : 0.7
        );
      }

      for (const p of packets) {
        const pos = pointOnArc(p.a, p.b, p.t);
        // trail
        for (let k = 1; k <= 4; k++) {
          const tt = Math.max(0, p.t - k * 0.03);
          const tp = pointOnArc(p.a, p.b, tt);
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = rgba(p.color, 0.12 * (1 - k / 5));
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.hostile ? 2.6 : 2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.color, 0.95);
        ctx.shadowColor = rgba(p.color, 0.8);
        ctx.shadowBlur = p.hostile ? 12 : 7;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      for (const b of blips) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(b.color, 0.35 * b.life);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.font = "9px 'JetBrains Mono', ui-monospace, monospace";
      for (const n of nodes) {
        const breathe = 0.55 + Math.sin(n.phase) * 0.45;
        const col = n.hot ? RED : SOFT;
        const r = n.hot ? 2.6 : 1.8;

        ctx.beginPath();
        ctx.arc(n.x, n.y, r * (2.2 + breathe), 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, 0.06 + intensity * 0.05);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, 0.55 + breathe * 0.35);
        ctx.shadowColor = rgba(col, 0.7);
        ctx.shadowBlur = n.hot ? 10 : 5;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (n.hot || intensity > 0.75) {
          ctx.fillStyle = rgba(col, 0.35 + breathe * 0.2);
          ctx.fillText(n.name, n.x + 6, n.y - 5);
        }
      }
    }

    function frame(ts) {
      if (!running) return;
      if (!lastT) lastT = ts;
      let dt = ts - lastT;
      lastT = ts;
      if (dt > 50) dt = 50;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }

    resize();
    for (let i = 0; i < 6; i++) spawnPacket();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return {
      setIntensity,
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
      },
    };
  }

  async function runBoot() {
    const overlay = $("#boot-overlay");
    const log = $("#boot-log");
    if (!overlay || !log) return;

    if (sessionStorage.getItem("tvh_booted") || prefersReducedMotion) {
      finishBoot(overlay);
      return;
    }

    // Keep the whole boot experience under ~3s, then hand off to home.
    const ops = [
      { t: "TVH RESEARCH NODE · SECURE BOOT", c: "accent", type: false, wait: 90 },
      { t: "[*] crypto vault · netfilter · curiosity.ko .... OK", c: "ok", type: false, wait: 120, map: 0.55 },
      { t: "[*] sensor mesh · NYC LON FRA TYO SGP BOM ..... UP", c: "ok", type: false, wait: 140, map: 0.8 },
      { t: "[*] mapping global traffic corridors ......... LIVE", c: "hl", type: false, wait: 150, map: 1.05 },
      { t: "[!] caffeine-injector .................... CRITICAL", c: "warn", type: false, wait: 130, map: 1.15 },
      { t: "[+] threat matrix warm · recon-daemon ACTIVE", c: "ok", type: false, wait: 140, map: 1.25 },
      { t: "[✓] handshake complete. welcome, operator.", c: "accent", type: true, wait: 180, map: 1.3 },
    ];

    overlay.classList.remove("boot-done");
    overlay.classList.add("boot-visible");
    overlay.setAttribute("aria-hidden", "false");
    setBootProgress(4, "powering research node…");

    const clockEl = $("#boot-op-clock");
    const tickBootClock = () => {
      if (clockEl) {
        clockEl.textContent =
          new Date().toISOString().replace("T", " ").slice(11, 19) + "Z";
      }
    };
    tickBootClock();
    bootClockTimer = setInterval(tickBootClock, 1000);

    // Map starts after first paint so canvas has layout size
    await sleep(40);
    bootMapController = initBootMap($("#boot-map"));

    const total = ops.length;
    for (let i = 0; i < total; i++) {
      const step = ops[i];
      const pct = 8 + ((i + 1) / total) * 86;
      setBootProgress(
        pct,
        i < 2
          ? "secure boot…"
          : i < 4
            ? "mapping traffic…"
            : "handing off to shell…"
      );

      if (step.map != null && bootMapController) {
        bootMapController.setIntensity(step.map);
      }

      if (!step.t) {
        appendBootLine(log, " ", "dim");
      } else if (step.type) {
        // Fast typewriter only on the final line
        await typeBootLine(log, step.t, step.c, 8);
      } else {
        appendBootLine(log, step.t, step.c);
      }

      await sleep(step.wait != null ? step.wait : 100);
    }

    setBootProgress(100, "node online · entering shell");
    if (bootMapController) bootMapController.setIntensity(1.35);
    // Hold the ops dashboard briefly so the map/console can read, then home
    await sleep(280 + 1500);

    finishBoot(overlay);
    sessionStorage.setItem("tvh_booted", "1");
  }

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

  /* ── interactive terminal ────────────────────────────── */
  function meshApi() {
    return (window.TVH && window.TVH.mesh) || null;
  }

  function initTerminal() {
    const output = $("#term-output");
    const input = $("#term-input");
    const body = $("#term-body");
    if (!output || !input) return;

    const print = (html, cls = "") => {
      const line = document.createElement("div");
      line.className = "term-line " + cls;
      line.innerHTML = html;
      output.appendChild(line);
      body.scrollTop = body.scrollHeight;
    };

    const banner = () => {
      print(`<span class="t-dim">thevillagehacker lab shell v1.4.0</span>`);
      print(`<span class="t-dim">type <span class="t-accent">help</span> for available commands</span>`);
      print(`<span class="t-dim">mesh live — try <span class="t-accent">recon</span> · <span class="t-accent">breach</span> · click a node</span>`);
      print("");
    };

    const commands = {
      help() {
        print(`<span class="t-accent">available commands</span>`);
        print(`  <span class="t-ok">whoami</span>     — operator identity`);
        print(`  <span class="t-ok">id</span>         — research profile`);
        print(`  <span class="t-ok">ls</span>         — list research paths`);
        print(`  <span class="t-ok">recon</span>      — surface scan + mesh pulse`);
        print(`  <span class="t-ok">breach</span>     — hostile mesh mode (~8s)`);
        print(`  <span class="t-ok">skills</span>     — focus areas`);
        print(`  <span class="t-ok">writeups</span>   — CTF writeups (GitBook)`);
        print(`  <span class="t-ok">blog</span>       — research log (soon)`);
        print(`  <span class="t-ok">contact</span>    — reach the operator`);
        print(`  <span class="t-ok">github</span>     — open GitHub profile`);
        print(`  <span class="t-ok">neofetch</span>   — system card`);
        print(`  <span class="t-ok">clear</span>      — clear terminal + calm mesh`);
        print(`  <span class="t-ok">sudo</span>       — you know what this does`);
      },
      whoami() {
        print(`naveen · thevillagehacker`);
        print(`<span class="t-dim">uid=1337(researcher) gid=0(root) groups=offensive,appsec,caffeine</span>`);
      },
      id() {
        print(`name:     Naveen Jagadeesan`);
        print(`role:     Security Researcher`);
        print(`focus:    vulnerability research · exploit analysis`);
        print(`org:      Societe Generale (Security Analyst)`);
        print(`handle:   @thevillagehackr`);
      },
      ls() {
        print(`drwxr-xr-x  writeups/`);
        print(`-rw-r--r--  identity.txt`);
        print(`-rwxr-xr-x  recon.sh`);
        print(`-rwxr-xr-x  breach.sh`);
        print(`-rw-------  secrets.enc  <span class="t-dim"># redacted</span>`);
      },
      async recon() {
        print(`<span class="t-dim">[*] starting passive recon simulation...</span>`);
        const mesh = meshApi();
        if (mesh) mesh.recon();
        const steps = [
          "enumerating subdomains",
          "fingerprinting stack",
          "mapping auth flows",
          "probing input sinks",
          "correlating findings",
        ];
        for (const s of steps) {
          await sleep(280);
          print(`<span class="t-ok">[+]</span> ${s} <span class="t-dim">0x${randomHex(6)}</span>`);
        }
        print(`<span class="t-accent">[✓]</span> surface map updated · mesh refreshed`);
      },
      async breach() {
        print(`<span class="t-err">[!] injecting hostile traffic into attack-surface map...</span>`);
        const mesh = meshApi();
        if (mesh) mesh.breach(8000);
        await sleep(200);
        print(`<span class="t-warn">[*] session chrome → COMPROMISED</span>`);
        print(`<span class="t-warn">[*] packet density ↑ · glitch channels open</span>`);
        await sleep(350);
        print(`<span class="t-dim">breach window ~8s · type <span class="t-accent">clear</span> to force calm</span>`);
      },
      skills() {
        print(`vulnerability research · security analysis · offensive security · consultancy`);
      },
      writeups() {
        print(`opening <span class="t-accent">CTF Writeups</span> on GitBook...`);
        setTimeout(
          () => window.open("https://thevillagehacker-security.gitbook.io/ctf-writeups", "_blank"),
          400
        );
      },
      blog() {
        print(`opening <span class="t-accent">research log</span>…`);
        print(`<span class="t-dim">status: coming soon · drafts staged</span>`);
        setTimeout(() => { window.location.href = "/blog.html"; }, 350);
      },
      contact() {
        print(`LinkedIn  → <span class="t-accent">https://linkedin.com/in/thevillagehacker</span>`);
        print(`GitHub    → <span class="t-accent">https://github.com/thevillagehacker</span>`);
        print(`X         → <span class="t-accent">https://x.com/thevillagehackr</span>`);
      },
      github() {
        print(`opening <span class="t-accent">GitHub</span>…`);
        setTimeout(
          () => window.open("https://github.com/thevillagehacker", "_blank"),
          350
        );
      },
      neofetch() {
        const status = meshApi() && meshApi().isBreach && meshApi().isBreach()
          ? `<span class="t-err">BREACH</span>`
          : `<span class="t-ok">online</span>`;
        print(`<span class="t-accent">       ___</span>  thevillagehacker`);
        print(`<span class="t-accent">   .─´   \`─.</span>  -------------`);
        print(`<span class="t-accent">  /  lab   \\</span> OS: Research Node`);
        print(`<span class="t-accent"> |  ○   ○  |</span> Shell: zsh + caffeine`);
        print(`<span class="t-accent">  \\   ▽   /</span>  Focus: vuln research`);
        print(`<span class="t-accent">   \`─────´</span>   Status: ${status}`);
      },
      clear() {
        output.innerHTML = "";
        const mesh = meshApi();
        if (mesh) mesh.calm(2800);
      },
      sudo() {
        print(`<span class="t-warn">[sudo] password for naveen:</span> ********`);
        print(`<span class="t-dim">nice try. privilege already assumed in research mode.</span>`);
      },
      exit() {
        print(`logout`);
        print(`<span class="t-dim">connection closed — refreshing session...</span>`);
      },
    };

    banner();

    const history = [];
    let histIdx = -1;

    input.addEventListener("keydown", async (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!history.length) return;
        histIdx = Math.max(0, histIdx < 0 ? history.length - 1 : histIdx - 1);
        input.value = history[histIdx];
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (histIdx < 0) return;
        histIdx++;
        if (histIdx >= history.length) {
          histIdx = -1;
          input.value = "";
        } else input.value = history[histIdx];
        return;
      }
      if (e.key !== "Enter") return;

      const raw = input.value.trim();
      print(
        `<span class="term-echo"><span class="ps1-user">naveen</span>@lab:~$ ${escapeHtml(raw)}</span>`
      );
      input.value = "";
      histIdx = -1;
      if (!raw) return;
      history.push(raw);

      const [cmd, ...args] = raw.split(/\s+/);
      const key = cmd.toLowerCase();
      const fn = commands[key];
      if (fn) {
        await fn(args);
      } else {
        print(`<span class="t-err">command not found:</span> ${escapeHtml(cmd)}`);
        print(`<span class="t-dim">type help for the command list</span>`);
      }
    });

    body.addEventListener("click", () => input.focus());
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── live CVE feed (NVD API 2.0, client-side) ─────────── */
  const CVE_CACHE_KEY = "tvh_nvd_cves_v3";
  const CVE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — be kind to NVD rate limits
  const CVE_LIMIT = 6;
  const CVE_FETCH_PAGE = 40; // pull a wider tail; newest rows often lack CVSS yet

  function nvdTimestamp(date) {
    // NVD expects ISO-8601 with milliseconds, e.g. 2024-01-01T00:00:00.000
    return date.toISOString().replace("Z", "");
  }

  function readCveCache() {
    try {
      const raw = sessionStorage.getItem(CVE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || !Array.isArray(parsed.items)) return null;
      if (Date.now() - parsed.ts > CVE_CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeCveCache(items, sourceLabel) {
    try {
      sessionStorage.setItem(
        CVE_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), items, sourceLabel })
      );
    } catch {
      /* private mode / quota — ignore */
    }
  }

  function clearCveCache() {
    try {
      sessionStorage.removeItem(CVE_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }

  function showCveSkeletons(grid) {
    if (!grid) return;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = Array.from({ length: CVE_LIMIT }, () =>
      `<div class="cve-card cve-skeleton" aria-hidden="true"></div>`
    ).join("");
  }

  function asMetricList(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function metricVersionRank(key) {
    // Prefer v3.1 (common NVD primary), then v3.0, v4.0, v2.
    if (key === "cvssMetricV31") return 0;
    if (key === "cvssMetricV30") return 1;
    if (key === "cvssMetricV40") return 2;
    if (key === "cvssMetricV2") return 3;
    return 9;
  }

  /**
   * Read CVSS score/severity from NVD metrics.
   * NVD may attach multiple metric families (v4.0 / v3.1 / …) and Primary/Secondary
   * sources. Pick the best available entry rather than only the first key found.
   */
  function extractCvss(metrics) {
    if (!metrics || typeof metrics !== "object") return null;

    const keys = [
      "cvssMetricV31",
      "cvssMetricV30",
      "cvssMetricV40",
      "cvssMetricV2",
    ];
    const candidates = [];

    for (const key of keys) {
      for (const metric of asMetricList(metrics[key])) {
        if (!metric || typeof metric !== "object") continue;
        const data = metric.cvssData || {};
        const rawScore =
          data.baseScore != null
            ? data.baseScore
            : metric.baseScore != null
              ? metric.baseScore
              : null;
        const score =
          typeof rawScore === "number" ? rawScore : parseFloat(rawScore);
        let severity =
          data.baseSeverity ||
          metric.baseSeverity ||
          data.severity ||
          metric.severity ||
          "";
        if (!severity && Number.isFinite(score)) severity = scoreToSeverity(score);
        if (!Number.isFinite(score) && !severity) continue;

        const type = String(metric.type || "");
        const source = String(metric.source || "");
        // Prefer NVD Primary, then any Primary, then everything else.
        let typeRank = 2;
        if (type === "Primary" && /nvd\.nist\.gov|nvd@nist\.gov/i.test(source)) {
          typeRank = 0;
        } else if (type === "Primary") {
          typeRank = 1;
        }

        candidates.push({
          score: Number.isFinite(score) ? score : null,
          severity: String(severity || "UNKNOWN").toUpperCase(),
          version: data.version || key.replace("cvssMetric", ""),
          rank: typeRank * 10 + metricVersionRank(key),
        });
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.rank - b.rank);
    return candidates[0];
  }

  function scoreToSeverity(score) {
    if (score >= 9) return "CRITICAL";
    if (score >= 7) return "HIGH";
    if (score >= 4) return "MEDIUM";
    if (score > 0) return "LOW";
    return "NONE";
  }

  function hasScoredSeverity(item) {
    if (!item) return false;
    if (item.score != null && Number.isFinite(item.score)) return true;
    const sev = String(item.severity || "").toUpperCase();
    return Boolean(sev) && sev !== "UNKNOWN" && sev !== "PENDING" && sev !== "NONE";
  }

  function severityClass(sev) {
    const s = (sev || "").toUpperCase();
    if (s === "CRITICAL") return "crit";
    if (s === "HIGH") return "high";
    if (s === "MEDIUM" || s === "MODERATE") return "med";
    if (s === "LOW") return "low";
    return "unk";
  }

  function publishedTime(item) {
    return Date.parse((item && (item.published || item.modified)) || 0) || 0;
  }

  /** Newest first; among same-ish recency, scored entries win. */
  function pickLatestCves(items, limit) {
    const sorted = items.slice().sort((a, b) => publishedTime(b) - publishedTime(a));
    const scored = sorted.filter(hasScoredSeverity);
    const pending = sorted.filter((item) => !hasScoredSeverity(item));
    // Newest publications often have empty metrics until NVD finishes analysis.
    // Prefer recent scored CVEs so severity from the response is visible in the UI.
    const picked = scored.concat(pending).slice(0, limit);
    return picked;
  }

  /** Best-effort score/severity from a CVSS vector string (CIRCL/OSV style). */
  function parseCvssVector(vector) {
    const raw = String(vector || "").trim();
    if (!raw) return null;
    // Rare: numeric score only
    if (/^\d+(\.\d+)?$/.test(raw)) {
      const score = parseFloat(raw);
      return Number.isFinite(score)
        ? { score, severity: scoreToSeverity(score) }
        : null;
    }
    if (/CRITICAL|HIGH|MEDIUM|LOW/i.test(raw) && !raw.includes("/")) {
      return {
        score: null,
        severity: raw.match(/CRITICAL|HIGH|MEDIUM|LOW/i)[0].toUpperCase(),
      };
    }

    // CVSS:3.x impact → rough severity when baseScore is not provided
    if (/CVSS:3/i.test(raw)) {
      const parts = {};
      raw.split("/").forEach((token) => {
        const [k, v] = token.split(":");
        if (k && v) parts[k.toUpperCase()] = v.toUpperCase();
      });
      // Minimal CVSS 3.1 base-score approximation via official formula subset
      const score = approximateCvss31(parts);
      if (score != null) {
        return { score, severity: scoreToSeverity(score) };
      }
    }

    // CVSS:4.0 — use impact letters for a coarse band when score absent
    if (/CVSS:4/i.test(raw)) {
      const highs = (raw.match(/:[H]\b/g) || []).length;
      if (highs >= 3) return { score: null, severity: "CRITICAL" };
      if (highs >= 2) return { score: null, severity: "HIGH" };
      if (highs >= 1) return { score: null, severity: "MEDIUM" };
      return { score: null, severity: "LOW" };
    }

    return null;
  }

  function approximateCvss31(p) {
    // Values from CVSS 3.1 spec (rounded). Enough for UI banding.
    const AV = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }[p.AV];
    const AC = { L: 0.77, H: 0.44 }[p.AC];
    const PR_U = { N: 0.85, L: 0.62, H: 0.27 }[p.PR];
    const PR_C = { N: 0.85, L: 0.68, H: 0.5 }[p.PR];
    const UI = { N: 0.85, R: 0.62 }[p.UI];
    const impact = { N: 0, L: 0.22, H: 0.56 };
    const C = impact[p.C];
    const I = impact[p.I];
    const A = impact[p.A];
    if ([AV, AC, UI, C, I, A].some((v) => v == null)) return null;
    const scopeChanged = p.S === "C";
    const PR = (scopeChanged ? PR_C : PR_U);
    if (PR == null) return null;

    const iss = 1 - (1 - C) * (1 - I) * (1 - A);
    let impactScore;
    if (scopeChanged) {
      impactScore = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    } else {
      impactScore = 6.42 * iss;
    }
    if (impactScore <= 0) return 0;

    const exploitability = 8.22 * AV * AC * PR * UI;
    let base;
    if (scopeChanged) {
      base = Math.min(1.08 * (impactScore + exploitability), 10);
    } else {
      base = Math.min(impactScore + exploitability, 10);
    }
    // CVSS round-up to 1 decimal
    return Math.ceil(base * 10) / 10;
  }

  function englishDescription(descriptions) {
    if (!Array.isArray(descriptions)) return "No description available.";
    const en = descriptions.find((d) => d.lang === "en") || descriptions[0];
    return (en && en.value) || "No description available.";
  }

  function truncate(text, max) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (t.length <= max) return t;
    return t.slice(0, max - 1).trimEnd() + "…";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toISOString().slice(0, 10);
  }

  function normalizeNvdItems(payload) {
    const vulns = (payload && payload.vulnerabilities) || [];
    return vulns
      .map((row) => {
        const cve = row && row.cve;
        if (!cve || !cve.id) return null;
        const cvss = extractCvss(cve.metrics);
        return {
          id: cve.id,
          published: cve.published,
          modified: cve.lastModified,
          status: cve.vulnStatus || "",
          summary: truncate(englishDescription(cve.descriptions), 180),
          score: cvss ? cvss.score : null,
          // Brand-new NVD rows often ship before CVSS analysis is attached.
          severity: cvss ? cvss.severity : "PENDING",
          url: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve.id)}`,
        };
      })
      .filter(Boolean);
  }

  async function fetchNvdJson(params) {
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?${params}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`NVD HTTP ${res.status}`);
    return res.json();
  }

  async function fetchRecentFromNvd() {
    const end = new Date();
    // Short window so the tail of the page is truly the latest publications.
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const windowParams = {
      pubStartDate: nvdTimestamp(start),
      pubEndDate: nvdTimestamp(end),
    };

    // NVD returns chronological order oldest-first. Probe total, then read the tail.
    const probe = await fetchNvdJson(
      new URLSearchParams({
        resultsPerPage: "1",
        startIndex: "0",
        ...windowParams,
      })
    );
    const total = Number(probe.totalResults) || 0;
    if (!total) throw new Error("NVD returned no CVEs");

    const pageSize = Math.min(Math.max(CVE_FETCH_PAGE, CVE_LIMIT * 2), 100);
    const startIndex = Math.max(0, total - pageSize);
    const page = await fetchNvdJson(
      new URLSearchParams({
        resultsPerPage: String(pageSize),
        startIndex: String(startIndex),
        ...windowParams,
      })
    );

    const items = pickLatestCves(normalizeNvdItems(page), CVE_LIMIT);
    if (!items.length) throw new Error("NVD returned no CVEs");
    const scoredCount = items.filter(hasScoredSeverity).length;
    return {
      items,
      sourceLabel:
        scoredCount === items.length
          ? "NVD · latest with CVSS (7d)"
          : `NVD · latest (7d) · ${scoredCount}/${items.length} scored`,
    };
  }

  /** CIRCL fallback — no key, CORS open; format varies so we normalize carefully. */
  async function fetchRecentFromCircl() {
    const res = await fetch("https://cve.circl.lu/api/last/" + Math.max(CVE_LIMIT * 3, 12), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`CIRCL HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("CIRCL unexpected payload");

    const items = data
      .map((row) => {
        // OSV-style
        if (row.id || (row.aliases && row.aliases.length)) {
          const cveId =
            (row.aliases || []).find((a) => /^CVE-\d{4}-\d+/i.test(a)) ||
            (/^CVE-\d{4}-\d+/i.test(row.id || "") ? row.id : null);
          if (!cveId) return null;
          let severity = "PENDING";
          let score = null;
          if (Array.isArray(row.severity) && row.severity.length) {
            for (const entry of row.severity) {
              const parsed = parseCvssVector(entry && entry.score);
              if (parsed) {
                score = parsed.score;
                severity = parsed.severity;
                break;
              }
            }
          }
          return {
            id: cveId,
            published: row.published,
            modified: row.modified,
            status: "",
            summary: truncate(row.details || "No description available.", 180),
            score,
            severity,
            url: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cveId)}`,
          };
        }
        // CVE JSON 5.x style
        if (row.cveMetadata && row.cveMetadata.cveId) {
          const id = row.cveMetadata.cveId;
          const cna = (row.containers && row.containers.cna) || {};
          const desc =
            (cna.descriptions || []).find((d) => d.lang === "en") ||
            (cna.descriptions || [])[0];
          let severity = "PENDING";
          let score = null;
          // metrics may include cvssV3_1 / cvssV4_0 style objects
          const metrics = cna.metrics || [];
          for (const metric of asMetricList(metrics)) {
            const block =
              (metric && (metric.cvssV3_1 || metric.cvssV31 || metric.cvssV3 || metric.cvssV4_0 || metric.cvssV40)) ||
              metric;
            if (!block) continue;
            if (block.baseScore != null || block.baseSeverity) {
              const s =
                typeof block.baseScore === "number"
                  ? block.baseScore
                  : parseFloat(block.baseScore);
              score = Number.isFinite(s) ? s : null;
              severity = String(
                block.baseSeverity || (score != null ? scoreToSeverity(score) : "PENDING")
              ).toUpperCase();
              break;
            }
            if (block.vectorString) {
              const parsed = parseCvssVector(block.vectorString);
              if (parsed) {
                score = parsed.score;
                severity = parsed.severity;
                break;
              }
            }
          }
          return {
            id,
            published: row.cveMetadata.datePublished,
            modified: row.cveMetadata.dateUpdated,
            status: row.cveMetadata.state || "",
            summary: truncate((desc && desc.value) || "No description available.", 180),
            score,
            severity,
            url: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(id)}`,
          };
        }
        return null;
      })
      .filter(Boolean);

    const picked = pickLatestCves(items, CVE_LIMIT);
    if (!picked.length) throw new Error("CIRCL returned no usable CVEs");
    return { items: picked, sourceLabel: "CIRCL · latest updates" };
  }

  function renderCveCards(grid, items) {
    grid.innerHTML = items
      .map((item) => {
        const sev = item.severity || "PENDING";
        const scoreLabel =
          item.score != null && Number.isFinite(item.score)
            ? `${item.score.toFixed(1)} · ${sev}`
            : sev;
        return `
          <a class="cve-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
            <div class="cve-card-top">
              <span class="cve-id">${escapeHtml(item.id)}</span>
              <span class="cve-sev sev-${severityClass(sev)}">${escapeHtml(scoreLabel)}</span>
            </div>
            <p class="cve-summary">${escapeHtml(item.summary)}</p>
            <div class="cve-card-meta">
              <span>pub ${escapeHtml(formatDate(item.published))}</span>
              <span>mod ${escapeHtml(formatDate(item.modified))}</span>
            </div>
          </a>`;
      })
      .join("");
  }

  function renderCveError(grid, meta, err) {
    const msg = err && err.message ? err.message : "request failed";
    if (meta) {
      meta.textContent = "unavailable";
      meta.classList.add("is-error");
    }
    grid.innerHTML = `
      <div class="cve-error">
        <strong>Could not load live CVE data.</strong>
        <span>${escapeHtml(msg)}</span>
        <a href="https://nvd.nist.gov/vuln/search" target="_blank" rel="noopener">Open NVD search →</a>
      </div>`;
  }

  async function initCveFeed(options = {}) {
    const force = options.force === true;
    const grid = $("#cve-grid");
    const meta = $("#cve-meta");
    if (!grid) return;

    if (force) {
      clearCveCache();
      showCveSkeletons(grid);
      if (meta) {
        meta.textContent = "refreshing…";
        meta.classList.remove("is-error");
      }
    } else {
      const cached = readCveCache();
      if (cached && cached.items.length) {
        renderCveCards(grid, cached.items);
        grid.setAttribute("aria-busy", "false");
        if (meta) {
          meta.classList.remove("is-error");
          const ageMin = Math.max(0, Math.round((Date.now() - cached.ts) / 60000));
          meta.textContent = `${cached.sourceLabel || "cached"} · ${ageMin}m ago`;
        }
        return;
      }
    }

    try {
      let result;
      try {
        result = await fetchRecentFromNvd();
      } catch (nvdErr) {
        // Fallback if NVD rate-limits or is unreachable
        result = await fetchRecentFromCircl();
      }
      writeCveCache(result.items, result.sourceLabel);
      renderCveCards(grid, result.items);
      grid.setAttribute("aria-busy", "false");
      if (meta) {
        meta.classList.remove("is-error");
        meta.textContent = `${result.sourceLabel} · just now`;
      }
    } catch (err) {
      grid.setAttribute("aria-busy", "false");
      renderCveError(grid, meta, err);
    }
  }

  function wireCveRefresh() {
    const btn = $("#cve-refresh");
    if (!btn) return;

    let inflight = false;
    btn.addEventListener("click", async () => {
      if (inflight) return;
      inflight = true;
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.textContent = "Refreshing…";
      try {
        await initCveFeed({ force: true });
      } finally {
        inflight = false;
        btn.disabled = false;
        btn.classList.remove("is-loading");
        btn.textContent = "Refresh";
      }
    });
  }

  /* ── init ────────────────────────────────────────────── */
  /* Atmosphere + cyber mesh: assets/js/site.js (global) */
  document.addEventListener("DOMContentLoaded", async () => {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());

    tickClock();
    tickUptime();
    setInterval(tickClock, 1000);
    setInterval(tickUptime, 1000);

    wireCveRefresh();
    // Start CVE fetch early (parallel with boot animation)
    const cveReady = initCveFeed();

    await runBoot();
    typeRoles();
    initTerminal();
    await cveReady;
  });
})();
