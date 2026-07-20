# Blog tooling

## `md_to_post.py` — Markdown → publish-ready HTML + blog card

Convert research writeups from Markdown + YAML front matter into full HTML posts that match the live site chrome (black + red cyber theme, nav, terminal code windows, cyber mesh, HTTP highlighting). **By default the converter also inserts/updates a hyperlink card on `blog.html`.**

| Without a converter | With `md_to_post.py` |
|---------------------|----------------------|
| Copy-paste an old HTML post | One Markdown file + front matter |
| Easy to forget `site.js` / fonts | Template always includes current chrome |
| Manual `blog.html` cards | **Default:** register/update archive hyperlink |
| Hard to review diffs | Clean Markdown diffs in git |

---

### Setup

```bash
# From repo root
pip install -r tools/requirements.txt
```

Requires Python 3.10+ (uses modern type hints).

---

### Quick start

```bash
# From repo root

# Convert sample Markdown → posts/<slug>.html AND update blog.html
python tools/md_to_post.py tools/examples/sample-post.md

# Convert only (leave blog.html untouched)
python tools/md_to_post.py drafts/my-writeup.md --no-blog

# Explicit (same as default)
python tools/md_to_post.py drafts/my-writeup.md --publish-blog
# Short form still works:
python tools/md_to_post.py drafts/my-writeup.md -b
```

---

### Full CLI usage

```text
python tools/md_to_post.py <markdown> [options]
```

| Flag | Description |
|------|-------------|
| `markdown` | Path to the `.md` source (required) |
| `-o`, `--output PATH` | Output HTML path (default: `posts/<slug>.html`) |
| `-b`, `--publish-blog` | Register/update the post card in `blog.html` (**default: on**) |
| `--no-blog` | Do not modify `blog.html` |
| `--blog-file PATH` | Alternate archive file (default: `blog.html` at repo root) |
| `--blog-snippet` | Print a ready-to-paste `research-item` card to stdout |
| `--body-only` | Emit only the converted `<article>` body (no full page shell; skips blog) |
| `--stdout` | Print full HTML to stdout instead of writing a file |
| `--dry-run` | Parse + report metadata / blog action; write nothing |

#### Examples

```bash
# Custom output path + blog registration
python tools/md_to_post.py drafts/my-writeup.md -o posts/My_Writeup.html

# Metadata + blog preview only (no files written)
python tools/md_to_post.py drafts/my-writeup.md --dry-run

# Convert without touching the archive
python tools/md_to_post.py drafts/my-writeup.md --no-blog

# Body fragment only (for debugging conversion)
python tools/md_to_post.py drafts/my-writeup.md --body-only --stdout --no-blog
```

---

### Front matter

```yaml
---
title: Your post title
description: SEO / social description
banner: ADVISORY BANNER TEXT
tag: CVE-XXXX-YYYY          # red cyber pill under nav + research-cve on blog card
subtitle: TECH // IMPACT
platform: Web Application
researcher: Naveen Jagadeesan
published: 2026-07-10       # YYYY-MM-DD → year group on blog.html
slug: your-file-name        # → posts/your-file-name.html
severity: critical           # critical | high | lab | medium (blog card badge)
target: NGINX // RCE        # grey research-target line on blog listing
---
```

Everything below the closing `---` is normal Markdown.

---

### Publishing workflow (recommended)

```bash
# 1. Write drafts/my-writeup.md with front matter + body
# 2. Generate HTML post + archive hyperlink in one step
python tools/md_to_post.py drafts/my-writeup.md

# 3. Preview from repo root (important: not from posts/)
python -m http.server 8080
# open http://127.0.0.1:8080/posts/your-slug.html
# open http://127.0.0.1:8080/blog.html

# 4. Commit both files
#    posts/<slug>.html
#    blog.html
```

#### Blog registration behavior (default)

| Situation | Result |
|-----------|--------|
| New post | Inserts a card at the **top** of that year group; assigns next numeric `data-id` |
| Same `/posts/...` href again | **Updates** the existing card (safe re-publish) |
| Year group missing | Creates a new `vendor-group` in descending year order |
| Post count label | Syncs `#archive-match-count` (`N posts`) |
| `--dry-run` | Shows the card / action without writing |
| `--no-blog` | Leaves `blog.html` alone |

Each **case-file tile** on `blog.html` includes:

| Tile field | Front matter source |
|------------|---------------------|
| CASE-00N | auto `data-id` |
| Year badge | `published` year |
| Classification | `tag` |
| Title | `title` |
| Blurb | `description` (truncated) |
| Target line | `target` |
| Platform chip | `platform` |
| Date chip | `published` |
| Severity badge | `severity` |
| Hyperlink | `/posts/<slug>.html` |

The card is a full clickable tile — not just a bare link.

### Mobile layout is global (not per-post / not in blog.html)

All responsive rules for the threat case board live in **`assets/css/style.css`** only
(e.g. `.case-file`, `.intel-hero`, `@media (max-width: 720px)`, `body.blog-archive …`).

When you run `md_to_post.py`:

- It **only** inserts/updates a case-file tile inside a year group and refreshes the case count.
- It **does not** rewrite `<head>`, nav, hero, filters, or any `<style>` block.
- It refuses to write if the blog shell would be corrupted (stylesheet link / `intel-hero` / archive anchors missing).

So publishing a new post does **not** change mobile settings. Keep using the shared classes
`research-item case-file` (emitted by the converter) so global CSS keeps applying.

Without auto-publish, generate a pasteable card with:

```bash
python tools/md_to_post.py drafts/my-writeup.md --blog-snippet --no-blog
```

---

### What generated posts include

- Inter + JetBrains Mono
- Favicon + `theme-color` (`#0a090b`)
- Black + red cyber critical CSS fallback
- `/assets/css/style.css` — post typography, **terminal-style code windows**
- highlight.js + red-cyber token overrides
- `has-site-fx post-page` body classes
- `/assets/js/site.js` — **cyber neural mesh**, nav clock, **HTTP request/response highlighter**
- Shared top-nav (Home · Blog · Writeups)
- Advisory banner, meta header, footer
- Matching `research-item` hyperlink on `blog.html` (unless `--no-blog`)

---

### Markdown tips

#### HTTP request / response

Prefer an explicit fence so chrome labels stay correct:

````markdown
```http
POST /login HTTP/1.1
Host: target.example
Content-Type: application/json
Authorization: Bearer <token>

{"user":"admin"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"ok":true}
```
````

**Aliases:** `http`, `https`, `request`, `response`, `req`, `res`.

Plain ` ```text ` / ` ```plaintext ` blocks that *start* like HTTP (`POST /…`, `HTTP/1.1 200 …`) are **auto-promoted** to `language-http`. At runtime, `site.js` colors methods, status codes (2xx soft red / 4xx amber / 5xx intense red), headers, and JSON/XML bodies under the black + red cyber theme.
