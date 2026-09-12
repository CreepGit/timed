// has side effects
import Sentry from "./sentry.ts";

import { EventSource } from "eventsource"
import { serve } from '@hono/node-server'
import { Context, Hono } from 'hono'
import { sentry } from "@sentry/hono/node"
import { serveStatic } from "@hono/node-server/serve-static"
import env from "./env.ts"
import appRoutes from "./app/app.ts"
import { ClientResponseError } from "pocketbase";
import { HTTPException } from "hono/http-exception";

// Polyfill
Object.assign(globalThis, { EventSource })

export const app = new Hono()

function notFound(c: Context<any>, error: Error | null) {
  console.log(`Not found: ${c.req.url}`)
  return c.text("Not Found", 404)
}

app.use(sentry(app))
app
  .get(`/uptime/${env.UPTIME_MONITOR_PATH}`, (c) => c.body(null, 200))
  .get('/health', (c) => c.body(null, 200))
  .use('/public/flyonui.js', serveStatic({ path: './node_modules/flyonui/flyonui.js' }))
  .use('/public/notyf.js', serveStatic({ path: './node_modules/notyf/notyf.min.js' }))
  .use('/public/*', serveStatic({ root: "./" }))
  .route("/", appRoutes)
  .onError(async (e, c) => {
    if (e instanceof ClientResponseError) {
      // Pocketbase
      console.error(e)
      return c.text("PocketBase: " + e.response.message || "Not Found", 404)
    }

    if (e instanceof HTTPException) {
      // Manual 404 throw
      if (e.status == 404) {
        return notFound(c, e)
      } else if ([401, 403].includes(e.status)) {
        return c.text("Your fault!", e.status)
      }
    }
    // Unhandled exception
    Sentry.captureException(e, { extra: { url: c.req.url }})
    console.error(e)
    return c.text("Internal Server Error", 500)
  })
  .notFound((c) => notFound(c, null))

if (process.env.IS_TESTING == undefined) {
  serve({
    fetch: app.fetch,
    port: 3000,
    hostname: "127.0.0.1",
  }, (info) => {
    console.log(`${env.NODE_ENV} Port: ${info.port}`)
  })
} else {
  console.log("Running tests...")
}
