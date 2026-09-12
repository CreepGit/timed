import type { Hono } from "hono"
import type { UrlString } from "./urls.ts"
import type { Context } from "hono"
import { z } from "zod"
import env from "../env.ts"
import { entriesHelper } from "./entriesHelper.ts"
import { pb } from "../pb.ts"
import type { CollectionResponses, Collections, TimedGuestUserRecord, TimedKvResponse, TimedRoomparticipantResponse, TimedRoomsResponse } from "../pocketbase-types.ts"
import { ClientResponseError, type RecordSubscription, type UnsubscribeFunc } from "pocketbase"
import { streamSSE } from "hono/streaming"
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/node"

// Configuration types
type ListConfig<T, E = unknown> = {
    type: "list"
    collection: T
    filter: string
    expand?: string
    __expandType: E
}
type OneConfig<T, E = unknown> = {
    type: "one"
    collection: T
    id: string
    expand?: string
    __expandType: E
}
type FirstConfig<T, E = unknown> = {
    type: "first"
    collection: T
    filter: string
    expand?: string
    __expandType: E
}
type OneData<T, E> = ListConfig<T, E> | OneConfig<T, E> | FirstConfig<T, E>
type DataConfig<T, E = unknown> = Record<string, OneData<T, E>>

type PageConfig<Data extends DataConfig<Collections>, Pre extends Record<string, any>> = {
    route: UrlString
    app: Hono
    view: (ctx: PageContext<Data, Pre>) => Promise<string>
    data: (ctx: PartialContext<Pre>) => Data
    pre?: (ctx: PreContext) => Promise<Pre>
}

// Processing Types

type PreContext = Omit<PartialContext<unknown>, "pre">

type PartialContext<Pre> = {
    route: string
    routeParams: Record<string, string>
    c: Context<any>
    pre: Pre
}

// After processing types:

type PBEntry<D extends OneData<Collections, unknown>> = Omit<CollectionResponses[D["collection"]], "expand"> & { expand: D["__expandType"]}

type PageContext<Data extends DataConfig<Collections>, Pre extends Record<string, unknown>> = {
    c: Context<any>
    dataDef: Data
    data: {
        // Conditionally based on type. Array or single entry
        // [K in keyof Data]: PBEntry<Data[K]>[]
        [K in keyof Data]: (
            Data[K] extends ListConfig<Collections, unknown> ? PBEntry<Data[K]>[] :
            Data[K] extends OneConfig<Collections, unknown> ? PBEntry<Data[K]> | null :
            Data[K] extends FirstConfig<Collections, unknown> ? PBEntry<Data[K]> | null :
            never
        )
    }
} & PartialContext<Pre>

// util.page.create
export function create<
    const Data extends Record<string, OneData<Collections, unknown>>,
    const Pre extends Record<string, unknown>
    >(config: PageConfig<Data, Pre>) {
    const { route, app, view, pre, data: dataFn } = config

    async function passOrCall<T>(pctx: PartialContext<Pre>, arg: T | ((ctx: PartialContext<any>) => T)) {
        // If function, call, if async function await call, if value pass it
        if (typeof arg === "function") {
            return await (arg as (ctx: PartialContext<Pre>)=>T)(pctx)
        }
        return arg as T
    }

    async function getAllData(pctx: PartialContext<Pre>, dataDef: Data) {
        async function getOneField(name: string, config: OneData<Collections, unknown>): Promise<PBEntry<any>[]|PBEntry<any>|null> {
            try {
                if (config.type === "list") {
                    const filter = config.filter
                    let entries: PBEntry<any>[] = []
                    try {
                        entries = await pb.collection(config.collection).getFullList({
                        filter: filter,
                            expand: config.expand,
                        })
                    } catch (error) {
                        if (error instanceof ClientResponseError) {
                            if (error.response.code === 404) {
                                return []
                            }
                        }
                        throw error
                    }
                    return entries as PBEntry<any>[]
                } else if (config.type === "one") {
                    const id = config.id
                    let entry: PBEntry<any> | null = null
                    try {
                        entry = await pb.collection(config.collection).getOne(id)
                    } catch (error) {
                        if (error instanceof ClientResponseError) {
                            if (error.response.status === 404) {
                                return null
                            }
                        }
                        throw error
                    }
                    return entry as PBEntry<any>
                } else if (config.type === "first") {
                    const filter = config.filter
                    let entry: PBEntry<any> | null = null
                    try {
                        entry = await pb.collection(config.collection).getFirstListItem(filter)
                    } catch (error) {
                        if (error instanceof ClientResponseError) {
                            if (error.response.code === 404) {
                                return null
                            }
                        }
                        throw error
                    }
                    return entry as PBEntry<any>
                } else {
                    throw new Error(`Unknown data type: ${(config as any).type}`)
                }
            } catch (error) {
                console.error(`Error getting data for ${name}: ${(error as any)?.message}\n`)
                throw error
            }
        }
        console.log(`Page "${route}" Params: ${JSON.stringify(pctx.routeParams)} Data[${Object.keys(dataDef).length} types]: ${Object.keys(dataDef).join(', ')}`)
        const nowStart = Date.now()
        
        const allEntries = await entriesHelper(dataDef, async (name, config) =>
            [name, await getOneField(name, config)]
        ) as { [K in keyof Data]: any }

        const span = Date.now() - nowStart
        const s = Object.entries(allEntries).map(([name, entries]) => {
            if (Array.isArray(entries)) {
                return `${name}#${entries.length}`
            } else {
                return `${name}`
            }
        }).join(", ")
        console.log(`Got: ${s} in ${span}ms`)

        return allEntries
    }

    async function getContext(c: Context<any>) {
        const routeParams = c.req.param()
        const preContext: PreContext = {
            route: route as string,
            routeParams: routeParams,
            c: c,
        }
        let preValue = {}
        if (pre) {
            preValue = await pre(preContext)
        }
        // console.log(`Pre context: ${JSON.stringify(preValue)}`)
        const partialContext: PartialContext<Pre> = {
            pre: preValue as Pre,
            ...preContext,
        }

        return partialContext
    }

    async function renderPage(pctx: PartialContext<Pre>) {
        const dataDef = dataFn(pctx)
        const context: PageContext<Data, Pre> = {
            dataDef: dataDef,
            data: await getAllData(pctx, dataDef),
            ...pctx,
        }

        const fullRoute = pctx.c.req.path
        return (await view(context) + <div data-init={`@get('${fullRoute}/sub')`}>SSE</div>)
    }

    app.get(route, async (c) => {
        const partialContext = await getContext(c)
        return c.html(renderPage(partialContext))
    })

    app.get(`${route}/sub`, async (c) => {
        return streamSSE(c, async (stream) => {
            const subs: Set<{
                unsub: UnsubscribeFunc,
                name: string,
            }> = new Set()
            const stallUntilAbort = new Promise<void>((resolve) => {
                stream.onAbort(() => {
                    resolve()
                })
            })
            function sub(name: string, newSub: UnsubscribeFunc) {
                console.log(`+ sub: ${name}`)
                subs.add({
                    unsub: newSub,
                    name: name,
                })
            }

            const partialContext = await getContext(c)
            const data = dataFn(partialContext)
            
            for (const [name, config] of Object.entries(data)) {
                if (config.type === "one") {
                    //[server] { collection: 'timed_rooms', type: 'one', id: 'n7iof8l4fi03sdw' }
                    // Hard coding an example so smaller types in intellisense
                    sub(name, await pb.collection(config.collection as "timed_guest_user").subscribe(config.id, async (e: RecordSubscription<TimedGuestUserRecord>) => {
                        if (e.action === "update") {
                            // Re-render the page!
                            const text = await renderPage(partialContext)
                            stream.writeSSE({
                                event: "datastar-patch-elements",
                                data: [
                                    // Using default mode, which is morph??
                                    // "mode replace",
                                    ...text.split("\n").map(line => `elements ${line}`)
                                ].join("\n"),
                            })
                        } else {
                            console.error(`SUBSCRIPTIONS: ${name} Unknown action: ${e.action}`)
                        }
                    }))
                }
            }

            // [server] Change happened!!
            // [server] {
            // [server]   record: {
            // [server]     collectionId: 'pbc_4126829344',
            // [server]     collectionName: 'timed_rooms',
            // [server]     created: '2026-09-06 05:17:40.958Z',
            // [server]     id: 'n7iof8l4fi03sdw',
            // [server]     name: 'Shared Roomx',
            // [server]     owner: 'diguwzz3conqxry',
            // [server]     updated: '2026-09-12 14:58:33.684Z'
            // [server]   },
            // [server]   action: 'update'
            // [server] }
            
            try {
                await stallUntilAbort
            } finally {
                subs.forEach(sub => {
                    console.log(`- unsub: ${sub.name}`)
                    sub.unsub()
                })
            }
        })
    })
}

export function dataList<T extends Collections, E = unknown>(config: Omit<ListConfig<T, unknown>, "__expandType">): ListConfig<T, E> {
    return config as ListConfig<T, E>
}

export function dataOne<T extends Collections, E = unknown>(config: Omit<OneConfig<T, unknown>, "__expandType">): OneConfig<T, E> {
    return config as OneConfig<T, E>
}

export function dataFirst<T extends Collections, E = unknown>(config: Omit<FirstConfig<T, unknown>, "__expandType">): FirstConfig<T, E> {
    return config as FirstConfig<T, E>
}

async () => {
    // Noop sampling types
    create({
        route: (0 as any),
        app: (0 as any),
        pre: async (ctx) => {
            const value = { number: 42 as const }
            return value
        },
        data: (ctx) => ({
            rooms: dataList({
                type: "list",
                collection: "timed_roomparticipant",
                filter: pb.filter("user = {:id}", { id: ctx.pre.number }),
                expand: "room",
            }),
        }),
        view: async (ctx) => {
            const { rooms } = ctx.data
            const number = ctx.pre.number
            return <></>
        },
    })
}
