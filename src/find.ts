import { $, Context, Session } from 'koishi'
import { SubVideoStat } from './model'
import { make_table } from './push'

export function find_command(ctx: Context) {
    ctx.command('find <keyword:text>').alias("查找")
        .option('count', '-n <count:number>')
        .action(async ({ session, options }, keyword) => await find(ctx, session!, keyword, options!.count))
}

async function find(ctx: Context, session: Session, keyword: string, limit = 3) {
    if (!keyword) return '请输入关键字'
    let lowerKey = keyword.toLowerCase()
    const r = await ctx.database.join(
        { v: 'biliuntag_video', s: 'biliuntag_source', u: 'biliuntag_user' },
        r => $.and($.eq(r.v.id, r.s.avid), $.eq(r.v.author, r.u.id)),
        { v: false, s: true, u: false }
    )
        .where(r => $.ne(r.s.stat, SubVideoStat.Reject))
        .orderBy('v.pubdate', 'desc')
        .execute()
    let found = []
    let count = 0;
    for (const { v, u } of r) {
        if (v.title.toLowerCase().includes(lowerKey)
            || v.description && v.description.toLowerCase().includes(lowerKey)
            || (v.tag ?? []).find(t => t.toLowerCase() === lowerKey)
            || u.name.toLowerCase().includes(lowerKey)
        ) {
            count += 1
            if (found.length >= limit) continue
            found.push({ v, u })
        }
    }
    if (!found.length) return '找不到相关投稿'
    session.send(make_table(found))
    return `共找到 ${count} 稿相关视频`
}