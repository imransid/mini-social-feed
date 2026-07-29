import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "../api/client";

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
 * Note: this returns the *native* token — FCM on Android, APNs on iOS — because
 * the backend sends through firebase-admin. Android works directly; iOS
 * additionally requires the APNs key uploaded to the Firebase project.
 */
export async function registerPushToken(): Promise<PushResult> {
  try {
    if (!Device.isDevice) {
      return {
        status: "skipped",
        reason: "Push notifications require a physical device",
      };
    }

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
