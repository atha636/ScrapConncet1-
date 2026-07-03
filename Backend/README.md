# ScrapConnect Backend v2

Rebuilt for correctness, security, and structure. Same core domain (pickup requests, users, collectors, sockets) — everything around it is new.

## What changed vs the old backend

**Security fixes**
- `role` can no longer be set arbitrarily on `/register`. It's now `wantsToBeCollector: boolean` → mapped server-side to `"user" | "collector"`. No client can mint an `"admin"` account.
- Passwords require 8+ chars, a letter, and a number (was: no check at all).
- `helmet`, `express-mongo-sanitize`, and a rate limiter on `/api/auth` (30 req / 15 min) are new — the old server had none of this.
- JWTs now expire (`JWT_EXPIRES_IN`, default 7d) — old tokens never expired.
- CORS is locked to `CLIENT_ORIGIN` instead of `origin: "*"`.

**Validation**
- Every route body is validated with Zod (`src/validators/*`) before it reaches a controller. Bad input gets a structured `400` with per-field messages instead of hitting Mongoose/crashing.

**Architecture**
- `asyncHandler` wraps every controller — no more repeated try/catch, no more unhandled rejections crashing the process.
- One centralized `errorHandler` (`src/middleware/errorHandler.js`) turns Mongo duplicate-key errors, validation errors, and `ApiError` throws into consistent JSON responses.
- `src/utils/pricing.js` pulls the pricing logic out of the controller into its own module — still simple, but now it's the one place to extend into a DB-backed rate table later.

**Images**
- Uses Cloudinary when `CLOUDINARY_*` env vars are set (required for any real deploy — Render/Vercel wipe local disk on redeploy). Falls back to local `uploads/` in dev if no keys are configured, so `npm run dev` still works out of the box.

**Data model**
- `Pickup` now has `status: pending → accepted → in_progress → completed | cancelled` with a `statusHistory` log and enforced valid transitions (a collector can't jump straight from `accepted` to `completed`).
- `estimatedWeightKg`, `address`, and geo bounds validation (`lat` -90..90, `lng` -180..180) added.
- Both `/my-requests` and `/available` are paginated (`?page=&limit=`) instead of returning unbounded arrays.
- New `GET /api/pickup/collector/jobs` — the old backend had no way for a collector to see their own job history; this was a real gap.

## Setup

```bash
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET at minimum
npm install
npm run dev
```

Without `CLOUDINARY_*` set, image uploads land in `./uploads` locally — fine for dev, not for deploy.

## API surface

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/register | – | `{ name, email, password, phone?, wantsToBeCollector? }` |
| POST | /api/auth/login | – | |
| GET | /api/auth/me | user | |
| POST | /api/pickup/request | user | multipart, field `image` |
| GET | /api/pickup/my-requests | user | paginated |
| GET | /api/pickup/available | collector | paginated |
| GET | /api/pickup/collector/jobs | collector | paginated, `?status=` filter |
| PATCH | /api/pickup/:id/accept | collector | |
| PATCH | /api/pickup/:id/status | collector | must own the job; enforced transitions |

## Not yet built (flagged, not silently skipped)

Rating/review system, in-app chat, live GPS tracking, and an admin panel were mentioned as "next" — intentionally left out of this pass so the core is solid first. The `User` model already has `rating`/`ratingCount` fields staged for when that lands.
