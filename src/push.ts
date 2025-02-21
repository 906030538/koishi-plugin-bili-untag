import { $, Context, h, Session } from 'koishi'
import { get_subscribes } from './subscribe'
import { SubVideoStat, Video } from './model'

export function make_msg(v: Video, u: string): string {
    return h('img', { src: v.pic }) + '\n' +
        v.title + ' | ' + v.pubdate.toLocaleString('zh-CN') + ' | UP：' + u + '\n' +
        v.bvid + ' | av' + v.id
}

export async function feed(ctx: Context, session: Session) {
    const subs = await get_subscribes(ctx, undefined, session)
    const ids = subs.map(s => s.id)
    if (ids.length === 0) return '找不到订阅'
    let res = await ctx.database
        .join({
            s: 'biliuntag_source',
            v: 'biliuntag_video',
            u: ctx.database
                .select('biliuntag_user')
                .groupBy('id', { time: r => $.max(r.time), name: 'name' })
        }, r => $.and(
            $.in(r.s.sid, ids),
            $.eq(r.s.stat, SubVideoStat.Accept),
            $.eq(r.s.avid, r.v.id),
            $.eq(r.v.author, r.u.id),
        ))
        .limit(10)
        .execute()
    console.log(res)
    const msg = res.map(r => make_msg(r.v, r.u.name)).join('\n\n')
    if (msg) {
        ctx.database.upsert('biliuntag_source', res.map(r => ({
            sid: r.s.sid,
            avid: r.s.avid,
            stat: SubVideoStat.Pushed
        })))
        return msg
    }
    return '没有更新了'
}

export async function push(ctx: Context): Promise<string | void> {
    const subs = await get_subscribes(ctx)
    let anymsg = false
    for (const sub of subs) {
        const res = await ctx.database
            .join({
                s: 'biliuntag_source',
                v: 'biliuntag_video',
                u: ctx.database
                    .select('biliuntag_user')
                    .groupBy('id', { time: r => $.max(r.time), name: 'name' })
            }, r => $.and(
                $.eq(r.s.sid, sub.id),
                $.eq(r.s.stat, SubVideoStat.Accept),
                $.eq(r.s.avid, r.v.id),
                $.eq(r.v.author, r.u.id),
            ))
            .limit(10)
            .execute()
        console.log(res)
        const msg = res.map(r => make_msg(r.v, r.u.name)).join('\n\n')
        if (msg) {
            ctx.database.upsert('biliuntag_source', res.map(r => ({
                sid: r.s.sid,
                avid: r.s.avid,
                stat: SubVideoStat.Pushed
            })))
            ctx.bots[0].broadcast(sub.target, msg)
            anymsg = true
        }
    }
    if (anymsg) return '推送完毕'
    return '没有更新'
}

export async function clear(ctx: Context, session: Session) {
    const subs = await get_subscribes(ctx, undefined, session)
    const ids = subs.map(s => s.id)
    if (ids.length === 0) return '找不到订阅'
    const acc = await ctx.database.get('biliuntag_source', r => $.eq(r.stat, SubVideoStat.Accept))
    console.log(acc)
    const res = await ctx.database.upsert('biliuntag_source',
        acc.map(r => ({ sid: r.sid, avid: r.avid, stat: SubVideoStat.Pushed }))
    )
    return `清理推送数： ${acc.length}`
}