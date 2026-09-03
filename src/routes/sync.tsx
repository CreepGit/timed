import { Hono } from 'hono'
import { Page } from '../components/page.tsx'
import { pb } from '../pb.ts'
import { streamSSE } from 'hono/streaming'

const app = new Hono()

const MATRIX_ID = "t7gwnl4e9v7zcha"
const data = await pb.collection("timed_kv").getOne(MATRIX_ID)
const startValue = data.value as number[]
// in json array format
// [0, 0, 0, 0, 0 ...] 25 numbers

function createMatrix(value: number[]) {
  return <div
    className="grid grid-cols-5 gap-2 w-fit"
    id="input-matrix"
    >
    {value.map((state, i) => <input
      type="checkbox"
      className="checkbox checkbox-xs"
      checked={state === 1}
      autocomplete="off"
      data-on:click={`@post('/sync/toggle/${i}')`}
    />)}
  </div>
}
const page = <Page title="Timed">
  <div
    style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}
    data-init="@get('/sync/ds/sse')"
    >
    <p>Sync App (<a href="/" className="link link-primary">back</a>)</p>
    <div className="divider"></div>
    {createMatrix(startValue)}
  </div>
</Page>

app.get('/', (c) => {
    return c.html(page)
})

app.post('/toggle/:i', async (c) => {
  const i = Number(c.req.param('i'))
  if (i < 0 || i >= 25) return;
  const record = await pb.collection("timed_kv").getOne(MATRIX_ID)
  const value = [...(record.value as number[])]
  value[i] = (value[i] === 1) ? 0 : 1
  await pb.collection("timed_kv").update(MATRIX_ID, { value: value })
  return c.body(null, 200)
})

app.get('/ds/sse', (c) => {
  return streamSSE(c, async (stream) => {
    const stallUntilAbort = new Promise<void>((resolve) => {
      stream.onAbort(() => {
        resolve()
      })
    })
    const unsubscribe = await pb.collection("timed_kv").subscribe(MATRIX_ID, (event) => {
      const value = event.record.value as number[]
      stream.writeSSE({
        data: `elements ${createMatrix(value)}`,
        event: "datastar-patch-elements",
      })
    })
    await stallUntilAbort
  })
})

export default app
