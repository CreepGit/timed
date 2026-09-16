import { pb, lib, ui, util } from '../../kit.ts'
import type { FC } from 'hono/jsx'
import * as rad from 'radash'

type SyncPageProps = {
  signals: number[]
}

export const SyncPage: FC<SyncPageProps> = ({ signals }) => {
  const matrix = <div
    className="grid grid-cols-5 gap-2 w-fit"
    id="input-matrix"
    >
    {rad.list(0, 24, i => <input
      type="checkbox"
      className="checkbox checkbox-xs"
      autocomplete="off"
      data-on:click__prevent={`@post('/sync/toggle/${i}')`}
      checked={signals[i] == 1}
    />)}
  </div>

  return <ui.Page title="Timed">
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <p>Sync (<a href="/" className="link link-accent link-animated">back</a>)</p>
      <div className="divider py-5"></div>
      {matrix}
    </div>
  </ui.Page>
}
