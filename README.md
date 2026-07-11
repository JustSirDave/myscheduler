# MyScheduler

Personal planner & naira expense tracker — a purpose-built, single-user web app
replacing a Notion-based planner. See [`docs/myscheduler-webapp-PRD.md`](docs/myscheduler-webapp-PRD.md)
for the full product spec.

**Stack:** Next.js (App Router, TypeScript) · Prisma 7 · Postgres (Neon) · Tailwind CSS 4 · Vercel

---

## Current status — Foundation phase ✅

This phase proves the plumbing works end to end. It is deliberately minimal:

- **Next.js + TypeScript + Tailwind** project scaffold.
- **Prisma schema** for `PlannerItem` and `Expense` (+ enums), with an initial
  migration in [`prisma/migrations`](prisma/migrations).
- **Single-password auth** — no signup, no user table. A signed, httpOnly
  session cookie is issued on a correct password; `proxy.ts` (Next 16's renamed
  middleware convention) gates every route and redirects to `/login` otherwise.
- **`/login`** — password form.
- **`/`** — protected placeholder that proves the session *and* the database
  both work: it shows live `PlannerItem` and `Expense` row counts pulled from
  Postgres.

Verified locally: unauthenticated → redirect to `/login`; wrong password →
error; correct password → session set and live DB counts render; sign out →
back to `/login`.

## Not yet built (next-phase work)

Intentionally out of scope for the Foundation phase — do not assume these exist:

- Google Calendar **two-way sync** (OAuth, inbound cron pull, outbound event writes)
- **Web Push** notifications (service worker, VAPID keys, subscription flow)
- **Today / Week / Month / Calendar** views and the side-by-side dashboard layout
- **Habit streak** logic
- **Goal-linking** UI (the `linkedGoalId` self-relation exists in the schema, but no UI)
- **Expense UI** and **planner CRUD** UIs
- CSV export, drag-to-reschedule, command palette, dark-mode toggle

The schema already reserves `googleEventId` and `origin` on `PlannerItem` so
calendar sync won't need a migration later.

---

## Setup

**Prerequisites:** Node 20+ and a Postgres database (Neon free tier recommended).

1. **Install dependencies** (also generates the Prisma client via `postinstall`):

   ```bash
   npm install
   ```

2. **Configure environment.** Copy `.env.example` to `.env` (or `.env.local`)
   and fill in:

   ```bash
   DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
   AUTH_PASSWORD=your-chosen-login-password
   ```

   `AUTH_PASSWORD` is the single password you type at `/login`. It also keys the
   session-cookie signature, so changing it invalidates existing sessions.

3. **Apply the database migration:**

   ```bash
   npm run db:deploy      # prisma migrate deploy — applies prisma/migrations
   ```

4. **Run the dev server:**

   ```bash
   npm run dev            # http://localhost:3000
   ```

## Scripts

| Script            | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Start the dev server                                 |
| `npm run build`   | `prisma migrate deploy && prisma generate && next build` |
| `npm start`       | Start the production server                          |
| `npm run db:migrate` | Create + apply a new migration in dev (`migrate dev`) |
| `npm run db:deploy`  | Apply existing migrations (`migrate deploy`)      |
| `npm run db:studio`  | Open Prisma Studio                                |

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Set **Environment Variables** in the Vercel project: `DATABASE_URL` and
   `AUTH_PASSWORD` (Production + Preview).
3. Deploy. The `build` script runs `prisma migrate deploy` first, so the
   production database is migrated automatically on each deploy.

Use a **Neon pooled** connection string for the deployed app (Neon's dashboard
provides one; it ends in `-pooler`). Serverless functions open many short-lived
connections, and the pooler prevents exhausting Postgres connection limits.

---

## Notes

- **Prisma 7** connects through a driver adapter (`@prisma/adapter-pg`), not a
  `url` in `schema.prisma`. The runtime connection lives in
  [`lib/prisma.ts`](lib/prisma.ts); the CLI connection lives in
  [`prisma.config.ts`](prisma.config.ts). Both read `DATABASE_URL`.
- The generated Prisma client lives in `lib/generated/prisma` and is gitignored;
  `postinstall` regenerates it on every install (including on Vercel).
