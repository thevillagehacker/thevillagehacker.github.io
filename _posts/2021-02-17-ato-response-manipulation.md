---
title: "Account Take Over by Response Manipulation"
layout: post
date: 2021-02-17 12:00
tag:
- Account Takeover
- Misconfiguration
category: blog
author: naveen
description: The Story of Taking over tons of users Accounts.
---

![img](/assets/images/blogs/ATO/no_rate-limit/1.webp)

Hi all I hope everyone is doing well. This writeup is all about account take Over vulnerability by manipulating the login response.

## Technical information
I have been testing for bugs in responsible disclosure programs and as usual I found a program and read all of their rule of engagements and finally decided to check. Let’s consider the target as target.com which is a online platform to make payments, order foods and etc.I quickly signed up with necessary informations Account 1 (abc@gmail.com) as below.

![img](/assets/images/blogs/ATO/response_manipulation/1.webp)

After signed_up the application sent an confirmation link to the given email and I verified the email and it directed to the account settings page. I decided to logout and login again to observe how the application is handling the login request.

![img](/assets/images/blogs/ATO/response_manipulation/2.webp)

I figured out that the application is using an API to authenticate the user so I intercepted the request and observe how the API handles the login process.

![img](/assets/images/blogs/ATO/response_manipulation/3.webp)

I observed that the signup and login responses are similar but some different changes so I decided to manipulate the login response with signup response. I quickly logged out and created another account and captured the signup response of Account 2 (xyz@gmail.com).

It’s a go time…

Again Logged_in with Account 1(abc@gmail.com) same email ID but different password.

![img](/assets/images/blogs/ATO/response_manipulation/4.webp)

Intercepted the login request as below.

![img](/assets/images/blogs/ATO/response_manipulation/5.webp)

and applied do -> intercept this request -> response in burp suite proxy and changed the response 401 Unauthorized of login response into Account 2 (xyz@gmail.com) signup response with 200 OK.

![img](/assets/images/blogs/ATO/response_manipulation/6.webp)

![img](/assets/images/blogs/ATO/response_manipulation/7.webp)

and changed the email parameter in the response to Account 1 (abc@gmail.com) email ID and forwarded all the request.

![img](/assets/images/blogs/ATO/response_manipulation/8.webp)

It quickly directed me into Account 1(abc@gmail.com) settings page now I successfully logged into Account 1(abc@gmail.com) without password by manipulating the login response into signup response.

Thank you for reading.

Follow me on Twitter : [thevillagehacker](https://twitter.com/thevillagehackr)