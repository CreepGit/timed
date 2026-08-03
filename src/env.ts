
const PB_HOST = process.env.PB_HOST || null

if (PB_HOST === null) {
    throw new Error("PB_HOST is not set")
}

export default {
    PB_HOST,
}
