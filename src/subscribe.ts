import { $, Context, Session } from 'koishi'
import { Subscribe } from './model'

export async function new_subscribe(ctx: Context, session: Session, keyword: string): Promise<number> {
    const sub = await ctx.database.create('biliuntag_subscribe', {
        keyword,
        target: [session.platform]
    })
    return sub.id
}

export function get_subscribes(ctx: Context, session?: Session): Promise<Array<Subscribe>> {
    let s = ctx.database.select('biliuntag_subscribe')
    if (session) {
        s = s.where(r => $.in(session.platform, r.target))
    }
    return s.execute()
}

export async function add_subscribe(ctx: Context, session: Session, sid: number): Promise<boolean> {
    const sub = await ctx.database.get('biliuntag_subscribe', sid)[0] as Subscribe | undefined
    if (sub && !~sub.target.indexOf(session.platform)) {
        sub.target.push(session.platform)
        await ctx.database.set('biliuntag_subscribe', sid, {
            target: sub.target
        })
        return true
    }
    return false
}

export async function un_subscribe(ctx: Context, session: Session, sid: number): Promise<boolean> {
    const sub = await ctx.database.get('biliuntag_subscribe', sid)[0] as Subscribe | undefined
    if (sub && ~sub.target.indexOf(session.platform)) {
        sub.target.filter(t => t !== session.platform)
        await ctx.database.set('biliuntag_subscribe', sid, {
            target: sub.target
        })
        return true
    }
    return false
}