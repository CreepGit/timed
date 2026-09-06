import { z } from "zod";

// allows localhost urls too, which z.httpUrl() doesn't
const httpUrl = z.string().refine((s) => {
	try {
		return ["http:", "https:"].includes(new URL(s).protocol);
	} catch {
		return false;
	}
}, "Invalid URL");

const envSchema = z.object({
    // url, including http(s)
	PB_HOST: httpUrl,
	// pb credentials, bot user with user.special_category set to "timedbot"
	PB_EMAIL: z.string().min(1),
	PB_PASSWORD: z.string().min(1),
	// url, including http(s)
	PB_TYPEGEN_URL: httpUrl,
	// pb impersonation token
	PB_TYPEGEN_TOKEN: z.string().min(1),
	// sentry provided url, including http(s)
	// ommit to disable
	SENTRY_DSN: httpUrl.optional(),
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
