import { pb, lib, ui, util } from '../../kit.ts'
import { urls } from '../urls.ts'
import { Hono } from 'hono'
import type { TimedGuestUserResponse, TimedRoomparticipantResponse, TimedRoomsResponse } from '../../pocketbase-types.ts'
import * as view from './home.views.tsx'
import z from 'zod'

const app = new Hono().basePath("/")

export const createRoomForm = util.form.create({
  id: "create-room-form",
  action: "/room",
  fields: {
    roomName: {
      type: "text",
      label: "Room name",
      placeholder: "My Room",
      icon: "icon-[tabler--door]",
      schema: z.string()
        .nonempty({ error: "Required", abort: true })
        .min(3, "Room name too short")
        .max(40, "Room name too long")
    },
  }
})

createRoomForm.addHandler(app, async (c, data) => {
  // Success callback
  const { user } = await lib.getOrCreateGuestUser(c)

  const room = await pb.collection("timed_rooms").create({
    owner: user.id,
    name: data.roomName,
  })

  console.log('redirecting to /room/${room.id}')
  return util.redirect(c, `/room/${room.id}`)
})

util.page.create({
  route: urls.home.route,
  app,
  pre: async (ctx) => {
    const user = await lib.getGuestUser(ctx.c)
    return {
      user: user ? user : undefined
    }
  },
  data: (ctx) => ({
    rooms: util.page.dataList<"timed_roomparticipant", { room: TimedRoomsResponse }>({
      type: "list",
      collection: "timed_roomparticipant",
      filter: pb.filter("user = {:id}", { id: ctx.pre.user?.id ?? "" }),
      expand: {
        "room": ["timed_rooms", ],
      },
    }),
    owners: util.page.dataList({
      type: "list",
      collection: "timed_roomparticipant",
      filter: pb.filter(
        "user = room.owner && room.timed_roomparticipant_via_room.user ?= {:id}",
        { id: ctx.pre.user?.id ?? "" }
      ),
    })
  }),
  view: async (ctx) => {
    const user = ctx.pre.user
    return <view.HomePage user={user} rooms={ctx.data.rooms} owners={ctx.data.owners} form={createRoomForm} />
  },
})

export default app
