/**
 * Landing page simulations — boot sequence, terminal, recon HUD, hex rain.
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

  /* ── boot overlay ────────────────────────────────────── */
  async function runBoot() {
    const overlay = $("#boot-overlay");
    const log = $("#boot-log");
    if (!overlay || !log) return;

    if (sessionStorage.getItem("tvh_booted") || prefersReducedMotion) {
      overlay.classList.add("boot-done");
      return;
    }

    const lines = [
      { t: "BIOS ⇨ thevillagehacker research node", c: "dim" },
      { t: "Memory check .............. OK", c: "ok" },
      { t: "Loading kernel modules ..... crypto, netfilter, curiosity", c: "dim" },
      { t: "Mounting /dev/brain ........ RW", c: "ok" },
      { t: "Starting services:", c: "" },
      { t: "  [+] sshd                 listening", c: "ok" },
      { t: "  [+] recon-daemon         active", c: "ok" },
      { t: "  [+] caffeine-injector    critical", c: "warn" },
      { t: "Initializing attack-surface map...", c: "dim" },
      { t: "Handshake complete. Welcome, operator.", c: "accent" },
    ];

    overlay.classList.add("boot-visible");
    for (const line of lines) {
      const span = document.createElement("div");
      span.className = "boot-line " + (line.c || "");
      span.textContent = line.t;
      log.appendChild(span);
      await sleep(120 + Math.random() * 80);
    }
    await sleep(450);
    overlay.classList.add("boot-done");
    sessionStorage.setItem("tvh_booted", "1");
  }

  /* ── role typewriter ─────────────────────────────────── */
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
      print(`<span class="t-dim">thevillagehacker lab shell v1.3.37</span>`);
      print(`<span class="t-dim">type <span class="t-accent">help</span> for available commands</span>`);
      print("");
    };

    const commands = {
      help() {
        print(`<span class="t-accent">available commands</span>`);
        print(`  <span class="t-ok">whoami</span>     — operator identity`);
        print(`  <span class="t-ok">id</span>         — research profile`);
        print(`  <span class="t-ok">ls</span>         — list research paths`);
        print(`  <span class="t-ok">recon</span>      — simulated surface scan`);
        print(`  <span class="t-ok">skills</span>     — focus areas`);
        print(`  <span class="t-ok">blog</span>       — open research archive`);
        print(`  <span class="t-ok">writeups</span>   — CTF / writeup notes`);
        print(`  <span class="t-ok">contact</span>    — reach the operator`);
        print(`  <span class="t-ok">neofetch</span>   — system card`);
        print(`  <span class="t-ok">clear</span>      — clear terminal`);
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
        print(`drwxr-xr-x  blog/`);
        print(`drwxr-xr-x  writeups/`);
        print(`drwxr-xr-x  posts/`);
        print(`-rw-r--r--  identity.txt`);
        print(`-rwxr-xr-x  recon.sh`);
        print(`-rw-------  secrets.enc  <span class="t-dim"># redacted</span>`);
      },
      async recon() {
        print(`<span class="t-dim">[*] starting passive recon simulation...</span>`);
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
        print(`<span class="t-accent">[✓]</span> surface map updated · see HUD below`);
      },
      skills() {
        print(`RCE · IDOR · XSS · SQLi · ATO · deserialization · mobile · proxy tooling`);
      },
      blog() {
        print(`opening <span class="t-accent">/blog.html</span>...`);
        setTimeout(() => (window.location.href = "/blog.html"), 400);
      },
      writeups() {
        print(`opening writeups archive...`);
        setTimeout(
          () => window.open("https://thevillagehacker-security.gitbook.io/ctf-writeups", "_blank"),
          400
        );
      },
      contact() {
        print(`encrypted channel preferred`);
        print(`→ <span class="t-accent">https://x.com/thevillagehackr</span>`);
      },
      neofetch() {
        print(`<span class="t-accent">       ___</span>  thevillagehacker`);
        print(`<span class="t-accent">   .─´   \`─.</span>  -------------`);
        print(`<span class="t-accent">  /  lab   \\</span> OS: Research Node`);
        print(`<span class="t-accent"> |  ○   ○  |</span> Shell: zsh + caffeine`);
        print(`<span class="t-accent">  \\   ▽   /</span>  Focus: vuln research`);
        print(`<span class="t-accent">   \`─────´</span>   Status: <span class="t-ok">online</span>`);
      },
      clear() {
        output.innerHTML = "";
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

  /* ── ops HUD meters + feed ───────────────────────────── */
  function initHud() {
    const surfaceBar = $("#meter-surface");
    const entropyBar = $("#meter-entropy");
    const valSurface = $("#val-surface");
    const valEntropy = $("#val-entropy");
    const findings = $("#ops-findings");
    const feed = $("#ops-feed");
    if (!feed) return;

    let surface = 12;
    let entropy = 3.2;
    let crit = 0,
      high = 0,
      med = 0;

    const feedLines = [
      { sev: "info", msg: "fingerprint: nginx / cloudflare / custom api" },
      { sev: "ok", msg: "cors misconfig candidate → queueed (false positive)" },
      { sev: "warn", msg: "auth cookie missing HttpOnly on staging" },
      { sev: "info", msg: "enum: /api/v2/users/{id} responds 200 for sequential ids" },
      { sev: "crit", msg: "command injection sink in export endpoint (lab)" },
      { sev: "ok", msg: "rate-limit present on /login · 20/min" },
      { sev: "warn", msg: "JWT alg confusion test harness ready" },
      { sev: "info", msg: "subdomain takeover check: 0 dangling CNAME" },
      { sev: "high", msg: "IDOR on invoice PDF — access control gap" },
      { sev: "info", msg: "payload entropy recalculated after mutate()" },
      { sev: "ok", msg: "ssrf filter blocks link-local · good" },
      { sev: "warn", msg: "debug endpoint still exposed on preprod" },
    ];

    let fi = 0;
    function pushFeed() {
      const item = feedLines[fi % feedLines.length];
      fi++;
      const row = document.createElement("div");
      row.className = "feed-row " + item.sev;
      const ts = new Date().toISOString().slice(11, 19);
      row.innerHTML = `<span class="feed-ts">${ts}</span><span class="feed-msg">${item.msg}</span>`;
      feed.prepend(row);
      while (feed.children.length > 6) feed.removeChild(feed.lastChild);

      if (item.sev === "crit") crit++;
      else if (item.sev === "high") high++;
      else if (item.sev === "warn") med++;

      if (findings) {
        findings.innerHTML = `
          <span class="sev crit">${crit} CRITICAL</span>
          <span class="sev high">${high} HIGH</span>
          <span class="sev med">${med} MED</span>`;
      }
    }

    function tickMeters() {
      surface = Math.min(97, surface + Math.random() * 2.4);
      entropy = Math.min(8.0, Math.max(2.5, entropy + (Math.random() - 0.45) * 0.35));
      if (surfaceBar) surfaceBar.style.width = surface.toFixed(1) + "%";
      if (entropyBar) entropyBar.style.width = (entropy / 8) * 100 + "%";
      if (valSurface) valSurface.textContent = surface.toFixed(0);
      if (valEntropy) valEntropy.textContent = entropy.toFixed(2);
    }

    // seed
    for (let i = 0; i < 3; i++) pushFeed();
    tickMeters();

    if (!prefersReducedMotion) {
      setInterval(pushFeed, 2800);
      setInterval(tickMeters, 900);
    }
  }

  /* ── init ────────────────────────────────────────────── */
  /* Atmosphere / hex rain: assets/js/site.js (global) */
  document.addEventListener("DOMContentLoaded", async () => {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());

    tickClock();
    tickUptime();
    setInterval(tickClock, 1000);
    setInterval(tickUptime, 1000);

    await runBoot();
    typeRoles();
    initTerminal();
    initHud();
  });
})();
