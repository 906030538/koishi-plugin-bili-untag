import { $, Context, Session } from "koishi";
import { FavListIter } from "./bili_api/fav";
import { Config } from ".";
import { fav2Video } from "./convert";
import { update_user } from "./spider";
import { Favs, SubVideoStat } from "./model";

async function new_fav(session: Session, sid: number, mid: number): Promise<string> {
    const ret = await session.app.database.create('biliuntag_favs', {
        sid,
        mid
    })
    if (ret) return `新增收藏夹成功: ${ret.mid}`
    return '新增收藏夹失败'
}

async function del_fav(session: Session, sid: number, mid: number): Promise<string> {
    const ret = await session.app.database.remove('biliuntag_favs', {
        sid,
        mid
    })
    if (ret) return `移除收藏夹成功`
    return '移除收藏夹失败'
}

async function list_fav(session: Session, sid: number): Promise<string> {
    const ret = await session.app.database.get('biliuntag_favs', r => $.eq(r.sid, sid))
    if (ret) return ret.map(f => `${f.mid}`).join('\n')
    return '找不到任何收藏夹'
}

async function update_fav(
    session: Session,
    config: Config,
    sid: number,
    mid: number,
    all = false
): Promise<string> {
    let fav: Array<Favs> = []
    if (all || !mid) {
        fav = await session.app.database.get('biliuntag_favs', r => $.eq(r.sid, sid))
    } else {
        fav = await session.app.database
            .get('biliuntag_favs', r => $.and($.eq(r.sid, sid), $.eq(r.mid, mid)))
    }
    if (!fav) return '找不到任何收藏夹'
    let count = 0
    for (const f of fav) {
        let iter = new FavListIter(config, f.mid)
        await iter.all(async m => {
            const [u, v] = fav2Video(m)
            await update_user(session.app, u)
            await session.app.database.upsert('biliuntag_video', [v])
            const s = { sid: f.sid, avid: v.id, source: 0, stat: SubVideoStat.Pushed }
            await session.app.database.upsert('biliuntag_source', [s])
            count += 1
        })
    }
    return `更新收藏夹完成: ${count}`
}

export function fav_commands(ctx: Context, config: Config) {
    ctx.command('fav.new <sid:number> <mid:number>')
        .action(async ({ session }, sid, mid) => new_fav(session, sid, mid))
    ctx.command('fav.remove <sid:number> <mid:number>')
        .action(async ({ session }, sid, mid) => del_fav(session, sid, mid))
    ctx.command('fav.list <sid:number>')
        .action(async ({ session }, sid) => list_fav(session, sid))
    ctx.command('fav.update <sid:number> <mid:number>').option('all', '-a <all:boolean>')
        .action(async ({ session, options }, sid, mid) =>
            update_fav(session, config, sid, mid, options.all)
        )
}