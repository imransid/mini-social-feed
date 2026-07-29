import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";

/**
 * Toggle a like. Relies on the @@unique([postId, userId]) constraint rather
 * than a read-then-write, so two concurrent requests can't both insert.
 */
export async function toggleLike(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) {
    throw new AppError(404, "POST_NOT_FOUND", "Post not found");
  }

  let liked: boolean;
  try {
    await prisma.like.create({ data: { postId, userId } });
    liked = true;
  } catch (err) {
    // P2002 = the unique constraint fired, so this user already liked the post.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      await prisma.like.delete({
        where: { postId_userId: { postId, userId } },
      });
      liked = false;
    } else {
      throw err;
    }
  }

  const likeCount = await prisma.like.count({ where: { postId } });
  return { liked, likeCount, ownerId: post.authorId };
}
