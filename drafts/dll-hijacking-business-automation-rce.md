---
title: "DLL Search-Order Hijacking to RCE on a Business Automation Client"
description: "Process Monitor-driven DLL hijacking against a Windows business automation product — from missing module loads to Calculator proof and Meterpreter, with the theory behind prioritizing desktop clients."
banner: DLL HIJACKING // SEARCH ORDER // WINDOWS RCE
tag: WINDOWS APPLICATION SECURITY
subtitle: PROC MON // PAYLOAD DLL // METERPRETER
platform: Windows Desktop Application
researcher: Naveen Jagadeesan
published: 2022-12-15
slug: dll-hijacking-business-automation-rce
severity: high
target: Windows Desktop // Business Automation Client
---

## Summary

A Windows business-automation desktop client loaded libraries using **relative search order** without integrity checks. Planting a malicious DLL in a preferred search location yielded code execution on application start — first proven with a benign Calculator payload, then escalated to a Meterpreter session.

## Theory: why desktop clients still pay

Web apps get most of the attention in bug bounty programs. Desktop line-of-business tools often ship with:

- auto-updaters and helper EXEs
- plugins loaded by name only
- installers that leave **writable application directories**
- no code-signing enforcement on dependent DLLs

The working theory:

> If Procmon shows `NAME NOT FOUND` for a DLL in a directory the user (or a low-priv process) can write, you likely have a loader bug — not a malware technique demo.

## DLL search-order primer (attacker view)

When an application calls `LoadLibrary("foo.dll")` without a full path, Windows walks a search order. Exact order depends on SafeDllSearchMode and API variants, but the practical attacker preference is:

1. **Application directory** (often writable on poorly packaged enterprise tools)
2. Other early entries before system directories

If the real dependency lives later in the order — or is optional and missing — a planted `foo.dll` wins.

## Enumeration methodology

### 1) Baseline with Process Monitor

Filter on the target PID/process name:

- Operation: `CreateFile` / `Load Image`
- Result: `NAME NOT FOUND` for `*.dll`
- Path under the application install or working directory

### 2) Rank candidates

Prefer DLLs that:

- are probed at every launch
- are not immediately followed by a successful load of the same name elsewhere (or are delay-loaded)
- sit in a writable directory for the attack scenario (local priv-esc vs planted via shared folder / supply-chain adjacent write)

## Exploitation path

### Proof payload

Generate a DLL that executes a non-destructive proof (e.g., launch Calculator) to confirm:

1. load order preference
2. no signature gate
3. stability (app doesn’t crash before your DllMain runs)

### Plant

Copy the payload to the winning path identified in Procmon, matching the expected filename.

### Validate

On next start:

- Procmon shows successful load of the planted module
- Proof process executes

### Escalate

Swap the proof DLL for a reverse-shell / Meterpreter-class payload. Without DLL signing checks or Safe loading policies, the loader treats malware as a dependency.

## Impact

- Remote/local code execution in the context of the user running the client
- Persistence if the client is a login item or always-on tray app
- Credential and session exposure for whatever the automation tool can reach
- Potential pivot into internal automation backends the client speaks to

## Root causes

- Relative DLL loads without absolute paths
- Missing code integrity / catalog signing checks
- Writable install directories for standard users (or weak ACLs)
- No Safe DLL search hardening / delay-load vigilance

## Mitigations (vendor)

- Load dependencies by **full path**
- Enable and correctly use **SafeDllSearchMode** behaviors; prefer `LOAD_LIBRARY_SEARCH_*` flags
- Require **Authenticode** for plugins and delay-loaded modules
- Install under properly ACL’d Program Files locations
- Consider mitigations like Windows Defender Application Control for enterprise deployments

## Takeaway

DLL hijacking is “old,” but it remains high-signal against niche enterprise clients. The research skill is not generating the payload — it is **seeing the missing load as a vulnerability class** and proving impact with a clean chain from Procmon to shell.
