import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import PocketBase from "pocketbase"
import env from "./env.ts"
import { Home } from "./views/home.tsx"
import { Room } from "./views/room.tsx"
import type { TimedRoomsRecord, TypedPocketBase } from './pocketbase-types.ts'
import { stream, streamText, streamSSE } from 'hono/streaming'

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
  
  const list = await pb.collection("timed_response").getFullList({
    filter: pb.filter("room = {:room}", { room: id }),
  })

  const counts: Record<string, number> = {}
  list.forEach(i => {
    const key = `d${i.day}x${i.month}`
    counts[key] = (counts[key] ?? 0) + 1
  })

  return c.html(Room(room, counts))
})

app.post('/r/:id/a', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  let room: TimedRoomsRecord
  try {
    room = await pb.collection("timed_rooms").getOne(id)
  } catch (error) {
    return c.newResponse("Not found.", 404)
  }

  const name = body.name

  if (!name) {
    return c.newResponse("Name is required.", 400)
  }

  const actions: Promise<void|boolean>[] = []

  const list = await pb.collection("timed_response").getFullList({
    filter: pb.filter("room = {:room} && name = {:name}", { room: id, name }),
  })

  const positiveMap = new Set<number>(list.map(i => i.day*100 + i.month))

  for (const [key, stringValue] of Object.entries(body)) {
    const re = (/d(\d+)x(\d+)/)
    const value = stringValue === "1"
    if (re.test(key)) {
      const [, dayS, monthS] = re.exec(key)!
      const [day, month] = [ Number(dayS), Number(monthS) ]
      const has = positiveMap.has(day*100 + month)

      if (value && !has) {
        // Missing, please create
        console.log(`Adding ${day} ${month} for ${name}`)
        actions.push(pb.collection("timed_response").create({
          room: id,
          day: day,
          month: month,
          name: name,
        }))
      }

      if (!value && has) {
        // Please remove
        console.log(`Removing ${day} ${month} for ${name}`)

        const id = list.find(i => i.day === day && i.month === month)?.id
        if (id) {
          actions.push(pb.collection("timed_response").delete(id))
        } else {
          console.warn("Logic error, did not find already listed record to remove")
        }
      }
    }
  }

  await Promise.all(actions)
  console.log("Actions completed")
  
  const list2 = await pb.collection("timed_response").getFullList({
    filter: pb.filter("room = {:room}", { room: id }),
  })

  const counts: Record<string, number> = {}
  list2.forEach(i => {
    const key = `d${i.day}x${i.month}`
    counts[key] = (counts[key] ?? 0) + 1
  })

  return c.html(Room(room, counts))
})

app.get('/r/:id/stream', async (c) => {
  const id = c.req.param('id')
  const data = c.req.query("datastar")
  if (!data) {
    return c.newResponse("Datastar is required.", 400)
  }
  const name = JSON.parse(data)?.["name"]

  if (!name) {
    return c.newResponse("Name is required.", 400)
  }

  const list = await pb.collection("timed_response").getFullList({
    filter: pb.filter("room = {:room} && name = {:name}", { room: id, name }),
  })

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: 'datastar-patch-elements',
      data: `elements <div id="output">⚡ Streaming...</div>`,
    })

    for (const item of list) {
      await stream.writeSSE({
        event: 'datastar-patch-signals',
        data: `signals {d${item.day}x${item.month}: '1'}`,
      })
    }
  })
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on port ${info.port}`)
})
