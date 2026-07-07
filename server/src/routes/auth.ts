import { Router } from "express";
import { login } from "../controllers/authController.js";
import { loginLimiter } from "../middleware/rateLimiters.js";

// The route file only says WHICH url maps to WHICH controller.
// The logic lives in the controller.
const router = Router();

// loginLimiter runs first: it blocks brute-force password guessing.
router.post("/login", loginLimiter, login);

export default router;
