import Constants from "expo-constants";
import { isRunningInExpoGo } from "expo";

/**
 * True only inside the Expo Go client.
 *
 * Expo Go dropped Android remote-push support in SDK 53, and
 * `expo-notifications` now *throws* from `getDevicePushTokenAsync()` and
 * `addPushTokenListener()` when it detects Expo Go. Anything notification
 * related has to be skipped there.
 *
 * `appOwnership` is `"expo"` in Expo Go and `null` in development-client and
 * standalone builds, so this stays false in a real APK and push runs normally.
 * `Constants.executionEnvironment` deliberately is not used: its "storeClient"
 * value covers development builds as well as Expo Go, which would switch push
 * off in exactly the build where it is meant to work.
 */
export function isExpoGo(): boolean {
  if (Constants.appOwnership === "expo") return true;

  // appOwnership is deprecated in SDK 57. isRunningInExpoGo() is the supported
  // replacement, and is the same predicate expo-notifications checks before
  // throwing, so the two can never disagree.
  try {
    return isRunningInExpoGo();
  } catch {
    return false;
  }
}
