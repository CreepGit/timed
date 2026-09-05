import type { Child, FC } from "hono/jsx"

import type { FormField, FormObject, FormOptions } from "../util/forms.ts"

type FieldProps = {
    name: string
    field: FormField
    error: string | undefined
}

export const Field: FC<FieldProps> = ({ name, field, error }) => {
    const errorClass = error ? "is-invalid" : ""
    return (
        <div className="mb-1">
            <label className="label-text" htmlFor={name}>{field.label}</label>
            <div className={`input ${errorClass} flex items-center gap-2`}>
                <span className={`${field.icon}`}></span>
                <input id={name} name={name} type={field.type} placeholder={field.placeholder} className="grow" required />
            </div>
            <span className="text-error">{error}</span>
        </div>
    )
}
