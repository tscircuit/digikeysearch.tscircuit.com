import { describe, expect, it } from "vitest"
import { CATEGORY_BY_PATH } from "../src/categories"
import { buildKeywordRequest } from "../src/digikey-client"
import {
  createSearchRequest,
  getSearchCacheKey,
  parseParametricFilters,
} from "../src/search-request"

describe("search request normalization", () => {
  it("keeps Linux capability mandatory and derived labels out of DigiKey keywords", async () => {
    const category = CATEGORY_BY_PATH.get("/linux_capable_processors/list")
    expect(category).toBeDefined()
    const url = new URL(
      "https://example.test/linux_capable_processors/list?architecture=ARM32&chip_family=STM32MP1&cpu_core=Cortex-A7&manufacturer=497&linux_capable_processor=false",
    )
    const request = createSearchRequest(url, category)

    expect(request.query).toBe("microprocessor Cortex-A7")
    expect(request.responseKey).toBe("linux_capable_processors")
    expect(request.postFilters).toEqual({
      linux_capable_processor: "true",
      architecture: "ARM32",
      chip_family: "STM32MP1",
      cpu_core: "Cortex-A7",
    })
    expect(buildKeywordRequest(request).FilterOptionsRequest).toMatchObject({
      ManufacturerFilter: [{ Id: "497" }],
      SearchOptions: ["InStock"],
      MarketPlaceFilter: "ExcludeMarketPlace",
    })

    url.searchParams.set("architecture", "ARM64")
    const differentArchitecture = createSearchRequest(url, category)
    expect(differentArchitecture.query).toBe(request.query)
    expect(await getSearchCacheKey(differentArchitecture)).not.toBe(
      await getSearchCacheKey(request),
    )
    url.searchParams.set("chip_family", "TI Sitara AM335x")
    const differentFamily = createSearchRequest(url, category)
    expect(differentFamily.query).toBe(request.query)
    expect(await getSearchCacheKey(differentFamily)).not.toBe(
      await getSearchCacheKey(differentArchitecture),
    )
    const unfiltered = createSearchRequest(
      new URL("https://example.test/linux_capable_processors/list"),
      category,
    )
    expect(unfiltered.query).toBe("microprocessor")
    expect(unfiltered.postFilters).toEqual({ linux_capable_processor: "true" })
  })

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

  it("keeps the Micro USB category restricted to micro connector types", () => {
    const category = CATEGORY_BY_PATH.get("/micro_usb_connectors/list")
    const request = createSearchRequest(
      new URL(
        "https://example.test/micro_usb_connectors/list?number_of_contacts=5",
      ),
      category,
    )

    expect(request.query).toBe("USB micro connector 5")
    expect(request.responseKey).toBe("micro_usb_connectors")
    expect(request.postFilters).toEqual({
      connector_type: "micro",
      number_of_contacts: "5",
    })
  })

  it("uses DC power terminology and a required Barrel Jack guard", () => {
    const category = CATEGORY_BY_PATH.get("/barrel_jacks/list")
    const request = createSearchRequest(
      new URL(
        "https://example.test/barrel_jacks/list?inside_diameter_mm=2.1mm&outside_diameter_mm=5.5mm",
      ),
      category,
    )

    expect(request.query).toBe("DC power jack connector 2.1mm 5.5mm")
    expect(request.responseKey).toBe("barrel_jacks")
    expect(request.postFilters).toEqual({
      barrel_jack: "true",
      inside_diameter_mm: "2.1mm",
      outside_diameter_mm: "5.5mm",
    })
  })

  it("uses a strict DRAM query and response shape", () => {
    const category = CATEGORY_BY_PATH.get("/drams/list")
    const request = createSearchRequest(
      new URL(
        "https://example.test/drams/list?package=FBGA-96&memory_type=DDR4&memory_size=4Gbit",
      ),
      category,
    )

    expect(request.query).toBe("DRAM memory IC FBGA-96 DDR4 4Gbit")
    expect(request.responseKey).toBe("drams")
    expect(request.postFilters).toEqual({
      dram: "true",
      memory_size: "4Gbit",
      memory_type: "DDR4",
      package: "FBGA-96",
    })
  })
})
