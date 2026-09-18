#!/usr/bin/env node
/**
 * Provenance data site generator.
 * Zero dependencies. Reads ./src-data, emits a static site into ./docs
 * (GitHub Pages serves main:/docs).
 *
 *   node build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;
const OUT = join(ROOT, "docs");
const SITE = "https://apeirontrade.github.io/provenance-site";

const LINKS = {
  api: "https://provenance.q3epzs69b902a.us-west-2.cs.amazonlightsail.com",
  mcp: "https://www.npmjs.com/package/provenance-mcp",
  guard: "https://www.npmjs.com/package/provenance-guard",
  github: "https://github.com/apeirontrade/provenance-site",
  issues: "https://github.com/apeirontrade/provenance-site/issues",
};

// ---------------------------------------------------------------- load data
const wash = JSON.parse(readFileSync(join(ROOT, "src-data/wash-report-2026-06-29.json"), "utf8"));
const ww = JSON.parse(readFileSync(join(ROOT, "src-data/wrapper-watch-suspects.json"), "utf8"));

// ------------------------------------------------------------- brand notes
// Neutral, public-facing licensing-posture context per brand (no accusations).
const BRAND_NOTES = {
  twitter: "X's API has been paid-tier since 2023; redistribution of X data generally requires a license.",
  coingecko: "CoinGecko sells API tiers and requires attribution even on its free tier.",
  youtube: "The YouTube Data API is quota-limited and its Terms of Service restrict resale of API data.",
  instagram: "Meta's platform terms restrict scraping and redistribution of Instagram data.",
  openai: "OpenAI's usage policies restrict API-key sharing and resale of API access.",
  tiktok: "TikTok's Research API is access-gated; commercial redistribution generally requires authorization.",
  anthropic: "Anthropic's usage policies restrict resale or proxying of API access.",
  apify: "Apify operates a revenue-share Actor marketplace; re-wrapping outside it bypasses that model.",
  reddit: "Reddit's API has been paid since 2023, and the company signs data-licensing deals for bulk access.",
  linkedin: "LinkedIn's API is partner-gated, and the company has a long enforcement history around scraping.",
  flightaware: "FlightAware's AeroAPI is metered; redistribution requires a data license.",
  exa: "Exa is an AI-native search vendor; several x402 listings openly describe themselves as “powered by Exa”.",
  binance: "Binance market data is publicly available free of charge; paywalled proxies charge for access to it.",
  dexscreener: "DEX Screener offers a free, rate-limited API; paywalled proxies monetize access to it.",
  "google-maps": "Google Maps Platform terms explicitly restrict resale and caching of Maps data.",
  "google-search": "Google's terms do not permit scraping of Search results; SERP resale is the canonical wrapper category.",
  etherscan: "Etherscan's API terms restrict redistribution; its paid Pro tier exists for commercial use.",
  firecrawl: "Firecrawl sells metered scraping credits; unbranded resale skims its credit pricing.",
  tavily: "Tavily sells agent-search API credits, including a free tier that can be arbitraged.",
  perplexity: "Perplexity's brand is frequently invoked by third-party answer-engine wrappers.",
  zillow: "Zillow closed its public API; third-party “Zillow API” offerings generally lack an obvious authorization path.",
  aviationstack: "Aviationstack (apilayer) licenses flight data by subscription tier.",
  "yahoo-finance": "Yahoo Finance has no official public API; third-party “Yahoo Finance APIs” are typically scraper-based.",
  gemini: "Google's Gemini API terms restrict resale of API access.",
  "xai-grok": "xAI's Grok API terms restrict redistribution of API access and outputs.",
  openweather: "OpenWeatherMap licenses redistribution rights separately from its paid API tiers.",
  yelp: "Yelp Fusion API terms restrict caching and resale of Yelp data.",
  elevenlabs: "ElevenLabs restricts commercial resale of its hosted voice API; resale also raises voice-safety questions.",
  alphavantage: "Alpha Vantage free-tier keys are not licensed for paywalled redistribution.",
  serpapi: "SerpApi's own terms prohibit resale of its API keys.",
  weatherapi: "WeatherAPI.com licenses weather data by subscription tier.",
  bloomberg: "Bloomberg is among the most protective data licensors; redistribution requires explicit licensing.",
  newsapi: "NewsAPI.org free-tier keys are licensed for non-commercial use only.",
  opensea: "OpenSea's keyed API developer terms restrict resale.",
  stability: "Stability AI's membership terms restrict commercial resale of its hosted API.",
  tripadvisor: "Tripadvisor's Content API is partner-gated.",
  shodan: "Shodan licenses its security data; redistribution raises both licensing and ethics questions.",
  wolfram: "Wolfram|Alpha's paid API terms restrict redistribution.",
};

// ------------------------------------------------------------------ helpers
const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => Number(n ?? 0).toLocaleString("en-US");
const usd = (n) => "$" + Number(n).toFixed(n < 0.1 ? 4 : 2);
const shortAddr = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");
const jsonld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

const ORG = {
  "@type": "Organization",
  "@id": SITE + "/#org",
  name: "Provenance",
  legalName: "Apeiron Capital Inc.",
  url: SITE + "/",
  description:
    "Independent trust ratings for x402 machine-payable API endpoints, derived from public on-chain payment data and public discovery registries.",
  sameAs: [LINKS.mcp, LINKS.guard, "https://github.com/apeirontrade/provenance-mcp", "https://github.com/apeirontrade/provenance-guard"],
};

const GRADE_COLORS = { A: "#3fb950", B: "#8bc34a", C: "#d29922", D: "#f0883e", F: "#f85149", "n/v": "#8b949e" };
const gradeBadge = (g, sub) =>
  `<span class="grade" style="color:${GRADE_COLORS[g] || "#8b949e"};border-color:${(GRADE_COLORS[g] || "#8b949e")}55">${esc(g)}</span>` +
  (sub ? `<div class="ep-meta">${esc(sub)}</div>` : "");

const CSS = `
  :root{color-scheme:light dark;
    --bg:#0d1117;--panel:#161b22;--border:#30363d;--fg:#e6edf3;--dim:#8b949e;--accent:#58a6ff;--accent2:#d2a8ff;}
  @media (prefers-color-scheme: light){:root{--bg:#f6f8fa;--panel:#ffffff;--border:#d0d7de;--fg:#1f2328;--dim:#57606a;--accent:#0969da;--accent2:#8250df;}}
  *{box-sizing:border-box;margin:0}
  body{background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;padding:2.2rem 1rem 4rem}
  .wrap{max-width:1080px;margin:0 auto}
  header.site{margin-bottom:1.6rem}
  .crumb{font-size:.82rem;color:var(--dim);margin-bottom:1rem}
  .crumb a{color:var(--dim)}
  h1{font-size:1.65rem;letter-spacing:-.01em;line-height:1.25}
  h2{font-size:1.15rem;margin:2.2rem 0 .8rem}
  h3{font-size:1rem;margin:1.6rem 0 .6rem}
  .sub{color:var(--dim);margin:.5rem 0 1.4rem;max-width:62rem}
  .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.8rem;margin:1.4rem 0 1.8rem}
  .tile{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:.85rem 1rem}
  .tile b{display:block;font-size:1.4rem;font-weight:600}
  .tile span{color:var(--dim);font-size:.8rem}
  .tblwrap{overflow-x:auto;border:1px solid var(--border);border-radius:8px;background:var(--panel);margin:.6rem 0 1rem}
  table{border-collapse:collapse;width:100%;font-size:.9rem}
  th{color:var(--dim);font-weight:600;font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;text-align:left;padding:.65rem .8rem;border-bottom:1px solid var(--border);white-space:nowrap}
  td{padding:.6rem .8rem;border-bottom:1px solid var(--border);vertical-align:top}
  tr:last-child td{border-bottom:none}
  .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem}
  .dim{color:var(--dim)}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .center{text-align:center}
  .ep-name{font-weight:600;overflow-wrap:anywhere}
  .ep-meta{color:var(--dim);font-size:.76rem;margin-top:.15rem;overflow-wrap:anywhere}
  .grade{display:inline-block;border:1px solid;border-radius:6px;padding:.05rem .55rem;font-weight:700;font-size:.98rem;white-space:nowrap}
  .infl-pos{color:#f85149;font-weight:700;font-variant-numeric:tabular-nums}
  .infl-neg{color:#3fb950;font-weight:600;font-variant-numeric:tabular-nums}
  .infl-zero{color:var(--dim)}
  .ind{font-size:.82rem;color:var(--dim);max-width:300px}
  .pill{display:inline-block;border:1px solid var(--border);border-radius:99px;padding:.02rem .55rem;font-size:.74rem;color:var(--dim);white-space:nowrap}
  .pill.ok{color:#3fb950;border-color:#3fb95055}
  .pill.hi{color:#f0883e;border-color:#f0883e55}
  .pill.med{color:#d29922;border-color:#d2992255}
  .note,.callout{color:var(--dim);font-size:.84rem;margin:1.1rem 0;line-height:1.6;max-width:62rem}
  .callout{background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:6px;padding:.8rem 1rem;color:var(--fg)}
  .callout.warn{border-left-color:#d29922}
  ul.ev{margin:.2rem 0 .2rem 1rem;padding:0;font-size:.82rem;color:var(--dim)}
  ul.ev li{margin:.15rem 0}
  a{color:var(--accent);text-decoration:none}
  a:hover{text-decoration:underline}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em;background:var(--panel);border:1px solid var(--border);border-radius:4px;padding:.05em .3em}
  .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.8rem;margin:1rem 0}
  .card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:1rem}
  .card h3{margin:0 0 .4rem;font-size:.95rem}
  .card p{font-size:.83rem;color:var(--dim)}
  .brandlist{columns:3;column-gap:1.5rem;font-size:.9rem}
  @media(max-width:800px){.brandlist{columns:2}}
  @media(max-width:520px){.brandlist{columns:1}}
  .brandlist li{margin:.25rem 0;break-inside:avoid}
  footer.site{border-top:1px solid var(--border);margin-top:3rem;padding-top:1.1rem;color:var(--dim);font-size:.82rem;line-height:1.7}
  footer.site nav{margin-bottom:.4rem}
  footer.site nav a{margin-right:1.1rem}
  dl.kv{display:grid;grid-template-columns:max-content 1fr;gap:.35rem 1.2rem;font-size:.9rem;margin:.8rem 0}
  dl.kv dt{color:var(--dim)}
  dl.kv dd{overflow-wrap:anywhere}
`;

/** depth = number of path segments below site root (for relative links) */
function page({ title, description, path, depth = 0, ld = [], body, ogType = "website" }) {
  const rel = depth === 0 ? "." : "..";
  const canonical = `${SITE}/${path}`;
  const blocks = [ORG, ...ld]
    .map((o) => jsonld(o["@context"] ? o : { "@context": "https://schema.org", ...o }))
    .join("\n");
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${canonical}">
<meta name="robots" content="index,follow">
<style>${CSS}</style>
${blocks}
</head><body><div class="wrap">
<div class="crumb"><a href="${rel}/index.html">Provenance x402 Trust Index</a> &middot; <a href="${rel}/methodology.html">Methodology</a> &middot; <a href="${rel}/data/index.html">Open data</a></div>
${body}
<footer class="site">
  <nav>
    <a href="${LINKS.api}">Live Provenance API</a>
    <a href="${LINKS.mcp}">provenance-mcp (npm)</a>
    <a href="${LINKS.guard}">provenance-guard (npm)</a>
    <a href="${LINKS.github}">GitHub</a>
    <a href="${rel}/methodology.html">Methodology</a>
    <a href="${rel}/data/index.html">Open data (CC-BY-4.0)</a>
    <a href="${LINKS.issues}">Disputes &amp; corrections</a>
  </nav>
  <div>All figures are statistical estimates derived from public on-chain payment data and public x402 discovery registries. Nothing here asserts fraud or contract breach by any named party — see the <a href="${rel}/methodology.html">methodology and disclaimer</a>. Data is CC-BY-4.0; cite Provenance.</div>
  <div>Provenance · published by Apeiron Capital Inc. (Arizona, USA) · data snapshot: week of ${esc(wash.weekOf)} · page built ${esc(new Date().toISOString().slice(0, 10))}</div>
</footer>
</div></body></html>`;
}

function write(relPath, content) {
  const full = join(OUT, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

// ---------------------------------------------------------- wash-report prep
// n/v rule: a "high" wash level driven by near-zero visible payer diversity can
// also be produced by facilitator batch/deferred settlement (funds don't move
// straight to payTo). We refuse to display a shaming grade in that case.
const NV_CAVEAT =
  "insufficient on-chain visibility (batch settlement possible) — facilitator batch or deferred settlement can legitimately mean few or no direct on-chain USDC transfers to the payTo address; the raw score is retained in the open data but is not verifiable as wash activity";

const merchants = wash.rows.map((r) => {
  const nv = r.washLevel === "high" && (r.observedPayers ?? 0) <= 2;
  return {
    ...r,
    displayGrade: nv ? "n/v" : r.washGrade,
    displayLevel: nv ? "not verifiable" : r.washLevel,
    visibilityCaveat: nv ? NV_CAVEAT : undefined,
    displayIndicators: nv ? ["insufficient on-chain visibility (batch settlement possible)"] : r.topIndicators,
  };
});

// endpoint slugs (host; disambiguate duplicates with payTo prefix)
const hostCount = {};
for (const m of merchants) hostCount[m.domains[0]] = (hostCount[m.domains[0]] || 0) + 1;
for (const m of merchants) {
  const host = m.domains[0].toLowerCase();
  m.slug = hostCount[m.domains[0]] > 1 ? `${host}-${m.payTo.slice(2, 8).toLowerCase()}` : host;
}

const leaderboard = [...merchants].sort(
  (a, b) => b.washRankInflation - a.washRankInflation || a.bazaarRank - b.bazaarRank
);

const sumBazaar = merchants.reduce((s, m) => s + m.bazaarCalls, 0);
const sumOrganic = merchants.reduce((s, m) => s + m.organicAdjCalls, 0);
const pctNonOrganic = Math.round((1 - sumOrganic / sumBazaar) * 100);
const gradedCorWorse = merchants.filter((m) => ["C", "D", "F"].includes(m.displayGrade)).length;
const nvCount = merchants.filter((m) => m.displayGrade === "n/v").length;
const maxInflation = Math.max(...merchants.map((m) => m.washRankInflation));

// --------------------------------------------------------- wrapper-watch prep
const suspects = ww.endpoints;
const brands = new Map(); // brandId -> {id,name,endpoints:[]}
for (const e of suspects) {
  for (const b of e.brands || []) {
    if (!brands.has(b.brandId)) brands.set(b.brandId, { id: b.brandId, name: b.brandName, endpoints: [] });
    brands.get(b.brandId).endpoints.push(e);
  }
}
const brandList = [...brands.values()].sort((a, b) => b.endpoints.length - a.endpoints.length);
for (const b of brandList) b.endpoints.sort((x, y) => y.score - x.score || (y.calls30d || 0) - (x.calls30d || 0));

const activeSuspects = suspects.filter((e) => (e.calls30d || 0) > 0).length;
const highConf = suspects.filter((e) => e.confidence === "high").length;
const medConf = suspects.filter((e) => e.confidence === "medium").length;

// ------------------------------------------------------------------- emit
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
write(".nojekyll", "");

// ================================================================== index
{
  const rows = leaderboard
    .map((m) => {
      const infl =
        m.washRankInflation > 0
          ? `<span class="infl-pos">+${m.washRankInflation}</span>`
          : m.washRankInflation < 0
            ? `<span class="infl-neg">${m.washRankInflation}</span>`
            : `<span class="infl-zero">0</span>`;
      const gradeSub = m.displayGrade === "n/v" ? `not verifiable · raw ${m.washScore}/100` : `${m.washScore}/100 ${m.washLevel}`;
      return `<tr>
  <td class="mono dim">#${m.bazaarRank}</td>
  <td><div class="ep-name"><a href="endpoints/${m.slug}.html">${esc(m.name)}</a></div><div class="ep-meta mono">${esc(shortAddr(m.payTo))} · ${esc(m.domains[0])}</div></td>
  <td class="num">${num(m.bazaarCalls)}<div class="ep-meta">rank #${m.bazaarRank}</div></td>
  <td class="num">${num(m.organicAdjCalls)}<div class="ep-meta">rank #${m.organicRank}</div></td>
  <td class="center">${gradeBadge(m.displayGrade, gradeSub)}</td>
  <td class="center">${infl}</td>
  <td class="ind">${esc(m.displayIndicators[0] || "none observed")}</td>
</tr>`;
    })
    .join("\n");

  const brandLis = brandList
    .map(
      (b) =>
        `<li><a href="brands/${b.id}.html">${esc(b.name)}</a> <span class="dim">— ${b.endpoints.length} suspected</span></li>`
    )
    .join("\n");

  const ld = [
    {
      "@type": "Dataset",
      name: "Bazaar Wash Report — week of " + wash.weekOf,
      description:
        "Organic-revenue-quality grades for the top 24 Coinbase x402 Bazaar merchants on Base, computed from public on-chain USDC transfers. Includes wash-risk scores, wash-rank inflation, and per-endpoint indicators.",
      url: SITE + "/",
      license: "https://creativecommons.org/licenses/by/4.0/",
      creator: { "@id": SITE + "/#org" },
      temporalCoverage: wash.weekOf + "/" + wash.takenAt.slice(0, 10),
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: `${SITE}/data/wash-report-${wash.weekOf}.json`,
        },
      ],
    },
    {
      "@type": "Dataset",
      name: "Wrapper Watch — x402 resale-authorization scan",
      description: `Per-brand aggregates of ${num(ww.suspectedWrappers)} x402 endpoints (of ${num(ww.uniqueEndpoints)} scanned) exhibiting statistical reseller signatures against 44 first-party API brands. Reseller signals only; authorization status unknown — verification recommended.`,
      url: SITE + "/",
      license: "https://creativecommons.org/licenses/by/4.0/",
      creator: { "@id": SITE + "/#org" },
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: SITE + "/data/wrapper-watch-summary.json",
        },
      ],
    },
  ];

  const body = `
<header class="site">
<h1>The x402 Trust Index <span class="dim">by Provenance</span></h1>
<p class="sub">Independent trust ratings, computed from publicly observable on-chain payments, for machine-payable (x402) API endpoints — which paid-API traffic is organic, and which endpoints resell someone else's data. Built from public data; published as open data so agents, answer engines, and API-trust teams can check before they pay.</p>
</header>

<div class="tiles">
  <div class="tile"><b>${num(wash.bazaarItemsScanned)}</b><span>Bazaar listings scanned</span></div>
  <div class="tile"><b>${merchants.length}</b><span>top merchants scored (Base USDC)</span></div>
  <div class="tile"><b>${gradedCorWorse}/${merchants.length}</b><span>graded C or worse${nvCount ? ` (+${nvCount} not verifiable)` : ""}</span></div>
  <div class="tile"><b>${pctNonOrganic}%</b><span>of these ${merchants.length} merchants' claimed volume estimated non-organic (this snapshot only)</span></div>
  <div class="tile"><b>${num(ww.suspectedWrappers)}</b><span>endpoints with reseller signatures (${brandList.length} brands)</span></div>
</div>

<div class="callout warn"><b>Dated snapshot — not a live feed.</b> This report covers the week of ${esc(wash.weekOf)} on <b>Base</b> (USDC, eip155:8453), using a ${wash.windowDays}-day on-chain window against the Bazaar's 30-day claimed calls. It is one operator's statistical estimate for ${merchants.length} merchants in that window; it is not a measurement of all x402 activity, and the figures do not update until a new snapshot is published. The live API, <code>provenance-mcp</code> and <code>provenance-guard</code> currently score <b>Algorand</b> addresses — a different set of endpoints from this table.</div>
<h2 id="wash-report">Bazaar Wash Report — snapshot, week of ${esc(wash.weekOf)}</h2>
<p class="note">The top ${merchants.length} Coinbase x402 Bazaar merchants on Base, graded on <b>organic revenue quality</b> and ranked by <b>wash-rank inflation</b>: how many leaderboard positions raw claimed volume buys beyond what organic-adjusted volume supports. Bazaar ranks by volume and recency with no fraud filtering; this table quantifies the gap. Click an endpoint for its full scorecard.</p>
<div class="tblwrap"><table>
<thead><tr><th>Bazaar rank</th><th>Endpoint</th><th>Bazaar 30d calls</th><th>Organic-adjusted</th><th>Wash grade</th><th>Wash-rank inflation</th><th>Top indicator</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
<p class="note"><b>n/v (not verifiable):</b> for some endpoints — typically ones settling through a facilitator — batch or deferred settlement means direct on-chain USDC transfers to the receiving wallet can legitimately be absent. We do not display a letter grade where the score is driven mainly by missing visibility rather than positive wash signals; the raw score is shown beside each n/v so nothing is hidden, and it also remains in the <a href="data/index.html">open data</a>.</p>

<h2 id="wrapper-watch">Wrapper Watch — resale-authorization audits by brand</h2>
<p class="note">We scanned ${num(ww.uniqueEndpoints)} unique x402-paywalled endpoints across the public discovery registries (Coinbase Bazaar, GoPlausible/Algorand) for reseller signatures against 44 first-party API brands. ${num(ww.suspectedWrappers)} endpoints reference a first-party brand while hosted off that brand's domain (${highConf} high-confidence, ${medConf} medium); ${num(activeSuspects)} showed paid activity in the last 30 days. Everything is stated as <em>reseller signals present, authorization unknown — verification recommended</em>; a flagged endpoint may hold a legitimate redistribution license.</p>
<ul class="brandlist">${brandLis}</ul>

<h2>Use this data</h2>
<div class="cols">
  <div class="card"><h3><a href="data/index.html">Open data downloads</a></h3><p>Machine-readable JSON for the wash report and per-brand wrapper aggregates. CC-BY-4.0 — cite Provenance.</p></div>
  <div class="card"><h3><a href="${LINKS.guard}">provenance-guard</a></h3><p>A pre-payment check for x402 clients: looks up the payee's wash-risk verdict before paying. Fails open by default; set <code>allowUnknown: false</code> to fail closed.</p></div>
  <div class="card"><h3><a href="${LINKS.mcp}">provenance-mcp</a></h3><p>MCP server so your agent can check any x402 endpoint's wash risk before trusting or paying it.</p></div>
  <div class="card"><h3><a href="methodology.html">Methodology</a></h3><p>The 8-signal organic-revenue-quality model, wash indicators, reseller signatures, limitations, and the dispute path.</p></div>
</div>`;

  write(
    "index.html",
    page({
      title: "The x402 Trust Index by Provenance — wash-trading grades & API reseller audits",
      description: `On-chain trust ratings for x402 endpoints: wash-trading grades for the top ${merchants.length} Coinbase Bazaar merchants (week of ${wash.weekOf}) and ${num(ww.suspectedWrappers)} endpoints showing API-reseller signals (authorization unknown) across ${brandList.length} brands. Open data, CC-BY-4.0.`,
      path: "",
      depth: 0,
      ld,
      body,
    })
  );
}

// ================================================================ methodology
{
  const body = `
<h1>Methodology — how Provenance scores x402 endpoints</h1>
<p class="sub">Plain-English description of every signal behind the numbers on this site, what they can and cannot prove, and how to dispute a rating.</p>

<div class="callout warn"><b>Read this first.</b> Every score on this site is a <b>statistical estimate computed from public data</b>: on-chain USDC transfers and the public x402 discovery registries. A high wash-risk score means the payment pattern is <em>consistent with</em> non-organic demand (self-testing, load generation, a single dominant payer) — it is <b>not</b> a finding of fraud. A reseller flag means an endpoint <em>exhibits signatures consistent with</em> reselling a first-party API — its actual authorization status is <b>unknown</b> to us; it may hold a legitimate redistribution license. Where our visibility is structurally limited (facilitator batch settlement), we say so and withhold the grade.</div>

<h2>Data sources</h2>
<ul class="ev" style="font-size:.9rem;color:var(--fg)">
  <li><b>Coinbase x402 Bazaar</b> — the public discovery feed (${num(ww.sources.bazaar.fetched)} listings at scan time), including each listing's own published <code>quality.l30DaysTotalCalls</code> and payer counts.</li>
  <li><b>GoPlausible x402 registry (Algorand)</b> — ${num(ww.sources.goplausible.fetched)} listings.</li>
  <li><b>Base mainnet (eip155:8453)</b> — raw USDC (<code>${esc(wash.asset.split(" ")[1] || "")}</code>) transfer logs to each merchant's <code>payTo</code> address over a ${wash.windowDays}-day window.</li>
</ul>
<p class="note">No private data, no scraping behind authentication, no payment interception. Everything used here is publicly readable by anyone.</p>

<h2>The 8-signal organic-revenue-quality (ORQ) model</h2>
<p class="note" style="color:var(--fg)">Each scored merchant gets a wash-risk score from 0 (fully organic-looking) to 100, combining eight signals over its observed on-chain receipts:</p>
<ol style="font-size:.9rem;line-height:1.8;margin-left:1.2rem">
  <li><b>Distinct-payer count</b> — how many unique wallets actually paid. One or two payers behind thousands of claimed calls is the strongest single wash indicator.</li>
  <li><b>Payer revenue concentration (HHI)</b> — Herfindahl index of revenue by payer cluster. “Top cluster holds 99% of revenue” means one actor funds nearly everything.</li>
  <li><b>Funding-cluster analysis</b> — payers funded from a common source wallet are collapsed into one cluster before concentration is computed.</li>
  <li><b>Payment-timing regularity</b> — coefficient of variation of inter-payment gaps and the share of identical-interval gaps. Metronomic timing is machine-generated load, not demand.</li>
  <li><b>Wallet age &amp; freshness</b> — clusters of newly created wallets that only ever pay one endpoint.</li>
  <li><b>Self-dealing loops</b> — payout flows that return to wallets that fund the payers.</li>
  <li><b>Claimed-vs-observed gap</b> — registry-claimed 30d call volume versus on-chain receipts in the observation window (see the settlement caveat below).</li>
  <li><b>Cross-endpoint payer overlap</b> — the same tiny payer set boosting several endpoints at once.</li>
</ol>
<p class="note">Grades: <b>A</b> (&lt;10), <b>B</b> (10–19), <b>C</b> (20–41), <b>D</b> (42–69), <b>F</b> (≥70). <b>Organic-adjusted calls</b> = claimed 30d calls × (1 − score/100). <b>Wash-rank inflation</b> = organic-adjusted rank − raw-volume rank: how many leaderboard positions the raw number buys beyond what organic-adjusted volume supports.</p>

<h2>Exact scoring (what the code does)</h2>
<p class="note" style="color:var(--fg)">The letter grades in the Wash Report come from an <b>additive wash-risk score</b>, capped at 100. Each indicator has a severity from 0 to 1 that is multiplied by a fixed weight; weights deliberately sum past 100 so several strong tells saturate the score. Source: <code>packages/scoring/src/wash-risk.ts</code> in <a href="https://github.com/apeirontrade/agentkit">agentkit</a>, methodology version 0.1.0.</p>
<div class="tblwrap"><table><thead><tr><th>Indicator</th><th>Weight</th><th>Severity rule</th></tr></thead><tbody>
<tr><td>Few distinct payers</td><td>45</td><td>1 payer = 1.0; 2 = 0.9; 3–4 = 0.65; 5–9 = 0.35; 10+ = 0</td></tr>
<tr><td>Self-dealing payout loops</td><td>25</td><td>share of revenue whose payer is reachable from the merchant's own payouts</td></tr>
<tr><td>Revenue concentration</td><td>20</td><td>(HHI across payer clusters − 0.1) / 0.9, floored at 0</td></tr>
<tr><td>Shared controlling key (Algorand rekey)</td><td>20</td><td>share of payers sharing an auth address; not applicable on Base</td></tr>
<tr><td>Fresh payer wallets</td><td>15</td><td>median wallet age at first payment: &lt;1d = 1.0; &lt;3d = 0.7; &lt;7d = 0.4; &lt;30d = 0.15</td></tr>
<tr><td>Metronomic timing</td><td>15</td><td>needs ≥5 payments; max of (1 − CV/0.3 when CV &lt; 0.3) and the share of identical-interval gaps when above 50%</td></tr>
<tr><td>Single-funder ring</td><td>15</td><td>share of payers funded by one wallet, counted only above 30%</td></tr>
</tbody></table></div>
<p class="note">Levels: <b>low</b> &lt;20, <b>medium</b> 20–44, <b>high</b> 45–69, <b>critical</b> ≥70. Where the claimed-vs-observed gap is the main driver (no on-chain receipts despite claimed calls) the row is shown as n/v rather than graded.</p>
<p class="note" style="color:var(--fg)">Separately, endpoints with enough data (at least 50 payments from at least 10 payer clusters) get an <b>organic-revenue-quality (ORQ)</b> score: a weighted geometric mean of eight sub-scores — funding graph 0.20, self-dealing 0.20, retention 0.15, temporal regularity 0.15, wallet fingerprint 0.10, amount distribution (including a Benford first-digit test) 0.08, concentration 0.07, cross-endpoint overlap 0.05 — with each sub-score floored at 0.02 so one zero caps rather than annihilates the result. ORQ grades: A ≥85, B ≥70, C ≥50, D ≥30, else F. A 90% confidence interval is computed by bootstrap, resampling whole payers (not individual payments) so each payer's timing structure is preserved; the interval is widened if needed to contain the observed score. Most endpoints today are below the data floor and receive only the wash-risk score above.</p>

<h2>What has not been validated</h2>
<ul style="font-size:.9rem;line-height:1.8;margin-left:1.2rem">
  <li>The weights above were set by judgment, not fitted to data. There is no labelled ground-truth set yet, so we cannot publish a false-positive rate, precision/recall, or an ROC curve.</li>
  <li>The model has not been benchmarked against published wash-trading detectors, peer-reviewed, or independently replicated. The code and data are open so that anyone can try.</li>
  <li>A letter grade is a compact summary of a statistical estimate. It is not a finding about any operator's intent.</li>
</ul>

<h2>Which chain each product covers</h2>
<ul style="font-size:.9rem;line-height:1.8;margin-left:1.2rem">
  <li><b>This site's Wash Report:</b> Base mainnet USDC transfers, top Coinbase Bazaar merchants.</li>
  <li><b>Live API, provenance-mcp, provenance-guard:</b> Algorand USDC (ASA 31566704). Addresses on other chains return “unknown”.</li>
  <li><b>Wrapper Watch:</b> listing text from public registries on any chain; no payment data is used.</li>
</ul>

<h2>The settlement-visibility caveat (“n/v”)</h2>
<p class="note" style="color:var(--fg)">x402 payments frequently settle through a <b>facilitator</b>, which may batch or defer transfers. In that architecture, few or no direct on-chain USDC transfers to the merchant's <code>payTo</code> address is <b>normal and legitimate</b>. Where a high score is driven mainly by <em>missing</em> on-chain receipts or a near-zero visible payer set — rather than by positive wash signals like metronomic timing or self-dealing loops — we display <b>n/v (not verifiable): insufficient on-chain visibility (batch settlement possible)</b> instead of a letter grade. The raw score is preserved in the open-data JSON for transparency, flagged with the same caveat.</p>

<h2>Wrapper Watch: reseller signatures</h2>
<p class="note" style="color:var(--fg)">Wrapper Watch flags endpoints whose public listing <em>exhibits signatures consistent with</em> reselling a first-party API from a domain the brand does not control. Signals, each contributing points to a 0–100 likelihood score:</p>
<ol style="font-size:.9rem;line-height:1.8;margin-left:1.2rem">
  <li><b>Brand-term-off-domain</b> — the listing references a first-party brand (in its description, tags, URL, or schema) while hosted on an unrelated domain.</li>
  <li><b>Proxy language</b> — self-describes as a proxy (“API proxy”, “powered by …”).</li>
  <li><b>Generic passthrough schema</b> — the input schema is a bare passthrough (a single <code>prompt</code>/<code>query</code>/<code>url</code> field), consistent with forwarding to an upstream API.</li>
  <li><b>Cost-plus markup</b> — per-call price is a near-multiple of the brand's public price.</li>
  <li><b>Domain forensics</b> — generic infrastructure hosting (e.g. <code>*.railway.app</code>, <code>*.vercel.app</code>) while referencing premium first-party data.</li>
  <li><b>Live-402 probe</b> — where noted, we confirmed the endpoint actually returns HTTP 402 Payment Required today.</li>
</ol>
<p class="note">Thresholds: flagged at ≥${ww.thresholds.suspect}; high confidence ≥${ww.thresholds.high}; medium ≥${ww.thresholds.medium}. <b>Every flag means “suspected — verification recommended”, and the resale-authorization status of every flagged endpoint is unknown to us.</b> Brand pages exist so the one party who <em>can</em> verify authorization — the brand's own API/trust team — can review the evidence quickly.</p>

<h2>Limitations</h2>
<ul style="font-size:.9rem;line-height:1.8;margin-left:1.2rem">
  <li>Transfers to a <code>payTo</code> wallet may include non-x402 USDC receipts; we cannot always separate them.</li>
  <li>Low payer diversity can also reflect a young service or one large legitimate customer.</li>
  <li>Facilitator batch/deferred settlement hides receipts from direct on-chain observation (see n/v above).</li>
  <li>Brand-term matching can produce false positives (e.g. comparative mentions, tooling that merely integrates a brand). Comparative mentions are down-weighted but not perfectly.</li>
  <li>The observation window is ${wash.windowDays} days for on-chain receipts vs the registry's 30-day claimed volume; the claimed-vs-observed gap signal accounts for this scaling, but short windows add noise.</li>
  <li>A flagged endpoint may hold a redistribution license we cannot see. We publish signatures, not conclusions.</li>
</ul>

<h2>Disputes &amp; corrections</h2>
<p class="note" style="color:var(--fg)">If you operate a listed endpoint or represent a named brand and believe a rating or flag is wrong — or you can demonstrate authorization — open an issue at <a href="${LINKS.issues}">github.com/apeirontrade/provenance-site/issues</a>. Provide the endpoint URL and any evidence you can share. We correct errors and annotate verified authorizations in the next weekly build, and will publish the correction alongside the original.</p>

<h2>Legal framing</h2>
<p class="note">This site publishes independent statistical analysis of public blockchain data and public API-registry listings, in the tradition of independent ratings and consumer-protection research. Statements about named endpoints are limited to (a) verifiable public facts (listings, prices, on-chain transfer patterns) and (b) clearly-labelled statistical opinions derived from them (“consistent with”, “suspected”, “verification recommended”). No statement on this site asserts, and none should be read as asserting, that any named party has committed fraud, breached a contract, or violated any law.</p>`;

  write(
    "methodology.html",
    page({
      title: "Methodology — Provenance x402 wash-risk & reseller-signature scoring",
      description:
        "How Provenance scores x402 endpoints: the 8-signal organic-revenue-quality model, wash indicators, reseller signatures, data sources (public on-chain + registries), limitations, the n/v settlement caveat, and the dispute path.",
      path: "methodology.html",
      depth: 0,
      ld: [
        {
          "@type": "Article",
          headline: "Provenance methodology: x402 wash-risk and reseller-signature scoring",
          author: { "@id": SITE + "/#org" },
          datePublished: wash.takenAt.slice(0, 10),
          mainEntityOfPage: SITE + "/methodology.html",
        },
      ],
      body,
    })
  );
}

// ================================================================ endpoints/
for (const m of merchants) {
  const host = m.domains[0];
  const nv = m.displayGrade === "n/v";
  const indicators = m.displayIndicators.length
    ? `<ul class="ev" style="font-size:.88rem;color:var(--fg)">${m.displayIndicators.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
    : `<p class="note">No wash indicators observed in this window.</p>`;

  const ld = [
    {
      "@type": "Report",
      headline: `${m.name} — x402 organic-revenue-quality scorecard (week of ${wash.weekOf})`,
      author: { "@id": SITE + "/#org" },
      datePublished: wash.takenAt.slice(0, 10),
      about: { "@type": "WebAPI", name: m.name, url: m.sampleResource },
      mainEntityOfPage: `${SITE}/endpoints/${m.slug}.html`,
    },
  ];

  const body = `
<h1>${esc(m.name)} <span class="dim">— x402 wash-risk scorecard</span></h1>
<p class="sub">Week of ${esc(wash.weekOf)} · Coinbase Bazaar merchant on Base · receiving wallet <code>${esc(m.payTo)}</code></p>

<div class="tiles">
  <div class="tile"><b>${esc(m.displayGrade)}</b><span>wash grade${nv ? " (not verifiable)" : ` · score ${m.washScore}/100 (${esc(m.washLevel)})`}</span></div>
  <div class="tile"><b>#${m.bazaarRank}</b><span>Bazaar volume rank</span></div>
  <div class="tile"><b>${num(m.bazaarCalls)}</b><span>claimed 30d calls (Bazaar)</span></div>
  <div class="tile"><b>${num(m.observedPayments)}</b><span>on-chain payments observed (${wash.windowDays}d)</span></div>
  <div class="tile"><b>${num(m.observedPayers)}</b><span>distinct on-chain payers</span></div>
  <div class="tile"><b>${m.washRankInflation > 0 ? "+" : ""}${m.washRankInflation}</b><span>wash-rank inflation (positions)</span></div>
</div>

${nv ? `<div class="callout warn"><b>Not verifiable (n/v).</b> ${esc(NV_CAVEAT)}. This endpoint's raw score (${m.washScore}/100) is preserved in the <a href="../data/index.html">open data</a> but is displayed as n/v rather than a letter grade.</div>` : ""}

<h2>Signals observed</h2>
${indicators}

<dl class="kv">
  <dt>Domains</dt><dd class="mono">${m.domains.slice(0, 8).map(esc).join(", ")}${m.domains.length > 8 ? ` <span class="dim">+${m.domains.length - 8} more</span>` : ""}</dd>
  <dt>Routes listed</dt><dd>${num(m.routes)}</dd>
  <dt>Sample resource</dt><dd class="mono">${esc(m.sampleResource)}</dd>
  <dt>Claimed payers (Bazaar)</dt><dd>${num(m.bazaarClaimedPayers)}</dd>
  <dt>Observed USDC (${wash.windowDays}d)</dt><dd>${usd(m.observedUsdc)}</dd>
  <dt>Organic-adjusted calls</dt><dd>${num(m.organicAdjCalls)} (rank #${m.organicRank} vs raw rank #${m.bazaarRank})</dd>
  <dt>Chain / asset</dt><dd class="mono">${esc(wash.chain)} · USDC</dd>
  <dt>Data window</dt><dd>${wash.windowDays} days ending ${esc(wash.takenAt.slice(0, 10))}</dd>
</dl>

<p class="note">How to read this: the grade estimates how much of this endpoint's claimed call volume is supported by organic multi-party on-chain demand. It is a statistical opinion derived from public data — <b>not</b> an accusation of wrongdoing. Full signal definitions, the n/v rule, and limitations are in the <a href="../methodology.html">methodology</a>. Operators can dispute or annotate via <a href="${LINKS.issues}">GitHub issues</a>.</p>`;

  write(
    `endpoints/${m.slug}.html`,
    page({
      title: `${m.name} x402 wash-risk score: ${m.displayGrade === "n/v" ? "n/v (not verifiable)" : `grade ${m.displayGrade} (${m.washScore}/100)`} — Provenance`,
      description: `Is ${host} x402 traffic organic? On-chain audit for week of ${wash.weekOf}: ${num(m.bazaarCalls)} claimed calls, ${num(m.observedPayments)} observed payments from ${num(m.observedPayers)} payers, wash grade ${m.displayGrade}. Statistical signals, not accusations.`,
      path: `endpoints/${m.slug}.html`,
      depth: 1,
      ld,
      ogType: "article",
      body,
    })
  );
}

// =================================================================== brands/
for (const b of brandList) {
  const note = BRAND_NOTES[b.id] || "";
  const active = b.endpoints.filter((e) => (e.calls30d || 0) > 0);
  const high = b.endpoints.filter((e) => e.confidence === "high");
  const live402 = b.endpoints.filter((e) => e.probe && e.probe.is402);

  const rows = b.endpoints
    .map((e) => {
      const ev = (e.evidence || [])
        .slice(0, 4)
        .map((x) => `<li>${esc(x.detail)}</li>`)
        .join("");
      const confClass = e.confidence === "high" ? "hi" : e.confidence === "medium" ? "med" : "";
      const probe = e.probe
        ? e.probe.is402
          ? `<span class="pill ok">live 402 confirmed</span>`
          : `<span class="pill">probe: HTTP ${e.probe.status}</span>`
        : `<span class="pill">not probed</span>`;
      return `<tr>
  <td>
    <div class="ep-name mono">${esc(e.url)}</div>
    <div class="ep-meta">${esc(e.serviceName || "")}${e.description ? " — " + esc(e.description.slice(0, 180)) + (e.description.length > 180 ? "…" : "") : ""}</div>
    <div class="ep-meta mono">pays to ${esc(shortAddr(e.payTo))} on ${esc(e.network)} · via ${esc(e.source)}</div>
  </td>
  <td class="num">${e.priceUsd != null ? usd(e.priceUsd) : "—"}</td>
  <td class="num">${num(e.calls30d || 0)}<div class="ep-meta">${num(e.payers30d || 0)} payers</div></td>
  <td class="center"><span class="pill ${confClass}">${esc(e.confidence)} · ${e.score}/100</span><div style="margin-top:.3rem">${probe}</div></td>
  <td><ul class="ev">${ev}</ul></td>
</tr>`;
    })
    .join("\n");

  const ld = [
    {
      "@type": "Report",
      headline: `x402 endpoints offering ${b.name} data — resale-authorization audit`,
      author: { "@id": SITE + "/#org" },
      datePublished: ww.generatedAt.slice(0, 10),
      about: { "@type": "Brand", name: b.name },
      mainEntityOfPage: `${SITE}/brands/${b.id}.html`,
    },
  ];

  const body = `
<h1>x402 endpoints offering ${esc(b.name)} data <span class="dim">— resale-authorization audit</span></h1>
<p class="sub">${b.endpoints.length} machine-payable (x402) endpoints in the public discovery registries exhibit reseller signatures referencing <b>${esc(b.name)}</b> while hosted off ${esc(b.name)}'s own domains. Resale-authorization status: <b>unknown — reseller signals present, verification recommended</b>. Any of these endpoints may hold a legitimate redistribution license.</p>

${note ? `<div class="callout">Context: ${esc(note)}</div>` : ""}

<div class="tiles">
  <div class="tile"><b>${b.endpoints.length}</b><span>suspected reseller endpoints</span></div>
  <div class="tile"><b>${high.length}</b><span>high-confidence signatures (≥${ww.thresholds.high}/100)</span></div>
  <div class="tile"><b>${active.length}</b><span>with paid activity in the last 30d</span></div>
  <div class="tile"><b>${live402.length}</b><span>live-402 confirmed by probe</span></div>
</div>

<p class="note">Scan of ${num(ww.uniqueEndpoints)} unique x402 endpoints on ${esc(ww.generatedAt.slice(0, 10))}, sources: Coinbase Bazaar + GoPlausible registry. Payment counts come from the registries' own published 30-day quality signals. Evidence bullets are automated signature matches — see the <a href="../methodology.html">methodology</a> for signal definitions, false-positive modes, and the <a href="${LINKS.issues}">dispute path</a>. If you are on ${esc(b.name)}'s API or trust team and want the full evidence set or a re-verification, open an issue — it's free.</p>

<div class="tblwrap"><table>
<thead><tr><th>Endpoint</th><th>Price/call</th><th>Calls 30d</th><th>Signature</th><th>Evidence (automated signature matches)</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>

<p class="note"><b>Framing note:</b> every row above is a statistical signature match, published so that ${esc(b.name)}'s own team — the only party who can actually verify authorization — can review it. Nothing on this page asserts that any listed operator is acting unlawfully or in breach of any agreement.</p>`;

  write(
    `brands/${b.id}.html`,
    page({
      title: `x402 endpoints offering ${b.name} data — resale-authorization audit (${b.endpoints.length} suspected) — Provenance`,
      description: `${b.name} API resold via x402? ${b.endpoints.length} ${b.name} reseller-signal endpoints (authorization unknown) found in public x402 registries (${high.length} high-confidence, ${active.length} active in 30d). Evidence, prices, on-chain payment counts. Verification recommended.`,
      path: `brands/${b.id}.html`,
      depth: 1,
      ld,
      ogType: "article",
      body,
    })
  );
}

// ==================================================================== data/
{
  // wash report JSON (raw scores preserved; display fields added)
  const washOut = {
    ...wash,
    license: "CC-BY-4.0 — https://creativecommons.org/licenses/by/4.0/ — cite Provenance",
    citation: `Provenance, "The Bazaar Wash Report", week of ${wash.weekOf}, ${SITE}/`,
    note: "All scores are statistical estimates from public on-chain data; see " + SITE + "/methodology.html. displayGrade n/v = insufficient on-chain visibility (batch settlement possible); raw washScore retained.",
    rows: merchants.map(({ slug, displayIndicators, ...m }) => ({
      ...m,
      scorecard: `${SITE}/endpoints/${slug}.html`,
    })),
  };
  write(`data/wash-report-${wash.weekOf}.json`, JSON.stringify(washOut, null, 1));

  // wrapper-watch per-brand summary (aggregates + top endpoints, not the full dump)
  const wwOut = {
    title: "Wrapper Watch — x402 resale-authorization scan (per-brand summary)",
    generatedAt: ww.generatedAt,
    license: "CC-BY-4.0 — https://creativecommons.org/licenses/by/4.0/ — cite Provenance",
    citation: `Provenance, "Wrapper Watch", ${ww.generatedAt.slice(0, 10)}, ${SITE}/`,
    note: "Reseller signals only — authorization status unknown, verification recommended. Signature matches, not conclusions; a flagged endpoint may hold a legitimate redistribution license. Methodology: " + SITE + "/methodology.html",
    sources: ww.sources,
    uniqueEndpointsScanned: ww.uniqueEndpoints,
    suspectedWrappers: ww.suspectedWrappers,
    thresholds: ww.thresholds,
    brands: brandList.map((b) => ({
      brandId: b.id,
      brandName: b.name,
      auditPage: `${SITE}/brands/${b.id}.html`,
      suspectedEndpoints: b.endpoints.length,
      highConfidence: b.endpoints.filter((e) => e.confidence === "high").length,
      mediumConfidence: b.endpoints.filter((e) => e.confidence === "medium").length,
      lowConfidence: b.endpoints.filter((e) => e.confidence === "low").length,
      withPaidActivity30d: b.endpoints.filter((e) => (e.calls30d || 0) > 0).length,
      totalCalls30d: b.endpoints.reduce((s, e) => s + (e.calls30d || 0), 0),
      live402Confirmed: b.endpoints.filter((e) => e.probe && e.probe.is402).length,
      topEndpoints: b.endpoints.slice(0, 5).map((e) => ({
        url: e.url,
        host: e.host,
        score: e.score,
        confidence: e.confidence,
        priceUsd: e.priceUsd ?? null,
        calls30d: e.calls30d ?? 0,
        payers30d: e.payers30d ?? 0,
        network: e.network,
        live402: e.probe ? !!e.probe.is402 : null,
      })),
    })),
  };
  write("data/wrapper-watch-summary.json", JSON.stringify(wwOut, null, 1));

  const ld = [
    {
      "@type": "Dataset",
      name: `Bazaar Wash Report — week of ${wash.weekOf} (JSON)`,
      description: "Per-merchant wash-risk scores, grades, indicators and wash-rank inflation for the top 24 Coinbase x402 Bazaar merchants on Base.",
      url: `${SITE}/data/index.html`,
      license: "https://creativecommons.org/licenses/by/4.0/",
      creator: { "@id": SITE + "/#org" },
      distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/data/wash-report-${wash.weekOf}.json` }],
    },
    {
      "@type": "Dataset",
      name: "Wrapper Watch per-brand summary (JSON)",
      description: `Per-brand aggregates of ${num(ww.suspectedWrappers)} suspected x402 reseller endpoints across ${brandList.length} first-party API brands, with top endpoints and confidence tiers.`,
      url: `${SITE}/data/index.html`,
      license: "https://creativecommons.org/licenses/by/4.0/",
      creator: { "@id": SITE + "/#org" },
      distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/data/wrapper-watch-summary.json` }],
    },
  ];

  const body = `
<h1>Open data</h1>
<p class="sub">Machine-readable JSON behind every page on this site. Licensed <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</a> — free to use, share and build on, <b>cite Provenance</b> (a link to <code>${SITE}/</code> is perfect).</p>

<div class="cols">
  <div class="card">
    <h3><a href="wash-report-${wash.weekOf}.json">wash-report-${wash.weekOf}.json</a></h3>
    <p>The Bazaar Wash Report, week of ${wash.weekOf}: ${merchants.length} merchants, full scores (raw scores preserved even where the site displays n/v), indicators, ranks, on-chain observations. ~23 KB.</p>
  </div>
  <div class="card">
    <h3><a href="wrapper-watch-summary.json">wrapper-watch-summary.json</a></h3>
    <p>Wrapper Watch per-brand summary: ${brandList.length} brands, suspect counts by confidence tier, activity, and the top endpoints per brand. Full per-endpoint evidence lives on the <a href="../index.html#wrapper-watch">brand pages</a>.</p>
  </div>
</div>

<p class="note">Published as dated snapshots; a new one appears only when a new study is run, so check the week shown above. For programmatic checks (per-address verdicts) use the <a href="${LINKS.api}">live Provenance API</a> or <a href="${LINKS.mcp}">provenance-mcp</a>. Questions or corrections: <a href="${LINKS.issues}">GitHub issues</a>.</p>`;

  write(
    "data/index.html",
    page({
      title: "Open data — x402 wash-report & reseller-audit JSON downloads (CC-BY-4.0) — Provenance",
      description: `Download the Bazaar Wash Report (week of ${wash.weekOf}) and the Wrapper Watch per-brand reseller summary as JSON. CC-BY-4.0, cite Provenance.`,
      path: "data/index.html",
      depth: 1,
      ld,
      body,
    })
  );
}

// ============================================================ sitemap/robots
{
  const urls = [
    "",
    "methodology.html",
    "data/index.html",
    `data/wash-report-${wash.weekOf}.json`,
    "data/wrapper-watch-summary.json",
    ...merchants.map((m) => `endpoints/${m.slug}.html`),
    ...brandList.map((b) => `brands/${b.id}.html`),
  ];
  const today = new Date().toISOString().slice(0, 10);
  write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${SITE}/${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
      `\n</urlset>\n`
  );

  write(
    "robots.txt",
    `# Provenance x402 Trust Index — we welcome all crawlers, including AI/answer engines.
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: ${SITE}/sitemap.xml
`
  );
}

// ================================================================== llms.txt
{
  const brandLines = brandList
    .map((b) => `- [${b.name} resale audit](${SITE}/brands/${b.id}.html): ${b.endpoints.length} suspected reseller endpoints`)
    .join("\n");

  write(
    "llms.txt",
    `# Provenance — The x402 Trust Index

> Independent trust ratings, computed from publicly observable on-chain payments, for machine-payable (x402) API endpoints: which paid-API traffic is organic (wash-trading grades for Coinbase Bazaar merchants) and which endpoints exhibit signatures of reselling first-party APIs (${num(ww.suspectedWrappers)} suspected across ${brandList.length} brands). All figures are statistical estimates from public data — "consistent with", never accusations. Open data, CC-BY-4.0, cite Provenance.

Key facts: week of ${wash.weekOf}, we scored the top ${merchants.length} Coinbase x402 Bazaar merchants on Base against 7 days of on-chain USDC transfers; ~${pctNonOrganic}% of top-tier claimed call volume is estimated non-organic. Separately, of ${num(ww.uniqueEndpoints)} x402 endpoints scanned, ${num(ww.suspectedWrappers)} exhibit reseller signatures against 44 first-party API brands (${highConf} high-confidence); ${num(activeSuspects)} had paid activity in the last 30 days.

## Docs

- [The x402 Trust Index (home + dated Bazaar Wash Report snapshot)](${SITE}/): leaderboard of ${merchants.length} scored merchants with wash grades and wash-rank inflation
- [Methodology](${SITE}/methodology.html): the 8-signal organic-revenue-quality model, reseller signatures, the n/v settlement caveat, limitations, dispute path

## Data (CC-BY-4.0, cite Provenance)

- [Bazaar Wash Report JSON](${SITE}/data/wash-report-${wash.weekOf}.json): full per-merchant scores and indicators
- [Wrapper Watch per-brand summary JSON](${SITE}/data/wrapper-watch-summary.json): per-brand suspect counts and top endpoints
- [Open data index](${SITE}/data/index.html)

## Tools

- [Live Provenance API](${LINKS.api}): free per-address wash-risk verdicts (GET /check/<address>)
- [provenance-mcp on npm](${LINKS.mcp}): MCP server — let your agent check any x402 endpoint before paying
- [provenance-guard on npm](${LINKS.guard}): one-line pre-payment guard that blocks x402 payments to endpoints whose revenue looks fabricated
- [GitHub](${LINKS.github}): site source + dispute/correction issues

## Brand audits (x402 endpoints offering <brand> data — resale-authorization unknown, verification recommended)

${brandLines}
`
  );

  // llms-full.txt — fuller inline content
  const lbText = leaderboard
    .map(
      (m) =>
        `| #${m.bazaarRank} | ${m.name} | ${num(m.bazaarCalls)} | ${num(m.organicAdjCalls)} | ${m.displayGrade}${m.displayGrade === "n/v" ? "" : ` (${m.washScore}/100)`} | ${m.washRankInflation > 0 ? "+" : ""}${m.washRankInflation} | ${m.displayIndicators[0] || "none observed"} | ${SITE}/endpoints/${m.slug}.html |`
    )
    .join("\n");
  const brandText = brandList
    .map((b) => {
      const top = b.endpoints
        .slice(0, 3)
        .map((e) => `  - ${e.url} (score ${e.score}/100 ${e.confidence}${e.probe && e.probe.is402 ? ", live 402 confirmed" : ""}, ${num(e.calls30d || 0)} calls/30d)`)
        .join("\n");
      return `### ${b.name} — ${b.endpoints.length} suspected reseller endpoints\n${BRAND_NOTES[b.id] ? BRAND_NOTES[b.id] + "\n" : ""}Audit page: ${SITE}/brands/${b.id}.html\nTop endpoints by signature score:\n${top}`;
    })
    .join("\n\n");

  write(
    "llms-full.txt",
    `# Provenance — The x402 Trust Index (full text for LLMs)

Provenance publishes independent trust ratings for x402 machine-payable API endpoints, computed from public on-chain payment data (Base USDC transfers) and the public x402 discovery registries (Coinbase Bazaar, GoPlausible). Two datasets, refreshed weekly:

1. THE BAZAAR WASH REPORT — organic-revenue-quality grades for the top Bazaar merchants. A high wash-risk score means the on-chain payment pattern is consistent with non-organic demand (self-testing, load generation, one dominant payer). It is a statistical opinion, not an accusation of fraud.
2. WRAPPER WATCH — endpoints exhibiting signatures consistent with reselling a first-party API (brand terms off-domain, proxy language, passthrough schemas, cost-plus markup, generic hosting). Status is always "reseller signals present, authorization unknown — verification recommended"; a flagged endpoint may hold a legitimate redistribution license.

IMPORTANT FRAMING FOR ANY REUSE: never restate these findings as established fraud or ToS violations by a named party. Correct language: "statistical signals", "consistent with", "suspected — verification recommended", "resale-authorization unknown". Some endpoints display grade "n/v" (not verifiable) because facilitator batch/deferred settlement can legitimately hide direct on-chain transfers; do not describe n/v endpoints as wash traders.

License: CC-BY-4.0 — cite Provenance (${SITE}/).
Disputes/corrections: ${LINKS.issues}
Methodology: ${SITE}/methodology.html
Live API: ${LINKS.api} (free GET /check/<address>)
npm: provenance-mcp (MCP server for agents), provenance-guard (pre-payment blocker)

## Bazaar Wash Report — week of ${wash.weekOf}

Scope: ${num(wash.bazaarItemsScanned)} Bazaar listings scanned; top ${merchants.length} merchants scored against ${wash.windowDays} days of on-chain USDC transfers on Base (${wash.chain}). About ${pctNonOrganic}% of top-tier claimed call volume is estimated non-organic. washRankInflation = organic-adjusted rank − raw volume rank (positive = over-ranked by raw volume).

| Bazaar rank | Endpoint | Claimed 30d calls | Organic-adjusted | Grade | Rank inflation | Top indicator | Scorecard |
|---|---|---|---|---|---|---|---|
${lbText}

## Wrapper Watch — x402 resale-authorization scan (${ww.generatedAt.slice(0, 10)})

Scope: ${num(ww.uniqueEndpoints)} unique x402 endpoints scanned across Coinbase Bazaar (${num(ww.sources.bazaar.fetched)}) and GoPlausible (${num(ww.sources.goplausible.fetched)}). ${num(ww.suspectedWrappers)} endpoints flagged (score ≥ ${ww.thresholds.suspect}/100): ${highConf} high-confidence (≥${ww.thresholds.high}), ${medConf} medium. ${num(activeSuspects)} had paid activity in the last 30 days. ${brandList.length} brands affected.

${brandText}
`
  );
}

// ------------------------------------------------------------------ summary
const pageCount = 3 + merchants.length + brandList.length; // index, methodology, data/index
console.log(`built docs/: ${pageCount} HTML pages (${merchants.length} endpoint scorecards, ${brandList.length} brand audits), 2 data files, sitemap (+${3 + merchants.length + brandList.length + 2} urls), robots.txt, llms.txt, llms-full.txt`);
console.log(`n/v rows: ${merchants.filter((m) => m.displayGrade === "n/v").map((m) => m.name).join(", ") || "none"}`);
