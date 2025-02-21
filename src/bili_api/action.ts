import { Config } from './config'
import { doRequest } from './util'

const dealUrl = 'https://api.bilibili.com/medialist/gateway/coll/resource/deal'

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
    const res: DealResponse = await doRequest(config, dealUrl, param)
}

