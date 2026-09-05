App/Framework project.
- Hono
- PocketBase
- datastar #context7 at /starfederation/datastar-typescript
- FlyonUI #context7 at /llmstxt/flyonui_llms_txt
- tailwind
- pnpm

src/ - Generic container
- app/ - Core app code goes here
- - routes/
- - - topic.route.tsx - Routes for topic
- - - topic.views.tsx - Views for topic
- - - other.route.tsx - Routes for other topic
- - - other.views.tsx - Views for other topic
- - lib/ - App code
- - app.ts - collects routes as single hono app
- ui/ - Generic components
- util/ - Generic code
- index.ts - Launch point, collects aux routes and app routes for final hono app

Project uses namespacing / barreling heavily.
- src/app/lib/index.ts - Collects all lib functions under lib.*
- src/ui/index.ts - Collects ui components under ui.*
- src/util/index.ts - Same
- src/pb.ts - export new Pocketbase()
- src/kit.ts - Combines lib, ui, util and pb imports

Common usage pattern:
import { pb, lib, ui, util } from '../../kit.ts'

Pocketbase types in src/pocketbase-types.ts, automatically generated with pnpm typegen
