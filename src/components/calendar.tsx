import type { FC } from "hono/jsx"
import { eachDayOfInterval, startOfMonth, endOfMonth, subDays, addDays } from "date-fns"

type CalendarProps = {
  year: number
  /** 1 january ... 12 december */
  month: number
}

export const Calendar: FC<CalendarProps> = ({ year, month }) => {
  const monthIndex = month - 1

  function getDays(firstDay: Date): Date[] {
    const preDays = (firstDay.getDay() + 6) % 7 // Moves sunday from first to last
    const lastDayPos = (endOfMonth(firstDay).getDay() + 6) % 7
    const postDays = 7 - lastDayPos - 1
    const startDay = subDays(firstDay, preDays)
    const endDay = addDays(endOfMonth(firstDay), postDays)

    return eachDayOfInterval({
      start: startDay,
      end: endDay,
    });
  }

  function element(d: Date) {
    const isThisMonth = d.getMonth() === monthIndex
    let text: string
    if (isThisMonth) {
      text = `${d.getDate()}.${d.getMonth() + 1}.`
    } else {
      text = `${d.getDate()}.`
    }
    return <button className="btn btn-ghost" disabled={!isThisMonth}>{text}</button>
  }

  function elements() {
    const firstDayNoon = new Date(year, monthIndex, 1, 12, 0, 0)
    return getDays(firstDayNoon).map((d) => {
      return element(d)
    })
  }

  function headers() {
    return (
      <>
        <span className="text-center text-primary select-none">Mon</span>
        <span className="text-center text-primary select-none">Tue</span>
        <span className="text-center text-primary select-none">Wed</span>
        <span className="text-center text-primary select-none">Thu</span>
        <span className="text-center text-primary select-none">Fri</span>
        <span className="text-center text-primary select-none">Sat</span>
        <span className="text-center text-primary select-none">Sun</span>
      </>
    )
  }

  return (
    <div className="card card-border bg-base-200 m-4 p-4" style={{display: "inline-grid", gridTemplateColumns: "repeat(7, 6rch)"}}>
      {headers()}
      {elements()}
    </div>
  )
}
