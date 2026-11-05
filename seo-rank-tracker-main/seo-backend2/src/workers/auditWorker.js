import { Worker } from "bullmq";
import { connection } from "../services/queue.js";
import { Analysis } from "../models/Analysis.js";
import { scrapePage, extractSignals } from "../services/scraper.js";
import { computeCategoryScores } from "../services/scorer.js";
import { generateIssues } from "../services/gemini.js";

// This is the pipeline from the whiteboard, made real:
//   1. Fetch stage    (scraper.js)   — deterministic
//   2. Scoring stage  (scorer.js)    — deterministic
//   3. AI stage       (gemini.js)    — the only non-deterministic step
//   4. Write stage    (below)
export function startAuditWorker() {
    const worker = new Worker(
        "analysis",
        async (job) => {
            const { analysisId } = job.data;
            const analysis = await Analysis.findById(analysisId);
            if (!analysis) throw new Error(`Analysis ${analysisId} not found`);

            analysis.status = "processing";
            await analysis.save();

            // 1. Fetch
            const { html, loadTime, pageSize, finalUrl } = await scrapePage(analysis.url);

            // 2. Extract + score
            const signals = extractSignals(html, finalUrl);
            const { categories, overallScore } = computeCategoryScores({ ...signals, loadTime });

            // 3. AI stage — only touches the facts, never raw HTML
            const issues = await generateIssues({
                url: finalUrl,
                loadTime,
                metaData: signals.metaData,
                headings: signals.headings,
                links: signals.links,
                images: signals.images,
                wordCount: signals.wordCount,
            });

            // 4. Write
            analysis.set({
                status: "completed",
                loadTime,
                pageSize,
                wordCount: signals.wordCount,
                categories,
                overallScore,
                metaData: signals.metaData,
                headings: signals.headings,
                links: signals.links,
                images: signals.images,
                keywords: signals.keywords,
                issues,
                error: null,
            });
            await analysis.save();

            return { analysisId, overallScore };
        },
        { connection, concurrency: 3 } // headless browsers are heavy — keep this modest
    );

    worker.on("failed", async (job, err) => {
        console.error(`[audit-worker] Job ${job.id} failed:`, err.message);
        if (job?.data?.analysisId) {
            // Only mark "failed" after the job has exhausted its retries —
            // job.attemptsMade reaching job.opts.attempts means BullMQ won't
            // try again, so this is the terminal failure, not a mid-retry one.
            const exhausted = job.attemptsMade >= (job.opts.attempts || 1);
            if (exhausted) {
                await Analysis.findByIdAndUpdate(job.data.analysisId, {
                    status: "failed",
                    error: err.message,
                });
            }
        }
    });

    console.log("[audit-worker] Listening for analysis jobs");
    return worker;
}
