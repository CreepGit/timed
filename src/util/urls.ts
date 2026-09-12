import type { z } from "zod"

export type UrlString = string & {__brand: "url"}
type defineConfig = Record<string, {
    route: string
    params?: z.ZodObject
}>
export type Url = {
    route: UrlString
    params?: z.ZodObject
}
type Urls<T extends defineConfig> = { [K in keyof T]: Omit<T[K], "route"> & { route: T[K]["route"] & UrlString } }

export function define<const T extends defineConfig>(config: T): Urls<T> {
    return config as unknown as Urls<T>
}
