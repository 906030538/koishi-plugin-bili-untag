import { Context, Schema } from 'koishi'
import 'koishi-plugin-cron'
import { doSearch, search2msg } from './bili_api/search'
import { db } from './model'
import { spider } from './spider'
import { subscribe } from './subscribe'
import { rule } from './rule'
import { feed } from './push'

export const name = 'bili-untag'

export interface Config {
  session?: string,
  agent?: string,
}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context, config: Config) {
  ctx.inject(['database'], ctx => {
    db(ctx)
    subscribe(ctx)
    rule(ctx)
    ctx.command('find').action(async _ => { })
  })
  ctx.inject(['cron', 'database'], ctx => {
    ctx.cron('*/10 * * * *', () => spider(ctx, config))
    ctx.command('spider').action(() => spider(ctx, config))
    // ctx.cron('0 0-2,9-23 * * *', async () => push(ctx))
    ctx.command('feed').action(async ({ session }) => await feed(ctx, session))
  })

  ctx.command('search <keyword:text>').action(async (_, keyword) => {
    const res = await doSearch(config, keyword)
    const videos = res.result
      .filter(r => r.result_type === 'video')
      .flatMap(r => r.data.filter(v => v.type === 'video'))
    return search2msg(videos)
  })

}
