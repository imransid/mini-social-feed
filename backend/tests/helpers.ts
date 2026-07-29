import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";

/**
 * Every suite namespaces its fixtures under a username prefix and wipes that
 * prefix before and after the run, so tests are repeatable and never touch
 * rows they didn't create. Posts/likes/comments/devices follow via the
 * onDelete: Cascade relations on User.
 */
export async function wipe(prefix: string) {
  await prisma.user.deleteMany({ where: { username: { startsWith: prefix } } });
}

export async function signup(username: string, password = "secret123") {
  const res = await request(app)
    .post("/auth/signup")
    .send({ username, password });
  return res;
}

/** Creates a user and returns its bearer token. */
export async function userWithToken(username: string): Promise<string> {
  const res = await signup(username);
  if (res.status !== 201) {
    throw new Error(`signup failed for ${username}: ${res.status} ${res.text}`);
  }
  return res.body.token as string;
}

export async function createPost(token: string, content: string) {
  const res = await request(app)
    .post("/posts")
    .set("Authorization", `Bearer ${token}`)
    .send({ content });
  if (res.status !== 201) {
    throw new Error(`createPost failed: ${res.status} ${res.text}`);
  }
  return res.body as { id: string };
}
