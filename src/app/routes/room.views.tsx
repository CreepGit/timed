import { pb, lib, ui, util } from '../../kit.ts'
import type { FC } from 'hono/jsx'
import type { TimedRoomparticipantResponse, TimedRoomsResponse } from '../../pocketbase-types.ts'

export const RoomJoinPage: FC<{ room: TimedRoomsResponse }> = ({ room }) => {
    return <ui.Page title="Timed">
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
    </ui.Page>
}

type RoomPageProps = {
    room: TimedRoomsResponse
    participant: TimedRoomparticipantResponse
    participants: TimedRoomparticipantResponse[]
}

export const RoomPage: FC<RoomPageProps> = ({ room, participant, participants }) => {
    return <ui.Page title="Timed">
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <p><span className="text-primary">{room.name}</span> (<span className="text-neutral">{room.id}</span>) (<a href="/" className="link link-accent link-animated">back</a>)</p>
            <div className="divider py-5"></div>
            <p>Participating as {participant.name}</p>
            <br />
            <p>All members:</p>
            <ul>
                {participants.map((p) => (
                    <li>{p.name}</li>
                ))}
            </ul>
        </div>
    </ui.Page>
}
