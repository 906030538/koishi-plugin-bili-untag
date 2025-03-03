import { $, Context, Session } from 'koishi'
import { Tenant, Subscriber } from './model'

export function session2subscriber(session: Session, tid: number): Subscriber {
    let s: Subscriber = {
        tid,
        platform: session.platform,
        push: false
    }
    if (session.guildId) s.k_channel = session.guildId
    else s.k_user = session.userId
    return s
}

export function get_subscribes(ctx: Context, keyword?: string, session?: Session):
    Promise<Array<Tenant>> {
    let s = ctx.database.select('biliuntag_tenant')
    if (session) {
        if (session.guildId) {
            s = s.join('u', ctx.database.select('biliuntag_subscriber',
                r => $.and($.eq(
                    r.k_channel, session.guildId),
                    $.eq(r.platform, session.platform)
                )),
                (r, u) => $.eq(r.id, u.tid)
            )
        } else {
            s = s.join('u', ctx.database.select('biliuntag_subscriber',
                r => $.and($.eq(r.k_user, session.userId), $.eq(r.platform, session.platform))),
                (r, u) => $.eq(r.id, u.tid)
            )
        }
    }
    if (keyword) {
        s = s.where(r => $.eq(r.keyword, keyword))
    }
    return s.execute()
}

async function update_subscribe(
    session: Session,
    key: number | string,
    add: boolean
): Promise<string> {
    let s = session.app.database.select('biliuntag_tenant')
    if (typeof key === 'number') {
        s = s.where(key)
    } else {
        s = s.where(r => $.eq(r.keyword, key))
    }
    let ss = session.app.database.select('biliuntag_subscriber')
    if (session.guildId) {
        ss = ss.where(r => $.and(
            $.eq(r.platform, session.platform), $.eq(r.k_channel, session.guildId)
        ))
    } else {
        ss = ss.where(r => $.and(
            $.eq(r.platform, session.platform), $.eq(r.k_user, session.userId)
        ))
    }
    const subs = await s.join('s', ss, (t, s) => $.and($.eq(t.id, s.tid)), true)
        .groupBy('id', { id: 's.id', tid: 'id', keyword: 'keyword' })
        .execute()
    let sub: { id: number, tid: number, keyword: string }
    if (subs.length > 1) {
        session.send('请选择要订阅的id:\n' + subs.map(s => `(${s.tid}) ${s.keyword}`).join('\n'))
        const id = Number(await session.prompt())
        if (!id) return `id错误`
        sub = subs.find(s => s.tid === id)
    } else if (subs.length === 1) sub = subs[0]
    if (!sub) return '找不到该订阅'
    if (add) {
        if (sub.id) return '已订阅'
        try {
            const res = await session.app.database.create('biliuntag_subscriber',
                session2subscriber(session, sub.tid))
            if (res) return `订阅成功: (${res.id}) ${sub.keyword}`
        } catch (e) {
            return `订阅失败`
        }
    } else {
        if (!sub.id) return '未订阅'
        const res = await session.app.database.remove('biliuntag_subscriber', sub.id)
        if (res.removed) return `退订成功: (${sub.id}) ${sub.keyword}`
        return `退订失败`
    }
}

export async function subscribe_command(ctx: Context) {
    ctx.command('subscribe.get [key:text]')
        .option('all', '-a')
        .action(async ({ session, options }, key) => {
            let subs: Array<Tenant>
            if (options.all) {
                subs = await get_subscribes(ctx, key)
            } else {
                subs = await get_subscribes(ctx, key, session)
            }
            if (!subs.length) return '找不到任何订阅'
            return subs.map(s => `(${s.id}) ${s.keyword}`).join('\n')
        })
    ctx.command('subscribe.add [key:text]')
        .option('tid', '-t <tid:number>')
        .action(({ session, options }, key) => update_subscribe(session, options.tid ?? key, true))
    ctx.command('subscribe.cancel [key:text]')
        .option('tid', '-t <tid:number>')
        .action(({ session, options }, key) =>
            update_subscribe(session, options.tid ?? key, false))
}
