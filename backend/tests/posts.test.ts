import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { wipe, userWithToken, createPost } from "./helpers";

const PREFIX = "test_posts_";

let ownerToken: string;
let actorToken: string;
let postId: string;

beforeAll(async () => {
  await wipe(PREFIX);
  ownerToken = await userWithToken(`${PREFIX}owner`);
  actorToken = await userWithToken(`${PREFIX}actor`);
  postId = (await createPost(ownerToken, "hello from the owner")).id;
});

afterAll(async () => {
  await wipe(PREFIX);
  await prisma.$disconnect();
});

describe("auth guard", () => {
  it("rejects GET /posts without a token", async () => {
    const res = await request(app).get("/posts");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects GET /posts with a malformed token", async () => {
    const res = await request(app)
      .get("/posts")
      .set("Authorization", "Bearer not-a-real-jwt");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /posts", () => {
  it("returns the feed with pagination metadata", async () => {
    const res = await request(app)
      .get("/posts")
      .set("Authorization", `Bearer ${actorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
  });

  it("filters by ?username", async () => {
    const res = await request(app)
      .get(`/posts?username=${PREFIX}owner`)
      .set("Authorization", `Bearer ${actorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].author.username).toBe(`${PREFIX}owner`);
  });
});

describe("POST /posts/:id/like", () => {
  it("toggles on, then off, then on again", async () => {
    const like = () =>
      request(app)
        .post(`/posts/${postId}/like`)
        .set("Authorization", `Bearer ${actorToken}`);

    const first = await like();
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ liked: true, likeCount: 1 });

    const second = await like();
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ liked: false, likeCount: 0 });

    const third = await like();
    expect(third.body).toEqual({ liked: true, likeCount: 1 });

    // The unique constraint must leave exactly one row, never a duplicate.
    const rows = await prisma.like.count({ where: { postId } });
    expect(rows).toBe(1);
  });

  it("returns 404 for an unknown post", async () => {
    const res = await request(app)
      .post("/posts/does-not-exist/like")
      .set("Authorization", `Bearer ${actorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });
});

describe("POST /posts/:id/comment", () => {
  it("creates a comment and returns 201 with its author", async () => {
    const res = await request(app)
      .post(`/posts/${postId}/comment`)
      .set("Authorization", `Bearer ${actorToken}`)
      .send({ content: "nice post" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      content: "nice post",
      postId,
      author: { username: `${PREFIX}actor` },
    });
  });

  it("lists comments oldest-first with pagination", async () => {
    const res = await request(app)
      .get(`/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${actorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toMatchObject({
      content: "nice post",
      author: { username: `${PREFIX}actor` },
    });
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
  });

  it("returns 404 listing comments for an unknown post", async () => {
    const res = await request(app)
      .get("/posts/does-not-exist/comments")
      .set("Authorization", `Bearer ${actorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });

  it("rejects empty content with 400", async () => {
    const res = await request(app)
      .post(`/posts/${postId}/comment`)
      .set("Authorization", `Bearer ${actorToken}`)
      .send({ content: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects content over 300 characters with 400", async () => {
    const res = await request(app)
      .post(`/posts/${postId}/comment`)
      .set("Authorization", `Bearer ${actorToken}`)
      .send({ content: "x".repeat(301) });

    expect(res.status).toBe(400);
  });
});

describe("error contract", () => {
  it("returns JSON 404 for an unknown route", async () => {
    const res = await request(app).get("/no-such-route");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for malformed JSON, not 500", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .set("Content-Type", "application/json")
      .send('{"username": bad}');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});
