import { $, Context } from "koishi";
import { Config } from ".";
import { doTypeSearch } from "./bili_api/search";
import { from_search, User } from "./model";

async function update_user(ctx: Context, u: User) {
    let old = await ctx.database
        .select('biliuntag_user')
        .where(r => $.eq(r.id, u.id))
        .orderBy(r => r.time, 'desc')
        .limit(1)
        .execute()[0];
    if (!old || old.face !== u.face || old.name !== u.name) {
        ctx.database.upsert('biliuntag_user', [u]);
    }
}

export async function spider(ctx: Context, config: Config) {
    // try feed
    // try default search
    // try search newest
    let res = await doTypeSearch(config, config.keyword)
    res.result.filter(r => r.type === 'video').forEach(async r => {
        let [v, u] = from_search(r)
        await update_user(ctx, u);

        await ctx.database.upsert('biliuntag_video', [v])
    })
}
