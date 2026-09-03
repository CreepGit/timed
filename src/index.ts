import { EventSource } from "eventsource"
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { serveStatic } from "@hono/node-server/serve-static"

// Polyfill
Object.assign(globalThis, { EventSource })

// Routes
import index from "./routes/home.tsx"
import sync from "./routes/sync.tsx"

const app = new Hono()
  .route("/", index)
  .route("/sync", sync)
  .use('/public/*', serveStatic({ root: "./" }))

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on port ${info.port}`)
})
