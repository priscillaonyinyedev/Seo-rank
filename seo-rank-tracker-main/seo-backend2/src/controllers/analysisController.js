import { z } from "zod";
import { Analysis } from "../models/Analysis.js";
import { analysisQueue, defaultJobOptions } from "../services/queue.js";
import { ApiError } from "../utils/ApiError.js";
import { assertPublicUrl } from "../middleware/security.js";

const analyzeSchema = z.object({
    url: z.string().trim().url("Enter a valid URL (include https://)"),
});

// POST /analyses — matches Analyze.tsx's handleAnalyze(). The front end
// expects to navigate to /report/:id right after this returns, then poll/
// load that id — so this must return fast (just the created _id), never
// wait for the scan itself.
export async function createAnalysis(req, res, next) {
    try {
        const { url } = analyzeSchema.parse(req.body);
        assertPublicUrl(url); // blocks localhost/private-IP/metadata targets — see security.js

        const analysis = await Analysis.create({
            user: req.user._id,
            url,
            status: "pending",
        });

        await analysisQueue.add(
            "run-analysis",
            { analysisId: analysis._id.toString() },
            defaultJobOptions
        );

        res.status(201).json(analysis.toJSON());
    } catch (err) {
        next(err);
    }
}

// GET /analyses/:id — Report.tsx's fetchAnalysis(). Front end polls this
// while status is pending/processing.
export async function getAnalysis(req, res, next) {
    try {
        const analysis = await Analysis.findOne({ _id: req.params.id, user: req.user._id });
        if (!analysis) throw new ApiError(404, "Analysis not found");
        res.json(analysis.toJSON());
    } catch (err) {
        next(err);
    }
}

// GET /analyses — Dashboard.tsx (recent) and History.tsx (paginated/filterable).
export async function listAnalyses(req, res, next) {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Number(req.query.limit) || 12);

        const [items, total] = await Promise.all([
            Analysis.find({ user: req.user._id })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Analysis.countDocuments({ user: req.user._id }),
        ]);

        res.json({
            analyses: items.map((a) => a.toJSON()),
            page,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (err) {
        next(err);
    }
}

// DELETE /analyses/:id — History.tsx's delete button.
export async function deleteAnalysis(req, res, next) {
    try {
        const result = await Analysis.deleteOne({ _id: req.params.id, user: req.user._id });
        if (result.deletedCount === 0) throw new ApiError(404, "Analysis not found");
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}
