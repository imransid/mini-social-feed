import { Platform } from "react-native";
import Constants from "expo-constants";

/** Deployed backend. This is the default for any release build (the APK). */
const PRODUCTION_API_URL = "https://mini-social-feed-production.up.railway.app";

/**
 * A phone on your LAN cannot reach `localhost` — that resolves to the phone
 * itself. In development the Expo dev server already knows the machine's LAN
 * address (it's how the device loaded this bundle), so derive the API host from
 * it instead of hardcoding an IP that changes with every network.
 */
function inferDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)
      ?.debuggerHost;

  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  return host && host.length > 0 ? host : null;
}

const API_PORT = 4000;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Inside the Android emulator the host machine is reachable at 10.0.2.2 —
 * "localhost" there resolves to the emulator itself, so the API would be
 * unreachable. A LAN address (a real device, or an emulator on a LAN-served
 * bundle) is already correct and is left alone.
 */
function resolveDevHost(): string {
  const inferred = inferDevHost();

  if (Platform.OS === "android" && (!inferred || LOOPBACK_HOSTS.has(inferred))) {
    return "10.0.2.2";
  }
  return inferred ?? "localhost";
}

/**
 * Resolution order:
 *   1. EXPO_PUBLIC_API_URL   — explicit override, wins everywhere
 *   2. local dev server      — only while __DEV__, so emulator/LAN work is unchanged
 *   3. PRODUCTION_API_URL    — every release build, including the APK
 *
 * __DEV__ is false in any production bundle, so a shipped APK can never fall
 * back to localhost or 10.0.2.2 — neither of which a real phone can reach.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? `http://${resolveDevHost()}:${API_PORT}` : PRODUCTION_API_URL);
