import * as cookie from "hono/cookie"
import type { Context } from "hono"
import { pb } from "../../pb.ts"
import * as utils from "../../util/index.ts"
import type { TimedGuestUserResponse } from "../../pocketbase-types.ts"

export const GUEST_USER_COOKIE = "guest_user"

export const PERSISTENT_COOKIE_OPTIONS = {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "Lax",
    httpOnly: true,
} as const

function setGuestCookie(c: Context, userId: string): void {
    cookie.setCookie(c, GUEST_USER_COOKIE, userId, PERSISTENT_COOKIE_OPTIONS)
}

export async function getGuestUser(c: Context): Promise<TimedGuestUserResponse | undefined> {
    const userId = cookie.getCookie(c, GUEST_USER_COOKIE)
    if (!userId) return undefined
    const user = await utils.pb.get(pb.collection("timed_guest_user").getOne(userId))
    if (!user) {
        console.log("Guest user not found by token, force deleting user's cookie")
        cookie.deleteCookie(c, GUEST_USER_COOKIE)
        return undefined
    }
    return user
}

export async function getOrCreateGuestUser(c: Context): Promise<{ created: boolean, user: TimedGuestUserResponse }> {
    const existing = await getGuestUser(c)
    if (existing) return { created: false, user: existing }

    const user = await pb.collection("timed_guest_user").create({})
    setGuestCookie(c, user.id)
    return { created: true, user }
}
