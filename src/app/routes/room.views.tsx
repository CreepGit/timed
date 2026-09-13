import { pb, lib, ui, util } from '../../kit.ts'
import type { FC } from 'hono/jsx'
import type { TimedRoomparticipantResponse, TimedRoomsResponse } from '../../pocketbase-types.ts'
import type { renameRoom } from './room.route.tsx'

type RoomJoinPageProps = {
    room: TimedRoomsResponse
    form: typeof renameRoom
}

export const RoomJoinPage: FC<RoomJoinPageProps> = ({ room, form }) => {
    return <ui.Page title="Timed">
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <p>{room.name} (<span className="text-secondary">{room.id}</span>) (<a href="/" className="link link-accent link-animated">back</a>)</p>
            <div className="divider py-5"></div>
            <p>Not participating yet, you need to select a name!</p>
            <br />
            <div className="max-w-sm card p-4">
                { form.render({ id: room.id }, <div className="mt-2 flex gap-4 justify-end">
                    <button type="submit" className="btn btn-primary">Join</button>
                </div>) }
            </div>
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
            {/* <div data-signals = "{ open: false }" className="card p-4">
                <button className="btn btn-primary" data-on:click="$open = !$open" data-text="$open ? 'Close' : 'Open'">Open</button>
                <div data-show="$open" style={{ display: "none" }} className="pt-4">
                    <p className="text-primary font-bold text-lg">HELLO THERE</p>
                    <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Eius corrupti consequatur exercitationem voluptatibus, alias laborum vero fugiat. Nobis veniam mollitia quam, voluptates at minus deserunt est nulla. Nulla, veritatis accusamus.</p>
                </div>
            </div> */}
            <div className="card p-4" data-signals="{ open: false }">
                <button type="button" className="btn btn-primary" data-on:click="$open = !$open">
                    <span className="icon-[tabler--chevron-down] transition-transform duration-150" data-class="{ 'rotate-180': $open }"></span>
                    <span data-text="$open ? 'Close' : 'Open'">Open</span>
                </button>
                <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-150" data-class="{ 'grid-rows-[1fr]': $open }">
                    <div className="overflow-hidden">
                        <div className="border-base-content/25 mt-3 rounded-md border p-3">
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi quas in dolorem beatae sequi eum repudiandae at tempore sunt amet tenetur possimus, nesciunt enim excepturi rerum sit quos ipsum repellendus.</p>
                            <button className="btn btn-soft mt-2" data-on:click="$open = false">Close</button>
                        </div>
                    </div>
                </div>
            </div>
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
