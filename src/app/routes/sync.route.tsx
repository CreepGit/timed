import { pb, lib, ui, util } from '../../kit.ts'
import { Hono } from 'hono'
import { z } from 'zod'
import * as view from './sync.views.tsx'
import { urls } from '../urls.ts'

const app = new Hono()
const MATRIX_ID = "t7gwnl4e9v7zcha"

util.page.create({
  route: urls.sync.route,
  app,
  pre: undefined,
  data: (ctx) => ({
    signals: util.page.dataOne({
      collection: "tKv",
      type: "one",
      id: MATRIX_ID,
    })
  }),
  view: async (ctx) => {
    if (!ctx.data.signals) { return <span>Oopsie...</span> }
    
    const signalArray = ctx.data.signals.value as number[]
    return <view.SyncPage signals={signalArray} />
  }
})

app.post('/sync/toggle/:i', async (c) => {
  const param = c.req.param('i')
  const i = z.coerce.number().min(0).max(24).parse(param)
  const record = await pb.collection("tKv").getOne(MATRIX_ID)
  const value = record.value as number[]
  value[i] = (value[i] === 1) ? 0 : 1
  await pb.collection("tKv").update(MATRIX_ID, { value: value })
  return c.body(null, 200)
})

export default app
