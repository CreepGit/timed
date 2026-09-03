import * as Sentry from "@sentry/hono/node";
import env from "./env.ts";

Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 0.01,
  environment: env.NODE_ENV,
});
