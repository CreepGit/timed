import { Hono } from "hono"
import env from "../env.ts"

import homeApp from "./routes/home.route.tsx"
import roomApp from "./routes/room.route.tsx"
import syncApp from "./routes/sync.route.tsx"
import devApp from "./routes/dev.components.route.tsx"

const appRoutes = new Hono()

appRoutes.route("/", homeApp)
appRoutes.route("/", roomApp)
appRoutes.route("/", syncApp)

if (env.NODE_ENV == "development") {
    appRoutes.route("/", devApp)
}

export default appRoutes
