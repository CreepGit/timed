import { raw } from "hono/html"
import type { Child, FC } from "hono/jsx"
import { DATASTAR, STYLES } from "../assets.ts"

type LayoutProps = {
  title: string
  /** Rendered at the right of the header, e.g. the live-connection indicator. */
  headerAside?: Child
  narrow?: boolean
  children?: Child
}

export const Layout: FC<LayoutProps> = ({ title, headerAside, narrow, children }) => (
  <>
    {raw("<!doctype html>")}
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        <meta name="description" content="Find a date that works for everyone." />
        <title>{title}</title>
        <link rel="stylesheet" href={STYLES.url} />
        <script type="module" src={DATASTAR.url}></script>
      </head>
      <body>
        <div class={narrow ? "shell shell--narrow" : "shell"}>
          <header class="row row--between" style="margin-bottom:1.5rem">
            <a class="brand" href="/">
              <span class="brand__dot"></span>
              timed
            </a>
            {headerAside}
          </header>
          {children}
        </div>
      </body>
    </html>
  </>
)
