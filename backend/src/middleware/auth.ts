import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing token");
  }
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as {
      userId: string;
    };
    req.userId = payload.userId;
    next();
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid token");
  }
}
