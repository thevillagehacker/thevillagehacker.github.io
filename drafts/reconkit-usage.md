---
title: Reconkit — Authorized Bug Bounty Recon Toolkit
description: Complete usage guide for Reconkit v3 — modular recon, scope gates, safe prove, multi-provider LLM agents, attack-path graph, and Starfleet Bridge dashboard.
banner: RECONKIT v3.0 // AUTHORIZED RECON · SAFE PROVE · LLM AGENTS · ATTACK GRAPH
tag: OPEN SOURCE TOOLING
subtitle: DETECTION + SAFE VALIDATION · SCOPE-GATED · LOCAL OR CLOUD LLM
platform: Cross-platform (Windows / Linux / macOS)
researcher: Naveen Jagadeesan
published: 2026-08-02
slug: reconkit
severity: lab
target: RECONKIT // BUG BOUNTY // PYTHON CLI
---

[TOC]

## Introduction

**Reconkit** is a cross-platform toolkit for **authorized** bug bounty reconnaissance. It wires together modular scan stages, a hard **scope gate**, program-weighted findings, **safe prove** (canary-only validation), an attack-path graph, multi-provider LLM agents, and a local cyber dashboard.

It is **not** an exploit framework. Default posture is detection + safe validation — no sqlmap, reverse shells, credential stuffing, or data dumps.

| | |
|---|---|
| **Version** | 3.0.0 |
| **License / code** | [github.com/thevillagehacker/Reconkit](https://github.com/thevillagehacker/Reconkit) |
| **Author** | Naveen Jagadeesan ([@thevillagehacker](https://github.com/thevillagehacker)) |
| **Data home** | `~/.reconkit/` (secrets, scope, output — never commit) |

**Principle:** recon finds · programs prioritize · prove confirms safely · graph explains · skills kill FPs · cloud or local LLM.

---

## What you get

Six layers, one toolkit:

| Layer | Role |
|-------|------|
| **reconkit** | Install tools, enforce scope, run scan modules, write files |
| **prove** | Safe re-check of candidates (markers / canaries only) |
| **agents** | LLM chooses next modules — local Ollama **or** cloud providers |
| **skills** | Role-routed + on-demand mini-skills; FP kill + prove mapping (C0–C4) |
| **findings / graph / programs** | Index, scores, attack paths, BB program weights |
| **dashboard** | Local web UI — Recon · Proofs · Graph · Insights · Mission bridge |
| **shell** | Interactive cyber prompt with live `/` autocomplete |

### Entry points

| Launcher | When to use |
|----------|-------------|
| `python recon_shell.py` | **Daily driver** — interactive slash commands |
| `python reconkit.py …` | Scripts, CI, one-shot CLI (+ `prove`) |
| `python recon_prove.py …` | Safe validation queue / run |
| `python recon_agents.py …` | Multi-agent LLM recon / providers / check-llm |
| `python recon_dashboard.py` | Browse findings, proofs, graph in the browser |

```bash
cd path/to/Reconkit
pip install prompt_toolkit colorama
python reconkit.py --version
# → reconkit 3.0.0

python recon_shell.py
```

---

## Project layout

```text
Reconkit/
├── USAGE.md / OPERATIONS.md / WORKFLOW.md / AGENTS.md
├── reconkit.py           # pipeline + setup + scope + keys
├── recon_shell.py        # interactive cyber prompt
├── recon_dashboard.py    # web UI
├── recon_agents.py       # multi-agent LLM CLI
├── recon_prove.py        # safe validation CLI
├── prove/                # queue, validators, policy
├── agents/               # llm, skills, orchestrator, eval
├── skills/               # Agent skill packs (SKILL.md)
├── findings/ graph/ shell/ dashboard/ programs/
└── config/               # agent + exploit policy + program profiles
```

### Local data (`~/.reconkit`)

Runtime data lives **outside the repo** so secrets and loot never get committed.

```text
~/.reconkit/
├── config.json
├── scope.txt                 # authorized targets (hard gate)
├── secrets.env               # API keys (owner-only)
├── agent_config.json         # optional user-global LLM config
├── wordlists/
├── logs/debug.log
├── index/findings_index.json
├── history/<target>/
└── output/<target>/
    ├── subdomains.txt, alive.txt, urls.txt, …
    ├── agent_report.md, report_draft.md, critic_review.md
    └── proofs/
```

**Mental model:** files under `output/` are source of truth. The findings index is a **query cache** for the UI — not a separate live database.

---

## One-time setup

### Prerequisites

- Python **3.10+** (3.11+ recommended)
- `git`
- `go` (ProjectDiscovery / tomnomnom tools)
- `cargo` optional (Rust tools)
- `pip install prompt_toolkit colorama` for shell UX

### Install sequence

```bash
cd path/to/Reconkit

pip install prompt_toolkit colorama
python reconkit.py checkenv
python reconkit.py setup
# Apply PATH lines setup prints (Go bin, Cargo bin, user Scripts)
# Open a NEW terminal, cd back to the project

python reconkit.py verify
python reconkit.py wordlists
```

`setup` is **idempotent** — safe to re-run; skips what already exists.

### Shell equivalents

```text
/checkenv
/setup
/verify
/wordlists
```

---

## Authorization (scope gate)

**Nothing in `run` / `/run` / agents executes** against a host that is not in scope.

```bash
python reconkit.py scope add example.com          # type yes to confirm authorization
python reconkit.py scope add "*.example.com"      # wildcard OK
python reconkit.py scope list
python reconkit.py scope check example.com
```

File: `~/.reconkit/scope.txt` (one domain per line; `#` comments allowed).

```text
/scope add example.com
/scope list
/scope check example.com
```

Only test assets you are **explicitly authorized** to assess (bug bounty program scope, signed pentest RoE, or your own lab).

---

## API keys (optional)

Keys boost subdomain yield (`subfinder -all`, chaos, GitHub, Shodan, …). Stored only in `~/.reconkit/secrets.env` — **never in the repo**.

```bash
python reconkit.py keys set PDCP_API_KEY <value>
python reconkit.py keys set GITHUB_TOKEN <value>
python reconkit.py keys set SHODAN_API_KEY <value>
python reconkit.py keys set CENSYS_API_ID <value>
python reconkit.py keys set SECURITYTRAILS_API_KEY <value>
python reconkit.py keys set VIRUSTOTAL_API_KEY <value>

python reconkit.py keys list      # values masked
python reconkit.py keys remove SHODAN_API_KEY
```

```text
/keys list
/keys set PDCP_API_KEY <value>
/keys remove PDCP_API_KEY
```

LLM keys (Grok, Claude, OpenAI, …) use environment variables such as `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` — see [Agents & LLM](#agents--llm-local--cloud).

---

## Recon modules

```bash
python reconkit.py modules
# shell: /modules
```

| Module | What it does |
|--------|----------------|
| `subdomains` | subfinder, amass, assetfinder, chaos, findomain, crt.sh, Wayback, HackerTarget → merge/dedupe |
| `dns` | dnsx multi-record + CNAME takeover fingerprint candidates |
| `httpprobe` | httpx alive hosts, title, status, tech |
| `tls` | tlsx cert details, expiry/self-signed/mismatch, JARM |
| `crawl` | katana, gospider, hakrawler, gau, waybackurls → URLs |
| `js` | collect `.js`, regex extract secrets/endpoints (**read-only**) |
| `params` | unfurl param names + arjun hidden params |
| `content` | sensitive paths + ffuf directory fuzz |
| `xss` | gf xss → kxss → dalfox (**detection** of candidates) |
| `sqli` | gf sqli → error/boolean **detection canaries** (non-destructive) |
| `ssrf_ssti` | cloud-metadata SSRF probe + `{{7*7}}` SSTI canary |
| `nuclei` | CVE / takeover / panel / misconfig templates |
| `cloud` | S3/Azure/GCP/Firebase refs + read-only S3 public list check |
| `screenshots` | gowitness screenshots of alive hosts |

**Logical dependency order:**

```text
subdomains → dns / httpprobe → tls, crawl, content, nuclei, screenshots
crawl → js, params, xss, sqli, ssrf_ssti, cloud
```

Missing tools print `[WARN]` and skip that stage — they do not crash the whole run.

---

## Running recon

### CLI

```bash
# Full pipeline
python reconkit.py run --target example.com

# Selected modules (comma-separated, no spaces)
python reconkit.py run --target example.com --modules subdomains,dns,httpprobe,nuclei

# Verbosity flags BEFORE the subcommand
python reconkit.py -v 3 run --target example.com --modules subdomains
python reconkit.py --debug run --target example.com
```

Output: `~/.reconkit/output/example.com/`

### Shell shortcuts

```text
/target example.com
/run example.com
/run example.com --modules subdomains,dns,httpprobe
/quick example.com          # subdomains + dns + httpprobe
/full example.com           # all modules
/scan                       # interactive module picker
/pause /resume /stop /jobs  # background job control
```

`/run` is **background by default**; use `--fg` to block until complete.

### Verbosity

| Level | Name | Console behavior |
|------:|------|------------------|
| 0 | quiet | Banners + OK/WARN/FAIL |
| 1 | normal | Default — command lines + stage progress |
| 2 | debug | + timing, exit codes, stderr snippets |
| 3 | live | + full live stdout/stderr of tools |

```text
/verbose
/verbose 2
/verbose live
```

---

## Interactive cyber shell

```bash
python recon_shell.py
python recon_shell.py --target example.com -v 2
```

### Live autocomplete

Install `prompt_toolkit` for LIVE slash matching (type `/co` → `/commands` `/config`).

| Context | Suggestions |
|---------|-------------|
| `/run T --modules ` | module names + `all` |
| `/keys set ` | key names (`PDCP_API_KEY`, …) |
| `/prove run T --technique ` | validators (`xss_reflect`, …) |
| `/config set --provider ` | LLM providers |

Every command supports:

```text
/<command> -h
/<command> --help
```

### Shell map (high level)

```text
/setup /verify /wordlists
/scope add|list|check
/keys set|list|remove
/target /verbose /rate
/run /quick /full /scan /playbook
/pause /resume /stop /jobs
/findings reindex
/program list|show|set
/notable /diff /doctor /tips
/prove policy|techniques|queue|run|list|show
/graph summary|show
/report /critic
/config …  /check-llm  /agent …
/dashboard
```

Full catalog lives in the repo as **OPERATIONS.md**.

---

## Findings index & program profiles

After scans, reindex so scoring / notable / prove queue stay current:

```bash
python reconkit.py findings reindex
# shell:
/findings reindex
/findings summary example.com
/notable
/diff example.com
```

### Program profiles (bug bounty weights)

```text
/program list
/program set example-web
/findings reindex
/notable
```

Profiles live in `config/programs/*.json`. Env override: `RECON_PROGRAM=…`. Weights affect `/notable` and prove queue priority after reindex.

---

## Prove — safe validation

Prove re-checks scanner candidates with **canaries / markers only**. It does not run exploit frameworks.

### Techniques

| Technique | Behavior |
|-----------|----------|
| `xss_reflect` | Unique marker + context classification (html/attr/js/url/encoded) |
| `ssti_math` | Math canary (e.g. `{{7*7}}`) |
| `nuclei_recheck` | Re-run selected nuclei evidence safely |
| `takeover_fingerprint` | DNS/CNAME takeover fingerprint |
| `ssrf_canary_review` | OAST-oriented SSRF canary review |
| `sqli_boolean` | Optional true/false canary (**off by default**) |

### Policy (`config/exploit_policy.json`)

- Mode: `safe_validation`
- `require_scope: true`
- `allow_sqli_boolean: false` by default
- Set `oast_base_url` for interactsh/collaborator-style OAST SSRF
- Disallowed by design: sqlmap, shells, credential stuffing, mass scan, data exfil, destructive

### Commands

```bash
python recon_prove.py policy
python recon_prove.py techniques
python recon_prove.py queue --target example.com
python recon_prove.py run --target example.com --dry-run
python recon_prove.py run --target example.com
python recon_prove.py run --target example.com --technique xss_reflect
```

```text
/prove policy
/prove techniques
/prove queue example.com
/prove run example.com --dry-run
/prove run example.com --technique xss_reflect
/prove list example.com
/prove show <id>
```

Confirmed proof ≈ confidence **C2** in the skill suite (see below).

---

## Attack graph

```text
/graph summary
/graph show example.com
```

```bash
curl -s "http://127.0.0.1:8787/api/graph?target=example.com&min_score=40"
```

The graph links findings + proofs into attack paths for the dashboard **Graph** tab (force layout, drag nodes).

---

## Dashboard (Starfleet Bridge)

```bash
python recon_dashboard.py
python recon_dashboard.py --port 8787 --no-browser
# shell:
/dashboard
/dashboard --host 127.0.0.1    # localhost only (recommended on shared LANs)
```

| Where you browse | URL |
|------------------|-----|
| Same machine | http://127.0.0.1:8787/ |
| Host → VM | http://`<VM_LAN_IP>`:8787/ |

### Tabs

| Tab | Purpose |
|-----|---------|
| **Recon / Sensors** | Findings, filters, evidence |
| **Proof Locker** | Validation proofs by status / technique |
| **Tactical Map / Graph** | Attack-path graph |
| **Science / Insights** | Severity / module charts |
| **Mission** | Phase replay — modules as fleet deployment |

### Selected API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| GET | `/api/overview` | Recon + proof counts |
| GET | `/api/records?…` | Filtered recon records |
| GET | `/api/proofs?…` | Filtered proofs |
| GET | `/api/graph?target=&min_score=` | Attack-path nodes/edges |
| GET | `/api/stats/charts?target=` | Chart data |
| GET | `/api/program` | Active BB profile |
| POST | `/api/reindex` | Rebuild index from disk (no server restart) |

**Security note:** default bind is often `0.0.0.0` for VM→host access. Any client that can reach the port can see recon data. Prefer `--host 127.0.0.1` on shared networks. **Do not** expose this UI on the public internet.

---

## Agents & LLM (local + cloud)

A **planner** picks specialists; specialists run recon modules; an **analyst** writes `agent_report.md`. The same client talks to **local Ollama** or cloud APIs.

### Specialist map

| Agent | Modules |
|-------|---------|
| `subdomain` | `subdomains` |
| `discovery` | `dns`, `httpprobe`, `tls` |
| `content` | `crawl`, `js`, `params`, `content` |
| `vuln` | `xss`, `sqli`, `ssrf_ssti`, `nuclei`, `cloud` |
| `visual` | `screenshots` |
| `planner` | decides next step |
| `analyst` | final report |

If the LLM is down, **heuristics** still advance the pipeline.

### Providers

```bash
python recon_agents.py providers
```

| Provider | Default model | Key env |
|----------|---------------|---------|
| `ollama` | `qwen3:8b` | — |
| `xai` / `grok` | `grok-2-latest` | `XAI_API_KEY` |
| `anthropic` | Claude Sonnet class | `ANTHROPIC_API_KEY` |
| `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| `google` / `gemma` | Gemini / Gemma | `GOOGLE_API_KEY` |
| `openrouter` | many | `OPENROUTER_API_KEY` |
| `groq` / `deepseek` / … | see `providers` | matching `*_API_KEY` |

### Configure & run

```bash
# Local Ollama (from a VM: use Windows host IP, not the Kali IP)
python recon_agents.py config set --provider ollama \
  --base-url http://192.168.1.4:11434 --model qwen3:8b

# Cloud — set the key in the environment first
# PowerShell: $env:XAI_API_KEY = "xai-..."
# bash:       export XAI_API_KEY=...
python recon_agents.py config set --provider xai --model grok-2-latest

python recon_agents.py check-llm
python recon_agents.py agents
python recon_agents.py run --target example.com --dry-run
python recon_agents.py run --target example.com --max-steps 8
```

```text
/config set --provider xai --model grok-2-latest
/check-llm
/agents
/agent example.com --max-steps 8
```

**Tip:** keep API keys in the environment (or `~/.reconkit`), not in tracked `config/agent_config.json`. Cloud walkthrough: `config/CLOUD_LLM_SETUP.md` in the repo.

---

## Agent skill suite (C0–C4)

Skills inject methodology by **role** and **surface**. They reduce false positives and map scanner hits to safe prove techniques.

### Core skills (always role-routed)

| Skill | Purpose |
|-------|---------|
| `reconkit-bug-bounty` | Master pipeline + scope rules |
| `reconkit-efficiency` | Token budgets (≤3 modules/step) |
| `reconkit-fp-eval` | C0–C4 tiers, kill-fast FPs |
| `reconkit-exploit-prove` | Canary PoCs + `/prove` technique map |
| `reconkit-triage-gate` | Pre-report 7-gate / N/A prevention |

| Role | Skills |
|------|--------|
| planner | bug-bounty + efficiency + fp-eval |
| specialist | bug-bounty + fp-eval |
| analyst | bug-bounty + fp-eval + exploit-prove + triage-gate |
| critic | fp-eval + triage-gate + exploit-prove |

### On-demand mini-skills (max 3 / turn)

| Skill | Example trigger |
|-------|-----------------|
| `reconkit-vuln-xss` | module `xss` |
| `reconkit-vuln-sqli` | module `sqli` |
| `reconkit-vuln-ssrf` | `ssrf_ssti` / cloud / nuclei |
| `reconkit-vuln-jwt` | `js` + bearer / `eyJ` |
| `reconkit-vuln-secrets` | `js` / cloud secrets |
| `reconkit-vuln-idor` | `params` / crawl APIs |
| `reconkit-vuln-graphql` | crawl + graphql text |
| `reconkit-vuln-takeover` | `dns` / nuclei takeover |

### Confidence path

```text
C0 noise          → drop
C1 scanner hit    → /prove or manual
C2 canary confirmed → PoC draft
C3 impact (human) → triage-gate
C4 report-ready
```

```bash
python recon_agents.py agents    # suite by role + surface list
# RECON_AGENT_SKILL=reconkit-bug-bounty   # default
# RECON_AGENT_SKILL=off
# RECON_AGENT_SKILL_EXTRA=reconkit-efficiency
```

### Worked example (XSS surface)

```bash
python recon_agents.py run --target example.com --modules xss --max-steps 4
python reconkit.py findings reindex
python recon_prove.py run --target example.com --technique xss_reflect
# confirmed proof ≈ C2; write impact manually for C3; /critic for triage-gate
```

---

## Ordered hunt (phases A–O)

Replace `example.com` with a domain you are **authorized** to test.

| Phase | Action |
|-------|--------|
| **A** Setup | `checkenv` → `setup` → PATH |
| **B** Verify | `verify` |
| **C** Wordlists & keys | `wordlists` · `/keys set …` |
| **D** Scope | `scope add` · type `yes` |
| **E** Discover | `modules` · `/cmd -h` |
| **F** Verbosity / rate | `/verbose 2` · `/rate` |
| **G** Recon | `/quick` or `/run` / `/full` / `/scan` |
| **H** Program + index | `/program set` · `/findings reindex` |
| **I** Triage helpers | `/notable` · `/diff` · `/doctor` · `/tips` |
| **J** Prove | `/prove queue` · `/prove run` |
| **K** Graph | `/graph show` |
| **L** Dashboard | `/dashboard` |
| **M** Agents | `/check-llm` · `/agent` |
| **N** Report | `/report` · `/critic` |
| **O** Session | `/jobs` · `/pause` · `/stop` |

### Copy-paste skeleton (CLI)

```bash
cd path/to/Reconkit
pip install prompt_toolkit colorama

python reconkit.py checkenv
python reconkit.py setup
python reconkit.py verify
python reconkit.py wordlists

python reconkit.py scope add example.com
python reconkit.py run --target example.com --modules subdomains,dns,httpprobe,nuclei
python reconkit.py findings reindex

python recon_prove.py queue --target example.com
python recon_prove.py run --target example.com --dry-run
python recon_prove.py run --target example.com

python recon_dashboard.py --host 127.0.0.1
```

### Shell skeleton

```text
python recon_shell.py

/setup
/verify
/scope add example.com
/keys list
/quick example.com
/findings reindex
/program set example-web
/notable
/prove queue example.com
/prove run example.com --dry-run
/prove run example.com
/graph show example.com
/dashboard --host 127.0.0.1
/report example.com
/critic example.com
```

---

## Report, critic & jobs

```text
/report example.com      # draft markdown under output/
/critic example.com      # triage-gate style review
/jobs                    # background recon jobs
/pause /resume /stop
```

Outputs typically land under:

```text
~/.reconkit/output/<target>/report_draft.md
~/.reconkit/output/<target>/critic_review.md
~/.reconkit/output/<target>/agent_report.md
```

---

## Safety & ethics

| Do | Don't |
|----|-------|
| Confirm written authorization before `scope add` | Scan random internet hosts |
| Prefer safe prove canaries | Run sqlmap / shells / dumps via this tool |
| Keep keys in `~/.reconkit/secrets.env` or env | Commit `secrets.env` or live `api_key` values |
| Bind dashboard to localhost on shared LANs | Expose dashboard on the public internet |
| Use program RoE for optional `sqli_boolean` | Treat C1 scanner noise as report-ready |

**Default path:** C1 scanner → `/prove` (C2) → PoC draft → human impact (C3) → triage (C4).  
No reverse shells, credential spray lists, or destructive modules in the default path.

---

## Troubleshooting (quick)

| Symptom | Check |
|---------|-------|
| `out of scope` / run refused | `scope list` · `scope check <host>` |
| Tool missing | `verify` · re-run `setup` · PATH for Go/Cargo |
| Shell has no autocomplete | `pip install prompt_toolkit` |
| LLM fails | `check-llm` · provider key env · `providers` |
| Ollama from VM | Use **host** IP in `base_url`, not guest IP; firewall TCP 11434 |
| Dashboard empty | `/findings reindex` · confirm `~/.reconkit/output/<target>/` |
| Dashboard unreachable from host | Bind `0.0.0.0`, open VM firewall on 8787 |

---

## Repository docs map

| Document | When |
|----------|------|
| [USAGE.md](https://github.com/thevillagehacker/Reconkit/blob/main/USAGE.md) | Architecture, modules, configs, troubleshooting |
| [OPERATIONS.md](https://github.com/thevillagehacker/Reconkit/blob/main/OPERATIONS.md) | Every CLI / shell / API operation |
| [WORKFLOW.md](https://github.com/thevillagehacker/Reconkit/blob/main/WORKFLOW.md) | Ordered hunt phases A–O |
| [AGENTS.md](https://github.com/thevillagehacker/Reconkit/blob/main/AGENTS.md) | LLM / skills / prove / graph quick start |
| [skills/README.md](https://github.com/thevillagehacker/Reconkit/blob/main/skills/README.md) | Skill suite design |
| [ROADMAP.md](https://github.com/thevillagehacker/Reconkit/blob/main/ROADMAP.md) | Done vs planned |

---

## Links

- **Source:** [github.com/thevillagehacker/Reconkit](https://github.com/thevillagehacker/Reconkit)
- **Author:** [thevillagehacker](https://github.com/thevillagehacker) · [LinkedIn](https://linkedin.com/in/thevillagehacker) · [X](https://x.com/thevillagehackr)

> Use Reconkit only on systems you own or are explicitly authorized to test. Happy (authorized) hunting.
