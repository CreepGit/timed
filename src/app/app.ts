import { Hono } from "hono"

import homeApp from "./routes/home.route.tsx"
import roomApp from "./routes/room.route.tsx"
import syncApp from "./routes/sync.route.tsx"

const appRoutes = new Hono()

appRoutes.route("/", homeApp)
appRoutes.route("/", roomApp)
appRoutes.route("/", syncApp)

export default appRoutes
