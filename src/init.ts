import { $, Context, Session } from 'koishi'
import { FavListIter } from './bili_api/fav'
import { Config } from '.'
import { fav2Video } from './convert'
import { update_user } from './spider'
import { Favs, SubVideoStat } from './model'

async function new_fav(session: Session, tid: number, mid: number): Promise<string> {
    if (typeof tid !== 'number' || typeof mid !== 'number') return '参数错误'
    const ret = await session.app.database.create('biliuntag_favs', {
        tid,
        mid
    })
    if (ret) return `新增收藏夹成功: ${ret.mid}`
    return '新增收藏夹失败'
}

async function del_fav(session: Session, tid: number, mid: number): Promise<string> {
    if (typeof tid !== 'number' || typeof mid !== 'number') return '参数错误'
    const ret = await session.app.database.remove('biliuntag_favs', {
        tid,
        mid
    })
    if (ret) return `移除收藏夹成功`
    return '移除收藏夹失败'
}

async function list_fav(session: Session, tid: number): Promise<string> {
    if (typeof tid !== 'number') return '参数错误'
    const ret = await session.app.database.get('biliuntag_favs', r => $.eq(r.tid, tid))
    if (ret) return ret.map(f => `${f.mid}`).join('\n')
    return '找不到任何收藏夹'
}

async function update_fav(
    session: Session,
    config: Config,
    tid: number,
    mid: number,
    all = false
): Promise<string> {
    let fav: Array<Favs> = []
    if (typeof tid !== 'number') return '参数错误'
    if (all || !mid) {
        fav = await session.app.database.get('biliuntag_favs', r => $.eq(r.tid, tid))
    } else {
        fav = await session.app.database
            .get('biliuntag_favs', r => $.and($.eq(r.tid, tid), $.eq(r.mid, mid)))
    }
    if (!fav) return '找不到任何收藏夹'
    let count = 0
    for (const f of fav) {
        let avids = []
        await new FavListIter(config, f.mid).all(async m => {
            const [u, v] = fav2Video(m)
            await update_user(session.app, u)
            await session.app.database.upsert('biliuntag_video', [v])
            avids.push(v.id)
            count += 1
        })
        const sources = await session.app.database.select('biliuntag_source')
            .where(r => $.and($.eq(r.tid, f.tid), $.in(r.avid, avids), $.ne(r.stat, SubVideoStat.Wait)))
            .project('avid')
            .execute()
        const s = avids.filter(id => !sources.includes(id))
            .map(id => ({ tid: f.tid, avid: id, stat: SubVideoStat.Accept }))
        await session.app.database.upsert('biliuntag_source', s)
    }
    return `更新收藏夹完成: ${count}`
}

export function fav_commands(ctx: Context, config: Config) {
    ctx.command('fav.new <tid:number> <mid:number>')
        .action(async ({ session }, tid, mid) => new_fav(session, tid, mid))
    ctx.command('fav.remove <tid:number> <mid:number>')
        .action(async ({ session }, tid, mid) => del_fav(session, tid, mid))
    ctx.command('fav.list <tid:number>')
        .action(async ({ session }, tid) => list_fav(session, tid))
    ctx.command('fav.update <tid:number> <mid:number>').option('all', '-a <all:boolean>')
        .action(async ({ session, options }, tid, mid) =>
            update_fav(session, config, tid, mid, options.all)
        )
}