---
title: "FileFetcher"
layout: post
date: 2022-05-03 22:10
tag: 
- Recon
- Files
- Enumeration
headerImage: false
image: https://github.com/thevillagehacker/thevillagehacker/raw/master/Do%20Hacks%20to%20Secure.gif
projects: true
hidden: true # don't count this post in blog pagination
description: "About
Fetcher fetches js, JSON, PHP, txt file endpoints, and other sensitive file endpoints like pdf, xlsx, Docx, and CSV from a list of URLs from waybackurls output."
category: project
author: Naveen
externalLink: false
---

![img](/assets/images/Projects/filefetcher.png)

## [FileFetcher](https://github.com/thevillagehacker/FileFetcher)
Fetcher fetches js, JSON, PHP, txt file endpoints, and other sensitive file endpoints like pdf, xlsx, Docx, and CSV from a list of URLs from waybackurls output and 
URLs that user-supplied as input to the fetcher.

## prerequisite
- [waybackurls](https://github.com/tomnomnom/waybackurls)

## Usage
```sh
chmod +x fetcher.sh
```

### To run fetcher against single target as input 
```sh
./fetcher.sh -d example.com
```

### To fetch endpoints from input file which contains URLs
```sh
./fetcher.sh -f url.txt
```

#### Note
All Output results are stored separately in results folder
