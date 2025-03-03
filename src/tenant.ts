import { $, Context, Session } from "koishi"
import { session2subscriber, subscribe_command } from "./subscribe"
import { Tenant } from "./model"

async function new_tenant(session: Session, keyword: string): Promise<string> {
    const tenant = await session.app.database.create('biliuntag_tenant', {
        keyword,
    })
    const sub = await session.app.database.create('biliuntag_subscriber',
        session2subscriber(session, tenant.id))
    return `新租户已经创建: (${tenant.id}) ${keyword}`
}

async function del_tenant(ctx: Context, tid: number): Promise<string> {
    if (typeof tid !== 'number') return '缺少租户id'
    const sub = await ctx.database.remove('biliuntag_tenant', tid)
    if (sub.removed > 0) {
        return `注销租户成功: ${tid}`
    } else {
        return `注销租户失败: ${tid}`
    }
}

async function update_tenant(
    ctx: Context,
    tid: number,
    options: { json?: string, keyword?: string, append?: string }
): Promise<string> {
    if (typeof tid !== 'number') return '缺少租户id'
    let update: { id: number, target?: Array<string> } = { id: tid }
    if (options.json) {
        try {
            update.target = JSON.parse(options.json)
        } catch {
            return '解析json失败'
        }
    } else if (options.keyword) {
        update.target = options.keyword.split(',')
    } else if (options.append) {
        const old = await ctx.database.get('biliuntag_tenant', tid)
        if (old.length != 1) return '找不到规则id'
        update.target.push(options.append)
    }

    const sub = await ctx.database.upsert('biliuntag_tenant', [update])
    if (sub.matched) {
        return `更新租户成功: ${tid}`
    }
    return '注销租户失败'
}

export function get_subscribes(ctx: Context, keyword?: string):
    Promise<Array<Tenant>> {
    let s = ctx.database.select('biliuntag_tenant')
    if (keyword) {
        s = s.where(r => $.eq(r.keyword, keyword))
    }
    return s.execute()
}

export async function tenant_command(ctx: Context) {
    ctx.command('tenant.new <keyword:text>')
        .action(({ session }, keyword) => new_tenant(session, keyword))
    ctx.command('tenant.remove <tid:number>').action((_, tid) => del_tenant(ctx, tid))
    ctx.command('tenant.update <tid:number>')
        .option('json', '-j <json:text>')
        .option('keyword', '-k <keyword:text>')
        .option('append', '-a <append:text>')
        .action(({ options }, tid) => update_tenant(ctx, tid, options))
    subscribe_command(ctx)
}