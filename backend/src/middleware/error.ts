import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }
  // express.json() rejects unparseable bodies with a SyntaxError tagged
  // "entity.parse.failed" — a client mistake, not a server fault.
  if (
    err instanceof SyntaxError &&
    (err as SyntaxError & { type?: string }).type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Malformed JSON body" },
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: err.issues[0].message },
    });
  }
  console.error(err);
  return res.status(500).json({
    error: { code: "INTERNAL", message: "Something went wrong" },
  });
}