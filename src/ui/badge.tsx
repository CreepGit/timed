import type { Child, FC, JSX } from "hono/jsx"

type BadgeColor = "neutral" | "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error"
type BadgeVariant = "solid" | "soft" | "outline" | "dash"
type BadgeSize = "xs" | "sm" | "md" | "lg" | "xl"

const colorClass: Record<BadgeColor, string> = {
    neutral: "",
    primary: "badge-primary",
    secondary: "badge-secondary",
    accent: "badge-accent",
    info: "badge-info",
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
}

const variantClass: Record<BadgeVariant, string> = {
    solid: "",
    soft: "badge-soft",
    outline: "badge-outline",
    dash: "badge-outline border-dashed",
}

const sizeClass: Record<BadgeSize, string> = {
    xs: "badge-xs",
    sm: "badge-sm",
    md: "",
    lg: "badge-lg",
    xl: "badge-xl",
}

type BadgeProps = {
    color?: BadgeColor
    variant?: BadgeVariant
    size?: BadgeSize
    /** iconify class, e.g. icon-[tabler--check] */
    icon?: string
    children?: Child
} & JSX.IntrinsicElements["span"]

export const Badge: FC<BadgeProps> = ({ color = "neutral", variant = "solid", size = "md", icon, children, className, ...attrs }) => {
    const classes = ["badge", colorClass[color], variantClass[variant], sizeClass[size], className]
        .filter(Boolean)
        .join(" ")

    return (
        <span className={classes} {...attrs}>
            {icon && <span className={icon}></span>}
            {children}
        </span>
    )
}
