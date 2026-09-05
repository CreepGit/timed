import { pb, lib, ui, util } from '../../kit.ts'
import { Hono } from 'hono'
import type { TimedRoomparticipantResponse, TimedRoomsResponse } from '../../pocketbase-types.ts'
import * as view from './home.views.tsx'
import z from 'zod'

const app = new Hono().basePath("/")

export type NewRoomFormType = typeof newRoom
const newRoom = util.form.create({
  action: "/room",
  fields: {
    roomName: {
      type: "text",
      label: "Room name",
      placeholder: "My Room",
      icon: "icon-[tabler--door]",
      schema: z.string().min(3, { error: "Room name too short" }).max(200, { error: "Room name too long" }),
    },
  }
})

newRoom.addHandler(app, async (c, data) => {
  // Success callback
  const { user } = await lib.getOrCreateGuestUser(c)

  const room = await pb.collection("timed_rooms").create({
    owner: user.id,
    name: data.roomName,
  })

  // Data-start @post prevents redicret.
  // Instead shows the new content on the previous URL breaking F5.
  return c.redirect(`/room/${room.id}`)
})

app.get('/', async (c) => {
  const user = await lib.getGuestUser(c)
  const rooms = user ? (await pb.collection("timed_roomparticipant").getFullList<TimedRoomparticipantResponse<{ room: TimedRoomsResponse }>>({
    filter: `user = "${user.id}"`,
    expand: "room",
  })) : []

  return c.html(<view.HomePage user={user} rooms={rooms} form={newRoom} />)
})

export default app
