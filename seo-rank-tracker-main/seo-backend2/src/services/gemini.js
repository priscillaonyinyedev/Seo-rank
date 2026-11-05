import { env } from "../config/env.js";

// Deliberately the ONLY file in this codebase that talks to an LLM, and it's
// asked to do exactly one thing: turn already-computed facts into an
// `issues[]` array. It never invents scores, counts, or meta values — those
// come from scraper.js/scorer.js. See the whiteboard note on why: keeps the
// pipeline testable and the scores reproducible.
//
// GEMINI_API_KEY isn't set yet (per the earlier decision to stub external
// calls) — generateIssues() falls back to a rule-based stub so the rest of
// the pipeline is runnable end-to-end. Swap in the real fetch() call once
// you have a key; the call site (worker) doesn't need to change.
export async function generateIssues(facts) {
    if (!env.geminiApiKey) {
        return stubIssues(facts);
    }

    const prompt = buildPrompt(facts);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    // Structured output — forces Gemini to return exactly this
                    // shape, so we never have to hand-parse loose text.
                    responseSchema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                severity: { type: "string", enum: ["critical", "warning", "info"] },
                                category: { type: "string" },
                                message: { type: "string" },
                                recommendation: { type: "string" },
                            },
                            required: ["severity", "category", "message", "recommendation"],
                        },
                    },
                },
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content");

    try {
        return JSON.parse(text);
    } catch {
        throw new Error("Gemini returned invalid JSON");
    }
}

function buildPrompt(facts) {
    // Only the extracted facts go in — never raw HTML — to keep the prompt
    // small, cheap, and focused on judgment rather than re-parsing.
    return `You are an SEO auditor. Given these facts about a webpage, list concrete issues.
For each issue give: severity (critical/warning/info), category, message, recommendation.
Only report real problems implied by the facts below — don't invent ones.

Facts:
${JSON.stringify(facts, null, 2)}`;
}

// Rule-based fallback so the pipeline runs without a Gemini key. Deliberately
// simple — it exists to keep development unblocked, not to be a permanent
// substitute for the AI stage.
function stubIssues(facts) {
    const issues = [];
    const { metaData, headings, images, loadTime } = facts;

    if (!metaData.title) {
        issues.push({ severity: "critical", category: "meta", message: "Missing page title", recommendation: "Add a <title> tag between 50-60 characters." });
    }
    if (!metaData.description) {
        issues.push({ severity: "warning", category: "meta", message: "Missing meta description", recommendation: "Add a meta description between 150-160 characters." });
    }
    if (headings.h1 === 0) {
        issues.push({ severity: "critical", category: "content", message: "No H1 heading found", recommendation: "Add exactly one H1 that describes the page's main topic." });
    }
    if (headings.h1 > 1) {
        issues.push({ severity: "warning", category: "content", message: `Found ${headings.h1} H1 headings`, recommendation: "Use only one H1 per page for clear topical signal." });
    }
    if (images.missingAlt > 0) {
        issues.push({ severity: "warning", category: "accessibility", message: `${images.missingAlt} image(s) missing alt text`, recommendation: "Add descriptive alt attributes to all images." });
    }
    if (loadTime > 3000) {
        issues.push({ severity: "info", category: "performance", message: `Page took ${loadTime}ms to load`, recommendation: "Optimize images and reduce render-blocking resources." });
    }

    return issues;
}
