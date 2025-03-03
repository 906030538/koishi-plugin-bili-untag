import { $, Context, h, Session } from 'koishi'
import { get_subscribes } from './subscribe'
import { Source, Tenant, SubVideoStat, Video } from './model'

export function make_msg(v: Video, u: string): string {
    return h('img', { src: v.pic }) + '\n' +
        v.pubdate.toLocaleString('zh-CN') + ' | ' + u + '\n' +
        v.title + '\n' +
        v.bvid + ' | av' + v.id
}

function get_sub_video(
    ctx: Context,
    ids: number[],
    stat: SubVideoStat[],
    count?: number,
    desc = false,
): Promise<Array<{ v: Video, u: { name: string }, s: Source }>> {
    let s = ctx.database
        .join({
            s: 'biliuntag_source',
            v: 'biliuntag_video',
            u: ctx.database
                .select('biliuntag_user')
                .orderBy('time', 'desc')
                .groupBy('id', { name: 'name' })
        }, r => $.and(
            $.in(r.s.tid, ids),
            $.in(r.s.stat, stat),
            $.eq(r.s.avid, r.v.id),
            $.eq(r.v.author, r.u.id)
        ))
    if (desc) s = s.orderBy('v.pubdate', 'desc')
    if (count) s = s.limit(count)
    return s.execute()
}

export async function recent(ctx: Context, count = 10): Promise<string> {
    const stat = [SubVideoStat.Accept, SubVideoStat.Pushed]
    const res = await get_sub_video(ctx, [1], stat, count, true)
    if (res.length) return res.map(r => make_msg(r.v, r.u.name)).join('\n\n')
    return '没有更新了'
}

export async function feed(
    ctx: Context,
    session: Session,
    count = 10,
    wait = false
): Promise<string> {
    const subs = await get_subscribes(ctx, undefined, session)
    const ids = subs.map(s => s.id)
    if (ids.length === 0) return await recent(ctx, count)
    let stat = [SubVideoStat.Accept]
    if (wait) stat.push(SubVideoStat.Wait)
    let res = await get_sub_video(ctx, ids, stat, count)
    const msg = res.map(r => make_msg(r.v, r.u.name)).join('\n\n')
    if (msg) {
        ctx.database.upsert('biliuntag_source', res.map(r => ({
            tid: r.s.tid,
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
    let res = await get_sub_video(ctx, ids, stat)
    const msg = res.map(r => make_msg(r.v, r.u.name) + ' | (' + r.s.source + ')').join('\n\n')
    if (msg) return msg
    return '没有更新'
}

export async function clear(ctx: Context, session: Session, tid?: number) {
    let subs: Tenant[]
    if (tid) {
        subs = await ctx.database.get('biliuntag_tenant', tid)
    } else {
        subs = await get_subscribes(ctx, undefined, session)
    }
    if (subs.length === 0) return '找不到订阅'
    const ids = subs.map(s => s.id)
    const acc = await ctx.database.get('biliuntag_source',
        r => $.and($.in(r.tid, ids), $.in(r.stat, [SubVideoStat.Accept, SubVideoStat.Wait])))
    const res = await ctx.database.upsert('biliuntag_source',
        acc.map(r => ({ tid: r.tid, avid: r.avid, stat: SubVideoStat.Pushed }))
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
    const tid = subs.map(s => s.id)
    let s: { tid: number, avid: number, stat: SubVideoStat }[]
    const r = await ctx.database.get('biliuntag_source',
        r => $.and($.eq(r.avid, avid), $.in(r.tid, tid))
    )
    const stat = accept ? SubVideoStat.Accept : SubVideoStat.Reject
    if (r.length) {
        s = r.map(s => ({ tid: s.tid, avid: s.avid, stat }))
    } else {
        s = tid.map(s => ({ tid: s, avid, stat }))
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
        .option('tid', '-t <tid:number>')
        .action(async ({ session, options }) => await clear(ctx, session, options.tid))
}

export async function push(ctx: Context): Promise<string | void> {
    const tenants = await ctx.database.join({ t: 'biliuntag_tenant', s: 'biliuntag_subscriber' },
        r => $.and($.eq(r.t.id, r.s.tid), $.eq(r.s.push, true))
    ).groupBy('t.id', { sub: r => $.array(r.s) }).execute()
    let anymsg = false
    for (const tenant of tenants) {
        const res = await get_sub_video(ctx, [tenant.t.id], [SubVideoStat.Accept], 10)
        if (res) {
            let pushd = false
            for (const sub of tenant.sub) {
                const bot = ctx.bots.find(b => b.platform === sub.platform)
                if (!bot) continue
                const msg = res.map(r => make_msg(r.v, r.u.name)).join('\n\n')
                if (sub.k_channel) bot.sendMessage(sub.k_channel, msg)
                else if (sub.k_user) bot.sendPrivateMessage(sub.k_user, msg)
                else continue
                pushd = true
            }
            if (!pushd) continue
            ctx.database.upsert('biliuntag_source', res.map(r => ({
                tid: r.s.tid,
                avid: r.s.avid,
                stat: SubVideoStat.Pushed
            })))
            anymsg = true
        }
    }
    if (anymsg) return '推送完毕'
    return '没有更新'
}