import { SSEStreamingApi, streamSSE } from "hono/streaming"
import type { Context } from "hono"
import type { RecordService, RecordSubscription } from "pocketbase"

/**
 * Utility to help you manage data-star streaming from pocketbase updates.
 *
 * @param c - hono context
 * @param options.topic - pocketbase subscription 'topic', for example record id or "*"
 * @param options.collection - pocketbase collection
 * @param options.init - called at startup with stream context
 * @param options.update - fires on pocketbase updates
 */
export default function<T1 extends Context, T2> (c: T1, {
    topic,
    collection,
    init,
    update,
}: {
    topic: string,
    collection: RecordService<T2>
    init: (stream: SSEStreamingApi) => Promise<void>,
    update: (stream: SSEStreamingApi, event: RecordSubscription<T2>) => Promise<void>,
}) {
    return streamSSE(c, async (stream) => {
        await init(stream)

        const stallUntilAbort = new Promise<void>((resolve) => {
            stream.onAbort(() => {
                resolve()
            })
        })

        const unsubscribe = await collection.subscribe(topic, (event) => {
            update(stream, event)
        })

        try {
            await stallUntilAbort
        } catch (error) {
            console.error(error)
        } finally {
            await unsubscribe()
        }
    })
}
