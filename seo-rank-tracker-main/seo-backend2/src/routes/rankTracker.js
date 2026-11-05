import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { rankTrackerRateLimit } from "../middleware/security.js";
import {
    addTrackedKeyword,
    listTrackedKeywords,
    getTrackedKeyword,
    refreshTrackedKeyword,
    toggleTrackedKeyword,
    deleteTrackedKeyword,
} from "../controllers/rankTrackerController.js";

const router = Router();

router.use(requireAuth);

router.post("/", rankTrackerRateLimit, addTrackedKeyword);
router.get("/", listTrackedKeywords);
router.get("/:id", getTrackedKeyword);
router.post("/:id/refresh", rankTrackerRateLimit, refreshTrackedKeyword);
router.patch("/:id", toggleTrackedKeyword);
router.delete("/:id", deleteTrackedKeyword);

export default router;
