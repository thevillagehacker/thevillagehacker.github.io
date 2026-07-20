# Blog tooling

## `md_to_post.py` — Markdown → publish-ready HTML

Convert research writeups from Markdown + YAML front matter into full HTML posts that match the live site chrome (nav, terminal code windows, cyber mesh, HTTP highlighting). Optionally register the post on `blog.html` in one step.

| Without a converter | With `md_to_post.py` |
|---------------------|----------------------|
| Copy-paste an old HTML post | One Markdown file + front matter |
| Easy to forget `site.js` / fonts | Template always includes current chrome |
| Manual `blog.html` cards | `--publish-blog` inserts/updates the archive |
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

# 1) Convert sample Markdown → posts/<slug>.html (does not touch blog.html)
python tools/md_to_post.py tools/examples/sample-post.md

# 2) Convert + register/update the archive card on blog.html
python tools/md_to_post.py drafts/my-writeup.md --publish-blog

# Short form of the same:
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
| `-b`, `--publish-blog` | Insert or update the post card in `blog.html` |
| `--blog-file PATH` | Alternate archive file (default: `blog.html` at repo root) |
| `--blog-snippet` | Print a ready-to-paste `research-item` card to stdout |
| `--body-only` | Emit only the converted `<article>` body (no full page shell) |
| `--stdout` | Print full HTML to stdout instead of writing a file |
| `--dry-run` | Parse + report metadata / blog action; write nothing |

#### Examples

```bash
# Custom output path
python tools/md_to_post.py drafts/my-writeup.md -o posts/My_Writeup.html

# Metadata + blog preview only (no files written)
python tools/md_to_post.py drafts/my-writeup.md --publish-blog --dry-run

# Convert post, register on blog, and also print the card
python tools/md_to_post.py drafts/my-writeup.md -b --blog-snippet

# Body fragment only (for debugging conversion)
python tools/md_to_post.py drafts/my-writeup.md --body-only --stdout
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
severity: critical           # critical | high | lab (blog card badge)
target: NGINX // RCE        # grey research-target line on blog listing
---
```

Everything below the closing `---` is normal Markdown.

---

### Publishing workflow (recommended)

```bash
# 1. Write drafts/my-writeup.md with front matter + body
# 2. Generate HTML and register on the archive
python tools/md_to_post.py drafts/my-writeup.md --publish-blog

# 3. Preview from repo root (important: not from posts/)
python -m http.server 8080
# open http://127.0.0.1:8080/posts/your-slug.html
# open http://127.0.0.1:8080/blog.html

# 4. Commit both files
#    posts/<slug>.html
#    blog.html
```

#### `--publish-blog` behavior

| Situation | Result |
|-----------|--------|
| New post | Inserts a card at the **top** of that year group; assigns next numeric `data-id` |
| Same `/posts/...` href again | **Updates** the existing card (safe re-publish) |
| Year group missing | Creates a new `vendor-group` in descending year order |
| `--dry-run` | Shows the card / action without writing |

Card fields come from front matter: `title`, `tag`, `target`, `severity`, `published` (year).

Without `--publish-blog`, generate a pasteable card with:

```bash
python tools/md_to_post.py drafts/my-writeup.md --blog-snippet
```

---

### What generated posts include

- Inter + JetBrains Mono
- `/assets/css/style.css` — post typography, **terminal-style code windows** (fixed chrome, snug height, x/y scroll)
- highlight.js + token color fallbacks
- `has-site-fx post-page` body classes
- `/assets/js/site.js` — **cyber neural mesh**, nav clock, **HTTP request/response highlighter**
- Shared top-nav (Home · Blog · Writeups)
- Advisory banner, meta header, footer
- Inline **black + red cyber** theme fallback so the page never flashes unstyled white
- Favicon + `theme-color` aligned with the live site

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

#### Other fences

````markdown
```python
print("ok")
```

```bash
curl -i https://target/
```

```json
{"ok": true}
```
````

#### Images

```markdown
![diagram](../assets/images/blogs/my-post/flow.webp)
```

Paths are normalized to root-absolute `/assets/...`. Images are wrapped in `<figure class="post-shot">` for the macOS-style shadow presentation.

---

### Preview locally

Serve from the **repo root** (not from `posts/`):

```bash
python -m http.server 8080
# http://127.0.0.1:8080/posts/your-slug.html
# http://127.0.0.1:8080/blog.html
```

If the server root is `posts/`, `/assets/...` will 404 and the page looks unstyled.

---

### Sample source

`tools/examples/sample-post.md` — demo front matter, code fences, HTTP request/response, table, image path.

```bash
python tools/md_to_post.py tools/examples/sample-post.md --dry-run
```

Do **not** leave the sample registered on `blog.html` in production; use `--dry-run` or delete the card if you tested `--publish-blog` against the real archive.

---

### Notes

- The converter never deletes posts; it only writes HTML and optionally updates `blog.html`.
- When site chrome changes, update `POST_TEMPLATE` / `postprocess_article_html` / `publish_to_blog` in `md_to_post.py` so new posts stay in sync.
