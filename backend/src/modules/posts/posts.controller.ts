import { Response } from "express";
import { z } from "zod";
import * as service from "./posts.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthedRequest } from "../../middleware/auth";

export const createPostSchema = z.object({
  content: z.string().min(1).max(500),
});

export const create = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const post = await service.createPost(req.userId!, req.body.content);
    res.status(201).json(post);
  },
);

export const list = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const username = req.query.username as string | undefined;
  const result = await service.listPosts({
    page,
    limit,
    username,
    viewerId: req.userId!,
  });
  res.json(result);
});
