import { raw } from "hono/html"
import type { Child, FC } from "hono/jsx"
import env from "../env.ts"

type PageProps = {
  title: string
  children?: Child
}

export const Page: FC<PageProps> = ({ title, children }) => {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html className="bg-base-200" data-class="{ offline: $_isOffline }">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.3/bundles/datastar.js"></script>
          <script src="/public/flyonui.js"></script>
          <script src="/public/notyf.js"></script>
          <link rel="stylesheet" href="/public/app.css" />
          <link rel="icon" type="image/png" href="/public/favicon.png"></link>
          <script defer src="/public/notyfsetup.js"></script>
          <script type="speculationrules">{raw(`{"prefetch":[{"where":{"href_matches":"/*"},"eagerness":"moderate"}]}`)}</script>
          {/* <script>{raw(`window.prewarm = (url) => {fetch(url, {credentials: "include"}).then(res => res.text()).catch(err => {});}`)}</script> */}
        </head>
        <body
          data-signals="{ _isOffline: false }"
          data-on:connectivity="$_isOffline = evt.detail.offline"
          data-effect="
            if ($_isOffline) {
              window.offlineToast ??= window.notyfStatus.error({
                message: 'Connection lost',
                duration: 0,
                dismissible: false,
                position: { x: 'center', y: 'top' },
                icon: { className: 'icon-[tabler--wifi-off]', tag: 'span', text: '' }
              });
            } else if (window.offlineToast) {
              window.notyfStatus.dismiss(window.offlineToast);
              window.offlineToast = undefined;
            }"
          >
          {children}
          <div id="overlay-backdrop-root" data-ignore-morph data-ignore></div>
          <div id="notyf-toast-root" data-ignore-morph data-ignore></div>
          {env.NODE_ENV == "development" && <div style={{ maxWidth: '1600px', margin: '0 auto' }} className="p-4">
            <div data-ignore-morph className="card m-4 p-2">
              <pre className="text-xs" data-json-signals></pre>
            </div>
          </div>}
          <script defer src="/public/status.js"></script>
        </body>
      </html>
    </>
  )
}
