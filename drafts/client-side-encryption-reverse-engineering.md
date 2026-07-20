---
title: "Reversing Client-Side AES: When ‘Encrypted APIs’ Are Just Obscurity"
description: "How hardcoded AES-CBC keys and IVs in shared CDN JavaScript turned encrypted REST traffic into a fully automatable API surface — including CAPTCHA workflow abuse."
banner: CLIENT-SIDE CRYPTO // AES-CBC // CDN SECRETS
tag: WEB APPLICATION SECURITY
subtitle: CRYPTOJS // STATIC IV // API AUTOMATION
platform: Web / Android / iOS (shared API)
researcher: Naveen Jagadeesan
published: 2023-02-15
slug: client-side-encryption-reverse-engineering
severity: high
target: Multi-App CDN // Encrypted REST // reCAPTCHA
---

## Summary

A multi-app product family encrypted all REST bodies client-side with **AES-CBC**, advertising the design as a security control. Secrets lived in **shared CDN JavaScript** with a **static IV**. Once reversed, the “encrypted API” became a normal JSON API — and weak CAPTCHA token issuance enabled automated registration abuse.

## Theory

Client-side encryption of HTTP JSON is almost never confidentiality against the user. It is, at best:

- anti-debug friction
- a way to discourage casual script kiddies
- a compliance aesthetic

The research theory:

> If encryption keys ship in the same trust domain as the attacker (browser/app), treat ciphertext as **encoding**, not security. Your job is to recover transform parameters and then test the *real* server-side controls underneath.

Shared CDN + many subdomains made that theory stronger: one broken crypto helper would unlock a portfolio of apps.

## Recon observations

- React frontends + mobile clients hitting the same API family
- 15+ related applications / hosts sharing technology
- Request/response bodies opaque at first glance
- Bundles: `main.js`, `signin.js`, `signup.js`, `booking.js`, …

Keyword pass over bundles: `encrypt`, `decrypt`, `CryptoJS`, `iv`, `key`, `AES`.

## Recovering the transform

Configuration fragments exposed key material and endpoints:

```javascript
// simplified shape observed in bundles
{
  apiDomain: "https://api.example.com",
  bookingApiDomain: "https://bookings.example.com",
  cdnPath: "https://cdn.example.com",
  dataHasKey: "###################=",
  dataIVKey: "jm8lgqa3j1d0ajus",
  encryptionKeys: "[...]"
}
```

Encrypt helper (conceptual reconstruction):

```javascript
encrypt: function (obj) {
  const key = this.encryptKEY;           // hardcoded
  const iv  = "jm8lgqa3j1d0ajus";       // static IV
  const plain = JSON.stringify(obj);
  return CryptoJS.AES.encrypt(
    plain,
    CryptoJS.enc.Utf8.parse(key),
    {
      iv: CryptoJS.enc.Utf8.parse(iv),
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    }
  ).toString() + "---" + btoa(iv);
}
```

### Cryptographic red flags

| Property | Observation | Why it matters |
|----------|-------------|----------------|
| Key location | Browser/app bundle | Attacker is a legitimate client |
| IV | Static / reused | Breaks semantic security; patterns leak |
| Mode | AES-CBC with client decrypt | Server trusts client-produced ciphertext structure |
| Framing | `cipher---b64(iv)` | Easy to reimplement offline |

After decryption, bodies were ordinary JSON (PII fields, passwords, activity sources, etc.).

## CAPTCHA workflow under the microscope

Registration used Google reCAPTCHA, but token minting / verification steps were insufficiently bound to:

- single-use semantics with server-side accounting
- bot friction beyond short-lived tokens
- rate limits that survived scripted obtain→encrypt→POST loops

Attack workflow:

```text
obtain captcha challenge
  → verify / mint token
  → craft registration JSON
  → AES-CBC encrypt with recovered key/IV
  → POST to API
  → repeat
```

Impact class: large-scale fake account creation, spam, resource exhaustion, bypass of “encrypted + captcha protected” assumptions.

## Why this is worth writing up

Not because “AES in JavaScript is bad” as a slogan — but because:

1. Crypto was positioned as a **control**, not friction.
2. A **shared CDN secret** expanded blast radius across apps.
3. Static IVs and recoverable keys made offline tooling trivial.
4. Real server controls (CAPTCHA, rate limit, abuse) were weaker than the crypto cosplay suggested.

## Defender guidance

- TLS already protects transit; do not invent app-layer body crypto unless you have a clear threat model (and even then, keys must not be world-readable).
- If you need field-level encryption, use **server-held keys** or platform KMS; clients get wrapped DEKs with short lifetime.
- Never ship long-term symmetric keys in mobile/web clients for security boundaries.
- Unique IVs/nonces per message; authenticate ciphertext (AEAD).
- Abuse prevention belongs in **server-side** rate limits, device attestation, and fraud systems — not in AES theater.

## Takeaway

When you see encrypted JSON APIs, reverse the client transform first. The interesting bugs usually start **after** `decrypt()` — where business logic and anti-automation were never as strong as the Base64 looked.
