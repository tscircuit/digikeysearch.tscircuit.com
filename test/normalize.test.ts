import { describe, expect, it } from "vitest"
import { applyPostFilters, normalizeKeywordResponse } from "../src/normalize"
import type { NormalizedPart } from "../src/types"

describe("normalizeKeywordResponse", () => {
  it("selects the most-stocked non-marketplace variation and common fields", () => {
    const [part] = normalizeKeywordResponse({
      ProductsCount: 1,
      Products: [
        {
          ManufacturerProductNumber: "RC0603FR-0710KL",
          Manufacturer: { Name: "YAGEO" },
          Description: {
            ProductDescription: "RES 10K OHM 1% 1/10W 0603",
            DetailedDescription: "Thick film resistor",
          },
          QuantityAvailable: 1500,
          UnitPrice: 0.01,
          ProductUrl: "https://www.digikey.com/example",
          ProductVariations: [
            {
              DigiKeyProductNumber: "MARKET-ND",
              MarketPlace: true,
              QuantityAvailableforPackageType: 9000,
            },
            {
              DigiKeyProductNumber: "311-10.0KHRCT-ND",
              MarketPlace: false,
              QuantityAvailableforPackageType: 1200,
            },
          ],
          Parameters: [
            {
              ParameterText: "Package / Case",
              ValueText: "0603 (1608 Metric)",
            },
            { ParameterText: "Resistance", ValueText: "10 kOhms" },
          ],
          Category: { Name: "Chip Resistor - Surface Mount" },
        },
      ],
    })

    expect(part).toMatchObject({
      digikey_product_number: "311-10.0KHRCT-ND",
      supplier_part_number: "311-10.0KHRCT-ND",
      mfr: "RC0603FR-0710KL",
      manufacturer: "YAGEO",
      package: "0603 (1608 Metric)",
      stock: 1200,
      price: 0.01,
      marketplace: false,
    })
    expect(part.parameters.Resistance).toBe("10 kOhms")
  })

  it("applies exact package filters without 0603 metric-size collisions", () => {
    const parts: NormalizedPart[] = [
      {
        digikey_product_number: "0603-ND",
        supplier_part_number: "0603-ND",
        mfr: "A",
        manufacturer: "Maker",
        package: "0603 (1608 Metric)",
        description: "resistor",
        detailed_description: "",
        stock: 100,
        price: 0.1,
        category: "Resistors",
        subcategory: "Resistors",
        product_url: "",
        datasheet_url: "",
        photo_url: "",
        normally_stocking: true,
        discontinued: false,
        marketplace: false,
        parameters: { "Supplier Device Package": "0603" },
      },
      {
        digikey_product_number: "0201-ND",
        supplier_part_number: "0201-ND",
        mfr: "B",
        manufacturer: "Maker",
        package: "0201 (0603 Metric)",
        description: "resistor",
        detailed_description: "",
        stock: 100,
        price: 0.1,
        category: "Resistors",
        subcategory: "Resistors",
        product_url: "",
        datasheet_url: "",
        photo_url: "",
        normally_stocking: true,
        discontinued: false,
        marketplace: false,
        parameters: { "Supplier Device Package": "0201" },
      },
    ]

    expect(applyPostFilters(parts, { package: "0603" })).toHaveLength(1)
    expect(applyPostFilters(parts, { package: "0603" })[0].mfr).toBe("A")
  })

  it("keeps Micro USB category results from including full-size USB-B", () => {
    const parts: NormalizedPart[] = [
      {
        digikey_product_number: "USB-B-ND",
        supplier_part_number: "USB-B-ND",
        mfr: "USB-B1HSB6",
        manufacturer: "Maker",
        package: "",
        description: "CONN RCPT TYPEB 4POS R/A",
        detailed_description: "USB-B receptacle connector",
        stock: 138_792,
        price: 0.6,
        category: "Connectors",
        subcategory: "Connectors",
        product_url: "",
        datasheet_url: "",
        photo_url: "",
        normally_stocking: true,
        discontinued: false,
        marketplace: false,
        parameters: { "Connector Type": "USB-B (USB TYPE-B)" },
      },
      {
        digikey_product_number: "MICRO-B-ND",
        supplier_part_number: "MICRO-B-ND",
        mfr: "10118194-0001LF",
        manufacturer: "Maker",
        package: "",
        description: "CONN RCPT USB2.0 MICRO B SMD R/A",
        detailed_description: "USB - micro B receptacle connector",
        stock: 86_342,
        price: 0.5,
        category: "Connectors",
        subcategory: "Connectors",
        product_url: "",
        datasheet_url: "",
        photo_url: "",
        normally_stocking: true,
        discontinued: false,
        marketplace: false,
        parameters: {
          "Connector Type": "USB - micro B",
          "Number of Contacts": "5",
        },
      },
    ]

    expect(applyPostFilters(parts, { connector_type: "micro" })).toEqual([
      parts[1],
    ])
  })

  it("keeps barrel jack results from including phone jacks", () => {
    const parts: NormalizedPart[] = [
      {
        digikey_product_number: "SJ1-3533NG-ND",
        supplier_part_number: "SJ1-3533NG-ND",
        mfr: "SJ1-3533NG",
        manufacturer: "Maker",
        package: "",
        description: "CONN JACK STEREO 3.5MM R/A",
        detailed_description: "3.5mm phone jack",
        stock: 100_000,
        price: 0.5,
        category: "Barrel Connector",
        subcategory: "Barrel Connector",
        product_url: "",
        datasheet_url: "",
        photo_url: "",
        normally_stocking: true,
        discontinued: false,
        marketplace: false,
        parameters: {
          "Connector Type": "Phone Jack",
          "Actual Diameter": '0.142" (3.60mm)',
        },
      },
      {
        digikey_product_number: "PJ-051AH-ND",
        supplier_part_number: "PJ-051AH-ND",
        mfr: "PJ-051AH",
        manufacturer: "Maker",
        package: "",
        description: "CONN PWR JACK 2.1X5.5MM SOLDER",
        detailed_description: "DC power jack connector",
        stock: 80_000,
        price: 0.7,
        category: "Barrel Connector",
        subcategory: "Barrel Connector",
        product_url: "",
        datasheet_url: "",
        photo_url: "",
        normally_stocking: true,
        discontinued: false,
        marketplace: false,
        parameters: {
          "Connector Type": "Jack",
          "Industry Recognized Mating Diameter":
            '2.10mm ID (0.083"), 5.50mm OD (0.217")',
          "Actual Diameter": '0.079" (2.00mm ID), 0.236" (6.00mm OD)',
          "Mounting Type": "Through Hole, Right Angle",
        },
      },
    ]

    expect(applyPostFilters(parts, { barrel_jack: "true" })).toEqual([parts[1]])
    expect(
      applyPostFilters(parts, {
        barrel_jack: "true",
        inside_diameter_mm: "2.1mm",
        outside_diameter_mm: "5.5mm",
      }),
    ).toEqual([parts[1]])
    expect(
      applyPostFilters(parts, {
        barrel_jack: "true",
        inside_diameter_mm: "2.5mm",
      }),
    ).toEqual([])
  })

  it("keeps DRAM results from including DIMM connectors", () => {
    const dram: NormalizedPart = {
      digikey_product_number: "557-1234-ND",
      supplier_part_number: "557-1234-ND",
      mfr: "MT40A512M16LY-062E",
      manufacturer: "Micron Technology",
      package: "FBGA-96",
      description: "IC DRAM 8GBIT PARALLEL 96FBGA",
      detailed_description: "SDRAM - DDR4 Memory IC 8Gbit Parallel",
      stock: 1200,
      price: 8.5,
      category: "Memory",
      subcategory: "Memory",
      product_url: "",
      datasheet_url: "",
      photo_url: "",
      normally_stocking: true,
      discontinued: false,
      marketplace: false,
      parameters: {
        "Memory Type": "Volatile",
        Technology: "SDRAM - DDR4",
        "Memory Size": "8Gbit",
        "Package / Case": "96-TFBGA",
        "Supplier Device Package": "96-FBGA",
      },
    }
    const connector: NormalizedPart = {
      ...dram,
      digikey_product_number: "DIMM-CONN-ND",
      supplier_part_number: "DIMM-CONN-ND",
      mfr: "DIMM-CONN",
      description: "DDR4 DIMM CONNECTOR",
      detailed_description: "Memory module connector",
      category: "Memory Connectors",
      subcategory: "Memory Connectors",
      parameters: {},
    }

    expect(applyPostFilters([dram, connector], { dram: "true" })).toEqual([
      dram,
    ])
    expect(
      applyPostFilters([dram], {
        dram: "true",
        memory_type: "DDR4",
        memory_size: "8Gbit",
        package: "96-FBGA",
      }),
    ).toEqual([dram])
  })
})
