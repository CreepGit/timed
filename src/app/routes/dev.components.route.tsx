import { Hono } from 'hono'
import * as view from './dev.components.views.tsx'
import { urls } from '../urls.ts'
import { HTTPException } from 'hono/http-exception'
import * as rad from 'radash'
import { pb, util } from '../../kit.ts'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

const app = new Hono()

const SIGNAL_ID = "xs9tm14yyq5zpxs"

util.page.create({
  route: urls.devComponents.route,
  app,
  pre: undefined,
  data: (ctx) => ({
    signal: util.page.dataOne({
      collection: "tKv",
      id: SIGNAL_ID,
      type: "one",
    }),
  }),
  view: async (ctx) => {
    if (!ctx.data.signal) { throw new HTTPException(404, { message: 'Signal missing' })}
    return <view.ComponentsPage signal={ctx.data.signal} />
  }
})

app.post('/changesignal', async (c) => {
  const newText = rad.uid(
    rad.random(10, 20)
  )
  await pb.collection("tKv").update(SIGNAL_ID, {
    value: JSON.stringify({ text: newText }),
  })
  return c.body(null, 204)
})

app.get('/alwaysfails', async (c) => {
  const options = [
    [500, "Always fails"],
    [404, "What you looking for is not here"],
    [400, "Bad request"],
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [429, "Too many requests"],
    [501, "Not implemented"],
    [503, "Service unavailable"],
  ] as [ContentfulStatusCode, string][]
  const [status, message] = rad.draw(options)!
  throw new HTTPException(status, { message })
})

export default app
