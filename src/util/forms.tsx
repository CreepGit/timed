import type { Context, Hono, } from "hono"
import type { Child, JSX } from "hono/jsx"
import { z } from "zod"
import { ui } from "../kit.ts"

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

export type FormOptions = {
    id: string
    action: string
    fields: Record<string, FormField>
}

export type FieldTypeToType = {
    text: string
    testBoolean: boolean
}

export type FormObject<TOpts extends FormOptions> = {
    addHandler: (
        app: Hono,
        onSuccess: (c: Context, data: {
            [K in keyof TOpts["fields"]]: FieldTypeToType[TOpts["fields"][K]["type"]]
        }) => Promise<Response>
    ) => void,
    fields: [keyof TOpts["fields"], FormField][],
    render: (params: Record<string, string>, after: Child) => Child
} & TOpts

export function create<const TOpts extends FormOptions>(form: TOpts): FormObject<TOpts> {
    const fields = Object.entries(form.fields) as [string, FormField][]

    function render(params: Record<string, string>, after: Child) {
        return <ui.Form form={form} routeParams={params}>
            <div>
                {fields.map(([name, field]) => <ui.Field
                    name={name as string}
                    field={field}
                    errorVariable={`$_forms.${form.id}?.${name}`}
                />)}
            </div>
            {after}
        </ui.Form>
    }

    return {
        ...form,
        addHandler: (app: Hono, onSuccess) => {
            app.post(form.action, async (c) => {
                const body = await c.req.parseBody()
                const schemaObject = Object.fromEntries(
                    Object.entries(form.fields).map(([fieldName, field]) => [fieldName, field.schema])
                )
                const schema = z.object(schemaObject)
                const { success, data, error } = schema.safeParse(body)

                if (!success) {
                    const fieldErrors = (error ? z.flattenError(error).fieldErrors : {}) as Record<string, string | undefined>
                    return c.json({
                        _forms: {
                            [form.id]: fieldErrors,
                        }
                    })
                }
                if (data == undefined) {
                    return c.html(<div>Missing data</div>, 200)
                }
                return await onSuccess(c, data as any) // TODO: FIX
            })
        },
        render: render,
        fields,
    }
}
