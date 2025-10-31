---
title: "Remote Code Execution through Unrestricted File Upload"
layout: post
date: 2021-02-14 12:0
categories: blog
---

Remote Code Execution through Unrestricted File Upload

## Remote Code Execution

Remote code execution (RCE) refers to the ability of a cyber attacker to access and manipulate a computer or server without authorization, regardless of its geographic location. By exploiting RCE vulnerabilities, attackers can run arbitrary malicious software on the target system.

During my bug hunting endeavors, I discovered a target with a responsible disclosure program using Google Dorks. For the purposes of this blog post, let's refer to the target website as abc.com. The primary functionality of this website was to allow users to upload their CVs (resumes) to the company.

## Find more Google Dorks

[GitHub Repo](https://github.com/thevillagehacker/Bug-Hunting/blob/main/Dorks/Google_dorks.md)

![img](/assets/images/blogs/RCE3/1.webp)

I proceeded to fill out the necessary details and attached a [PHP reverse shell](https://github.com/thevillagehacker/Bug-Hunting/blob/main/Rev-shell/php_rev_shell.php) as the CV file and uploaded it.

![img](/assets/images/blogs/RCE3/2.webp)

I intercepted the request and checked whether the file upload functionality allowed PHP files. To my surprise, it did not have any validations for file content types or file contents.

![img](/assets/images/blogs/RCE3/3.webp)

I utilized ngrok for port forwarding in order to establish a reverse shell. After updating the IP address and port with the details from ngrok, I successfully uploaded the reverse shell.

The website displayed the location of the uploaded files in the response. I quickly navigated to the location of the PHP file and triggered the reverse shell, thus achieving the objective of remote code execution.

![img](/assets/images/blogs/RCE3/4.webp)

I promptly reported the issue to the relevant company, and they acknowledged the report, reproduced the issue, and rewarded me with $500 for responsibly disclosing the vulnerability.

Thank you for reading.

Follow me on Twitter: [thevillagehacker](https://twitter.com/thevillagehackr)