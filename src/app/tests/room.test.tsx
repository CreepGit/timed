import { before, describe, it, test } from "node:test"
import { app } from "../../index.ts"
import { ui, util, lib, pb } from "../../kit.ts"
import assert from "node:assert"

describe("Home view", () => {
    test("GET /room/:id", async () => {
        const room_id = "n7iof8l4fi03sdw"
        const res = await app.request(`/room/${room_id}`, {
            headers: {
                "Cookie": "guest_user=diguwzz3conqxry"
            }
        })
        assert.equal(res.status, 200)
        const text = await res.text()
        assert.ok(text.includes(room_id))
    })

    // No testing for GET without a cookie
    //   as that will create a new guest user
    //   fixed when we get a mock database
})
