
const PB_HOST = process.env.PB_HOST || null
const PB_TOKEN = process.env.PB_TOKEN || null

const PB_TYPEGEN_URL = process.env.PB_TYPEGEN_URL || null
const PB_TYPEGEN_TOKEN = process.env.PB_TYPEGEN_TOKEN || null

if (PB_HOST === null) {
    throw new Error("PB_HOST is not set")
}

if (PB_TOKEN === null) {
    throw new Error("PB_TOKEN is not set")
}

if (PB_TYPEGEN_URL === null) {
    throw new Error("PB_TYPEGEN_URL is not set")
}

if (PB_TYPEGEN_TOKEN === null) {
    throw new Error("PB_TYPEGEN_TOKEN is not set")
}

export default {
    PB_HOST,
    PB_TOKEN,
    PB_TYPEGEN_URL,
    PB_TYPEGEN_TOKEN,
}
