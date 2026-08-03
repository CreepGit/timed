import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { ASSETS } from "./assets.ts"
import {
  buildBoard,
  clearAnswers,
  createRoom,
  fetchAnswers,
  findRoom,
  loadBoard,
  MAX_ROOM_NAME,
  MIN_ROOM_NAME,
  renameAnswers,
  roomWindow,
  toggleAnswer,
  type Answer,
  type Room,
} from "./db.ts"
import {
  addViewer,
  elementsPatch,
  notifyRoom,
  PATCH_ELEMENTS,
  PATCH_SIGNALS,
  renameViewer,
  signalsPatch,
  type Viewer,
} from "./live.ts"
import {
  cleanName,
  clientId,
  forgetRoom,
  generatedName,
  recentRooms,
  rememberedName,
  rememberName,
  rememberRoom,
  withIdentity,
  type AppContext,
  type AppEnv,
} from "./identity.ts"
import {
  daysOfMonth,
  isSelectable,
  monthKey,
  monthPage,
  parseDateKey,
  parseMonthKey,
  today,
  type MonthPage,
  type PlainDate,
} from "./dates.ts"
import { HomeView } from "./views/home.tsx"
import { RoomView } from "./views/room.tsx"
import { ErrorView } from "./views/error.tsx"
import { boardUpdate, nameStatus, panels } from "./views/fragments.tsx"

/** How often an idle stream writes, to keep proxies from closing it. */
const HEARTBEAT_MS = 25_000

export const app = new Hono<AppEnv>()

/* -------------------------------------------------------------------- assets -- */

// Registered before the identity middleware so static files do not carry
// Set-Cookie headers, which would make them uncacheable.
for (const asset of ASSETS) {
  app.get(asset.path, (c) => {
    // Only the hashed URL is safe to cache forever; a bare path may go stale.
    const versioned = c.req.query("v") === asset.digest
    c.header("Content-Type", asset.contentType)
    c.header("Cache-Control", versioned ? "public, max-age=31536000, immutable" : "no-cache")
    return c.body(new Uint8Array(asset.body))
  })
}

app.use("*", withIdentity)

/* ---------------------------------------------------------------------- home -- */

app.get("/", (c) => c.html(<HomeView recent={recentRooms(c)} now={today()} />))

app.post("/r", async (c) => {
  const form = await c.req.parseBody()
  const values = {
    name: field(form, "name"),
    description: field(form, "description"),
    start: field(form, "start"),
    end: field(form, "end"),
  }

  const name = values.name.replace(/\s+/g, " ").trim()
  const start = values.start ? parseDateKey(values.start) : null
  const end = values.end ? parseDateKey(values.end) : null

  const reject = (message: string) =>
    c.html(<HomeView recent={recentRooms(c)} now={today()} error={message} values={values} />, 422)

  if (name.length < MIN_ROOM_NAME) {
    return reject(`Give the room a name of at least ${MIN_ROOM_NAME} characters.`)
  }
  if (name.length > MAX_ROOM_NAME) {
    return reject(`That name is too long, keep it under ${MAX_ROOM_NAME} characters.`)
  }
  if (values.start && !start) return reject("That start date is not a real date.")
  if (values.end && !end) return reject("That end date is not a real date.")
  if (start && end && compare(start, end) > 0) {
    return reject("The end date needs to be on or after the start date.")
  }

  const room = await createRoom({ name, description: values.description.trim(), start, end })
  rememberRoom(c, { id: room.id, name })
  return c.redirect(`/r/${room.id}`, 303)
})

/* ---------------------------------------------------------------------- room -- */

app.get("/r/:id", async (c) => {
  const room = await findRoom(c.req.param("id"))
  if (!room) return roomGone(c)

  const now = today()
  const page = pageFor(room, c.req.query("m"), now)
  const board = await loadBoard(room, clientId(c), fallbackName(c))

  rememberRoom(c, { id: room.id, name: room.name })

  return c.html(
    <RoomView room={room} board={board} page={page} now={now} shareUrl={shareUrl(c, room)} />,
  )
})

/**
 * Marks or unmarks one day.
 *
 * The path carries the date so this stays a plain URL that the no-JavaScript
 * form below can share a handler with.
 */
app.post("/r/:id/toggle/:date", async (c) => {
  const room = await findRoom(c.req.param("id"))
  if (!room) return roomGone(c)

  const date = parseDateKey(c.req.param("date"))
  if (!date) return c.text("Not a valid date.", 400)

  await applyToggle(c, room, date)
  return await respondWithChanges(c, room, [date])
})

/** Fallback target of the calendar form when Datastar has not intercepted it. */
app.post("/r/:id/toggle", async (c) => {
  const room = await findRoom(c.req.param("id"))
  if (!room) return roomGone(c)

  const form = await c.req.parseBody()
  const date = parseDateKey(field(form, "date"))
  if (!date) return c.redirect(`/r/${room.id}`, 303)

  await applyToggle(c, room, date)
  return c.redirect(backTo(room, field(form, "m")), 303)
})

app.post("/r/:id/name", async (c) => {
  const room = await findRoom(c.req.param("id"))
  if (!room) return roomGone(c)

  const form = await c.req.parseBody()
  const name = cleanName(field(form, "name"))
  const enhanced = isDatastar(c)

  if (name.length === 0) {
    if (!enhanced) return c.redirect(backTo(room, field(form, "m")), 303)
    return c.html(await nameStatus("Enter a name", "error"))
  }

  rememberName(c, name)
  renameViewer(room.id, clientId(c), name)
  await renameAnswers(room.id, clientId(c), name)

  if (!enhanced) return c.redirect(backTo(room, field(form, "m")), 303)

  // A rename changes how this person reads in every day they marked.
  const now = today()
  const answers = await fetchAnswers(room.id)
  const board = buildBoard(room, answers, clientId(c), name)
  const touched = [...board.you.days].flatMap((key) => parseDateKey(key) ?? [])
  const visible = visibleMonthsOf(pageFor(room, field(form, "m"), now))

  push(room, answers, touched, now)

  return c.html(
    (await nameStatus("Saved")) +
      (await boardUpdate(room.id, touched.filter(inMonths(visible)), board, now)),
  )
})

app.post("/r/:id/clear", async (c) => {
  const room = await findRoom(c.req.param("id"))
  if (!room) return roomGone(c)

  const answers = await fetchAnswers(room.id)
  const cleared = answers
    .filter((answer) => answer.name === clientId(c))
    .flatMap((answer) => answerDate(answer))

  await clearAnswers(clientId(c), answers)

  if (!isDatastar(c)) return c.redirect(`/r/${room.id}`, 303)
  return await respondWithChanges(c, room, cleared)
})

/** Drops a room from this browser's remembered list. */
app.post("/r/:id/forget", (c) => {
  forgetRoom(c, c.req.param("id"))
  return c.redirect("/", 303)
})

/* ---------------------------------------------------------------------- live -- */

/**
 * A stream of changes to a room, held open for as long as the page is.
 *
 * Deliberately not backed by PocketBase realtime: every write goes through this
 * process, and the SDK's realtime client needs a global `EventSource` that Node
 * does not have. See live.ts.
 */
app.get("/r/:id/live", async (c) => {
  const room = await findRoom(c.req.param("id"))
  // 204 rather than 404: it tells Datastar to stop rather than retry a room
  // that will never exist.
  if (!room) return c.body(null, 204)

  const now = today()
  const page = pageFor(room, c.req.query("m"), now)
  const viewerId = clientId(c)
  const name = fallbackName(c)

  return streamSSE(c, async (stream) => {
    let closed = false
    let onClosed = () => {}
    const untilClosed = new Promise<void>((resolve) => {
      onClosed = resolve
    })

    // Writes are chained so a broadcast and a heartbeat cannot interleave
    // mid-event and corrupt the stream.
    let queue: Promise<void> = Promise.resolve()
    const enqueue = (write: () => Promise<void>): Promise<void> => {
      queue = queue.then(async () => {
        if (closed) return
        await write()
      })
      return queue
    }

    const viewer: Viewer = {
      clientId: viewerId,
      visibleMonths: visibleMonthsOf(page),
      displayName: name,
      send: (event, data) => enqueue(() => stream.writeSSE({ event, data })),
    }

    const remove = addViewer(room.id, viewer)
    stream.onAbort(() => {
      closed = true
      remove()
      onClosed()
    })

    // A full sync on connect, so reconnecting after a drop is enough to catch up
    // and no missed change can linger.
    const board = await loadBoard(room, viewerId, name)
    await viewer.send(
      PATCH_ELEMENTS,
      elementsPatch(await boardUpdate(room.id, visibleDates(page), board, now)),
    )
    await viewer.send(PATCH_SIGNALS, signalsPatch({ _live: true }))

    while (!closed) {
      await Promise.race([stream.sleep(HEARTBEAT_MS), untilClosed])
      if (closed) break
      await enqueue(async () => {
        await stream.write(": ping\n\n")
      })
    }
  })
})

/**
 * Reconciliation for clients whose stream has dropped, and a cheap no-op for
 * those whose stream is fine.
 */
app.get("/r/:id/sync", async (c) => {
  const room = await findRoom(c.req.param("id"))
  if (!room) return c.body(null, 204)

  const now = today()
  const page = pageFor(room, c.req.query("m"), now)
  const board = await loadBoard(room, clientId(c), fallbackName(c))

  if (signal(c, "rev") === board.revision) return c.body(null, 204)

  return c.html(await boardUpdate(room.id, visibleDates(page), board, now))
})

/* ------------------------------------------------------------------- errors -- */

app.notFound((c) =>
  c.html(
    <ErrorView title="Nothing here" message="That link does not point at anything we know about." />,
    404,
  ),
)

app.onError((error, c) => {
  console.error("Request failed:", error)
  return c.html(
    <ErrorView
      title="Something broke"
      message="That did not work. Trying again often helps; if it does not, the room may be unreachable."
    />,
    500,
  )
})

/* ------------------------------------------------------------------ helpers -- */

/**
 * Applies a toggle, using the name already recorded against this browser in the
 * room so a stale cookie cannot rename anyone.
 */
async function applyToggle(c: AppContext, room: Room, date: PlainDate): Promise<void> {
  if (!isSelectable(date, roomWindow(room), today())) return

  const answers = await fetchAnswers(room.id)
  const board = buildBoard(room, answers, clientId(c), fallbackName(c))
  await toggleAnswer(room.id, clientId(c), board.you.name, date, answers)
}

/** Re-renders what changed for the caller, and pushes the same to everyone else. */
async function respondWithChanges(c: AppContext, room: Room, changed: PlainDate[]) {
  const now = today()
  const answers = await fetchAnswers(room.id)
  const board = buildBoard(room, answers, clientId(c), fallbackName(c))

  push(room, answers, changed, now)

  if (!isDatastar(c)) return c.redirect(`/r/${room.id}`, 303)
  return c.html(await boardUpdate(room.id, changed, board, now))
}

/**
 * Fans a change out to every open stream on the room.
 *
 * Not awaited by request handlers: a slow or half-dead peer must not hold up the
 * response to whoever made the change. Rendering is synchronous from the answers
 * already in hand, so sends still queue in the order the changes happened.
 */
function push(room: Room, answers: Answer[], changed: PlainDate[], now: PlainDate): void {
  if (changed.length === 0) return

  void notifyRoom(room.id, async (viewer) => {
    const board = buildBoard(room, answers, viewer.clientId, viewer.displayName)
    const dates = changed.filter(inMonths(viewer.visibleMonths))
    await viewer.send(PATCH_ELEMENTS, elementsPatch(await boardUpdate(room.id, dates, board, now)))
  }).catch((error) => console.error("Broadcast failed:", error))
}

function pageFor(room: Room, requested: string | undefined, now: PlainDate): MonthPage {
  return monthPage(roomWindow(room), requested ? parseMonthKey(requested) : null, now)
}

function visibleMonthsOf(page: MonthPage): Set<string> {
  return new Set(page.months.map(monthKey))
}

function visibleDates(page: MonthPage): PlainDate[] {
  return page.months.flatMap(daysOfMonth)
}

function inMonths(months: ReadonlySet<string>): (date: PlainDate) => boolean {
  return (date) => months.has(monthKey(date))
}

/** The name to use until the room itself has one recorded for this browser. */
function fallbackName(c: AppContext): string {
  return rememberedName(c) ?? generatedName(clientId(c))
}

function isDatastar(c: AppContext): boolean {
  return c.req.header("datastar-request") !== undefined
}

/** Reads one signal out of the batch Datastar sends with every request. */
function signal(c: AppContext, name: string): unknown {
  const raw = c.req.query("datastar")
  if (!raw) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return undefined
    return (parsed as Record<string, unknown>)[name]
  } catch {
    return undefined
  }
}

function shareUrl(c: AppContext, room: Room): string {
  const url = new URL(c.req.url)
  const forwardedProto = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim()
  const forwardedHost = c.req.header("x-forwarded-host")?.split(",")[0]?.trim()
  if (forwardedProto) url.protocol = `${forwardedProto}:`
  if (forwardedHost) url.host = forwardedHost
  url.search = ""
  url.pathname = `/r/${room.id}`
  return url.toString()
}

function backTo(room: Room, month: string): string {
  return parseMonthKey(month) ? `/r/${room.id}?m=${month}` : `/r/${room.id}`
}

function roomGone(c: AppContext) {
  return c.html(
    <ErrorView
      title="Room not found"
      message="This room does not exist, or it has been deleted. Ask whoever shared the link, or start a new one."
    />,
    404,
  )
}

function field(form: Record<string, unknown>, name: string): string {
  const value = form[name]
  return typeof value === "string" ? value : ""
}

function answerDate(answer: Answer): PlainDate[] {
  const { year, month, day } = answer
  if (!year || !month || !day) return []
  return [{ year, month, day }]
}

function compare(a: PlainDate, b: PlainDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day
}
