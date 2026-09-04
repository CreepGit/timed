import { Hono } from 'hono'
import { Page } from '../components/page.tsx'
import { Modal } from '../components/modal.tsx'
import * as cookie from 'hono/cookie'

import { USER_COOKIE_NAME } from './room.tsx'
import { pb } from '../pb.ts'
import type { TimedRoomparticipantResponse, TimedRoomsResponse } from '../pocketbase-types.ts'

const app = new Hono()

app.get('/', async (c) => {
  const userId = cookie.getCookie(c, USER_COOKIE_NAME)
  const user = userId ? (await pb.collection("timed_guest_user").getOne(userId)) : undefined
  const rooms = userId ? (await pb.collection("timed_roomparticipant").getFullList<TimedRoomparticipantResponse<{ room: TimedRoomsResponse }>>({
    filter: `user = "${userId}"`,
    expand: "room",
  })) : []

  const page = <Page title="Timed">
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <p>Hello</p>
      <a href="/sync" className="link link-accent link-animated">Sync</a>
      <br />
      <br />
      <button type="button" className="btn btn-primary flex items-center gap-2" aria-haspopup="dialog" aria-expanded="false" aria-controls="temp-modal-example" data-overlay="#temp-modal-example">
        <span className="icon-[tabler--circle-plus] size-5"></span>
        Create Room
      </button>
      <Modal id='temp-modal-example' title='Create a new room' position='center'>
        <form data-on:submit__prevent="@post('/room', {contentType: 'form'})" className="grid gap-y-4">
          <div>
            <label className="label-text" htmlFor="roomName">Room Name</label>
            <div className="input">
              <span className="icon-[tabler--door] text-base-content/80 my-auto size-4 shrink-0 mr-2"></span>
              <input id="roomName" name="roomName" type="text" placeholder="My Room" className="grow" required />
            </div>
          </div>
          <div className="mt-2 flex gap-4 justify-end">
            <button type="button" className="btn btn-soft btn-secondary" data-overlay="#temp-modal-example">Close</button>
            <button type="submit" className="btn btn-primary">Create Room</button>
          </div>
          <div id="formErrors"></div>
        </form>
      </Modal>
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
  </Page>

  return c.html(page)
})

export default app
