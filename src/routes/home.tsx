import { Hono } from 'hono'
import { Page } from '../components/page.tsx'

const app = new Hono()

const page = <Page title="Timed">
  <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
    <p>Hello world</p>
    <a href="/sync" className="link link-primary">Sync</a>
  </div>
</Page>

app.get('/', (c) => {
    return c.html(page)
})

export default app
