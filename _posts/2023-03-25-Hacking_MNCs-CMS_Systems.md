---
title: "Exploiting Misconfigurations and Authorization Vulnerabilities in a Multinational Company's Content Management System"
layout: post
date: 2023-03-25 12:00
categories: blog
---

This blog discusses the exploitation of misconfigurations and authorization vulnerabilities in a Multinational Company's Content Management System (CMS) application

## Target Background
The target of this analysis is a prominent Multinational Company (MNC) with a significant market value and stock presence. The company utilizes a Content Management System (CMS) application built with ReactJS to create, edit, and update the content for their products and services. Once the content is published, it is pushed to the live website associated with the corresponding product or service.

## Overview
The CMS application lacks a sign-up page, and only the application administrator has the privilege to create user accounts and assign roles. The home page exclusively presents a login form, with no sign-up buttons. 

### Reconnaissance
During the reconnaissance phase, the following technologies and components were identified:

- ReactJS
- Amazon CDN (Content Delivery Network)
- REST APIs

### Analysis of Loaded Source Files
After thoroughly analyzing the loaded source files, it became evident that legitimate user credentials are required to access the application. No REST API endpoints were explicitly mentioned in the JavaScript files. To proceed further, a URL fuzzing technique was employed, leading to the discovery of the signup endpoint: **https://abc.com/abc/xyz/signup.html**.

## Misconfiguration - 1
### Sign-up Process
Due to the application's design, the sign-up functionality is not accessible from the home page. It appears that the developer might have intentionally kept it separate, possibly for internal use or as a legacy feature that was not removed.

By signing up for an account, it was observed that no additional confirmation steps, such as email verification, were required. The account creation process was successful without any validation of the provided information.

However, upon attempting to log in with the newly created account, it was redirected back to the login page. Since the account lacked proper authorization and assigned roles, the application denied access to its contents. Nonetheless, by examining the page, embedded REST API locations were identified, indicating that successful authentication was achieved. The only issue pertained to incorrect permissions preventing access to application pages.

To understand the flow and identify potential missing elements, a detailed analysis of the login request was conducted. Upon successful login, the application provided an authorization token (JWT) in the Location header. Decoding the JWT revealed that it did not contain any values for Cognito permissions, thereby explaining the unavailability of application contents.

```json
{
  "at_hash": "ry3UaTl8rD1IPBffLSyQ7w",
  "sub": "e03f561e-9392-437d-abf7-48715fde4a4e",
  "cognito:groups": [
    ""
  ],
  "iss": "https://cognito-idp.abc.com",
  "cognito:username": "test",
  "origin_jti": "",
  "cognito:roles": [
    ""
  ],
  "aud": "2kp93i4kj1ump55lid961qm7bv",
  "event_id": "65f7336b-1b89-45e6-b9f9-be466f24207b",
  "token_use": "id",
  "auth_time": "",
  "phone_number": "",
  "exp": "",
  "iat": "",
  "jti": "66d3189d-e26e-454f-9b8d-7863ac4de102",
  "email": "nj@tvhsecurity.com"
}
```

The decoded JWT revealed that the user did not possess any assigned roles to access the application pages.

### Fuzzing the JWT
In an attempt to identify the correct "Cognito groups," the JWT payload was fuzzed by adding random role permission keywords. However, encoding and sending the modified JWT in the request did not yield any successful results.

Nevertheless, utilizing the obtained token, the page source was downloaded using curl and the "authorization header." A personal one-liner script was then utilized to extract embedded URL locations from the application. Alternatively, the tool [URLScrapy](https://github.com/thevillagehacker/urlscrapy) could also be employed to achieve this.

## HTTP Response Codes
All extracted URLs were compiled into a text file, and the tool **[HTTPX](https://github.com/projectdiscovery/httpx)** was utilized to check the status codes and content lengths. Fortunately, one of the pages returned a different content length. Upon visiting the page, static content related to user roles within the application was revealed.

This reconnaissance effort revealed the presence of two user roles: "editor" and "publisher." Editors possess the ability to edit contents, while publishers can approve new content submissions made by editors.

## Checkpoint
At this stage, the following elements are available for accessing the application contents:

- A newly signed-up account without any assigned roles
- Knowledge of user roles within the application
- A functioning JWT token (Authorization)

With these resources in hand, the next step is to find a way to assign user roles to the token and gain access to the application contents. Through experimentation with the browser's developer tools, it was discovered that a local storage variable, "user_role," was present but had no value assigned for our user account. By setting its value to "editor" and refreshing the page, the application started utilizing the local storage variables to determine content access. As a result, the ability to add and edit application contents was obtained.

## Misconfiguration - 2
Having gained access to the application, it was determined that the application exclusively employs AWS Cognito groups for authentication, without utilizing them for authorization. This was evident from the fact that by merely adding the value "editor" to the local storage variable "user_role," one could assume the role of an editor within the application.

Therefore, the only requirement to access the REST APIs was a legitimate authentication token, as authorization was not properly implemented.

### Privilege Escalation
Privilege escalation was achieved by modifying the "user_role" local storage variable to "publisher." Upon refreshing the page, access to publisher content pages was obtained, enabling the approval or rejection of contents created by editor users in the application.

It should be noted that due to non-disclosure agreements, only limited information could be shared in this blog post.

Thank you for reading!

For more updates and insights, follow me on Twitter: [@thevillagehacker](https://twitter.com/thevillagehackr).