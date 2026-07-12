#!/usr/bin/env python3
"""
md_to_post.py — Convert Markdown writeups into publish-ready blog posts
for thevillagehacker.github.io.

Why this exists
---------------
Your posts share the same chrome (nav, fonts, highlight.js, site.js atmosphere).
Write content in Markdown + YAML front matter; this script emits a full HTML
page under posts/ that matches the current site template.

Current site features baked into the template
---------------------------------------------
  - style.css: post typography, terminal-style code windows (scrollable)
  - site.js: cyber neural mesh atmosphere, nav clock, HTTP req/res highlighter
  - highlight.js: generic language highlighting (HTTP bodies get JSON/XML boost
    from site.js when the block is auto-detected as request/response)

Usage
-----
  # Basic
  python tools/md_to_post.py tools/examples/sample-post.md

  # Custom output path
  python tools/md_to_post.py draft.md -o posts/My_New_Post.html

  # Preview HTML body only (no full page)
  python tools/md_to_post.py draft.md --body-only

  # Print a blog.html list-item snippet to paste
  python tools/md_to_post.py draft.md --blog-snippet

  # Write the post AND register/update it in blog.html
  python tools/md_to_post.py draft.md --publish-blog

  # Dry-run: print path + metadata, write nothing
  python tools/md_to_post.py draft.md --dry-run

Markdown front matter (YAML between --- lines)
----------------------------------------------
  ---
  title: NGINX Rift: ...
  description: Short SEO blurb
  banner: NGINX RIFT: ...          # advisory strip (defaults to title uppercased)
  tag: WEB APPLICATION SECURITY    # green cve-tag
  subtitle: NGINX // RCE           # under the H1
  platform: Web Application
  researcher: Naveen Jagadeesan
  published: 2026-07-10            # YYYY-MM-DD (default: today)
  slug: nginx-rift                 # output filename stem (default: from title)
  severity: critical               # critical | high | lab | medium (for --blog-snippet)
  target: NGINX // HTTP // RCE     # research-target line for blog listing
  ---

Body is standard Markdown. Fenced code blocks become highlight.js-ready markup.

HTTP request / response fences
------------------------------
  Prefer an explicit language tag so chrome labels stay correct:

    ```http
    POST /login HTTP/1.1
    Host: target.example
    ...
    ```

    ```http
    HTTP/1.1 200 OK
    Content-Type: application/json
    ...
    ```

  Aliases also accepted: http, https, request, response, req, res.
  Plain ```text / ```plaintext blocks that *look* like HTTP are auto-promoted
  to language-http during conversion (site.js also re-detects at runtime).

Images: ![alt](../assets/images/...) or relative paths under assets/.

Dependencies
------------
  pip install -r tools/requirements.txt
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import date
from pathlib import Path

try:
    import markdown
    from markdown.extensions.fenced_code import FencedCodeExtension
    from markdown.extensions.tables import TableExtension
    from markdown.extensions.toc import TocExtension
    from markdown.extensions.sane_lists import SaneListExtension
except ImportError as exc:
    print(
        f"Missing dependency ({exc}).\n"
        "  python -m pip install -r tools/requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)

# Repo root = parent of tools/
ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"
BLOG_HTML = ROOT / "blog.html"
DEFAULT_RESEARCHER = "Naveen Jagadeesan"
SITE_SUFFIX = "thevillagehacker"

# ---------------------------------------------------------------------------
# HTML shell — mirrors current post chrome
#   fonts · style.css (terminal code windows, post typography)
#   highlight.js · site.js (cyber mesh, clock, HTTP req/res highlighter)
# ---------------------------------------------------------------------------

# NOTE: Asset URLs are root-absolute (/assets/...) so styles load when the site is
# served from the repo root (python -m http.server, GitHub Pages, Live Server at root).
# Relative ../assets paths break if the preview server root is the posts/ folder.
POST_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
<title>{title_html} — {site_suffix}</title>
<meta name="description" content="{description_html}"/>

<!-- Critical theme fallback if stylesheet is slow/missing -->
<style>
  html,body{{background:#0f1318;color:#d4dae0;}}
  body{{font-family:"Helvetica Neue",Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.6;margin:0;}}
  a{{color:#6bb8d4;}}
</style>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<link rel="stylesheet" href="/assets/css/style.css"/>

<style>
/* Token colors for highlight.js (code window + HTTP chrome live in style.css) */
.hljs-keyword{{color:#c792ea !important;}}
.hljs-string{{color:#ecc48d !important;}}
.hljs-title{{color:#82aaff !important;}}
.hljs-comment{{color:#5c6773 !important;}}
.hljs-number{{color:#f78c6c !important;}}
.hljs-built_in{{color:#89ddff !important;}}
.hljs-attr{{color:#ffcb6b !important;}}
.hljs-attribute{{color:#ffcb6b !important;}}
.hljs-meta{{color:#6bb8d4 !important;}}
.hljs-literal{{color:#89ddff !important;}}
.hljs-name{{color:#82aaff !important;}}
.hljs-tag{{color:#89ddff !important;}}
</style>
</head>

<body class="has-site-fx post-page">

<nav class="top-nav landing-nav">
    <div class="nav-inner landing-nav-inner">
        <a href="/" class="nav-brand">
            <span class="nav-prompt">~/</span>thevillagehacker<span class="nav-path">/posts</span>
            <span class="status-dot" title="research post"></span>
        </a>
        <div class="nav-right">
            <span class="nav-clock" id="nav-clock" aria-hidden="true"></span>
            <a href="/" class="nav-link">Home</a>
            <a href="/blog.html" class="nav-link nav-link-active">Blog</a>
            <a href="https://thevillagehacker-security.gitbook.io/ctf-writeups" class="nav-link" target="_blank" rel="noopener">Writeups</a>
        </div>
    </div>
</nav>

<div class="advisory-banner">
    {banner_html}
</div>

<div class="container post-container">

<header class="header">

    <span class="cve-tag">{tag_html}</span>

    <h1>{title_html}</h1>

    <p class="subtitle">{subtitle_html}</p>

    <div class="meta">
        <div class="meta-item">
            <div class="label">researcher</div>
            <div class="value">{researcher_html}</div>
        </div>
        <div class="meta-item">
            <div class="label">published</div>
            <div class="value">{published_html}</div>
        </div>
        <div class="meta-item">
            <div class="label">platform</div>
            <div class="value">{platform_html}</div>
        </div>
    </div>

</header>

<article>

{article_html}

</article>

<footer>
    <span class="footer-text">
        © {year} <a href="/">thevillagehacker</a> — {researcher_html}
    </span>
    <span class="footer-text">
        status: active<span class="blink"></span>
    </span>
</footer>

</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>hljs.highlightAll();</script>
<!-- site.js: cyber mesh atmosphere · nav clock · HTTP request/response highlighter -->
<script src="/assets/js/site.js" defer></script>
</body>
</html>
"""

# Fence languages that map to language-http for the terminal chrome + highlighter
HTTP_LANG_ALIASES = {
    "http",
    "https",
    "request",
    "response",
    "req",
    "res",
    "httprequest",
    "httpresponse",
}

# Languages that may contain HTTP traffic and should be auto-promoted when detected
HTTP_PROMOTE_FROM = {
    "text",
    "plaintext",
    "txt",
    "plain",
}

HTTP_METHODS = (
    "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE|PRI"
)
RE_HTTP_REQUEST_LINE = re.compile(
    rf"^({HTTP_METHODS})\s+\S+",
    re.IGNORECASE | re.MULTILINE,
)
RE_HTTP_STATUS_LINE = re.compile(
    r"^HTTP/[0-9.]+",
    re.IGNORECASE | re.MULTILINE,
)
RE_CODE_BLOCK = re.compile(
    r"<pre><code(?:\s+class=\"([^\"]*)\")?>(.*?)</code></pre>",
    re.DOTALL | re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Front matter
# ---------------------------------------------------------------------------

FRONT_MATTER_RE = re.compile(
    r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z",
    re.DOTALL,
)


def parse_simple_yaml(block: str) -> dict[str, str]:
    """
    Minimal YAML subset for front matter (key: value lines).
    Supports quoted strings and multi-word values. No nested structures.
    """
    meta: dict[str, str] = {}
    for raw in block.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        meta[key] = val
    return meta


def parse_markdown_file(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    m = FRONT_MATTER_RE.match(text)
    if m:
        return parse_simple_yaml(m.group(1)), m.group(2).lstrip("\n")
    return {}, text


# ---------------------------------------------------------------------------
# Markdown → HTML
# ---------------------------------------------------------------------------

def md_to_html(md_body: str) -> str:
    extensions = [
        FencedCodeExtension(),
        TableExtension(),
        TocExtension(permalink=False),
        SaneListExtension(),
        "markdown.extensions.smarty",
        "markdown.extensions.attr_list",
    ]
    html_body = markdown.markdown(
        md_body,
        extensions=extensions,
        output_format="html5",
    )
    return postprocess_article_html(html_body)


def _first_line(text: str) -> str:
    return text.strip().split("\n", 1)[0].strip()


def looks_like_http(code_text: str) -> bool:
    """True when a fenced block starts like an HTTP request or response."""
    first = _first_line(html.unescape(code_text))
    if not first:
        return False
    if RE_HTTP_STATUS_LINE.match(first):
        return True
    if RE_HTTP_REQUEST_LINE.match(first):
        return True
    return False


def _lang_from_classes(classes: str) -> str | None:
    m = re.search(r"\blanguage-([a-zA-Z0-9_+-]+)\b", classes or "")
    return m.group(1).lower() if m else None


def _set_language_class(classes: str, lang: str) -> str:
    """Ensure class list has hljs + language-<lang>, replacing any prior language-*."""
    parts = [p for p in (classes or "").split() if p and not p.startswith("language-")]
    if "hljs" not in parts:
        parts.insert(0, "hljs")
    parts.append(f"language-{lang}")
    # de-dupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return " ".join(out)


def normalize_code_block_classes(fragment: str) -> str:
    """
    Normalize fence language classes for highlight.js + site.js:

    - bare class="python" → language-python
    - http aliases (request, response, req, …) → language-http
    - auto-promote language-text/plaintext that looks like HTTP → language-http
    - ensure hljs class is present for terminal-window styling hooks
    """

    def repl(m: re.Match[str]) -> str:
        classes = m.group(1) or ""
        code = m.group(2)

        # Promote bare language tokens: class="python" → class="language-python"
        if classes and "language-" not in classes:
            bare = classes.strip().split()[0]
            if re.fullmatch(r"[a-zA-Z0-9_+-]+", bare):
                classes = f"language-{bare}"

        lang = _lang_from_classes(classes)

        # Explicit HTTP aliases from Markdown fences
        if lang in HTTP_LANG_ALIASES:
            classes = _set_language_class(classes, "http")
        elif lang is None and looks_like_http(code):
            classes = _set_language_class(classes, "http")
        elif lang in HTTP_PROMOTE_FROM and looks_like_http(code):
            classes = _set_language_class(classes, "http")
        elif lang:
            classes = _set_language_class(classes, lang)
        else:
            # untagged fence — keep as plaintext but still add hljs for chrome
            classes = _set_language_class(classes, "plaintext")

        return f'<pre><code class="{classes}">{code}</code></pre>'

    return RE_CODE_BLOCK.sub(repl, fragment)


def postprocess_article_html(fragment: str) -> str:
    """
    - Map ```lang fences to highlight.js classes (language-xxx)
    - Promote HTTP traffic fences to language-http
    - Wrap bare <img> in <figure class="post-shot"> when not already in one
    - Normalize image paths to root-absolute /assets/...
    """
    # Normalize asset URLs to site-root absolute paths
    def fix_src(m: re.Match[str]) -> str:
        src = m.group(1)
        if src.startswith("../assets/"):
            src = src[2:]  # -> /assets/...
        elif src.startswith("assets/"):
            src = "/" + src
        elif src.startswith("./assets/"):
            src = src[1:]
        return f'src="{src}"'

    fragment = re.sub(r'src="([^"]+)"', fix_src, fragment)

    # Code fences → hljs / language-http / language-*
    fragment = normalize_code_block_classes(fragment)

    # Only wrap <p><img ...></p> patterns common from markdown images.
    # figure.post-shot gets macOS-style centered drop shadow via style.css
    fragment = re.sub(
        r"<p>\s*(<img\b[^>]*>)\s*</p>",
        lambda m: f'<figure class="post-shot">\n    {m.group(1)}\n</figure>',
        fragment,
    )

    # Ensure existing <figure> wrappers get the presentation class
    fragment = re.sub(
        r"<figure(?![^>]*\bpost-shot\b)([^>]*)>",
        r'<figure class="post-shot"\1>',
        fragment,
    )

    return fragment.strip() + "\n"


# ---------------------------------------------------------------------------
# Metadata helpers
# ---------------------------------------------------------------------------

def slugify(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"['’]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s or "post"


def severity_tag_class(severity: str) -> tuple[str, str]:
    s = (severity or "critical").strip().lower()
    if s in ("lab", "medium", "info"):
        return "tag-medium", "LAB" if s == "lab" else s.upper()
    if s == "high":
        return "tag-high", "HIGH"
    return "tag-critical", "CRITICAL"


def resolve_meta(raw: dict[str, str], md_path: Path) -> dict[str, str]:
    title = raw.get("title") or md_path.stem.replace("-", " ").replace("_", " ").title()
    published = raw.get("published") or date.today().isoformat()
    year = published[:4] if re.match(r"\d{4}", published) else str(date.today().year)
    slug = raw.get("slug") or slugify(title)
    # sanitize slug for filesystem
    slug = re.sub(r"[^\w.\-]+", "_", slug).strip("._") or "post"

    banner = raw.get("banner") or title.upper()
    description = raw.get("description") or f"Security research: {title}"
    tag = raw.get("tag") or raw.get("cve_tag") or "SECURITY RESEARCH"
    subtitle = raw.get("subtitle") or ""
    platform = raw.get("platform") or "Web Application"
    researcher = raw.get("researcher") or DEFAULT_RESEARCHER
    severity = raw.get("severity") or "critical"
    target = raw.get("target") or subtitle or tag

    return {
        "title": title,
        "description": description,
        "banner": banner,
        "tag": tag,
        "subtitle": subtitle,
        "platform": platform,
        "researcher": researcher,
        "published": published,
        "year": year,
        "slug": slug,
        "severity": severity,
        "target": target,
    }


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def build_page(meta: dict[str, str], article_html: str) -> str:
    return POST_TEMPLATE.format(
        title_html=esc(meta["title"]),
        description_html=esc(meta["description"]),
        banner_html=esc(meta["banner"]),
        tag_html=esc(meta["tag"]),
        subtitle_html=esc(meta["subtitle"]),
        researcher_html=esc(meta["researcher"]),
        published_html=esc(meta["published"]),
        platform_html=esc(meta["platform"]),
        article_html=article_html,
        year=esc(meta["year"]),
        site_suffix=SITE_SUFFIX,
    )


def post_href(out_name: str) -> str:
    """Canonical archive href for a post filename."""
    name = out_name.replace("\\", "/").lstrip("/")
    if name.startswith("posts/"):
        return f"/{name}"
    return f"/posts/{name}"


def build_blog_tags(meta: dict[str, str]) -> str:
    tags = " ".join(
        filter(
            None,
            [
                meta["title"].lower(),
                meta["tag"].lower(),
                meta["target"].lower(),
                meta["severity"].lower(),
                meta["year"],
            ],
        )
    )
    tags = re.sub(r"[^a-z0-9.\-/\s]+", " ", tags)
    return re.sub(r"\s+", " ", tags).strip()


def research_item_html(
    meta: dict[str, str],
    out_name: str,
    data_id: str,
) -> str:
    """One archive card matching the blog.html research-item shape."""
    css, label = severity_tag_class(meta["severity"])
    href = post_href(out_name)
    tags = build_blog_tags(meta)
    # Match indentation used in blog.html (16 spaces for the <a>)
    return f"""\
                <a href="{esc(href)}" class="research-item"
                   data-id="{esc(str(data_id))}"
                   data-year="{esc(meta['year'])}"
                   data-severity="{esc(meta['severity'].lower())}"
                   data-tags="{esc(tags)}">
                    <div class="research-info">
                        <div class="research-cve">{esc(meta['tag'])}</div>
                        <div class="research-title">{esc(meta['title'])}</div>
                        <div class="research-target">{esc(meta['target'])}</div>
                    </div>
                    <div class="research-tag {css}">{label}</div>
                </a>
"""


def blog_snippet(meta: dict[str, str], out_name: str, data_id: str = "NEWID") -> str:
    item = research_item_html(meta, out_name, data_id).rstrip() + "\n"
    return (
        f"<!-- paste into blog.html inside the {meta['year']} vendor-group "
        f"(or use --publish-blog) -->\n{item}"
    )


# ---------------------------------------------------------------------------
# blog.html registration
# ---------------------------------------------------------------------------

RE_DATA_ID = re.compile(r'data-id="(\d+)"')
RE_VENDOR_GROUP = re.compile(
    r'<div class="vendor-group" data-year="(\d{4})">',
    re.IGNORECASE,
)
RE_RESEARCH_ITEM = re.compile(
    r'<a\s+href="([^"]+)"\s+class="research-item"[\s\S]*?</a>\s*',
    re.IGNORECASE,
)


def next_blog_data_id(blog_html: str) -> int:
    ids = [int(x) for x in RE_DATA_ID.findall(blog_html)]
    return (max(ids) if ids else 0) + 1


def find_existing_item_id(blog_html: str, href: str) -> str | None:
    """Return data-id for an existing card with this href, if any."""
    for m in RE_RESEARCH_ITEM.finditer(blog_html):
        if m.group(1) == href:
            id_m = re.search(r'data-id="([^"]+)"', m.group(0))
            return id_m.group(1) if id_m else None
    return None


def _find_matching_close_div(html: str, open_pos: int) -> int:
    """
    Given index of a '<div ...>', return index just after its matching '</div>'.
    """
    # Find the end of the opening tag
    tag_end = html.find(">", open_pos)
    if tag_end < 0:
        raise ValueError("malformed div open tag")
    i = tag_end + 1
    depth = 1
    while i < len(html) and depth > 0:
        next_open = html.find("<div", i)
        next_close = html.find("</div>", i)
        if next_close < 0:
            raise ValueError("unclosed div while parsing blog.html vendor-group")
        if next_open != -1 and next_open < next_close:
            depth += 1
            i = next_open + 4
        else:
            depth -= 1
            i = next_close + len("</div>")
    return i


def _vendor_group_span(html: str, year: str) -> tuple[int, int] | None:
    for m in RE_VENDOR_GROUP.finditer(html):
        if m.group(1) == year:
            end = _find_matching_close_div(html, m.start())
            return m.start(), end
    return None


def _insert_item_into_group(group_html: str, item_html: str) -> str:
    """
    Insert research-item as the first card after the year label
    (newest-first within the year).

    Careful not to consume indentation belonging to the next card.
    """
    label_re = re.compile(
        r'(<div class="vendor-label">[^<]*</div>)(\r?\n)?',
        re.IGNORECASE,
    )
    m = label_re.search(group_html)
    if not m:
        # Fallback: after opening vendor-group tag
        open_end = group_html.find(">") + 1
        return group_html[:open_end] + "\n" + item_html + group_html[open_end:]
    # Always leave a blank line after the label, then the new card
    return group_html[: m.end()] + "\n" + item_html + group_html[m.end() :]


def _year_group_block(year: str, item_html: str) -> str:
    return (
        f"""\
            <!-- {year} -->
            <div class="vendor-group" data-year="{year}">
                <div class="vendor-label">{year}</div>

{item_html.rstrip()}
            </div>
"""
    )


def _insert_new_year_group(html: str, year: str, group_block: str) -> str:
    """
    Insert a new vendor-group among existing ones (years descending).
    """
    year_i = int(year)
    starts = list(RE_VENDOR_GROUP.finditer(html))
    if not starts:
        # After archive section label / empty-state
        anchor = re.search(
            r'(id="empty-state"[^>]*>.*?</span>\s*</div>\s*)',
            html,
            re.DOTALL | re.IGNORECASE,
        )
        if anchor:
            pos = anchor.end()
            return html[:pos] + "\n" + group_block + html[pos:]
        # Last resort: before </section> of archive-list
        sec = html.find('id="archive-list"')
        close = html.find("</section>", sec if sec >= 0 else 0)
        if close >= 0:
            return html[:close] + group_block + "\n" + html[close:]
        raise ValueError("could not find archive-list insertion point in blog.html")

    # Insert before first group with smaller year; else after last group
    insert_before: int | None = None
    last_end = 0
    for m in starts:
        y = int(m.group(1))
        end = _find_matching_close_div(html, m.start())
        last_end = end
        if y < year_i and insert_before is None:
            insert_before = m.start()
            break

    if insert_before is not None:
        return html[:insert_before] + group_block + "\n" + html[insert_before:]
    return html[:last_end] + "\n" + group_block + html[last_end:]


def publish_to_blog(
    meta: dict[str, str],
    out_name: str,
    blog_path: Path | None = None,
    *,
    dry_run: bool = False,
) -> dict[str, str]:
    """
    Insert or update a research-item card in blog.html.

    Returns a small status dict: action, href, data_id, blog path.
    """
    blog_path = blog_path or BLOG_HTML
    if not blog_path.is_file():
        raise FileNotFoundError(f"blog.html not found: {blog_path}")

    original = blog_path.read_text(encoding="utf-8")
    href = post_href(out_name)
    existing_id = find_existing_item_id(original, href)
    if existing_id is not None:
        data_id = existing_id
        action = "updated"
    else:
        data_id = str(next_blog_data_id(original))
        action = "inserted"

    item = research_item_html(meta, out_name, data_id)
    year = meta["year"]
    html_out = original

    # Replace existing card with same href (idempotent re-publish)
    item_pat = re.compile(
        rf'<a\s+href="{re.escape(href)}"\s+class="research-item"[\s\S]*?</a>\s*',
        re.IGNORECASE,
    )
    if item_pat.search(html_out):
        html_out = item_pat.sub(item.rstrip() + "\n\n", html_out, count=1)
        # If year changed, the card stays in the old year group on simple replace.
        # Detect mismatch and relocate.
        m_old = re.search(
            rf'href="{re.escape(href)}"[^>]*data-year="(\d{{4}})"',
            original,
            re.IGNORECASE,
        )
        old_year = m_old.group(1) if m_old else year
        if old_year != year:
            # Remove from current place and re-insert into correct year
            html_out = item_pat.sub("", html_out, count=1)
            action = "moved"
            # fall through to insert path with html_out cleaned
            span = _vendor_group_span(html_out, year)
            if span:
                g0, g1 = span
                group = html_out[g0:g1]
                # Avoid double if somehow still present
                group = item_pat.sub("", group)
                new_group = _insert_item_into_group(group, item)
                html_out = html_out[:g0] + new_group + html_out[g1:]
            else:
                html_out = _insert_new_year_group(
                    html_out, year, _year_group_block(year, item)
                )
        # else: already replaced in place — done
    else:
        span = _vendor_group_span(html_out, year)
        if span:
            g0, g1 = span
            group = html_out[g0:g1]
            new_group = _insert_item_into_group(group, item)
            html_out = html_out[:g0] + new_group + html_out[g1:]
        else:
            html_out = _insert_new_year_group(
                html_out, year, _year_group_block(year, item)
            )
            action = "inserted-year"

    status = {
        "action": action,
        "href": href,
        "data_id": str(data_id),
        "year": year,
        "blog": str(blog_path),
    }

    if dry_run:
        status["action"] = f"dry-run:{action}"
        return status

    if html_out != original:
        blog_path.write_text(html_out, encoding="utf-8", newline="\n")
    return status


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Convert Markdown + YAML front matter into a publish-ready blog post HTML page.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python tools/md_to_post.py tools/examples/sample-post.md\n"
            "  python tools/md_to_post.py draft.md --publish-blog\n"
            "  python tools/md_to_post.py draft.md -b --dry-run\n"
        ),
    )
    parser.add_argument(
        "markdown",
        type=Path,
        help="Path to the Markdown source file",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Output HTML path (default: posts/<slug>.html)",
    )
    parser.add_argument(
        "--body-only",
        action="store_true",
        help="Write only the converted <article> body HTML",
    )
    parser.add_argument(
        "--blog-snippet",
        action="store_true",
        help="Also print a blog.html research-item snippet to stdout",
    )
    parser.add_argument(
        "-b",
        "--publish-blog",
        action="store_true",
        help="Register or update this post in blog.html (archive card)",
    )
    parser.add_argument(
        "--blog-file",
        type=Path,
        default=None,
        help=f"Path to blog archive HTML (default: {BLOG_HTML.name})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and report metadata without writing files",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Print full HTML to stdout instead of writing a file",
    )
    args = parser.parse_args(argv)

    md_path = args.markdown
    if not md_path.is_file():
        print(f"error: file not found: {md_path}", file=sys.stderr)
        return 1

    raw_meta, body = parse_markdown_file(md_path)
    meta = resolve_meta(raw_meta, md_path)
    article_html = md_to_html(body)

    if args.body_only:
        page = article_html
    else:
        page = build_page(meta, article_html)

    out_path = args.output
    if out_path is None:
        out_path = POSTS_DIR / f"{meta['slug']}.html"

    print("── metadata ──────────────────────────")
    for k in (
        "title",
        "slug",
        "published",
        "tag",
        "platform",
        "severity",
        "researcher",
    ):
        print(f"  {k:12} {meta[k]}")
    print(f"  output       {out_path}")
    print("─────────────────────────────────────")

    if args.dry_run:
        print("dry-run: no files written")
        if args.blog_snippet or args.publish_blog:
            blog_path = args.blog_file or BLOG_HTML
            preview_id = "NEWID"
            if blog_path.is_file():
                try:
                    existing = find_existing_item_id(
                        blog_path.read_text(encoding="utf-8"),
                        post_href(out_path.name),
                    )
                    preview_id = existing or str(
                        next_blog_data_id(blog_path.read_text(encoding="utf-8"))
                    )
                except OSError:
                    pass
            print("\n── blog.html snippet ─────────────────")
            print(blog_snippet(meta, out_path.name, preview_id))
        if args.publish_blog:
            try:
                status = publish_to_blog(
                    meta,
                    out_path.name,
                    args.blog_file or BLOG_HTML,
                    dry_run=True,
                )
                print(
                    f"blog: would {status['action']} "
                    f"id={status['data_id']} href={status['href']} "
                    f"year={status['year']}"
                )
            except (OSError, ValueError) as exc:
                print(f"blog: dry-run failed: {exc}", file=sys.stderr)
                return 1
        return 0

    if args.stdout:
        sys.stdout.write(page)
        if not page.endswith("\n"):
            sys.stdout.write("\n")
    else:
        out_path = out_path.resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(page, encoding="utf-8", newline="\n")
        rel = (
            out_path.relative_to(ROOT)
            if out_path.is_relative_to(ROOT)
            else out_path
        )
        print(f"wrote {rel}")

    if args.publish_blog:
        if args.body_only:
            print(
                "warning: --publish-blog ignored with --body-only",
                file=sys.stderr,
            )
        elif args.stdout and args.output is None:
            # Still allow blog registration using slug-based filename
            pass
        try:
            status = publish_to_blog(
                meta,
                out_path.name,
                args.blog_file or BLOG_HTML,
                dry_run=False,
            )
            blog_rel = Path(status["blog"])
            try:
                blog_rel = blog_rel.resolve().relative_to(ROOT)
            except ValueError:
                pass
            print(
                f"blog: {status['action']} id={status['data_id']} "
                f"href={status['href']} year={status['year']} → {blog_rel}"
            )
        except (OSError, ValueError) as exc:
            print(f"error: failed to update blog.html: {exc}", file=sys.stderr)
            return 1

    if args.blog_snippet:
        blog_path = args.blog_file or BLOG_HTML
        snippet_id = "NEWID"
        if blog_path.is_file():
            text = blog_path.read_text(encoding="utf-8")
            snippet_id = (
                find_existing_item_id(text, post_href(out_path.name))
                or str(next_blog_data_id(text))
            )
        print("\n── blog.html snippet ─────────────────")
        print(blog_snippet(meta, out_path.name, snippet_id))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
