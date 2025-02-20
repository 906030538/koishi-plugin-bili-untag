import { Context, Schema } from 'koishi'
import 'koishi-plugin-cron'
import { doTypeSearch, search2msg, SearchOrder, SearchType } from './bili_api/search'
import { db } from './model'
import { feed2msg, getFeed } from './bili_api/feed'
import { spider } from './spider'
import { subscribe } from './subscribe'
import { rule } from './rule'
import { push } from './push'

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
    ctx.cron('0 0-2,9-23 * * *', async () => {
      // push
    })
    ctx.command('feed').action(async _ => {
      // let res = await getFeed(config)
      // return feed2msg(res)
      await push(ctx)
    })
  })

  ctx.command('search <keyword:text>').action(async (_, keyword) => {
    let res = await doTypeSearch(config, {
      search_type: SearchType.video,
      keyword,
      order: SearchOrder.pubdate,
    })
    return search2msg(res.result.filter(i => i.type === 'video'))
  })

}
