import { describe, expect, it } from "vitest"
import { CATEGORY_BY_PATH } from "../src/categories"
import {
  createSearchRequest,
  getSearchCacheKey,
  parseParametricFilters,
} from "../src/search-request"

describe("search request normalization", () => {
  it("parses stable parametric filter selections", () => {
    const params = new URLSearchParams({
      param_52_3: "10k,12k",
      param_52_2: "0603",
      ignored: "value",
    })
    expect(parseParametricFilters(params)).toEqual([
      { categoryId: "52", parameterId: 2, valueIds: ["0603"] },
      { categoryId: "52", parameterId: 3, valueIds: ["10k", "12k"] },
    ])
  })

  it("uses jlcsearch-compatible category routes and stable cache keys", async () => {
    const category = CATEGORY_BY_PATH.get("/resistors/list")
    const first = createSearchRequest(
      new URL(
        "https://example.test/resistors/list?package=0603&resistance=10k",
      ),
      category,
    )
    const second = createSearchRequest(
      new URL(
        "https://example.test/resistors/list?resistance=10k&package=0603",
      ),
      category,
    )

    expect(first.query).toBe("resistor 0603 10k")
    expect(first.responseKey).toBe("resistors")
    expect(await getSearchCacheKey(first)).toBe(await getSearchCacheKey(second))
  })
})
