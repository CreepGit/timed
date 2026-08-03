import { Page } from "../components/page.tsx"
import { Calendar } from "../components/calendar.tsx"
import type { TimedRoomsRecord } from "../pocketbase-types.ts"

export const Room = (room: TimedRoomsRecord, counts: Record<string, number>) => {
  return (
    <Page title={`Timed / ${room.name}`}>
      <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        <h1>Room / {room.name}</h1>
        <div className="text-primary" id="output">offline...</div>
        <p>{room.description}</p>
        <div className="divider"></div>
        <label className="label" for="name">Your name</label>
        <br />
        <input className="input input-bordered" data-bind="name" type="text" name="name" id="name" placeholder="" />
        <div className="divider"></div>
        <Calendar roomId={room.id} month={8} year={2026} counts={counts} />
        <Calendar roomId={room.id} month={9} year={2026} counts={counts} />
        <Calendar roomId={room.id} month={10} year={2026} counts={counts} />
      </div>
      <div data-init={`@get('/r/${room.id}/stream')`}></div>
    </Page>
  )
}
