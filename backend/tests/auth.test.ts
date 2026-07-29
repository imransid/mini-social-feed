import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { wipe, signup } from "./helpers";

const PREFIX = "test_auth_";
const USERNAME = `${PREFIX}alice`;
const PASSWORD = "secret123";

beforeAll(() => wipe(PREFIX));
afterAll(async () => {
  await wipe(PREFIX);
  await prisma.$disconnect();
});

describe("POST /auth/signup", () => {
  it("creates a user and returns a token", async () => {
    const res = await signup(USERNAME, PASSWORD);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user).toMatchObject({ username: USERNAME });
    expect(res.body.user.id).toBeTypeOf("string");
  });

  it("hashes the password and never echoes it back", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: USERNAME, password: PASSWORD });
    expect(res.body.user.password).toBeUndefined();

    const stored = await prisma.user.findUnique({
      where: { username: USERNAME },
    });
    expect(stored).not.toBeNull();
    expect(stored!.password).not.toBe(PASSWORD);
    expect(stored!.password.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("rejects a duplicate username with 409", async () => {
    const res = await signup(USERNAME, PASSWORD);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: "USERNAME_TAKEN", message: expect.any(String) },
    });
  });

  it("rejects a too-short password with 400", async () => {
    const res = await signup(`${PREFIX}shortpw`, "123");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /auth/login", () => {
  it("returns a token for correct credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: USERNAME, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: USERNAME, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("responds identically for an unknown user, so neither field is revealed", async () => {
    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ username: USERNAME, password: "wrong-password" });
    const unknownUser = await request(app)
      .post("/auth/login")
      .send({ username: `${PREFIX}ghost`, password: PASSWORD });

    expect(unknownUser.status).toBe(wrongPassword.status);
    expect(unknownUser.body).toEqual(wrongPassword.body);
  });
});
