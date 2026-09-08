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
      <html data-theme="dark" className="bg-base-200" data-class="{ offline: $isOffline }">
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
        <body
          data-signals="{ isOffline: false, _pendingOffline: false }"
          data-init="window.notyf = new Notyf({
            duration: 12000,
            position: { x: 'right', y: 'top' },
            dismissible: true,
          });
          window.notyfStatus = new Notyf({})"
          data-on:datastar-fetch="
            const badEvent = ['retrying', 'retries-failed'];
            const goodEvent = ['finished', 'datastar-patch-signals', 'datastar-patch-elements']
            // console.log(evt.detail)
            // Types: started, finished, error, retrying, retries-failed
            if (badEvent.includes(evt.detail.type)) {
              $_pendingOffline = true;
              setTimeout(() => {
                if ($_pendingOffline) { $isOffline = true; }
              }, 1500)
            };
            if (goodEvent.includes(evt.detail.type)) {
              $_pendingOffline = false;
              $isOffline = false;
            }
            
            if (evt.detail.type === 'error') {
              window.notyf.error(`Error requesting resource (${evt.detail.argsRaw?.status || 'unknown'})`);
            }
            "
          data-effect="
            if ($isOffline == undefined) return;
            if ($isOffline) {
              if (window.offlineToast == undefined) {
                window.offlineToast = window.notyfStatus.error({
                  message: 'Connection lost', 
                  duration: 0,
                  dismissible: false,
                  position: { x: 'center', y: 'top' },
                  icon: { className: 'icon-[tabler--wifi-off]', tag: 'span', text: '' }
                });
              }
            } else {
              if (window.offlineToast) window.notyfStatus.dismiss(window.offlineToast);
              window.offlineToast = undefined;
            }"
          >
          {/* <pre data-text="'$isOffline: ' + $isOffline + '\n$_pendingOffline: ' + $_pendingOffline" className="fixed top-0 left-0 text-error"></pre> */}
          {children}
        </body>
        {/* TODO: Add as client javascript code */}
      </html>
    </>
  )
}
