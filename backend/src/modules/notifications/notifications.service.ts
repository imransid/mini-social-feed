import { prisma } from "../../config/prisma";
import { messaging } from "../../config/firebase";

export type NotifyKind = "like" | "comment";

const DEAD_TOKEN_CODES = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
];

/**
 * Push a notification to every device belonging to a post's owner.
 *
 * Deliberately never throws and never rejects: callers fire this without
 * awaiting it, after the response has been sent, so a Firebase outage cannot
 * affect the API result.
 */
export async function notifyPostOwner(opts: {
  ownerId: string;
  actorId: string;
  postId: string;
  kind: NotifyKind;
  preview?: string;
}): Promise<void> {
  const { ownerId, actorId, postId, kind, preview } = opts;
  try {
    // Never notify someone about their own action on their own post.
    if (ownerId === actorId) return;
    if (!messaging) return;

    const [actor, devices] = await Promise.all([
      prisma.user.findUnique({
        where: { id: actorId },
        select: { username: true },
      }),
      prisma.device.findMany({
        where: { userId: ownerId },
        select: { fcmToken: true },
      }),
    ]);
    if (devices.length === 0) return;

    const who = actor?.username ?? "Someone";
    const body =
      kind === "like"
        ? `${who} liked your post`
        : `${who} commented: ${preview ?? ""}`.trim();

    const tokens = devices.map((d) => d.fcmToken);
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: "Mini Social Feed", body },
      data: { type: kind, postId },
    });

    // sendEachForMulticast resolves with per-message errors rather than
    // rejecting, so delivery failures never reach the catch below and have to
    // be surfaced here explicitly.
    if (result.failureCount > 0) {
      const codes = result.responses
        .filter((r) => !r.success)
        .map((r) => r.error?.code ?? "unknown");
      console.error(
        `[fcm] ${result.failureCount}/${tokens.length} push(es) failed:`,
        [...new Set(codes)].join(", "),
      );
    }

    // Firebase reports permanently invalid tokens per-message; drop them so the
    // table doesn't fill with tokens from uninstalled apps. Only token-specific
    // codes qualify — a credential or transport fault must not wipe devices.
    const stale = result.responses.flatMap((r, i) =>
      !r.success && DEAD_TOKEN_CODES.includes(r.error?.code ?? "")
        ? [tokens[i]]
        : [],
    );
    if (stale.length > 0) {
      await prisma.device.deleteMany({ where: { fcmToken: { in: stale } } });
    }
  } catch (err) {
    console.error("[fcm] notification failed (swallowed):", err);
  }
}
