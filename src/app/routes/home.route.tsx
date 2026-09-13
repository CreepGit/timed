import { pb, lib, ui, util } from '../../kit.ts'
import { urls } from '../urls.ts'
import { Hono } from 'hono'
import type { TimedGuestUserResponse, TimedRoomparticipantResponse, TimedRoomsResponse } from '../../pocketbase-types.ts'
import * as view from './home.views.tsx'
import z from 'zod'

const app = new Hono().basePath("/")

export const createRoomForm = util.form.create({
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
        
        // Running:
        //    "room.timed_roomparticipant_via_room": ["timed_rooms", "timed_roomparticipant", ],
        // Produces:
        //    timed_rooms_via_timed_roomparticipant_via_room.timed_roomparticipant_via_room.user?='ai7xwssf64cvrbg'
        //
        // Which is not usable
        
        // Notes
        
        // Cant really do room.owner.participation as it extends to ... no nevermind
        // it should combine room = {:roomId} & guest = {:ownerId}
        // Not yet implemented though...
        // TODO: Implement
        //
        // So currently... if room.owner.participation
        // then, if any participation for room.owner changes, even unrelated to the
        // original rooms queried with room, it will trigger a re-render.
        //
        // This wouldnt do anything other than waste server resources and expose
        // the client information it shouldn't have, so probably not ideal.
        //
        // Implementing would require knowing room query's id, which i cant see
        // how you would get that without pb.collection.list before subscribing.
        //
        // Though maybe it's fine, would add a lot of latency to the subscription
        // but it already implements fast-forwarding to the current state from the
        // pre-rendered template's state.
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
