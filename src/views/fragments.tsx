/*
 * Partial re-renders.
 *
 * Both delivery paths reuse these: the response to the browser that made a
 * change, and the SSE push to everyone else watching. Rendering the same markup
 * for both is what keeps a live viewer and a viewer who just reloaded in
 * agreement, and each fragment carries the id it should replace.
 */

import { DayCell } from "../components/calendar.tsx"
import { People, Results } from "../components/panels.tsx"
import { NAME_STATUS_ID } from "./room.tsx"
import type { Board } from "../db.ts"
import type { PlainDate } from "../dates.ts"

/**
 * Hono JSX renders to a string synchronously for these components, but the type
 * allows a promise, so awaiting covers both.
 */
async function render(node: unknown): Promise<string> {
  return String(await node)
}

export async function dayCells(
  roomId: string,
  dates: PlainDate[],
  board: Board,
  now: PlainDate,
): Promise<string> {
  const cells = await Promise.all(
    dates.map((date) => render(<DayCell roomId={roomId} date={date} board={board} now={now} />)),
  )
  return cells.join("")
}

/** The participant list and the ranking, which any answer can change. */
export async function panels(board: Board, now: PlainDate): Promise<string> {
  const [people, results] = await Promise.all([
    render(<People board={board} />),
    render(<Results board={board} now={now} />),
  ])
  return people + results
}

/**
 * Everything affected by a change: the touched days plus the panels.
 *
 * `dates` is filtered by the caller to what the recipient actually has on
 * screen, since patching an id that is not in their document does nothing useful.
 */
export async function boardUpdate(
  roomId: string,
  dates: PlainDate[],
  board: Board,
  now: PlainDate,
): Promise<string> {
  return (await dayCells(roomId, dates, board, now)) + (await panels(board, now))
}

export async function nameStatus(message: string, tone: "ok" | "error" = "ok"): Promise<string> {
  return await render(
    <span class={tone === "error" ? "status status--error" : "status"} id={NAME_STATUS_ID}>
      {message}
    </span>,
  )
}
