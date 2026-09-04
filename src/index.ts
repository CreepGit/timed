import { EventSource } from "eventsource"
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { sentry } from "@sentry/hono/node"
import { serveStatic } from "@hono/node-server/serve-static"
import env from "./env.ts"

import "./sentry.ts";

// Polyfill
Object.assign(globalThis, { EventSource })

// Routes
import index from "./routes/home.tsx"
import sync from "./routes/sync.tsx"
import room from "./routes/room.tsx"

const app = new Hono()

app.use(sentry(app))
  .route("/", index)
  .route("/sync", sync)
  .route("/room", room)
  .get(`/uptime/${env.UPTIME_MONITOR_PATH}`, (c) => c.body(null, 200))
  .use('/public/flyonui.js', serveStatic({ path: './node_modules/flyonui/flyonui.js' }))
  .use('/public/notyf.js', serveStatic({ path: './node_modules/notyf/notyf.min.js' }))
  .use('/public/*', serveStatic({ root: "./" }))

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`${env.NODE_ENV} Port: ${info.port}`)
})
