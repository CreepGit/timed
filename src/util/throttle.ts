type ThrottleOptions = {
    interval: number
    leading?: boolean
    trailing?: boolean
}

export type Throttled<A extends any[]> = {
    (...args: A): void
    /** Drop any queued trailing call and close the window */
    cancel(): void
    /** True while a trailing call is queued */
    isPending(): boolean
}

/**
 * Leading + trailing throttle. Collapses a burst of calls into one invocation
 * at the start and one at the end of each interval window.
 *
 * Unlike a debounce the window is not extended by new calls, so a sustained
 * burst still produces an invocation every `interval` ms.
 *
 *                Time: 0ms - - - - 100ms - - - - 200ms - - - - 300ms - - - -
 * throttle Invocations: x x x x x x x x x x x x x x x x - - - - - - - - x - -
 *   Source Invocations: x - - - - - - - - x - - - - - - x - - - - - - - x - -
 *
 * The source function is fire and forget: a returned promise is not awaited,
 * so an async source must handle its own errors.
 */
export function throttle<A extends any[]>(
    options: ThrottleOptions,
    func: (...args: A) => unknown,
): Throttled<A> {
    const { interval, leading = true, trailing = false } = options

    let timer: ReturnType<typeof setTimeout> | null = null
    let pendingArgs: A | null = null

    function openWindow() {
        timer = setTimeout(() => {
            timer = null
            if (pendingArgs === null) {
                return
            }
            const args = pendingArgs
            pendingArgs = null
            func(...args)
            // A trailing call starts its own window, otherwise the call right
            // after it would fire on the leading edge and bunch up
            openWindow()
        }, interval)
    }

    const throttled = (...args: A) => {
        if (timer !== null) {
            if (trailing) {
                pendingArgs = args
            }
            return
        }
        openWindow()
        if (leading) {
            func(...args)
        } else if (trailing) {
            pendingArgs = args
        }
    }

    throttled.cancel = () => {
        if (timer !== null) {
            clearTimeout(timer)
            timer = null
        }
        pendingArgs = null
    }

    throttled.isPending = () => pendingArgs !== null

    return throttled
}
