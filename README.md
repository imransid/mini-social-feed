# Mini Social Feed App

Monorepo: `/backend` (Node + Express + TypeScript + Prisma) and `/mobile` (React Native + Expo).

See `backend/README.md` and `mobile/README.md` for setup.

## Notes on the spec

- Evaluation mentions a "web interface"; deliverables specify mobile only. Built mobile per deliverables.
- FCM device tokens are stored server-side (`Device` table); the spec does not specify this, decision documented in backend README.
