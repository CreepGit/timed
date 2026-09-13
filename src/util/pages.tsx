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
import * as cookie from "hono/cookie"
import { GUEST_USER_COOKIE } from "../app/lib/guest-users.ts"

// Configuration types
type ListConfig<T, E = unknown> = {
    type: "list"
    collection: T
    filter: string
    expand?: Record<string, Collections[]>
    __expandType: E
}
type OneConfig<T, E = unknown> = {
    type: "one"
    collection: T
    id: string
    expand?: Record<string, Collections[]>
    __expandType: E
}
type FirstConfig<T, E = unknown> = {
    type: "first"
    collection: T
    filter: string
    expand?: Record<string, Collections[]>
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

    async function getAllData(pctx: PartialContext<Pre>, dataDef: Data) {
        async function getOneField(name: string, config: OneData<Collections, unknown>): Promise<PBEntry<any>[]|PBEntry<any>|null> {
            try {
                if (config.type === "list") {
                    const filter = config.filter
                    let entries: PBEntry<any>[] = []
                    try {
                        function getExpand(expand?: Record<string, Collections[]>): undefined | string {
                            if (!expand) {
                                return undefined
                            }
                            const keys = Object.keys(expand)
                            // For example
                            // ['room.owner', 'user']
                            const expanded = keys.join(",")
                            console.log(`Expanded: ${expanded}`)
                            return expanded
                        }
                        entries = await pb.collection(config.collection).getFullList({
                            filter: filter,
                            expand: getExpand(config.expand),
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

        const subKey = "data-init__delay.250ms"
        const subVal = `@get('${getSubscriptionRoute(pctx.c.req.path)}')`

        const iconGood = <span data-show="$subbing" className="relative translate-y-0.5 icon-[tabler--wifi]"></span>
        const iconBad = <span data-show="!$subbing" className="relative translate-y-0.5 text-error icon-[tabler--wifi-off]"></span>

        const classes = "fixed top-1 left-1 z-50 pointer-events-none"

        const blocksFunction = `
            //
            if (event.detail.type != "datastar-patch-elements") {
                return
            }
            // Options: ▣ ◆ ◈ ◉ ▩ ▦ ▤ ▥ ▨ ▧ ▬ ◍ ● ◎ ☉ ○ ◌ ◔ ◕ ◑ ◒ ◓ ◒ ⬤ ⚫ ⚪ 🔵 🔴 ✦ ✧ ✪ ✫ ✬ ✭ ✮ ✯ ✰ ★ ☆
            const char = "▨"
            window.requests ??= 0
            window.faded ??= 0
            window.requests++
            setTimeout(()=>{
                window.requests--
                $_blocks = char.repeat(window.requests)

                window.faded++
                $_blocksFaded = char.repeat(window.faded)
                setTimeout(()=>{
                    window.faded--
                    $_blocksFaded = char.repeat(window.faded)
                }, 4000 - 1500)
            }, 1500)
            $_blocks = char.repeat(window.requests)
        `
        const blocks = <span className="text-success" data-text="$_blocks"></span>
        const blocksFaded = <span className="text-success opacity-50" data-text="$_blocksFaded"></span>

        const subber = <div data-on:datastar-fetch={blocksFunction} data-ignore-morph id="SSE-SUB" className={classes} data-indicator="subbing" {...{ [subKey]: subVal }}>
            SSE({iconGood}{iconBad}){blocks}{blocksFaded}
            </div>

        return await view(context) + subber
    }

    function getSubscriptionRoute(route: string): string {
        const END = "sub"
        if (env.NODE_ENV === "development") {
            z.string().refine(
                end => !end.startsWith("/"), "END cant start with a slash",
            ).refine(
                end => !end.endsWith("/"), "END cant end with a slash",
            ).min(1, "END cant be empty").parse(END)
        }
        const path = route.endsWith("/") ? route.slice(0, -1) : route
        const product = `${path}/${END}`
        if (env.NODE_ENV === "development") {
            z.string().refine(
                str => str.startsWith("/"), `Has to start with a slash: '${product}'`
            ).refine(
                str => !str.endsWith("/"), `Cant end with a slash: '${product}'`
            ).parse(product)
        }
        return product
    }

    app.get(route, async (c) => {
        const partialContext = await getContext(c)
        return c.html(renderPage(partialContext))
    })

    app.get(getSubscriptionRoute(route), async (c) => {
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
                liveConnections++
                console.log(`+ sub: [${liveConnections}] ${name}`)
                subs.add({
                    unsub: newSub,
                    name: name,
                })
            }

            const startTime = Date.now()
            const partialContext = await getContext(c)
            const clientId = cookie.getCookie(c, GUEST_USER_COOKIE) ?? undefined
            const data = dataFn(partialContext)

            // TODO: Don't await each individually, it's so slow

            async function renderAndSend() {
                const text = await renderPage(partialContext)
                console.log(`Updating: ${clientId}`)
                stream.writeSSE({
                    event: "datastar-patch-elements",
                    data: [
                        // Using default mode, which is morph??
                        // "mode replace",
                        ...text.split("\n").map(line => `elements ${line}`)
                    ].join("\n"),
                })
            }

            function getSubName(name: string, cfg: OneData<Collections, unknown>): string {
                let star = ""
                if (["first", "list"].includes(cfg.type)) {
                    star = "*"
                }
                let filter = ""
                if (cfg.type != 'one') {
                    filter = cfg.filter.split(" ").join("")
                }
                if (cfg.type == 'one') {
                    filter = cfg.id
                }
                let expand = ""
                if (cfg.expand) {
                    expand = Object.keys(cfg.expand).join(",")
                    expand = `@${expand}`
                }
                return `${name}${star} ${filter} ${expand}`.trim()
            }

            async function subToOne(name: string, config: OneData<Collections, unknown>) {
                if (config.type === "one") {
                    sub(getSubName(name, config), await pb.collection(config.collection as "timed_guest_user").subscribe(config.id, async (e: RecordSubscription<TimedGuestUserRecord>) => {
                        if (e.action === "update") {
                            // Re-render the page!
                            await renderAndSend()
                        } else {
                            console.error(`SUBSCRIPTIONS: ${name} Unknown action: ${e.action}`)
                        }
                    }))
                } else if ((config.type === "list") || (config.type === "first")) {
                    sub(getSubName(name, config), await pb.collection(config.collection as "timed_roomparticipant").subscribe("*", async (e) => {
                        if (["update", "delete"].includes(e.action)) {
                            await renderAndSend()
                        }
                    }, {
                        filter: config.filter,
                    }))
                }

                if (config.expand) {
                    for (const [key, collections] of Object.entries(config.expand)) {
                        const segments = key.split(".")
                        if (env.NODE_ENV === "development") {
                            // Sanity checking
                            z.array(
                                z.string().min(1, "Expand key cant have empty segments")
                            ).min(
                                1, "Expand key cant be empty"
                            ).length(
                                collections.length, "Expand key must have same number of segments in the same order as collections"
                            ).parse(segments)
                        }

                        // For example 
                        // ['room',         'owner']
                        // ['timed_rooms',  'timed_guest_user']
                        // user='ai7xwssf64cvrbg'

                        // Our base config.collection here is "roomparticipant"
                        // The config means participant has a field called "room"
                        //   and a field called "user"

                        // from room, we can _via_roomparticipant.user="ai7xwssf64"

                        // from the UI
                        // timed_roomparticipant_via_room.user?="ai7xwssf64cvrbg"

                        const OPERANDS = {
                            // Match
                            match_all: "=",
                            match_any: "?=",
                            not_match_all: "!=",
                            not_match_any: "?!=",
                            // Like
                            like_all: "~",
                            like_any: "?~",
                            not_like_all: "!~",
                            not_like_any: "?!~",
                            // Gt
                            gt_all: ">",
                            gt_any: "?>",
                            gte_all: ">=",
                            gte_any: "?>=",
                            // Lt
                            lt_all: "<",
                            lt_any: "?<",
                            lte_all: "<=",
                            lte_any: "?<=",
                        } as const

                        // Basically a for loop
                        const i = 0
                        const segment = segments[i]
                        const collection = collections[i]

                        const remainingSegments = segments.slice(i + 1)
                        const remainingCollections = collections.slice(i + 1)

                        type Operand = typeof OPERANDS[keyof typeof OPERANDS]
                        function getParentsFilter(filter: string): [string, Operand, string][] {
                            if (filter.includes("||")) {
                                throw new Error("Or statements not implemented")
                            }

                            if (filter.includes("(")) {
                                throw new Error("Parentheses priority not implemented")
                            }

                            const filterSegments = filter.split(" && ")

                            z.array(
                                z.string().min(1, "Segment missing?")
                            ).min(1).parse(filterSegments)
                            
                            // Longest first, otherwise = collides with ?=
                            const operands = Object.values(OPERANDS).sort((a, b) => b.length - a.length)
                            function findOperand(segment: string): Operand | undefined {
                                for (const operand of operands) {
                                    if (segment.includes(operand)) {
                                        return operand
                                    }
                                }
                                return undefined
                            }

                            const results: [string, Operand, string][] = []
                            for (const segment of filterSegments) {
                                const operand = findOperand(segment)
                                if (operand == undefined) {
                                    throw new Error(`Segment '${segment}' has no valid operand`)
                                }
                                const parts = segment.split(operand) as [string, string]
                                if (parts.length != 2) {
                                    throw new Error(`Segment '${segment}' has too many instances of an operand ${operand}`)
                                }
                                results.push([parts[0].trim(), operand, parts[1].trim()])
                            }
                            return results
                        }

                        if (config.type == "one") {
                            throw new Error(`config.type == one is not supported as they dont
                                have a filter, need to implement by using the
                                id as hard reference instead....hmm`)
                        }

                        const parentFilter = getParentsFilter(config.filter)

                        const OPERAND_CONVERSIONS = {
                            "=": "?=",
                            "~": "?~",

                            // Assuming, havnt thought it out:
                            "?=": "?=",
                            "?~": "?~",
                        } as Record<string, Operand|undefined>

                        const childFilterParts = parentFilter.map(([left, operand, right]) => {
                            // user
                            // =
                            // {:id}

                            // to:

                            // timed_roomparticipant_via_room.user
                            // ?=
                            // {:id}
                            const newLeft = `${config.collection}_via_${segment}.${left}`
                            const newOperand = OPERAND_CONVERSIONS[operand]
                            if (newOperand == undefined) {
                                throw new Error(`Operand ${operand} has not been implemented with a conversion`)
                            }
                            return [newLeft, newOperand, right] as [string, Operand, string]
                        })

                        // console.log(childFilterParts)
                        // [server]   [[ 'timed_roomparticipant_via_room.user', '?=', "'ai7xwssf64cvrbg'" ], ]
                        const filter = childFilterParts.map((segments) => segments.join("")).join(" && ")
                        // console.log(filter)
                        // [server] timed_roomparticipant_via_room.user?='ai7xwssf64cvrbg'

                        let childExpand: undefined | Record<string, Collections[]> = undefined
                        if (remainingSegments.length > 0) {
                            childExpand = {
                                [remainingSegments.join(".")]: remainingCollections,
                            }
                        }

                        const childName = `${name}.${segment}`
                        const childConfig: OneData<Collections, unknown> = {
                            type: "list",
                            collection: collection,
                            filter: filter,
                            expand: childExpand,
                            __expandType: undefined,
                        }
                        await subToOne(childName, childConfig)
                    }
                }
            }

            const promises = []
            for (const [name, config] of Object.entries(data)) {
                promises.push(subToOne(name, config))
            }
            await Promise.all(promises)

            const endTime = Date.now()
            console.log(`Subbed in ${endTime - startTime}ms`)

            try {
                await renderAndSend()
                await stallUntilAbort
            } finally {
                subs.forEach(sub => {
                    console.log(`- unsub: [${liveConnections}] ${sub.name}`)
                    sub.unsub()
                    liveConnections--
                })
            }
        })
    })
}

let liveConnections = 0

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
                expand: {
                    "room.owner": ["timed_rooms", "timed_guest_user"],
                },
            }),
        }),
        view: async (ctx) => {
            const { rooms } = ctx.data
            const number = ctx.pre.number
            return <></>
        },
    })
}
