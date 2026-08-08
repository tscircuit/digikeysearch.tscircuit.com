import { CATEGORY_BY_PATH, CATEGORY_DEFINITIONS } from "./categories"
import { DigiKeyApiError, DigiKeyClient } from "./digikey-client"
import { applyPostFilters, normalizeKeywordResponse } from "./normalize"
import {
  buildSearchPayload,
  getCachedSearch,
  getIndexedCategories,
  getPackageIndex,
  getRefreshCandidates,
  putCachedSearch,
  searchIndexedParts,
} from "./search-cache"
import { createSearchRequest, getSearchCacheKey } from "./search-request"
import {
  renderErrorPage,
  renderHomePage,
  renderSearchPage,
  renderSimpleTablePage,
} from "./render"
import type { Env, SearchCacheRow, SearchPayload, SearchRequest } from "./types"

let client: DigiKeyClient | undefined

const getClient = (env: Env): DigiKeyClient => {
  client ??= new DigiKeyClient(env)
  return client
}

const addCorsHeaders = (headers: Headers, origin: string | null): void => {
  headers.set("access-control-allow-origin", origin ?? "*")
  headers.set("access-control-allow-methods", "GET, OPTIONS")
  headers.set("access-control-allow-headers", "accept, content-type")
  headers.set("vary", "Accept, Origin")
}

const isJsonRequest = (request: Request, url: URL): boolean =>
  url.pathname.endsWith(".json") ||
  url.searchParams.get("json") === "true" ||
  Boolean(request.headers.get("accept")?.includes("application/json"))

const jsonResponse = (
  value: unknown,
  origin: string | null,
  options: {
    status?: number
    cacheStatus?: "HIT" | "MISS" | "STALE" | "INDEX"
    retryAfter?: string | null
  } = {},
): Response => {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=60, stale-while-revalidate=86400",
    "x-data-source": "d1+digikey",
  })
  if (options.cacheStatus) headers.set("x-cache", options.cacheStatus)
  if (options.retryAfter) headers.set("retry-after", options.retryAfter)
  addCorsHeaders(headers, origin)
  return new Response(JSON.stringify(value), {
    status: options.status ?? 200,
    headers,
  })
}

const htmlResponse = (
  html: string,
  origin: string | null,
  options: {
    status?: number
    cacheStatus?: "HIT" | "MISS" | "STALE" | "INDEX"
    retryAfter?: string | null
  } = {},
): Response => {
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=60, stale-while-revalidate=86400",
    "x-data-source": "d1+digikey",
  })
  if (options.cacheStatus) headers.set("x-cache", options.cacheStatus)
  if (options.retryAfter) headers.set("retry-after", options.retryAfter)
  addCorsHeaders(headers, origin)
  return new Response(html, { status: options.status ?? 200, headers })
}

const refreshSearch = async (
  env: Env,
  cacheKey: string,
  searchRequest: SearchRequest,
): Promise<{
  row: SearchCacheRow
  payload: SearchPayload
}> => {
  const upstream = await getClient(env).keywordSearch(searchRequest)
  const components = applyPostFilters(
    normalizeKeywordResponse(upstream.response),
    searchRequest.postFilters,
  )
  const cached = await putCachedSearch(
    env,
    cacheKey,
    searchRequest,
    upstream.response,
    components,
    upstream.rateLimitRemaining,
  )
  return {
    row: cached.row,
    payload: buildSearchPayload(cached.row, cached.document, false, false),
  }
}

const refreshInBackground = async (
  env: Env,
  cacheKey: string,
  searchRequest: SearchRequest,
): Promise<void> => {
  try {
    await refreshSearch(env, cacheKey, searchRequest)
  } catch (error) {
    console.warn(
      "Background DigiKey refresh failed",
      error instanceof Error ? error.message : error,
    )
  }
}

const payloadForResponseKey = (
  payload: SearchPayload,
  responseKey: string,
): Record<string, unknown> => ({
  [responseKey]: payload.components,
  meta: {
    query: payload.query,
    total: payload.total,
    source: payload.source,
    cached: payload.cached,
    stale: payload.stale,
    cache_expires_at: payload.cache_expires_at,
    filter_options: payload.filter_options,
  },
})

const handleSearchRoute = async (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL,
  pathname: string,
  origin: string | null,
): Promise<Response> => {
  const category = CATEGORY_BY_PATH.get(pathname)
  const searchRequest = createSearchRequest(url, category)
  const json = isJsonRequest(request, url)

  if (!searchRequest.query) {
    const message = "A non-empty q or search parameter is required"
    return json
      ? jsonResponse({ error: { message } }, origin, { status: 400 })
      : htmlResponse(renderErrorPage(pathname, 400, message), origin, {
          status: 400,
        })
  }

  const cacheKey = await getSearchCacheKey(searchRequest)
  const cached = await getCachedSearch(env, cacheKey)
  const now = Date.now()

  let payload: SearchPayload
  let cacheStatus: "HIT" | "MISS" | "STALE"

  if (cached && cached.row.expires_at > now) {
    payload = buildSearchPayload(cached.row, cached.document, true, false)
    cacheStatus = "HIT"
  } else if (cached && cached.row.stale_until > now) {
    payload = buildSearchPayload(cached.row, cached.document, true, true)
    cacheStatus = "STALE"
    ctx.waitUntil(refreshInBackground(env, cacheKey, searchRequest))
  } else {
    try {
      const refreshed = await refreshSearch(env, cacheKey, searchRequest)
      payload = refreshed.payload
      cacheStatus = "MISS"
    } catch (error) {
      const apiError =
        error instanceof DigiKeyApiError
          ? error
          : new DigiKeyApiError(
              error instanceof Error ? error.message : "Unknown search error",
              502,
            )
      const status = apiError.status === 429 ? 503 : apiError.status
      return json
        ? jsonResponse(
            {
              error: {
                message: apiError.message,
                upstream_status: apiError.status,
              },
            },
            origin,
            { status, retryAfter: apiError.retryAfter },
          )
        : htmlResponse(
            renderErrorPage(pathname, status, apiError.message),
            origin,
            { status, retryAfter: apiError.retryAfter },
          )
    }
  }

  if (json) {
    const body =
      pathname === "/api/search"
        ? payload
        : payloadForResponseKey(payload, searchRequest.responseKey)
    return jsonResponse(body, origin, { cacheStatus })
  }

  const label =
    category?.label ??
    (pathname === "/components/list"
      ? `DigiKey Component Search: ${searchRequest.query}`
      : "DigiKey Component Search")
  return htmlResponse(
    renderSearchPage(pathname, label, category, payload, url.toString()),
    origin,
    { cacheStatus },
  )
}

const handleCategories = async (
  request: Request,
  env: Env,
  url: URL,
  origin: string | null,
): Promise<Response> => {
  const indexed = await getIndexedCategories(env)
  const categories = CATEGORY_DEFINITIONS.map((category) => ({
    category: category.label,
    subcategory: category.query,
    path: category.path,
  }))
  if (isJsonRequest(request, url)) {
    return jsonResponse({ categories, indexed_categories: indexed }, origin, {
      cacheStatus: "INDEX",
    })
  }
  return htmlResponse(
    renderSimpleTablePage(
      "/categories/list",
      "Categories",
      categories,
      url.toString(),
    ),
    origin,
    { cacheStatus: "INDEX" },
  )
}

const handlePackageIndex = async (
  request: Request,
  env: Env,
  url: URL,
  origin: string | null,
): Promise<Response> => {
  const footprints = await getPackageIndex(env)
  if (isJsonRequest(request, url)) {
    return jsonResponse({ footprints }, origin, { cacheStatus: "INDEX" })
  }
  return htmlResponse(
    renderSimpleTablePage(
      "/footprint_index/list",
      "Package Index",
      footprints,
      url.toString(),
    ),
    origin,
    { cacheStatus: "INDEX" },
  )
}

const handleIndexedSearch = async (
  env: Env,
  url: URL,
  origin: string | null,
): Promise<Response> => {
  const query = url.searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "10", 10)),
  )
  const components = query ? await searchIndexedParts(env, query, limit) : []
  return jsonResponse(
    { query, components, source: "digikey-d1-index", partial: true },
    origin,
    { cacheStatus: "INDEX" },
  )
}

const handleFetch = async (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> => {
  const url = new URL(request.url)
  const origin = request.headers.get("origin")
  if (request.method === "OPTIONS") {
    const headers = new Headers()
    addCorsHeaders(headers, origin)
    return new Response(null, { status: 204, headers })
  }
  if (request.method !== "GET") {
    return jsonResponse({ error: { message: "Method Not Allowed" } }, origin, {
      status: 405,
    })
  }

  const pathname = url.pathname.replace(/\.json$/, "")
  if (pathname === "/health") {
    return jsonResponse({ ok: true }, origin)
  }
  if (pathname === "/") {
    return htmlResponse(renderHomePage(), origin)
  }
  if (pathname === "/categories/list") {
    return handleCategories(request, env, url, origin)
  }
  if (pathname === "/footprint_index/list") {
    return handlePackageIndex(request, env, url, origin)
  }
  if (pathname === "/api/index/search") {
    return handleIndexedSearch(env, url, origin)
  }
  if (
    pathname === "/api/search" ||
    pathname === "/components/list" ||
    CATEGORY_BY_PATH.has(pathname)
  ) {
    return handleSearchRoute(request, env, ctx, url, pathname, origin)
  }

  const json = isJsonRequest(request, url)
  return json
    ? jsonResponse({ error: { message: "Not Found" } }, origin, { status: 404 })
    : htmlResponse(renderErrorPage(pathname, 404, "Not Found"), origin, {
        status: 404,
      })
}

const handleScheduled = async (env: Env): Promise<void> => {
  const candidates = await getRefreshCandidates(env, 20)
  const minimumRemaining = Number.parseInt(
    env.DIGIKEY_MIN_REMAINING ?? "25",
    10,
  )

  for (const row of candidates) {
    const searchRequest = JSON.parse(row.request_json) as SearchRequest
    const refreshed = await refreshSearch(env, row.cache_key, searchRequest)
    const remaining = refreshed.row.api_rate_limit_remaining
    if (remaining !== null && remaining <= minimumRemaining) break
  }
}

export default {
  fetch: handleFetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleScheduled(env))
  },
}
