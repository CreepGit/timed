import { Page } from "../components/page.tsx"
import { Calendar } from "../components/calendar.tsx"
import type { TimedRoomsRecord } from "../pocketbase-types.ts"

export const Room = (room: TimedRoomsRecord) => {
  return (
    <Page title={`Timed / ${room.name}`}>
      <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        <h1 className="text-2xl font-bold">Room / {room.name}</h1>
        <p>{room.description}</p>
        <div className="divider"></div>
        <label className="label" for="name">Your name</label>
        <br />
        <input className="input input-bordered" type="text" name="name" id="name" placeholder="" />
        <div className="divider"></div>
        <Calendar month={8} year={2026} />
        <Calendar month={9} year={2026} />
        <Calendar month={10} year={2026} />
      </div>
    </Page>
  )
}
