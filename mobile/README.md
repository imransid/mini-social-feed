# Mini Social Feed — Mobile

React Native (Expo SDK 57) client for the [backend](../backend/README.md).

## Requirements

- Node 20+
- The backend running (`cd ../backend && yarn dev`)
- Expo Go on a phone, or an iOS Simulator / Android Emulator

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator.

## API base URL

The app talks to the backend on **port 4000**. A phone cannot reach
`localhost` — that resolves to the phone itself — so the host is derived at
runtime from the Expo dev server's `hostUri`, which is already the LAN address
your device connected to. No IP hardcoding, and it survives changing networks.

To point at a deployed backend instead, set an env var before starting:

```bash
EXPO_PUBLIC_API_URL=https://api.example.com npx expo start
```

See `src/config.ts`.

## Screens

| Screen | Purpose |
|---|---|
| Login / Signup | Username + password; JWT persisted with AsyncStorage so sessions survive restarts |
| Feed | Newest-first posts, pull-to-refresh, infinite scroll, like toggle, username filter |
| New post | Compose up to 500 characters |
| Comments | Read a post's thread and add a comment (up to 300 characters) |

Tapping an author's `@username` filters the feed to that user; **Clear** resets it.

Likes are optimistic — the heart flips immediately and reconciles with the
server's count, rolling back if the request fails.

## Push notifications

On reaching the feed the app requests notification permission, reads the native
device push token, and registers it with `POST /devices`. The backend then
notifies a post's owner when someone else likes or comments.

Two constraints worth knowing:

- **Push does not work in Expo Go on Android** (removed in SDK 53). A
  development build is required — `npx expo run:android` or an EAS build.
  Registration is skipped gracefully in Expo Go; the rest of the app is
  unaffected.
- The token is the **native** one (FCM on Android, APNs on iOS) because the
  backend sends via `firebase-admin`. Android works directly once a Firebase
  project is configured; iOS additionally needs the APNs key uploaded to
  Firebase.

Registration never throws. A denied permission, a simulator, or a missing
Firebase project all just log a reason and leave the app fully usable.

## Project layout

```
App.tsx                  providers + navigation root
src/config.ts            API base URL derivation
src/api/client.ts        fetch wrapper, auth header, typed ApiError
src/api/types.ts         response types mirroring the backend
src/auth/AuthContext.tsx session state, persisted
src/navigation/          stack navigator (auth vs app groups)
src/screens/             Login, Signup, Feed, CreatePost, Comments
src/components/          PostCard
src/push/                push token registration
```
