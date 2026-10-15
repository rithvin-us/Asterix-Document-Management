import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { hashPassword } from "../services/authService.js";
import { ApiError } from "../utils/ApiError.js";

export const getUsers = async (_req: Request, res: Response) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json({ data: users });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body as { newPassword: string };

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound("User not found");

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  res.json({ message: "Password updated successfully" });
};

export const createUser = async (req: Request, res: Response) => {
  const { username, password, displayName, role } = req.body as {
    username: string;
    password: string;
    displayName: string;
    role: "MEMBER" | "TREASURER" | "ADMIN";
  };

  // The schema stores usernames lowercased, and Mongoose applies that same setter when casting
  // query filters, so this check is already case-insensitive. The unique index is the race-safe
  // guarantee; a concurrent duplicate surfaces as a clean 409 through the error handler.
  const existing = await User.findOne({ username });
  if (existing) throw ApiError.conflict("Username already exists");

  const passwordHash = await hashPassword(password);
  const user = await User.create({ username, passwordHash, displayName, role, active: true });

  const { passwordHash: _removed, ...safeUser } = user.toObject();
  res.status(201).json({ data: safeUser });
};
