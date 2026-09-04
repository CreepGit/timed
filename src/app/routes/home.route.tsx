import { pb, lib, ui, util } from '../../kit.ts'
import { Hono } from 'hono'
import type { TimedRoomparticipantResponse, TimedRoomsResponse } from '../../pocketbase-types.ts'
import { HomePage } from './home.views.tsx'

const app = new Hono()

app.get('/', async (c) => {
  const user = await lib.getGuestUser(c)
  const rooms = user ? (await pb.collection("timed_roomparticipant").getFullList<TimedRoomparticipantResponse<{ room: TimedRoomsResponse }>>({
    filter: `user = "${user.id}"`,
    expand: "room",
  })) : []

  return c.html(<HomePage user={user} rooms={rooms} />)
})

export default app
