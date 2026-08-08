import type {
  DigiKeyKeywordRequest,
  DigiKeyKeywordResponse,
  Env,
  SearchRequest,
  UpstreamSearchResult,
} from "./types"

type Fetch = typeof fetch

interface AccessToken {
  value: string
  expiresAt: number
}

export class DigiKeyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter: string | null = null,
  ) {
    super(message)
    this.name = "DigiKeyApiError"
  }
}

const parseErrorBody = async (response: Response): Promise<string> => {
  const text = await response.text()
  if (!text) return `${response.status} ${response.statusText}`

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    return String(
      parsed.detail ??
        parsed.ErrorMessage ??
        parsed.title ??
        `${response.status} ${response.statusText}`,
    )
  } catch {
    return text.slice(0, 300)
  }
}

export const buildKeywordRequest = (
  request: SearchRequest,
): DigiKeyKeywordRequest => {
  const firstCategoryId = request.parametricFilters[0]?.categoryId
  const filtersForCategory = request.parametricFilters.filter(
    (filter) => filter.categoryId === firstCategoryId,
  )

  return {
    Keywords: request.query.slice(0, 250),
    Limit: request.limit,
    Offset: request.offset,
    FilterOptionsRequest: {
      ...(request.manufacturerIds.length > 0
        ? {
            ManufacturerFilter: request.manufacturerIds.map((Id) => ({ Id })),
          }
        : {}),
      MarketPlaceFilter: "ExcludeMarketPlace",
      SearchOptions: ["InStock"],
      ...(firstCategoryId
        ? {
            ParameterFilterRequest: {
              CategoryFilter: { Id: firstCategoryId },
              ParameterFilters: filtersForCategory.map((filter) => ({
                ParameterId: filter.parameterId,
                FilterValues: filter.valueIds.map((Id) => ({ Id })),
              })),
            },
          }
        : {}),
    },
    SortOptions: {
      Field: "QuantityAvailable",
      SortOrder: "Descending",
    },
  }
}

export class DigiKeyClient {
  private token: AccessToken | null = null
  private readonly env: Env
  private readonly platformFetch: Fetch

  constructor(env: Env, platformFetch: Fetch = fetch) {
    this.env = env
    this.platformFetch = (input, init) => platformFetch(input, init)
  }

  private get baseUrl(): string {
    return (this.env.DIGIKEY_API_BASE_URL ?? "https://api.digikey.com").replace(
      /\/$/,
      "",
    )
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (
      !forceRefresh &&
      this.token &&
      this.token.expiresAt > Date.now() + 30_000
    ) {
      return this.token.value
    }

    if (!this.env.DIGIKEY_CLIENT_ID || !this.env.DIGIKEY_CLIENT_SECRET) {
      throw new DigiKeyApiError(
        "DigiKey credentials are not configured on this Worker",
        503,
      )
    }

    const response = await this.platformFetch(
      `${this.baseUrl}/v1/oauth2/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.env.DIGIKEY_CLIENT_ID,
          client_secret: this.env.DIGIKEY_CLIENT_SECRET,
          grant_type: "client_credentials",
        }),
      },
    )

    if (!response.ok) {
      throw new DigiKeyApiError(
        `DigiKey OAuth failed: ${await parseErrorBody(response)}`,
        response.status,
        response.headers.get("retry-after"),
      )
    }

    const body = (await response.json()) as {
      access_token?: string
      expires_in?: number
    }
    if (!body.access_token) {
      throw new DigiKeyApiError(
        "DigiKey OAuth response did not include an access token",
        502,
      )
    }

    const expiresInSeconds = Number(body.expires_in ?? 599)
    this.token = {
      value: body.access_token,
      expiresAt: Date.now() + expiresInSeconds * 1_000,
    }
    return this.token.value
  }

  async keywordSearch(
    request: SearchRequest,
    retryUnauthorized = true,
  ): Promise<UpstreamSearchResult> {
    const accessToken = await this.getAccessToken()
    const response = await this.platformFetch(
      `${this.baseUrl}/products/v4/search/keyword`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "x-digikey-client-id": this.env.DIGIKEY_CLIENT_ID,
          "x-digikey-locale-site": this.env.DIGIKEY_SITE ?? "US",
          "x-digikey-locale-language": this.env.DIGIKEY_LANGUAGE ?? "en",
          "x-digikey-locale-currency": this.env.DIGIKEY_CURRENCY ?? "USD",
        },
        body: JSON.stringify(buildKeywordRequest(request)),
      },
    )

    if (response.status === 401 && retryUnauthorized) {
      await this.getAccessToken(true)
      return this.keywordSearch(request, false)
    }

    if (!response.ok) {
      throw new DigiKeyApiError(
        `DigiKey keyword search failed: ${await parseErrorBody(response)}`,
        response.status,
        response.headers.get("retry-after"),
      )
    }

    const remainingHeader = response.headers.get("x-ratelimit-remaining")
    const parsedRemaining = remainingHeader
      ? Number.parseInt(remainingHeader, 10)
      : Number.NaN

    return {
      response: (await response.json()) as DigiKeyKeywordResponse,
      rateLimitRemaining: Number.isNaN(parsedRemaining)
        ? null
        : parsedRemaining,
    }
  }
}
