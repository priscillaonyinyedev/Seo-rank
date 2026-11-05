import { z } from "zod";
import { TrackedKeyword } from "../models/TrackedKeyword.js";
import { RankHistory } from "../models/RankHistory.js";
import { rankCheckQueue, defaultJobOptions } from "../services/queue.js";
import { ApiError } from "../utils/ApiError.js";
import { assertPublicUrl } from "../middleware/security.js";

const addKeywordSchema = z.object({
    keyword: z.string().trim().min(1, "Keyword is required"),
    url: z.string().trim().min(1, "URL is required"),
});

function domainFromUrl(rawUrl) {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    return new URL(withScheme).hostname;
}

// POST /rank-tracker — matches RankTracker.tsx's handleAdd(). The UI copy
// says "we'll search Google... and track it daily," so this both creates
// the record AND enqueues an immediate first check, rather than waiting
// for tomorrow's 6am scheduler run.
export async function addTrackedKeyword(req, res, next) {
    try {
        const { keyword, url } = addKeywordSchema.parse(req.body);
        const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        assertPublicUrl(normalizedUrl); // blocks localhost/private-IP/metadata targets
        const domain = domainFromUrl(normalizedUrl);

        const tracked = await TrackedKeyword.create({
            user: req.user._id,
            keyword,
            url,
            domain,
            status: "checking",
        });

        await rankCheckQueue.add(
            "check-rank",
            { trackedKeywordId: tracked._id.toString() },
            defaultJobOptions
        );

        res.status(201).json(tracked.toJSON());
    } catch (err) {
        next(err);
    }
}

// GET /rank-tracker — matches RankTracker.tsx's KeywordItem[] list.
export async function listTrackedKeywords(req, res, next) {
    try {
        const items = await TrackedKeyword.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(items.map((k) => k.toJSON()));
    } catch (err) {
        next(err);
    }
}

// GET /rank-tracker/:id — matches RankDetail.tsx's TrackingData, including
// rankHistory[] for the trend chart.
export async function getTrackedKeyword(req, res, next) {
    try {
        const tracked = await TrackedKeyword.findOne({ _id: req.params.id, user: req.user._id });
        if (!tracked) throw new ApiError(404, "Tracked keyword not found");

        const rankHistory = await RankHistory.find({ trackedKeyword: tracked._id }).sort({ date: 1 });

        res.json({
            ...tracked.toJSON(),
            rankHistory: rankHistory.map((h) => h.toJSON()),
        });
    } catch (err) {
        next(err);
    }
}

// POST /rank-tracker/:id/refresh — the manual refresh button.
export async function refreshTrackedKeyword(req, res, next) {
    try {
        const tracked = await TrackedKeyword.findOne({ _id: req.params.id, user: req.user._id });
        if (!tracked) throw new ApiError(404, "Tracked keyword not found");

        tracked.status = "checking";
        await tracked.save();

        await rankCheckQueue.add(
            "check-rank",
            { trackedKeywordId: tracked._id.toString() },
            defaultJobOptions
        );

        res.json(tracked.toJSON());
    } catch (err) {
        next(err);
    }
}

// PATCH /rank-tracker/:id — the pause/resume (active toggle) button.
export async function toggleTrackedKeyword(req, res, next) {
    try {
        const tracked = await TrackedKeyword.findOne({ _id: req.params.id, user: req.user._id });
        if (!tracked) throw new ApiError(404, "Tracked keyword not found");

        tracked.active = !tracked.active;
        await tracked.save();

        res.json(tracked.toJSON());
    } catch (err) {
        next(err);
    }
}

// DELETE /rank-tracker/:id
export async function deleteTrackedKeyword(req, res, next) {
    try {
        const result = await TrackedKeyword.deleteOne({ _id: req.params.id, user: req.user._id });
        if (result.deletedCount === 0) throw new ApiError(404, "Tracked keyword not found");

        // Clean up its history too — orphaned rows with no parent are just
        // dead weight, and this keyword can never be looked up again to see them.
        await RankHistory.deleteMany({ trackedKeyword: req.params.id });

        res.status(204).end();
    } catch (err) {
        next(err);
    }
}
