---
title: "Ni8mare: Unauthenticated File Read in n8n Form Workflows"
description: "Breakdown of CVE-2026-21858. A content-type mix-up in n8n form workflows lets an unauthenticated caller choose which file the server reads. Fixed in 1.121.0."
banner: CVE-2026-21858 // CONTENT-TYPE CONFUSION // FORM WORKFLOWS
tag: CVE-2026-21858
subtitle: n8n 1.65.0–1.120.x // FORM WEBHOOK // FILE READ
platform: n8n Workflow Automation
researcher: Naveen Jagadeesan
published: 2026-04-17
slug: ni8mare-n8n-unauth-rce
severity: critical
target: n8n // Form Workflows // File Read
---

## Why this finding matters

**Ni8mare (CVE-2026-21858)** is a content-type confusion bug in n8n, disclosed by Dor Attias at Cyera on 7 January 2026. It is not a generic path traversal in multipart filenames. On instances from **1.65.0 up to, but not including, 1.121.0**, a form-based workflow that handles uploads can be talked into reading a file the caller names. NVD scores the issue critical. The fix is **1.121.0**.

This note is a breakdown of the public advisory. I did not discover the bug.

Automation hosts are attractive because they sit between the internet and internal systems, and they often store the credentials those workflows use. A file read on that host is already a serious bug. What an attacker can do after the read depends on what the file contains and which execution features that instance has turned on.

![A plain envelope set into the parcel slot of a mail sorter](/assets/images/blogs/ni8mare-n8n-unauth-rce.jpg)

## Working theory

When a workflow engine exposes a public form, four questions matter:

1. What can an unauthenticated caller reach? Form webhooks are meant to be public.
2. Which parser runs? n8n uses a file-upload parser for `multipart/form-data` and an ordinary body parser for JSON.
3. Does the file-handling code check that the upload parser actually ran?
4. Which path does it then open?

The theory that matches the advisory: if a form node copies `body.files[].filepath` without confirming the request was multipart, a JSON body can supply that object. The upload parser normally fills `filepath` with a random temporary path. The JSON parser will accept whatever path the caller puts there.

That is a precondition bug. It needs a **form workflow that processes a file field**. A stock n8n with no such workflow is not automatically exposed.

## What actually goes wrong

| Stage | What fails | Result |
|------|------------|--------|
| 1 | Form webhook is public by design | Unauthenticated request reaches the node |
| 2 | File helper trusts `body.files` for any content type | Caller picks the path |
| 3 | `multipart/form-data` is not required | JSON body is parsed as normal JSON |
| 4 | `filepath` is opened on the server | Arbitrary file read |

The patched check is the one the public fix describes: reject the request unless the content type is `multipart/form-data`, and keep using the upload parser's temporary paths.

### The request shape

A real upload is `multipart/form-data`. The vulnerable case is the other content type. The field names below match the shape described in public writeups of the form node (`files`, then the field, then `filepath`). Hosts and workflow ids vary.

```http
POST /form/<form-id> HTTP/1.1
Host: n8n.example
Content-Type: application/json

{
  "files": {
    "field-0": {
      "filepath": "/etc/passwd",
      "originalFilename": "note.txt",
      "mimeType": "text/plain"
    }
  }
}
```

A filename such as `../../../../etc/passwd` inside a genuine multipart upload is the wrong mental model. The multipart parser does not trust that name as the path it opens. The JSON body does, because it never went through that parser.

## What the read is worth

Once the node will open an attacker-chosen path, the useful files on an n8n host are the ones that hold configuration, the database, and whatever the instance uses to sign sessions. A read of those files can expose credentials stored for workflows. That is the impact the advisory warns about: sensitive data on the server, and further compromise that depends on the deployment and on the workflows people have built.

Code execution is not automatic.

- The Execute Command node is off unless the instance sets the option that allows it.
- A separate bug, **CVE-2025-68613**, later showed expression injection into n8n's sandbox. That is a different issue, fixed in the 1.120.4 / 1.121.0 line. It is not the content-type bug.

Treat "file read" and "shell" as two steps. The first is CVE-2026-21858. The second needs something else: a recovered secret plus an enabled execution feature, or a different vulnerability.

## Chain, stated carefully

```text
public form workflow that handles a file
        |
        v
JSON body instead of multipart/form-data
        |
        v
node reads body.files[].filepath
        |
        v
file on the n8n host
        |
        v
impact follows whatever that file contains
```

## Why this class keeps showing up

Three product choices make parser bugs expensive on automation platforms:

1. Public triggers accept several body types on one route.
2. Secrets for those workflows live on the same host, readable by the same user.
3. Powerful nodes exist. Whether they run is a configuration question, not a reason to ignore the read.

Each choice can look reasonable alone. Together, a parser mistake becomes access to the credentials the product is holding for its users.

## Remediation

- Upgrade to **n8n 1.121.0** or later. That release rejects this content-type confusion.
- On instances you cannot upgrade the same day, take public form workflows offline, or restrict who can reach them.
- Rotate credentials and API keys stored in workflows if a vulnerable form was exposed.
- Keep command and code nodes off on internet-facing instances unless you have a reason to run them.
- Read [GHSA-v4pr-fm98-w9pg](https://github.com/n8n-io/n8n/security/advisories/GHSA-v4pr-fm98-w9pg) and the [Cyera writeup](https://www.cyera.com/research-labs/ni8mare-unauthenticated-remote-code-execution-in-n8n-cve-2026-21858) for the vendor's version range and credit.

The guard the fix adds is small. The file helper has to know which parser ran:

```javascript
if (req.contentType !== "multipart/form-data") {
  throw new Error("Expected multipart/form-data");
}
```

A matching allowlist on the directory, after the content-type check, is the second half. The temporary path from the upload parser should be the only path that helper opens.

## Takeaway

CVE-2026-21858 is a lesson in which parser you trusted. The dangerous assumption was that `body.files` only exists after the upload parser has filled it. When a public form will open `filepath` for a JSON body, the rest of the compromise is about what is on disk, not about a clever filename.
