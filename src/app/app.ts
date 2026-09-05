import { Hono } from "hono"

import homeApp from "./routes/home.route.tsx"
import roomApp from "./routes/room.route.tsx"
import syncApp from "./routes/sync.route.tsx"

const appRoutes = new Hono()

appRoutes.route("/", homeApp)
appRoutes.route("/", roomApp)
appRoutes.route("/", syncApp)

// for (const [_, route] of Object.entries(appRoutes.routes)) {
//     console.log(route.method.padEnd(4), route.path)
// }

export default appRoutes
