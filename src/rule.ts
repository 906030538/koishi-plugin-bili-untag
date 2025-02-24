import { $, Context } from 'koishi'
import { Rule, RuleType, User, Video } from './model'

export async function get_rules(ctx: Context, id: number): Promise<Array<Rule>> {
    return await ctx.database.get('biliuntag_rule', r => $.eq(r.sid, id))
}

function rule2msg(rule: Rule): string {
    const text = (rule.type === RuleType.Date)
        ? new Date(Number(rule.matcher[0])).toLocaleString('zh-CN')
        : rule.matcher.join(',')
    return `(${rule.id}:${rule.action}) ${text}`
}

function normalize_date(input: string): string {
    if (!isNaN(Number(input))) return input
    return Date.parse(input).toString()
}

export async function rule(ctx: Context) {
    ctx.command('rule.new <sid:number> <source:number> [keyword:text]')
        .option('type', '-t <type>')
        .option('json', '-j <json:text>')
        .action(async ({ options }, sid, source, keyword) => {
            if (typeof sid !== 'number') return '缺少订阅id'
            if (typeof source !== 'number') return '缺少积分'
            let matcher: Array<string> = []
            if (options.json) {
                try {
                    matcher = JSON.parse(options.json)
                } catch {
                    return '解析json失败'
                }
            } else if (keyword) {
                matcher = keyword.split(',')
            }
            let type = RuleType.Text
            switch (options.type) {
                case 'title':
                    type = RuleType.Title
                    break
                case 'desc':
                    type = RuleType.Desc
                    break
                case 'tag':
                    type = RuleType.Tag
                    break
                case 'author':
                    type = RuleType.Author
                    break
                case 'date':
                    type = RuleType.Date
                    if (matcher.length > 2) return '日期规则只允许上下界两个值'
                    matcher = matcher.map(normalize_date)
                    break
                case 'area':
                    type = RuleType.Area
                    break
                case 'regex':
                    type = RuleType.Regex
                    break
                case 'text':
                    break
                default:
                    return '错误的类型，支持的类型有: title,desc,tag,author,date,area,regex,text'
            }
            const rule = await ctx.database.create('biliuntag_rule', {
                sid,
                type,
                matcher,
                action: source
            })
            return '新规则创建: ' + rule2msg(rule)
        })
    ctx.command('rule.list <sid:number>').action(async (_, sid) => {
        if (typeof sid !== 'number') return '缺少订阅id'
        let rules = await get_rules(ctx, sid)
        return rules.map(rule2msg).join('\n')
    })
    ctx.command('rule.update <rid:number>')
        .option('source', '-s <source:number>')
        .option('json', '-j <json:text>')
        .option('keyword', '-k <keyword:text>')
        .option('append', '-a <append:text>')
        .action(async ({ options }, rid) => {
            if (typeof rid !== 'number') return '缺少规则id'
            let update: { matcher?: Array<string>, action?: number } = {}
            if (options.json) {
                try {
                    update.matcher = JSON.parse(options.json)
                } catch {
                    return '解析json失败'
                }
            } else if (options.keyword) {
                update.matcher = options.keyword.split(',')
                const old = await ctx.database.get('biliuntag_rule', rid)
                if (old.length != 1) return '找不到规则id'
                if (old[0].type === RuleType.Date) {
                    if (update.matcher.length > 2) return '日期规则只允许上下界两个值'
                    update.matcher = update.matcher.map(normalize_date)
                }
            } else if (options.append) {
                const old = await ctx.database.get('biliuntag_rule', rid)
                if (old.length != 1) return '找不到规则id'
                update.matcher = old[0].matcher
                if (old[0].type === RuleType.Date && update.matcher.length > 1) {
                    return '日期规则只允许上下界两个值'
                }
                update.matcher.push(normalize_date(options.append))
            }
            if (options.source) {
                update.action = options.source
            }
            const res = await ctx.database.set('biliuntag_rule', rid, update)
            if (res) {
                return `规则更新成功: ${rid}`
            }
            return '找不到规则id'
        })
    ctx.command('rule.remove <rid:number>').action(async (_, rid) => {
        if (typeof rid !== 'number') return '缺少规则id'
        const res = await ctx.database.remove('biliuntag_rule', rid)
        if (res) {
            return `删除规则成功: ${rid}`
        } else {
            return `删除规则失败: ${rid}`
        }
    })
}

export class Filter {
    sid: number
    rules: Array<Rule>

    calc = (video: Video, user?: User): number => {
        let source = 0
        this.rules.forEach(rule => {
            let matched = false
            switch (rule.type) {
                case RuleType.Title:
                    for (let m of rule.matcher) {
                        if (video.title.includes(m)) {
                            matched = true
                            break
                        }
                    }
                    break
                case RuleType.Desc:
                    if (!video.description) break
                    for (let m of rule.matcher) {
                        if (video.description.includes(m)) {
                            matched = true
                            break
                        }
                    }
                    break
                case RuleType.Tag:
                    for (let tag of video.tag) {
                        if (rule.matcher.includes(tag)) {
                            matched = true
                            break
                        }
                    }
                    break
                case RuleType.Author:
                    if (!user) break
                    for (let m of rule.matcher) {
                        if (user.name.includes(m)) {
                            matched = true
                            break
                        }
                    }
                    break
                case RuleType.Date:
                    if (typeof video.pubdate !== 'number') break
                    let [start, end] = rule.matcher.map(Number)
                    matched = true
                    if (start && video.pubdate < start || end && video.pubdate >= end) {
                        matched = false
                        break
                    }
                    break
                case RuleType.Area:
                    if (!video.area) break
                    for (let m of rule.matcher) {
                        if (video.area === Number(m)) {
                            matched = true
                            break
                        }
                    }
                    break
                case RuleType.Regex:
                    for (let m of rule.matcher) {
                        let r = RegExp(m)
                        if (r.exec(video.title) || r.exec(video.description) || r.exec(user?.name)) {
                            matched = true
                            break
                        }
                        for (let tag of video.tag) {
                            if (r.exec(tag)) {
                                matched = true
                                break
                            }
                        }
                    }
                    break
                case RuleType.Text:
                    for (let m of rule.matcher) {
                        if (video.title && video.title.includes(m)
                            || video.description && video.description.includes(m)
                            || video.tag && video.tag.includes(m)
                            || user && user.name.includes(m)
                        ) {
                            matched = true
                            break
                        }
                    }
                default:
                    break
            }
            if (matched) {
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
