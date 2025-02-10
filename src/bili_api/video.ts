const viewUrl = 'https://api.bilibili.com/x/web-interface/wbi/view'

interface ViewRequest {
    aid?: number,   //
    bvid?: string,  //
}

interface Owner {
    mid: number,    // UP主mid
    name: string,   // UP名
    face: string,   // UP主头像
}

interface DescV2 {
    raw_text: string,   // type=1时显示原文, type=2时显示'@'+raw_text+' '并链接至biz_id的主页
    type: number,       // 1：普通，2：@他人
    biz_id: number,     // 被@用户的mid | 0
}

interface Right {
    bp: number,             // 是否允许承包
    elec: number,           // 是否支持充电
    download: number,       // 是否允许下载
    movie: number,          // 是否电影
    pay: number,            // 是否PGC付费
    hd5: number,            // 是否有高码率
    no_reprint: number,     // 是否显示“禁止转载”标志
    autoplay: number,       // 是否自动播放
    ugc_pay: number,        // 是否UGC付费
    is_cooperation: number, // 是否为联合投稿
    ugc_pay_preview: number,// 0
    no_background: number,  // 0
    clean_mode: number,     // 0
    is_stein_gate: number,  // 是否为互动视频
    is_360: number,         // 是否为全景视频
    no_share: number,       // 0
    arc_pay: number,        // 0
    free_watch: number,     // 0
}

interface Stat {
    aid: number,        // 稿件avid
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

interface Dimension {
    width: number,  // 当前分P 宽度
    height: number, // 当前分P 高度
    rotate: number, // 是否将宽高对换
}

interface Page {
    cid: number,                        // 分P cid
    page: number,                       // 分P序号
    from: 'vupload' | 'hunan' | 'qq',   // 视频来源: vupload：普通上传（B站） hunan：芒果TV qq：腾讯
    part: string,                       // 分P标题
    duration: number,                   // 分P持续时间
    vid: string,                        // 站外视频vid
    weblink: string,                    // 站外视频跳转url
    dimension: Dimension,               // 当前分P分辨率
}

interface Author {
    mid: number,                // 字幕上传者mid
    name: string,               // 字幕上传者昵称
    sex: string,                // 字幕上传者性别: 男 女 保密
    face: string,               // 字幕上传者头像url
    sign: string,               // 字幕上传者签名
    rank: number,               // 10000
    birthday: number,           // 0
    is_fake_account: number,    // 0
    is_deleted: number,         // 0
}

interface Subtitle {
    id: number,             // 字幕id
    lan: string,            // 字幕语言
    lan_doc: string,        // 字幕语言名称
    is_lock: boolean,       // 是否锁定
    author_mid: number,     // 字幕上传者mid
    subtitle_url: string,   // json格式字幕文件url
    author: Author,         // 字幕上传者信息
}

interface Subtitles {
    allow_submit: boolean,  //
    list: Array<Subtitle>,  //
}

interface Vip {
    type: number,           // 成员会员类型 0：无 1：月会员 2：年会员
    status: number,         // 会员状态 0：无 1：有
    due_date: number,       // 到期时间 UNIX 毫秒时间戳
    vip_pay_type: number,   //
    theme_type: number,     //
    label: object,          //
}

interface Official {
    role: number,   // 成员认证级别
    title: string,  // 成员认证名
    desc: string,   // 成员认证备注
    type: number,   // 成员认证类型 -1：无 0：有
}

interface Staff {
    mid: number,        // 成员mid
    title: string,      // 成员名称
    name: string,       // 成员昵称
    face: string,       // 成员头像url
    vip: Vip,           //成员大会员状态
    official: Official, // 成员认证信息
    follower: number,   // 成员粉丝数
    label_style: number,// 
}

interface Honor {
    aid: number,                    // 当前稿件aid
    type: number,                   // 1：入站必刷收录 2：第?期每周必看 3：全站排行榜最高第?名 4：热门
    desc: number,                   // 描述
    weekly_recommend_num: number,   // 
}

interface Video {
    bvid: string,                   // BV
    aid: number,                    // avid
    videos: number,                 // 分P总数
    tid: string,                    // 分区tid
    tname: string,                  // 分区名
    copyright: number,              // 视频类型
    pic: string,                    // 封面url
    title: string,                  // 视频标题
    pubdate: number,                // 稿件发布时间
    ctime: number,                  // 用户投稿时间
    desc: string,                   // 描述
    desc_v2: Array<DescV2>,         // ？
    state: number,                  //
    duration: number,               // 视频长度
    forward: number,                // ？
    mission_id: number,             //
    redirect_url: string,           //
    rights: Right,                  //
    owner: Owner,                   // UP主
    stat: Stat,                     //
    dynamic: string,                //
    cid: number,                    //
    dimension: Dimension,           //
    premiere: null,                 //
    teenage_mode: number,           //
    is_chargeable_season: boolean,  //
    is_story: boolean,              //
    is_upower_exclusive: boolean,   //
    is_upower_pay: boolean,         //
    is_upower_show: boolean,        //
    no_cache: boolean,              //
    pages: Array<Page>,             //
    subtitle: Subtitles,            //
    staff: Array<Staff>,            //
    is_season_display: boolean,     //
    user_garb: {                    //
        url_image_ani_cut: string,  //
    },
    honor_reply: {                  //
        honor_reply: Array<Honor>,  //
    },
    like_icon: string,              //
    need_jump_bv: boolean,          //
    disable_show_up_info: boolean,  //
    is_story_play: boolean,         //
    is_view_self: boolean,          //
    argue_info: {                   //
        argue_link: string,         //
        argue_msg: string,          //
        argue_type: number,         //
    },
}

const detailUrl = 'https://api.bilibili.com/x/web-interface/wbi/view/detail'

interface Detail {
    View: Video,            // 视频基本信息
    Card: object,           // 视频UP主信息
    Tags: Array<string>,    // 视频TAG信息
    Reply: object,          // 视频热评信息
    Related: Array<any>,    // 推荐视频信息
    Spec: null,
    hot_share: object,
    elec: null,
    recommend: null,
    view_addit: object,
}