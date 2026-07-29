import { Request, Response } from "express";

// Without this, unmatched routes fall through to Express's default HTML error
// page, which breaks the JSON error contract clients rely on.
export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
}
