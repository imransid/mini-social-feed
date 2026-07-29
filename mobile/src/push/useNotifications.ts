import { useEffect } from "react";
import { isExpoGo } from "./environment";

/**
 * Wires up notification reception: a foreground presentation handler plus
 * listeners for incoming and tapped notifications.
 *
 * `expo-notifications` is imported lazily on purpose. Importing it evaluates
 * `DevicePushTokenAutoRegistration.fx`, which calls `addPushTokenListener()` at
 * module scope and throws synchronously in Expo Go on Android. Loading it only
 * after the isExpoGo() check keeps that module from ever being evaluated there.
 */
export function useNotifications() {
  useEffect(() => {
    if (isExpoGo()) {
      console.log(
        "[push] reception disabled: Expo Go dropped remote push in SDK 53 — use a development build",
      );
      return;
    }

    // The import is async, so the effect can be torn down before it resolves.
    let cancelled = false;
    const subscriptions: { remove: () => void }[] = [];

    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        if (cancelled) return;

        // Without a handler, notifications arriving while the app is open are
        // delivered silently instead of being presented.
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        subscriptions.push(
          Notifications.addNotificationReceivedListener((notification) => {
            const { title, body, data } = notification.request.content;
            console.log("[push] received in foreground:", { title, body, data });
          }),
        );

        subscriptions.push(
          Notifications.addNotificationResponseReceivedListener((response) => {
            const { data } = response.notification.request.content;
            // data carries { type: "like" | "comment", postId } from the backend.
            console.log("[push] notification tapped:", data);
          }),
        );

        // Unmounted while the import was in flight: undo what we just added.
        if (cancelled) {
          subscriptions.forEach((s) => s.remove());
          subscriptions.length = 0;
        }
      } catch (err) {
        console.log(
          "[push] reception unavailable:",
          err instanceof Error ? err.message : err,
        );
      }
    })();

    return () => {
      cancelled = true;
      subscriptions.forEach((s) => s.remove());
      subscriptions.length = 0;
    };
  }, []);
}
