import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createUserSchema, resetPasswordSchema } from "../validators/user.js";
import { getUsers, resetPassword, createUser } from "../controllers/userController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

router.get("/", asyncHandler(getUsers));
router.post("/", validateBody(createUserSchema), asyncHandler(createUser));
router.patch("/:id/password", validateBody(resetPasswordSchema), asyncHandler(resetPassword));

export default router;
