import { h } from "koishi"
import { tryWbi } from "./util"
import { Config } from "./config"

const rcmdUrl = 'https://api.bilibili.com/x/web-interface/wbi/index/top/feed/rcmd'

interface RcmdRequest {
    fresh_type?: number,
    ps?: number,
    fresh_idx?: number,
    fresh_idx_1h?: number,
    brush?: number,
    fetch_row?: number,
    web_location?: 1430650,
    y_num?: number,
    last_y_num?: number,
    feed_version?: string,
    homepage_ver?: number,
    screen?: string,
    seo_info?: string,
    last_showlist?: string,
    uniq_id?: string,
}

export interface Owner {
    face: string
    mid: number
    name: string
}

interface Stat {
    view: number,
    like: number,
    danmaku: number,
    vt: number,
}

export interface Item {
    av_feature: null,
    business_info: object,
    bvid: string,
    cid: number,
    dislike_switch: number,
    dislike_switch_pc: number,
    duraion: number,
    enable_vt: number,
    goto: 'av' | 'ogv' | 'live',
    id: number,
    is_followed: number,
    is_stock: number,
    ogv_info: null,
    owner: Owner,
    pic: string,
    pic_4_3: string,
    pos: number,
    pubdate: number,
    rcmd_reason: {
        reason_type: number,
    },
    room_info: object,
    show_info: number,
    stat: Stat,
    title: string,
    track_id: string,
    uri: string,
    vt_display: string,
}

interface Data {
    business_card: null,
    floor_info: null,
    item: Array<Item>,
    mid: number,
    preload_expose_pct: number,
    preload_floor_expose_pct: number,
    side_bar_column: Array<Item>,
    user_feature: null,
}

export async function getFeed(config: Config): Promise<Data> {
    let param: RcmdRequest = {}
    const res: Data = await tryWbi(config, rcmdUrl, param)
    return res
}

export function feed2msg(res: Data, keyword?: string): string {
    let msg = res.item
        .filter(i => i.goto === 'av' && i.show_info === 1)
        .filter(v => !keyword || v.title.includes(keyword))
        .sort((a, b) => b.pubdate - a.pubdate)
        .map(v => {
            const pubdate = new Date(v.pubdate * 1000)
            return h('img', { src: v.pic }) + '\n' +
                v.title + ' | ' + pubdate.toLocaleString('zh-CN') + ' | UP：' + v.owner.name + '\n' +
                v.bvid + ' | av' + v.id
        }).join('\n\n')
    if (msg) return msg
    return '没有任何推荐'
}
