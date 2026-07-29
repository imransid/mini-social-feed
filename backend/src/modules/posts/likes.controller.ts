import { Response } from "express";
import * as service from "./likes.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthedRequest } from "../../middleware/auth";
import { notifyPostOwner } from "../notifications/notifications.service";

export const toggle = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const postId = String(req.params.id);
  const actorId = req.userId!;

  const { liked, likeCount, ownerId } = await service.toggleLike(
    postId,
    actorId,
  );

  res.status(200).json({ liked, likeCount });

  // After the DB write and after the response: not awaited, so a slow or
  // failing push cannot delay or break the request. Unliking sends nothing.
  if (liked) {
    void notifyPostOwner({ ownerId, actorId, postId, kind: "like" });
  }
});
