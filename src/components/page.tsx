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
      <html data-theme="dracula">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
          <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
          <link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" type="text/css" />
          <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"></script>
        </head>
        <body>
          {children}
        </body>
      </html>
    </>
  )
}
