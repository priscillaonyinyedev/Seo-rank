import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { checkAnalysisQuota } from "../middleware/checkAnalysisQuota.js";
import { analyzeRateLimit } from "../middleware/security.js";
import { createAnalysis, getAnalysis, listAnalyses, deleteAnalysis } from "../controllers/analysisController.js";

const router = Router();

router.use(requireAuth); // everything below requires a logged-in user

router.post("/", analyzeRateLimit, checkAnalysisQuota, createAnalysis);
router.get("/", listAnalyses);
router.get("/:id", getAnalysis);
router.delete("/:id", deleteAnalysis);

export default router;
