import type { Child, FC } from "hono/jsx"

import type { FormField, FormObject, FormOptions } from "../util/forms.ts"

type FieldProps = {
    name: string
    field: FormField
    errorVariable: string
}

export const Field: FC<FieldProps> = ({ name, field, errorVariable }) => {
    return (
        <div className="mb-1">
            <label className="label-text" htmlFor={name}>{field.label}</label>
            <div
                className="input flex items-center gap-2"
                data-class:is-invalid={errorVariable}
                >
                <span className={`${field.icon}`}></span>
                <input
                    id={name}
                    name={name}
                    type={field.type}
                    placeholder={field.placeholder}
                    className="grow"
                    autocomplete="off"
                    // required
                    />
            </div>
            <span className="text-error" data-text={`${errorVariable}.join(", ") || ""`}></span>
        </div>
    )
}
