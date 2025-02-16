import { $, Context } from 'koishi'
import { Rule, Video } from './model'

export async function get_rules(ctx: Context, sid: number): Promise<Array<Rule>> {
    return await ctx.database.get('biliuntag_rule', r => $.eq(r.sid, sid))
}

function rule2msg(rule: Rule): string {
    return `(${rule.id}:${rule.action}) ${rule.matcher}`
}

export async function rule(ctx: Context) {
    ctx.command('rule.new <sid:number> <source:number> <keyword> ')
        .action(async (_, sid, action, matcher) => {
            const rule = await ctx.database.create('biliuntag_rule', { sid, matcher, action })
            return '新规则创建: ' + rule2msg(rule)
        })
    ctx.command('rule.list <sid:number>').action(async (_, sid) => {
        let rules = await get_rules(ctx, sid)
        return rules.map(rule2msg).join('\n')
    })
    ctx.command('rule.update <id:number>')
        .option('keyword', '<keyword>')
        .option('source', '<source:number>')
        .action(async ({ options }, id) => {
            const res = await ctx.database.set('biliuntag_rule', id, {
                matcher: options.keyword,
                action: options.source
            })
            if (res.modified) {
                return `规则更新成功: ${id}`
            }
            return `找不到规则id`
        })
    ctx.command('rule.remove <sid:number>').action(async (_, id) => {
        const result = await ctx.database.remove('biliuntag_rule', id)
        if (result.removed) {
            return `删除规则成功: ${id}`
        } else {
            return `删除规则失败: ${id}`
        }
    })
}

export class Filter {
    sid: number
    rules: Array<Rule>

    calc = (video: Video): number => {
        let source = 0
        this.rules.forEach(rule => {
            if (video.title && video.title.indexOf(rule.matcher)
                || video.description && video.description.indexOf(rule.matcher)
                || video.tag && video.tag.indexOf(rule.matcher)) {
                source += rule.action
            }
        })
        return source
    }

    constructor(sid: number, rules: Array<Rule>) {
        this.sid = sid
        this.rules = rules
    }

    static async new(ctx: Context, sid: number): Promise<Filter> {
        let rules = await get_rules(ctx, sid)
        return new Filter(sid, rules)
    }
}
