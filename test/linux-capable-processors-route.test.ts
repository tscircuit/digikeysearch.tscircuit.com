import { afterEach, describe, expect, it, vi } from "vitest"
import { DigiKeyClient } from "../src/digikey-client"
import worker from "../src/index"
import { renderSearchPage } from "../src/render"
import type {
  DigiKeyProduct,
  Env,
  NormalizedPart,
  SearchCacheRow,
} from "../src/types"

const context = {
  waitUntil() {},
  passThroughOnException() {},
} as unknown as ExecutionContext

const createCacheDatabase = (): D1Database => {
  const rows = new Map<string, SearchCacheRow>()
  const prepare = (sql: string) => {
    let parameters: unknown[] = []
    const statement = {
      bind: (...values: unknown[]) => {
        parameters = values
        return statement
      },
      first: async () => rows.get(String(parameters[0])) ?? null,
      all: async () => ({ results: [] }),
      run: async () => {
        if (sql.includes("INSERT INTO search_cache")) {
          const columns = [
            "cache_key",
            "query",
            "request_json",
            "response_json",
            "response_key",
            "source_kind",
            "created_at",
            "refreshed_at",
            "expires_at",
            "stale_until",
            "last_accessed_at",
            "api_rate_limit_remaining",
          ]
          const row = {
            ...Object.fromEntries(
              columns.map((column, index) => [column, parameters[index]]),
            ),
            access_count: 1,
          } as unknown as SearchCacheRow
          rows.set(row.cache_key, row)
        }
        return { success: true, meta: { changes: 1 } }
      },
    }
    return statement
  }

  return {
    prepare,
    batch: async (statements: D1PreparedStatement[]) =>
      Promise.all(statements.map((statement) => statement.run())),
  } as unknown as D1Database
}

const product = (
  mfr: string,
  description: string,
  core: string,
  stock: number,
): DigiKeyProduct => ({
  ManufacturerProductNumber: mfr,
  Manufacturer: { Id: 497, Name: "STMicroelectronics" },
  Description: { ProductDescription: description },
  Category: { Name: "Embedded - Microprocessors" },
  Parameters: [
    { ParameterText: "Package / Case", ValueText: "361-TFBGA" },
    { ParameterText: "Core Processor", ValueText: core },
  ],
  ProductVariations: [
    {
      DigiKeyProductNumber: `test-${mfr}-ND`,
      QuantityAvailableforPackageType: stock,
      MarketPlace: false,
    },
  ],
  ProductUrl: `https://example.test/products/${mfr}`,
  UnitPrice: 20,
})

afterEach(() => vi.restoreAllMocks())

describe("Linux-capable Processors category", () => {
  it("appears in the category JSON index", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/categories/list.json"),
      { DB: createCacheDatabase() } as Env,
      context,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      categories: expect.arrayContaining([
        {
          category: "Linux-capable Processors",
          subcategory: "microprocessor",
          path: "/linux_capable_processors/list",
        },
      ]),
    })
  })

  it("filters a fresh search, renders processor metadata, and reuses it for JSON", async () => {
    const keywordSearch = vi
      .spyOn(DigiKeyClient.prototype, "keywordSearch")
      .mockResolvedValue({
        response: {
          Products: [
            product("STM32MP157AAC3", "IC MPU STM32MP1", "Cortex-A7", 100),
            product("STM32F103C8T6", "IC MCU STM32F1", "Cortex-M3", 200),
            product(
              "STM32MP157C-DK2",
              "STM32MP157 discovery evaluation board",
              "Cortex-A7",
              50,
            ),
          ],
          ProductsCount: 3,
          FilterOptions: {
            Manufacturers: [
              { Id: "497", Value: "STMicroelectronics", ProductCount: 3 },
            ],
          },
        },
        rateLimitRemaining: 999,
      })
    const env = { DB: createCacheDatabase() } as Env
    const url = new URL("https://example.test/linux_capable_processors/list")
    url.searchParams.set("manufacturer", "497")
    url.searchParams.set("architecture", "ARM32")
    url.searchParams.set("chip_family", "ST STM32MP1")
    url.searchParams.set("cpu_core", "Cortex-A7")
    url.searchParams.set("package", "361-TFBGA")

    const response = await worker.fetch(new Request(url), env, context)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
    expect(response.headers.get("x-cache")).toBe("MISS")
    const html = await response.text()
    expect(html).toContain("<h2>Linux-capable Processors</h2>")
    expect(html).toContain(
      "Application processors with documented Linux support.",
    )
    expect(html).toContain('value="497" selected')
    expect(html).toContain('name="architecture" value="ARM32"')
    expect(html).toContain('name="chip_family" value="ST STM32MP1"')
    expect(html).toContain('name="cpu_core" value="Cortex-A7"')
    expect(html).toContain('name="package" value="361-TFBGA"')
    expect(html).toContain(">Chip Family</th>")
    expect(html).toContain(">Architecture</th>")
    expect(html).toContain(">CPU Core</th>")
    expect(html).toContain(">ST STM32MP1</td>")
    expect(html).toContain(">ARM32</td>")
    expect(html).toContain(">Cortex-A7</td>")
    expect(html).toContain("STM32MP157AAC3")
    expect(html).not.toContain("STM32F103C8T6")
    expect(html).not.toContain("STM32MP157C-DK2")
    expect(html).toContain("1 matching products.")

    const jsonUrl = new URL(url)
    jsonUrl.pathname += ".json"
    expect(html).toContain(jsonUrl.toString().replaceAll("&", "&amp;"))
    const jsonResponse = await worker.fetch(new Request(jsonUrl), env, context)

    expect(jsonResponse.status).toBe(200)
    expect(jsonResponse.headers.get("content-type")).toContain(
      "application/json",
    )
    expect(jsonResponse.headers.get("x-cache")).toBe("HIT")
    const payload = (await jsonResponse.json()) as {
      linux_capable_processors: NormalizedPart[]
      meta: { cached: boolean; total: number }
    }
    expect(payload).toMatchObject({
      linux_capable_processors: [
        {
          mfr: "STM32MP157AAC3",
          chip_family: "ST STM32MP1",
          architecture: "ARM32",
          cpu_core: "Cortex-A7",
        },
      ],
      meta: { cached: true, total: 1 },
    })
    expect(payload.linux_capable_processors).toHaveLength(1)
    expect(keywordSearch).toHaveBeenCalledTimes(1)
    expect(keywordSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        manufacturerIds: ["497"],
        responseKey: "linux_capable_processors",
        postFilters: {
          linux_capable_processor: "true",
          architecture: "ARM32",
          chip_family: "ST STM32MP1",
          cpu_core: "Cortex-A7",
          package: "361-TFBGA",
        },
      }),
    )

    const genericHtml = renderSearchPage(
      "/components/list",
      "Components",
      undefined,
      {
        components: payload.linux_capable_processors,
        query: "STM32MP157",
        total: 1,
        filter_options: {},
        source: "digikey",
        cached: true,
        stale: false,
        cache_expires_at: "2026-09-07T00:00:00.000Z",
      },
      "https://example.test/components/list?search=STM32MP157",
    )
    expect(genericHtml).not.toContain(">Chip Family</th>")
    expect(genericHtml).not.toContain(">Architecture</th>")
    expect(genericHtml).not.toContain(">CPU Core</th>")
  })
})
