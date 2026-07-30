# Mini Social Feed — Mobile

React Native (Expo SDK 57) client for the [backend](../backend/README.md).

## Requirements

- Node 20+
- A development build or the release APK (see below). **Expo Go will not work**
  for push — Expo Go dropped Android remote notifications in SDK 53.
- An Android device or emulator (a Play Services image is required for FCM)

## Run

```bash
npm install
npm start          # expo start --dev-client
```

`npm start` targets the development build rather than Expo Go. `npm run
start:go` uses Expo Go if you only want to poke at the UI.

To build:

```bash
npx expo run:android          # local debug build
eas build -p android --profile preview   # installable APK
```

## API base URL

The release APK talks to the deployed backend:

```
https://mini-social-feed-production.up.railway.app
```

Resolution order in `src/config.ts`:

1. `EXPO_PUBLIC_API_URL` — explicit override, wins everywhere
2. Local dev server — **only while `__DEV__`**, deriving the LAN host from
   Expo's `hostUri`, or `10.0.2.2` on the Android emulator
3. The Railway URL — every release build

`__DEV__` is `false` in any production bundle, so a shipped APK can never fall
back to `localhost` or `10.0.2.2`, neither of which a real phone can reach. This
is verified: the production bundle contains the Railway URL and **zero**
occurrences of either local address.

Because a development build has `__DEV__ === true`, it points at your local
backend. To test a dev build against production — which is what you need for
push, since push requires a dev build — start it with the override:

```bash
EXPO_PUBLIC_API_URL=https://mini-social-feed-production.up.railway.app npm start
```

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
