export type User = {
  id: string;
  username: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type FeedPost = {
  id: string;
  content: string;
  author: User;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
};

export type PostComment = {
  id: string;
  content: string;
  postId: string;
  createdAt: string;
  author: User;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type Paginated<T> = {
  data: T[];
  pagination: Pagination;
};

export type LikeResult = {
  liked: boolean;
  likeCount: number;
};
