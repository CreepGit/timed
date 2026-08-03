/*
 * Static assets, read once at startup and served from our own origin.
 *
 * Nothing here is compiled at runtime. The previous setup pulled Tailwind's
 * browser build from a CDN, which generates styles by scanning the DOM it finds
 * at load time -- so any class name that arrived later in an SSE patch was never
 * given a rule and rendered unstyled. Plain CSS has no such failure mode.
 */

import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

export type Asset = {
  /** Path the app serves this on. */
  path: string
  /** Content hash, used to tell a cacheable request from a bare one. */
  digest: string
  /** Path with the hash attached, safe to cache forever. */
  url: string
  body: Buffer
  contentType: string
}

function load(path: string, file: string, contentType: string): Asset {
  const body = readFileSync(new URL(file, import.meta.url))
  const digest = createHash("sha256").update(body).digest("base64url").slice(0, 10)
  return { path, digest, url: `${path}?v=${digest}`, body, contentType }
}

export const STYLES = load("/styles.css", "./styles.css", "text/css; charset=utf-8")

/** Vendored so the app has no third-party runtime dependency. See README. */
export const DATASTAR = load("/datastar.js", "./vendor/datastar.js", "text/javascript; charset=utf-8")

export const ASSETS: Asset[] = [STYLES, DATASTAR]
