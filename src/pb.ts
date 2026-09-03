import PocketBase from "pocketbase"
import env from "./env.ts"
import type { TypedPocketBase } from './pocketbase-types.ts'

export const pb = new PocketBase(env.PB_HOST) as TypedPocketBase
pb.authStore.save(env.PB_TOKEN)

if (!pb.authStore.isValid) {
  throw new Error("env.PB_TOKEN does not appear to be valid.")
}
