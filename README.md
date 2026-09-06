# digikeysearch.tscircuit.com

An unofficial, in-stock DigiKey search engine for tscircuit. The route names,
JSON discovery pattern, category index, and compact table UI intentionally match
[`jlcsearch.tscircuit.com`](https://jlcsearch.tscircuit.com), while the data path
is designed around DigiKey's Product Information V4 quota.

## API

```sh
curl 'https://digikeysearch.tscircuit.com/api/search?q=10k%200603&limit=10'
curl 'https://digikeysearch.tscircuit.com/resistors/list.json?resistance=10k&package=0603'
```

Search responses use a stable common shape:

```json
{
  "components": [
    {
      "digikey_product_number": "311-10.0KHRCT-ND",
      "supplier_part_number": "311-10.0KHRCT-ND",
      "mfr": "RC0603FR-0710KL",
      "manufacturer": "YAGEO",
      "package": "0603 (1608 Metric)",
      "description": "RES 10K OHM 1% 1/10W 0603",
      "stock": 100000,
      "price": 0.01
    }
  ]
}
```

Every category page supports `.json` and `?json=true`. DigiKey parametric
filter choices are encoded in the page URL and sent back through the V4
`ParameterFilterRequest` contract.

The [Linux-capable Processors page](https://digikeysearch.tscircuit.com/linux_capable_processors/list)
and its `.json` API classify bare processor families with documented MMU-based
Linux support. Results include `chip_family`, `architecture` (`ARM32`, `ARM64`,
or `RISC-V64`), and `cpu_core`, with filters for those fields and package, plus
the usual DigiKey manufacturer and parametric filters:

```sh
curl 'https://digikeysearch.tscircuit.com/linux_capable_processors/list.json?chip_family=STM32MP1&architecture=ARM32'
```

Classification and metadata filters apply to each fetched page (up to 50
upstream products); `meta.total` counts the matching products on that page.
Use `offset` to request another upstream page. See the
[coverage policy and sources](docs/linux-capable-processors.md).

## Cache and indexing model

- Exact requests are cached in D1 for 24 hours by default.
- Expired entries can be served for seven days while a refresh runs in the
  background. This prevents user traffic from stampeding the upstream API.
- Every returned product is normalized into the `parts` table and FTS index.
- Category queries ask DigiKey for in-stock, non-marketplace products sorted by
  `QuantityAvailable` descending, so category pages naturally learn the most
  stocked parts as they are requested.
- A six-hour cron refreshes up to 20 of the most-used expired queries. It stops
  if the last response reports fewer than `DIGIKEY_MIN_REMAINING` requests.
- If DigiKey returns 429, a stale result is preferred and `Retry-After` is
  forwarded when no stale entry exists.

Keyword search data may be up to 24 hours stale at DigiKey itself; use its
Product Details endpoint if a workflow needs real-time price or availability.

## Setup

```sh
bun install
npx wrangler d1 create digikeysearch
```

Replace the placeholder `database_id` in `wrangler.toml`, then store the two
production credentials shown in the DigiKey developer portal:

```sh
npx wrangler secret put DIGIKEY_CLIENT_ID
npx wrangler secret put DIGIKEY_CLIENT_SECRET
npx wrangler d1 migrations apply digikeysearch --remote
bun run deploy
```

For local development, create `.dev.vars`:

```dotenv
DIGIKEY_CLIENT_ID=...
DIGIKEY_CLIENT_SECRET=...
```

Run `bun run dev`, `bun run test`, and `bun run typecheck`.

## Deployment

Pushes to `main` that change the Worker, migrations, or deployment configuration
run the GitHub Actions deployment workflow. It runs the test, typecheck, and
format checks, applies pending remote D1 migrations, and then deploys the
Worker. The workflow can also be run manually.

Configure these repository or organization Actions secrets before the first
deployment:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## Security

The DigiKey client secret and access tokens are never returned by the API or
written to D1. Access tokens live only in the active Worker isolate and are
renewed before their ten-minute expiry.

This is a tscircuit service, not an official DigiKey product. DigiKey product
data and links remain subject to DigiKey's API agreement and terms.
