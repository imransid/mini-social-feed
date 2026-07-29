import { prisma } from "../../config/prisma";

export async function createPost(authorId: string, content: string) {
  return prisma.post.create({
    data: { authorId, content },
    include: { author: { select: { id: true, username: true } } },
  });
}

export async function listPosts(opts: {
  page: number;
  limit: number;
  username?: string;
  viewerId: string;
}) {
  const { page, limit, username, viewerId } = opts;
  const where = username ? { author: { username } } : {};

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { id: true, username: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: viewerId }, select: { id: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return {
    data: posts.map((p) => ({
      id: p.id,
      content: p.content,
      author: p.author,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      likedByMe: p.likes.length > 0,
      createdAt: p.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
