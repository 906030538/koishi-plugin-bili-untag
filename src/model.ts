import { Context } from 'koishi'

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
    senddate?: number | Date,   // 发布时间戳
    area?: number,              // 分区id
    title: string,              // 标题
    description?: string,       // 简介
    tag?: Array<string>,        // 标签
    pic: string,                // 封面url
    duration: number,           // 长度
    view: number,               // 播放数
    like: number,               // 获赞数
    coin?: number,              // 投币数
    favorite?: number,          // 收藏数
    reply?: number,             // 评论数
    danmaku: number,            // 弹幕数
    share?: number,             // 分享数
    dislike?: number,           // 0 点踩数
    now_rank?: number,          // 当前排名
    his_rank?: number,          // 历史最高排行
}

export interface Subscribe {
    id: number,
    keyword: string,
    target: Array<string>,
}

export enum RuleType {
    Text,   // Title + Desc + Tag + Author
    Title,
    Desc,
    Tag,
    Author,
    Date,
    Area,
    Regex,
}

export interface Rule {
    id: number,
    sid: number,
    type: RuleType,
    matcher: Array<string>,
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
        area: { type: 'integer', nullable: true, initial: -1 },

        title: 'string',
        description: 'text',
        tag: { type: 'list', nullable: true },
        pic: 'string',
        duration: 'integer',
        view: 'integer',
        like: 'integer',
        coin: { type: 'integer', nullable: true, initial: -1 },
        favorite: { type: 'integer', nullable: true, initial: -1 },
        reply: { type: 'integer', nullable: true, initial: -1 },
        danmaku: 'integer',
        share: { type: 'integer', nullable: true, initial: -1 },
        dislike: { type: 'integer', nullable: true, initial: -1 },
        now_rank: { type: 'integer', nullable: true, initial: -1 },
        his_rank: { type: 'integer', nullable: true, initial: -1 },
    }, {
        foreign: {
            author: ['biliuntag_user', 'id']
        }
    })
    ctx.model.extend('biliuntag_subscribe', {
        id: 'unsigned',
        keyword: 'string',
        target: 'list',
    }, {
        autoInc: true
    })
    ctx.model.extend('biliuntag_rule', {
        id: 'unsigned',
        sid: 'unsigned',
        type: 'integer',
        matcher: 'list',
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