import { prisma } from "../../config/prisma";

/**
 * Register (or re-register) an FCM token. Keyed on the token's unique
 * constraint so repeat calls are idempotent, and so a token that moves to a
 * different account is reassigned rather than duplicated.
 */
export async function registerDevice(userId: string, fcmToken: string) {
  return prisma.device.upsert({
    where: { fcmToken },
    update: { userId },
    create: { userId, fcmToken },
  });
}
