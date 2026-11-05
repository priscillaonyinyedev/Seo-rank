import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { authRateLimit } from "../middleware/security.js";

const router = Router();

// Matches Login.tsx: POST here on submit, whether isLoginState is true or false.
router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);

// Not directly called by the current front end, but useful once
// ProtectedRoute.tsx starts actually verifying the session (e.g. on app load)
// instead of trusting local state.
router.get("/me", requireAuth, me);

export default router;
