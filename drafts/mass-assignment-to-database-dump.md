---
title: "From Mass Assignment to Database Dump: When Type Confusion Becomes SQLi"
description: "How a profile-update mass-assignment bug, array injection, and verbose MySQL errors chained into error-based SQL injection and full database extraction on a Node/Express app."
banner: MASS ASSIGNMENT // ARRAY INJECTION // ERROR-BASED SQLi
tag: WEB APPLICATION SECURITY
subtitle: NODE/EXPRESS // OBJECT BINDING // MYSQL
platform: Node.js / Express / MySQL
researcher: Naveen Jagadeesan
published: 2023-07-13
slug: mass-assignment-to-database-dump
severity: critical
target: Node.js API // Profile Update // MySQL
---

## Summary

A “simple” authenticated profile update endpoint became a **database dump** path. The interesting part is not mass assignment alone — it is how **unsafe object binding + loose type handling + SQL string assembly + verbose errors** composed into a reliable extraction channel.

## Theory that guided testing

I treat mass assignment as a **type oracle**:

> If the backend binds request JSON into a model with weak schema validation, feeding the wrong *shape* (array vs string, object vs scalar) often reveals whether values are interpolated into SQL, NoSQL operators, or ORM filters.

Most programs stop at “can I set `role=admin`?”  
The higher-yield question is: **what does the server do when `email` is not a string?**

## Target surface

- Stack: Node.js, Express, MySQL
- Feature: dynamic roles / user management for financial workflows
- Interesting endpoint: authenticated `POST /editUser` style profile update

Frontend disabled email edits in the UI. The API still accepted `email` in the body — a classic client/server trust split.

```http
POST /editUser HTTP/2
Host: target.example
Content-Type: application/json

{
  "user_Id": "2abaac0a-4af8-4101-a763-9d0229cafb12",
  "email": "researcher@example.com",
  "Mobile": "9874563217",
  "role": "Analyst",
  "isActive": true
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"Success": true, "Message": "User details Updated"}
```

## Finding #1 — mass assignment / unexpected field control

Even with UI locks, the backend honored attacker-controlled fields. That alone is authorization debt. But direct “set admin” style escalation was not the path that paid off.

## Finding #2 — array injection bypasses “string” assumptions

Theory: validators sometimes check “email present” without `typeof email === 'string'`. Frameworks or ad-hoc code then coerce arrays poorly when building SQL.

```json
{
  "user_Id": "2abaac0a-4af8-4101-a763-9d0229cafb12",
  "email": [
    "researcher@example.com",
    "attacker@example.com"
  ],
  "Mobile": "9874563217",
  "role": "Analyst",
  "isActive": true
}
```

Result: update succeeded; subsequent profile read showed the attacker-controlled mailbox winning the write.

That confirmed:

1. No strict schema (Joi/Zod/class-validator style) on the write path
2. Multi-value handling without explicit policy
3. A mutation primitive worth weaponizing further

## Finding #3 — malformed arrays → SQL parse errors

Pushing the second array element into SQL metacharacters produced backend parse failures:

```json
{
  "email": ["researcher@example.com", "'"]
}
```

```json
{
  "code": 400,
  "message": "ER_PARSE_ERROR: You have an error in your SQL syntax"
}
```

Error disclosure was the unlock:

- Confirmed **MySQL**
- Confirmed **string-built SQL** (or equivalent unsafe interpolation)
- Confirmed a **boolean/error oracle** suitable for automation

## Exploitation — error-based extraction

With a stable authenticated request template, the injection point was automated (sqlmap-class tooling) using the captured raw request, elevated risk/level, and tamper scripts as needed for WAF friction.

```bash
python sqlmap.py \
  -r request.txt \
  --batch \
  --dbs \
  --risk 3 \
  --level 4 \
  --random-agent \
  --tamper=between \
  --proxy=http://127.0.0.1:8080
```

Outcome: database enumeration and content extraction through the profile update channel.

## Why this is worth publishing

Mass assignment writeups that stop at “I set `isAdmin=true`” are common.  
This case is interesting because:

1. **UI security theater** (disabled field) hid a live API control plane.
2. **Type confusion** (array-as-email) was the real bypass, not a magic parameter name.
3. **Verbose SQL errors** converted a data bug into a full dump primitive.
4. The path is realistic on Node apps that hand-roll validation and SQL.

## Root causes

- Bind-all / loose DTO mapping on update endpoints
- Missing strict type schema (string vs array)
- Dynamic SQL or unsafe query construction around email updates
- Detailed database errors returned to clients
- Authorization model that trusts “I can call editUser” without field-level policy

## Hardening checklist

1. **Allowlist assignable fields** per role; never bind raw `req.body` to persistence.
2. **Schema-validate types** (`email: string.email()`, reject arrays/objects).
3. **Parameterized queries only** — no string concat for WHERE/SET fragments.
4. **Generic client errors**; log SQL detail server-side only.
5. **Field-level authorization** — “can edit profile” ≠ “can edit email/role/flags”.
6. Regression tests that send arrays/objects for scalar fields and expect `400`.

## Takeaway

When an update endpoint accepts unexpected shapes, do not stop at privilege flags. **Probe type confusion until the database complains** — the complaint is often the beginning of extraction, not the end of the finding.
