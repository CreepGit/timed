import { EventSource } from "eventsource"
import { readdirSync } from "node:fs"
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { sentry } from "@sentry/hono/node"
import { serveStatic } from "@hono/node-server/serve-static"
import env from "./env.ts"

import "./sentry.ts";

// Polyfill
Object.assign(globalThis, { EventSource })

const app = new Hono()

app.use(sentry(app))

// TODO: Find a better solution
// Automatically mount all routes on server restart, not automagic
const routeFiles = readdirSync(new URL("./app/routes/", import.meta.url))
  .filter((file) => /\.route\.(ts|tsx|js)$/.test(file))
  .sort()

for (const file of routeFiles) {
  const name = file.replace(/\.route\.(ts|tsx|js)$/, "")
  const { default: route } = await import(`./app/routes/${file}`)
  app.route(name === "home" ? "/" : `/${name}`, route)
}

app
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
