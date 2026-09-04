import { Hono } from 'hono'
import { Page } from '../components/page.tsx'
import z from 'zod'
import * as cookie from 'hono/cookie'
import { pb } from '../pb.ts'
import { ClientResponseError } from 'pocketbase'

const app = new Hono()

export const USER_COOKIE_NAME = "guest_user"

async function getOrUndefined<T>(promise: Promise<T>): Promise<T | undefined> {
    try {
        return await promise
    } catch (e) {
        if (e instanceof ClientResponseError && e.status === 404) return undefined
        throw e
    }
}

app.get('/', (c) => {
    return c.redirect('/')
})

app.get('/:id', async (c) => {
    const roomId = z.string().min(1).parse(c.req.param('id'))
    const room = await pb.collection("timed_rooms").getOne(roomId)
    let userId = cookie.getCookie(c, USER_COOKIE_NAME)

    if (!userId) {
        // If not recognized user already, create one
        const guestUser = await pb.collection("timed_guest_user").create({})
        cookie.setCookie(c, USER_COOKIE_NAME, guestUser.id, {
            maxAge: 60 * 60 * 24 * 365, // 1 year
            path: '/',
            sameSite: 'Lax',
            httpOnly: true,
        })
        userId = guestUser.id
    }

    const participant = await getOrUndefined(pb.collection("timed_roomparticipant").getFirstListItem(
        `room = "${room.id}" && user = "${userId}"`,
    ))

    if (!participant) {
        const pageNeedName = <Page title="Timed">
            <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
                <p>{room.name} (<span className="text-secondary">{room.id}</span>) (<a href="/" className="link link-accent link-animated">back</a>)</p>
                <div className="divider py-5"></div>
                <p>Not participating yet, you need to select a name!</p>
                <br />
                <form data-on:submit__prevent={`@post('/room/${room.id}/name', {contentType: 'form'})`} className="card p-4 w-fit">
                    <div>
                        <label className="label-text" htmlFor="newName">Name</label>
                        <div className="input">
                            <input id="newName" name="newName" type="text" placeholder="Your name" className="grow" required />
                        </div>
                    </div>
                    <div className="mt-2 flex gap-4 justify-end">
                        <button type="submit" className="btn btn-primary">Join</button>
                    </div>
                    <div id="formErrors"></div>
                </form>
            </div>
        </Page>

        return c.html(pageNeedName)
    }

    const allParticipants = await pb.collection("timed_roomparticipant").getFullList({
        filter: `room = "${room.id}"`,
    })

    const page = <Page title="Timed">
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <p><span className="text-primary">{room.name}</span> (<span className="text-neutral">{room.id}</span>) (<a href="/" className="link link-accent link-animated">back</a>)</p>
            <div className="divider py-5"></div>
            <p>Participating as {participant.name}</p>
            <br />
            <p>All members:</p>
            <ul>
                {allParticipants.map((p) => (
                    <li>{p.name}</li>
                ))}
            </ul>
        </div>
    </Page>

    return c.html(page)
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

    const userId = cookie.getCookie(c, USER_COOKIE_NAME)

    if (!userId) {
        throw new Error("User not found")
    }

    const participant = await pb.collection("timed_roomparticipant").create({
        room: roomId,
        user: userId,
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

    async function createGuestUser(): Promise<string> {
        const record = await pb.collection("timed_guest_user").create({})
        return record.id
    }

    async function getOrCreateGuestUser(): Promise<{ created: boolean, id: string }> {
        const nowCookie = cookie.getCookie(c, USER_COOKIE_NAME)
        if (nowCookie) {
            try {
                const record = await pb.collection("timed_guest_user").getOne(nowCookie)
                return { created: false, id: record.id }
            } catch (error) {
                return { created: true, id: await createGuestUser() }
            }
        } else {
            return { created: true, id: await createGuestUser()}
        }
    }

    const { created, id: userId } = await getOrCreateGuestUser()
    if (created) {
        cookie.setCookie(c, USER_COOKIE_NAME, userId, {
            maxAge: 60 * 60 * 24 * 365, // 1 year
            path: '/',
            sameSite: 'Lax',
            httpOnly: true,
        })
    }

    const room = await pb.collection("timed_rooms").create({
        owner: userId,
        name: data.roomName,
    })

    return c.redirect(`/room/${room.id}`)
})

export default app
