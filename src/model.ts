import { Context } from 'koishi'

declare module 'koishi' {
    interface Tables {
        biliuntag_video: Video,
        biliuntag_subscribe: Subscribe,
        biliuntag_rule: Rule,
        biliuntag_source: Source,
    }
}

export interface Video {
    id: number,
    bvid: string,
    pubdate: number | Date,
    senddate: number | Date,
    title: string,
    description: string,
    tag: Array<string>,
    pic: string,
    duration: number,
}

export interface VideoStat {
    id: number,         // 稿件avid
    cap_time: Date,     // 抓取时间
    view: number,       // 播放数
    danmaku: number,    // 弹幕数
    reply: number,      // 评论数
    favorite: number,   // 收藏数
    coin: number,       // 投币数
    share: number,      // 分享数
    now_rank: number,   // 当前排名
    his_rank: number,   // 历史最高排行
    like: number,       // 获赞数
    dislike: number,    // 0 点踩数
    evaluation: string, // 视频评分
    vt: number,         // 0
}

export interface Subscribe {
    id: number,
}

export interface Rule {
    id: number,
    sid: number,
}

export interface Source {
    id: number,
    sid: number,
    avid: number,
    source: number,
}


export function db(ctx: Context) {
    ctx.model.extend('biliuntag_video', {
        // 各字段的类型声明
        id: 'unsigned',
        bvid: 'string',
        pubdate: 'timestamp',
        senddate: 'timestamp',
        title: 'string',
        description: 'text',
        tag: 'array',
        pic: 'string',
    })
}