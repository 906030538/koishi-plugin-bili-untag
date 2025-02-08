import md5 from 'md5'
import { userAgent } from './const'


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
async function getWbiKeys(session: string, force: boolean): Promise<string> {
    if (!force && Date.now() - timestamp < 86400000) {
        return mixin_key
    }
    const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
        headers: {
            // SESSDATA 字段
            Cookie: 'SESSDATA=' + session,
            'User-Agent': userAgent,
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
export async function encWbi(params: Object, force = false, session?: string): Promise<string> {
    const mixin_key: string = await getWbiKeys(session, force)
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
