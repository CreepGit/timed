import type { FC } from "hono/jsx"
import { rankDates, type Board } from "../db.ts"
import { formatDate, formatDateLong, type PlainDate } from "../dates.ts"

const TOP_DATES = 6

export const PEOPLE_ID = "people"
export const RESULTS_ID = "results"

/**
 * Who is in the room, and how much they have filled in.
 *
 * Answers Datastar-patch into this by id, so the id must stay stable.
 */
export const People: FC<{ board: Board }> = ({ board }) => (
  <div class="panel" id={PEOPLE_ID}>
    <div class="panel__head">
      <h2>Who's in</h2>
      <span class="spacer"></span>
      <span class="badge">{board.participants.length}</span>
    </div>

    <div class="people">
      {board.participants.map((participant) => (
        <div class={participant.isYou ? "person person--you" : "person"}>
          <span class="chip chip--lg" style={`--chip:${participant.color}`}>
            {participant.initials}
          </span>
          <span class="person__name">
            {participant.name}
            {participant.isYou && <span class="faint"> (you)</span>}
          </span>
          <span class="person__count">{countLabel(participant.days.size)}</span>
        </div>
      ))}
    </div>
  </div>
)

type ResultsProps = {
  board: Board
  now: PlainDate
}

/**
 * The dates that work for the most people.
 *
 * Carries the room revision as a signal so a polling client can be answered
 * with "nothing changed" instead of a fresh render. This element is rewritten on
 * every answer, which makes it the natural place to keep it.
 */
export const Results: FC<ResultsProps> = ({ board, now }) => {
  const ranked = rankDates(board, TOP_DATES, now)
  const total = board.participants.length
  const best = ranked[0]?.who.length ?? 0

  return (
    <div class="panel" id={RESULTS_ID} data-signals:rev={String(board.revision)}>
      <div class="panel__head">
        <h2>Best dates</h2>
      </div>

      {ranked.length === 0 ? (
        <p class="empty">No dates picked yet.</p>
      ) : (
        <div class="results">
          {ranked.map((entry) => (
            <div
              class={entry.who.length === best ? "result result--top" : "result"}
              title={summarise(entry.date, entry.who.map((p) => p.name), entry.missing.map((p) => p.name))}
            >
              <span class="result__date">{formatDate(entry.date)}</span>
              <span class="result__bar">
                <span
                  class="result__fill"
                  style={`width:${total > 0 ? Math.round((entry.who.length / total) * 100) : 0}%`}
                ></span>
              </span>
              <span class="result__score">
                {entry.who.length}/{total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function countLabel(count: number): string {
  if (count === 0) return "nothing yet"
  return count === 1 ? "1 day" : `${count} days`
}

function summarise(date: PlainDate, who: string[], missing: string[]): string {
  const parts = [formatDateLong(date), `can: ${who.join(", ")}`]
  if (missing.length > 0) parts.push(`missing: ${missing.join(", ")}`)
  return parts.join(" — ")
}
