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

/**
 * The caller's registered devices. Tokens are truncated: enough to confirm a
 * real FCM token was stored and to tell two devices apart, without handing the
 * full token to anything that reads this.
 */
export async function listDevices(userId: string) {
  const devices = await prisma.device.findMany({
    where: { userId },
    select: { id: true, fcmToken: true },
  });

  return devices.map((d) => ({
    id: d.id,
    tokenPreview: `${d.fcmToken.slice(0, 12)}…${d.fcmToken.slice(-6)}`,
    tokenLength: d.fcmToken.length,
  }));
}
