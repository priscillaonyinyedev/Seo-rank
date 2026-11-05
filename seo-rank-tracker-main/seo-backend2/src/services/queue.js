import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env.js";

// Single shared connection — BullMQ recommends one connection per
// Queue/Worker instance rather than reusing across many, but for our scale
// (tens/hundreds of users) one connection per role is plenty.
export const connection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ
});

export const analysisQueue = new Queue("analysis", { connection });
export const rankCheckQueue = new Queue("rank-check", { connection });

// Shared default job options: a few retries with backoff, since the audit
// worker calls two flaky external things (a real browser, and Gemini).
export const defaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 500, // keep queue lean; we already persist results in Mongo
    removeOnFail: 1000,
};
