---
title: "Mass Heroku Subdomain Takeover via Dangling DNS"
description: "Large-scale subdomain enumeration uncovered thousands of hostnames and multiple Heroku CNAMEs pointing at unclaimed apps — a systematic dangling DNS takeover case study."
banner: SUBDOMAIN TAKEOVER // HEROKU // DANGLING DNS
tag: WEB APPLICATION SECURITY
subtitle: DNSX // SUBZY // CNAME HUNTING
platform: Web Infrastructure / DNS
researcher: Naveen Jagadeesan
published: 2021-05-08
slug: massive-heroku-subdomain-takeover
severity: high
target: Corporate DNS // Heroku CNAMEs // Dangling Records
---

## Summary

During a broad recon pass, subdomain enumeration produced a very large set of hostnames for the target organization (**on the order of thousands**). Fingerprinting CNAMEs with `dnsx` and takeover scanners (`subzy` and related checks) identified multiple **Heroku dangling DNS** records — DNS still pointed at Heroku hostnames that no longer had an active claimed app. Claiming those endpoints would have enabled content control on trusted corporate subdomains.

## Theory

Subdomain takeover is an inventory problem first:

> Organizations create SaaS CNAMEs faster than they decommission them.  
> Marketing sites, forgotten staging apps, hackathon demos, and “temporary” Heroku prototypes remain in DNS for years.

The theory for scale: **if the org’s culture is “ship a Heroku app, CNAME it, move on,” volume scanning will outperform manual browsing.**

## Methodology

1. **Enumerate** aggressively (passive + active sources appropriate to scope).
2. **Resolve** at scale; keep CNAME targets.
3. **Classify** SaaS fingerprints (Heroku, GitHub Pages, Azure, etc.).
4. **Validate** dangling state (service default pages / NX claim conditions — not just tool banners).
5. **Proof carefully** under program rules (often: demonstrate claimability without defacing production).

Tooling used in the original workstream included:

- `dnsx` for resolution / CNAME extraction
- `subzy` (and manual verification) for takeover candidates
- `curl`/browser checks for service fingerprints

## What “interesting” looked like here

Not a single forgotten blog. The signal was:

- **volume** of dangling candidates
- **Heroku** as a repeated pattern (process failure, not one-off mistake)
- corporate parent domain trust (cookies, SSO adjacency, phishing credibility)

A takeover on `something.company.com` beats yet another XSS on a vanity microsite because of **brand and cookie-scope narratives** (exact cookie impact depends on cookie domains — always verify, never assume).

## Impact classes

- Phishing / credential harvesting on trusted hostnames
- OAuth redirector abuse if redirect allowlists are loose
- Stored malicious content on corporate subdomains
- Reputational harm and marketing site defacement risk
- Potential access to residual environment variables if old apps are reclaimable in edge cases (service-specific)

## Root causes

- No DNS lifecycle ownership for SaaS CNAMEs
- Missing automated detection for dangling records
- Heroku (and similar) apps destroyed without DNS cleanup
- Large sprawl without continuous attack-surface management

## Defensive program

1. Inventory all CNAMEs to third-party services continuously.
2. Alert when a CNAME target returns provider “claim this app” fingerprints.
3. Require infra tickets for DNS create/delete paired with SaaS app lifecycle.
4. Prefer provider-verified domain controls that prevent casual claims where available.
5. Periodic takeover scans in CI/ASM tooling — treat findings like exposed buckets.

## Takeaway

The skill in mass takeover work is not the final claim click — it is **building a pipeline that turns DNS sprawl into prioritized, verified dangling records**. When Heroku CNAMEs appear repeatedly, you are looking at an organizational process bug with technical consequences.
