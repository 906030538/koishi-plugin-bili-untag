import { $, Context } from 'koishi'
import { Video, SubVideoStat } from './model'
import { make_msg } from './push'

export function find_command(ctx: Context) {
    ctx.command('find <keyword:text>')
        .option('count', '-n <count:number>')
        .action(async ({ options }, keyword) => await find(ctx, keyword, options.count))
}

async function find(ctx: Context, keyword: string, limit = 3) {
    if (!keyword) return '请输入关键字'
    let lowerKey = keyword.toLowerCase()
    const r = await ctx.database.join(
        { v: 'biliuntag_video', s: 'biliuntag_source', u: 'biliuntag_user' },
        r => $.and($.eq(r.v.id, r.s.avid), $.eq(r.v.author, r.u.id)),
        { v: false, s: true, u: false }
    )
        .where(r => $.ne(r.s.stat, SubVideoStat.Reject))
        .execute()
    let found: Map<number, [Video, string]> = new Map()
    for (const { v, u } of r) {
        if (v.title.toLowerCase().includes(lowerKey)
            || v.description && v.description.toLowerCase().includes(lowerKey)
            || v.tag.find(t => t.toLowerCase() === lowerKey)
            || u.name.toLowerCase().includes(lowerKey)
        ) {
            found.set(v.id, [v, u.name])
        }
        if (found.size >= limit) break
    }
    if (!found.size) return '找不到相关投稿'
    const msg = Array.from(found.values())
    return msg.map(([v, u]) => make_msg(v, u)).join('\n\n')
}