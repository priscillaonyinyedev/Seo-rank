import { Worker } from "bullmq";
import { connection } from "../services/queue.js";
import { TrackedKeyword } from "../models/TrackedKeyword.js";
import { RankHistory } from "../models/RankHistory.js";
import { searchGoogle } from "../services/serp.js";

const RESULTS_PER_PAGE = 10;
const COMPETITORS_ABOVE = 3; // how many results above the target to store as "competitors"

export function startRankCheckWorker() {
    const worker = new Worker(
        "rank-check",
        async (job) => {
            const { trackedKeywordId } = job.data;
            const tracked = await TrackedKeyword.findById(trackedKeywordId);
            if (!tracked) throw new Error(`TrackedKeyword ${trackedKeywordId} not found`);

            let position = null;
            let page = null;
            let competitors = [];

            try {
                const results = await searchGoogle(tracked.keyword, { maxPages: 5 });
                const match = results.find((r) => r.domain.includes(tracked.domain) || tracked.domain.includes(r.domain));

                if (match) {
                    position = match.position;
                    page = Math.ceil(match.position / RESULTS_PER_PAGE);
                    competitors = results
                        .filter((r) => r.position < match.position)
                        .slice(-COMPETITORS_ABOVE);
                } else {
                    // Not found in the top N — position stays null, which
                    // RankTracker.tsx already renders as "Not Ranked".
                    competitors = results.slice(0, COMPETITORS_ABOVE);
                }

                // positionChange: computed here (write time), never on the
                // client — see the whiteboard note on why. Diff against the
                // most recent PREVIOUS history row, not against currentPosition,
                // since currentPosition is about to be overwritten below.
                const previous = await RankHistory.findOne({ trackedKeyword: tracked._id }).sort({ date: -1 });
                const positionChange =
                    previous && previous.position !== null && position !== null
                        ? previous.position - position // lower position number = better rank = positive change
                        : 0;

                await RankHistory.create({ trackedKeyword: tracked._id, position });

                tracked.set({
                    status: "completed",
                    currentPosition: position,
                    currentPage: page,
                    bestPosition:
                        position !== null && (tracked.bestPosition === null || position < tracked.bestPosition)
                            ? position
                            : tracked.bestPosition,
                    positionChange,
                    lastChecked: new Date(),
                    competitors,
                });
                await tracked.save();
            } catch (err) {
                // A failed check still writes a null-position history row —
                // see RankHistory.js: "never skip a day, even a bad one."
                await RankHistory.create({ trackedKeyword: tracked._id, position: null });
                tracked.status = "failed";
                await tracked.save();
                throw err; // let BullMQ retry per defaultJobOptions
            }

            return { trackedKeywordId, position };
        },
        { connection, concurrency: 5 } // keep under your SERP provider's rate limit
    );

    worker.on("failed", (job, err) => {
        console.error(`[rank-worker] Job ${job.id} failed:`, err.message);
    });

    console.log("[rank-worker] Listening for rank-check jobs");
    return worker;
}
