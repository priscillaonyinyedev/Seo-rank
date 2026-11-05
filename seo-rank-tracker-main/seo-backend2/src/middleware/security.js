import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

// Per-user (not just per-IP — several free users could share an office IP)
// limits on the two endpoints that trigger real work: a headless browser
// launch or an external SERP API call. Generic Express middleware limits
// alone aren't enough here because the expensive part happens in the
// worker, not the request — but stopping the request from ever getting
// queued is still the right first line of defense.
export const analyzeRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 analyze requests per minute per user — well above real usage, well below abuse
    keyGenerator: (req) => req.user?._id?.toString() || req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: "Too many analysis requests. Please wait a moment and try again." });
    },
});

export const rankTrackerRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.user?._id?.toString() || req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    },
});

// Per-IP (not per-user — there's no logged-in user yet at login/register)
// brute-force protection on auth endpoints.
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    handler: (req, res) => {
        res.status(429).json({ error: "Too many attempts. Please try again later." });
    },
});

// Blocks the classic SSRF targets: localhost, link-local/metadata IPs
// (e.g. AWS's 169.254.169.254), and private IP ranges — so a submitted
// "website" can't be used to make your server's headless browser or fetch
// calls reach internal services. This is a basic denylist, not a complete
// solution (DNS rebinding can still get around a hostname-only check), but
// it stops the obvious, common cases cheaply.
const BLOCKED_HOSTNAME_PATTERNS = [
    /^localhost$/i,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./, // link-local, includes cloud metadata endpoints
    /^::1$/,
    /^\[?::1\]?$/,
];

export function assertPublicUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new ApiError(400, "Enter a valid URL");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new ApiError(400, "URL must use http or https");
    }

    const hostname = parsed.hostname;
    if (BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(hostname))) {
        throw new ApiError(400, "That URL points to a private or internal address and can't be scanned");
    }

    return parsed;
}
