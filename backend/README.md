# Mini Social Feed — Backend

Node + Express 5 + TypeScript + Prisma 7 (PostgreSQL) REST API for a small
social feed: accounts, posts, likes, comments, and FCM push notifications.

---

## Requirements

| Tool | Version |
|---|---|
| Node.js | 20.19+ (developed on 22.16) |
| PostgreSQL | 14+ running locally or reachable via `DATABASE_URL` |
| Yarn | 4.x, provided by Corepack (pinned in `package.json`) |

## Setup

```bash
# 1. Enable the pinned Yarn version
corepack enable

# 2. Install dependencies
yarn install

# 3. Configure the environment
cp .env.example .env
#    then edit .env and set DATABASE_URL and JWT_SECRET

# 4. Create the database, apply migrations, and generate Prisma Client
yarn prisma migrate dev

# 5. Run
yarn dev          # http://localhost:4000 with hot reload
```

`yarn prisma migrate dev` creates the database if it does not exist, applies
everything in `prisma/migrations/`, and runs `prisma generate`.

### Scripts

| Command | What it does |
|---|---|
| `yarn dev` | Hot-reloading dev server (`tsx watch`) |
| `yarn build` | Clean `dist/` and compile with `tsc` |
| `yarn start` | Run the compiled output (`node dist/server.js`) — build first |
| `yarn serve` | `build` + `start` in one step |
| `yarn test` | Integration tests (`vitest run`) |
| `yarn prisma:migrate` | `prisma migrate dev` |
| `yarn prisma:studio` | Browse the database in Prisma Studio |

`npm run <script>` works equally well; Yarn is only pinned for reproducible
installs.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string, used by the app and the Prisma CLI |
| `JWT_SECRET` | yes | — | Signing secret for JWTs |
| `JWT_EXPIRES_IN` | no | `1d` | Token lifetime (`15m`, `1d`, `7d`, …) |
| `PORT` | no | `4000` | HTTP listen port |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | no | — | Path to a Firebase service-account JSON file |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | no | — | The same JSON inlined; takes precedence over the path |

Missing required variables abort startup with a clear message rather than
failing on the first request. If **neither** Firebase variable is set, push is
disabled and the API runs normally.

## Tests

```bash
yarn test
```

18 integration tests drive the exported Express app through `supertest` —
signup, duplicate signup, password hashing, login failures, the auth guard,
feed pagination and filtering, like toggling, comment validation, and the error
contract.

They run against the **real database** in `DATABASE_URL`. Each suite namespaces
its fixtures behind a username prefix (`test_auth_`, `test_posts_`) and deletes
that prefix before and after the run, so they are repeatable and never touch
rows they did not create. Suites run sequentially to avoid contention.

---

# API

Base URL `http://localhost:4000`. All request and response bodies are JSON.

Interactive Swagger UI is served at **`GET /docs`** — every endpoint below is
listed there and can be called from the browser; press **Authorize** and paste a
JWT to try the protected ones.

Authenticated endpoints require:

```
Authorization: Bearer <token>
```

### Error format

Every error — including 404s and malformed JSON — uses one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Too small: expected string to have >=3 characters" } }
```

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body failed schema validation |
| `INVALID_JSON` | 400 | Body was not parseable JSON |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired token |
| `INVALID_CREDENTIALS` | 401 | Wrong username or password |
| `USERNAME_TAKEN` | 409 | Username already registered |
| `POST_NOT_FOUND` | 404 | No post with that id |
| `NOT_FOUND` | 404 | No such route |
| `INTERNAL` | 500 | Unexpected server error |

---

## `GET /health`

No auth.

```json
{ "status": "ok" }
```

---

## `POST /auth/signup`

No auth. `username` 3–30 chars, `password` 6–100 chars.

**Request**

```json
{ "username": "alice", "password": "secret123" }
```

**201**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "e627ea17-db1a-4373-89b1-18588bcb746b", "username": "alice" }
}
```

`400` validation · `409` username taken

---

## `POST /auth/login`

No auth.

**Request**

```json
{ "username": "alice", "password": "secret123" }
```

**200** — same shape as signup.

`400` validation · `401` invalid credentials

A wrong password and an unknown username return an identical response, so the
API does not disclose whether an account exists.

---

## `POST /posts`

**Auth required.** `content` 1–500 chars.

**Request**

```json
{ "content": "hello feed" }
```

**201**

```json
{
  "id": "b88fd69c-05d5-4a31-934b-fde2e33fe443",
  "content": "hello feed",
  "authorId": "e627ea17-db1a-4373-89b1-18588bcb746b",
  "createdAt": "2026-07-29T05:56:58.184Z",
  "author": { "id": "e627ea17-db1a-4373-89b1-18588bcb746b", "username": "alice" }
}
```

`400` validation · `401` unauthorized

---

## `GET /posts`

**Auth required.** Newest first.

| Query | Default | Notes |
|---|---|---|
| `page` | `1` | Clamped to ≥ 1 |
| `limit` | `10` | Clamped to 1–50 |
| `username` | — | Only posts by this exact username |

`GET /posts?page=1&limit=10&username=alice`

**200**

```json
{
  "data": [
    {
      "id": "b88fd69c-05d5-4a31-934b-fde2e33fe443",
      "content": "hello feed",
      "author": { "id": "e627ea17-...", "username": "alice" },
      "likeCount": 2,
      "commentCount": 1,
      "likedByMe": false,
      "createdAt": "2026-07-29T05:56:58.184Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
}
```

`likedByMe` is relative to the authenticated caller.

`401` unauthorized

---

## `POST /posts/:id/like`

**Auth required.** No body. Toggles: the first call likes, the second unlikes.
Idempotent — liking twice leaves zero likes, never a duplicate row.

**200**

```json
{ "liked": true, "likeCount": 1 }
```

`401` unauthorized · `404` post not found

---

## `POST /posts/:id/comment`

**Auth required.** `content` 1–300 chars.

**Request**

```json
{ "content": "nice post" }
```

**201**

```json
{
  "id": "164c716f-6649-42e3-9d1f-7150139bd42b",
  "content": "nice post",
  "postId": "b88fd69c-05d5-4a31-934b-fde2e33fe443",
  "createdAt": "2026-07-29T06:34:23.028Z",
  "author": { "id": "3fd68540-...", "username": "bob" }
}
```

`400` validation · `401` unauthorized · `404` post not found

---

## `POST /devices`

**Auth required.** Registers an FCM token for the caller so they can receive
push notifications. Idempotent: re-sending the same token returns the same
record, and a token that moves to another account is reassigned rather than
duplicated.

**Request**

```json
{ "fcmToken": "fXyZ...device-token" }
```

**201**

```json
{
  "id": "e103f275-b993-443c-ace6-99aca899d86f",
  "fcmToken": "fXyZ...device-token",
  "userId": "237a9554-4cf7-4b14-bf89-383b7ce5f17b"
}
```

`400` validation · `401` unauthorized

---

## Push notifications

When someone likes or comments on a post, every device registered to the
**post's owner** receives an FCM message.

- The owner is **never** notified about their own action on their own post.
- The push is sent after the database write and after the HTTP response, and is
  never awaited in the request path.
- Every failure is caught and logged. A Firebase outage, bad credentials, or a
  dead token cannot change an API response — a like still returns `200`.
- Tokens Firebase reports as permanently invalid are deleted. Credential or
  transport errors are logged but never delete tokens, so a misconfiguration
  cannot wipe the device table.
- Unliking sends nothing.

---

# Decisions and tradeoffs

**JWT only, no refresh tokens.** Access tokens are signed with `JWT_SECRET` and
expire after `JWT_EXPIRES_IN` (default 1 day). There is no refresh flow, no
rotation, and no server-side revocation — logging out is a client-side token
discard, and a stolen token is valid until it expires. For an assessment-scoped
app with a single mobile client this keeps the surface small; a production
build would need short-lived access tokens plus refresh tokens and a revocation
list.

**FCM tokens stored server-side in a `Device` table.** The spec did not say
where device tokens live. Storing them server-side, keyed by user with
`fcmToken` unique, lets the API fan a notification out to all of a user's
devices and lets it prune tokens Firebase rejects. The alternative — having the
client pass its token per request — would have avoided a table but made
multi-device delivery and cleanup impossible. The cost is that tokens are now
personal data the backend must retain and expire.

**Push is fire-and-forget.** Notification delivery is explicitly not part of
the request's success criteria. This keeps p99 latency off Firebase's critical
path, at the cost of the client never learning that a notification failed.

**Toggle uses the database constraint, not a read-then-write.** Liking inserts
and catches the `@@unique([postId, userId])` violation (`P2002`) to decide the
row already exists. A `findUnique`-then-branch would let two concurrent
requests both insert.

**Prisma 7 with the `pg` driver adapter.** v7 ships no query engine binary, so
the connection comes from a driver adapter. Prisma Client is generated into
`src/generated/prisma` (git-ignored) and must live under `rootDir` so `tsc`
emits it into `dist/`.

**Tests run against a real database.** No mocking of Prisma, so migrations,
constraints, and cascades are genuinely exercised. The tradeoff is that tests
need a live Postgres and must clean up after themselves.

## What I would add next

1. **Rate limiting** on `/auth/signup` and `/auth/login` — currently nothing
   throttles credential stuffing or account enumeration by brute force.
   `express-rate-limit` keyed by IP, tightened further per username.
2. **Close the login timing side-channel** — `bcrypt.compare` is skipped when
   the username does not exist, so a miss returns in ~1 ms versus ~100 ms for a
   real account. The response bodies are identical, but the timing is not.
   Comparing against a dummy hash on the miss path equalises it.
3. **Field-level validation errors** — the handler surfaces only the first Zod
   issue's message, so a client cannot tell which field failed. Returning
   `issue.path` alongside each message would make the mobile form usable.
4. **Cursor pagination** for the feed — `skip`/`take` drifts when posts are
   created mid-scroll, and gets slow at depth.
5. **Structured logging and a request id** — `console.log` is not enough to
   trace a failed push back to the request that triggered it.
6. **A dedicated test database** so `yarn test` cannot touch development data.
