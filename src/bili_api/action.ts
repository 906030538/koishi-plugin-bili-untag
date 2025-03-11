import { Config } from './config'
import { doRequest, get_csrf } from './util'

const DEAL_URL = 'https://api.bilibili.com/medialist/gateway/coll/resource/deal'

interface DealRequest {
    access_key?: string,
    rid: number,
    type: 2,
    add_media_ids?: string,
    del_media_ids?: string,
    csrf?: string,
}

interface DealResponse {
    prompt: boolean,
    ga_data?: null,
    toast_msg?: string,
    success_num?: number,
}

export async function doDeal(config: Config, avid: number, mlid: number): Promise<void> {
    let param: DealRequest = {
        rid: avid,
        type: 2,
        add_media_ids: mlid.toString(),
    }
    const res: DealResponse = await doRequest(config, DEAL_URL, param)
}

const TO_VIEW_URL = 'https://api.bilibili.com/x/v2/history/toview/add'

interface ToviewRequest {
    aid?: number,
    bvid?: string,
    csrf: string,
}

export async function addToView(config: Config, id: number | string): Promise<string> {
    let param: ToviewRequest = {
        csrf: await get_csrf(config)
    }
    switch (typeof id) {
        case 'number':
            param.aid = id
            break
        case 'string':
            param.bvid = id
            break
        default:
            return '-1'
    }
    return await doRequest(config, TO_VIEW_URL, param)
}
