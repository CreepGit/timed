import type { Context, Hono, } from "hono"
import type { Child } from "hono/jsx"
import { z } from "zod"
import { env, ui } from "../kit.ts"
import * as nonce from "./nonceToken.ts"
import * as rad from "radash"

export type FormFieldText = {
    type: "text"
    label: string
    placeholder: string
    icon: string
    schema: z.ZodString
}

export type FormFieldTEST = {
    type: "testBoolean"
    label: string
    placeholder: string
    icon: string
    schema: z.ZodBoolean
}

export type FormField = FormFieldText | FormFieldTEST

export type FormOptions<Fields extends Record<string, FormField>> = {
    id: string
    action: string
    fields: Record<string, FormField>
    app: Hono
    handler: (c: Context, data: {
        [K in keyof Fields]: FieldTypeToType[Fields[K]["type"]]
    }) => Promise<Response>
}

export type FieldTypeToType = {
    text: string
    testBoolean: boolean
}

export function create<const TOpts extends FormOptions<TOpts["fields"]>>(form: TOpts): FormOptions<TOpts["fields"]> {
    form.app.post(form.action, async (c) => {
        const body = await c.req.parseBody()
        const schemaObject = rad.mapEntries(form.fields, (name,field) => [name, field.schema])

        const schema = z.object({
            ...schemaObject,
            _token: z.string().nonempty({ message: "FORM_TOKEN_MISSING" }),
        })

        const { success, data, error } = schema.safeParse(body)

        // { fieldName: [] }
        const clearErrorObj = rad.mapEntries(form.fields, (name, field) => [name, []] as [string, never[]])

        const signalSchema = z.object({
            _forms: z.record(
                z.string(),
                z.record(
                    z.string(),
                    z.array(z.string())
                ))
        })

        if (!success) {
            const fieldErrors = (error ? z.flattenError(error).fieldErrors : {})
            return c.json(signalSchema.parse({
                _forms: {
                    [form.id]: {
                        ...clearErrorObj,
                        ...fieldErrors,
                    },
                }
            }))
        }

        if (!await nonce.validate(data._token, form.id)) {
            return c.json(signalSchema.parse({
                _forms: {
                    [form.id]: {
                        ...clearErrorObj,
                        _token: ["Could not validate form. Refresh the page and try again."],
                    }
                }
            }))
        }

        await nonce.spend(data._token)

        return await form.handler(c, data as any) // TODO: FIX
    })

    return form
}
