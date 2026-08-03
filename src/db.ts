/*
 * PocketBase access and the derived read model the views render from.
 *
 * Every filter goes through `pb.filter()` with bound parameters. This process
 * holds a superuser token, so a hand-concatenated filter string would be a
 * whole-database problem rather than a scoping bug.
 */

import PocketBase, { ClientResponseError } from "pocketbase"
import env from "./env.ts"
import type {
  TimedResponseResponse,
  TimedRoomsResponse,
  TypedPocketBase,
} from "./pocketbase-types.ts"
import {
  compareDates,
  dateKey,
  parsePocketBaseDate,
  toPocketBaseDate,
  type PlainDate,
  type RoomWindow,
} from "./dates.ts"
import { cleanName, colorFor, generatedName, initials } from "./identity.ts"

export const pb = new PocketBase(env.PB_HOST) as TypedPocketBase
pb.authStore.save(env.PB_TOKEN)

/*
 * The SDK cancels an in-flight request when another with the same method and path
 * begins. That is reasonable in a browser, where it stops a stale autocomplete
 * from landing, but wrong in a shared server process: here concurrent requests
 * belong to different people, and two viewers loading the same room -- or the
 * background revision poll overlapping a page load -- would abort each other.
 */
pb.autoCancellation(false)

export type Room = TimedRoomsResponse
export type Answer = TimedResponseResponse

export const MAX_ROOM_NAME = 80
export const MAX_ROOM_DESCRIPTION = 500
export const MIN_ROOM_NAME = 3

/* ------------------------------------------------------------------- startup -- */

/** Fields this app reads or writes, per collection. */
const REQUIRED_FIELDS = {
  timed_rooms: ["name", "description", "start", "end"],
  timed_response: ["room", "year", "month", "day", "name", "label"],
} as const

export async function checkConnection(): Promise<void> {
  await pb.health.check()
  if (!pb.authStore.isValid) {
    throw new Error("PB_TOKEN is not a valid PocketBase token (it may have expired).")
  }
}

/**
 * Fails fast with the exact list of missing fields. Without this, a schema drift
 * surfaces as an unexplained 400 from PocketBase halfway through a request.
 */
export async function checkSchema(): Promise<void> {
  const missing: string[] = []

  for (const [collection, fields] of Object.entries(REQUIRED_FIELDS)) {
    let present: Set<string>
    try {
      const definition = await pb.collections.getOne(collection)
      present = new Set(definition.fields.map((field) => field.name))
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) {
        missing.push(`collection "${collection}" does not exist`)
        continue
      }
      throw error
    }

    for (const field of fields) {
      if (!present.has(field)) missing.push(`${collection}.${field}`)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `PocketBase schema is missing:\n  - ${missing.join("\n  - ")}\n\n` +
        `Add the fields in the PocketBase admin UI, then run \`pnpm typegen\`.`,
    )
  }
}

/* --------------------------------------------------------------------- rooms -- */

export type NewRoom = {
  name: string
  description?: string
  start?: PlainDate | null
  end?: PlainDate | null
}

export async function createRoom(input: NewRoom): Promise<Room> {
  return await pb.collection("timed_rooms").create({
    name: input.name.slice(0, MAX_ROOM_NAME),
    description: (input.description ?? "").slice(0, MAX_ROOM_DESCRIPTION),
    start: input.start ? toPocketBaseDate(input.start) : "",
    end: input.end ? toPocketBaseDate(input.end) : "",
  })
}

export async function findRoom(id: string): Promise<Room | null> {
  // Guard before the request: PocketBase ids are fixed-length, and a stray path
  // segment should be a plain 404 rather than a round trip.
  if (!/^[A-Za-z0-9]{1,30}$/.test(id)) return null

  try {
    return await pb.collection("timed_rooms").getOne(id)
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) return null
    throw error
  }
}

/**
 * A room with no explicit start begins the day it was created, and one with no
 * explicit end never closes.
 */
export function roomWindow(room: Room): RoomWindow {
  const start = parsePocketBaseDate(room.start) ?? parsePocketBaseDate(room.created)
  const end = parsePocketBaseDate(room.end)

  return {
    start: start ?? { year: 1970, month: 1, day: 1 },
    // An end before the start would make the room unanswerable; treat it as open.
    end: end && start && compareDates(end, start) < 0 ? null : end,
  }
}

export function isOpenEnded(room: Room): boolean {
  return roomWindow(room).end === null
}

/* ------------------------------------------------------------------- answers -- */

export async function fetchAnswers(roomId: string): Promise<Answer[]> {
  return await pb.collection("timed_response").getFullList({
    filter: pb.filter("room = {:room}", { room: roomId }),
    batch: 500,
  })
}

/**
 * Toggles one day for one browser, and reports whether the day is now marked.
 *
 * Takes the room's answers rather than re-querying, since callers have already
 * loaded them to render. The read and the write are not atomic: a double submit
 * could leave two rows for one day, which still reads as a single mark, and the
 * next toggle clears both. Not worth locking for a handful of participants.
 */
export async function toggleAnswer(
  roomId: string,
  clientId: string,
  label: string,
  date: PlainDate,
  answers: Answer[],
): Promise<boolean> {
  const existing = answers.filter(
    (answer) =>
      answer.name === clientId &&
      answer.year === date.year &&
      answer.month === date.month &&
      answer.day === date.day,
  )

  if (existing.length > 0) {
    await Promise.all(existing.map((answer) => pb.collection("timed_response").delete(answer.id)))
    return false
  }

  await pb.collection("timed_response").create({
    room: roomId,
    name: clientId,
    label: cleanName(label),
    year: date.year,
    month: date.month,
    day: date.day,
  })
  return true
}

/** Removes every day this browser marked in a room. */
export async function clearAnswers(
  clientId: string,
  answers: Answer[],
): Promise<void> {
  await Promise.all(
    answers
      .filter((answer) => answer.name === clientId)
      .map((answer) => pb.collection("timed_response").delete(answer.id)),
  )
}

/**
 * Repoints this browser's existing answers at a new display name.
 *
 * The label is denormalised onto every answer row, so a rename is a write per
 * row. Rooms are small, and this keeps the answers themselves keyed by the
 * browser id, which is what lets a rename preserve them at all.
 */
export async function renameAnswers(
  roomId: string,
  clientId: string,
  label: string,
): Promise<void> {
  const clean = cleanName(label)
  const own = await pb.collection("timed_response").getFullList({
    filter: pb.filter("room = {:room} && name = {:name}", { room: roomId, name: clientId }),
    batch: 500,
  })

  await Promise.all(
    own
      .filter((answer) => answer.label !== clean)
      .map((answer) => pb.collection("timed_response").update(answer.id, { label: clean })),
  )
}

/* --------------------------------------------------------------------- board -- */

export type Participant = {
  clientId: string
  name: string
  color: string
  initials: string
  /** Date keys this participant marked. */
  days: Set<string>
  isYou: boolean
}

export type Board = {
  room: Room
  window: RoomWindow
  participants: Participant[]
  you: Participant
  /** Date key to the participants who marked it, in participant order. */
  byDate: Map<string, Participant[]>
  /**
   * Changes whenever any answer in the room changes. Lets a polling client be
   * told "nothing new" with an empty response instead of a re-render. Kept a
   * plain number so it round-trips through a Datastar signal cleanly.
   */
  revision: number
}

export async function loadBoard(room: Room, viewerId: string, viewerName: string): Promise<Board> {
  return buildBoard(room, await fetchAnswers(room.id), viewerId, viewerName)
}

/**
 * Shapes a room's answers into what the views need.
 *
 * Built per viewer, because "which days are mine" and "am I in the participant
 * list yet" differ per browser. Kept separate from fetching so one read can
 * serve every viewer when fanning a change out over SSE.
 *
 * `viewerName` is only a fallback: a name already stored against the viewer's
 * answers in this room wins, so the room stays the source of truth for how
 * others see them.
 */
export function buildBoard(
  room: Room,
  answers: Answer[],
  viewerId: string,
  viewerName: string,
): Board {
  const byClient = new Map<string, { label: string; labelledAt: string; days: Set<string> }>()
  let latestChange = ""

  for (const answer of answers) {
    if (answer.updated > latestChange) latestChange = answer.updated

    const date = answerDate(answer)
    // Rows predating the `year` field cannot be placed on a calendar.
    if (!date) continue

    const clientId = answer.name
    if (!clientId) continue

    let entry = byClient.get(clientId)
    if (!entry) {
      entry = { label: "", labelledAt: "", days: new Set() }
      byClient.set(clientId, entry)
    }

    entry.days.add(dateKey(date))

    // The most recently written label wins, so a partially applied rename still
    // settles on the newest name.
    if (answer.label && answer.updated >= entry.labelledAt) {
      entry.label = answer.label
      entry.labelledAt = answer.updated
    }
  }

  const participants: Participant[] = [...byClient.entries()].map(([clientId, entry]) => {
    const isYou = clientId === viewerId
    // Answers written before the label field existed have no name to show.
    const name = entry.label || (isYou ? viewerName : generatedName(clientId))
    return { clientId, name, color: colorFor(clientId), initials: initials(name), days: entry.days, isYou }
  })

  // The viewer always appears, even before answering anything, so the room does
  // not look like it has forgotten them.
  let you = participants.find((participant) => participant.isYou)
  if (!you) {
    you = {
      clientId: viewerId,
      name: viewerName,
      color: colorFor(viewerId),
      initials: initials(viewerName),
      days: new Set(),
      isYou: true,
    }
    participants.push(you)
  }

  participants.sort(byAnswerCountThenName)

  const byDate = new Map<string, Participant[]>()
  for (const participant of participants) {
    for (const day of participant.days) {
      const list = byDate.get(day)
      if (list) list.push(participant)
      else byDate.set(day, [participant])
    }
  }

  return {
    room,
    window: roomWindow(room),
    participants,
    you,
    byDate,
    revision: revisionOf(`${answers.length}:${latestChange}`),
  }
}

export type RankedDate = {
  date: PlainDate
  who: Participant[]
  /** Participants who have not marked this date. */
  missing: Participant[]
}

/**
 * The dates most people can make, best first.
 *
 * Dates already past are left out: a recurring room accumulates months of old
 * answers, and suggesting last month's Tuesday is never the answer to "when
 * shall we meet".
 */
export function rankDates(board: Board, limit: number, from: PlainDate): RankedDate[] {
  const ranked: RankedDate[] = []

  for (const [key, who] of board.byDate) {
    const date = parseDateKeyLoose(key)
    if (!date || compareDates(date, from) < 0) continue
    if (board.window.end && compareDates(date, board.window.end) > 0) continue

    ranked.push({
      date,
      who,
      missing: board.participants.filter((participant) => !who.includes(participant)),
    })
  }

  ranked.sort((a, b) => b.who.length - a.who.length || compareDates(a.date, b.date))
  return ranked.slice(0, limit)
}

/* ------------------------------------------------------------------ helpers -- */

function answerDate(answer: Answer): PlainDate | null {
  const { year, month, day } = answer
  if (!year || !month || !day) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

/** Keys in `byDate` are ones we produced, so the shape is already known good. */
function parseDateKeyLoose(key: string): PlainDate | null {
  const [year, month, day] = key.split("-").map(Number)
  if (!year || !month || !day) return null
  return { year, month, day }
}

function byAnswerCountThenName(a: Participant, b: Participant): number {
  return b.days.size - a.days.size || a.name.localeCompare(b.name)
}

/** FNV-1a, so a revision fits in a signal without quoting concerns. */
function revisionOf(input: string): number {
  let value = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    value ^= input.charCodeAt(i)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value >>> 0
}
