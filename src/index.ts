// has side effects
import Sentry from "./sentry.ts";

import { EventSource } from "eventsource"
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { sentry } from "@sentry/hono/node"
import { serveStatic } from "@hono/node-server/serve-static"
import env from "./env.ts"
import appRoutes from "./app/app.ts"
import { ClientResponseError } from "pocketbase";

// Polyfill
Object.assign(globalThis, { EventSource })

export const app = new Hono()

app.use(sentry(app))
app
  .get(`/uptime/${env.UPTIME_MONITOR_PATH}`, (c) => c.body(null, 200))
  .use('/public/flyonui.js', serveStatic({ path: './node_modules/flyonui/flyonui.js' }))
  .use('/public/notyf.js', serveStatic({ path: './node_modules/notyf/notyf.min.js' }))
  .use('/public/*', serveStatic({ root: "./" }))
  .route("/", appRoutes)
  .onError(async (e, c) => {
    if (e instanceof ClientResponseError) {
      return c.text(e.response.message || "Not Found", 404)
    }
    Sentry.captureException(e, {
      extra: {
        url: c.req.url,
      }
    })
    return c.text("Internal Server Error", 500)
  })

if (process.env.IS_TESTING == undefined) {
  serve({
    fetch: app.fetch,
    port: 3000
  }, (info) => {
    console.log(`${env.NODE_ENV} Port: ${info.port}`)
  })
} else {
  console.log("Running tests...")
}
