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

const app = new Hono()

app.use(sentry(app))
  .route("/", index)
  .route("/sync", sync)
  .get(`/uptime/${env.UPTIME_MONITOR_PATH}`, (c) => c.body(null, 200))
  .use('/public/*', serveStatic({ root: "./" }))

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`${env.NODE_ENV} Port: ${info.port}`)
})
