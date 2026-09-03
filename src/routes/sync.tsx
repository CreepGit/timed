import { Hono } from 'hono'
import { Page } from '../components/page.tsx'
import { pb } from '../pb.ts'
import streamUpdates from '../utils/streamUpdates.ts'
import { z } from 'zod'

const app = new Hono()
const MATRIX_ID = "t7gwnl4e9v7zcha"

function formatSignals(values: number[]): { [key: string]: boolean } {
  return Object.fromEntries(values.map((state, i) => [`v${i+1}`, state === 1]))
}

async function getSignals(): Promise<{ [key: string]: boolean }> {
  const record = await pb.collection("timed_kv").getOne(MATRIX_ID)
  const value = record.value as number[]
  return formatSignals(value)
}

app.get('/', async (c) => {
  const signals = await getSignals()

  const matrix = <div
    className="grid grid-cols-5 gap-2 w-fit"
    id="input-matrix"
    >
    {Array(25).fill(0).map((_, i) => <input
      type="checkbox"
      className="checkbox checkbox-xs"
      autocomplete="off"
      data-on:click={`@post('/sync/toggle/${i}')`}
      data-bind={`v${i+1}`}
      checked={signals[`v${i+1}`]}
    />)}
  </div>

  const page = <Page title="Timed">
    <div
      style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}
      data-init="@get('/sync/ds/sse')"
      data-signals={JSON.stringify(signals)}
      >
 
      <p>Sync App (<a href="/" className="link link-primary">back</a>)</p>
      <div className="divider"></div>
      {matrix}
    </div>
  </Page>
  
  return c.html(page)
})

app.post('/toggle/:i', async (c) => {
  const param = c.req.param('i')
  const i = z.number().min(0).max(24).parse(param)
  const record = await pb.collection("timed_kv").getOne(MATRIX_ID)
  const value = record.value as number[]
  value[i] = (value[i] === 1) ? 0 : 1
  await pb.collection("timed_kv").update(MATRIX_ID, { value: value })
  return c.body(null, 200)
})

app.get('/ds/sse', (c) => {
  return streamUpdates(c, {
    topic: MATRIX_ID,
    collection: pb.collection("timed_kv"),
    init: async (stream) => {
      stream.writeSSE({
        data: `signals ${JSON.stringify(await getSignals())}`,
        event: "datastar-patch-signals",
      })
    },
    update: async (stream, event) => {
      stream.writeSSE({
        data: `signals ${JSON.stringify(formatSignals(event.record.value as number[]))}`,
        event: "datastar-patch-signals",
      })
    }
  })
})

export default app
