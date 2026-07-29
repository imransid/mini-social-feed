import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { env } from "./env";

// Credentials come from either an inline JSON blob or a path to the
// service-account file. Absent or unreadable credentials disable push instead
// of crashing the API.
function loadServiceAccount(): ServiceAccount | null {
  try {
    if (env.firebaseServiceAccountJson) {
      return JSON.parse(env.firebaseServiceAccountJson) as ServiceAccount;
    }
    if (env.firebaseServiceAccountPath) {
      return JSON.parse(
        readFileSync(env.firebaseServiceAccountPath, "utf8"),
      ) as ServiceAccount;
    }
  } catch (err) {
    console.warn(
      "[fcm] could not read service account, push disabled:",
      (err as Error).message,
    );
  }
  return null;
}

function init(): Messaging | null {
  const account = loadServiceAccount();
  if (!account) {
    console.warn(
      "[fcm] push disabled: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to enable",
    );
    return null;
  }
  try {
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(account) });
    console.log("[fcm] push enabled");
    return getMessaging(app);
  } catch (err) {
    console.warn("[fcm] push disabled, init failed:", (err as Error).message);
    return null;
  }
}

export const messaging = init();
