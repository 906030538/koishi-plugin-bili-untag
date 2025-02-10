import { tryWbi } from "./util"

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

interface Item {
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
    owner: {
        face: string,
        mid: number,
        name: string,
    },
    pic: string,
    pic_4_3: string,
    pos: number,
    pubdate: number,
    rcmd_reason: {
        reason_type: number,
    },
    room_info: object,
    show_info: number,
    stat: object,
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

export async function getFeed(session?: string): Promise<string> {
    let param: RcmdRequest = {}
    const res: Data = await tryWbi(rcmdUrl, param, session)
    let msg = res.item.filter(i => i.goto === 'av' && i.show_info === 1).map(v => {
        const pubdate = new Date(v.pubdate * 1000)
        return v.title + ' | UP：' + v.owner.name + '\n' + v.bvid + ' ' + v.id + ' ' + pubdate.toLocaleDateString()
    }).join('\n\n')
    return msg
}
