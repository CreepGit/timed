import { ClientResponseError } from "pocketbase"

/**
 * Turns pocketbase 404s into undefineds
 */
export async function get<T>(promise: Promise<T>): Promise<T | undefined> {
    try {
        return await promise
    } catch (e) {
        if (e instanceof ClientResponseError && e.status === 404) return undefined
        throw e
    }
}
