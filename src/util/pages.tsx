import type { Hono } from "hono"
import type { UrlString } from "./urls.ts"
import type { Context } from "hono"
import { z } from "zod"
import env from "../env.ts"
import { entriesHelper } from "./entriesHelper.ts"
import { pb } from "../pb.ts"
import type { CollectionResponses, Collections, TimedKvResponse, TimedRoomparticipantResponse, TimedRoomsResponse } from "../pocketbase-types.ts"


// Configuration types
type ListConfig<T, E = unknown> = {
    type: "list"
    collection: T
    filter: string
    expand: string
    __expandType: E
}
type OneData<T, E> = ListConfig<T, E> 
type DataConfig<T, E = unknown> = Record<string, OneData<T, E>>

type PageConfig<Data extends DataConfig<Collections>> = {
    route: UrlString
    app: Hono
    view: (ctx: PageContext<Data>) => Promise<string>
    data: Data
}

// After processing types:

type PBEntry<D extends OneData<Collections, unknown>> = Omit<CollectionResponses[D["collection"]], "expand"> & { expand: D["__expandType"]}

type PageContext<Data extends DataConfig<Collections>> = {
    c: Context<any>
    dataDef: Data
    data: {
        [K in keyof Data]: PBEntry<Data[K]>[]
    }
}

// util.page.create
export function create<const Data extends Record<string, OneData<Collections, unknown>>>(config: PageConfig<Data>) {
    const { route, app, view, data: dataDef } = config

    async function getAllData() {
        async function getOneField(name: string, config: OneData<Collections, unknown>): Promise<unknown[]> {
            const entries = await pb.collection(config.collection).getFullList({
                filter: config.filter,
                expand: config.expand,
            })
            return entries as PBEntry<any>[]
        }
        console.log(`Querying data for page [${Object.keys(dataDef).length}]: ${Object.keys(dataDef).join(', ')}`)
        return await entriesHelper(dataDef, async (name, config) =>
            [name, await getOneField(name, config)]
        ) as { [K in keyof Data]: any }
    }

    app.get(route, async (c) => {
        const context: PageContext<Data> = {
            c: c,
            dataDef: dataDef,
            data: await getAllData(),
        }
        return c.html(view(context))
    })
}

export function dataList<T extends Collections, E = unknown>(config: Omit<ListConfig<T, unknown>, "__expandType">): ListConfig<T, E> {
    return config as ListConfig<T, E>
}

async () => {
    // Noop sampling types
    create({
        route: (0 as any),
        app: (0 as any),
        data: {
            rooms: dataList({
                type: "list",
                collection: "timed_roomparticipant",
                filter: `user = "ai7xwssf64cvrbg"`,
                expand: "room",
            }),
        },
        view: async (ctx) => {
            const { rooms } = ctx.data
            return <></>
        },
    })
}
