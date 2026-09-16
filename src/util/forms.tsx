import type { Context, Hono, } from "hono"
import type { Child, JSX } from "hono/jsx"
import { z } from "zod"
import { env, ui } from "../kit.ts"
import * as nonce from "./nonceToken.ts"

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

export type FormObject<TOpts extends FormOptions<TOpts["fields"]>> = {
    fields: [keyof TOpts["fields"], FormField][],
    render: (params: Record<string, string>, after: Child) => Child
} & TOpts

export function create<const TOpts extends FormOptions<TOpts["fields"]>>(form: TOpts): FormObject<TOpts> {
    const fields = Object.entries(form.fields) as [string, FormField][]

    form.app.post(form.action, async (c) => {
        const body = await c.req.parseBody()
        const schemaObject = Object.fromEntries(
            Object.entries(form.fields).map(([fieldName, field]) => [fieldName, field.schema])
        )

        const schema = z.object({
            ...schemaObject,
            _token: z.string().nonempty({ message: "FORM_TOKEN_MISSING" }),
        })

        const { success, data, error } = schema.safeParse(body)

        // { fieldName: [] }
        const clearErrorObj = Object.fromEntries(Object.entries(form.fields).map(([fieldName, field]) => {
            return [fieldName, []]
        }))

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

    async function render(params: Record<string, string>, after: Child) {
        // TODO: This creates a token on every SSE patch, though it's not overwritten on client
        //   so client doesn't care. It's just wasteful to do so.
        const NONCE_EXPIRE_SECONDS = 10 * 60 * 60 // 10 hours
        const nonceToken = await nonce.create(NONCE_EXPIRE_SECONDS, form.id)
        const nonceKey = `_${form.id}-nonce`.replaceAll("-", "_")
        const nonceObj = JSON.stringify({ [nonceKey]: nonceToken })

        const emptyFormFields = fields.reduce((acc, [name, field]) => {
                acc[name] = []
                return acc
            },
            {} as Record<string, never[]>
        )
        const formSignals = JSON.stringify({
            _forms: {
                [form.id]: {
                    ...emptyFormFields,
                    _token: [],
                }
            }
        })
        return <ui.Form
            form={form}
            routeParams={params}>
            <div
                data-signals__ifmissing={formSignals}
                className="hidden"
                ></div>
            <input
                data-ignore-morph
                data-signals__ifmissing={nonceObj}
                data-attr:value={`$${nonceKey}`}
                type="hidden"
                name="_token"
                />
            {env.NODE_ENV == "development" && <div className="inline-flex gap-2 flex-wrap">
                <span className="badge badge-soft badge-info cursor-help" title="Debug: Value of nonce key">
                    <span className="icon-[tabler--eye-code]"></span>
                    <span data-text={`$${nonceKey}`}></span>
                </span>
            </div>}
            <div>
                {fields.map(([name, field]) => <ui.Field
                    name={name as string}
                    field={field}
                    errorVariable={`$_forms.${form.id}?.${name}`}
                />)}
            </div>
            <div
                className="alert alert-soft alert-error flex items-center gap-4"
                role="alert"
                data-show={`$_forms.${form.id}?._token.length`}
                >
                <span className="icon-[tabler--alert-circle] shrink-0 size-6"></span>
                <p data-text={`$_forms.${form.id}?._token.join(", ") || ""`}></p>
            </div>
            {after}
        </ui.Form>
    }

    return {
        ...form,
        render: render,
        fields,
    }
}
