import { $, Context, h, Session } from 'koishi'
import { get_subscribes } from './subscribe'
import { Source, Tenant, SubVideoStat, Video, User } from './model'

export function make_table(res: { v: Video, u: { name: string } }[]): h {
    let msg = '|cover|BV|Title|Author|pubdate|view|\n|-|-|-|-|-|-|'
    for (let r of res) {
        msg += make_row(r.v, r.u.name)
    }
    return h('markdown', msg)
}

function make_row(v: Video, u: string): string {
    let msg = '\n|![cover #160px #90px](' + v.pic + ')|'
    msg += `[${v.bvid}](https://b23.tv/${v.bvid})|`
    msg += v.title.replaceAll('|', '\\|') + `|`
    msg += u.replaceAll('|', '\\|') + '|'
    msg += v.pubdate.toLocaleString('zh-CN') + '|'
    msg += `${v.view}|`
    return msg
}

function make_text_msg(v: Video, u: string): string {
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

export async function recent(ctx: Context, count = 10): Promise<string | h> {
    const stat = [SubVideoStat.Accept, SubVideoStat.Pushed]
    const res = await get_sub_video(ctx, [1], stat, count, true)
    if (res.length) return make_table(res)
    return '没有更新了'
}

export async function feed(
    ctx: Context,
    session: Session,
    count = 10,
    wait = false
): Promise<string | h> {
    const subs = await get_subscribes(ctx, undefined, session)
    const ids = subs.map(s => s.id)
    if (ids.length === 0) return await recent(ctx, count)
    let stat = [SubVideoStat.Accept]
    if (wait) stat.push(SubVideoStat.Wait)
    let res = await get_sub_video(ctx, ids, stat, count)
    if (!res) return '没有更新了'
    ctx.database.upsert('biliuntag_source', res.map(r => ({
        tid: r.s.tid,
        avid: r.s.avid,
        stat: SubVideoStat.Pushed
    })))
    return make_table(res)
}

export async function peek(ctx: Context, session: Session, wait = false): Promise<string | h> {
    const subs = await get_subscribes(ctx, undefined, session)
    const ids = subs.map(s => s.id)
    if (ids.length === 0) return '找不到订阅'
    let stat = [SubVideoStat.Accept, SubVideoStat.Wait]
    if (wait) stat = [SubVideoStat.Wait]
    let res = await get_sub_video(ctx, ids, stat)
    if (!res) return '没有更新了'
    return make_table(res)
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

function find_v(e: string | undefined): [string, number] | undefined {
    if (!e) return
    let av = /av(\d+)/.exec(e)?.[0]
    let bv = /BV[0-9A-Za-z]+/.exec(e)?.[0]
    if (av && av.length > 1) {
        return [bv ?? av, Number(av[1])]
    }
    if (bv) {
        return [bv, NaN]
    }
}

export async function update(ctx: Context, session: Session, id: string, accept = true) {
    let avid: number = NaN
    let v: Video | undefined = undefined;
    if (!id) {
        for (var ele of session.event?._data?.d?.msg_elements) {
            const m = find_v(ele.content)
            if (m) {
                [id, avid] = m
                break
            }
        }
        if (!id) return '缺少av/BV号'
    }
    if (!avid && !id.startsWith('BV')) {
        if (id.startsWith('av') || id.startsWith('AV')) avid = Number(id.slice(2))
        else avid = Number(id)
        if (isNaN(avid)) return '错误的av/BV号'
    }
    if (avid) {
        v = (await ctx.database.get('biliuntag_video', r => $.eq(r.id, avid)))?.[0];
    } else {
        const r = await ctx.database.get('biliuntag_video', r => $.eq(r.bvid, id))
        if (!r.length) return '未收录，暂不支持BV'
        v = r[0];
        avid = v.id
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
    return `${accept ? 'Accept' : 'Reject'} OK: ${v?.title}`
}

export function feed_command(ctx: Context) {
    ctx.command('feed <count:number>').alias("更新")
        .option('wait', '-w <wait:boolean>')
        .action(async ({ options, session }, count) => await feed(ctx, session!, count, options!.wait))
    ctx.command('feed.peek').alias("peek")
        .option('wait', '-w <wait:boolean>')
        .action(async ({ options, session }) => await peek(ctx, session!, options!.wait))
    ctx.command('feed.reject <id>').alias("不收录")
        .action(async ({ session }, id) => update(ctx, session!, id, false))
    ctx.command('feed.accept <id>').alias("收录")
        .action(async ({ session }, id) => update(ctx, session!, id, true))
    ctx.command('feed.clear').alias("清空")
        .option('tid', '-t <tid:number>')
        .action(async ({ session, options }) => await clear(ctx, session!, options!.tid))
    ctx.command('board')
        .option('count', '-c <count:number>')
        .option('days', '-d <days:number>')
        .alias('日榜', { options: { days: 1 } })
        .alias('周榜', { options: { days: 7 } })
        .alias('月榜', { options: { days: 30 } })
        .action(async ({ options, session }) => await board(ctx, session!, options!.days, options!.count))
}

export async function push(ctx: Context): Promise<string | void> {
    const tenants = await ctx.database.join({ t: 'biliuntag_tenant', s: 'biliuntag_subscriber' },
        r => $.and($.eq(r.t.id, r.s.tid), $.eq(r.s.push, true))
    ).groupBy('t.id', { sub: r => $.array(r.s) }).execute()
    let anymsg = false
    for (const tenant of tenants) {
        const res = await get_sub_video(ctx, [tenant.t.id], [SubVideoStat.Accept], 10)
        if (!res) continue
        let pushd = false
        for (const sub of tenant.sub) {
            const bot = ctx.bots.find(b => b.platform === sub.platform)
            if (!bot) continue
            const msg = make_table(res)
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
    if (anymsg) return '推送完毕'
    return '没有更新'
}

function get_board(
    ctx: Context,
    ids: number[],
    days: number,
    count: number,
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
            $.in(r.s.stat, [SubVideoStat.Accept, SubVideoStat.Pushed]),
            $.eq(r.s.avid, r.v.id),
            $.eq(r.v.author, r.u.id),
        ))
    if (days >= 0) {
        let start = new Date();
        start.setHours(0, 0, 0, 0)
        start.setDate(start.getDate() - days)
        s = s.where(r => $.gt(r.v.pubdate, start))
    }
    return s.orderBy('v.favorite', 'desc')
        .orderBy('v.view', 'desc')
        .limit(count)
        .execute()
}

export function make_board_msg(i: number, v: Video, u: string): string {
    return i + '. ' + v.bvid + ' | '
        + v.title + ' '
        + '[' + u + '] '
        + v.pubdate.toLocaleString('zh-CN') + ' | '
        + 'av' + v.id
        + ' view:' + v.view
        + ' fav:' + v.favorite
}

export async function board(
    ctx: Context,
    session: Session,
    days = 7,
    count = 10,
): Promise<string | h> {
    const subs = await get_subscribes(ctx, undefined, session)
    const ids = subs.map(s => s.id)
    if (ids.length === 0) return '找不到订阅'
    let res = await get_board(ctx, ids, days, count)
    if (!res) return '榜上无名'
    ctx.database.upsert('biliuntag_source', res.map(r => ({
        tid: r.s.tid,
        avid: r.v.id,
        stat: SubVideoStat.Pushed
    })))
    return make_table(res)
}

export async function weekly(ctx: Context): Promise<string | void> {
    const tenants = await ctx.database.join({ t: 'biliuntag_tenant', s: 'biliuntag_subscriber' },
        r => $.and($.eq(r.t.id, r.s.tid), $.eq(r.s.push, true))
    ).groupBy('t.id', { sub: r => $.array(r.s) }).execute()
    let anymsg = false
    for (const tenant of tenants) {
        const res = await get_board(ctx, [tenant.t.id], 7, 10)
        if (!res) continue
        let pushd = false
        for (const sub of tenant.sub) {
            const bot = ctx.bots.find(b => b.platform === sub.platform)
            if (!bot) continue
            const msg = res.map((r, i) => make_board_msg(i, r.v, r.u.name)).join('\n')
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
    if (anymsg) return '推送完毕'
    return '没有更新'
}