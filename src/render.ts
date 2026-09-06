import { CATEGORY_DEFINITIONS, type CategoryDefinition } from "./categories"
import type {
  DigiKeyFilterOptions,
  NormalizedPart,
  SearchPayload,
} from "./types"

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const titleCase = (value: string): string =>
  value
    .split(/[_/]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")

const renderBreadcrumbs = (pathname: string): string =>
  pathname
    .split("/")
    .filter(Boolean)
    .map(
      (part, index, parts) =>
        `<span><span class="px-0.5 text-gray-500">/</span>${
          index === parts.length - 1
            ? `<a href="/${parts.slice(0, index + 1).join("/")}">${escapeHtml(part)}</a>`
            : `<span class="px-0.5 text-gray-500">${escapeHtml(part)}</span>`
        }</span>`,
    )
    .join("")

const jsonUrl = (requestUrl: string, pathname: string): string => {
  const url = new URL(requestUrl)
  if (!url.pathname.endsWith(".json")) url.pathname = `${pathname}.json`
  return url.toString()
}

const renderShell = (
  pathname: string,
  body: string,
  title = "DigiKey Parts Search",
  requestUrl?: string,
): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style type="text/tailwindcss">
a { @apply underline text-blue-600 hover:text-blue-800 visited:text-purple-600 m-1 }
h2 { @apply text-xl font-bold my-2 }
input, select { @apply border border-gray-300 rounded p-1 ml-0.5 }
form { @apply inline-flex flex-col gap-2 border border-gray-300 rounded p-2 m-2 text-xs }
button { @apply bg-blue-500 hover:bg-blue-700 text-white font-bold py-0.5 px-3 rounded }
.wrapper { @apply min-h-screen flex flex-col }
.content { @apply flex-grow }
.footer { @apply text-center py-2 text-xs text-gray-600 border-t border-gray-300 mt-4 }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="border-b border-gray-300 py-1 flex justify-between items-center gap-2">
        <div>
          <span class="px-1 pr-2">DigiKey In-Stock Parts Engine (Unofficial)</span>
          <span><a href="/">home</a></span>
          ${renderBreadcrumbs(pathname)}
        </div>
        <div class="flex flex-row items-center gap-2">
          <form action="/components/list" method="GET" class="flex flex-row border-none py-0 my-0">
            <input type="text" name="search" placeholder="Search Description, MFR, or DigiKey PN" class="border m-0 mr-2" autocomplete="on" />
            <button type="submit" class="border px-3 py-1 m-0">Search</button>
          </form>
          <a href="https://github.com/tscircuit/digikeysearch.tscircuit.com">GitHub</a>
          ${requestUrl && pathname.includes("/list") ? `<a href="${escapeHtml(jsonUrl(requestUrl, pathname))}">json</a>` : ""}
          <a href="https://tscircuit.com">tscircuit</a>
        </div>
      </div>
      <main class="flex flex-col text-xs p-1 content">${body}</main>
      <footer class="footer">© ${new Date().getFullYear()} tscircuit. All rights reserved. By using this site, you agree to the<a href="https://tscircuit.com/legal/terms-of-service.html">terms of service</a>. This site is from tscircuit, not DigiKey; we are customers helping other customers.</footer>
    </div>
  </body>
</html>`

export const renderHomePage = (): string => {
  const links = [
    { path: "/categories/list", label: "Categories" },
    { path: "/footprint_index/list", label: "Package Index" },
    ...CATEGORY_DEFINITIONS,
  ]
    .map(
      ({ path, label }) =>
        `<a href="${escapeHtml(path)}">${escapeHtml(label)}</a>`,
    )
    .join("")

  return renderShell(
    "/",
    `<div><div class="flex flex-wrap gap-4 *:text-lg *:border *:rounded *:p-2 *:border-gray-300 *:w-32 *:text-sm *:text-center">${links}</div></div>`,
  )
}

const renderStaticFilters = (
  category: CategoryDefinition | undefined,
  url: URL,
): string =>
  (category?.filters ?? [])
    .map(
      (filter) => `<div>
        <label>${escapeHtml(filter.label)}:</label>
        <input name="${escapeHtml(filter.name)}" value="${escapeHtml(url.searchParams.get(filter.name) ?? "")}" placeholder="${escapeHtml(filter.placeholder ?? "")}" autocomplete="on" />
      </div>`,
    )
    .join("")

const renderManufacturerFilter = (
  options: DigiKeyFilterOptions,
  url: URL,
): string => {
  const manufacturers = (options.Manufacturers ?? []).slice(0, 100)
  if (manufacturers.length === 0) return ""
  const selected = url.searchParams.get("manufacturer") ?? ""
  return `<div><label>Manufacturer:</label><select name="manufacturer">
    <option value="">All</option>
    ${manufacturers
      .map(
        (manufacturer) =>
          `<option value="${escapeHtml(manufacturer.Id)}"${String(manufacturer.Id) === selected ? " selected" : ""}>${escapeHtml(manufacturer.Value ?? manufacturer.Id)} (${Number(manufacturer.ProductCount ?? 0).toLocaleString("en-US")})</option>`,
      )
      .join("")}
  </select></div>`
}

const renderParametricFilters = (
  options: DigiKeyFilterOptions,
  url: URL,
): string =>
  (options.ParametricFilters ?? [])
    .filter(
      (filter) =>
        filter.Category?.Id &&
        filter.ParameterId &&
        filter.ParameterName &&
        (filter.FilterValues?.length ?? 0) > 0,
    )
    .slice(0, 12)
    .map((filter) => {
      const name = `param_${filter.Category?.Id}_${filter.ParameterId}`
      const selected = url.searchParams.get(name) ?? ""
      return `<div><label>${escapeHtml(filter.ParameterName)}:</label><select name="${escapeHtml(name)}">
        <option value="">All</option>
        ${(filter.FilterValues ?? [])
          .slice(0, 100)
          .map(
            (value) =>
              `<option value="${escapeHtml(value.ValueId)}"${value.ValueId === selected ? " selected" : ""}>${escapeHtml(value.ValueName)} (${Number(value.ProductCount ?? 0).toLocaleString("en-US")})</option>`,
          )
          .join("")}
      </select></div>`
    })
    .join("")

const renderFilters = (
  category: CategoryDefinition | undefined,
  payload: SearchPayload,
  url: URL,
): string => {
  const queryField = category
    ? ""
    : `<div><label>Search:</label><input name="search" value="${escapeHtml(url.searchParams.get("search") ?? url.searchParams.get("q") ?? "")}" /></div>`
  const filters = [
    queryField,
    renderStaticFilters(category, url),
    renderManufacturerFilter(payload.filter_options, url),
    renderParametricFilters(payload.filter_options, url),
  ].join("")

  return `<form method="GET" class="flex flex-row flex-wrap gap-4">${filters}<button type="submit">Filter</button></form>`
}

const formatPrice = (price: number): string =>
  price
    ? price.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : ""

const renderParameters = (parameters: Record<string, string>): string => {
  const entries = Object.entries(parameters)
  if (entries.length === 0) return ""
  return `<details><summary>${entries.length} params</summary><dl class="mt-1">${entries
    .map(
      ([name, value]) =>
        `<div><dt class="font-semibold inline">${escapeHtml(name)}:</dt> <dd class="inline">${escapeHtml(value)}</dd></div>`,
    )
    .join("")}</dl></details>`
}

const renderPartsTable = (
  parts: NormalizedPart[],
  showProcessorMetadata = false,
): string => {
  if (parts.length === 0) return "<p>No in-stock results found.</p>"
  const rows = parts
    .map(
      (part) => `<tr>
        <td class="border border-gray-300 p-1"><a href="${escapeHtml(part.product_url)}">${escapeHtml(part.digikey_product_number)}</a></td>
        <td class="border border-gray-300 p-1">${escapeHtml(part.mfr)}</td>
        <td class="border border-gray-300 p-1">${escapeHtml(part.manufacturer)}</td>
        <td class="border border-gray-300 p-1">${escapeHtml(part.package)}</td>
        ${showProcessorMetadata ? [part.chip_family, part.architecture, part.cpu_core].map((value) => `<td class="border border-gray-300 p-1">${escapeHtml(value)}</td>`).join("") : ""}
        <td class="border border-gray-300 p-1">${escapeHtml(part.description)}</td>
        <td class="border border-gray-300 p-1 text-right">${part.stock.toLocaleString("en-US")}</td>
        <td class="border border-gray-300 p-1 text-right">${escapeHtml(formatPrice(part.price))}</td>
        <td class="border border-gray-300 p-1">${renderParameters(part.parameters)}</td>
      </tr>`,
    )
    .join("")

  return `<table class="border border-gray-300 text-xs border-collapse p-1">
    <thead><tr>
      ${[
        "DigiKey PN",
        "MFR",
        "Manufacturer",
        "Package",
        ...(showProcessorMetadata
          ? ["Chip Family", "Architecture", "CPU Core"]
          : []),
        "Description",
        "Stock",
        "Price",
        "Parameters",
      ]
        .map(
          (column) => `<th class="p-1 border border-gray-300">${column}</th>`,
        )
        .join("")}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

export const renderSearchPage = (
  pathname: string,
  label: string,
  category: CategoryDefinition | undefined,
  payload: SearchPayload,
  requestUrl: string,
): string => {
  const url = new URL(requestUrl)
  const isLinuxProcessorCategory =
    category?.path === "/linux_capable_processors/list"
  const description = isLinuxProcessorCategory
    ? '<p class="my-1 text-gray-600">Application processors with documented Linux support.</p>'
    : ""
  const freshness = payload.stale
    ? `<span class="text-amber-700">Serving stale cache while DigiKey refreshes.</span>`
    : payload.cached
      ? `<span class="text-gray-600">Cached until ${escapeHtml(payload.cache_expires_at)}.</span>`
      : `<span class="text-gray-600">Fresh from DigiKey; cached until ${escapeHtml(payload.cache_expires_at)}.</span>`

  return renderShell(
    pathname,
    `<div><h2>${escapeHtml(label)}</h2>${description}${renderFilters(category, payload, url)}<div class="my-1">${freshness} ${payload.total.toLocaleString("en-US")} matching products.</div>${renderPartsTable(payload.components, isLinuxProcessorCategory)}</div>`,
    `${label} - DigiKey Parts Search`,
    requestUrl,
  )
}

export const renderSimpleTablePage = (
  pathname: string,
  label: string,
  rows: Array<Record<string, unknown>>,
  requestUrl: string,
): string => {
  const columns = Object.keys(rows[0] ?? {})
  const table =
    rows.length === 0
      ? "<p>The on-demand index is empty. Search for parts to populate it.</p>"
      : `<table class="border border-gray-300 text-xs border-collapse p-1"><thead><tr>${columns.map((column) => `<th class="p-1 border border-gray-300">${escapeHtml(titleCase(column))}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td class="border border-gray-300 p-1">${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("")}</tbody></table>`
  return renderShell(
    pathname,
    `<div><h2>${escapeHtml(label)}</h2>${table}</div>`,
    `${label} - DigiKey Parts Search`,
    requestUrl,
  )
}

export const renderErrorPage = (
  pathname: string,
  status: number,
  message: string,
): string =>
  renderShell(
    pathname,
    `<div><h2>${status}</h2><p>${escapeHtml(message)}</p></div>`,
    `${status} - DigiKey Parts Search`,
  )
