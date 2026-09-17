import type { Child } from "hono/jsx"
import type { FormField, FormOptions } from "../util/forms.ts"
import { util } from "../kit.ts"

type SubmitProps<TFields extends Record<string, FormField>> = {
    form: FormOptions<TFields>
    children?: Child
}

export const Submit = <TFields extends Record<string, FormField>>({ form, children }: SubmitProps<TFields>) => {
    const ds = util.form.signals(form.id)

    return (
        <button type="submit" className="btn btn-primary relative" data-attr:disabled={`!${ds.canSubmit}`}>
            <span className="transition-opacity duration-330" data-style={`{opacity: ${ds.canSubmit} ? 1 : 0.25}`}>{ children }</span>
            <div className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
                <span className="loading loading-bars" data-show={`!${ds.canSubmit}`}></span>
            </div>
        </button>
    )
}
