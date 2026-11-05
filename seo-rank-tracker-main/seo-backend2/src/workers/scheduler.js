import cron from "node-cron";
import { connectDB } from "../config/db.js";
import { TrackedKeyword } from "../models/TrackedKeyword.js";
import { rankCheckQueue, defaultJobOptions } from "../services/queue.js";

// Matches the copy already in RankDetail.tsx: "Updated daily at 6:00 AM UTC."
// This process's ONLY job is to find what needs checking and enqueue it —
// see the whiteboard note on why cron and execution are split. It must stay
// fast even with thousands of tracked keywords; all the slow, failure-prone
// work happens in rankCheckWorker.js, pulling from the queue at its own pace.
async function enqueueDailyRankChecks() {
    const cursor = TrackedKeyword.find({ active: true }).cursor();
    let count = 0;

    for await (const tracked of cursor) {
        await rankCheckQueue.add(
            "check-rank",
            { trackedKeywordId: tracked._id.toString() },
            defaultJobOptions
        );
        count += 1;
    }

    console.log(`[scheduler] Enqueued ${count} rank-check job(s)`);
}

export function startScheduler() {
    // "0 6 * * *" = 6:00 AM, every day, in the timezone set below (UTC).
    cron.schedule("0 6 * * *", enqueueDailyRankChecks, { timezone: "UTC" });
    console.log("[scheduler] Daily rank-check cron scheduled for 06:00 UTC");
}

// Runs as its own tiny process (`npm run scheduler`) — separate from both
// the API server and the workers, since it only needs to be alive once a
// day, not handling requests or draining queues continuously.
async function main() {
    await connectDB();
    startScheduler();

    // Uncomment to trigger a run immediately on startup, useful for testing
    // without waiting until 6am:
    // await enqueueDailyRankChecks();
}

// Only run main() when this file is executed directly (`node scheduler.js`),
// not when it's imported elsewhere.
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((err) => {
        console.error("[scheduler] Failed to start:", err);
        process.exit(1);
    });
}
