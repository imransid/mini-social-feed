# Mini Social Feed

A small social feed: accounts, posts, likes, comments, and push notifications.

Monorepo — **`/backend`** (Node + Express 5 + TypeScript + Prisma 7 + PostgreSQL)
and **`/mobile`** (React Native + Expo SDK 57).

| | |
|---|---|
| **Live API** | https://mini-social-feed-production.up.railway.app |
| **Interactive API docs** | https://mini-social-feed-production.up.railway.app/docs |
| **Health check** | https://mini-social-feed-production.up.railway.app/health |

The Swagger UI at `/docs` lists every endpoint and can call the live API — press
**Authorize**, paste a JWT from signup or login, and use *Try it out*.

Detailed setup lives in [`backend/README.md`](backend/README.md) and
[`mobile/README.md`](mobile/README.md).

---

## Features

- Username + password auth with bcrypt hashing and JWTs
- Create posts; paginated newest-first feed with a `?username` filter
- Like toggle, backed by a database unique constraint so it is idempotent
- Comments, with a paginated thread per post
- FCM push to a post's owner on like and comment, delivered via `firebase-admin`
- Mobile client: login/signup, feed with pull-to-refresh and infinite scroll,
  optimistic likes, create post, comments, username filter, push registration
  and reception

---

## Quick start

**Backend**

```bash
cd backend
corepack enable
yarn install
cp .env.example .env        # set DATABASE_URL and JWT_SECRET
yarn prisma migrate dev     # creates the DB, applies migrations, generates the client
yarn dev                    # http://localhost:4000
```

**Mobile**

```bash
cd mobile
npm install
npm start                   # expo start --dev-client
```

Full details, including the Firebase setup, are in the two sub-READMEs.

---

## API

Base URL `https://mini-social-feed-production.up.railway.app`. All bodies are
JSON. Authenticated endpoints need `Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| `GET` | `/health` | — | Liveness probe |
| `POST` | `/auth/signup` | — | Create an account, returns a JWT |
| `POST` | `/auth/login` | — | Log in, returns a JWT |
| `POST` | `/posts` | ✔ | Create a post (1–500 chars) |
| `GET` | `/posts` | ✔ | Feed, newest first. `?page` `?limit` `?username` |
| `POST` | `/posts/:id/like` | ✔ | Toggle a like, returns `{liked, likeCount}` |
| `POST` | `/posts/:id/comment` | ✔ | Add a comment (1–300 chars) |
| `GET` | `/posts/:id/comments` | ✔ | List a post's comments, oldest first |
| `POST` | `/devices` | ✔ | Register an FCM device token |
| `GET` | `/devices` | ✔ | List the caller's devices (tokens truncated) |

Every error — including 404s and malformed JSON — uses one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Codes: `VALIDATION_ERROR` `INVALID_JSON` `UNAUTHORIZED` `INVALID_CREDENTIALS`
`USERNAME_TAKEN` `POST_NOT_FOUND` `NOT_FOUND` `INTERNAL`.

Request/response examples for each endpoint are in
[`backend/README.md`](backend/README.md#api) and at `/docs`.

---

## Notes on the spec

- **Web vs mobile.** The evaluation criteria mention a "web interface" while the
  deliverables specify mobile only. Built mobile, per the deliverables.
- **FCM device tokens are stored server-side** in a `Device` table, keyed by
  user with `fcmToken` unique. The spec did not say where tokens should live.
  Server-side storage lets the API fan a notification out to all of a user's
  devices and prune tokens Firebase rejects; passing the token per request would
  have avoided a table but made both impossible. The cost is that tokens become
  personal data the backend has to retain and expire.
- **Likes use the database constraint, not a read-then-write.** Liking inserts
  and catches the `@@unique([postId, userId])` violation to detect an existing
  like. A `findUnique`-then-branch would let two concurrent requests both insert.
- **Push is fire-and-forget.** Delivery is deliberately not part of a request's
  success criteria: the send happens after the response and is never awaited, so
  a Firebase outage cannot turn a successful like into a 500.

---

## Known limitations / what I would add next

1. **Rate limiting** on `/auth/signup` and `/auth/login`. Nothing currently
   throttles credential stuffing or brute-force account enumeration.
   `express-rate-limit` keyed by IP, tightened further per username.
2. **Close the login timing side-channel.** `bcrypt.compare` is skipped when the
   username does not exist, so a miss returns in ~1 ms versus ~100 ms for a real
   account. The response bodies are identical, but the timing is not — comparing
   against a dummy hash on the miss path equalises it.
3. **No refresh tokens.** Access tokens are signed with `JWT_SECRET` and expire
   after `JWT_EXPIRES_IN`; there is no rotation or server-side revocation, so a
   stolen token is valid until it expires.
4. **Field-level validation errors.** Only the first Zod issue's message is
   returned, so a client cannot tell which field failed. Returning `issue.path`
   alongside each message would make the mobile forms considerably better.
5. **Cursor pagination** for the feed. Offset pagination drifts when posts are
   created mid-scroll and degrades at depth.
6. **Structured logging with a request id**, so a failed push can be traced back
   to the request that triggered it. `console.log` is not enough.
7. **A dedicated test database.** The integration tests run against
   `DATABASE_URL` and clean up after themselves, but they should not be able to
   touch development data at all.
8. **iOS push is unverified.** The backend sends native FCM tokens, which works
   on Android; iOS additionally needs the APNs key uploaded to Firebase.

---

## Tests

```bash
cd backend && npm test      # 20 integration tests via supertest
```

They drive the exported Express app end to end — signup, duplicate signup,
password hashing, login failures, the auth guard, feed pagination and filtering,
like toggling, comment validation, and the error contract.
