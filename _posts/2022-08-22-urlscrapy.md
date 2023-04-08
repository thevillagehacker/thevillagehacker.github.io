---
title: "URLScrapy"
layout: post
date: 2022-08-22 22:10
tag: 
- Recon
- web scraper
- wordlist
headerImage: false
image: https://github.com/thevillagehacker/thevillagehacker/raw/master/Do%20Hacks%20to%20Secure.gif
projects: true
hidden: true # don't count this post in blog pagination
description: "Enumerate HTTP-Methods on the web applications."
category: project
author: Naveen
externalLink: false
---

![img](/assets/images/Projects/urlscrapy.png)

## [urlscrapy](https://github.com/thevillagehacker/urlscrapy)
A web scrapper to extract the URLs embedded on the Website.

## Installation

```sh
go install -v github.com/thevillagehacker/urlscrapy@latest
```

or
              
```sh
git clone https://github.com/thevillagehacker/urlscrapy.git
cd urlscrapy
go build
```
**urlscrapy** binary will be created and Move the binary to the required folder and add the path to the environment variables.

## Usage
```sh
go run urlscrapy.go -u https://example.com
```

or

```sh
urlscrapy -u https://example.com
```

### Example
```sh
urlscrapy -u https://example.com | httpx -<flags>
```
