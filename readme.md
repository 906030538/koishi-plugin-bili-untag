# koishi-plugin-bili-untag

[![npm](https://img.shields.io/npm/v/koishi-plugin-bili-untag?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-bili-untag)

Subscribe Bilibili miss tagged Video via search and feed.

When you are following some topic of video (on Bilibili), but everybody just not TAG the definition keyword, until you see the cover or view the video, you can finally confirmed this is related to topic.
Or there is a keyword always confusion with irrelevant topics, or you just don't want to see some low quality post, and there is no "advance search" function can filter them out.
And, there's always many video can not found by search, even you follow the author but didn't show in timeline, but the Big!Data! just randomly show it on the top page, once you miss it, it just lost.
Fine, I collect 5k+ video for two years manualy, it's time to automate it.

Live demo: [bot 3889570184 夢之結唱](https://qun.qq.com/qunpro/robot/qunshare?robot_appid=102662742&robot_uin=3889570184)

## Features
- [x] Subscription
- [x] Filter rule
- [x] Record Pushed
- [x] Find archived
- [x] Search via API
- [x] Scheduled Push
- [ ] Configurable message format
- [ ] Multi subscriber push stat
- [ ] Make share image with QR code

## Push
The qqbot platform only allow push message 4 times a month, so this plugin work via passive mode now.

## Domain
The qqbot platform only allow you 20 URL to send with the bot, and the domain have to valid by put a json file in root and must registered in [MIIT](www.miit.gov.cn).
Maybe a serverless service can do this.

So if I want to send URL, maybe I have to wrapping redirection with only 20 URL.

Another way is just sending image with QR code.

# LICENSE
This repo release under [MIT](LICENSE)

The code in bili_api folder almost come from [SocialSisterYi/bilibili-API-collect](/SocialSisterYi/bilibili-API-collect) which release under [CC By-NC 4.0](https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/LICENSE)
