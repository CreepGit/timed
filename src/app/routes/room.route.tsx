import { lib, util, pb } from '../../kit.ts'
import { Hono } from 'hono'
import z from 'zod'
import * as view from './room.views.tsx'

const app = new Hono()

app.get('/room/', (c) => {
    return c.redirect('/')
})

export type RenameRoomFormType = typeof renameRoom
const renameRoom = util.form.create({
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

    return c.redirect(`/room/${roomId}`)
})

app.get('/room/:id', async (c) => {
    const roomId = z.string().min(1).parse(c.req.param('id'))
    const room = await pb.collection("timed_rooms").getOne(roomId)
    const { user } = await lib.getOrCreateGuestUser(c)

    const participant = await util.pb.get(pb.collection("timed_roomparticipant").getFirstListItem(
        `room = "${room.id}" && user = "${user.id}"`,
    ))

    if (!participant) {
        return c.html(<view.RoomJoinPage room={room} form={renameRoom} />)
    }

    const participants = await pb.collection("timed_roomparticipant").getFullList({
        filter: `room = "${room.id}"`,
    })

    return c.html(<view.RoomPage room={room} participant={participant} participants={participants} />)
})

export default app
