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

export async function listComments(opts: {
  postId: string;
  page: number;
  limit: number;
}) {
  const { postId, page, limit } = opts;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) {
    throw new AppError(404, "POST_NOT_FOUND", "Post not found");
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { postId },
      // Oldest first so a thread reads top to bottom.
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, username: true } } },
    }),
    prisma.comment.count({ where: { postId } }),
  ]);

  return {
    data: comments.map((c) => ({
      id: c.id,
      content: c.content,
      postId: c.postId,
      createdAt: c.createdAt,
      author: c.user,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
