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
    action: string,
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

    function renderFields(error: z.ZodError | null) {
        let fieldErrors: Record<string, string | undefined> = error ? z.flattenError(error).fieldErrors : {}
        // TODO: Cant have same id on all forms
        return <div id="form-fields">
            { fields.map(([name, field]) => <ui.Field
                name={name as string}
                field={field}
                error={fieldErrors[name]}
            />) }
        </div>
    }

    function render(params: Record<string, string>, after: Child) {
        return <ui.Form form={form} routeParams={params}>
            { renderFields(null) }
            { after }
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
                // z.object({
                //     roomName: z.string().min(3, { error: "Room name too short" }).max(200, { error: "Room name too long" }),
                // })

                const { success, data, error } = schema.safeParse(body)

                if (!success) {
                    return c.html(renderFields(error), 200)
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
