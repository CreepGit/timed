import { pb, lib, ui, util } from '../../kit.ts'
import type { FC } from 'hono/jsx'
import type { TimedGuestUserResponse, TimedRoomparticipantResponse, TimedRoomsResponse } from '../../pocketbase-types.ts'
import type { NewRoomFormType } from './home.route.tsx'

type HomePageProps = {
  user: TimedGuestUserResponse | undefined
  rooms: TimedRoomparticipantResponse<{ room: TimedRoomsResponse }>[]
  form: NewRoomFormType
}

export const HomePage: FC<HomePageProps> = ({ user, rooms, form }) => {
  return <ui.Page title="Timed">
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <a href="/sync" className="link link-accent link-animated">Sync</a>
      <br />
      <br />
      <button type="button" className="btn btn-primary flex items-center gap-2" aria-haspopup="dialog" aria-expanded="false" aria-controls="temp-modal-example" data-overlay="#temp-modal-example">
        <span className="icon-[tabler--circle-plus] size-5"></span>
        Create Room
      </button>
      <ui.Modal id='temp-modal-example' title='Create a new room' position='center'>
        {/* Still valid, though probably better to use utility */}
        {/* <ui.Form form={form}>
          { form.fields.map(([name, field]) => <ui.Field name={name} field={field} />) }
          <div className="mt-2 flex gap-4 justify-end">
            <button type="button" className="btn btn-soft btn-secondary" data-overlay="#temp-modal-example">Close</button>
            <button type="submit" className="btn btn-primary">Create Room</button>
          </div>
          <div id={form.errorId}></div>
        </ui.Form> */}
        { form.render({}, <div className="mt-2 flex gap-4 justify-end">
            <button type="button" className="btn btn-soft btn-secondary" data-overlay="#temp-modal-example">Close</button>
            <button type="submit" className="btn btn-primary">Create Room</button>
          </div>) }
      </ui.Modal>
      <br />
      <p>You are: {user ? <span className="text-primary">{user.id}</span> : "not registered"}</p>
      <p>Your rooms:</p>
      <br />
      <ul>
        {rooms.length > 0 ? rooms.map((room) => <li className="flex items-center gap-2">
          <a href={`/room/${room.expand.room.id}`} className="link link-accent link-animated">
            <span className="icon-[tabler--bookmark] mr-1"></span>
            {room.expand.room.name}
          </a>
          <span> as </span>
          <span className="text-primary">{room.name}</span>
        </li>) : <li className="flex items-center gap-2"><span className="icon-[tabler--bookmark-off]"></span> No rooms yet</li>}
      </ul>
    </div>
  </ui.Page>
}
