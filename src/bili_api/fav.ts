import { Config } from './config'
import { Owner } from './feed'
import { doRequest, PageFlatIter } from './util'

const FAV_IDS_URL = 'https://api.bilibili.com/x/v3/fav/resource/ids'

interface IdsData {
    id: number
    type: number
    bvid: string
}

interface ListRequest {
    media_id: number
    tid?: number
    keyword?: string
    order?: 'mtime' | 'view' | 'pubtime'
    type?: 0 | 1
    ps: number
    pn?: number
    platform?: string
}

export interface CntInfo {
    collect: number     // 收藏数
    play: number        // 播放数
    danmaku: number     // 弹幕数
    vt: number          // ？
    play_switch: number // ？
    reply: number       // ？
    view_text_1: string // 收藏数文本
}

export interface Ugc {
    first_cid: number;
}

enum MediaAttr {
    Normal = 0,
    Other = 1,
    Deleted = 9,
}

export interface Media {
    id: number;
    type: number;
    title: string;
    cover: string;
    intro: string;
    page: number;
    duration: number;
    upper: Owner;
    attr: MediaAttr;
    cnt_info: CntInfo;
    link: string;
    ctime: number;      // 投稿时间
    pubtime: number;    // 发布时间
    fav_time: number;   // 收藏时间
    bv_id: string;
    bvid: string;
    season: null;
    ogv: null;
    ugc: Ugc;
    media_list_link: string;
}

interface ListResponse {
    info: object
    medias: Array<Media>
    has_more?: boolean
    ttl: number
}

const FAV_LIST_URL = 'https://api.bilibili.com/x/v3/fav/resource/list'

export async function get_favs(config: Config, media_id: number, page = 1): Promise<ListResponse> {
    const param: ListRequest = {
        media_id,
        ps: page,
        platform: 'web',
    };
    return await doRequest(config, FAV_LIST_URL, param)
}

export class FavListIter implements PageFlatIter<Media> {
    config: Config
    media_id: number
    page = 1
    content: Array<Media> = []
    finished = false

    constructor(config: Config, media_id: number) {
        this.config = config
        this.media_id = media_id
    }
    more = async () => {
        this.page += 1
        const param: ListRequest = {
            media_id: this.media_id,
            ps: this.page,
            platform: 'web',
        };
        const res: ListResponse = await doRequest(this.config, FAV_LIST_URL, param)
        if (!res || !res.has_more || !res.medias.length) this.finished = true
        this.content = res?.medias ?? []
    }
    next = async (): Promise<void | Media> => {
        while (!this.finished || this.content.length) {
            while (this.content.length) {
                const m = this.content.shift()
                if (m.attr === MediaAttr.Normal) return m
            }
            if (!this.finished) await this.more()
        }
    }
    all = async (f: (m: Media) => Promise<void>): Promise<void> => {
        while (!this.finished || this.content.length) {
            await this.more()
            this.content.forEach(f)
        }
    }
}