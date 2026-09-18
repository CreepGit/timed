import type { Child, FC, JSX } from "hono/jsx"
import env from "../env.ts"

type MenuSize = "xs" | "sm" | "md" | "lg" | "xl"
type MenuHorizontal = boolean | "sm" | "md" | "lg" | "xl" | "2xl"

const sizeClass: Record<MenuSize, string> = {
    xs: "menu-xs",
    sm: "menu-sm",
    md: "",
    lg: "menu-lg",
    xl: "menu-xl",
}

const horizontalClass: Record<Exclude<MenuHorizontal, boolean>, string> = {
    sm: "sm:menu-horizontal",
    md: "md:menu-horizontal",
    lg: "lg:menu-horizontal",
    xl: "xl:menu-horizontal",
    "2xl": "2xl:menu-horizontal",
}

/** Datastar $paths treat hyphens as subtraction. */
export function clientSignal(id: string) {
    return id.replaceAll("-", "_")
}

const ITEM_SEGMENT = /^[a-z][a-z0-9]*$/

/** Local segment concatenated onto the Menu `id`. No hyphens — those separate the path. */
export type MenuItemId = string

type MenuItemBase = {
    label?: Child
    icon?: string
    ariaLabel?: string
    badge?: Child
}

export type MenuTitleItem = MenuItemBase & {
    title: true
}

export type MenuGroupItem = MenuItemBase & {
    id: MenuItemId
    open?: boolean
    children: MenuItem[]
}

export type MenuLeafItem = MenuItemBase & {
    href?: string
    /** Datastar expression, e.g. `@post('/changesignal')` */
    onClick?: string
    active?: boolean
    disabled?: boolean
}

export type MenuItem = MenuTitleItem | MenuGroupItem | MenuLeafItem

export function isTitleItem(item: MenuItem): item is MenuTitleItem {
    return "title" in item && item.title === true
}

export function isGroupItem(item: MenuItem): item is MenuGroupItem {
    return "children" in item
}

type MenuShared = {
    items: MenuItem[]
    horizontal?: MenuHorizontal
    size?: MenuSize
}

type MenuProps =
    & MenuShared
    & (
        | { accordion: true; id: string; alwaysOpen?: boolean }
        | { accordion?: false; alwaysOpen?: never; id?: string }
    )
    & Omit<JSX.IntrinsicElements["ul"], "id">

function assertItemId(id: string) {
    if (env.NODE_ENV !== "development") return
    if (!ITEM_SEGMENT.test(id)) {
        throw new Error(`Menu item id "${id}" must match ${ITEM_SEGMENT} (local segment; Menu id is prefixed automatically)`)
    }
}

function itemKey(prefix: string, item: MenuGroupItem) {
    assertItemId(item.id)
    return `${prefix}-${item.id}`
}

function signalKey(rootId: string, fullId: string) {
    return clientSignal(fullId.slice(rootId.length + 1))
}

function menuSignalRoot(id: string) {
    return `_${clientSignal(`menu_${id}`)}`
}

function accordionState(items: MenuItem[], prefix: string, rootId: string): Record<string, boolean> {
    const state: Record<string, boolean> = {}
    for (const item of items) {
        if (!isGroupItem(item)) continue
        const id = itemKey(prefix, item)
        state[signalKey(rootId, id)] = item.open === true
        Object.assign(state, accordionState(item.children, id, rootId))
    }
    return state
}

function ItemBody({ item }: { item: MenuItemBase }) {
    return (
        <>
            {item.icon && <span className={`${item.icon} size-5`}></span>}
            {item.label}
            {item.badge}
        </>
    )
}

export function MenuLeaf({ item, className, onClick }: {
    item: MenuLeafItem
    className?: string
    /** extra Datastar click expression, composed after `item.onClick` */
    onClick?: string
}) {
    const ariaLabel = item.label ? item.ariaLabel : (item.ariaLabel ?? "Menu item")
    const click = [item.onClick, onClick].filter(Boolean).join("; ")
    const clickAttr = click ? { "data-on:click": click } : {}

    if (item.href) {
        return (
            <a href={item.href} className={className} aria-label={ariaLabel} {...clickAttr}>
                <ItemBody item={item} />
            </a>
        )
    }

    return (
        <button type="button" className={className} aria-label={ariaLabel} disabled={item.disabled} {...clickAttr}>
            <ItemBody item={item} />
        </button>
    )
}

function MenuItems({ items, accordion, prefix, rootId, sigRoot, alwaysOpen }: {
    items: MenuItem[]
    accordion: boolean
    prefix: string
    rootId: string
    sigRoot: string
    alwaysOpen: boolean
}) {
    const siblingKeys = items.flatMap((item) => (
        isGroupItem(item) ? [signalKey(rootId, itemKey(prefix, item))] : []
    ))

    return <>{items.map((item) => {
        if (isTitleItem(item)) {
            return <li className="menu-title">{item.label}</li>
        }

        if (isGroupItem(item)) {
            const id = itemKey(prefix, item)

            if (accordion) {
                const collapseId = `${id}-collapse`
                const open = item.open === true
                const key = signalKey(rootId, id)
                const sig = `$${sigRoot}.${key}`
                const others = siblingKeys.filter((sibling) => sibling !== key)
                const toggle = alwaysOpen || others.length === 0
                    ? `${sig} = !${sig}`
                    : `${others.map((sibling) => `$${sigRoot}.${sibling} = false`).join("; ")}; ${sig} = !${sig}`

                return (
                    <li
                        className={["accordion-item", "space-y-0.5", "--prevent-on-load-init", open && "active"].filter(Boolean).join(" ")}
                        id={id}
                        data-preserve-attr="class"
                        data-class:active={sig}
                    >
                        <button
                            type="button"
                            className="accordion-toggle rounded-field inline-flex items-center gap-x-4 px-4 py-2.5 text-start text-base font-normal"
                            aria-controls={collapseId}
                            aria-expanded={open ? "true" : "false"}
                            data-on:click={toggle}
                            data-attr:aria-expanded={sig}
                        >
                            {item.icon && <span className={`${item.icon} size-5`}></span>}
                            <span className="grow">{item.label}</span>
                            {item.badge}
                            <span className="icon-[tabler--chevron-down] accordion-item-active:rotate-180 size-4 shrink-0 transition-transform duration-150"></span>
                        </button>
                        <div
                            id={collapseId}
                            className={["accordion-content", "w-full", "grid", "overflow-hidden", "transition-[grid-template-rows]", "duration-150", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"].filter(Boolean).join(" ")}
                            aria-labelledby={id}
                            role="region"
                            data-preserve-attr="class"
                            data-class={`{ 'grid-rows-[1fr]': ${sig}, 'grid-rows-[0fr]': !${sig} }`}
                        >
                            <div className="min-h-0 overflow-hidden">
                                <ul className="accordion space-y-0.5">
                                    <MenuItems items={item.children} accordion prefix={id} rootId={rootId} sigRoot={sigRoot} alwaysOpen={alwaysOpen} />
                                </ul>
                            </div>
                        </div>
                    </li>
                )
            }

            return (
                <li>
                    {item.label && <span className="menu-title">{item.label}</span>}
                    <ul className="menu">
                        <MenuItems items={item.children} accordion={false} prefix={id} rootId={rootId} sigRoot={sigRoot} alwaysOpen={alwaysOpen} />
                    </ul>
                </li>
            )
        }

        const linkClass = item.active ? "menu-active" : undefined

        return (
            <li className={item.disabled ? "menu-disabled" : undefined}>
                <MenuLeaf item={item} className={linkClass} />
            </li>
        )
    })}</>
}

export const Menu: FC<MenuProps> = (props) => {
    const { items, horizontal = false, size = "md", className, accordion = false, alwaysOpen = false, id, ...attrs } = props
    const prefix = id ?? "menu"
    if (accordion && !id) {
        throw new Error("Menu accordion requires an id (item ids are concatenated onto it)")
    }
    const sigRoot = menuSignalRoot(prefix)
    const classes = [
        "menu",
        accordion && "accordion",
        accordion && "space-y-0.5",
        horizontal === true && "menu-horizontal",
        typeof horizontal === "string" && horizontalClass[horizontal],
        sizeClass[size],
        className,
    ].filter(Boolean).join(" ")

    return (
        <ul
            className={classes}
            {...(accordion ? { "data-signals__ifmissing": JSON.stringify({ [sigRoot]: accordionState(items, prefix, prefix) }) } : {})}
            {...attrs}
            id={id}
        >
            <MenuItems items={items} accordion={accordion} prefix={prefix} rootId={prefix} sigRoot={sigRoot} alwaysOpen={alwaysOpen} />
        </ul>
    )
}
