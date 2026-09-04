import { z } from "zod";

const envSchema = z.object({
    // url, including http(s)
	PB_HOST: z.httpUrl().min(1),
	// pb impersonation token
	PB_TOKEN: z.string().min(1),
	// url, including http(s)
	PB_TYPEGEN_URL: z.httpUrl().min(1),
	// pb impersonation token
	PB_TYPEGEN_TOKEN: z.string().min(1),
	// sentry provided url, including http(s)
	SENTRY_DSN: z.httpUrl().min(1),
    // path for: /uptime/${env.UPTIME_MONITOR_PATH}.
    // cant start or end with a slash
	UPTIME_MONITOR_PATH: z
		.string()
		.min(1)
		.refine(
			(s) => !s.startsWith("/") && !s.endsWith("/"),
			"UPTIME_MONITOR_PATH must not start or end with a slash",
		),
	NODE_ENV: z.enum(["development", "production"]),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	throw new Error(
		`Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
	);
}

export default parsed.data;
