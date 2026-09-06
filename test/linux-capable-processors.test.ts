import { describe, expect, it } from "vitest"
import { getLinuxProcessorInfo } from "../src/linux-capable-processors"
import { normalizeProduct } from "../src/normalize"
import type { NormalizedPart } from "../src/types"

const makePart = (overrides: Partial<NormalizedPart> = {}): NormalizedPart => ({
  digikey_product_number: "497-STM32MP157AAC3-ND",
  supplier_part_number: "497-STM32MP157AAC3-ND",
  mfr: "STM32MP157AAC3",
  manufacturer: "STMicroelectronics",
  package: "361-TFBGA",
  description: "IC MPU STM32MP1 650MHZ 361TFBGA",
  detailed_description:
    "ARM Cortex-A7 Microprocessor IC STM32MP1 2 Core, 32-Bit 650MHz 361-TFBGA (12x12)",
  stock: 25,
  price: 12.5,
  category: "Embedded - Microprocessors",
  subcategory: "Embedded - Microprocessors",
  product_url: "",
  datasheet_url: "",
  photo_url: "",
  normally_stocking: true,
  discontinued: false,
  marketplace: false,
  parameters: {},
  ...overrides,
})

// Curated family fixtures also preserve the JLCSearch category's coverage.
const knownParts = [
  [
    "F1C100S",
    "Allwinner Technology",
    "Allwinner F1C100S",
    "ARM32",
    "ARM926EJ-S",
  ],
  ["F1C200S", "Allwinner", "Allwinner F1C200S", "ARM32", "ARM926EJ-S"],
  ["T113-S3", "Allwinner", "Allwinner T113", "ARM32", "Cortex-A7"],
  ["V3S", "Allwinner", "Allwinner V3S", "ARM32", "Cortex-A7"],
  ["A20", "Allwinner", "Allwinner A20", "ARM32", "Cortex-A7"],
  ["A64", "Allwinner", "Allwinner A64", "ARM64", "Cortex-A53"],
  ["H618", "Allwinner", "Allwinner H618", "ARM64", "Cortex-A53"],
  ["T527M00X0DCH", "Allwinner", "Allwinner T527", "ARM64", "Cortex-A55"],
  ["D1-H", "Allwinner", "Allwinner D1", "RISC-V64", "XuanTie C906"],
  ["D1S", "Allwinner", "Allwinner D1", "RISC-V64", "XuanTie C906"],
  ["F133-A", "Allwinner", "Allwinner F133", "RISC-V64", "XuanTie C906"],
  ["RK3288", "Rockchip", "Rockchip RK3288", "ARM32", "Cortex-A17"],
  ["RK3308B", "Rockchip", "Rockchip RK3308", "ARM64", "Cortex-A53"],
  ["RK3399", "Rockchip", "Rockchip RK3399", "ARM64", "Cortex-A72 + Cortex-A53"],
  ["RK3566", "Rockchip", "Rockchip RK3566", "ARM64", "Cortex-A55"],
  ["RK3568B2", "Rockchip", "Rockchip RK3568", "ARM64", "Cortex-A55"],
  [
    "RK3588S",
    "Rockchip",
    "Rockchip RK3588",
    "ARM64",
    "Cortex-A76 + Cortex-A55",
  ],
  ["RV1106G2", "Rockchip", "Rockchip RV1106", "ARM32", "Cortex-A7"],
  ["RV1126", "Rockchip", "Rockchip RV1126", "ARM32", "Cortex-A7"],
  ["RV1126B", "Rockchip", "Rockchip RV1126B", "ARM64", "Cortex-A53"],
  ["STM32MP157AAC3", "STMicroelectronics", "ST STM32MP1", "ARM32", "Cortex-A7"],
  ["STM32MP135DAE7", "STMicroelectronics", "ST STM32MP1", "ARM32", "Cortex-A7"],
  [
    "STM32MP257FAL3",
    "STMicroelectronics",
    "ST STM32MP2",
    "ARM64",
    "Cortex-A35",
  ],
  [
    "MCIMX6Y2CVM08AB",
    "NXP USA Inc.",
    "NXP i.MX 6UltraLite/ULL",
    "ARM32",
    "Cortex-A7",
  ],
  ["MCIMX6Q5EYM10AD", "Freescale", "NXP i.MX 6", "ARM32", "Cortex-A9"],
  ["MCIMX7D5EVM10SD", "NXP", "NXP i.MX 7", "ARM32", "Cortex-A7"],
  ["MIMX8ML8CVNKZAB", "NXP", "NXP i.MX 8M Plus", "ARM64", "Cortex-A53"],
  ["MIMX9352CVVXMAC", "NXP", "NXP i.MX 93", "ARM64", "Cortex-A55"],
  [
    "AM3358BZCZA100",
    "Texas Instruments",
    "TI Sitara AM335x",
    "ARM32",
    "Cortex-A8",
  ],
  [
    "AM4378BZDNA100",
    "Texas Instruments",
    "TI Sitara AM437x",
    "ARM32",
    "Cortex-A9",
  ],
  ["AM5718AABCXEA", "TI", "TI Sitara AM57x", "ARM32", "Cortex-A15"],
  ["AM6254ATCGHAALW", "TI", "TI Sitara AM62x", "ARM64", "Cortex-A53"],
  ["AM62A74AUMHAAMBR", "TI", "TI Sitara AM62x", "ARM64", "Cortex-A53"],
  ["AM6442BSFGHAALV", "TI", "TI Sitara AM64x", "ARM64", "Cortex-A53"],
  ["AT91SAM9G20B-CU", "Atmel", "Microchip SAM9", "ARM32", "ARM926EJ-S"],
  ["AT91SAM9260B-CU", "Microchip", "Microchip SAM9", "ARM32", "ARM926EJ-S"],
  ["SAM9X60D1G-I/LZB", "Microchip", "Microchip SAM9", "ARM32", "ARM926EJ-S"],
  ["ATSAMA5D27C-D1G-CU", "Microchip", "Microchip SAMA5", "ARM32", "Cortex-A5"],
  ["ATSAMA5D31A-CU", "ATMEL", "Microchip SAMA5", "ARM32", "Cortex-A5"],
  ["K230D", "Canaan Kendryte", "Canaan K230", "RISC-V64", "XuanTie C908"],
  ["CV1800B", "CVITEK", "SOPHGO CV1800B", "RISC-V64", "XuanTie C906"],
  ["SG2002", "SOPHGO", "SOPHGO SG2002", "RISC-V64", "XuanTie C906"],
] as const

describe("getLinuxProcessorInfo", () => {
  it.each(knownParts)(
    "recognizes %s from %s",
    (mfr, manufacturer, chipFamily, architecture, cpuCore) => {
      expect(getLinuxProcessorInfo(makePart({ mfr, manufacturer }))).toEqual({
        chip_family: chipFamily,
        architecture,
        cpu_core: cpuCore,
      })
    },
  )

  it("classifies normalized DigiKey product data and reports only the application CPU", () => {
    const part = normalizeProduct({
      ManufacturerProductNumber: "STM32MP157AAC3",
      Manufacturer: { Name: "STMicroelectronics" },
      Description: {
        ProductDescription: "IC MPU STM32MP1 650MHZ 361TFBGA",
        DetailedDescription: "ARM Cortex-A7 Microprocessor IC STM32MP1",
      },
      ProductVariations: [
        {
          DigiKeyProductNumber: "497-STM32MP157AAC3-ND",
          QuantityAvailableforPackageType: 25,
        },
      ],
      Parameters: [
        {
          ParameterText: "Core Processor",
          ValueText: "ARM Cortex-A7, Cortex-M4",
        },
        { ParameterText: "Package / Case", ValueText: "361-TFBGA" },
      ],
      Category: { Name: "Embedded - Microprocessors" },
    })!
    const original = structuredClone(part)
    expect(getLinuxProcessorInfo(part)).toEqual({
      chip_family: "ST STM32MP1",
      architecture: "ARM32",
      cpu_core: "Cortex-A7",
    })
    expect(part).toEqual(original)
  })

  it.each([
    ["STM32F103C8T6", "STMicroelectronics"],
    ["STM32H743ZIT6", "STMicroelectronics"],
    ["STM32N657L0H3Q", "STMicroelectronics"],
    ["MIMXRT1176DVMAA", "NXP USA Inc."],
    ["AM2434BSFFHIALV", "Texas Instruments"],
    ["AM2634CCZCZRQ1", "Texas Instruments"],
    ["ESP32-S3", "Espressif Systems"],
    ["ESP32-C6", "Espressif Systems"],
    ["K210", "Canaan"],
    ["CH32V307VCT6", "WCH"],
    ["RK2108", "Rockchip"],
    ["D123", "Allwinner"],
    ["A200", "Allwinner"],
    ["RK3588", "Unrelated Semiconductor"],
    ["FUTURE-LINUX-PROCESSOR", "Allwinner"],
    ["ATSAMA5D27-SOM1", "Microchip Technology"],
    ["STM32MP157D-DK1", "STMicroelectronics"],
    ["LCKFB-TSPI1F-RK3566-0G-0G", "Rockchip"],
  ])("excludes MCU, unknown family or non-chip %s", (mfr, manufacturer) => {
    expect(
      getLinuxProcessorInfo(
        makePart({
          mfr,
          manufacturer,
          description: "ARM RISC-V Linux processor",
          parameters: { "Core Processor": "Cortex-A7" },
        }),
      ),
    ).toBeNull()
  })

  it.each(["", " ", "JLCPCB Assembly"])(
    "requires a silicon manufacturer instead of %s",
    (manufacturer) => {
      expect(getLinuxProcessorInfo(makePart({ manufacturer }))).toBeNull()
    },
  )

  it("normalizes manufacturer and part-number whitespace without changing family matching", () => {
    expect(
      getLinuxProcessorInfo(
        makePart({
          manufacturer: "  stmicroelectronics ",
          mfr: " stm32mp157aac3  ",
        }),
      )?.chip_family,
    ).toBe("ST STM32MP1")
  })

  it.each([
    { category: "Embedded - Microcontroller, Microprocessor, FPGA Modules" },
    { description: "STM32MP157 evaluation board" },
    { detailed_description: "System-on-module with STM32MP157" },
    { parameters: { Type: "MPU Module" } },
    { package: "Module" },
    { package: "SOT-23" },
    { detailed_description: "transistor" },
  ])("rejects module, board or discrete metadata: %j", (overrides) => {
    expect(getLinuxProcessorInfo(makePart(overrides))).toBeNull()
  })

  it("accepts DigiKey pin-count package forms when descriptions and categories are absent", () => {
    const noText = {
      description: "",
      detailed_description: "",
      category: "",
      subcategory: "",
      parameters: {},
    }
    for (const packageName of [
      "361-TFBGA",
      "324-LFBGA",
      "88-VFQFN Exposed Pad",
      "LFBGA-361(12x12)",
    ]) {
      expect(
        getLinuxProcessorInfo(makePart({ ...noText, package: packageName })),
        packageName,
      ).not.toBeNull()
    }
    expect(
      getLinuxProcessorInfo(makePart({ ...noText, package: "" })),
    ).toBeNull()
    expect(
      getLinuxProcessorInfo(
        makePart({
          ...noText,
          package: "",
          parameters: { "Supplier Device Package": "361-TFBGA (12x12)" },
        }),
      ),
    ).not.toBeNull()
  })

  it("uses detailed descriptions and processor parameters as classification evidence", () => {
    const noText = {
      package: "",
      description: "",
      detailed_description: "",
      category: "",
      subcategory: "",
      parameters: {},
    }
    expect(
      getLinuxProcessorInfo(
        makePart({
          ...noText,
          detailed_description: "ARM Cortex-A7 Microprocessor IC",
        }),
      ),
    ).not.toBeNull()
    expect(
      getLinuxProcessorInfo(
        makePart({
          ...noText,
          parameters: { "Core Processor": "ARM Cortex-A7, Cortex-M4" },
        }),
      ),
    ).not.toBeNull()
  })
})
