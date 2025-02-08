import { Context, Schema } from 'koishi'

export const name = 'bili-untag'

export interface Config {
  session?: string,
  agent?: string,
}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context, config: Config) {
  // write your plugin here
}
