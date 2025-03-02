import { $, Context } from 'koishi'
import { doSearch, doTypeSearch, SearchOrder, SearchType } from './bili_api/search'
import { getFeed } from './bili_api/feed'
import { remove_cdn_domain } from './bili_api/util'
import { Config } from '.'
import { Source, SubVideoStat, User, Video } from './model'
import { from_search, feed2Video, fav2Video } from './convert'
import { get_subscribes } from './subscribe'
import { Filter } from './rule'
import { get_favs } from './bili_api/fav'

export async function update_user(ctx: Context, u: User) {
    const users = await ctx.database
        .select('biliuntag_user')
        .where(r => $.eq(r.id, u.id))
        .orderBy('time', 'desc')
        .execute()
    const old = users[0]
    u.face = remove_cdn_domain(u.face)
    if (!old || old.face !== u.face || old.name !== u.name) {
        await ctx.database.create('biliuntag_user', u)
    }
}

const REMOVED_COVER = '/bfs/archive/be27fd62c99036dce67efface486fb0a88ffed06.jpg'

async function insert_video(ctx: Context, video: Video, user: User, filter: Filter, fav = false) {
    const source = filter.calc(video, user)
    let stat = SubVideoStat.Wait
    if (fav || source > 100) stat = SubVideoStat.Accept
    else if (source <= 50) return // Reject
    await update_user(ctx, user)
    if (video.title === '已失效视频' && remove_cdn_domain(video.pic) === REMOVED_COVER) return
    await ctx.database.upsert('biliuntag_video', [video])
    const s = await ctx.database.get('biliuntag_source', { sid: filter.sid, avid: video.id })
    if (s.length === 1) {
        switch (s[0].stat) {
            case SubVideoStat.Accept:
            case SubVideoStat.Wait:
                if (stat !== s[0].stat) break
            default:
                // 避免覆盖
                return
        }
    }
    // TODO: add fav, create fav
    await ctx.database.upsert('biliuntag_source', [{
        sid: filter.sid,
        avid: video.id,
        source,
        stat
    }])
}

export async function spider(ctx: Context, config: Config) {
    const res = await getFeed(config)
    let feed = res.item.filter(i => i.goto === 'av').map(feed2Video)
    const subs = await get_subscribes(ctx)
    for (const sub of subs) {
        const filter = await Filter.new(ctx, sub.id)
        await spider_work(ctx, config, sub.keyword, filter)
        // try feed
        feed.forEach(async ([u, v]) => await insert_video(ctx, v, u, filter))
    }
}

async function spider_work(ctx: Context, config: Config, keyword: string, filter: Filter) {
    // try default search
    let res2 = await doSearch(config, keyword)
    res2.result
        .filter(r => r.result_type === 'video')
        .flatMap(r => r.data.filter(v => v.type === 'video'))
        .forEach(async r => {
            const [u, v] = from_search(r)
            await insert_video(ctx, v, u, filter)
        })
    // try search newest
    let res3 = await doTypeSearch(config, {
        search_type: SearchType.video,
        keyword: keyword,
        order: SearchOrder.pubdate,
    })
    res3.result.filter(r => r.type === 'video').forEach(async r => {
        const [u, v] = from_search(r)
        await insert_video(ctx, v, u, filter)
    })
    // update last fav
    const fav = (await ctx.database.get('biliuntag_favs', r => $.eq(r.sid, filter.sid))).pop()
    if (fav) {
        const medias = await get_favs(config, fav.mid)
        medias.forEach(async m => {
            const [u, v] = fav2Video(m)
            await insert_video(ctx, v, u, filter, true)
        })
    }
}

export async function re_calc(ctx: Context): Promise<string> {
    const subs = await get_subscribes(ctx)
    let count = 0
    for (const sub of subs) {
        const filter = await Filter.new(ctx, sub.id)
        const res = await ctx.database.join({
            v: 'biliuntag_video',
            u: ctx.database
                .select('biliuntag_user')
                .orderBy('time', 'desc')
                .groupBy('id', { time: 'time', name: 'name', face: 'face' }),
        },
            r => $.and($.eq(r.v.author, r.u.id)))
            .join('s', ctx.database.select('biliuntag_source'),
                (r, s) => $.and($.eq(s.avid, r.v.id), $.eq(s.sid, sub.id)), true)
            .execute()
        let s: Array<Source> = []
        for (const r of res) {
            const source = filter.calc(r.v, r.u)
            let stat = SubVideoStat.Wait
            if (source <= 50) stat = SubVideoStat.Reject
            if (source > 100) stat = SubVideoStat.Accept
            if (r.s) {
                // manuly Reject
                if (r.s.stat === SubVideoStat.Pushed ||
                    r.s.stat === SubVideoStat.Reject && r.s.source > 50) stat = r.s.stat
            }
            if (r.s && source === r.s.source && stat === r.s.stat) continue
            console.log(r.v.id, r.v.title, source, r.u.name, stat)
            s.push({ sid: sub.id, avid: r.v.id, source, stat })
        }
        count += s.length
        ctx.database.upsert('biliuntag_source', s)
    }
    return `刷新得分完成，数量: ${count}`
}