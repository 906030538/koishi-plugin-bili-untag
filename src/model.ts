import { Context } from 'koishi'
import { Video as SearchVideo } from './bili_api/search'

declare module 'koishi' {
    interface Tables {
        biliuntag_user: User,
        biliuntag_video: Video,
        biliuntag_subscribe: Subscribe,
        biliuntag_rule: Rule,
        biliuntag_source: Source,
    }
}

export interface User {
    id: number,     // Up主uid
    time: Date,     // 更新时间
    name: string,   // 昵称
    face: string,   // 头像url
}

export interface Video {
    id: number,                 // avid
    bvid: string,               // bvid
    author: number              // Up主uid
    pubdate: number | Date,     // 投稿时间戳
    senddate: number | Date,    // 发布时间戳
    area: number,               // 分区id
    title: string,              // 标题
    description: string,        // 简介
    tag: Array<string>,         // 标签
    pic: string,                // 封面url
    duration: number,           // 长度
    view: number,               // 播放数
    like: number,               // 获赞数
    coin: number,               // 投币数
    favorite: number,           // 收藏数
    reply: number,              // 评论数
    danmaku: number,            // 弹幕数
    share: number,              // 分享数
    dislike: number,            // 0 点踩数
    now_rank: number,           // 当前排名
    his_rank: number,           // 历史最高排行
}

export function from_search(that: SearchVideo): [Video, User] {
    let d = that.duration.split(':', 2).map(parseInt)
    let duration = d.length === 2 ? d[0] * 60 + d[1] : d[0] ?? 0
    const v: Video = {
        id: that.aid,
        bvid: that.bvid,
        author: that.mid,
        area: parseInt(that.typeid),
        pubdate: that.pubdate,
        senddate: that.senddate,
        title: that.title, // 去除html
        description: that.description, // 去除html
        tag: that.tag.split(','),
        pic: 'http:' + that.pic,
        duration,
        view: that.play,
        like: that.like,
        coin: -1,
        favorite: that.favorites,
        reply: that.review,
        danmaku: that.video_review,
        share: -1,
        dislike: -1,
        now_rank: that.rank_index,
        his_rank: -1,
    }
    const u: User = {
        id: that.mid,
        time: new Date(),
        name: that.author,
        face: that.upic,
    }
    return [v, u]
}

export interface Subscribe {
    id: number,
    target: Array<string>,
}

export interface Rule {
    id: number,
    sid: number,
    matcher: string,
    action: number,
}

export enum SubVideoStat {
    Reject = -1,
    Wait,
    Accept,
    Pushed,
}

export interface Source {
    sid: number,
    avid: number,
    source: number,
    stat: SubVideoStat,
}

export function db(ctx: Context) {
    ctx.model.extend('biliuntag_user', {
        id: 'unsigned',
        time: 'timestamp',
        name: 'string',
        face: 'string',
    }, {
        primary: ['id', 'time']
    })
    ctx.model.extend('biliuntag_video', {
        // 各字段的类型声明
        id: 'unsigned',
        bvid: 'string',
        author: 'unsigned',
        pubdate: 'timestamp',
        senddate: 'timestamp',
        area: 'integer',

        title: 'string',
        description: 'text',
        tag: 'array',
        pic: 'string',
        duration: 'integer',
        view: 'integer',
        like: 'integer',
        coin: 'integer',
        favorite: 'integer',
        reply: 'integer',
        danmaku: 'integer',
        share: 'integer',
        dislike: 'integer',
        now_rank: 'integer',
        his_rank: 'integer',
    }, {
        foreign: {
            author: ['biliuntag_user', 'id']
        }
    })
    ctx.model.extend('biliuntag_subscribe', {
        id: 'unsigned',
        target: 'array',
    }, {
        autoInc: true
    })
    ctx.model.extend('biliuntag_rule', {
        id: 'unsigned',
        sid: 'unsigned',
        matcher: 'string',
        action: 'integer',
    }, {
        autoInc: true,
        foreign: {
            sid: ['biliuntag_subscribe', 'id'],
        }
    })
    ctx.model.extend('biliuntag_source', {
        sid: 'unsigned',
        avid: 'unsigned',
        source: 'integer',
        stat: 'integer',
    }, {
        primary: ['sid', 'avid'],
        foreign: {
            sid: ['biliuntag_subscribe', 'id'],
            avid: ['biliuntag_video', 'id'],
        }
    })
}