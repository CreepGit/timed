
const VARIABLES = {
    PB_HOST: true,
    PB_TOKEN: true,
    PB_TYPEGEN_URL: true,
    PB_TYPEGEN_TOKEN: true,
} as const

const misings = []

for (const [key, required] of Object.entries(VARIABLES)) {
    if (required && !process.env[key]) {
        misings.push(key);
    }
}

if (misings.length > 0) {
    throw new Error(`Missing required environment variables: ${misings.join(", ")}`);
}

export default process.env as Record<keyof typeof VARIABLES, string>;
