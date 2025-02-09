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
    })
}