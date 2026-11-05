import "dotenv/config";

// Central place every other file pulls config from — nobody else touches
// process.env directly. Makes it obvious what the app actually depends on,
// and gives us one spot to add validation/defaults later.
export const env = {
    port: process.env.PORT || 4000,
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",

    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/rank-pilot",

    jwtSecret: process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

    geminiApiKey: process.env.GEMINI_API_KEY || "",
    serpApiKey: process.env.SERP_API_KEY || "",
    serpApiProvider: process.env.SERP_API_PROVIDER || "serpapi",

    freePlanDailyAnalyses: Number(process.env.FREE_PLAN_DAILY_ANALYSES || 5),
};

if (process.env.NODE_ENV === "production" && env.jwtSecret === "dev-secret-do-not-use-in-prod") {
    throw new Error("JWT_SECRET must be set to a strong random value in production.");
}

if (env.jwtSecret === "dev-secret-do-not-use-in-prod") {
    console.warn("[config] Using default JWT_SECRET — set a real one in .env before deploying.");
}
