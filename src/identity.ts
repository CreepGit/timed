/*
 * Who is answering.
 *
 * A browser is identified by an opaque id in an HttpOnly cookie, set by the
 * server on first contact. The previous approach kept the identity in a
 * `data-bind` input, which meant it only survived a reload when the browser
 * chose to restore form state -- Firefox does, Chrome does not -- so answers
 * silently detached from their author on refresh. A cookie is authoritative in
 * every browser and survives restarts.
 *
 * The display name is deliberately separate: it is a label the identity carries,
 * not the identity itself, so renaming keeps every existing answer attached.
 */

import { createMiddleware } from "hono/factory"
import { getCookie, setCookie } from "hono/cookie"
import type { Context } from "hono"
import { randomBytes } from "node:crypto"

const CLIENT_COOKIE = "timed_client"
const NAME_COOKIE = "timed_name"
const RECENT_COOKIE = "timed_recent"

/** Browsers cap persistent cookies at 400 days. */
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60

export const MAX_DISPLAY_NAME = 40

const MAX_RECENT_ROOMS = 8
const MAX_RECENT_NAME = 60

export type AppEnv = {
  Variables: {
    clientId: string
  }
}

export type AppContext = Context<AppEnv>

/** Assigns a stable browser id, before any route needs to know who is asking. */
export const withIdentity = createMiddleware<AppEnv>(async (c, next) => {
  let id = getCookie(c, CLIENT_COOKIE)

  if (!id || !isPlausibleId(id)) {
    id = newClientId()
  }

  // Re-set on every request so the expiry keeps sliding forward and an active
  // participant is never logged out of their own answers.
  writeCookie(c, CLIENT_COOKIE, id)
  c.set("clientId", id)

  await next()
})

export function clientId(c: AppContext): string {
  return c.get("clientId")
}

/* -------------------------------------------------------------- display name -- */

/** The name last used by this browser, if it has ever set one. */
export function rememberedName(c: AppContext): string | null {
  const name = getCookie(c, NAME_COOKIE)
  if (!name) return null
  const clean = cleanName(name)
  return clean.length > 0 ? clean : null
}

export function rememberName(c: AppContext, name: string): void {
  writeCookie(c, NAME_COOKIE, cleanName(name))
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_DISPLAY_NAME)
}

const ADJECTIVES = [
  "Amber", "Brisk", "Calm", "Clever", "Copper", "Curious", "Eager", "Fond",
  "Gentle", "Golden", "Happy", "Jolly", "Keen", "Lucky", "Merry", "Mellow",
  "Neat", "Noble", "Plucky", "Quiet", "Rapid", "Silver", "Sunny", "Swift",
  "Tidy", "Velvet", "Warm", "Wise", "Witty", "Zesty",
]

const ANIMALS = [
  "Otter", "Badger", "Heron", "Lynx", "Marten", "Puffin", "Raven", "Seal",
  "Sparrow", "Stoat", "Swan", "Weasel", "Wolf", "Owl", "Hare", "Ibex",
  "Falcon", "Gecko", "Kestrel", "Magpie", "Newt", "Osprey", "Pike", "Quail",
]

/**
 * A readable fallback name so a participant can start answering immediately
 * instead of being blocked by an empty form field. Derived from the browser id,
 * so the same browser always gets the same name even before it saves a cookie.
 */
export function generatedName(id: string): string {
  const seed = hash(id)
  const adjective = ADJECTIVES[seed % ADJECTIVES.length]!
  const animal = ANIMALS[Math.floor(seed / ADJECTIVES.length) % ANIMALS.length]!
  return `${adjective} ${animal}`
}

/** Up to two letters to identify someone inside a calendar cell. */
export function initials(name: string): string {
  const words = name.split(/[\s._-]+/).filter((word) => word.length > 0)
  if (words.length === 0) return "?"
  if (words.length === 1) {
    return [...words[0]!].slice(0, 2).join("").toUpperCase()
  }
  return (firstLetter(words[0]!) + firstLetter(words[words.length - 1]!)).toUpperCase()
}

/**
 * A stable colour per participant, so the same person reads as the same colour
 * in every cell. Spread around the hue circle by a step coprime with 360 to keep
 * nearby hashes visually distinct.
 */
export function colorFor(id: string): string {
  const hue = (hash(id) * 47) % 360
  return `oklch(80% 0.13 ${hue})`
}

/* ------------------------------------------------------------ recent rooms -- */

export type RecentRoom = {
  id: string
  name: string
}

/** Rooms this browser has opened, most recent first. */
export function recentRooms(c: AppContext): RecentRoom[] {
  const raw = getCookie(c, RECENT_COOKIE)
  if (!raw) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (entry): entry is RecentRoom =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as RecentRoom).id === "string" &&
          typeof (entry as RecentRoom).name === "string",
      )
      .slice(0, MAX_RECENT_ROOMS)
  } catch {
    return []
  }
}

export function rememberRoom(c: AppContext, room: RecentRoom): void {
  // Truncated because the whole list has to fit in one cookie.
  const entry: RecentRoom = { id: room.id, name: room.name.slice(0, MAX_RECENT_NAME) }
  const next = [entry, ...recentRooms(c).filter((r) => r.id !== entry.id)].slice(0, MAX_RECENT_ROOMS)
  writeCookie(c, RECENT_COOKIE, JSON.stringify(next))
}

export function forgetRoom(c: AppContext, roomId: string): void {
  writeCookie(c, RECENT_COOKIE, JSON.stringify(recentRooms(c).filter((r) => r.id !== roomId)))
}

/* ------------------------------------------------------------------ helpers -- */

function writeCookie(c: AppContext, name: string, value: string): void {
  setCookie(c, name, value, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(c),
    maxAge: COOKIE_MAX_AGE,
  })
}

/**
 * `Secure` cookies are dropped over plain HTTP, which would break local
 * development, so it tracks how the browser actually reached us rather than how
 * the request reached this process behind a proxy.
 */
function isSecureRequest(c: AppContext): boolean {
  const forwarded = c.req.header("x-forwarded-proto")
  if (forwarded) {
    return forwarded.split(",")[0]!.trim().toLowerCase() === "https"
  }
  return new URL(c.req.url).protocol === "https:"
}

function newClientId(): string {
  return randomBytes(16).toString("base64url")
}

function isPlausibleId(id: string): boolean {
  return id.length >= 8 && id.length <= 64 && /^[A-Za-z0-9_-]+$/.test(id)
}

function firstLetter(word: string): string {
  return [...word][0] ?? ""
}

/** FNV-1a, for turning an id into a stable small number. */
function hash(input: string): number {
  let value = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    value ^= input.charCodeAt(i)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value >>> 0
}
