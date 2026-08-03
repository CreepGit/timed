import type { FC } from "hono/jsx"
import type { Board, Participant } from "../db.ts"
import {
  dateKey,
  daysOfMonth,
  formatDateLong,
  isSelectable,
  monthName,
  sameDate,
  startOfMonth,
  weekday,
  weekdayNames,
  type PlainDate,
  type YearMonth,
} from "../dates.ts"

/** Beyond this, cells get too crowded to read, so the rest become a "+n". */
const MAX_CHIPS = 4

/** Stable per-date element id, so a single cell can be patched in isolation. */
export function dayId(date: PlainDate): string {
  return `day-${dateKey(date)}`
}

type DayProps = {
  roomId: string
  date: PlainDate
  board: Board
  now: PlainDate
}

/**
 * One day.
 *
 * Selection state lives in the class list rather than a Datastar signal, so what
 * the server stored and what the browser shows cannot drift apart, and a reload
 * needs no client-side rehydration.
 *
 * It is a real submit button inside a form, so the calendar still works with
 * JavaScript unavailable; Datastar intercepts the click when it is available.
 */
export const DayCell: FC<DayProps> = ({ roomId, date, board, now }) => {
  const key = dateKey(date)
  const who = board.byDate.get(key) ?? []
  const mine = board.you.days.has(key)
  const selectable = isSelectable(date, board.window, now)
  const everyone = who.length > 1 && who.length === board.participants.length

  const classes = ["day"]
  if (mine) classes.push("day--mine")
  if (sameDate(date, now)) classes.push("day--today")
  if (everyone) classes.push("day--full")

  const hidden = who.length - MAX_CHIPS

  return (
    <button
      id={dayId(date)}
      type="submit"
      name="date"
      value={key}
      class={classes.join(" ")}
      disabled={!selectable}
      aria-pressed={mine ? "true" : "false"}
      title={describe(date, who, selectable)}
      data-on:click__prevent={selectable ? `@post('/r/${roomId}/toggle/${key}')` : undefined}
    >
      <span class="day__num">{date.day}</span>
      <span class="day__who">
        {who.slice(0, MAX_CHIPS).map((participant) => (
          <span class="chip" style={`--chip:${participant.color}`}>
            {participant.initials}
          </span>
        ))}
        {hidden > 0 && <span class="chip chip--more">+{hidden}</span>}
      </span>
    </button>
  )
}

type MonthProps = {
  roomId: string
  month: YearMonth
  board: Board
  now: PlainDate
}

export const Month: FC<MonthProps> = ({ roomId, month, board, now }) => {
  // Blank cells so the 1st lands under its weekday.
  const lead = weekday(startOfMonth(month))

  return (
    <section class="month">
      <h3 class="month__title">
        {monthName(month.month)} <span class="month__year">{month.year}</span>
      </h3>
      <div class="grid">
        {weekdayNames.map((name, index) => (
          <span class={index >= 5 ? "grid__head grid__head--weekend" : "grid__head"}>{name}</span>
        ))}
        {Array.from({ length: lead }, () => <div class="day--void" aria-hidden="true"></div>)}
        {daysOfMonth(month).map((date) => (
          <DayCell roomId={roomId} date={date} board={board} now={now} />
        ))}
      </div>
    </section>
  )
}

type CalendarProps = {
  roomId: string
  months: YearMonth[]
  board: Board
  now: PlainDate
}

export const Calendar: FC<CalendarProps> = ({ roomId, months, board, now }) => (
  <div class="months">
    {months.map((month) => (
      <Month roomId={roomId} month={month} board={board} now={now} />
    ))}
  </div>
)

/** Native tooltip listing who marked a day, since chips only show initials. */
function describe(date: PlainDate, who: Participant[], selectable: boolean): string {
  const when = formatDateLong(date)
  if (who.length === 0) {
    return selectable ? `${when} — nobody yet` : `${when} — unavailable`
  }
  return `${when} — ${who.map((participant) => participant.name).join(", ")}`
}
