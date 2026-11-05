import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import analysesRoutes from "./routes/analyses.js";
import rankTrackerRoutes from "./routes/rankTracker.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
    const app = express();

    app.use(cors({ origin: env.clientOrigin, credentials: true }));
    app.use(express.json());

    app.get("/health", (req, res) => res.json({ ok: true }));

    app.use("/auth", authRoutes);
    app.use("/analyses", analysesRoutes);
    app.use("/rank-tracker", rankTrackerRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
