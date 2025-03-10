import { Context, Schema } from 'koishi'
import 'koishi-plugin-cron'
import { doSearch, search2msg } from './bili_api/search'
import { db } from './model'
import { re_calc, spider } from './spider'
import { tenant_command } from './tenant'
import { rule_command } from './rule'
import { feed_command, push } from './push'
import { find_command } from './find'
import { fav_commands } from './init'

export const name = 'bili-untag'

export interface Config {
  session?: string,
  agent?: string,
  push_cron?: string,
}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context, config: Config) {
  ctx.inject(['database'], ctx => {
    db(ctx)
    tenant_command(ctx)
    rule_command(ctx)
    ctx.command('recalc').action(async _ => await re_calc(ctx))
    find_command(ctx)
    fav_commands(ctx, config)
    ctx.command('spider').action(() => spider(ctx, config))
    ctx.command('push').action(() => push(ctx))
  })
  ctx.inject(['cron', 'database'], ctx => {
    ctx.cron('*/10 * * * *', () => spider(ctx, config))
    if (config.push_cron) {
      ctx.cron(config.push_cron, async () => push(ctx))
    }
    feed_command(ctx)
  })

  ctx.command('search <keyword:text>')
    .option('count', '-n <count:number>')
    .action(async ({ options }, keyword) => {
      const count = options.count ?? 5
      const res = await doSearch(config, keyword)
      const videos = res.result
        .filter(r => r.result_type === 'video')
        .slice(0, count)
        .flatMap(r => r.data.filter(v => v.type === 'video'))
      return search2msg(videos)
    })

}
