/*
 * Calendar dates in this app are plain year/month/day triples, never instants.
 * "August 15th" means the same thing to every participant regardless of the
 * timezone their browser or our server happens to be in, and PocketBase stores
 * the three parts as separate numbers, so there is nothing to convert.
 */

export type PlainDate = {
  year: number
  /** 1 = January ... 12 = December */
  month: number
  day: number
}

export type YearMonth = Pick<PlainDate, "year" | "month">

/** Four fills a 2x2 grid, leaving no gap at the end of a page. */
export const MONTHS_PER_PAGE = 4

/** Upper bound on how far ahead an open-ended room can be browsed. */
const OPEN_ENDED_MONTHS = 24

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "?"
}

export function shortMonthName(month: number): string {
  return monthName(month).slice(0, 3)
}

export const weekdayNames = WEEKDAY_NAMES

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Weekday of a date as a Monday-first index, 0 = Monday ... 6 = Sunday. */
export function weekday(date: PlainDate): number {
  return (new Date(date.year, date.month - 1, date.day).getDay() + 6) % 7
}

export function isWeekend(date: PlainDate): boolean {
  return weekday(date) >= 5
}

export function today(): PlainDate {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

/** Sortable, URL-safe form: `2026-08-15`. */
export function dateKey(date: PlainDate): string {
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`
}

export function monthKey(ym: YearMonth): string {
  return `${pad(ym.year, 4)}-${pad(ym.month, 2)}`
}

export function parseDateKey(input: string): PlainDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (!match) return null
  return validate({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) })
}

export function parseMonthKey(input: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(input)
  if (!match) return null
  const [year, month] = [Number(match[1]), Number(match[2])]
  if (month < 1 || month > 12 || year < 1970 || year > 9999) return null
  return { year, month }
}

/**
 * PocketBase returns date fields as `2026-07-31 00:00:00.000Z` and empty
 * fields as an empty string. Only the calendar part is meaningful to us.
 */
export function parsePocketBaseDate(input: string | undefined | null): PlainDate | null {
  if (!input) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.trim())
  if (!match) return null
  return validate({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) })
}

/** Formats as `2026-08-15 00:00:00.000Z`, which is what PocketBase expects. */
export function toPocketBaseDate(date: PlainDate): string {
  return `${dateKey(date)} 00:00:00.000Z`
}

export function compareDates(a: PlainDate, b: PlainDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day
}

export function sameDate(a: PlainDate, b: PlainDate): boolean {
  return compareDates(a, b) === 0
}

export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a.year - b.year || a.month - b.month
}

export function startOfMonth(ym: YearMonth): PlainDate {
  return { year: ym.year, month: ym.month, day: 1 }
}

export function endOfMonth(ym: YearMonth): PlainDate {
  return { year: ym.year, month: ym.month, day: daysInMonth(ym.year, ym.month) }
}

export function addMonths(ym: YearMonth, count: number): YearMonth {
  const zeroBased = ym.year * 12 + (ym.month - 1) + count
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 }
}

/** Number of whole months from `a` to `b`; negative when `b` precedes `a`. */
export function monthDistance(a: YearMonth, b: YearMonth): number {
  return (b.year * 12 + b.month) - (a.year * 12 + a.month)
}

export function daysOfMonth(ym: YearMonth): PlainDate[] {
  const total = daysInMonth(ym.year, ym.month)
  const days: PlainDate[] = []
  for (let day = 1; day <= total; day++) {
    days.push({ year: ym.year, month: ym.month, day })
  }
  return days
}

/** `Sat 15 Aug` — compact and unambiguous without needing the year. */
export function formatDate(date: PlainDate): string {
  return `${WEEKDAY_NAMES[weekday(date)]} ${date.day} ${shortMonthName(date.month)}`
}

/** `15 August 2026` */
export function formatDateLong(date: PlainDate): string {
  return `${date.day} ${monthName(date.month)} ${date.year}`
}

/* ------------------------------------------------------------------ window -- */

/**
 * The span of dates a room accepts answers for.
 *
 * `end` of `null` means the room is open-ended: it keeps rolling forward so a
 * recurring group can revisit the same link months later and still be looking
 * at upcoming dates rather than a frozen window.
 */
export type RoomWindow = {
  start: PlainDate
  end: PlainDate | null
}

export type MonthPage = {
  months: YearMonth[]
  /** First month of the previous page, or null when already at the start. */
  previous: YearMonth | null
  /** First month of the next page, or null when already at the end. */
  next: YearMonth | null
  first: YearMonth
}

/**
 * Resolves which months to render.
 *
 * Months entirely in the past are never offered, so a long-running room stays
 * useful without anyone having to edit it.
 */
export function monthPage(
  window: RoomWindow,
  requested: YearMonth | null,
  now: PlainDate = today(),
  perPage: number = MONTHS_PER_PAGE,
): MonthPage {
  const earliest = compareDates(window.start, now) > 0 ? window.start : now
  const firstMonth: YearMonth = { year: earliest.year, month: earliest.month }
  const lastMonth: YearMonth = window.end
    ? { year: window.end.year, month: window.end.month }
    : addMonths(firstMonth, OPEN_ENDED_MONTHS)

  // A room whose end date has already passed collapses to a single month.
  const total = Math.max(1, monthDistance(firstMonth, lastMonth) + 1)
  const size = Math.min(perPage, total)
  const maxOffset = Math.max(0, total - size)
  const offset = clamp(requested ? monthDistance(firstMonth, requested) : 0, 0, maxOffset)

  const months: YearMonth[] = []
  for (let i = 0; i < size; i++) {
    months.push(addMonths(firstMonth, offset + i))
  }

  return {
    months,
    first: months[0]!,
    previous: offset > 0 ? addMonths(firstMonth, Math.max(0, offset - size)) : null,
    next: offset < maxOffset ? addMonths(firstMonth, Math.min(maxOffset, offset + size)) : null,
  }
}

/** Whether a date may be answered: inside the room's span and not in the past. */
export function isSelectable(
  date: PlainDate,
  window: RoomWindow,
  now: PlainDate = today(),
): boolean {
  if (compareDates(date, now) < 0) return false
  if (compareDates(date, window.start) < 0) return false
  if (window.end && compareDates(date, window.end) > 0) return false
  return true
}

/* ------------------------------------------------------------------ helpers -- */

function validate(date: PlainDate): PlainDate | null {
  const { year, month, day } = date
  if (year < 1970 || year > 9999) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null
  return date
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0")
}
