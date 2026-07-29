import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";

export async function createComment(
  postId: string,
  userId: string,
  content: string,
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) {
    throw new AppError(404, "POST_NOT_FOUND", "Post not found");
  }

  const comment = await prisma.comment.create({
    data: { postId, userId, content },
    include: { user: { select: { id: true, username: true } } },
  });

  return { comment, ownerId: post.authorId };
}
