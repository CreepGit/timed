/*
 * Live updates.
 *
 * Every write in this app goes through this process, so it already knows about
 * each change the moment it happens and can fan it out to whoever is watching
 * the room. That is why there is no PocketBase realtime subscription here: the
 * SDK's realtime client needs a global `EventSource`, which Node does not
 * provide, and subscribing would only tell us things we just did ourselves.
 *
 * The trade-off is that changes made outside this process -- a second instance,
 * or an edit in the PocketBase admin UI -- are not pushed. Clients also poll
 * occasionally and reconcile by revision, which covers that case.
 */

export const PATCH_ELEMENTS = "datastar-patch-elements"
export const PATCH_SIGNALS = "datastar-patch-signals"

export type Viewer = {
  /** Which browser is watching, so its own selections can be rendered. */
  readonly clientId: string
  /**
   * Month keys currently on screen. A change outside these is not worth sending,
   * since the element it would patch is not in that viewer's document.
   */
  readonly visibleMonths: ReadonlySet<string>
  /**
   * Fallback name for this viewer, used only until they have answers to take a
   * name from. Mutable so a rename does not have to wait for a reconnect.
   */
  displayName: string
  send(event: string, data: string): Promise<void>
}

const rooms = new Map<string, Set<Viewer>>()

export function addViewer(roomId: string, viewer: Viewer): () => void {
  let viewers = rooms.get(roomId)
  if (!viewers) {
    viewers = new Set()
    rooms.set(roomId, viewers)
  }
  viewers.add(viewer)

  return () => {
    viewers.delete(viewer)
    if (viewers.size === 0) rooms.delete(roomId)
  }
}

export function viewersOf(roomId: string): Viewer[] {
  return [...(rooms.get(roomId) ?? [])]
}

/** Distinct browsers watching a room, ignoring duplicate tabs. */
export function watcherCount(roomId: string): number {
  return new Set(viewersOf(roomId).map((viewer) => viewer.clientId)).size
}

/** Keeps open streams in step with a rename, including the renamer's other tabs. */
export function renameViewer(roomId: string, clientId: string, displayName: string): void {
  for (const viewer of viewersOf(roomId)) {
    if (viewer.clientId === clientId) viewer.displayName = displayName
  }
}

/**
 * Delivers to every viewer of a room, rendering per viewer.
 *
 * A viewer whose connection has already gone away must not fail the write that
 * triggered the notification, so delivery errors are dropped here; the stream's
 * own abort handler removes it from the registry.
 */
export async function notifyRoom(
  roomId: string,
  deliver: (viewer: Viewer) => Promise<void>,
): Promise<void> {
  await Promise.all(
    viewersOf(roomId).map(async (viewer) => {
      try {
        await deliver(viewer)
      } catch {
        // Ignored: a dead stream is cleaned up when its request aborts.
      }
    }),
  )
}

/* -------------------------------------------------------------- wire format -- */

export type PatchMode = "outer" | "inner" | "replace" | "prepend" | "append" | "before" | "after"

export type PatchOptions = {
  mode?: PatchMode
  selector?: string
}

/**
 * Builds the body of a `datastar-patch-elements` event.
 *
 * Datastar reads one `key value` pair per SSE data line. Rendered markup is
 * collapsed onto a single line so the payload stays one `elements` line; our
 * fragments carry no whitespace-sensitive content, so this is lossless.
 */
export function elementsPatch(html: string, options: PatchOptions = {}): string {
  const lines: string[] = []
  if (options.mode) lines.push(`mode ${options.mode}`)
  if (options.selector) lines.push(`selector ${options.selector}`)
  lines.push(`elements ${collapse(html)}`)
  return lines.join("\n")
}

/** Removes an element by selector, for a participant who has left. */
export function removePatch(selector: string): string {
  return `mode remove\nselector ${selector}`
}

export function signalsPatch(signals: Record<string, unknown>): string {
  return `signals ${JSON.stringify(signals)}`
}

function collapse(html: string): string {
  return html.replace(/\r?\n\s*/g, " ")
}
