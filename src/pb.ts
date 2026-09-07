import PocketBase from "pocketbase"
import env from "./env.ts"
import type { TypedPocketBase } from './pocketbase-types.ts'

export const pb = new PocketBase(env.PB_HOST) as TypedPocketBase
pb.autoCancellation(false)
await pb.collection('users').authWithPassword(env.PB_EMAIL, env.PB_PASSWORD)

if (!pb.authStore.isValid) {
    throw new Error("Failed to authenticate with PocketBase")
}
