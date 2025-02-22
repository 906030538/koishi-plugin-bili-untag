import { $, Context } from 'koishi'
import { doSearch, doTypeSearch, SearchOrder, SearchType } from './bili_api/search'
import { getFeed } from './bili_api/feed'
import { remove_cdn_domain } from './bili_api/util'
import { Config } from '.'
import { SubVideoStat, User, Video } from './model'
import { from_search, feed2Video } from './convert'
import { get_subscribes } from './subscribe'
import { Filter } from './rule'

async function update_user(ctx: Context, u: User) {
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

async function insert_video(ctx: Context, video: Video, user: User, filter: Filter) {
    const source = filter.calc(video, user)
    let stat = SubVideoStat.Wait
    if (source <= 0) return // Reject
    if (source > 100) stat = SubVideoStat.Accept
    await update_user(ctx, user)
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
                .groupBy('id', { time: r => $.max(r.time), name: 'name', face: 'face' }),
            c: 'biliuntag_source',
        },
            r => $.and($.eq(r.c.avid, r.v.id), $.eq(r.v.author, r.u.id)),
            { v: false, u: false, c: true })
            .where(r => $.ignoreNull($.and(
                $.eq(r.c.sid, sub.id),
                $.or($.ne(r.c.stat, SubVideoStat.Reject), $.ne(r.c.stat, SubVideoStat.Pushed)))
            ))
            .execute()
        count += res.length
        res.forEach(r => {
            const source = filter.calc(r.v, r.u)
            let stat = SubVideoStat.Wait
            if (source <= 0) stat = SubVideoStat.Reject
            if (source > 100) stat = SubVideoStat.Accept
            ctx.database.upsert('biliuntag_source', [{
                sid: filter.sid,
                avid: r.v.id,
                source,
                stat
            }])
        })
    }
    return `刷新得分完成，数量: ${count}`
}