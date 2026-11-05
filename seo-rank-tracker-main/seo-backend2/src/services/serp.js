import { env } from "../config/env.js";

// Same pattern as gemini.js: real call behind a key check, rule-based stub
// otherwise, so the pipeline runs end-to-end before you've signed up for
// a provider. This is the riskiest external dependency in the whole system
// (see the whiteboard comparison) — when you do get a key, this is the only
// file that needs to change.
//
// Swap the URL/params below for whichever provider you pick (SerpApi,
// DataForSEO, Serper, etc.) — they all return broadly this shape: a ranked
// list of organic results.
export async function searchGoogle(keyword, { maxPages = 5 } = {}) {
    if (!env.serpApiKey) {
        return stubSearchResults(keyword);
    }

    const resultsPerPage = 10;
    const num = maxPages * resultsPerPage;

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("q", keyword);
    url.searchParams.set("num", String(num));
    url.searchParams.set("api_key", env.serpApiKey);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`SERP API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const organic = data.organic_results || [];

    return organic.map((r, i) => ({
        position: i + 1,
        url: r.link,
        domain: safeHostname(r.link),
        title: r.title,
        snippet: r.snippet || "",
    }));
}

function safeHostname(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return "";
    }
}

// Deterministic-ish stub: returns a small fixed set of fake competitors so
// the rank-check worker and RankDetail.tsx's competitor list have something
// real to render during development, without ever finding the target domain
// (so currentPosition stays null until a real key is added — this is honest
// behavior, not a fake "you rank #3!" result).
function stubSearchResults(keyword) {
    return [
        { position: 1, url: "https://example-competitor-a.com", domain: "example-competitor-a.com", title: `${keyword} — Example A`, snippet: "Stubbed result — add SERP_API_KEY for real data." },
        { position: 2, url: "https://example-competitor-b.com", domain: "example-competitor-b.com", title: `${keyword} — Example B`, snippet: "Stubbed result — add SERP_API_KEY for real data." },
        { position: 3, url: "https://example-competitor-c.com", domain: "example-competitor-c.com", title: `${keyword} — Example C`, snippet: "Stubbed result — add SERP_API_KEY for real data." },
    ];
}
