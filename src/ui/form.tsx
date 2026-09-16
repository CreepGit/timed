import type { Child } from "hono/jsx"
import type { FormOptions } from "../util/forms.ts"
import { env, util, ui } from "../kit.ts"
import * as rad from 'radash'

type FormProps<TOpts extends FormOptions<TOpts["fields"]>> = {
    form: FormOptions<TOpts["fields"]>
    children?: Child
    routeParams?: Record<string, string>
}


export const Form = async <TOpts extends FormOptions<TOpts["fields"]>>({ form, children, routeParams }: FormProps<TOpts>) => {
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

    const submitKey = `data-on:submit__prevent__throttle.2000ms`
    const submitValue = `@post('${getRoute()}', {contentType: 'form'})`
    const attributes = {
        [submitKey]: submitValue,
    }

    // TODO: This creates a token on every SSE patch, though it's not overwritten on client
    //   so client doesn't care. It's just wasteful to do so.
    const NONCE_EXPIRE_SECONDS = 10 * 60 * 60 // 10 hours
    const nonceToken = await util.nonce.create(NONCE_EXPIRE_SECONDS, form.id)
    const nonceKey = `_${form.id}-nonce`.replaceAll("-", "_")
    const nonceObj = JSON.stringify({ [nonceKey]: nonceToken })

    const emptyFormFields = rad.mapEntries(form.fields, (name, field) => [name, []] as [string, never[]])
    const formSignals = JSON.stringify({
        _forms: {
            [form.id]: {
                ...emptyFormFields,
                _token: [],
            }
        }
    })

    const badgeList = []

    if (env.NODE_ENV == "development") {
        function badge(tooltip: string, icon: string, child: Child) {
            return <span className="badge badge-soft badge-info cursor-help" title={`${tooltip}`}>
                <span className={`${icon}`}></span>
                { child }
            </span>
        }

        badgeList.push(badge(
            "Debug: Value of nonce key",
            "icon-[tabler--eye-code]",
            <span data-text={`$${nonceKey}`}></span>
        ))

        badgeList.push(badge(
            "Debug: Action",
            "icon-[tabler--arrow-right-square]",
            <span>{getRoute()}</span>
        ))
    }
    const badges = <>{badgeList.map((badge) => badge)}</>

    return (
        <form
            {...attributes}
            className="grid gap-y-4"
            id={form.id}
            >
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
            <div className="inline-flex flex-wrap gap-1">
                { badges }
            </div>
            <div>
                { rad.listify(form.fields, (name: string, field) => <ui.Field
                    name={name as string}
                    field={field}
                    errorVariable={`$_forms.${form.id}?.${name}`}
                />) }
            </div>
            <div
                className="alert alert-soft alert-error flex items-center gap-4"
                role="alert"
                data-show={`$_forms.${form.id}?._token.length`}
                >
                <span className="icon-[tabler--alert-circle] shrink-0 size-6"></span>
                <p data-text={`$_forms.${form.id}?._token.join(", ") || ""`}></p>
            </div>
            {children}
        </form>
    )
}
