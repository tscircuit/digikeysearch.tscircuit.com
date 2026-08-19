import { describe, expect, it } from "vitest"
import worker from "../src/index"
import type { Env } from "../src/types"

const context = {
  waitUntil() {},
  passThroughOnException() {},
} as unknown as ExecutionContext

describe("worker routes without upstream access", () => {
  it("serves health", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/health"),
      {} as Env,
      context,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it("renders the jlcsearch-compatible category home", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/"),
      {} as Env,
      context,
    )
    const html = await response.text()
    expect(html).toContain("DigiKey In-Stock Parts Engine")
    expect(html).toContain("/resistors/list")
    expect(html).toContain("/barrel_jacks/list")
    expect(html).toContain("/microcontrollers/list")
    expect(html).toContain("/micro_usb_connectors/list")
  })

  it("rejects empty API searches before touching D1 or DigiKey", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/api/search", {
        headers: { accept: "application/json" },
      }),
      {} as Env,
      context,
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: { message: "A non-empty q or search parameter is required" },
    })
  })
})
