import { z } from "zod";
import { ROLES } from "../models/User.js";

export const MIN_PASSWORD_LENGTH = 4;

export const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(100),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`).max(200),
  displayName: z.string().trim().min(1, "Display name is required").max(200),
  role: z.enum(ROLES, { message: `Role must be one of: ${ROLES.join(", ")}` }),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(200),
});
