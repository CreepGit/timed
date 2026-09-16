import { ClientResponseError } from "pocketbase"
import { pb } from "../pb.ts"
import { z } from "zod"
import Sentry from "../sentry.ts"

export async function create(lifetimeSeconds: number, action: string) {
    const lifetimeSchema = z.int()
        .min(1)
        .max(7 * 24 * 60 * 60, "Longer lifetimes not supported for now") // 7 days
    
    const actionSchema = z.string()

    const _action = actionSchema.parse(action)
    const _lifetime = lifetimeSchema.parse(lifetimeSeconds)

    const record = await pb.collection("tNonce").create({
        action: _action,
        expire: new Date(Date.now() + _lifetime * 1000),
    })

    return record.id
}

export async function validate(id: string, action: string): Promise<boolean> {
    try {
        const record = await pb.collection("tNonce").getOne(id)
        if (new Date(record.expire) < new Date()) {
            console.log(`Nonce expired: ${id}`)
            return false
        }
        if (record.action != action) {
            console.log(`Nonce action mismatch: ${id} ${record.action} ${action}`)
            return false
        }
        const timeLived = new Date().getTime() - new Date(record.created).getTime()
        const timeRemaining = new Date(record.expire).getTime() - new Date().getTime()
        console.log(`Nonce validated: ${id} Lived: ${Math.floor(timeLived/1000)}s, Remaining: ${Math.floor(timeRemaining/1000)}s`)
        return true
    } catch (e) {
        if (e instanceof ClientResponseError) {
            console.log(`Nonce not found: ${id}`)
            return false
        }
    }
    console.log(`Nonce unknown?: ${id}`)
    return false
}

export async function spend(id: string) {
    try {
        const deleted = await pb.collection("tNonce").delete(id)
        if (deleted) {
            console.log(`Nonce spent ${id}`)
        } else {
            const m = `Failed to spend nonce: ${id}`
            console.warn(m)
            Sentry.logger.warn(m)
        }
    } catch (e) {
        const m = `Errored trying to spend nonce: ${id}, ${(e as any)?.message}`
        console.warn(m)
        Sentry.logger.warn(m)
    }
}
