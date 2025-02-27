import { $, Context } from "koishi";
import { SubVideoStat } from "./model";
import { make_msg } from "./push";

export function find_command(ctx: Context) {
    ctx.command('find <keyword:text>')
        .option('count', '-n <count:number>')
        .action(async ({ options }, keyword) => await find(ctx, keyword, options.count))
}

async function find(ctx: Context, keyword: string, limit = 3) {
    if (!keyword) return '请输入关键字'
    let found = []
    const r = await ctx.database.join(
        { v: 'biliuntag_video', s: 'biliuntag_source', u: 'biliuntag_user' },
        r => $.and($.eq(r.v.id, r.s.avid), $.eq(r.v.author, r.u.id)),
        { v: false, s: true, u: false }
    )
        .where(r => $.ne(r.s.stat, SubVideoStat.Reject))
        .execute()
    for (const { v, u } of r) {
        if (v.title.includes(keyword)
            || v.description && v.description.includes(keyword)
            || v.tag.includes(keyword)
            || u.name.includes(keyword)
        ) {
            found.push(make_msg(v, u.name))
        }
        if (found.length >= limit) break
    }
    if (!found.length) return '找不到相关投稿'
    return found.join('\n\n')
}