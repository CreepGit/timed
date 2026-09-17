import { afterEach, beforeEach, describe, mock, test } from "node:test"
import assert from "node:assert"
import { throttle } from "./throttle.ts"

const INTERVAL = 100

// Known async source: records the moment it is entered, and again once its
// awaited work settles. The throttle never awaits it, so `entered` is what the
// throttle actually controls and `settled` proves the promise still runs.
function makeSource() {
    const entered: string[] = []
    const settled: string[] = []
    async function source(value: string) {
        entered.push(value)
        await Promise.resolve()
        settled.push(value)
    }
    return { entered, settled, source }
}

// Lets pending microtasks from the async source run. setImmediate is not
// mocked, so this stays real while setTimeout is faked.
function flush() {
    return new Promise(resolve => setImmediate(resolve))
}

function advance(ms: number) {
    // if event at 20ms and you jump 40ms, it skips the event
    //   problem with mock timers
    for (let i = 0; i < ms; i++) {
        mock.timers.tick(1)
    }
}


async function AB_CDEF_run({ leading, trailing }: { leading: boolean, trailing: boolean }) {
    const { entered, settled, source } = makeSource()
    const throttled = throttle({
        interval: INTERVAL,
        leading: leading,
        trailing: trailing,
    }, source)

    advance(INTERVAL * 2)

    throttled("a")
    throttled("b")

    advance(INTERVAL * 3)

    throttled("c")
    throttled("d")
    // short
    advance(INTERVAL / 8)
    throttled("e")
    // short
    advance(INTERVAL / 8)
    throttled("f")
    
    advance(INTERVAL * 2)

    return { entered, settled }
}

describe("util.throttle", () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ["setTimeout"] })
    })
    afterEach(() => {
        mock.timers.reset()
    })

    test("AB wait CDEF, no leading, no trailing", async () => {
        const ret = await AB_CDEF_run({ leading: false, trailing: false })
        assert.deepEqual(ret.entered, [])
        assert.deepEqual(ret.settled, [])
    })

    test("AB wait CDEF, leading", async () => {
        const ret = await AB_CDEF_run({ leading: true, trailing: false })
        assert.deepEqual(ret.entered, ["a", "c"])
        assert.deepEqual(ret.settled, ["a", "c"])
    })

    test("AB wait CDEF, trailing", async () => {
        const ret = await AB_CDEF_run({ leading: false, trailing: true })
        assert.deepEqual(ret.entered, ["b", "f"])
        assert.deepEqual(ret.settled, ["b", "f"])
    })

    test("AB wait CDEF, leading, trailing", async () => {
        const ret = await AB_CDEF_run({ leading: true, trailing: true })
        assert.deepEqual(ret.entered, ["a", "b", "c", "f"])
        assert.deepEqual(ret.settled, ["a", "b", "c", "f"])
    })


    describe("AI stuff", () => {
        test("leading only (defaults) fires once per burst, at the start", async () => {
            const { entered, settled, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL }, source)
    
            throttled("a")
            throttled("b")
            throttled("c")
            assert.deepEqual(entered, ["a"])
    
            // Window closes with nothing queued, b and c are dropped
            mock.timers.tick(INTERVAL)
            await flush()
            assert.deepEqual(entered, ["a"])
            assert.deepEqual(settled, ["a"])
        })
    
        test("leading + trailing fires at the start and end, with the latest args", async () => {
            const { entered, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, trailing: true }, source)
    
            throttled("a")
            throttled("b")
            throttled("c")
            assert.deepEqual(entered, ["a"])
    
            mock.timers.tick(INTERVAL)
            assert.deepEqual(entered, ["a", "c"])
            await flush()
        })
    
        test("trailing only defers the first call to the end of the window", async () => {
            const { entered, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, leading: false, trailing: true }, source)
    
            throttled("a")
            throttled("b")
            assert.deepEqual(entered, [])
    
            mock.timers.tick(INTERVAL)
            assert.deepEqual(entered, ["b"])
            await flush()
        })
    
        test("neither leading nor trailing never invokes the source", async () => {
            const { entered, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, leading: false, trailing: false }, source)
    
            throttled("a")
            mock.timers.tick(INTERVAL * 5)
            await flush()
            assert.deepEqual(entered, [])
        })
    
        test("a sustained burst still emits once per interval, unlike a debounce", async () => {
            const { entered, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, trailing: true }, source)
    
            // One call every 10ms for 300ms, never letting the source go quiet
            for (let elapsed = 0; elapsed < 300; elapsed += 10) {
                throttled(`t${elapsed}`)
                mock.timers.tick(10)
            }
            await flush()
    
            // Leading at 0, then a trailing flush at each window boundary
            assert.deepEqual(entered, ["t0", "t90", "t190", "t290"])
        })
    
        test("a trailing invocation opens its own window", async () => {
            const { entered, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, trailing: true }, source)
    
            throttled("a")
            throttled("b")
            mock.timers.tick(INTERVAL)
            assert.deepEqual(entered, ["a", "b"])
    
            // Immediately after the trailing call: must be queued, not a new
            // leading edge, otherwise two invocations bunch up at the boundary
            throttled("c")
            assert.deepEqual(entered, ["a", "b"])
            mock.timers.tick(INTERVAL)
            assert.deepEqual(entered, ["a", "b", "c"])
            await flush()
        })
    
        test("calls spaced beyond the interval each fire immediately", async () => {
            const { entered, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, trailing: true }, source)
    
            throttled("a")
            mock.timers.tick(INTERVAL * 2)
            throttled("b")
            mock.timers.tick(INTERVAL * 2)
            throttled("c")
            await flush()
    
            assert.deepEqual(entered, ["a", "b", "c"])
        })
    
        test("cancel drops the queued trailing call", async () => {
            const { entered, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, trailing: true }, source)
    
            throttled("a")
            throttled("b")
            throttled.cancel()
    
            mock.timers.tick(INTERVAL * 5)
            await flush()
            assert.deepEqual(entered, ["a"])
    
            // Cancelling also closes the window, so the next call leads again
            throttled("c")
            assert.deepEqual(entered, ["a", "c"])
            await flush()
        })
    
        test("isPending reports whether a trailing call is queued", async () => {
            const { source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, trailing: true }, source)
    
            assert.equal(throttled.isPending(), false)
            throttled("a")
            assert.equal(throttled.isPending(), false)
            throttled("b")
            assert.equal(throttled.isPending(), true)
    
            mock.timers.tick(INTERVAL)
            assert.equal(throttled.isPending(), false)
            await flush()
        })
    
        test("the async source runs to completion even though it is not awaited", async () => {
            const { entered, settled, source } = makeSource()
            const throttled = throttle({ interval: INTERVAL, trailing: true }, source)
    
            throttled("a")
            throttled("b")
            mock.timers.tick(INTERVAL)
    
            // Entered synchronously, settled only after the microtask queue drains
            assert.deepEqual(entered, ["a", "b"])
            assert.deepEqual(settled, [])
            await flush()
            assert.deepEqual(settled, ["a", "b"])
        })
    
        test("passes every argument through to the source", async () => {
            const calls: [string, number][] = []
            const throttled = throttle({ interval: INTERVAL, trailing: true }, async (name: string, count: number) => {
                calls.push([name, count])
            })
    
            throttled("a", 1)
            throttled("b", 2)
            mock.timers.tick(INTERVAL)
            await flush()
    
            assert.deepEqual(calls, [["a", 1], ["b", 2]])
        })
    })
})
