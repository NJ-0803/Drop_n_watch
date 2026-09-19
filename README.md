# Dropwatch

A private India sale watchlist, built with React, Vinext and Cloudflare D1.

## Product behavior

- Watches exact product URLs (Amazon child ASIN and Flipkart PID) supplied by the user.
- Stores watchlists, price observations and alerts in D1, scoped to the signed-in user.
- Demo examples are isolated client-side illustrations, never retailer price evidence.
- Computes estimated payable price from listed price, user-entered coupon, instant bank discount and fees. Offers expire automatically. Cashback and exchange are excluded.
- Sounds on target crossings or strict new recorded lows. Manual, live and demo observations remain labelled. Historical lows are source-specific.
- Browser sound must be activated by a user gesture. The page checks every five minutes while visible; returning to the tab triggers a check. Server-side throttling prevents overlapping tab requests. This is not a background monitoring service: closed/suspended tabs do not check or beep.
- History retains the last 500 samples per retailer and preserves lower records beyond that window; 25 products per user.

## Price connection

The connection dialog accepts the user's own Scrapingdog key for the current tab only. No credential is persisted or returned by the server. It can alternatively use the optional server-side `SCRAPINGDOG_API_KEY` environment variable. Configure hosted environment values through Sites. Provider requests use credits; this project does not purchase a subscription.

Adapters follow these official docs (checked 18 September 2026):
- https://www.scrapingdog.com/documentation/amazon-product-scraper/
- https://www.scrapingdog.com/documentation/flipkart-product-api/

Amazon requests `domain=in`, `country=in`, exact ASIN; it rejects a mismatched/missing returned ASIN, non-INR prices and explicit stock failures. Flipkart uses the exact supplied product URL and PID. Currency and schema failures preserve prior samples and show an error. The user must verify matching variants, delivery location, eligibility and stock at checkout. An API key and successful live retailer responses are needed to validate end-to-end live pricing; no key was provided during development.

## Development

Use the existing pnpm lockfile and Sites helpers. The schema is in db/schema.ts; schema-only Drizzle migrations are in drizzle/. D1 JSON documents use optimistic revisions to protect concurrent edits. All write operations check user identity and origin, and queries are parameterized.

Only an opaque site project ID and logical D1 binding belong in .openai/hosting.json. Do not commit keys or generated build output.

## Validation

Type checks and a production build passed. Price parsing, offer expiry, product URL validation, alert crossings, duplicate suppression and cross-store lows were checked. Route operations were exercised against SQLite with a D1-compatible adapter, including persistence, user isolation and revision conflicts. The managed preview passed desktop visual review, sound activation and a simulated target alert. Live provider requests remain unverified without an account key. WebMCP validation was unavailable because the permitted preview browser did not expose modelContext; UI flows remain usable.
