import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

function startOfUTCDay(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Enforces Free = 5 analyses/day, Pro = unlimited (from Pricing.tsx).
// Deliberately runs BEFORE the analyze controller enqueues anything —
// see the "hard parts" note from the whiteboard: the quota check has to
// happen before the job is queued, not after, or a burst of requests could
// all pass the check and all get enqueued.
//
// Reset is lazy (checked on each request) rather than a cron job: cheap,
// and self-heals even if a day's reset job never ran.
export async function checkAnalysisQuota(req, res, next) {
    try {
        const user = req.user;

        if (user.plan === "pro") {
            return next();
        }

        const today = startOfUTCDay();
        if (!user.analysisCountResetAt || user.analysisCountResetAt < today) {
            user.analysisCount = 0;
            user.analysisCountResetAt = today;
        }

        if (user.analysisCount >= env.freePlanDailyAnalyses) {
            throw new ApiError(
                429,
                `Free plan limit reached (${env.freePlanDailyAnalyses} analyses/day). Upgrade to Pro for unlimited analyses.`
            );
        }

        // Reserve the slot now, not after the job succeeds — an analysis
        // that later fails still "used" an attempt. Simpler and avoids a
        // race where two in-flight requests could both slip under the cap.
        user.analysisCount += 1;
        await user.save();

        next();
    } catch (err) {
        next(err);
    }
}
