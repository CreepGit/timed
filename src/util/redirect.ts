import { streamSSE } from "hono/streaming"
import type { Context } from "hono"

/*
 * Fixes data-star's redirection. https://data-star.dev/how_tos/redirect_the_page_from_the_backend
 */
export function redirect<T extends Context>(c: T, url: string) {
    return streamSSE(c, async (stream) => {
        await stream.writeSSE({
            event: "datastar-patch-elements",
            data: [
                "mode append",
                "selector body",
                `elements <script data-effect="el.remove()">setTimeout(() => window.location.href = ${JSON.stringify(url)})</script>`,
            ].join("\n"),
        })
    })
}
