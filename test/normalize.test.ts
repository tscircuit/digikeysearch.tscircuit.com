import { describe, expect, it } from "vitest"
import { applyPostFilters, normalizeKeywordResponse } from "../src/normalize"

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
    const parts = [
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
})
