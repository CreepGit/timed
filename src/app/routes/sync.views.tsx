import { pb, lib, ui, util } from '../../kit.ts'
import type { FC } from 'hono/jsx'

type SyncPageProps = {
  signals: { state: boolean[] }
}

export const SyncPage: FC<SyncPageProps> = ({ signals }) => {
  const matrix = <div
    className="grid grid-cols-5 gap-2 w-fit"
    id="input-matrix"
    >
    {Array(25).fill(0).map((_zero, i) => <input
      type="checkbox"
      className="checkbox checkbox-xs"
      autocomplete="off"
      data-on:click__prevent={`@post('/sync/toggle/${i}')`}
      data-bind={`state.${i}`}
      checked={signals.state[i]}
    />)}
  </div>

  return <ui.Page title="Timed">
    <div
      style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}
      data-init="@get('/sync/ds/sse')"
      data-signals={JSON.stringify(signals)}
      >

      <p>Sync (<a href="/" className="link link-accent link-animated">back</a>)</p>
      <div className="divider py-5"></div>
      {matrix}
    </div>
  </ui.Page>
}
