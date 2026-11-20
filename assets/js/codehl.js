/* Code-window highlighting.
   highlight.js covers JavaScript, JSON, and the common languages.
   HTTP and PowerShell grammars are loaded beside this file.
   HTTP header values and status reasons are colored here, because the
   HTTP grammar leaves them as plain text. Shell fences get command,
   flag, string, and number tokens so a command line is not one color. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", api.boot);
    } else {
      api.boot();
    }
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  function esc(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function span(cls, text) {
    return '<span class="hljs-' + cls + '">' + esc(text) + "</span>";
  }

  function langOf(el) {
    var match = (el.className || "").match(/language-([A-Za-z0-9_+-]+)/);
    return match ? match[1].toLowerCase() : "";
  }

  function enhanceHttpHtml(html) {
    html = html.replace(
      /(<span class="hljs-punctuation">: <\/span>)([^<\n]+)/g,
      '$1<span class="hljs-string">$2</span>'
    );
    html = html.replace(
      /(<span class="hljs-number">\d{3}<\/span>)([ \t]+)([^<\n]+)/,
      '$1$2<span class="hljs-string">$3</span>'
    );
    return html;
  }

  function highlightShellLine(line) {
    var i = 0;
    var out = "";
    var firstWord = true;

    while (i < line.length) {
      var rest = line.slice(i);

      if (rest[0] === " " || rest[0] === "\t") {
        out += rest[0];
        i += 1;
        continue;
      }

      if (rest[0] === "#") {
        out += span("comment", rest);
        break;
      }

      if (rest[0] === "'" || rest[0] === '"') {
        var quote = rest[0];
        var j = 1;
        while (j < rest.length) {
          if (rest[j] === "\\" && j + 1 < rest.length) {
            j += 2;
            continue;
          }
          if (rest[j] === quote) {
            j += 1;
            break;
          }
          j += 1;
        }
        out += span("string", rest.slice(0, j));
        i += j;
        firstWord = false;
        continue;
      }

      var url = rest.match(/^https?:\/\/[^\s'"|&;<>]+/);
      if (url) {
        out += span("string", url[0]);
        i += url[0].length;
        firstWord = false;
        continue;
      }

      var flag = rest.match(/^--?[A-Za-z0-9][\w.-]*(?:=[^\s'"|&;<>]+)?/);
      if (flag) {
        out += span("attr", flag[0]);
        i += flag[0].length;
        firstWord = false;
        continue;
      }

      var op = rest.match(/^[|&;<>]+/);
      if (op) {
        out += span("punctuation", op[0]);
        i += op[0].length;
        continue;
      }

      var ip = rest.match(/^\d{1,3}(?:\.\d{1,3}){3}/);
      if (ip) {
        out += span("number", ip[0]);
        i += ip[0].length;
        firstWord = false;
        continue;
      }

      var num = rest.match(/^\d+(?:\.\d+)?/);
      if (num) {
        out += span("number", num[0]);
        i += num[0].length;
        firstWord = false;
        continue;
      }

      var word = rest.match(/^[A-Za-z_][\w.-]*/);
      if (word && firstWord) {
        out += span("built_in", word[0]);
        i += word[0].length;
        firstWord = false;
        continue;
      }

      var tok = rest.match(/^[^ \t#'"|;&<>]+/);
      if (tok) {
        out += esc(tok[0]);
        i += tok[0].length;
        firstWord = false;
        continue;
      }

      out += esc(rest[0]);
      i += 1;
      firstWord = false;
    }

    return out;
  }

  function highlightShell(src) {
    var text = String(src).replace(/\n$/, "");
    return text.split("\n").map(highlightShellLine).join("\n");
  }

  function looksLikeShellPayload(src) {
    var text = String(src);
    if (text.indexOf("→") !== -1 || text.indexOf("->") !== -1) {
      return false;
    }
    if (/^\s*v\s*$/m.test(text)) {
      return false;
    }
    var lines = text.split("\n").map(function (line) {
      return line.trim();
    }).filter(Boolean);
    if (!lines.length || lines.length > 8) {
      return false;
    }
    return lines.every(function (line) {
      return (
        /^[|;&]/.test(line) ||
        /^(ping|curl|powershell|cmd|python|bash|sh)\b/i.test(line) ||
        /https?:\/\//.test(line)
      );
    });
  }

  function paint(el, html) {
    el.innerHTML = html;
    el.classList.add("hljs");
    el.dataset.highlighted = "yes";
  }

  function boot() {
    if (!rootReady()) return;
    var hljs = window.hljs;
    document.querySelectorAll("pre code").forEach(function (el) {
      var lang = langOf(el);
      if (lang === "http" && hljs && hljs.getLanguage("http")) {
        var http = hljs.highlight(el.textContent, {
          language: "http",
          ignoreIllegals: true
        });
        paint(el, enhanceHttpHtml(http.value));
        return;
      }
      if (lang === "bash" || lang === "sh" || lang === "shell") {
        paint(el, highlightShell(el.textContent));
        return;
      }
      if (lang === "text" || lang === "plaintext" || lang === "txt") {
        if (looksLikeShellPayload(el.textContent)) {
          paint(el, highlightShell(el.textContent));
        } else {
          el.dataset.highlighted = "yes";
        }
      }
    });
    if (hljs) {
      hljs.highlightAll();
    }
  }

  function rootReady() {
    return typeof document !== "undefined";
  }

  return {
    boot: boot,
    enhanceHttpHtml: enhanceHttpHtml,
    highlightShell: highlightShell,
    looksLikeShellPayload: looksLikeShellPayload
  };
});
