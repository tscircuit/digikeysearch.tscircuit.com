import { buildCategoryKeywords, type CategoryDefinition } from "./categories"
import type { ParametricFilterSelection, SearchRequest } from "./types"

const clampInteger = (
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export const parseParametricFilters = (
  params: URLSearchParams,
): ParametricFilterSelection[] => {
  const filters: ParametricFilterSelection[] = []
  for (const [name, rawValue] of params) {
    const match = /^param_(\d+)_(\d+)$/.exec(name)
    if (!match || !rawValue) continue

    const valueIds = rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    if (valueIds.length === 0) continue

    filters.push({
      categoryId: match[1],
      parameterId: Number.parseInt(match[2], 10),
      valueIds,
    })
  }

  return filters.sort(
    (a, b) =>
      a.categoryId.localeCompare(b.categoryId) || a.parameterId - b.parameterId,
  )
}

export const createSearchRequest = (
  url: URL,
  category?: CategoryDefinition,
): SearchRequest => {
  const query = category
    ? buildCategoryKeywords(category, url.searchParams)
    : (url.searchParams.get("q") ?? url.searchParams.get("search") ?? "").trim()

  const postFilters = {
    ...Object.fromEntries(
      (category?.filters ?? [])
        .map((filter) => [
          filter.name,
          url.searchParams.get(filter.name)?.trim(),
        ])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
    ...(category?.requiredPostFilters ?? {}),
  }

  return {
    query,
    limit: clampInteger(url.searchParams.get("limit"), 50, 1, 50),
    offset: clampInteger(url.searchParams.get("offset"), 0, 0, 100_000),
    responseKey: category?.responseKey ?? "components",
    sourceKind: category ? "category" : "search",
    postFilters,
    manufacturerIds: (url.searchParams.get("manufacturer") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .sort(),
    parametricFilters: parseParametricFilters(url.searchParams),
  }
}

export const getSearchCacheKey = async (
  request: SearchRequest,
): Promise<string> => {
  const canonical = JSON.stringify({
    query: request.query.toLowerCase().replace(/\s+/g, " ").trim(),
    limit: request.limit,
    offset: request.offset,
    responseKey: request.responseKey,
    sourceKind: request.sourceKind,
    postFilters: Object.fromEntries(
      Object.entries(request.postFilters).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
    manufacturerIds: request.manufacturerIds,
    parametricFilters: request.parametricFilters,
  })
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}
