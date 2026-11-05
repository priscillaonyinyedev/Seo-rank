import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

// Guards every route the front end's <ProtectedRoute> wraps: /dashboard,
// /analyze, /report/:id, /history, /rank-tracker, /rank/:id. The front end
// currently trusts the client-side route guard alone (ProtectedRoute.tsx is
// a no-op passthrough) — this middleware is what makes that trust real.
export async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [scheme, token] = header.split(" ");

        if (scheme !== "Bearer" || !token) {
            throw new ApiError(401, "Missing or malformed Authorization header");
        }

        let payload;
        try {
            payload = verifyToken(token);
        } catch {
            throw new ApiError(401, "Invalid or expired token");
        }

        const user = await User.findById(payload.sub);
        if (!user) throw new ApiError(401, "User no longer exists");

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
}
