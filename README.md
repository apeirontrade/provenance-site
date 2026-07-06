# Provenance data site — The x402 Trust Index

Static, crawlable, machine-readable publication of Provenance's weekly x402 trust data:

- **The Bazaar Wash Report** — organic-revenue-quality grades for the top Coinbase x402 Bazaar merchants on Base, computed from public on-chain USDC transfers.
- **Wrapper Watch** — x402 endpoints exhibiting signatures consistent with reselling first-party APIs (resale-authorization unknown; suspected — verification recommended).

Live site: https://apeirontrade.github.io/provenance-site/

## Build

```bash
node build.mjs   # reads ./src-data, emits the site into ./docs (GitHub Pages serves main:/docs)
```

Zero dependencies beyond Node.

## Layout

- `src-data/` — source snapshots (wash report JSON; wrapper-watch suspect subset)
- `docs/` — generated site: index, `endpoints/` scorecards, `brands/` resale audits, `methodology.html`, `data/` JSON downloads, `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`

## Data license

Published data is **CC-BY-4.0** — cite Provenance.

## Disputes & corrections

All figures are statistical estimates from public data — signals, not accusations. If you operate a listed endpoint or represent a named brand, open an issue here with the endpoint URL and any evidence; corrections are published in the next weekly build.

## Related

- Live API: https://provenance.q3epzs69b902a.us-west-2.cs.amazonlightsail.com
- [provenance-mcp](https://www.npmjs.com/package/provenance-mcp) — MCP server for agent-side checks
- [provenance-guard](https://www.npmjs.com/package/provenance-guard) — pre-payment wash-risk guard for x402 clients
