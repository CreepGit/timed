import PocketBase from "pocketbase"
import env from "./env.ts"
import type { TypedPocketBase } from './pocketbase-types.ts'

export const pb = new PocketBase(env.PB_HOST) as TypedPocketBase
pb.autoCancellation(false)
pb.collection('users').authWithPassword(env.PB_EMAIL, env.PB_PASSWORD)
