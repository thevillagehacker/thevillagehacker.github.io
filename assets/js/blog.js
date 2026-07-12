/**
 * Blog archive — filter, stats, terminal, hex rain, live indexer feed.
 * Purely cosmetic simulations where noted; search/filter are real.
 */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pageStart = Date.now();

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── posts index from DOM ────────────────────────────── */
  function loadPosts() {
    return $$(".research-item").map((el) => ({
      id: el.dataset.id || "",
      year: el.dataset.year || "",
      severity: (el.dataset.severity || "").toLowerCase(),
      tags: (el.dataset.tags || "").toLowerCase(),
      title: ($(".research-title", el)?.textContent || "").trim(),
      cve: ($(".research-cve", el)?.textContent || "").trim(),
      target: ($(".research-target", el)?.textContent || "").trim(),
      href: el.getAttribute("href") || "#",
      el,
    }));
  }

  let posts = [];
  let activeFilter = "all";
  let searchQuery = "";

  function matches(post) {
    if (activeFilter !== "all" && post.severity !== activeFilter) return false;
    if (!searchQuery) return true;
    const hay = `${post.title} ${post.cve} ${post.target} ${post.tags} ${post.year}`.toLowerCase();
    return hay.includes(searchQuery);
  }

  function applyFilters() {
    let visible = 0;
    posts.forEach((p) => {
      const show = matches(p);
      p.el.classList.toggle("is-hidden", !show);
      p.el.hidden = !show;
      if (show) visible++;
    });

    // Hide empty year groups
    $$(".vendor-group").forEach((group) => {
      const any = $$(".research-item", group).some((el) => !el.classList.contains("is-hidden"));
      group.classList.toggle("is-hidden", !any);
      group.hidden = !any;
    });

    const empty = $("#empty-state");
    if (empty) empty.hidden = visible > 0;

    const matchCount = $("#match-count");
    if (matchCount) {
      matchCount.textContent =
        searchQuery || activeFilter !== "all"
          ? `${visible} match${visible === 1 ? "" : "es"}`
          : "";
    }

    const statVisible = $("#stat-visible");
    if (statVisible) {
      statVisible.textContent =
        visible === posts.length ? "showing all" : `showing ${visible} / ${posts.length}`;
    }

    return visible;
  }

  function updateStats() {
    const total = posts.length;
    const crit = posts.filter((p) => p.severity === "critical").length;
    const high = posts.filter((p) => p.severity === "high").length;
    const lab = posts.filter((p) => p.severity === "lab").length;
    const years = [...new Set(posts.map((p) => p.year).filter(Boolean))].sort();

    const st = $("#stat-total");
    if (st) st.textContent = String(total);

    const sev = $("#stat-severity");
    if (sev) {
      sev.innerHTML = `
        <span class="sev crit">${crit} CRITICAL</span>
        <span class="sev high">${high} HIGH</span>
        <span class="sev med">${lab} LAB</span>`;
    }

    const sy = $("#stat-years");
    if (sy) {
      sy.textContent = years.length ? `${years[years.length - 1]}–${years[0]}` : "—";
    }
  }

  /* ── search + filter UI ──────────────────────────────── */
  function initFilters() {
    const search = $("#archive-search");
    if (search) {
      search.addEventListener("input", () => {
        searchQuery = search.value.trim().toLowerCase();
        applyFilters();
      });
    }

    $$("#archive-filters .filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$("#archive-filters .filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter || "all";
        applyFilters();
      });
    });
  }

  /* ── clock / uptime ──────────────────────────────────── */
  function tickClock() {
    const el = $("#nav-clock");
    if (!el) return;
    el.textContent = new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
  }

  function tickUptime() {
    const el = $("#uptime");
    if (!el) return;
    const sec = Math.floor((Date.now() - pageStart) / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    el.textContent = `session ${m}:${s} · index ready`;
  }

  /* ── indexer feed (cosmetic) ─────────────────────────── */
  function initFeed() {
    const feed = $("#ops-feed");
    if (!feed || !posts.length) return;

    const templates = [
      (p) => `indexed: ${p.cve}`,
      (p) => `linked: ${p.title.slice(0, 42)}${p.title.length > 42 ? "…" : ""}`,
      (p) => `tags: ${p.year} / ${p.severity}`,
      (p) => `mount ${p.href.split("/").pop()}`,
    ];

    let i = 0;
    function push() {
      const p = posts[i % posts.length];
      const msg = templates[i % templates.length](p);
      i++;
      const row = document.createElement("div");
      row.className = "feed-row " + (p.severity === "critical" ? "crit" : p.severity === "high" ? "warn" : "info");
      const ts = new Date().toISOString().slice(11, 19);
      row.innerHTML = `<span class="feed-ts">${ts}</span><span class="feed-msg">${escapeHtml(msg)}</span>`;
      feed.prepend(row);
      while (feed.children.length > 5) feed.removeChild(feed.lastChild);
    }

    for (let n = 0; n < 3; n++) push();
    if (!prefersReducedMotion) setInterval(push, 3200);
  }

  /* ── archive terminal ────────────────────────────────── */
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

    const listPosts = (list) => {
      if (!list.length) {
        print(`<span class="t-warn">no entries match</span>`);
        return;
      }
      list.forEach((p) => {
        const sev =
          p.severity === "critical"
            ? "t-err"
            : p.severity === "high"
              ? "t-warn"
              : "t-accent";
        print(
          `<span class="t-dim">[${p.id.padStart(2, "0")}]</span> <span class="${sev}">${escapeHtml(p.severity.toUpperCase())}</span>  ${escapeHtml(p.title)}`
        );
      });
      print(`<span class="t-dim">${list.length} entr${list.length === 1 ? "y" : "ies"} — open &lt;id&gt;</span>`);
    };

    print(`<span class="t-dim">research archive shell · ${posts.length} entries mounted</span>`);
    print(`<span class="t-dim">type <span class="t-accent">help</span> · <span class="t-accent">ls</span> · <span class="t-accent">open &lt;id&gt;</span></span>`);
    print("");

    const commands = {
      help() {
        print(`<span class="t-accent">archive commands</span>`);
        print(`  <span class="t-ok">ls</span> [year]     — list writeups`);
        print(`  <span class="t-ok">open</span> &lt;id&gt;    — open entry by id`);
        print(`  <span class="t-ok">search</span> &lt;q&gt;  — filter archive UI`);
        print(`  <span class="t-ok">filter</span> &lt;sev&gt; — all|critical|high|lab`);
        print(`  <span class="t-ok">stats</span>         — severity / year map`);
        print(`  <span class="t-ok">cat</span> &lt;id&gt;     — preview metadata`);
        print(`  <span class="t-ok">home</span>          — return to research node`);
        print(`  <span class="t-ok">clear</span>         — clear terminal`);
      },
      ls(args) {
        const year = args[0];
        const list = year ? posts.filter((p) => p.year === year) : posts;
        if (year && !list.length) {
          print(`<span class="t-warn">no entries for year ${escapeHtml(year)}</span>`);
          return;
        }
        listPosts(list);
      },
      open(args) {
        const id = args[0];
        if (!id) {
          print(`usage: open &lt;id&gt;`);
          return;
        }
        const p = posts.find((x) => x.id === id || x.id === String(Number(id)));
        if (!p) {
          print(`<span class="t-err">entry not found:</span> ${escapeHtml(id)}`);
          return;
        }
        print(`opening <span class="t-accent">${escapeHtml(p.title)}</span>...`);
        setTimeout(() => {
          window.location.href = p.href;
        }, 350);
      },
      search(args) {
        const q = args.join(" ").trim();
        const search = $("#archive-search");
        if (search) {
          search.value = q;
          searchQuery = q.toLowerCase();
          const n = applyFilters();
          print(`grep → <span class="t-accent">${n}</span> match${n === 1 ? "" : "es"} for "${escapeHtml(q || "*")}"`);
          listPosts(posts.filter(matches));
        }
      },
      filter(args) {
        const sev = (args[0] || "all").toLowerCase();
        const allowed = ["all", "critical", "high", "lab"];
        if (!allowed.includes(sev)) {
          print(`usage: filter all|critical|high|lab`);
          return;
        }
        activeFilter = sev;
        $$("#archive-filters .filter-btn").forEach((b) => {
          b.classList.toggle("active", (b.dataset.filter || "") === sev);
        });
        const n = applyFilters();
        print(`filter=${escapeHtml(sev)} → ${n} visible`);
      },
      stats() {
        const crit = posts.filter((p) => p.severity === "critical").length;
        const high = posts.filter((p) => p.severity === "high").length;
        const lab = posts.filter((p) => p.severity === "lab").length;
        const years = {};
        posts.forEach((p) => {
          years[p.year] = (years[p.year] || 0) + 1;
        });
        print(`total:    ${posts.length}`);
        print(`critical: <span class="t-err">${crit}</span>  high: <span class="t-warn">${high}</span>  lab: <span class="t-accent">${lab}</span>`);
        Object.keys(years)
          .sort()
          .reverse()
          .forEach((y) => print(`  ${y}: ${years[y]}`));
      },
      cat(args) {
        const id = args[0];
        if (!id) {
          print(`usage: cat &lt;id&gt;`);
          return;
        }
        const p = posts.find((x) => x.id === id || x.id === String(Number(id)));
        if (!p) {
          print(`<span class="t-err">entry not found</span>`);
          return;
        }
        print(`id:       ${escapeHtml(p.id)}`);
        print(`title:    ${escapeHtml(p.title)}`);
        print(`class:    ${escapeHtml(p.cve)}`);
        print(`year:     ${escapeHtml(p.year)}`);
        print(`severity:${escapeHtml(p.severity)}`);
        print(`target:   ${escapeHtml(p.target)}`);
        print(`path:     ${escapeHtml(p.href)}`);
      },
      home() {
        print(`cd ~/ ...`);
        setTimeout(() => {
          window.location.href = "/";
        }, 300);
      },
      clear() {
        output.innerHTML = "";
      },
    };

    // aliases
    commands.list = commands.ls;
    commands.grep = commands.search;
    commands.cd = (args) => {
      if (!args[0] || args[0] === "~" || args[0] === "home" || args[0] === "..") commands.home();
      else print(`cd: ${escapeHtml(args[0])}: no such directory`);
    };

    const history = [];
    let histIdx = -1;

    input.addEventListener("keydown", (e) => {
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
        `<span class="term-echo"><span class="ps1-user">archive</span>@lab:~/research$ ${escapeHtml(raw)}</span>`
      );
      input.value = "";
      histIdx = -1;
      if (!raw) return;
      history.push(raw);

      const [cmd, ...args] = raw.split(/\s+/);
      const fn = commands[cmd.toLowerCase()];
      if (fn) fn(args);
      else {
        print(`<span class="t-err">command not found:</span> ${escapeHtml(cmd)}`);
        print(`<span class="t-dim">type help for the command list</span>`);
      }
    });

    body.addEventListener("click", () => input.focus());
  }

  /* ── init ────────────────────────────────────────────── */
  /* Atmosphere / cyber mesh: assets/js/site.js (global) */
  document.addEventListener("DOMContentLoaded", () => {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());

    posts = loadPosts();
    updateStats();
    applyFilters();
    initFilters();
    initTerminal();
    initFeed();

    tickClock();
    tickUptime();
    setInterval(tickClock, 1000);
    setInterval(tickUptime, 1000);
  });
})();
