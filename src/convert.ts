import { Media } from './bili_api/fav'
import { Item, Owner, } from './bili_api/feed'
import { Video as SearchVideo } from './bili_api/search'
import { Video, User } from './model'

export function duration_str2sec(s: string): number {
    let d = s.split(':', 2).map(i => parseInt(i))
    if (d.length === 2) return d[0] * 60 + d[1]
    return d[0] ?? 0
}

export function remove_html_tag(s: string): string {
    return s
        .replaceAll('<em class="keyword">', '')
        .replaceAll('</em>', '')
}

export function from_search(that: SearchVideo): [User, Video] {
    const v: Video = {
        id: that.aid,
        bvid: that.bvid,
        author: that.mid,
        area: parseInt(that.typeid),
        pubdate: that.pubdate * 1000,
        senddate: that.senddate * 1000,
        title: remove_html_tag(that.title),
        description: that.description,
        tag: that.tag.split(','),
        pic: 'http:' + that.pic,
        duration: duration_str2sec(that.duration),
        view: that.play,
        like: that.like,
        favorite: that.favorites,
        reply: that.review,
        danmaku: that.video_review,
    }
    const u: User = {
        id: that.mid,
        time: new Date(),
        name: that.author,
        face: that.upic,
    }
    return [u, v]
}

export function owner2user(owner: Owner): User {
    return {
        id: owner.mid,
        name: owner.name,
        face: owner.face,
        time: new Date(),
    }
}

export function feed2Video(item: Item): [User, Video] {
    const u: User = owner2user(item.owner)
    const v: Video = {
        id: item.id,
        bvid: item.bvid,
        author: u.id,
        pubdate: item.pubdate * 1000,
        title: item.title,
        pic: item.pic,
        duration: item.duration,
        view: item.stat.view,
        like: item.stat.like,
        danmaku: item.stat.danmaku,
    }
    return [u, v]
}

export function fav2Video(media: Media): [User, Video] {
    const u: User = owner2user(media.upper)
    const v: Video = {
        id: media.id,
        bvid: media.bvid,
        author: u.id,
        pubdate: media.pubtime * 1000,
        senddate: media.ctime * 1000,
        title: media.title,
        description: media.intro,
        pic: media.cover,
        duration: media.duration,
        view: media.cnt_info.play,
        favorite: media.cnt_info.collect,
        danmaku: media.cnt_info.danmaku,
    }
    return [u, v]
}