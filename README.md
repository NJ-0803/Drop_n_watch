# Dropwatch

Type what you want (or paste a store link) and Dropwatch hands you the cheapest genuine listing. Includes a sneaker page that prices your exact UK size across Indian resellers.

- **Everyday** (`/`): Flipkart, Reliance Digital, Vijay Sales, Snapdeal, and Amazon when it lets us in. Croma, Tata CLiQ, Myntra, Nykaa and Ajio block servers, so they appear as pre-filled search links.
- **Sneakers** (`/sneakers`): Crep Dog Crew, Mainstreet, Superkicks, Dawntown, Limited Edt (Shopify, per-size prices) and VegNonVeg.
- **Saved**: stored in the browser only and re-checked each time the site opens.

## How it works

`lib/retail/*` and `lib/sneakers/*` read each store's public search (JSON endpoints, or data embedded in the page). `lib/match.ts` keeps only listings that match every query word and the right brand, and drops accessories and knock-offs. `lib/group.ts` groups the same product across stores; `lib/collect.ts` runs all stores in parallel and reports any that failed. `lib/link.ts` identifies a pasted product link and compares it against the other stores.

Stores that answer servers with a bot check (Amazon, Croma, Nykaa, Ajio, Nike) are reported as unavailable and never worked around. Reliable Amazon prices need Amazon's Product Advertising API.

API routes (`/api/search`, `/api/sneakers`, `/api/link`) are cached on Vercel's CDN for 15 minutes so repeat searches don't hit stores again.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

Deployed on Vercel, region `bom1` (Mumbai), see `vercel.json`. The UI uses the Bhookmark design tokens (Evening/Daylight themes) with `motion` for the 3D press, tilt and shoebox interactions.

## Design refinements

For frontend refinement work, read the [Taste brief](docs/taste/README.md) and the [vendored Taste skill](docs/taste/SKILL.md). The preservation brief takes precedence over generic redesign defaults.
