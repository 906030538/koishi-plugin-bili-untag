import { Context, Schema } from 'koishi'
import { db } from './model'
import { doTypeSearch, search2msg } from './bili_api/search'
import { feed2msg, getFeed } from './bili_api/feed'
import 'koishi-plugin-cron'

export const name = 'bili-untag'

export interface Config {
  session?: string,
  agent?: string,
  keyword?: string,
}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context, config: Config) {
  ctx.inject(['database', 'cron'], ctx => {
    db(ctx)
    ctx.cron('*/10 * * * *', async () => {
      // spider work
    })
    ctx.cron('0 0-2,9-23 * * *', async () => {
      // push
    })
  })

  ctx.command("search <keyword>").action(async (_, keyword) => {
    let res = await doTypeSearch(config, keyword)
    return search2msg(res.result.filter(i => i.type === 'video'))
  })

  ctx.command("feed").action(async _ => {
    let res = await getFeed(config)
    return feed2msg(res, config.keyword)
  })
}
