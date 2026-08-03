import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import PocketBase from "pocketbase"
import env from "./env.ts"
import { Home } from "./views/home.tsx"
import { Room } from "./views/room.tsx"
import type { TimedRoomsRecord, TypedPocketBase } from './pocketbase-types.ts'

const app = new Hono()
const pb = new PocketBase(env.PB_HOST) as TypedPocketBase

pb.authStore.save(env.PB_TOKEN)

const health = await pb.health.check()
console.log("Health check:")
console.log(health)
console.log("")

if (!pb.authStore.isValid) {
  throw new Error("env.PB_TOKEN does not appear to be valid.")
}

app.get('/', (c) => {
  return c.html(Home())
})

app.post('/r', async (c) => {
  const form = await c.req.formData()
  const name = form.get("name") as string|undefined
  if (!name) {
    return c.redirect("/")
  }
  if (name.length < 3) {
    return c.redirect("/")
  }
  const room = await pb.collection("timed_rooms").create({
    name: name,
    description: "...",
  })
  const id = room.id
  return c.redirect(`/r/${id}`)
})

app.get('/r/:id', async (c) => {
  const id = c.req.param('id')

  let room: TimedRoomsRecord
  try {
    room = await pb.collection("timed_rooms").getOne(id)
  } catch (error) {
    return c.newResponse("Not found.", 404)
  }
  return c.html(Room(room))
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on port ${info.port}`)
})
