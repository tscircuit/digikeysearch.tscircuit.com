import type { NormalizedPart } from "./types"

export interface LinuxProcessorInfo {
  chip_family: string
  architecture: string
  cpu_core: string
}

interface LinuxProcessorFamilyRule {
  manufacturerPattern: RegExp
  mfrPattern: RegExp
  chipFamily: string
  architecture: "ARM32" | "ARM64" | "RISC-V64"
  cpuCore: string
}

const manufacturers = {
  allwinner: /(?:\ballwinner\b|全志)/i,
  rockchip: /(?:\brockchip\b|瑞芯微)/i,
  st: /\b(?:st\s*micro(?:electronics)?|stmicroelectronics)\b/i,
  nxp: /\b(?:nxp|freescale)\b/i,
  ti: /(?:\b(?:ti|texas instruments)\b|德州仪器)/i,
  microchip: /\b(?:microchip|atmel)\b/i,
  canaan: /\b(?:canaan|kendryte)\b/i,
  sophgo: /\b(?:sophgo|cvitek)\b/i,
} as const

const family = (
  manufacturer: keyof typeof manufacturers,
  prefix: string,
  cpuCore: string,
  architecture: LinuxProcessorFamilyRule["architecture"],
  mfrPattern = new RegExp(
    `^${prefix}(?:[A-Z][A-Z0-9]*)?(?:[-+][A-Z0-9]+)*$`,
    "i",
  ),
): LinuxProcessorFamilyRule => ({
  manufacturerPattern: manufacturers[manufacturer],
  mfrPattern,
  chipFamily: `${
    {
      allwinner: "Allwinner",
      rockchip: "Rockchip",
      st: "ST",
      nxp: "NXP",
      ti: "TI",
      microchip: "Microchip",
      canaan: "Canaan",
      sophgo: "SOPHGO",
    }[manufacturer]
  } ${prefix}`,
  architecture,
  cpuCore,
})

/**
 * Curated processors with an MMU and documented Linux support. Neither an ARM
 * or RISC-V label nor "Linux" in a description is sufficient. Match the chip
 * MPN and its silicon manufacturer; reject modules and discrete collisions.
 * Sources and the coverage policy: docs/linux-capable-processors.md.
 * cpuCore identifies the application CPU, not auxiliary real-time cores.
 */
export const LINUX_PROCESSOR_FAMILY_RULES: readonly LinuxProcessorFamilyRule[] =
  [
    ...["F1C100S", "F1C200S"].map((part) =>
      family(
        "allwinner",
        part,
        "ARM926EJ-S",
        "ARM32",
        new RegExp(`^${part}$`, "i"),
      ),
    ),
    ...["A10", "A13"].map((part) =>
      family(
        "allwinner",
        part,
        "Cortex-A8",
        "ARM32",
        new RegExp(`^${part}$`, "i"),
      ),
    ),
    ...["A20", "A33", "H3", "V3S"].map((part) =>
      family(
        "allwinner",
        part,
        "Cortex-A7",
        "ARM32",
        new RegExp(`^${part}$`, "i"),
      ),
    ),
    family(
      "allwinner",
      "T113",
      "Cortex-A7",
      "ARM32",
      /^T113(?:-(?:S[34]|I))?$/i,
    ),
    ...["A64", "H5", "H6", "H616", "H618", "A133", "T507"].map((part) =>
      family(
        "allwinner",
        part,
        "Cortex-A53",
        "ARM64",
        new RegExp(`^${part}$`, "i"),
      ),
    ),
    family(
      "allwinner",
      "T527",
      "Cortex-A55",
      "ARM64",
      /^T527(?:M[A-Z0-9]*)?$/i,
    ),
    family("allwinner", "D1", "XuanTie C906", "RISC-V64", /^D1(?:S|-H)?$/i),
    family(
      "allwinner",
      "F133",
      "XuanTie C906",
      "RISC-V64",
      /^F133(?:-[AB])?$/i,
    ),
    family("rockchip", "RK3036", "Cortex-A7", "ARM32"),
    ...["RK3066", "RK3188"].map((part) =>
      family("rockchip", part, "Cortex-A9", "ARM32"),
    ),
    family("rockchip", "RK3288", "Cortex-A17", "ARM32"),
    ...["RK3308", "RK3328", "RK3368"].map((part) =>
      family("rockchip", part, "Cortex-A53", "ARM64"),
    ),
    family("rockchip", "RK3399", "Cortex-A72 + Cortex-A53", "ARM64"),
    family("rockchip", "RK3506", "Cortex-A7", "ARM32"),
    ...["RK3562", "RK3566", "RK3568"].map((part) =>
      family("rockchip", part, "Cortex-A55", "ARM64"),
    ),
    family("rockchip", "RK3576", "Cortex-A72 + Cortex-A53", "ARM64"),
    family("rockchip", "RK3588", "Cortex-A76 + Cortex-A55", "ARM64"),
    ...["RV1103", "RV1106", "RV1109"].map((part) =>
      family("rockchip", part, "Cortex-A7", "ARM32"),
    ),
    // RV1126B is a newer Cortex-A53 design; check it before the original RV1126.
    family("rockchip", "RV1126B", "Cortex-A53", "ARM64"),
    family("rockchip", "RV1126", "Cortex-A7", "ARM32", /^RV1126$/i),
    {
      ...family("st", "STM32MP1", "Cortex-A7", "ARM32"),
      mfrPattern: /^STM32MP1(?:3[135]|5[137])[A-Z][A-Z0-9]*$/i,
    },
    {
      ...family("st", "STM32MP2", "Cortex-A35", "ARM64"),
      mfrPattern: /^STM32MP2(?:[13][135]|5[1357])[A-Z][A-Z0-9]*$/i,
    },
    {
      ...family("nxp", "i.MX 6UltraLite/ULL", "Cortex-A7", "ARM32"),
      mfrPattern: /^M(?:C)?IMX6[GY][A-Z0-9]+$/i,
    },
    {
      ...family("nxp", "i.MX 6", "Cortex-A9", "ARM32"),
      mfrPattern: /^M(?:C)?IMX6[DLQSU][A-Z0-9]+$/i,
    },
    {
      ...family("nxp", "i.MX 7", "Cortex-A7", "ARM32"),
      mfrPattern: /^M(?:C)?IMX7[DSU][A-Z0-9]+$/i,
    },
    ...[
      ["MIMX8MM", "i.MX 8M Mini"],
      ["MIMX8MN", "i.MX 8M Nano"],
      ["MIMX8MQ", "i.MX 8M Quad"],
      ["MIMX8ML", "i.MX 8M Plus"],
    ].map(
      ([prefix, name]): LinuxProcessorFamilyRule => ({
        ...family(
          "nxp",
          prefix!,
          "Cortex-A53",
          "ARM64",
          new RegExp(`^${prefix}[0-9][A-Z0-9]+$`, "i"),
        ),
        chipFamily: `NXP ${name}`,
      }),
    ),
    ...[
      ["MIMX91", "i.MX 91"],
      ["MIMX93", "i.MX 93"],
      ["MIMX95", "i.MX 95"],
    ].map(
      ([prefix, name]): LinuxProcessorFamilyRule => ({
        ...family(
          "nxp",
          prefix!,
          "Cortex-A55",
          "ARM64",
          new RegExp(`^${prefix}[0-9][A-Z0-9]+$`, "i"),
        ),
        chipFamily: `NXP ${name}`,
      }),
    ),
    ...[
      ["AM335", "Cortex-A8", "ARM32"],
      ["AM437", "Cortex-A9", "ARM32"],
      ["AM57", "Cortex-A15", "ARM32"],
      ["AM62", "Cortex-A53", "ARM64"],
      ["AM64", "Cortex-A53", "ARM64"],
      ["AM65", "Cortex-A53", "ARM64"],
    ].map(
      ([prefix, core, architecture]): LinuxProcessorFamilyRule => ({
        ...family("ti", prefix!, core!, architecture as "ARM32" | "ARM64"),
        // AM62A/AM62P are A53 designs too. Do not admit Cortex-R AM24/AM26 MCUs.
        mfrPattern: new RegExp(
          `^${prefix}${prefix === "AM62" ? "(?:[0-9]|[AP][0-9])" : "[0-9]"}[A-Z0-9]*(?:-Q1)?$`,
          "i",
        ),
        chipFamily: `TI Sitara ${prefix}x`,
      }),
    ),
    {
      ...family("microchip", "SAM9", "ARM926EJ-S", "ARM32"),
      mfrPattern:
        /^(?:AT91|AT)?SAM9(?:260|261|263|G10|G15|G20|G25|G35|G45|G46|M10|M11|N12|CN11|CN12|X25|X35|X60|X70|X72|X75)[A-Z0-9]*(?:[-/][A-Z0-9]+)*$/i,
    },
    {
      ...family("microchip", "SAMA5", "Cortex-A5", "ARM32"),
      mfrPattern: /^(?:AT)?SAMA5D[234][0-9][A-Z0-9]*(?:-[A-Z0-9]+)*$/i,
    },
    family("canaan", "K230", "XuanTie C908", "RISC-V64", /^K230D?$/i),
    family("sophgo", "CV1800B", "XuanTie C906", "RISC-V64", /^CV1800B$/i),
    family("sophgo", "SG2002", "XuanTie C906", "RISC-V64", /^SG2002$/i),
  ]

/** Classifies normalized DigiKey parts without changing their catalog fields. */
export const getLinuxProcessorInfo = (
  part: NormalizedPart,
): LinuxProcessorInfo | null => {
  const manufacturer = (part.manufacturer ?? "").trim()
  const mfr = (part.mfr ?? "").trim()
  if (!manufacturer || !mfr) return null

  const rule = LINUX_PROCESSOR_FAMILY_RULES.find(
    (candidate) =>
      candidate.mfrPattern.test(mfr) &&
      candidate.manufacturerPattern.test(manufacturer),
  )
  if (!rule) return null

  const parameters = part.parameters ?? {}
  const packageNames = [
    part.package,
    parameters["Package / Case"],
    parameters["Supplier Device Package"],
  ].filter(Boolean)
  const classification = [
    part.description,
    part.detailed_description,
    part.category,
    part.subcategory,
    ...Object.entries(parameters).flat(),
  ]
    .filter(Boolean)
    .join(" ")
  if (
    packageNames.some((value) =>
      /^(?:SOD|SOT|DO-|SM[ABCD]|TO-|MODULE)/i.test(value),
    ) ||
    /\bmodules?\b/i.test(`${part.category} ${part.subcategory}`) ||
    /\b(?:diodes?|transistors?|development boards?|evaluation (?:boards?|kits?)|system[- ]on[- ]modules?|compute modules?|(?:processor|mpu|mcu) modules?)\b/i.test(
      classification,
    ) ||
    /(?:^|[-_])(?:SOM|EK|EVK|EVB|EVM|DK)(?:[-_]|[0-9]|$)/i.test(mfr)
  )
    return null

  // DigiKey package names commonly begin with a pin count, e.g. 361-TFBGA.
  if (
    !/\b(?:microcontrollers?|microprocessors?|processors?|mpu|soc|system[- ]on[- ]chip)\b/i.test(
      classification,
    ) &&
    !packageNames.some((value) =>
      /^(?:[0-9]+[- ])?(?:[A-Z]*BGA|[A-Z]*QFN|[A-Z]*QFP|[A-Z]*CSP|LGA)(?:[-_( ]|[0-9]|$)/i.test(
        value,
      ),
    )
  )
    return null

  return {
    chip_family: rule.chipFamily,
    architecture: rule.architecture,
    cpu_core: rule.cpuCore,
  }
}
