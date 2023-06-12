---
title: "Bypass WAF🛡️ to Dump DataBase via SQL Injection"
layout: post
date: 2023-05-30 22:10
tag: 
- WAF
- Bypasss
- SQL Injection
category: blog
author: Naveen
description: "Bypassing Web Application Firewall to exploit SQL injection"
---

# Target Background
The target is a web application which allows the users to manage financial stuffs, make payments in bulk, raise invoices, send messages to customers about the promo offers on the cards, etc.

## Overview
The application has input validations on the input fields and there is a web application firewall that detects and rejects requests with malicious pattern sent as payload in the request. But checking all the requests by clicking every buttons in the application will lead us to find a bypass for the firewall due to rookie misconfigguration.

## Recon
- App is built on reatJS
- hosted on non-cloud env
- may be IIS 

## Crawl and Audit 🪲
I have signed up an account and checked all the features and so far there was no luck. Decided to dig deeper, so i have used one of my tool i have created which will get me the embedded locations and URLs in the application. I have enumerated all the pages in the application and piped it into my tool to final all the embeded locations in the application.

And no luck with the results there was sensitive endpoints and so then decided to look into the SQL, XSS like injection related vulnerabilities.

## SQL Injection 💉
After checking 100 of requests and 1000 input fields, there was one parameter that was fishy which is `request_module`. The parameter seems like a param created by the framework used by the application. I couldn't find whcih frameweokr it is but after doing some automation though `sqmap` the tool detected a possible Boolean based sql injection.

### WAF🛡️
Since the application was configured with a web application firewall, all of my injection payloads has been rejected with 400 bad request. After a while my IP address has been blocked for 15 minutes.

After while i lost hope and decided to check the requests for anything fishy, and at one endpoint the application sends post request in a page where the user can create HTML content and publish it to their customer.

### Request 
```http
POST /api/v1/promo_offers HTTP/2
Host: www.target.com
Cookie: blah...blah...blah...
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Referer: https://www.target.com/
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: iframe
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: cross-site
Te: trailers

{
  "Titel": "Promo1",
  "Content": "<h2>This is a winderful offer</h2><p>Hurry up tp get best deals out of it...</p>"
}
```

As shown in the above request the application publishes the HTML contents, since the HTML contents are allowed in this page the input validation is performed in the endpoit in which user can only enter whitelisted HTML tags and contents.

After checking through the requests again i found an internal request which was probably kept for the testing and purpose and forgot to remove while moving the code to PROD.


### Internal Request

```http
POST /internal/api/v1/promo_offers HTTP/2
Host: www.target.com
X-Forwarded-For: localhost:4563
Cookie: blah...blah...blah...
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Referer: https://www.target.com/
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: iframe
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: cross-site
Te: trailers

{
  "Titel": "Promo1",
  "Content": "<h2>This is a winderful offer</h2><p>Hurry up tp get best deals out of it...</p>"
}
```

The API endpoint directory location starts with `internal` and has the same post request as we have saw before and there is only one more addition to the request which is the `X-Forwarded-For: localhost:4563` header in the request.

After sending the request it responded with `200 OK` response, so then i changed the payload from the HTML to some SQL injection payloads the response was 200 OK but there was nothing to exploit.

### Bypass 💉
As i have mentioned the `request_module` parameter is fishy, i have configured the `X-Forwarded-For: localhost:4563
` header in the request header in the request where the `request_module` parameter is present. Then automated the request with `sqlmap*.

#### Automate using Sqlmap

![img](/assets/images/blogs/sqli2/1.png)

#### Vulnerability Confirmation

After increasing the risk and level to 3 and 4 it detected the parameter is vulnerable to Boolean based SQL injection attack.

![img](/assets/images/blogs/sqli2/2.png)

#### Enumerating Database

![img](/assets/images/blogs/sqli2/3.png)

#### Available Databases

![img](/assets/images/blogs/sqli2/4.png)

The scanning was running for almost an hour then it enumerated all the databases. Later then i have dumped the entire DB.

**Note:** *For faster enumeration of tables increase threads.* 

Thanks for reading!

Follow me on Twitter : [thevillagehacker](https://twitter.com/thevillagehackr)