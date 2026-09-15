import env from "../env.ts"

/**
 * entriesHelper - Type safe. Shortcut for Object.fromEntries(Object.entries(...).map(...)), capable of async.
 * 
 * @param {T} collection - Object
 * @param {F} mapper - function(k,v) => [k, v] or async function(k,v) => [k, v]
 * @returns {Record<keyof T, ReturnType<F>>}
 */
export async function entriesHelper
    <
    const T extends Record<string, any>,
    //const F extends (key: keyof T, value: T[keyof T]) => [string, any],
    const F extends (key: string, value: T[string]) => [string, any] | Promise<[string, any]>
    >
    (
    collection:T,
    mapper: F
    ) {
    const promises = Object.entries(collection).map(async ([k, v]) => {
        return await mapper(k, v)
    }) as Promise<[string, any]>[]
    // promises: Promise[], which resolve to [k, v]
    let values: [string, any][];
    values = await Promise.all(promises)
    return Object.fromEntries(values) as Record<string, Awaited<ReturnType<F>>[1]>
}

async () => {
    // Noop sampling types
    const fields = {
        local: {
            value: 0
        },
        staging: {
            value: 10,
        },
        production: {
            value: 50,
        },
        rogue: {
            value: 1,
        }
    }
    const x = await entriesHelper(fields, async (k, v) => [k, "Hello" as "Hello"])
    console.log(x.production)
}
