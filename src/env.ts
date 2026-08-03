/*
 * Configuration the server needs to start.
 *
 * PB_TYPEGEN_URL and PB_TYPEGEN_TOKEN are deliberately absent: they belong to
 * the `pnpm typegen` CLI, which reads .env itself, and requiring them here meant
 * the server refused to boot over a codegen-only setting.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`)
  }
  return value
}

function port(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a port number, got "${raw}".`)
  }
  return value
}

export default {
  /** PocketBase base URL, e.g. https://pbdb.example.com */
  PB_HOST: required("PB_HOST"),
  /** Superuser token. Every read and write this app makes uses it. */
  PB_TOKEN: required("PB_TOKEN"),
  PORT: port("PORT", 3000),
}
