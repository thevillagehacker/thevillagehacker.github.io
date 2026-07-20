---
title: "CMS Privilege Escalation: Cognito Auth, localStorage Roles"
description: "Breaking a multinational CMS that used AWS Cognito for authentication but trusted a localStorage user_role flag for editor/publisher authorization — plus a hidden signup path."
banner: JWT // AWS COGNITO // LOCALSTORAGE AUTHZ
tag: WEB APPLICATION SECURITY
subtitle: REACT CMS // ROLE FLAGS // PUBLISHER ESCAPE
platform: ReactJS / AWS Cognito CMS
researcher: Naveen Jagadeesan
published: 2023-03-25
slug: cms-cognito-localstorage-authz
severity: high
target: MNC CMS // Cognito // Content Publishing
---

## Summary

A corporate CMS authenticated users via **AWS Cognito JWTs** but enforced **editor/publisher** capabilities using a client-controlled `localStorage.user_role` value. With any valid low-privilege session, setting `publisher` in localStorage unlocked content approval and production publishing workflows. A hidden/legacy registration path made obtaining that first valid JWT easier than intended.

## Theory

Identity provider integration creates a false sense of completion:

> Teams bolt on Cognito/Auth0/Okta for **authentication**, then leave **authorization** in the SPA because “the API checks the JWT.”  
> Often the API only checks *signature + expiry*, not *group/role claims* for each mutating route.

The theory under test: **if role names appear in the frontend, they are probably also the authorization vocabulary — and might be client-settable.**

## Recon approach

1. Map CMS hosts and content admin paths (curl/httpx style probing).
2. Diff response lengths to find admin-ish static artifacts.
3. Extract role vocabulary from JS and HTML: `editor`, `publisher`.
4. Create a normal authenticated user; inspect storage and tokens.

Observed roles:

- **editor** — create/modify content
- **publisher** — approve/deploy to production properties

## Misconfiguration #1 — authn without authz depth

Cognito groups / JWT claims existed, but privileged CMS actions trusted the SPA’s notion of role. A valid JWT was necessary; the *role string* was not cryptographically bound in practice to server decisions for those workflows.

## Misconfiguration #2 — localStorage as RBAC

```javascript
localStorage.setItem("user_role", "editor");
// refresh → editor UX and actions
localStorage.setItem("user_role", "publisher");
// refresh → publisher UX and actions
```

No server round-trip revalidation of group membership for the escalated actions that mattered.

## Hidden registration / onboarding friction

A legacy or poorly restricted signup route allowed account creation outside the expected enterprise invite flow. That reduced the attack to:

```text
obtain any valid Cognito session
  → set localStorage role
  → exercise publisher APIs/UI
```

## Impact

- Privilege escalation to publisher
- Unauthorized content modification and approval
- Potential production website content compromise
- Trust failure in a multi-property CMS pipeline

## Root causes

- Client-side role source of truth
- APIs accepting JWTs without enforcing Cognito group claims per operation
- Role names and workflows fully discoverable from frontend
- Weak account provisioning controls

## Hardening

1. Authorize on the server using IdP groups/claims (`cognito:groups`, custom claims) for every write/publish API.
2. Never read RBAC from `localStorage` / `sessionStorage` except as non-authoritative UI cache.
3. Disable legacy signup; enforce invite-only or SSO-only provisioning.
4. Add integration tests: valid user JWT **without** publisher group must receive `403` on publish endpoints even if UI is tampered.
5. Monitor publish events correlated with group membership changes.

## Takeaway

Cognito solved “who logged in.” The CMS still needed “who may ship content to production.” When that second question is answered by `localStorage`, every authenticated user is a potential publisher one DevTools line away.
