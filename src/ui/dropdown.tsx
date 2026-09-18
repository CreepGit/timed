import type { Child, FC, JSX } from "hono/jsx"
import { clientSignal, isTitleItem, MenuLeaf, type MenuLeafItem, type MenuTitleItem } from "./menu.tsx"

type DropdownColor = "neutral" | "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error"

const colorClass: Record<DropdownColor, string> = {
    neutral: "",
    primary: "btn-primary",
    secondary: "btn-secondary",
    accent: "btn-accent",
    info: "btn-info",
    success: "btn-success",
    warning: "btn-warning",
    error: "btn-error",
}

function dropdownSignal(id: string) {
    return `_${clientSignal(`dropdown_${id}`)}`
}

type DropdownProps = {
    id: string
    label: Child
    items: Array<MenuLeafItem | MenuTitleItem>
    color?: DropdownColor
} & JSX.IntrinsicElements["div"]

export const Dropdown: FC<DropdownProps> = ({ id, label, items, color = "primary", className, ...attrs }) => {
    const sig = `$${dropdownSignal(id)}`
    const wrapperClasses = ["dropdown", "relative", "inline-flex", "--prevent-on-load-init", className].filter(Boolean).join(" ")
    const buttonClasses = ["dropdown-toggle", "btn", colorClass[color]].filter(Boolean).join(" ")
    const ariaLabel = typeof label === "string" ? label : "Dropdown"

    return (
        <div
            className={wrapperClasses}
            data-signals__ifmissing={JSON.stringify({ [dropdownSignal(id)]: false })}
            data-preserve-attr="class"
            data-class:open={sig}
            data-on:click__outside={`${sig} = false`}
            data-on:keydown__window={`evt.key === 'Escape' && (${sig} = false)`}
            {...attrs}
            id={id}
        >
            <button
                id={`${id}_aria`}
                type="button"
                className={buttonClasses}
                aria-haspopup="menu"
                aria-expanded="false"
                aria-label={ariaLabel}
                data-on:click={`${sig} = !${sig}`}
                data-attr:aria-expanded={sig}
            >
                {label}
                <span className="relative inline-block size-4 shrink-0">
                    <span
                        className="icon-[tabler--chevron-down] absolute inset-0 size-4 transition-opacity duration-150"
                        data-style={`{opacity: ${sig} ? 0 : 1}`}
                    ></span>
                    <span
                        className="icon-[tabler--x] absolute inset-0 size-4 opacity-0 transition-opacity duration-150"
                        data-style={`{opacity: ${sig} ? 1 : 0}`}
                    ></span>
                </span>
            </button>
            <ul
                className="dropdown-menu min-w-60 absolute start-0 top-full pointer-events-none"
                // Override FlyonUI's default
                style={{ transition: "opacity 150ms ease-out, transform 150ms ease-out" }}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby={`${id}_aria`}
                data-preserve-attr="class"
                data-class={`{ open: ${sig}, 'pointer-events-none': !${sig} }`}
                data-style={`{opacity: ${sig} ? 1 : 0, transform: ${sig} ? 'translateY(0px)' : 'translateY(-4px)'}`}
                data-attr:aria-hidden={`!${sig}`}
            >
                {items.map((item) => {
                    if (isTitleItem(item)) {
                        return <li><span className="dropdown-title">{item.label}</span></li>
                    }

                    const itemClass = [
                        "dropdown-item",
                        item.active && "dropdown-active",
                        item.disabled && "dropdown-disabled",
                    ].filter(Boolean).join(" ")

                    return (
                        <li>
                            <MenuLeaf item={item} className={itemClass} onClick={item.href ? `${sig} = false` : undefined} />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
