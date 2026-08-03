# timed

Find a date that works for everyone. Make a room, send the link, everyone marks
the days they can make. No accounts, no email. Running at
[timed.gtfo.fi](https://timed.gtfo.fi).

## Running it

```bash
cp .env.example .env   # fill in PB_HOST and PB_TOKEN
pnpm install
pnpm dev               # http://localhost:3000
```

| Script           | Does                                                       |
| ---------------- | ---------------------------------------------------------- |
| `pnpm dev`       | Watch mode                                                 |
| `pnpm typecheck` | Types only, no output                                       |
| `pnpm build`     | Compiles to `dist/` and copies the CSS and vendored JS      |
| `pnpm start`     | Runs the build                                             |
| `pnpm typegen`   | Regenerates `src/pocketbase-types.ts` from the live schema  |

The server checks its PocketBase connection and schema before opening the port,
so a missing field is reported by name at startup rather than surfacing as an
unexplained 400 mid-request.

## Schema

Two collections. `timed_rooms`:

| Field         | Type | Notes                                                     |
| ------------- | ---- | --------------------------------------------------------- |
| `name`        | text |                                                           |
| `description` | text |                                                           |
| `start`       | date | Optional. Defaults to the room's creation date.            |
| `end`         | date | Optional. Empty means the room never closes.               |

`timed_response` — one row per person per day:

| Field   | Type   | Notes                                                       |
| ------- | ------ | ----------------------------------------------------------- |
| `room`  | relation | → `timed_rooms`                                           |
| `year`  | number |                                                             |
| `month` | number | 1–12                                                        |
| `day`   | number |                                                             |
| `name`  | text   | Browser identifier, **not** a display name. See below.       |
| `label` | text   | Display name at the time of writing.                        |

### Identity

`name` holds an opaque per-browser id from an HttpOnly cookie, and `label` holds
the human name. Keeping them apart is what lets someone rename themselves without
detaching the answers they already gave.

The name used to live only in a `data-bind` input, which meant it survived a
reload only in browsers that restore form state — Firefox does, Chrome does not,
so answers silently lost their author on refresh. It is now server-rendered from
the cookie and the room's own data, so every browser behaves the same.

`label` is denormalised onto every row, so a rename is one write per row. Rooms
are small and this keeps answers keyed by the browser id, which is the part that
has to stay stable.

Rows written before `year` existed cannot be placed on a calendar and are skipped.

### Date range

A room with no `end` rolls forward: months entirely in the past are never shown,
so a recurring group can reopen the same link months later and still be looking at
upcoming dates. A room with an `end` is bounded to that span. Either way you can
page through months, and answers are only accepted inside the range and never in
the past.

## How it fits together

Hono renders HTML on the server; [Datastar](https://data-star.dev) applies partial
updates in the browser. There is no client-side framework and no build step for
the front end.

Selection state lives in the server-rendered class list rather than in Datastar
signals, so what the database holds and what the page shows cannot drift apart.

Every interaction also works without JavaScript: the calendar is a real form of
submit buttons and the name field is a real form post. Datastar intercepts both
when it is available, which is what the `Datastar-Request` header is used to
detect.

### Live updates

Every write goes through this process, so it fans changes out to the other people
looking at the room over SSE from an in-memory registry (`live.ts`), rendering
per viewer because "which days are mine" differs per browser.

There is no PocketBase realtime subscription: its client needs a global
`EventSource`, which Node does not provide, and it would only report changes we
just made ourselves. The cost is that changes from *outside* this process — a
second instance, or an edit in the PocketBase admin UI — are not pushed. Clients
also poll every 10 seconds with the room revision they hold; the server answers
`204` when nothing has changed, and the same timer reopens the stream if it has
dropped, so a server restart heals without a refresh.

### Styling

Plain CSS in `src/styles.css`, served from our own origin with a content-hashed
URL.

It used to be Tailwind and DaisyUI from a CDN. Tailwind's browser build generates
rules by scanning the DOM it finds at load, so any class name arriving later in an
SSE patch was never given one and rendered unstyled — which is why new entries
looked broken. Plain CSS has no such failure mode.

Datastar is vendored in `src/vendor/datastar.js` (v1.0.2, from
`starfederation/datastar`) for the same reason, so the app has no third-party
runtime dependency. To update it, replace the file and note the version here.

Note that Datastar v1 separates a plugin from its key with a **colon** —
`data-on:click`, `data-class:day--mine`. The hyphenated `data-on-click` form from
earlier versions parses as an unknown plugin and silently does nothing.

## Known rough edges

- The server holds a superuser token and performs every operation with it, so the
  app is fully trusted against the database. Every filter goes through
  `pb.filter()` with bound parameters; keep it that way.
- Toggling a day is a read then a write, not a transaction. A double submit can
  leave two rows for one day, which still reads as a single mark, and the next
  toggle clears both.
- "Today" is the server's calendar day, so a participant in a very different
  timezone can disagree about it for a few hours.
- The registry is per process. More than one instance means live updates only
  reach viewers connected to the instance that took the write, until the poll
  catches up.
