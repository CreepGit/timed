import type { FC, JSX } from "hono/jsx"

type SwapEffect = "rotate" | "flip" | "none"
type SwapSize = 4 | 5 | 6 | 7 | 8 | 10

const effectClass: Record<SwapEffect, string> = {
    rotate: "swap-rotate",
    flip: "swap-flip",
    none: "",
}

const sizeClass: Record<SwapSize, string> = {
    4: "size-4",
    5: "size-5",
    6: "size-6",
    7: "size-7",
    8: "size-8",
    10: "size-10",
}

type SwapProps = {
    /** iconify class shown while checked */
    onIcon: string
    /** iconify class shown while unchecked */
    offIcon: string
    effect?: SwapEffect
    size?: SwapSize
    /** applied to the label wrapper; remaining attrs go on the checkbox */
    className?: string
} & Omit<JSX.IntrinsicElements["input"], "size" | "className">


export const Swap: FC<SwapProps> = ({ onIcon, offIcon, effect = "rotate", size = 6, className, ...attrs }) => {
    const classes = ["swap", effectClass[effect], className].filter(Boolean).join(" ")

    return (
        <label className={classes}>
            <input type="checkbox" {...attrs} />
            <span className={`swap-on ${onIcon} ${sizeClass[size]}`}></span>
            <span className={`swap-off ${offIcon} ${sizeClass[size]}`}></span>
        </label>
    )
}
