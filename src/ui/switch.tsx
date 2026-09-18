import type { Child, FC, JSX } from "hono/jsx"

type SwitchColor = "neutral" | "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error"
type SwitchVariant = "solid" | "outline"
type SwitchSize = "xs" | "sm" | "md" | "lg" | "xl"

// Class names are spelled out in full so tailwind's source scanner emits them
const colorClass: Record<SwitchColor, string> = {
    neutral: "",
    primary: "switch-primary",
    secondary: "switch-secondary",
    accent: "switch-accent",
    info: "switch-info",
    success: "switch-success",
    warning: "switch-warning",
    error: "switch-error",
}

const variantClass: Record<SwitchVariant, string> = {
    solid: "",
    outline: "switch-outline",
}

const sizeClass: Record<SwitchSize, { input: string; gap: string; text: string }> = {
    xs: { input: "switch-xs", gap: "gap-0", text: "text-xs" },
    sm: { input: "switch-sm", gap: "gap-0.5", text: "text-sm" },
    md: { input: "", gap: "gap-1", text: "text-base" },
    lg: { input: "switch-lg", gap: "gap-1.5", text: "text-lg" },
    xl: { input: "switch-xl", gap: "gap-1.5", text: "text-xl" },
}

type SwitchProps = {
    /** needed to tie the label to the checkbox */
    id: string
    label?: Child
    color?: SwitchColor
    variant?: SwitchVariant
    size?: SwitchSize
    /** applied to the wrapper; remaining attrs go on the checkbox */
    className?: string
} & Omit<JSX.IntrinsicElements["input"], "size" | "label" | "className">


export const Switch: FC<SwitchProps> = ({ id, label, color = "neutral", variant = "solid", size = "md", className, ...attrs }) => {
    const sizes = sizeClass[size]
    const inputClasses = ["switch", variantClass[variant], colorClass[color], sizes.input].filter(Boolean).join(" ")
    const wrapperClasses = ["flex items-center", sizes.gap, className].filter(Boolean).join(" ")

    return (
        <div className={wrapperClasses}>
            <input type="checkbox" id={id} className={inputClasses} {...attrs} />
            {label && <label className={`label-text ${sizes.text}`} htmlFor={id}>{label}</label>}
        </div>
    )
}
