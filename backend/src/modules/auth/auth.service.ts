import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

function sign(userId: string): string {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export async function signup(username: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new AppError(409, "USERNAME_TAKEN", "Username already exists");
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hash },
  });
  return { token: sign(user.id), user: { id: user.id, username } };
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Wrong username or password",
    );
  }
  return { token: sign(user.id), user: { id: user.id, username } };
}
