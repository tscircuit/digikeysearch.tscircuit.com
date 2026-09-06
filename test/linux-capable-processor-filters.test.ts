import { describe, expect, it } from "vitest"
import { applyPostFilters, normalizeKeywordResponse } from "../src/normalize"
import type { NormalizedPart } from "../src/types"

const processor = (mfr = "STM32MP157AAC3"): NormalizedPart =>
  normalizeKeywordResponse({
    Products: [
      {
        ManufacturerProductNumber: mfr,
        Manufacturer: { Name: "STMicroelectronics" },
        Description: { ProductDescription: "IC MPU STM32MP1 650MHZ 361TFBGA" },
        Category: { Name: "Microprocessors" },
        ProductVariations: [
          {
            DigiKeyProductNumber: `${mfr}-ND`,
            QuantityAvailableforPackageType: 100,
          },
        ],
        Parameters: [
          { ParameterText: "Package / Case", ValueText: "361-TFBGA" },
          { ParameterText: "Supplier Device Package", ValueText: "361-TFBGA" },
          {
            ParameterText: "Core Processor",
            ValueText: "ARM Cortex-A7, Cortex-M4",
          },
        ],
      },
    ],
  })[0]

const guard = { linux_capable_processor: "true" }

describe("Linux processor postfilters", () => {
  it("enriches known processors and excludes MCUs, out-of-stock parts, and marketplace offers", () => {
    const part = processor()
    const result = applyPostFilters(
      [
        part,
        processor("STM32H743ZIT6"),
        { ...part, stock: 0 },
        { ...part, marketplace: true },
      ],
      guard,
    )

    expect(result).toEqual([
      {
        ...part,
        chip_family: "ST STM32MP1",
        architecture: "ARM32",
        cpu_core: "Cortex-A7",
      },
    ])
    expect(part).not.toHaveProperty("architecture")
    expect(applyPostFilters([part], {})).toEqual([part])
  })

  it("applies family, architecture, application core, and package filters together", () => {
    expect(
      applyPostFilters([processor()], {
        ...guard,
        chip_family: "STM32MP1",
        architecture: "arm32",
        cpu_core: "Cortex A7",
        package: "361-TFBGA",
      }),
    ).toHaveLength(1)

    const mismatches: Record<string, string>[] = [
      { architecture: "ARM64" },
      { chip_family: "STM32MP2" },
      { cpu_core: "Cortex-M4" },
      { package: "QFN-48" },
    ]
    for (const mismatch of mismatches) {
      expect(
        applyPostFilters([processor()], { ...guard, ...mismatch }),
      ).toEqual([])
    }
  })

  it("does not confuse Cortex-A7 with Cortex-A72 or trust unrelated parameter claims", () => {
    const rk3399: NormalizedPart = {
      ...processor(),
      mfr: "RK3399",
      manufacturer: "Rockchip",
      description: "Rockchip microprocessor",
      parameters: { architecture: "ARM32", cpu_core: "Cortex-A7" },
    }
    expect(
      applyPostFilters([rk3399], { ...guard, cpu_core: "Cortex-A7" }),
    ).toEqual([])
    expect(
      applyPostFilters([rk3399], { ...guard, cpu_core: "Cortex-A72" }),
    ).toHaveLength(1)
    expect(
      applyPostFilters([rk3399], { ...guard, architecture: "ARM32" }),
    ).toEqual([])
  })
})
