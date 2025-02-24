# koishi-plugin-bili-untag

[![npm](https://img.shields.io/npm/v/koishi-plugin-bili-untag?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-bili-untag)

Subscribe Bilibili miss tagged Video

## Function
[*] Subscription
[*] Filter rule
[*] Record Pushed
[*] Find archived
[*] Search via API
[ ] Scheduled Push
[ ] Make share image with QR code

## Push
The qqbot platform only allow push message 4 times a month, so this plugin work via negative mode now.

## Domain
The qqbot platform only allow you 20 URL to send with the bot, and the domain have to valid by put a json file in root and must registered in [MIIT](www.miit.gov.cn).
Maybe a serverless service can do this.

So if I want to send URL, maybe I have to wrapping redirection with only 20 URL.

Another way is just sending image with QR code.

# LICENSE
This repo release under [MIT](LICENSE)

The code in bili_api folder almost come from [SocialSisterYi/bilibili-API-collect](/SocialSisterYi/bilibili-API-collect) which release under [CC By-NC 4.0](https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/LICENSE)
