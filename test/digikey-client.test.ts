import { describe, expect, it, vi } from "vitest"
import { buildKeywordRequest, DigiKeyClient } from "../src/digikey-client"
import type { Env, SearchRequest } from "../src/types"

const request: SearchRequest = {
  query: "10k resistor",
  limit: 10,
  offset: 0,
  responseKey: "components",
  sourceKind: "search",
  postFilters: {},
  manufacturerIds: ["123"],
  parametricFilters: [{ categoryId: "52", parameterId: 3, valueIds: ["10k"] }],
}

describe("DigiKeyClient", () => {
  it("builds in-stock, stock-descending keyword requests", () => {
    expect(buildKeywordRequest(request)).toEqual({
      Keywords: "10k resistor",
      Limit: 10,
      Offset: 0,
      FilterOptionsRequest: {
        ManufacturerFilter: [{ Id: "123" }],
        MarketPlaceFilter: "ExcludeMarketPlace",
        SearchOptions: ["InStock"],
        ParameterFilterRequest: {
          CategoryFilter: { Id: "52" },
          ParameterFilters: [{ ParameterId: 3, FilterValues: [{ Id: "10k" }] }],
        },
      },
      SortOptions: {
        Field: "QuantityAvailable",
        SortOrder: "Descending",
      },
    })
  })

  it("obtains and reuses an OAuth token without persisting the secret", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const mockFetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        calls.push({ url, init })
        if (url.endsWith("/v1/oauth2/token")) {
          return new Response(
            JSON.stringify({ access_token: "token-1", expires_in: 599 }),
            { status: 200, headers: { "content-type": "application/json" } },
          )
        }
        return new Response(
          JSON.stringify({ Products: [], ProductsCount: 0 }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-ratelimit-remaining": "998",
            },
          },
        )
      },
    )
    const env = {
      DIGIKEY_CLIENT_ID: "client-id",
      DIGIKEY_CLIENT_SECRET: "client-secret",
      DIGIKEY_API_BASE_URL: "https://api.example.test",
    } as Env
    const client = new DigiKeyClient(env, mockFetch as typeof fetch)

    const first = await client.keywordSearch(request)
    const second = await client.keywordSearch(request)

    expect(first.rateLimitRemaining).toBe(998)
    expect(second.rateLimitRemaining).toBe(998)
    expect(
      calls.filter((call) => call.url.includes("oauth2/token")),
    ).toHaveLength(1)
    expect(
      calls.filter((call) => call.url.includes("search/keyword")),
    ).toHaveLength(2)
    expect(
      (calls[1].init?.headers as Record<string, string>).authorization,
    ).toBe("Bearer token-1")
    expect(String(calls[1].init?.body)).not.toContain("client-secret")
  })
})
