import { Platform } from "react-native";
import * as Device from "expo-device";
import { api } from "../api/client";
import { isExpoGo } from "./environment";

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "skipped"; reason: string };

/**
 * Requests notification permission, reads the native device push token, and
 * registers it with the backend.
 *
 * Never throws: push is a nice-to-have, and a user who declines permission (or
 * runs in a simulator) must still get a fully working app.
 *
 * `expo-notifications` is imported lazily and deliberately NOT at module scope.
 * Importing it runs `DevicePushTokenAutoRegistration.fx`, which calls
 * `addPushTokenListener()` at module scope; in Expo Go on Android that throws
 * synchronously and takes the whole app down before any guard here could run.
 * Loading it only after the isExpoGo() check keeps that module from ever being
 * evaluated in Expo Go.
 *
 * Note: this returns the *native* token — FCM on Android, APNs on iOS — because
 * the backend sends through firebase-admin. Android works directly; iOS
 * additionally requires the APNs key uploaded to the Firebase project.
 */
export async function registerPushToken(): Promise<PushResult> {
  try {
    // Expo Go (SDK 53+) removed Android remote push. Return before the import
    // below, so no notification module is ever evaluated.
    if (isExpoGo()) {
      console.log(
        "[push] skipped: Expo Go does not support remote push since SDK 53 — use a development build",
      );
      return {
        status: "skipped",
        reason: "Remote push is unavailable in Expo Go; use a development build",
      };
    }

    if (!Device.isDevice) {
      return {
        status: "skipped",
        reason: "Push notifications require a physical device",
      };
    }

    const Notifications = await import("expo-notifications");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) {
      return { status: "skipped", reason: "Notification permission denied" };
    }

    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const token = String(devicePushToken.data);

    await api.registerDevice(token);
    return { status: "registered", token };
  } catch (err) {
    return {
      status: "skipped",
      reason: err instanceof Error ? err.message : "Push registration failed",
    };
  }
}
