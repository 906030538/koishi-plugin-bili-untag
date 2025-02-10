import { Context, Schema } from 'koishi'
import { db } from './model'
import { doTypeSearch } from './bili_api/search'
import { getFeed } from './bili_api/feed'

export const name = 'bili-untag'

export interface Config {
  session?: string,
  agent?: string,
}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context, config: Config) {
  // ctx.inject(['database'], db)

  ctx.command("search <keyword>").action(async (_, keyword) => {
    let ret = await doTypeSearch(keyword, config.session)
    return ret
  })

  ctx.command("feed").action(async _ => {
    let ret = await getFeed(config.session)
    return ret
  })
}
