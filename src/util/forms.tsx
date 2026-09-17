import type { Context, Hono, } from "hono"
import { z } from "zod"
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
    fields: Fields
    app: Hono
    handler: (c: Context, data: {
        [K in keyof Fields]: FieldTypeToType[Fields[K]["type"]]
    }) => Promise<Response>
}

export type FieldTypeToType = {
    text: string
    testBoolean: boolean
}

// Minimum form throttle
export const COOLDOWN_MS = 2000

export function signals(id: string) {
    const root = `_forms.${id}`
    const path = {
        root,
        errors: `${root}.errors`,
        cooldown: `${root}._cooldown`,
        transit: `${root}._transit`,
        canSubmit: `${root}._canSubmit`,
    }
    return {
        path,
        errors: `$${path.errors}`,
        cooldown: `$${path.cooldown}`,
        transit: `$${path.transit}`,
        canSubmit: `$${path.canSubmit}`,
    }
}

export function create<const TFields extends Record<string, FormField>>(form: FormOptions<TFields>): FormOptions<TFields> {
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
            // _forms.formId.errors.fieldName = ['error message', ]
            _forms: z.record(
                z.string(),
                z.object({
                    errors: z.record(
                        z.string(),
                        z.array(z.string())
                    ),
                })
            )
        })

        if (!success) {
            const fieldErrors = (error ? z.flattenError(error).fieldErrors : {})
            return c.json(signalSchema.parse({
                _forms: {
                    [form.id]: {
                        errors: {
                            ...clearErrorObj,
                            ...fieldErrors,
                        }
                    },
                }
            }))
        }

        if (!await nonce.validate(data._token, form.id)) {
            return c.json(signalSchema.parse({
                _forms: {
                    [form.id]: {
                        errors: {
                            ...clearErrorObj,
                            _token: ["Could not validate form. Refresh the page and try again."],
                        }
                    }
                }
            }))
        }

        await nonce.spend(data._token)

        return await form.handler(c, data as any) // TODO: FIX
    })

    return form
}
