import md5 from 'md5'
import { Config } from './config'
import { Random } from 'koishi'

const mixinKeyEncTab: number[] = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]
const chrFilter: RegExp = /[!'()*]/g
let mixin_key: string = ''
let timestamp: number = 0

interface Nav {
    data: {
        wbi_img: {
            img_url: string,
            sub_url: string,
        }
    }
}

function get_token(url: string): string {
    return url.slice(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))
}

// 对 imgKey 和 subKey 进行字符顺序打乱编码
function getMixinKey(orig: string) {
    return mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32)
}

// export interface Param { [key: string]: string | number }
// 获取最新的 img_key 和 sub_key
async function getWbiKeys(config: Config, force: boolean): Promise<string> {
    if (!force && Date.now() - timestamp < 86400000) {
        return mixin_key
    }
    const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
        headers: {
            // SESSDATA 字段
            Cookie: 'SESSDATA=' + config.session,
            'User-Agent': config.agent,
            Referer: 'https://www.bilibili.com/'//对于直接浏览器调用可能不适用
        }
    })
    res.headers.get('Date');
    const data: Nav = await res.json()
    const img_key = get_token(data.data.wbi_img.img_url)
    const sub_key = get_token(data.data.wbi_img.sub_url)
    mixin_key = getMixinKey(img_key + sub_key)
    timestamp = Date.now()
    return mixin_key
}

// 为请求参数进行 wbi 签名
async function encWbi(config: Config, params: Object, force = false): Promise<string> {
    const mixin_key: string = await getWbiKeys(config, force)
    // 添加 wts 字段
    Object.assign(params, { wts: Math.round(Date.now() / 1000) })
    // 按照 key 重排参数
    const query = Object
        .keys(params)
        .sort()
        .map(key => {
            // 过滤 value 中的 "!'()*" 字符
            const value = params[key].toString().replace(chrFilter, '')
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        })
        .join('&')

    // 计算 w_rid
    const wbi_sign = md5(query + mixin_key)

    return query + '&w_rid=' + wbi_sign
}

export enum ResponseCode {
    success = 0,            // 成功
    nologin = -101,         // 未登录
    bad_csrf = -111,        // csrf校验失败
    error = -400,           // 请求错误
    deny = -403,            // 访问权限不足
    no_video = -404,        // 无视频
    forbid = -412,          // 请求被拦截
    not_found = -1200,      // 分区不存在
    not_exist = 10003,      // 不存在该稿件
    no_longer = 11010,      // 内容不存在
    already = 11201,        // 已经收藏过了
    cancel = 11202,         // 已经取消收藏了
    limited = 11203,        // 达到收藏上限
    invisible = 62002,      // 稿件不可见
    review = 62004,         // 稿件审核中
    private = 62012,        // 仅UP主自己可见
    bad_param = 2001000,    // 参数错误
    bad_param2 = 72010017,  // 参数错误
}

export interface JsonResponse<T> {
    code: ResponseCode
    message: string
    ttl?: number
    data: T
}

export async function doRequest<T>(config: Config, url: string, param: Object): Promise<T> {
    let query = Object
        .entries(param)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
    const headers = {
        // SESSDATA 字段
        Cookie: 'SESSDATA=' + config,
        'User-Agent': config.agent,
        Referer: 'https://www.bilibili.com/' //对于直接浏览器调用可能不适用
    }
    let res = await fetch(url + '?' + query, { headers })
    let json_res: JsonResponse<T> = await res.json()
    return json_res.data
}

export async function tryWbi<T>(config: Config, url: string, param: Object): Promise<T> {
    let query = await encWbi(config, param, false)
    const headers = {
        // SESSDATA 字段
        Cookie: 'SESSDATA=' + config,
        'User-Agent': config.agent,
        Referer: 'https://www.bilibili.com/' //对于直接浏览器调用可能不适用
    }
    let res = await fetch(url + '?' + query, { headers })
    let text = await res.text()
    let json_res: JsonResponse<T> = JSON.parse(text)
    switch (json_res.code) {
        case ResponseCode.success:
            return json_res.data
        case ResponseCode.forbid:
            break
        case ResponseCode.error:
        case ResponseCode.not_found:
            throw json_res.message
    }
    query = await encWbi(config, param, true)
    res = await fetch(url + '?' + query, { headers })
    text = await res.text()
    json_res = JSON.parse(text)
    if (json_res.code !== ResponseCode.success) {
        throw json_res.message
    }
    return json_res.data
}

export function remove_cdn_domain(u: string): string {
    const s = u.indexOf('.hdslb.com/')
    if (~s) u = u.slice(s + 10)
    return u
}

const cdn_domains = ['i0.hdslb.com', 'i1.hdslb.com', 'i2.hdslb.com']

export function add_cdn_domain(u: string): string {
    const s = u.indexOf('.hdslb.com/')
    if (~s) return u
    const r = new Random()
    let prefix = 'http://' + r.pick(cdn_domains)
    if (!u.startsWith('/')) prefix += '/'
    return prefix + u
}

export interface PageFlatIter<T> {
    page: number
    content: Array<T>
    finished: boolean

    next: () => Promise<T | void>
}
