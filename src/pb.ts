import PocketBase from "pocketbase"
import env from "./env.ts"
import type { TypedPocketBase } from './pocketbase-types.ts'
import ky from "ky"
import Sentry from "./sentry.ts"

export const pb = new PocketBase(env.PB_HOST) as TypedPocketBase
pb.autoCancellation(false)
await pb.collection('users').authWithPassword(env.PB_EMAIL, env.PB_PASSWORD)

const pbKy = ky.create({
    retry: {
        limit: 5,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "QUERY"],
        backoffLimit: 500,
        retryOnTimeout: true,
    },
    hooks: {
        beforeRetry: [
            async ({request, options, retryCount, error}) => {
                console.warn(`PB ${request.url} failed, retrying ${retryCount} times`)
                Sentry.logger.warn(`PB ${request.url} failed, retrying ${retryCount} times`)
            },
        ]
    }
})

pb.beforeSend = async (url, options) => {
    options.fetch = pbKy
    return { url, options }
}

if (!pb.authStore.isValid) {
    throw new Error("Failed to authenticate with PocketBase")
}
