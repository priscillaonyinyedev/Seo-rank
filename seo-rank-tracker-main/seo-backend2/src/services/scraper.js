import { chromium } from "playwright";
import * as cheerio from "cheerio";

// Everything in this file is deterministic — same URL in, same facts out
// (modulo the live page changing). No AI here on purpose: see the "scrape
// vs Gemini" split from the whiteboard. This is the part that should be
// unit-testable without ever calling an external AI API.
export async function scrapePage(url) {
    const browser = await chromium.launch({ headless: true });

    try {
        const page = await browser.newPage();
        const start = Date.now();

        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
        const loadTime = Date.now() - start;

        const html = await page.content();
        const pageSize = Buffer.byteLength(html, "utf-8");

        if (!response || !response.ok()) {
            throw new Error(`Site responded with status ${response ? response.status() : "unknown"}`);
        }

        return { html, loadTime, pageSize, finalUrl: page.url() };
    } finally {
        await browser.close();
    }
}

export function extractSignals(html, pageUrl) {
    const $ = cheerio.load(html);
    const pageHost = new URL(pageUrl).hostname;

    const metaData = {
        title: $("title").first().text().trim(),
        description: $('meta[name="description"]').attr("content") || "",
        canonical: $('link[rel="canonical"]').attr("href") || "",
        robots: $('meta[name="robots"]').attr("content") || "",
        ogTitle: $('meta[property="og:title"]').attr("content") || "",
        ogDescription: $('meta[property="og:description"]').attr("content") || "",
        ogImage: $('meta[property="og:image"]').attr("content") || "",
        twitterCard: $('meta[name="twitter:card"]').attr("content") || "",
        viewport: $('meta[name="viewport"]').attr("content") || "",
        charset: $("meta[charset]").attr("charset") || "",
    };

    const headings = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, h1Texts: [] };
    for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
        const els = $(tag);
        headings[tag] = els.length;
        if (tag === "h1") {
            headings.h1Texts = els.map((_, el) => $(el).text().trim()).get().filter(Boolean);
        }
    }

    let internal = 0;
    let external = 0;
    $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        try {
            const resolved = new URL(href, pageUrl);
            if (resolved.hostname === pageHost) internal += 1;
            else external += 1;
        } catch {
            // relative/malformed hrefs (mailto:, javascript:, etc.) — skip
        }
    });
    const links = { internal, external, total: internal + external };

    const imgEls = $("img");
    const missingAlt = imgEls.filter((_, el) => !$(el).attr("alt")?.trim()).length;
    const images = { total: imgEls.length, missingAlt, withAlt: imgEls.length - missingAlt };

    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText ? bodyText.split(" ").length : 0;
    const keywords = topKeywords(bodyText, wordCount);

    return { metaData, headings, links, images, wordCount, keywords };
}

// Simple term-frequency keyword extraction — no AI needed for this either.
function topKeywords(text, wordCount, topN = 10) {
    const stopwords = new Set([
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "to",
        "of", "in", "on", "for", "with", "as", "at", "by", "this", "that", "it", "from",
    ]);

    const counts = new Map();
    for (const raw of text.toLowerCase().split(/[^a-z0-9']+/)) {
        if (!raw || raw.length < 3 || stopwords.has(raw)) continue;
        counts.set(raw, (counts.get(raw) || 0) + 1);
    }

    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([word, count]) => ({
            word,
            count,
            density: wordCount ? Number(((count / wordCount) * 100).toFixed(2)) : 0,
        }));
}
