import { lib, util, pb, ui } from '../../kit.ts'
import { Hono } from 'hono'
import z from 'zod'
import * as view from './room.views.tsx'
import { urls } from '../urls.ts'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

app.get('/room/', (c) => {
    return c.redirect('/')
})

export const renameRoom = util.form.create({
    action: '/room/:id/name',
    fields: {
        newName: {
            type: 'text',
            label: 'New name',
            placeholder: 'New name',
            icon: 'icon-[tabler--user]',
            schema: z.string().min(3, { error: "Name too short" }).max(40, { error: "Name too long" }),
        }
    }
})

renameRoom.addHandler(app, async (c, data) => {
    const roomId = z.string().min(1).parse(c.req.param('id'))

    const { user } = await lib.getOrCreateGuestUser(c)

    await pb.collection("timed_roomparticipant").create({
        room: roomId,
        user: user.id,
        name: data.newName,
    })

    return util.redirect(c, `/room/${roomId}`)
})

util.page.create({
    route: urls.roomDetail.route,
    app,
    pre: async (ctx) => {
        return { userId: (await lib.getOrCreateGuestUser(ctx.c)).user.id }
    },
    data: (ctx) => ({
        room: util.page.dataOne({
            collection: "timed_rooms",
            type: "one",
            id: ctx.routeParams.id,
        }),
        // Should get analog for pb.getFirstListItem
        participant: util.page.dataFirst({
            collection: "timed_roomparticipant",
            type: "first",
            filter: pb.filter("room = {:roomId} && user = {:userId}", { roomId: ctx.routeParams.id, userId: ctx.pre.userId }),
        }),
        participants: util.page.dataList({
            collection: "timed_roomparticipant",
            type: "list",
            filter: pb.filter("room = {:id}", { id: ctx.routeParams.id }),
        }),
    }),
    view: async (ctx) => {
        const { room, participant, participants } = ctx.data
        if (!room) {
            throw new HTTPException(404, { message: 'Room not found' })
        }
        if (!participant) {
            return <view.RoomJoinPage room={room} form={renameRoom} />
        }
        return <view.RoomPage room={room} participant={participant} participants={participants} />
    },
})

export default app
