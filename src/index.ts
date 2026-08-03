import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import PocketBase from "pocketbase"
import env from "./env.ts"

const app = new Hono()
const pb = new PocketBase(env.PB_HOST)

const health = await pb.health.check()
console.log("Health check:")
console.log(health)
console.log("")

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on port ${info.port}`)
})
