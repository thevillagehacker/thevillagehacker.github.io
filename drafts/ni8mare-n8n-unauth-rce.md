---
title: "Ni8mare: Unauthenticated RCE in n8n via Parser Confusion"
description: "Technical breakdown of CVE-2026-21858 — content-type confusion to arbitrary file read, session forgery, workflow injection, and unauthenticated remote code execution in n8n."
banner: CONTENT-TYPE CONFUSION // FILE READ // WORKFLOW RCE
tag: CVE-2026-21858
subtitle: n8n // PARSER TRUST // EXECUTION SINKS
platform: n8n Workflow Automation
researcher: Naveen Jagadeesan
published: 2026-04-17
slug: ni8mare-n8n-unauth-rce
severity: critical
target: n8n // Webhooks // Workflow Engine
---

## Why this finding matters

This is not a “single bad `exec()`” bug report. **Ni8mare (CVE-2026-21858)** is a **compound trust-boundary failure**: parser ambiguity becomes file read, file read becomes identity, identity becomes workflow authorship, and workflow authorship becomes OS command execution.

Automation platforms are attractive targets because they sit between the internet and internal systems — and they often treat “workflow definitions” as data while executing them as code.

## Working theory (how I framed the hunt)

When reviewing workflow engines, I start from a simple model:

1. **What can an unauthenticated caller touch?** (webhooks, form triggers, public APIs)
2. **What does the parser believe about the body?** (JSON vs multipart vs raw)
3. **Where does that belief become a filesystem or code path?**
4. **What secrets or session material are on disk?**
5. **Which sinks turn “admin capability” into process execution?**

The theory for n8n was: *if webhook parsing is content-type flexible, a mismatch between declared type and actual structure can smuggle path-like fields into code paths that assume trusted multipart handling — and automation nodes already know how to run commands.*

That theory maps cleanly onto a multi-stage chain rather than a one-shot payload.

## Root cause shape

The issue is best understood as stacked failures:

| Stage | Failure | Result |
|------|---------|--------|
| 1 | Content-Type / parser confusion | Unauthenticated request accepted into unexpected handler path |
| 2 | Unsafe path / body handling | Arbitrary file read |
| 3 | Secrets on disk / weak session material | Credential or signing secret recovery |
| 4 | Session forgery | Authenticated / privileged context |
| 5 | Workflow write + execute | Code path to `executeCommand`-class sinks |
| 6 | Unsandboxed OS execution | Full RCE |

## Stage analysis

### 1) Unauthenticated entry via webhooks

Public webhook endpoints are intentionally internet-facing. That is correct product design — but it means **every parser assumption on that path is a security boundary**.

### 2) Content-Type confusion → file access

When request parsing branches on `Content-Type` without hard enforcement, an attacker can present a body that one subsystem treats as multipart/file metadata while another treats it as structured fields.

```http
POST /webhook/test HTTP/1.1
Host: n8n.target.local
Content-Type: multipart/form-data; boundary=----XYZ

------XYZ
Content-Disposition: form-data; name="file"; filename="../../../../etc/passwd"
Content-Type: text/plain

x
------XYZ--
```

The exact field names vary by version and node configuration, but the **class** of bug is consistent: *user-influenced paths crossing from “upload metadata” into “read this path”.*

### 3) File read → identity material

Once arbitrary read exists, the search prioritizes:

- configuration / env material
- database files containing user records
- session signing secrets
- encryption keys used for cookies or JWTs

A file-read primitive against an automation host is rarely “just LFI.” It is usually **pre-auth for the next stage**.

### 4) Session forgery

If a signing secret or session blob is recoverable:

```javascript
// conceptual — forge a privileged session after secret recovery
const session = sign({ role: "admin" }, SECRET);
```

Parser confusion + file read becomes **authentication bypass**.

### 5) Workflow injection as code execution

n8n workflows are executable graphs. After privileged access, creating or editing a workflow that includes an execution node is effectively writing shell.

```json
{
  "nodes": [
    {
      "type": "executeCommand",
      "parameters": {
        "command": "id && uname -a"
      }
    }
  ]
}
```

### 6) Trigger → RCE

```http
POST /workflow/run HTTP/1.1
Host: n8n.target.local
Cookie: session=<forged>
Content-Type: application/json

{"workflowId":"<injected>"}
```

At this point the platform’s intended automation features become the exploit payload delivery system.

## End-to-end chain

```text
[unauth webhook]
      │
      ▼
[content-type / parser confusion]
      │
      ▼
[arbitrary file read]
      │
      ▼
[secret / session material]
      │
      ▼
[session forgery / auth bypass]
      │
      ▼
[workflow create/modify]
      │
      ▼
[executeCommand sink]
      │
      ▼
[remote code execution]
```

## Why chains like this keep appearing

Three recurring product decisions amplify impact:

1. **Public triggers with rich parsers** — multipart, binary, JSON, form-urlencoded all on one path.
2. **Secrets local to the process host** — readable by the same UID that runs workflows.
3. **Powerful nodes without sandbox defaults** — `executeCommand`, code nodes, shell nodes.

Individually each may look “by design.” Together they form an RCE conveyor belt.

## Remediation (defender-oriented)

- **Strict Content-Type allowlists** per route; reject mismatches early.
- **Path canonicalization + root jail** for any file operation; never trust filename metadata.
- **No high-value secrets world-readable** to the runtime user; prefer OS secret stores / sealed config.
- **Disable or heavily gate OS execution nodes** on internet-facing instances.
- **Server-side authorization on workflow mutate/run**, independent of UI role flags.
- **Sandbox workflow execution** (containers, seccomp, non-root, network egress controls).

Conceptual guard:

```javascript
if (!req.is("multipart/form-data")) {
  throw new Error("invalid content-type");
}
if (!isSafePath(userPath, ALLOWED_ROOT)) {
  throw new Error("invalid path");
}
// never: exec(userInput)
```

## Takeaway

CVE-2026-21858 is a lesson in **trust propagation**: the dangerous part is not only the final `exec`, but every hop that turns untrusted bytes into trusted capability. When hunting automation platforms, map *parser → secret → privilege → sink* before you write the first PoC line.
