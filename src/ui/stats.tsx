import type { Child, FC, JSX } from "hono/jsx"

type StatColor = "neutral" | "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error"

// Class names are spelled out in full so tailwind's source scanner emits them
const colorClass: Record<StatColor, string> = {
    neutral: "",
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
}

export type StatItem = {
    title?: Child
    value: Child
    desc?: Child
    /** iconify class, e.g. icon-[tabler--world] */
    icon?: string
    color?: StatColor
}

type StatsProps = {
    items: StatItem[]
    vertical?: boolean
    bordered?: boolean
} & JSX.IntrinsicElements["div"]

export const Stats: FC<StatsProps> = ({ items, vertical = false, bordered = false, className, ...attrs }) => {
    const classes = [
        "stats",
        vertical && "stats-vertical",
        bordered && "stats-border shadow-none",
        className,
    ].filter(Boolean).join(" ")

    return (
        <div className={classes} {...attrs}>
            {items.map((item) => {
                const color = colorClass[item.color ?? "neutral"]

                return (
                    <div className="stat">
                        {item.icon && (
                            <div className={["stat-figure", "size-8", color || "text-base-content"].filter(Boolean).join(" ")}>
                                <span className={`${item.icon} size-8`}></span>
                            </div>
                        )}
                        {item.title && <div className="stat-title">{item.title}</div>}
                        <div className={["stat-value", color].filter(Boolean).join(" ")}>{item.value}</div>
                        {item.desc && <div className="stat-desc">{item.desc}</div>}
                    </div>
                )
            })}
        </div>
    )
}
