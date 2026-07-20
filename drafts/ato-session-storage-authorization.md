---
title: "Account Takeover via SessionStorage Authorization"
description: "How a financial web app mixed cookie authentication with sessionStorage identity, user enumeration APIs, and OSINT-derived employee emails into full account takeover."
banner: ACCOUNT TAKEOVER // SESSION STORAGE // AUTHZ BYPASS
tag: WEB APPLICATION SECURITY
subtitle: REACT // COOKIE AUTH // CLIENT TRUST
platform: Financial Web Application
researcher: Naveen Jagadeesan
published: 2023-03-30
slug: ato-session-storage-authorization
severity: critical
target: Financial SaaS // SessionStorage // User Lookup API
---

## Summary

A financial collaboration app authenticated with cookies but **authorized with mutable browser sessionStorage**. Combined with a verbose user-lookup API and OSINT-friendly employee emails, an attacker could mint another user’s client identity object and inherit their invoices, org data, and admin-capable UI workflows.

## Theory

Modern SPAs often cache a “user profile” object client-side for snappy UX. The dangerous pattern:

> **Authentication** = HttpOnly cookie / token (good)  
> **Authorization** = whatever is in `sessionStorage.user` (bad)

If the server does not re-resolve identity from the session on every sensitive read/write — or if APIs accept client-asserted user IDs — the SPA becomes an identity editor.

Secondary theory: pre-login “lookup user by email” endpoints frequently overshare (role, status, userId), giving attackers a perfect template for the storage object they need to forge.

## Application context

- Financial workflows: invoices, payments, reconciliation
- Orgs + roles for multi-user teams
- React SPA, cookie sessions, REST APIs, edge WAF

## Recon: the lookup oracle

```http
GET /api/v1/user?email=researcher@example.com HTTP/2
Host: www.target.example
Cookie: session=<valid-or-empty-as-applicable>
```

```json
{
  "status": true,
  "message": "Successfully Retrieved",
  "result": [
    {
      "UserId": 601XXX,
      "EmailId": "researcher@example.com",
      "RoleName": "Admin",
      "CountryName": "India",
      "Status": "Approved",
      "IsActive": true
    }
  ]
}
```

That response is already a finding: **user enumeration + excessive data exposure**. It also hands the exact schema of the client identity blob.

## Hypothesis test with two accounts

1. Create Account A and Account B.
2. Log in as A; dump `sessionStorage`.
3. Observe profile keys matching the lookup API fields.
4. Call lookup for B’s email; copy B’s object into A’s sessionStorage slot.
5. Refresh.

Result: UI and subsequent client-driven calls behaved as B — **account takeover relative to the SPA’s trust model**, including financial records visible to B.

## Weaponization with OSINT

Corporate emails harvested from:

- public contact pages
- GitHub commits / issue comments
- support forums / developer discussions

Intruder-style probing against `/api/v1/user?email=` using content-length / body differences identified valid staff accounts. Lookup returned Admin-capable metadata for some identities. Injecting those objects completed takeover against real organizational users (in authorized testing scope).

## Impact

- Full account takeover of enumerated users
- Access to invoices and financial artifacts
- Potential admin-role UX and data exposure
- User impersonation inside multi-tenant orgs

## Root causes

1. Authorization decisions influenced by client-writable storage
2. User lookup API returns rich identity material
3. Missing server-side binding between session principal and requested resources
4. Enumeration-friendly email oracle

## Fixes that actually work

- Treat cookies/tokens as the **only** identity source; sessionStorage is cache, never authority.
- On every sensitive API call, authorize from server session / JWT `sub` claims — ignore client `UserId` assertions unless they match.
- Lookup endpoints should return minimal boolean existence (if needed at all), rate-limited and anti-enumerated.
- Prefer server-driven UI permission models (fetch `/me` from trusted session, not local edits).

## Takeaway

If you can edit who you are in DevTools and the app believes you, you do not have an authorization system — you have a suggestion box. Pair that with a chatty user oracle and ATO becomes an operational process, not a research moonshot.
