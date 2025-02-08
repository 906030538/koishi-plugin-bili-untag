import { userAgent } from "./const"
import { encWbi } from "./util"

enum SearchType {
    video = 'video',                    // 视频
    media_bangumi = 'media_bangumi',    // 番剧
    media_ft = 'media_ft',              // 影视
    live = 'live',                      // 直播
    live_room = 'live_room',            // 直播间
    live_user = 'live_user',            // 主播
    article = 'article',                // 专栏
    topic = 'topic',                    // 话题
    bili_user = 'bili_user',            // 用户
    photo = 'photo',                    // 相簿
}

enum SearchOrder {
    totalrank = 'totalrank',    // 综合
    click = 'click',            // 点击
    pubdate = 'pubdate',        // 最新
    dm = 'dm',                  // 弹幕
    stow = 'stow',              // 收藏
    scores = 'scores',          // 评论
    attention = 'attention',    // 点赞(专栏)
    online = 'online',          // 人气(直播)
    live_time = 'live_time',    // 最新(直播)
    fans = 'fans',              // 粉丝数(用户)
    level = 'level',            // 等级(用户)
}

enum SearchSortOrder {
    dec,    // 由高到低
    inc,    // 由低到高
}

enum SearchUserType {
    all,    // 全部
    up,     // up主
    normal, // 普通用户
    verify, // 认证用户
}

enum SearchDuration {
    all,        // 全部时长
    short,      // 10分钟以下
    mid,        // 10-30分钟
    long,       // 30-60分钟
    toolong,    // 60分钟以上
}

enum CategoryId {
    all = 0,    // 全部
    game = 1,   // 游戏 | 画友
    anime = 2,  // 动画 | 摄影
    life = 3,   // 生活
    tech = 17,  // 科技
}

interface SearchRequest {
    search_type: SearchType         // 搜索目标类型
    keyword: string                 // 关键词
    order?: SearchOrder             // 排序方式
    order_sort?: SearchSortOrder    // 用户粉丝数及等级排序顺序
    user_type?: SearchUserType      // 用户分类
    duration?: SearchDuration       // 视频时长
    tids?: number                   // 视频分区
    category_id?: number            // 专栏及相簿分区
    page?: number                   // 页码
}

enum ResponseCode {
    success = 0,        // 成功
    error = -400,       // 请求错误
    forbid = -412,      // 请求被拦截
    not_found = -1200,  // 搜索目标类型不存在
}

class SearchResponse { }

class TypeSearchResponse {
    seid: number            // 搜索seid
    page: number            // 当前页码
    pagesize: number        // 每页条数	固定20
    numResults: number      // 总条数	最大值为1000
    numPages: number        // 总计分页数	最大值为50
    suggest_keyword: string // 空
    rqt_type: string        // search
    cost_time: Object       // 详细搜索用时	大概
    exp_list: Object        // 
    egg_hit: number         // 0
    pageinfo: Object        // 副分页信息	只在搜索类型为直播间及主播有效
    result: Array<Object>   // 结果列表
    show_column: number     // 0
}

class JsonResponse {
    code: ResponseCode
    message: string
    ttl: number
    data: SearchResponse | TypeSearchResponse
}

const typeSearchUrl = 'https://api.bilibili.com/x/web-interface/search/type'

const searchUrl = 'https://api.bilibili.com/x/web-interface/search/all/v2'

export async function doTypeSearch(keyword: string, session?: string): Promise<any> {
    let param: SearchRequest = {
        search_type: SearchType.video,
        keyword,
    }
    const res = await tryWbi(typeSearchUrl, param, session) as TypeSearchResponse
}

async function tryWbi(url: string, param: Object, session?: string): Promise<SearchResponse | TypeSearchResponse> {
    let query = await encWbi(param, false, session)
    const headers = {
        // SESSDATA 字段
        Cookie: 'SESSDATA=' + session,
        'User-Agent': userAgent,
        Referer: 'https://www.bilibili.com/' //对于直接浏览器调用可能不适用
    }
    let res = await fetch(url + '?' + query, { headers })
    let json_res: JsonResponse = await res.json()
    switch (json_res.code) {
        case ResponseCode.success:
            return json_res.data
        case ResponseCode.forbid:
            break
        case ResponseCode.error:
        case ResponseCode.not_found:
            throw json_res.message
    }
    query = await encWbi(param, true, session)
    res = await fetch(url + '?' + query, { headers })
    json_res = await res.json()
    if (json_res.code !== ResponseCode.success) {
        throw json_res.message
    }
    return json_res.data
}