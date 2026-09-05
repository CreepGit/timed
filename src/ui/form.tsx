import type { Child } from "hono/jsx"

import type { FormObject, FormOptions } from "../util/forms.ts"

type FormProps<TOpts extends FormOptions> = {
    form: FormObject<TOpts> | FormOptions
    children?: Child
    routeParams?: Record<string, string>
}

export const Form = <TOpts extends FormOptions>({ form, children, routeParams }: FormProps<TOpts>) => {

    // Insert params
    
    // { id: "123" }
    // /room/:id/name -> /room/123/name

    function getRoute() {
        const route = form.action
        const segments = route.split("/")
        const seenParams = new Set<string>()

        const whole = segments.map((segment) => {
            if (segment.startsWith(":")) {
                if (!routeParams) {
                    throw new Error(`No params available for route: ${route}`)
                }
                const param = segment.slice(1)
                seenParams.add(param)
                const value = routeParams[param]
                if (!value) {
                    throw new Error(`Param ${param} not found in route params: ${route}`)
                }
                return routeParams[param]
            }
            return segment
        }).join("/")
        const providedParams = new Set<string>(Object.keys(routeParams ?? {}))
        if (providedParams.size !== seenParams.size) {
            const provided = Array.from(providedParams).join(", ")
            throw new Error(`Too many params provided: ${route}. Provided: ${provided}`)
        }
        return whole
    }

    const route = getRoute()
    const id = `form-${route}`.replaceAll("/", "-")

    return (
        <form
            data-on:submit__prevent={`@post('${getRoute()}', {contentType: 'form'})`}
            className="grid gap-y-4"
            id={id}
            >
            {children}
        </form>
    )
}
