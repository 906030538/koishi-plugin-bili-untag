import { $, Context, h, Session } from 'koishi'
import { get_subscribes } from './subscribe'
import { Subscribe, SubVideoStat, Video } from './model'

export function make_msg(v: Video, u: string): string {
    return h('img', { src: v.pic }) + '\n' +
        v.pubdate.toLocaleString('zh-CN') + ' | ' + u + '\n' +
        v.title + '\n' +
        v.bvid + ' | av' + v.id
}

export async function feed(ctx: Context, session: Session, count = 10, wait = false) {
    const subs = await get_subscribes(ctx, undefined, session)
    const ids = subs.map(s => s.id)
    if (ids.length === 0) return '找不到订阅'
    let stat = [SubVideoStat.Accept]
    if (wait) stat.push(SubVideoStat.Wait)
    let res = await ctx.database
        .join({
            s: 'biliuntag_source',
            v: 'biliuntag_video',
            u: ctx.database
                .select('biliuntag_user')
                .groupBy('id', { time: r => $.max(r.time), name: 'name' })
        }, r => $.and(
            $.in(r.s.sid, ids),
            $.in(r.s.stat, stat),
            $.eq(r.s.avid, r.v.id),
            $.eq(r.v.author, r.u.id),
        ))
        .limit(count)
        .execute()
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

export async function peek(ctx: Context, session: Session, wait = false) {
    const subs = await get_subscribes(ctx, undefined, session)
    const ids = subs.map(s => s.id)
    if (ids.length === 0) return '找不到订阅'
    let stat = [SubVideoStat.Accept, SubVideoStat.Wait]
    if (wait) stat = [SubVideoStat.Wait]
    let res = await ctx.database
        .join({
            s: 'biliuntag_source',
            v: 'biliuntag_video',
            u: ctx.database
                .select('biliuntag_user')
                .groupBy('id', { time: r => $.max(r.time), name: 'name' })
        }, r => $.and(
            $.in(r.s.sid, ids),
            $.in(r.s.stat, stat),
            $.eq(r.s.avid, r.v.id),
            $.eq(r.v.author, r.u.id),
        ))
        .execute()
    const msg = res.map(r => make_msg(r.v, r.u.name) + ' | (' + r.s.source + ')').join('\n\n')
    if (msg) return msg
    return '没有更新'
}

export async function clear(ctx: Context, session: Session, sid?: number) {
    let subs: Subscribe[]
    if (sid) {
        subs = await ctx.database.get('biliuntag_subscribe', sid)
    } else {
        subs = await get_subscribes(ctx, undefined, session)
    }
    if (subs.length === 0) return '找不到订阅'
    const ids = subs.map(s => s.id)
    const acc = await ctx.database.get('biliuntag_source',
        r => $.and($.in(r.sid, ids), $.in(r.stat, [SubVideoStat.Accept, SubVideoStat.Wait])))
    const res = await ctx.database.upsert('biliuntag_source',
        acc.map(r => ({ sid: r.sid, avid: r.avid, stat: SubVideoStat.Pushed }))
    )
    return `清理推送数： ${acc.length}`
}

export async function update(ctx: Context, session: Session, id: string, accept = true) {
    if (!id) return '缺少av/BV号'
    let avid: number = NaN
    if (!id.startsWith('BV')) {
        if (id.startsWith('av') || id.startsWith('AV')) avid = Number(id.slice(2))
        else avid = Number(id)
        if (isNaN(avid)) return '错误的av/BV号'
    } else {
        const v = await ctx.database.get('biliuntag_video', r => $.eq(r.bvid, id))
        if (!v.length) return '未收录，暂不支持BV'
        avid = v[0].id
    }
    const subs = await get_subscribes(ctx, undefined, session)
    if (!subs.length) return '找不到订阅'
    const sid = subs.map(s => s.id)
    let s: { sid: number, avid: number, stat: SubVideoStat }[]
    const r = await ctx.database.get('biliuntag_source',
        r => $.and($.eq(r.avid, avid), $.in(r.sid, sid))
    )
    const stat = accept ? SubVideoStat.Accept : SubVideoStat.Reject
    if (r.length) {
        s = r.map(s => ({ sid: s.sid, avid: s.avid, stat }))
    } else {
        s = sid.map(s => ({ sid: s, avid, stat }))
    }
    const res = await ctx.database.upsert('biliuntag_source', s)
    return '已完成'
}

export function feed_command(ctx: Context) {
    ctx.command('feed <count:number>')
        .option('wait', '-w <wait:boolean>')
        .action(async ({ options, session }, count) => await feed(ctx, session, count, options.wait))
    ctx.command('feed.peek')
        .option('wait', '-w <wait:boolean>')
        .action(async ({ options, session }) => await peek(ctx, session, options.wait))
    ctx.command('feed.reject <id>').action(async ({ session }, id) => update(ctx, session, id, false))
    ctx.command('feed.accept <id>').action(async ({ session }, id) => update(ctx, session, id, true))
    ctx.command('feed.clear')
        .option('sid', '-s <sid:number>')
        .action(async ({ session, options }) => await clear(ctx, session, options.sid))
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