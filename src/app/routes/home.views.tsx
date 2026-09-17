import { pb, lib, ui, util } from '../../kit.ts'
import type { FC } from 'hono/jsx'
import type { TGuestResponse, TUserResponse, TRoomResponse } from '../../pocketbase-types.ts'
import type { createRoomForm } from './home.route.tsx'
import * as rad from 'radash'

type HomePageProps = {
  user: TGuestResponse | undefined
  rooms: TUserResponse<{ room: TRoomResponse }>[]
  form: typeof createRoomForm
  owners: TUserResponse[]
}

export const HomePage: FC<HomePageProps> = ({ user, rooms, form, owners }) => {
  const ownersMap = rad.objectify(owners, u => u.user, u => u)

  return <ui.Page title="Timed">
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <a href="/sync" className="link link-accent link-animated">
        <ui.IconSpan icon="icon-[tabler--checkbox]" size={5} />
        <span> Sync</span>
      </a>
      <br />
      <br />
      <button type="button" className="btn btn-primary flex items-center gap-2" aria-haspopup="dialog" aria-expanded="false" aria-controls="temp-modal-example" data-overlay="#temp-modal-example">
        <span className="icon-[tabler--circle-plus] size-5"></span>
        Create Room
      </button>
      <ui.Modal id='temp-modal-example' title='Create a new room' position='center'>
        <ui.Form form={form}>
          <div className="mt-2 flex gap-4 justify-end">
            <button type="button" className="btn btn-soft btn-secondary" data-overlay="#temp-modal-example">Close</button>
            <ui.Submit form={form}>Create Room</ui.Submit>
          </div>
        </ui.Form>
      </ui.Modal>
      <br />
      <p>You are: {user ? <span className="text-primary">{user.id}</span> : "not registered"}</p>
      <p>Your rooms:</p>
      <br />
      <ul className="flex flex-col gap-1">
        {rooms.length > 0 ? rooms.map((room) => <li className="inline-flex items-center gap-x-1 flex-wrap">
          <a href={`/room/${room.expand.room.id}`} className="link link-accent link-animated">
            <ui.IconSpan icon="icon-[tabler--bookmark]" size={5} />
            <span>{room.expand.room.name}</span>
          </a>
          <span> as </span>
          <span className="text-primary">{room.name}</span>
          <span> by </span>
          <span className="text-primary">{ownersMap[room.expand.room.owner]?.name ?? room.expand.room.owner}</span>
        </li>) : <li className="flex items-center gap-2"><span className="icon-[tabler--bookmark-off]"></span> No rooms yet</li>}
      </ul>
    </div>
  </ui.Page>
}
