---
title: "Hacking MNC's Content Management System due to misconfiguration and lack of authorization"
layout: post
date: 2023-03-25 12:00
image: /assets/images/blogs/IDOR/access-control.svg
headerImage: false
tag:
- Reading Js files
- Privilege Escalation
- Fuzzing
- Misconfiguration
category: blog
author: naveen
description: Hacking MNC's Content Management System due to misconfiguration and lack of authorization in the application.
---

## Target Background
The target is a Multi National Company who has a billion dollar market and the stocks. The nature of the application is to create, edit and update the contents of their products/services. Once the content is published the updated contents will be pushed to the live website of the product/services page. Short form it's a **Content Management System application** - its a own product of the company built using reactJS.

## Overview
The application does not have any sign up page as this is a CMS application only the administrator of the application can create and assign roles to the users. The home page didn't have any sign up buttons other than the login form - username, password, submit and forgot password buttons. 

### Recon
- reactJS
- Amazon CDN
- REST APIs

### Analyzing loaded source files
After analyzing the loaded source files in the application it clearlys shows that the user has to be legitimate to access the application. There were no REST API locations were mentioned in the JS files. The perfect way to proceed further is to fuzz the URL. After fuzzing the URL the signup endpoint were found **https://abc.com/abc/xyz/signup.html**. 

## Misconfiguration - 1
### Sign up
Since the application does not have the signup option in the home page and the same has been configured in the different directory than the home login page. The developer might be intentionally did it or might have used it for internal purpose or forgot to remove from the directory.

I have signed up an account, and luckily it doesn't ask to confirm the information provided like email confirmation to create an account sccessfully.

After creating a user successfully, i have tried to login to the application but since the signed up user is not a legitmate user and no roles have been assigned to it, the application kept redirecting me to login page. The application contents were not accessible. But I was able to extract the embeded REST API locations from the page because we are able to login to the application but only the application pages are not available in the UI due to incorrect permissions.

So i have decided to circle back to the login request to understand the flow and what we are missing, after successfull login the application serves the authorization token (JWT) in the Location header along with the URL. I was able to decode the JWT and it doesn't has any values for the cognito permission which solve the question why the contents are unavailable.

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
After decoding the JWT, it showed that the user doesn't have any assigned roles to access the application pages.

### Fuzzing JWT
In order to find the right `cognito groups` we have to fuzz the JWT payload but by adding random role permissions keywords, encoding it and sending it in the request turned to be a failure.

But with the token i was able to download page source through curl by passing the **authorization header**. After downloading the page source i have used one of my own oneliners to extract the URL locations embeded in the application and I was able to successfull get a few static pages and REST API paths. We can also the [URLScrapy](https://github.com/thevillagehacker/urlscrapy) a tool to extract the embeded location in the web page.

## HTTP response code
I have placed all of the extracted URLs in a text file and used **[HTTPX](https://github.com/projectdiscovery/httpx)** to check the status code and content length, luckily one of the page returned with different content length. After visiting the page it showed some static contents about the user role in the application.

So with the help of that recon i knew there are 2 user roles in the application which are `editor` and `publisher`. The editor user can edit the contents and pubshier can approve those new contents.

## Checkpoint
Let's check what do we have as of now to access the application contents.

- Newly signup account without any roles
- user roles in the application
- Working JWT token (Authorization)

Alright! now we have to find a way to assign the user roles to the token and access the application contents. After playing with dev-tools for a while i have noticed there is a variable in the local storage `user_role` which is empty by the way for our user account. So i have set an value as `editor` and refreshed the page.

Voila! the application is checking the local storage variables as well to serve the content of the application, I was able to add and edit application contents.

## Misconfiguration - 2
Now we are able to access the application which concludes that the application is using aws cognito groups as authentication only and it was not used for authorization because we were able to become an editor user in the application by adding value as `editor` to the local storage variable `user_role`.

So we only need an legitimate authentication token to access the REST APIs, since the authorization is not implemented.

### Privilege Escalation
I have escalated the privilege of `publisher` user by changing the local storage variable `user_role` to `publisher`. After refreshing the page i was able to access the publisher contents pages in which we can approve and reject contents which have been added by the editor users in the application.

Please note that due to the non-disclosure agreement these are the only information i was allowed to share.

Thanks for reading!

Follow me on Twitter : [thevillagehacker](https://twitter.com/thevillagehackr)
