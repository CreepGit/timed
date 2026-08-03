import type { FC } from "hono/jsx"
import { Layout } from "./layout.tsx"

export type ErrorViewProps = {
  title: string
  message: string
}

export const ErrorView: FC<ErrorViewProps> = ({ title, message }) => (
  <Layout title={`${title} · timed`} narrow>
    <div class="stack stack--lg">
      <div class="stack stack--sm">
        <h1>{title}</h1>
        <p class="muted">{message}</p>
      </div>
      <div>
        <a class="btn" href="/">
          Back to start
        </a>
      </div>
    </div>
  </Layout>
)
