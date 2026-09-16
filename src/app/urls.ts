import { pb, lib, ui, util } from '../kit.ts'
import { z } from "zod"

export type Urls = typeof urls
export const urls = util.urls.define({
    "home": {
        route: "/",
    },
    "sync": {
        route: "/sync",
    },
    "roomDetail": {
        route: "/room/:id",
        // TODO: Params fully unused at the moment
        params: z.object({
            id: z.string(),
        }),
    },
})
