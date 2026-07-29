import Constants from "expo-constants";

/**
 * A phone on your LAN cannot reach `localhost` — that resolves to the phone
 * itself. In development the Expo dev server already knows the machine's LAN
 * address (it's how the device loaded this bundle), so derive the API host from
 * it instead of hardcoding an IP that changes with every network.
 *
 * Override with EXPO_PUBLIC_API_URL when pointing at a deployed backend.
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
const inferredHost = inferDevHost();

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (inferredHost
    ? `http://${inferredHost}:${API_PORT}`
    : `http://localhost:${API_PORT}`);
