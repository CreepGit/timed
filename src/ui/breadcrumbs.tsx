import type { FC, JSX } from "hono/jsx"

type Crumb = {
    label: string
    href?: string
    icon?: string // Example: icon-[tabler--home]
}

type BreadcrumbsProps = {
    items: Crumb[]
    /** iconify class drawn between crumbs */
    separator?: string
} & JSX.IntrinsicElements["div"]

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ items, separator = "icon-[tabler--chevron-right]", className, ...attrs }) => {
    function crumb(item: Crumb, isCurrent: boolean) {
        if (isCurrent || !item.href) {
            return (
                <li aria-current={isCurrent ? "page" : undefined}>
                    {item.icon && <span className={`${item.icon} me-1 size-5`}></span>}
                    {item.label}
                </li>
            )
        }

        return (
            <li>
                <a href={item.href}>
                    {item.icon && <span className={`${item.icon} size-5`}></span>}
                    {item.label}
                </a>
            </li>
        )
    }

    return (
        <div className={["breadcrumbs", className].filter(Boolean).join(" ")} {...attrs}>
            <ol>
                {items.flatMap((item, i) => {
                    const isLast = i === items.length - 1
                    const parts = [crumb(item, isLast)]

                    if (!isLast) {
                        parts.push(
                            <li className="breadcrumbs-separator rtl:rotate-180">
                                <span className={separator}></span>
                            </li>
                        )
                    }

                    return parts
                })}
            </ol>
        </div>
    )
}
