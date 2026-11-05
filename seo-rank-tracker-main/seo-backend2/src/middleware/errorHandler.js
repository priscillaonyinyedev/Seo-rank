import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

// Single place every route's errors funnel through (via next(err)). Keeps
// controllers from repeating status-code/JSON-shape logic everywhere.
export function errorHandler(err, req, res, next) {
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: "Validation failed",
            details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ error: err.message, details: err.details });
    }

    console.error("[unhandled error]", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
}

export function notFoundHandler(req, res) {
    res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}
