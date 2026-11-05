import { connectDB } from "../config/db.js";
import { startAuditWorker } from "./auditWorker.js";
import { startRankCheckWorker } from "./rankCheckWorker.js";

async function main() {
    await connectDB();
    startAuditWorker();
    startRankCheckWorker();
}

main().catch((err) => {
    console.error("[worker] Failed to start:", err);
    process.exit(1);
});
