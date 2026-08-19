export interface CategoryDefinition {
  path: string
  label: string
  query: string
  responseKey: string
  filters?: Array<{ name: string; label: string; placeholder?: string }>
  requiredPostFilters?: Record<string, string>
}

const commonPackage = {
  name: "package",
  label: "Package",
  placeholder: "0603",
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    path: "/resistors/list",
    label: "Resistors",
    query: "resistor",
    responseKey: "resistors",
    filters: [
      commonPackage,
      { name: "resistance", label: "Resistance", placeholder: "10k" },
    ],
  },
  {
    path: "/resistor_arrays/list",
    label: "Resistor Arrays",
    query: "resistor array",
    responseKey: "resistor_arrays",
    filters: [commonPackage],
  },
  {
    path: "/capacitors/list",
    label: "Capacitors",
    query: "capacitor",
    responseKey: "capacitors",
    filters: [
      commonPackage,
      { name: "capacitance", label: "Capacitance", placeholder: "100nF" },
    ],
  },
  {
    path: "/potentiometers/list",
    label: "Potentiometers",
    query: "potentiometer",
    responseKey: "potentiometers",
    filters: [
      commonPackage,
      { name: "resistance", label: "Resistance", placeholder: "10k" },
    ],
  },
  {
    path: "/headers/list",
    label: "Headers",
    query: "pin header connector",
    responseKey: "headers",
    filters: [
      { name: "pitch", label: "Pitch", placeholder: "2.54mm" },
      { name: "num_pins", label: "Pins", placeholder: "8" },
      { name: "gender", label: "Gender", placeholder: "male" },
    ],
  },
  {
    path: "/barrel_jacks/list",
    label: "Barrel Jacks",
    query: "DC power jack connector",
    responseKey: "barrel_jacks",
    requiredPostFilters: { barrel_jack: "true" },
    filters: [
      {
        name: "inside_diameter_mm",
        label: "Inside Diameter",
        placeholder: "2.1mm",
      },
      {
        name: "outside_diameter_mm",
        label: "Outside Diameter",
        placeholder: "5.5mm",
      },
      {
        name: "mounting_style",
        label: "Mounting",
        placeholder: "Through Hole",
      },
    ],
  },
  {
    path: "/dimm_connectors/list",
    label: "DIMM Connectors",
    query: "DIMM connector",
    responseKey: "dimm_connectors",
    filters: [commonPackage],
  },
  {
    path: "/sodimm_connectors/list",
    label: "SO-DIMM Connectors",
    query: "SO-DIMM connector",
    responseKey: "sodimm_connectors",
    filters: [commonPackage],
  },
  {
    path: "/usb_c_connectors/list",
    label: "USB-C Connectors",
    query: "USB Type-C connector",
    responseKey: "usb_c_connectors",
    filters: [commonPackage],
  },
  {
    path: "/micro_usb_connectors/list",
    label: "Micro USB Connectors",
    query: "USB micro connector",
    responseKey: "micro_usb_connectors",
    requiredPostFilters: { connector_type: "micro" },
    filters: [
      commonPackage,
      { name: "number_of_contacts", label: "Contacts", placeholder: "5" },
      { name: "gender", label: "Gender", placeholder: "Receptacle" },
    ],
  },
  {
    path: "/pcie_m2_connectors/list",
    label: "PCIe M.2 Connectors",
    query: "M.2 card edge connector",
    responseKey: "pcie_m2_connectors",
  },
  {
    path: "/fpc_connectors/list",
    label: "FPC Connectors",
    query: "FPC FFC connector",
    responseKey: "fpc_connectors",
  },
  {
    path: "/jst_connectors/list",
    label: "JST Connectors",
    query: "JST connector",
    responseKey: "jst_connectors",
  },
  {
    path: "/wire_to_board_connectors/list",
    label: "Wire to Board Connectors",
    query: "wire to board connector",
    responseKey: "wire_to_board_connectors",
  },
  {
    path: "/spring_clamp_terminal_blocks/list",
    label: "Spring Clamp Terminal Blocks",
    query: "spring clamp terminal block",
    responseKey: "spring_clamp_terminal_blocks",
  },
  {
    path: "/battery_holders/list",
    label: "Battery Holders",
    query: "battery holder",
    responseKey: "battery_holders",
  },
  {
    path: "/ble_modules/list",
    label: "BLE Modules",
    query: "Bluetooth low energy RF module",
    responseKey: "ble_modules",
  },
  {
    path: "/ble_chips/list",
    label: "BLE Chips",
    query: "Bluetooth low energy IC",
    responseKey: "ble_chips",
    filters: [commonPackage],
  },
  {
    path: "/leds/list",
    label: "LEDs",
    query: "LED indication discrete",
    responseKey: "leds",
    filters: [commonPackage, { name: "color", label: "Color" }],
  },
  {
    path: "/adcs/list",
    label: "ADCs",
    query: "analog to digital converter ADC",
    responseKey: "adcs",
    filters: [commonPackage],
  },
  {
    path: "/analog_multiplexers/list",
    label: "Analog Muxes",
    query: "analog multiplexer switch IC",
    responseKey: "multiplexers",
    filters: [commonPackage],
  },
  {
    path: "/io_expanders/list",
    label: "I/O Expanders",
    query: "I/O expander IC",
    responseKey: "io_expanders",
    filters: [commonPackage],
  },
  {
    path: "/gyroscopes/list",
    label: "Gyroscopes",
    query: "gyroscope sensor",
    responseKey: "gyroscopes",
    filters: [commonPackage],
  },
  {
    path: "/accelerometers/list",
    label: "Accelerometers",
    query: "accelerometer sensor",
    responseKey: "accelerometers",
    filters: [commonPackage],
  },
  {
    path: "/gas_sensors/list",
    label: "Gas Sensors",
    query: "gas sensor",
    responseKey: "gas_sensors",
  },
  {
    path: "/hdmi_ports/list",
    label: "HDMI Ports",
    query: "HDMI connector receptacle",
    responseKey: "hdmi_ports",
  },
  {
    path: "/microphones/list",
    label: "Microphones",
    query: "microphone",
    responseKey: "microphones",
    filters: [commonPackage],
  },
  {
    path: "/diodes/list",
    label: "Diodes",
    query: "diode",
    responseKey: "diodes",
    filters: [commonPackage],
  },
  {
    path: "/photo_diodes/list",
    label: "Photo Diodes",
    query: "photodiode",
    responseKey: "photo_diodes",
    filters: [commonPackage],
  },
  {
    path: "/dacs/list",
    label: "DACs",
    query: "digital to analog converter DAC",
    responseKey: "dacs",
    filters: [commonPackage],
  },
  {
    path: "/wifi_modules/list",
    label: "WiFi Modules",
    query: "WiFi RF module",
    responseKey: "wifi_modules",
  },
  {
    path: "/microcontrollers/list",
    label: "Microcontrollers",
    query: "microcontroller MCU",
    responseKey: "microcontrollers",
    filters: [commonPackage],
  },
  {
    path: "/arm_processors/list",
    label: "ARM Processors",
    query: "ARM microprocessor",
    responseKey: "arm_processors",
    filters: [commonPackage],
  },
  {
    path: "/risc_v_processors/list",
    label: "RISC-V Processors",
    query: "RISC-V processor",
    responseKey: "risc_v_processors",
    filters: [commonPackage],
  },
  {
    path: "/fpgas/list",
    label: "FPGAs & CPLDs",
    query: "FPGA CPLD",
    responseKey: "fpgas",
    filters: [commonPackage],
  },
  {
    path: "/voltage_regulators/list",
    label: "Voltage Regulators",
    query: "voltage regulator IC",
    responseKey: "regulators",
    filters: [commonPackage],
  },
  {
    path: "/ldos/list",
    label: "LDO Regulators",
    query: "LDO linear voltage regulator",
    responseKey: "ldos",
    filters: [commonPackage],
  },
  {
    path: "/boost_converters/list",
    label: "Boost DC-DC Converters",
    query: "boost step-up DC DC converter IC",
    responseKey: "boost_converters",
    filters: [commonPackage],
  },
  {
    path: "/buck_boost_converters/list",
    label: "Buck-Boost DC-DC Converters",
    query: "buck boost DC DC converter IC",
    responseKey: "buck_boost_converters",
    filters: [commonPackage],
  },
  {
    path: "/led_drivers/list",
    label: "LED Drivers",
    query: "LED driver IC",
    responseKey: "led_drivers",
    filters: [commonPackage],
  },
  {
    path: "/mosfets/list",
    label: "Mosfets",
    query: "MOSFET transistor",
    responseKey: "mosfets",
    filters: [commonPackage],
  },
  {
    path: "/led_with_ic/list",
    label: "LED with ICs",
    query: "addressable LED integrated controller",
    responseKey: "leds_with_ic",
    filters: [commonPackage],
  },
  {
    path: "/led_dot_matrix_display/list",
    label: "LED Dot Matrix Displays Modules",
    query: "LED dot matrix display",
    responseKey: "led_dot_matrix_displays",
  },
  {
    path: "/oled_display/list",
    label: "OLED Displays Modules",
    query: "OLED display module",
    responseKey: "oled_displays",
  },
  {
    path: "/led_segment_display/list",
    label: "LED Segment Display Modules",
    query: "seven segment LED display",
    responseKey: "led_segment_displays",
  },
  {
    path: "/lcd_display/list",
    label: "LCD Display Modules",
    query: "LCD display module",
    responseKey: "lcd_displays",
  },
  {
    path: "/lcd_drivers/list",
    label: "LCD Drivers",
    query: "LCD driver IC",
    responseKey: "lcd_drivers",
    filters: [commonPackage],
  },
  {
    path: "/tft_display_drivers/list",
    label: "TFT Display Drivers",
    query: "TFT display driver IC",
    responseKey: "tft_display_drivers",
    filters: [commonPackage],
  },
  {
    path: "/switches/list",
    label: "Switches",
    query: "switch",
    responseKey: "switches",
  },
  {
    path: "/relays/list",
    label: "Relays",
    query: "relay",
    responseKey: "relays",
  },
  {
    path: "/fuses/list",
    label: "Fuses",
    query: "fuse",
    responseKey: "fuses",
    filters: [commonPackage],
  },
  {
    path: "/bjt_transistors/list",
    label: "BJT Transistors",
    query: "BJT transistor",
    responseKey: "bjt_transistors",
    filters: [commonPackage],
  },
]

export const CATEGORY_BY_PATH = new Map(
  CATEGORY_DEFINITIONS.map((category) => [category.path, category]),
)

export const buildCategoryKeywords = (
  category: CategoryDefinition,
  params: URLSearchParams,
): string => {
  const values = (category.filters ?? [])
    .map((filter) => params.get(filter.name)?.trim())
    .filter((value): value is string => Boolean(value))

  return [category.query, ...values].join(" ")
}
