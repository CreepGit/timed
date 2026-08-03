import type { FC } from "hono/jsx"
import { Layout } from "./layout.tsx"
import { Calendar } from "../components/calendar.tsx"
import { People, Results } from "../components/panels.tsx"
import type { Board, Room } from "../db.ts"
import { MAX_DISPLAY_NAME } from "../identity.ts"
import { formatDateLong, monthKey, type MonthPage, type PlainDate } from "../dates.ts"

export const NAME_STATUS_ID = "name-status"

export type RoomViewProps = {
  room: Room
  board: Board
  page: MonthPage
  now: PlainDate
  /** Canonical link to this room, for the copy button. */
  shareUrl: string
}

export const RoomView: FC<RoomViewProps> = ({ room, board, page, now, shareUrl }) => {
  const visible = monthKey(page.first)
  const live = `/r/${room.id}/live?m=${visible}`
  const sync = `/r/${room.id}/sync?m=${visible}`

  return (
    <Layout title={`${room.name || "Room"} · timed`}>
      <div
        class="stack stack--lg"
        /* Underscored signals stay in the browser; Datastar leaves them out of
           requests, so only `rev` travels. */
        data-signals={JSON.stringify({ _live: false, _copied: false, _share: shareUrl })}
        /* Opens the update stream. Kept open by the server; see /live. */
        data-init={`@get('${live}', {openWhenHidden: true})`}
        /*
         * Safety net. While connected this is a revision check the server answers
         * with 204 when nothing changed; if the stream has dropped, it reopens it.
         * Without this, a server restart would leave the page silently stale.
         *
         * Spread because a Datastar modifier argument (`.10s`) is not a legal JSX
         * attribute name.
         */
        {...{
          "data-on-interval__duration.10s": `$_live ? @get('${sync}') : @get('${live}', {openWhenHidden: true})`,
        }}
        data-on:datastar-fetch="$_live = !['error', 'retrying', 'retries-failed'].includes(evt.detail.type) && $_live"
      >
        <div class="stack stack--sm">
          <div class="row row--between">
            <h1>{room.name || "Untitled room"}</h1>
            <span class="conn" data-class:conn--live="$_live">
              <span class="conn__dot"></span>
              <span data-text="$_live ? 'live' : 'offline'">offline</span>
            </span>
          </div>
          {room.description && <p class="muted">{room.description}</p>}
          <p class="small faint">{describeRange(board)}</p>
        </div>

        <div class="panel">
          <div class="stack">
            {/* Top-aligned: the name field is taller because of its status line,
                and aligning to the bottom pushed the invite link out of step. */}
            <div class="row" style="align-items:flex-start;gap:1rem">
              <form
                class="field"
                style="flex:1;min-width:12rem;max-width:20rem"
                method="post"
                action={`/r/${room.id}/name`}
                data-on:submit={`@post('/r/${room.id}/name', {contentType: 'form'})`}
              >
                <label class="label" for="display-name">
                  Your name
                </label>
                <div class="share">
                  {/*
                    * Server-rendered value, not a bound signal. The name used to
                    * live only in this input, so it survived a reload only in
                    * browsers that restore form state.
                    */}
                  <input
                    class="input"
                    id="display-name"
                    name="name"
                    type="text"
                    value={board.you.name}
                    maxlength={MAX_DISPLAY_NAME}
                    autocomplete="nickname"
                    spellcheck={false}
                    required
                  />
                  <input type="hidden" name="m" value={visible} />
                  <button class="btn" type="submit">
                    Save
                  </button>
                </div>
                {/* Empty, but styled to hold its line so feedback does not shift
                    anything when it arrives. */}
                <span class="status" id={NAME_STATUS_ID}></span>
              </form>

              <div class="field" style="flex:1;min-width:14rem">
                <span class="label">Invite link</span>
                <div class="share">
                  <input class="input" value={shareUrl} readonly aria-label="Room link" />
                  <button
                    class="btn"
                    type="button"
                    data-on:click="navigator.clipboard.writeText($_share); $_copied = true"
                    data-text="$_copied ? 'Copied' : 'Copy'"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form id="board" class="sidebar" method="post" action={`/r/${room.id}/toggle`}>
          {/* Only used when JavaScript is unavailable; Datastar intercepts clicks. */}
          <input type="hidden" name="m" value={visible} />

          <div class="stack">
            <div class="row row--between">
              <div class="row">
                <PageLink href={page.previous ? `/r/${room.id}?m=${monthKey(page.previous)}` : null}>
                  Earlier
                </PageLink>
                <PageLink href={page.next ? `/r/${room.id}?m=${monthKey(page.next)}` : null}>
                  Later
                </PageLink>
              </div>
              <span class="small faint">Click a day you can make.</span>
            </div>

            <Calendar roomId={room.id} months={page.months} board={board} now={now} />

            <div class="row">
              <button
                class="btn btn--sm btn--ghost"
                type="button"
                data-on:click={`confirm('Clear all of your days in this room?') && @post('/r/${room.id}/clear')`}
              >
                Clear my days
              </button>
            </div>
          </div>

          <aside class="stack">
            <People board={board} />
            <Results board={board} now={now} />
          </aside>
        </form>
      </div>
    </Layout>
  )
}

/** A disabled-looking button when there is nowhere to page to. */
const PageLink: FC<{ href: string | null; children?: unknown }> = ({ href, children }) =>
  href ? (
    <a class="btn btn--sm" href={href}>
      {children}
    </a>
  ) : (
    <button class="btn btn--sm" type="button" disabled>
      {children}
    </button>
  )

/** The month headings already say which months are shown, so this only adds the end. */
function describeRange(board: Board): string {
  return board.window.end ? `Closes ${formatDateLong(board.window.end)}` : "Open-ended"
}
