import { before, describe, it, test } from "node:test"
import { app } from "../../index.ts"
import { ui, util, lib, pb } from "../../kit.ts"
import assert from "node:assert"

describe("Home view", () => {
    test("GET /", async () => {
        const res = await app.request("/", {
            headers: {
                "Cookie": "guest_user=diguwzz3conqxry"
            }
        })
        assert.equal(res.status, 200)
        const cookie_text = 'diguwzz3conqxry'
        const text = await res.text()
        assert.ok(text.includes(cookie_text))
    })
})
