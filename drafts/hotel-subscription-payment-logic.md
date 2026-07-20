---
title: "Free Diamond Memberships: Payment Logic vs Encrypted Add-On APIs"
description: "Reversing client-side AES on a hotel booking platform and abusing payment_method / membership flags to activate Diamond benefits without paying — a business-logic chain under crypto friction."
banner: BUSINESS LOGIC // PAYMENT BYPASS // MEMBERSHIP ABUSE
tag: WEB APPLICATION SECURITY
subtitle: HOTEL B2B // AES BODY CRYPTO // ADD-ON FLOW
platform: Hotel Booking / Subscription Platform
researcher: Naveen Jagadeesan
published: 2023-10-31
slug: hotel-subscription-payment-logic
severity: high
target: B2B Hotels // Membership Tiers // Purchase Add-Ons
---

## Summary

A B2B hotel reservation platform sold tiered memberships (Silver → Diamond) with booking discounts and loyalty multipliers. API bodies were AES-encrypted in the browser, which slowed casual testing — but not analysis. After recovering keys from shared JS, manipulating **payment method selectors** and **membership flags** activated Diamond benefits **without** a successful membership payment.

## Why this is more than “change price to 0”

Classic price tampering was partially mitigated elsewhere in the industry narrative. Here the interesting failure is **workflow desynchronization**:

> Payment completion and entitlement activation were not the same server-side transaction.  
> The client could still assert membership state inside “encrypted” add-on calls.

Crypto friction made the bug look advanced; the root cause is ordinary business-logic.

## Stack & friction

- AWS + Cloudflare WAF
- React SPA, REST APIs
- Request/response bodies encrypted (AES-CBC style helpers)
- Shared CDN crypto configuration across properties

## Reversing enough crypto to test logic

Bundles exposed domains, keys, IVs, and encrypt/decrypt helpers (same class of issue as other portfolio apps). Payload framing resembled:

```text
Base64Ciphertext + "---" + Base64(IV)
```

With offline decrypt/encrypt, Burp became useful again: read real JSON, mutate, re-seal.

## Membership purchase flow

High-level:

1. User selects Diamond (or similar) during booking.
2. Client calls membership add API with encrypted body.
3. Client calls purchase/add-on API with payment metadata.
4. Backend should: charge → verify → activate entitlements.

Observed sensitive fields after decrypt (simplified):

```json
{
  "user_club_membership_id": 123456,
  "diamond_club": true,
  "payment_method": 26
}
```

## Exploit theory

Probe enums around `payment_method` while keeping entitlement flags true:

- Does the server re-price based on method?
- Does method `21` vs `26` skip a surcharge path?
- Is `diamond_club: true` honored even when payment authorization is absent?

### Result

Changing `payment_method` from the premium path value to an alternate internal code removed the additional membership charge while membership activation parameters remained present. Backend still applied:

- Diamond membership active
- ~12% booking discount behavior
- Enhanced loyalty multipliers

**Payment was not a hard prerequisite for entitlement.**

## Impact

- Free premium subscriptions
- Unauthorized booking discounts
- Loyalty economy abuse
- Direct revenue loss at scale if automated

## Root causes

- Entitlement flags accepted from client-influenced payloads
- Payment verification not bound to membership activation (missing transactional integrity)
- Client-side cryptography used as a control boundary
- Insufficient server-side state machine for add-on purchases

## Fixes

1. Server-side state machine: `PAYMENT_CAPTURED → ENTITLEMENT_GRANT` only.
2. Ignore client `diamond_club` assertions; derive tier from paid invoices.
3. Idempotent server records linking `payment_intent` ↔ `membership_id`.
4. Remove long-term symmetric keys from clients (see crypto writeup).
5. Monitor activations without matching settlement events.

## Takeaway

Encrypting a broken workflow yields an encrypted broken workflow. Once you can read the JSON, test **whether money movement and privilege grants are inseparable** — that is where the real bugs hide.
