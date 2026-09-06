import * as Sentry from "@sentry/hono/node";

// import env from "./env.ts";
// Attempt to boot sentry even before env is loaded

const dsn = process.env.SENTRY_DSN || undefined
const nodeEnv = process.env.NODE_ENV || "development"

Sentry.init({
  dsn,
  tracesSampleRate: 0.01,
  environment: nodeEnv,
});

export default Sentry;
