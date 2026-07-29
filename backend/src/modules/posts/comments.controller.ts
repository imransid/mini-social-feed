import { Response } from "express";
import { z } from "zod";
import * as service from "./comments.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthedRequest } from "../../middleware/auth";
import { notifyPostOwner } from "../notifications/notifications.service";

export const createCommentSchema = z.object({
  content: z.string().min(1).max(300),
});

export const list = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const postId = String(req.params.id);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  const result = await service.listComments({ postId, page, limit });
  res.json(result);
});

export const create = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const postId = String(req.params.id);
  const actorId = req.userId!;
  const { content } = req.body;

  const { comment, ownerId } = await service.createComment(
    postId,
    actorId,
    content,
  );

  // Shaped like the feed's post payload: the relation is `user`, exposed as
  // `author` for consistency with GET /posts.
  res.status(201).json({
    id: comment.id,
    content: comment.content,
    postId: comment.postId,
    createdAt: comment.createdAt,
    author: comment.user,
  });

  void notifyPostOwner({
    ownerId,
    actorId,
    postId,
    kind: "comment",
    preview: content.slice(0, 60),
  });
});
