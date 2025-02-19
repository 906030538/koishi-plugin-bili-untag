import { $, Context, Session } from 'koishi'
import { Subscribe } from './model'

async function new_subscribe(session: Session, keyword: string): Promise<number> {
    const sub = await session.app.database.create('biliuntag_subscribe', {
        keyword,
        target: [session.platform + ':' + (session.guildId ?? session.userId)]
    })
    return sub.id
}

async function del_subscribe(ctx: Context, sid: number): Promise<boolean> {
    const sub = await ctx.database.remove('biliuntag_subscribe', sid)
    return sub.removed > 0
}

export function get_subscribes(ctx: Context, keyword?: string, session?: Session): Promise<Array<Subscribe>> {
    let s = ctx.database.select('biliuntag_subscribe')
    if (session) {
        const target = session.platform + ':' + (session.guildId ?? session.userId)
        s = s.where({ target: { $el: target } })
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
): Promise<Array<Subscribe>> {
    let subs: Array<Subscribe>
    if (typeof key === 'number') {
        subs = await session.app.database.get('biliuntag_subscribe', key)
    } else {
        subs = await session.app.database.get('biliuntag_subscribe', r => $.eq(r.keyword, key))
    }
    if (subs.length !== 1) return subs
    const sub = subs[0]
    const target = session.platform + ':' + (session.guildId ?? session.userId)
    let update = false
    if (add && !sub.target.includes(target)) {
        sub.target.push(target)
        update = true
    } else if (!add && sub.target.includes(target)) {
        sub.target = sub.target.filter(t => t !== target)
        update = true
    }
    if (update) {
        await session.app.database.set('biliuntag_subscribe', sub.id, { target: sub.target })
    }
    return [sub]
}

function subscribe2msg(subs: Array<Subscribe>): string {
    return subs.map(s => `(${s.id}) ${s.keyword}`).join('\n')
}

export async function subscribe(ctx: Context) {
    ctx.command('subscribe.new <keyword:text>').action(async ({ session }, keyword) => {
        const sid = await new_subscribe(session, keyword)
        return `新订阅已经创建: (${sid}) ${keyword}`
    })
    ctx.command('subscribe.get [key:text]')
        .option('all', '<all:boolean>')
        .action(async ({ session, options }, key) => {
            let subs: Array<Subscribe>
            if (options.all) {
                subs = await get_subscribes(ctx, key)
            } else {
                subs = await get_subscribes(ctx, key, session)
            }
            if (!subs.length) return '找不到任何订阅'
            return subscribe2msg(subs)
        })
    ctx.command('subscribe.add [key:text]')
        .option('id', '<sid:number>')
        .action(async ({ session, options }, key) => {
            const subs = await update_subscribe(session, options.id ?? key, true)
            if (!subs.length) return '找不到该订阅'
            if (subs.length === 1) return `订阅成功: (${subs[0].id}) ${subs[0].keyword}`
            session.send('请选择要订阅的id:\n' + subscribe2msg(subs))
            const id = Number(await session.prompt())
            if (!id) return `id错误`
            return session.execute(`subscribe.add --id ${id}`)
        })
    ctx.command('subscribe.cancel [key:text]')
        .option('id', '<sid:number>')
        .action(async ({ session, options }, key) => {
            const subs = await update_subscribe(session, options.id ?? key, false)
            if (!subs.length) return '找不到该订阅'
            if (subs.length === 1) return `退订成功: (${subs[0].id}) ${subs[0].keyword}`
            session.send('请选择要退订的id:\n' + subscribe2msg(subs))
            const id = Number(await session.prompt())
            if (!id) return `订阅失败，错误的id`
            return session.execute(`subscribe.cancel --id ${id}`)
        })
    ctx.command('subscribe.remove <sid:number>').action(async (_, sid) => {
        if (typeof sid !== 'number') return '缺少订阅id'
        if (await del_subscribe(ctx, sid)) {
            return `退订成功: ${sid}`
        } else {
            return `退订失败: ${sid}`
        }
    })
}
