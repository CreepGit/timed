import { pb, lib, ui, util } from '../../kit.ts'
import { Hono } from 'hono'
import { z } from 'zod'
import * as view from './sync.views.tsx'
import { urls } from '../urls.ts'

const app = new Hono()
const MATRIX_ID = "t7gwnl4e9v7zcha"

function formatSignals(values: number[]): { state: boolean[] } {
  return { state: values.map(state => state === 1) }
}

async function fetchSignals(): Promise<{ state: boolean[] }> {
  const record = await pb.collection("timed_kv").getOne(MATRIX_ID)
  const value = record.value as number[]
  return formatSignals(value)
}

util.page.create({
  route: urls.sync.route,
  app,
  pre: undefined,
  data: (ctx) => ({
    signals: util.page.dataOne({
      collection: "timed_kv",
      type: "one",
      id: MATRIX_ID,
    })
  }),
  view: async (ctx) => {
    if (!ctx.data.signals) { return <span>Oopsie...</span> }
    return <view.SyncPage signals={formatSignals(ctx.data.signals.value as number[])} />
  }
})

app.post('/sync/toggle/:i', async (c) => {
  const param = c.req.param('i')
  const i = z.coerce.number().min(0).max(24).parse(param)
  const record = await pb.collection("timed_kv").getOne(MATRIX_ID)
  const value = record.value as number[]
  value[i] = (value[i] === 1) ? 0 : 1
  await pb.collection("timed_kv").update(MATRIX_ID, { value: value })
  return c.body(null, 200)
})

// app.get('/sync/ds/sse', (c) => {
//   return util.streamUpdates(c, {
//     topic: MATRIX_ID,
//     collection: pb.collection("timed_kv"),
//     init: async (stream) => {
//       stream.writeSSE({
//         data: `signals ${JSON.stringify(await fetchSignals())}`,
//         event: "datastar-patch-signals",
//       })
//     },
//     update: async (stream, event) => {
//       stream.writeSSE({
//         data: `signals ${JSON.stringify(formatSignals(event.record.value as number[]))}`,
//         event: "datastar-patch-signals",
//       })
//     }
//   })
// })

export default app
