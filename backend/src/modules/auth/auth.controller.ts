import { Request, Response } from "express";
import { z } from "zod";
import * as service from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";

export const credentialsSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6).max(100),
});

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const result = await service.signup(username, password);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const result = await service.login(username, password);
  res.status(200).json(result);
});