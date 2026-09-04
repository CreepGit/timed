import { lib, util, pb } from '../../kit.ts'
import { Hono } from 'hono'
import z from 'zod'
import * as view from './room.views.tsx'

const app = new Hono()

app.get('/', (c) => {
    return c.redirect('/')
})

app.get('/:id', async (c) => {
    const roomId = z.string().min(1).parse(c.req.param('id'))
    const room = await pb.collection("timed_rooms").getOne(roomId)
    const { user } = await lib.getOrCreateGuestUser(c)

    const participant = await util.pb.get(pb.collection("timed_roomparticipant").getFirstListItem(
        `room = "${room.id}" && user = "${user.id}"`,
    ))

    if (!participant) {
        return c.html(<view.RoomJoinPage room={room} />)
    }

    const participants = await pb.collection("timed_roomparticipant").getFullList({
        filter: `room = "${room.id}"`,
    })

    return c.html(<view.RoomPage room={room} participant={participant} participants={participants} />)
})

app.post('/:id/name', async (c) => {
    const body = await c.req.parseBody()
    const roomId = z.string().min(1).parse(c.req.param('id'))
    const { success, data, error } = z.object({
        newName: z.string().min(3, { error: "Name too short" }).max(25, { error: "Name too long" }),
    }).safeParse(body)
    if (!success) {
        return c.html(<div id='formErrors' className='alert alert-soft alert-error flex flex-col gap-4'>
            <div className="flex gap-2 items-center">
                <span class="icon-[tabler--alert-triangle] shrink-0 size-6"></span>
                <p className='text-md'>Errors</p>
            </div>
            {error.issues.map((issue) => (
                <p>{issue.message}</p>
            ))}
        </div>, 200) // data-star needs 200 to populate body, should be 400
    }

    const { user } = await lib.getOrCreateGuestUser(c)

    await pb.collection("timed_roomparticipant").create({
        room: roomId,
        user: user.id,
        name: data.newName,
    })

    return c.redirect(`/room/${roomId}`)
})

app.post('/', async (c) => {
    const body = await c.req.parseBody()
    const { success, data, error } = z.object({
        roomName: z.string().min(3, { error: "Room name too short" }).max(200, { error: "Room name too long" }),
    }).safeParse(body)
    if (!success) {
        return c.html(<div id='formErrors' className='alert alert-soft alert-error flex flex-col gap-4'>
            <div className="flex gap-2 items-center">
                <span class="icon-[tabler--alert-triangle] shrink-0 size-6"></span>
                <p className='text-md'>Errors</p>
            </div>
            {error.issues.map((issue) => (
                <p>{issue.message}</p>
            ))}
        </div>, 200) // data-star needs 200 to populate body, should be 400
    }

    const { user } = await lib.getOrCreateGuestUser(c)

    const room = await pb.collection("timed_rooms").create({
        owner: user.id,
        name: data.roomName,
    })

    return c.redirect(`/room/${room.id}`)
})

export default app
