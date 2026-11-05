// Deterministic scoring — same reasoning as the scraper: if a user asks
// "why did I get a 62?", there should be a real, inspectable answer, not
// "the AI decided." Tune the rules/weights here; nothing here calls Gemini.
export function computeCategoryScores({ metaData, headings, links, images, loadTime, wordCount }) {
    let seo = 100;
    if (!metaData.title) seo -= 20;
    else if (metaData.title.length < 10 || metaData.title.length > 60) seo -= 10;
    if (!metaData.description) seo -= 15;
    else if (metaData.description.length < 50 || metaData.description.length > 160) seo -= 5;
    if (headings.h1 === 0) seo -= 15;
    if (headings.h1 > 1) seo -= 10;
    if (!metaData.canonical) seo -= 5;
    if (wordCount < 300) seo -= 10;
    seo = clamp(seo);

    let performance = 100;
    if (loadTime > 5000) performance -= 40;
    else if (loadTime > 3000) performance -= 20;
    else if (loadTime > 1500) performance -= 5;
    performance = clamp(performance);

    let accessibility = 100;
    if (images.total > 0) {
        const missingRatio = images.missingAlt / images.total;
        accessibility -= Math.round(missingRatio * 50);
    }
    if (!metaData.viewport) accessibility -= 15;
    accessibility = clamp(accessibility);

    let bestPractices = 100;
    if (!metaData.charset) bestPractices -= 10;
    if (!metaData.ogTitle || !metaData.ogImage) bestPractices -= 10;
    if (links.total === 0) bestPractices -= 10;
    bestPractices = clamp(bestPractices);

    const categories = { seo, performance, accessibility, bestPractices };
    const overallScore = Math.round((seo + performance + accessibility + bestPractices) / 4);

    return { categories, overallScore };
}

function clamp(n, min = 0, max = 100) {
    return Math.min(max, Math.max(min, n));
}
