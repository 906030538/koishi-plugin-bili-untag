import { $, Context } from "koishi";
import { Config } from ".";
import { doSearch, doTypeSearch, SearchOrder, SearchType } from "./bili_api/search";
import { User } from "./model";
import { from_search } from './convert';
import { getFeed } from "./bili_api/feed";
import { feed2Video } from "./convert";

async function update_user(ctx: Context, u: User) {
    const s = u.face.indexOf('.hdslb.com/')
    if (~s) u.face = u.face.slice(s + 10)
    const users = await ctx.database
        .select('biliuntag_user')
        .where(r => $.eq(r.id, u.id))
        .orderBy('time', 'desc')
        .execute()
    const old = users[0]
    if (!old || old.face !== u.face || old.name !== u.name) {
        await ctx.database.create('biliuntag_user', u);
    }
}

export async function spider(ctx: Context, config: Config) {
    // try feed
    let res1 = await getFeed(config)
    res1.item
        .filter(i => i.goto === 'av' && i.show_info === 0 && ~i.title.indexOf(config.keyword))
        .forEach(async i => {
            let [u, v] = feed2Video(i)
            await update_user(ctx, u);
            await ctx.database.upsert('biliuntag_video', [v])
        })
    // try default search
    let res2 = await doSearch(config, config.keyword)
    res2.result
        .filter(r => r.result_type === 'video')
        .flatMap(r => r.data.filter(v => v.type === 'video'))
        .forEach(async r => {
            let [u, v] = from_search(r)
            await update_user(ctx, u);
            await ctx.database.upsert('biliuntag_video', [v])
        })
    // try search newest
    let res3 = await doTypeSearch(config, {
        search_type: SearchType.video,
        keyword: config.keyword,
        order: SearchOrder.pubdate,
    })
    res3.result.filter(r => r.type === 'video').forEach(async r => {
        let [u, v] = from_search(r)
        await update_user(ctx, u);
        await ctx.database.upsert('biliuntag_video', [v])
    })
}
