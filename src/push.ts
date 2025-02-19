import { Context } from "koishi";
import { get_subscribes } from "./subscribe";

export async function push(ctx: Context): Promise<string | void> {
    const subs = await get_subscribes(ctx)
    for (const sub of subs) {
        await ctx.bots[0].broadcast(sub.target, 'test')
    }
}