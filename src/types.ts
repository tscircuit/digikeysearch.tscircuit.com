export interface Env {
  DB: D1Database
  DIGIKEY_CLIENT_ID: string
  DIGIKEY_CLIENT_SECRET: string
  DIGIKEY_API_BASE_URL?: string
  DIGIKEY_SITE?: string
  DIGIKEY_LANGUAGE?: string
  DIGIKEY_CURRENCY?: string
  DIGIKEY_CACHE_TTL_SECONDS?: string
  DIGIKEY_STALE_TTL_SECONDS?: string
  DIGIKEY_MIN_REMAINING?: string
}

export interface DigiKeyFilterId {
  Id?: string
}

export interface DigiKeyFilterValue {
  ProductCount?: number
  ValueId?: string
  ValueName?: string
  RangeFilterType?: "Min" | "Max" | "Range"
}

export interface DigiKeyBaseFilter {
  Id?: string
  Value?: string
  ProductCount?: number
}

export interface DigiKeyParametricFilter {
  Category?: DigiKeyBaseFilter
  ParameterType?: string
  ParameterId?: number
  ParameterName?: string
  FilterValues?: DigiKeyFilterValue[]
}

export interface DigiKeyFilterOptions {
  Manufacturers?: DigiKeyBaseFilter[]
  Packaging?: DigiKeyBaseFilter[]
  Status?: DigiKeyBaseFilter[]
  Series?: DigiKeyBaseFilter[]
  ParametricFilters?: DigiKeyParametricFilter[]
  TopCategories?: Array<{
    RootCategory?: { Id?: number; Name?: string }
    Category?: { Id?: number; Name?: string }
    Score?: number
    ImageUrl?: string
  }>
}

export interface DigiKeyProductVariation {
  DigiKeyProductNumber?: string
  PackageType?: { Id?: number; Name?: string }
  StandardPricing?: Array<{
    BreakQuantity?: number
    UnitPrice?: number
    TotalPrice?: number
  }>
  MarketPlace?: boolean
  QuantityAvailableforPackageType?: number
  MinimumOrderQuantity?: number
  StandardPackage?: number
}

export interface DigiKeyParameterValue {
  ParameterId?: number
  ParameterText?: string
  ValueId?: string
  ValueText?: string
}

export interface DigiKeyProduct {
  Description?: {
    ProductDescription?: string
    DetailedDescription?: string
  }
  Manufacturer?: { Id?: number; Name?: string }
  ManufacturerProductNumber?: string
  UnitPrice?: number
  ProductUrl?: string
  DatasheetUrl?: string
  PhotoUrl?: string
  ProductVariations?: DigiKeyProductVariation[]
  QuantityAvailable?: number
  ProductStatus?: { Id?: number; Status?: string }
  NormallyStocking?: boolean
  Discontinued?: boolean
  EndOfLife?: boolean
  Parameters?: DigiKeyParameterValue[]
  Category?: {
    CategoryId?: number
    ParentId?: number
    Name?: string
    ChildCategories?: unknown[]
  }
}

export interface DigiKeyKeywordResponse {
  Products?: DigiKeyProduct[]
  ProductsCount?: number
  ExactMatches?: DigiKeyProduct[]
  FilterOptions?: DigiKeyFilterOptions
  SearchLocaleUsed?: { Site?: string; Language?: string; Currency?: string }
}

export interface ParametricFilterSelection {
  categoryId: string
  parameterId: number
  valueIds: string[]
}

export interface SearchRequest {
  query: string
  limit: number
  offset: number
  responseKey: string
  sourceKind: "search" | "category"
  postFilters: Record<string, string>
  manufacturerIds: string[]
  parametricFilters: ParametricFilterSelection[]
}

export interface DigiKeyKeywordRequest {
  Keywords: string
  Limit: number
  Offset: number
  FilterOptionsRequest: {
    ManufacturerFilter?: DigiKeyFilterId[]
    MarketPlaceFilter: "ExcludeMarketPlace"
    SearchOptions: ["InStock"]
    ParameterFilterRequest?: {
      CategoryFilter: DigiKeyFilterId
      ParameterFilters: Array<{
        ParameterId: number
        FilterValues: DigiKeyFilterId[]
      }>
    }
  }
  SortOptions: {
    Field: "QuantityAvailable"
    SortOrder: "Descending"
  }
}

export interface NormalizedPart {
  digikey_product_number: string
  supplier_part_number: string
  mfr: string
  manufacturer: string
  package: string
  description: string
  detailed_description: string
  stock: number
  price: number
  category: string
  subcategory: string
  product_url: string
  datasheet_url: string
  photo_url: string
  normally_stocking: boolean
  discontinued: boolean
  marketplace: boolean
  parameters: Record<string, string>
}

export interface SearchPayload {
  query: string
  components: NormalizedPart[]
  total: number
  filter_options: DigiKeyFilterOptions
  source: "digikey"
  cached: boolean
  stale: boolean
  cache_expires_at: string
}

export interface SearchCacheRow {
  cache_key: string
  query: string
  request_json: string
  response_json: string
  response_key: string
  source_kind: "search" | "category"
  created_at: number
  refreshed_at: number
  expires_at: number
  stale_until: number
  last_accessed_at: number
  access_count: number
  api_rate_limit_remaining: number | null
}

export interface UpstreamSearchResult {
  response: DigiKeyKeywordResponse
  rateLimitRemaining: number | null
}
