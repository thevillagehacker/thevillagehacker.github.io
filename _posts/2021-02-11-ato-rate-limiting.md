---
title: "Account Take Over due to No Rate Limiting"
layout: post
date: 2021-02-08 12:00
tag:
- Account Takeover
- Misconfiguration
category: blog
author: naveen
description: The Story of Taking over tons of users Accounts.
---

![img](/assets/images/blogs/ATO/no_rate-limit/1.webp)

Ever since I started hacking I always wanted to make sure internet is secure. So long back I did some google Dorks and found an responsible disclosure program and I set that as my target of the week and started hacking on it.

## For Google Dorks

- [GitHub Repo](https://github.com/thevillagehacker/Bug-Hunting/blob/main/Dorks/Google_dorks.md)

Let’s consider the target as target.com which is a online ecommerce store like amazon and flipkart. So I get started from subdomain discovery using [Subfinder](https://github.com/projectdiscovery/subfinder) one of my favorite tool and I found a subdomain to make the shopping stuffs online.

Let’s consider the subdomain as **shop.target.com** I quickly directed to the URL and I had register and sign_in features so I quickly registered with necessary Informations and created an account. The Application is having two types of sign_in features,

1. Sign_in with Mobile by sending 4 Digit OTP to the registered Mobile Number
2. Sign_in with email and password

![img](/assets/images/blogs/ATO/no_rate-limit/2.webp)

I chose to sign_in with Mobile number to check whether there is any rate limiting implemented or I can simply brute force the OTP and login. Since the Application is using 4 digit code to verify the OTP it will be more easy to brute force the codes.

![img](/assets/images/blogs/ATO/no_rate-limit/3.webp)

I requested OTP for my registered mobile number to login and entered some random codes in the OTP input field and Intercepted the request with proxy tool Burp Suite.

![img](/assets/images/blogs/ATO/no_rate-limit/4.webp)

Intercepted the OTP verify request and sent it to the Intruder

![img](/assets/images/blogs/ATO/no_rate-limit/5.webp)

Configured Intruder payload and threads to brute force

![img](/assets/images/blogs/ATO/no_rate-limit/6.webp)

Set the Payload options as Number and the range starting from 1111 because I observed the OTP formats it never send the codes starting from 0’s so I decided to start from 1’s which will reduce our Brute forcing time.

![img](/assets/images/blogs/ATO/no_rate-limit/7.webp)

I quickly set the Number of thread to 100 and started the attack.

![img](/assets/images/blogs/ATO/no_rate-limit/8.webp)

Each and every response is configured to result in 200 OK response code, so I decided to check the length of the response and at some responses I have seen the length is 1424 and checked the response and it results in success.

I just entered the OTP on the intercepted request and sent it and the codes still worked. It seems the application does not have any rate limiting and whenever you request for OTP if OTP is not used before the application generates same OTP as new one until it Used to validated. Now the Users account is taken Over.

We can’t do brute forcing to take over users account all the time right, so I came up with an idea to take over victim account completely. I directed to my account and changed the victim mobile number as mine and updated the changes.

![img](/assets/images/blogs/ATO/no_rate-limit/9.webp)

Guess what there is verification for updating the mobile or email ID anything so you can just brute force the OTP and login to victim account and change the mobile number or email ID that you own.

I quickly logged out and try to login with my mobile number to see if the changes I did earlier is working or not.

![img](/assets/images/blogs/ATO/no_rate-limit/10.webp)

guess what I received 4 Digit OTP from the application and entered the OTP and logged in to the victim account without any additional verifications.

![img](/assets/images/blogs/ATO/no_rate-limit/11.webp)

Thank you for reading.

Follow me on Twitter : [thevillagehacker](https://twitter.com/thevillagehackr)