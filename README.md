# Quill

A private trading & life journal: trades, journal entries, daily check-ins, live quotes, and
**Mimo**, an evidence-only AI coach. Built with Next.js 16, React 19, Drizzle ORM (Postgres),
Firebase Auth (Google + phone OTP) and Tailwind CSS 4.

Production: https://quill-nine.vercel.app

## Local development

```bash
cp .env.example .env.local     # fill in DATABASE_URL (and optionally OPENAI_API_KEY)
npm install
npx drizzle-kit push           # create / update the tables
npm run dev                    # http://localhost:3000
```

Useful commands:

| command | what it does |
| --- | --- |
| `npm run build` | `drizzle-kit push` (schema sync) then `next build` — same as Vercel |
| `npm run lint` / `npx tsc --noEmit` | lint and type-check |
| `node scripts/generate-icons.mjs` | regenerate all PNG icons from `src/app/icon.svg` |

## Firebase setup (sign-in)

The public web config lives in `src/lib/firebase-config.ts`; the server verifies every Firebase
ID token against Google's public keys (`src/lib/firebase-token.ts`) before it creates a Quill
session, so no service-account key is needed.

Checklist in the [Firebase console](https://console.firebase.google.com/) for project
**parallel-979e8**:

1. **Authentication → Sign-in method** — enable **Google** and **Phone**.
2. **Phone OTP needs the Blaze (pay-as-you-go) plan.** Since 2024 Firebase refuses to send SMS on
   the free Spark plan and the app shows *“Phone sign-in isn't enabled for this project yet”*
   (`auth/billing-not-enabled`). Upgrade in the bottom-left of the console; a few OTPs cost cents.
3. **Authentication → Settings → SMS region policy** — choose *Allow* and include **India (+91)**
   (new projects deny every region by default, which silently drops the SMS).
4. **Authentication → Settings → Authorized domains** — add `quill-nine.vercel.app` (and any
   preview domain you test on). Without it Google sign-in and the phone reCAPTCHA both fail.
5. Optional: **Authentication → Sign-in method → Phone → Phone numbers for testing** lets you add
   a fake number + fixed code for demos without sending real SMS (still requires Blaze).

## Deploying on Vercel

Set the environment variables from `.env.example` in the Vercel project (`DATABASE_URL` is
required, `OPENAI_API_KEY` optional). Every deploy runs `drizzle-kit push`, so the database schema
follows the code automatically.

## Project layout

```
src/app/(app)/*        authenticated pages (dashboard, today, trades, journal, insights, …)
src/app/api/*          route handlers (auth, trades, journal, watchlist, check-ins, quotes, Mimo)
src/app/login/*        sign-in page (Google popup + phone OTP)
src/lib/*              shared logic: auth/sessions, Firebase, markets & FX, readiness, intelligence
src/db/*               Drizzle schema + connection
public/sw.js           production-only service worker (offline fallback, never caches /api)
```

Android: see `APK.md`.
