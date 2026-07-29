import { API_BASE_URL } from "../config";
import type {
  AuthResponse,
  FeedPost,
  LikeResult,
  Paginated,
  PostComment,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    // fetch only rejects on transport failure, so this is always connectivity.
    throw new ApiError(
      0,
      "NETWORK",
      `Can't reach the server at ${API_BASE_URL}. Is the backend running?`,
    );
  }

  const raw = await res.text();
  let body: unknown = null;
  if (raw.length > 0) {
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ApiError(res.status, "BAD_RESPONSE", "Malformed server response");
    }
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)
      ?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? `Request failed (${res.status})`,
    );
  }

  return body as T;
}

export const api = {
  signup: (username: string, password: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  listPosts: (params: { page?: number; limit?: number; username?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.username) q.set("username", params.username);
    const qs = q.toString();
    return request<Paginated<FeedPost>>(`/posts${qs ? `?${qs}` : ""}`);
  },

  createPost: (content: string) =>
    request<FeedPost>("/posts", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  toggleLike: (postId: string) =>
    request<LikeResult>(`/posts/${postId}/like`, { method: "POST" }),

  listComments: (postId: string, page = 1) =>
    request<Paginated<PostComment>>(`/posts/${postId}/comments?page=${page}`),

  createComment: (postId: string, content: string) =>
    request<PostComment>(`/posts/${postId}/comment`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  registerDevice: (fcmToken: string) =>
    request<{ id: string }>("/devices", {
      method: "POST",
      body: JSON.stringify({ fcmToken }),
    }),
};
