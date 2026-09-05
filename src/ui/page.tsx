import { raw } from "hono/html"
import type { Child, FC } from "hono/jsx"

type PageProps = {
  title: string
  children?: Child
}

export const Page: FC<PageProps> = ({ title, children }) => {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html data-theme="dark" className="bg-base-200">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.3/bundles/datastar.js"></script>
          <script src="/public/flyonui.js"></script>
          <script src="/public/notyf.js"></script>
          <link rel="stylesheet" href="/public/app.css" />
          <link rel="icon" type="image/png" href="/public/favicon.png"></link>
        </head>
        <body>
          {children}
        </body>
        {/* TODO: Add as client javascript code */}
        <script>{raw(`
          window.notyf = new Notyf({
            duration: 12000,
            position: { x: 'right', y: 'top' },
            dismissible: true,
          });

          document.addEventListener('datastar-fetch', (evt) => {
            const { type, argsRaw } = evt.detail ?? {};
            if (type === 'error') {
              const status = argsRaw?.status;
              notyf.error('Error requesting resource');
            }
            if (type === 'retries-failed') {
              notyf.error('Could not reach the server');
            }
          });
        `)}</script>
      </html>
    </>
  )
}
