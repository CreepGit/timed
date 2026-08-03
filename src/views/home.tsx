import type { FC } from "hono/jsx"
import { Layout } from "./layout.tsx"
import type { RecentRoom } from "../identity.ts"
import { dateKey, type PlainDate } from "../dates.ts"
import { MAX_ROOM_DESCRIPTION, MAX_ROOM_NAME, MIN_ROOM_NAME } from "../db.ts"

export type HomeViewProps = {
  recent: RecentRoom[]
  now: PlainDate
  error?: string | null
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: {
    name?: string
    description?: string
    start?: string
    end?: string
  }
}

export const HomeView: FC<HomeViewProps> = ({ recent, now, error, values }) => (
  <Layout title="timed · find a date that works" narrow>
    <div class="stack stack--lg">
      <div class="stack stack--sm">
        <h1>Find a date that works</h1>
        <p class="muted">
          Make a room, send the link to everyone, and each person marks the days they can make.
          No accounts, no email.
        </p>
      </div>

      <div class="panel">
        <h2 style="margin-bottom:0.85rem">New room</h2>

        <form class="stack" action="/r" method="post">
          {error && <p class="error">{error}</p>}

          <div class="field">
            <label class="label" for="name">
              What are you planning?
            </label>
            <input
              class="input"
              id="name"
              name="name"
              type="text"
              value={values?.name ?? ""}
              placeholder="Thursday D&D"
              minlength={MIN_ROOM_NAME}
              maxlength={MAX_ROOM_NAME}
              autocomplete="off"
              required
              autofocus
            />
          </div>

          <div class="field">
            <label class="label" for="description">
              Details <span class="faint">(optional)</span>
            </label>
            <input
              class="input"
              id="description"
              name="description"
              type="text"
              value={values?.description ?? ""}
              placeholder="Evenings work best, we need at least four people"
              maxlength={MAX_ROOM_DESCRIPTION}
              autocomplete="off"
            />
          </div>

          <div class="row" style="align-items:flex-start;gap:0.75rem">
            <div class="field" style="flex:1;min-width:9rem">
              <label class="label" for="start">
                From <span class="faint">(optional)</span>
              </label>
              <input
                class="input"
                id="start"
                name="start"
                type="date"
                value={values?.start ?? ""}
                min={dateKey(now)}
              />
            </div>

            <div class="field" style="flex:1;min-width:9rem">
              <label class="label" for="end">
                Until <span class="faint">(optional)</span>
              </label>
              <input
                class="input"
                id="end"
                name="end"
                type="date"
                value={values?.end ?? ""}
                min={dateKey(now)}
              />
            </div>
          </div>

          <p class="hint">
            Leave <em>Until</em> empty for something ongoing, like a weekly game: the calendar keeps
            rolling forward, so the same link still shows upcoming dates months from now. Set it to
            close the room off — useful when you only care about, say, between now and the end of July.
          </p>

          <button class="btn btn--primary" type="submit">
            Create room
          </button>
        </form>
      </div>

      {recent.length > 0 && (
        <div class="stack">
          <h2>Rooms you have opened</h2>
          <div class="rooms">
            {recent.map((room) => (
              <a class="room-link" href={`/r/${room.id}`}>
                <span class="room-link__name">{room.name || "Untitled room"}</span>
                <span class="faint tiny mono">{room.id}</span>
              </a>
            ))}
          </div>
          <p class="hint">Remembered in a cookie on this device only.</p>
        </div>
      )}

      {recent.length === 0 && (
        <p class="hint">Got a link from someone? Just open it — there is nothing to sign up for.</p>
      )}
    </div>
  </Layout>
)
