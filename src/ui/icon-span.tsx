import type { FC, JSX } from "hono/jsx"

/** rem per tailwind space unit */
const SPACE_UNIT_REM = 0.25
/** inline space reserved for the icon, relative to its size */
const WIDTH_SCALE = 0.85
/** how far the icon sits above the middle of the line, relative to its size */
const RISE_SCALE = 0.0666

const scale = (size: string | number, factor: number) =>
    typeof size === "number"
        ? `${+(size * SPACE_UNIT_REM * factor).toFixed(4)}rem`
        : `calc(${size} * ${factor})`

type IconSpanProps = {
    icon: string
    size?: string | number // number converts using tailwind space units. 5 = 1.25 rem
} & JSX.IntrinsicElements["span"]

export const IconSpan: FC<IconSpanProps> = ({ icon, size = 5, className, style, ...attrs }) => {
    const length = scale(size, 1)

    return (
        <span className="relative inline-block align-middle shrink-0" style={{ width: scale(size, WIDTH_SCALE), height: "0 !important" }}>
            <span
                className={`${icon} absolute top-1/2 left-1/2 ${className ?? ""}`}
                style={{
                    width: length,
                    height: length,
                    transform: `translate(-${scale(size, 0.5)}, -${scale(size, 0.5 + RISE_SCALE)})`,
                    ...(typeof style === "object" ? style : {}),
                }}
                {...attrs}
                ></span>
        </span>
    )
}
