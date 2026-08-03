import { serve } from "@hono/node-server"
import { app } from "./app.tsx"
import env from "./env.ts"
import { checkConnection, checkSchema } from "./db.ts"

// Both checks run before the port opens, so a misconfigured deploy fails with an
// explanation instead of serving pages that break on their first write.
try {
  await checkConnection()
  await checkSchema()
} catch (error) {
  console.error("\nCannot start:\n")
  console.error(error instanceof Error ? error.message : error)
  console.error("")
  process.exit(1)
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`timed listening on http://localhost:${info.port}`)
})
