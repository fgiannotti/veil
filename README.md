# Veil

Argentina's verified, anonymous source of truth for salaries and real purchasing power.

A Next.js 14 monolith with PostgreSQL/TimescaleDB. Privacy is enforced by schema separation: auth credentials and salary activity live in different Postgres schemas with no foreign keys between them; they are linked only by an opaque `profile_id` UUID.

## Stack

- Next.js 14 (App Router, TypeScript)
- PostgreSQL 16 + TimescaleDB (Docker)
- Drizzle ORM
- Auth.js (NextAuth v5): Credentials (bcrypt) + Google OAuth
- nodemailer (MailHog locally) for verification codes
- Tailwind CSS (minimal, mobile-first), Recharts for charts
- `next-pwa` for the PWA manifest + service worker
- Vitest for unit tests

## Layout

```
src/
  app/              Routes (pages + API)
  server/
    auth.ts         NextAuth config + profile_id bridging
    verification.ts Work-email verification (domain-only persistence)
    inflation.ts    USD Blue + IPC math
    benchmark.ts    k-anonymous benchmark
    indicators/     USD Blue + IPC adapters, refresh job
    companies/      Tier-1 domain -> size bucket map
    db/             Drizzle schemas (auth.ts, data.ts)
    mail.ts         SMTP transport
  components/       Plain Tailwind UI (no kit)
  lib/              Zod schemas, currency/date helpers
drizzle/            Raw SQL migrations
scripts/            migrate / refresh-indicators / seed-sysarmy
tests/              Vitest (inflation, benchmark, verification)
```

## Quick start

```bash
cp .env.example .env

docker compose up -d        # Postgres+TimescaleDB on :5432, MailHog UI on :8025

npm install
npm run db:migrate          # Applies drizzle/*.sql, creates the hypertable
npm run indicators:refresh  # Loads seed + live USD Blue into data.economic_indicators
npm run seed:sysarmy        # Optional: seeds aggregated cohort ranges
npm run dev                 # http://localhost:3000
```

## Tests

```bash
npm test
```

Covers the inflation engine math, k-anonymity benchmark logic, and domain/personal-email helpers — pure functions, no DB required.

## Env vars

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `AUTH_SECRET` | NextAuth JWT secret. Also used to HMAC work-email hashes. |
| `AUTH_URL` | Public origin (e.g. `http://localhost:3000`). |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google OAuth. |
| `SMTP_HOST/PORT/USER/PASS/FROM` | SMTP for verification codes. Defaults match MailHog. |
| `INDICATORS_REFRESH_TOKEN` | Bearer token required by `POST /api/indicators/refresh`. |
| `USD_BLUE_API_URL` | Defaults to `https://api.bluelytics.com.ar/v2/latest`. |

## Privacy model

- `auth.users` stores credentials (Google or bcrypt) + a `profile_id` UUID generated at signup.
- `data.*` tables (`company_badges`, `salary_entries`, `economic_indicators`, `grapevine_posts`) never reference `auth.*`. The only key into them is `profile_id`.
- The session JWT carries `profile_id`. API routes read it and query `data.*` directly — `auth.*` is never joined.
- Work-email verification: a 6-digit code is sent to the work email; on confirmation only the **domain** is persisted (as a row in `data.company_badges`). The full email is never written to disk.

## Cohort benchmarking

`GET /api/benchmark?role=...&seniority=...&companySizeBucket=...` returns `avg`/`p25`/`p50`/`p75` only when the cohort has ≥3 entries. All historical entries are inflated to today's pesos with the IPC ratio before percentiles are computed.

## Indicators

- USD Blue: live, every refresh. Defaults to the public Bluelytics aggregator. Swap via `USD_BLUE_API_URL`.
- IPC: seeded from `src/server/indicators/seed.json` (curated INDEC monthly index). The `fetchIpcSeries` adapter is the single seam to replace with a live INDEC source.

Cron in production:

```
POST /api/indicators/refresh
Authorization: Bearer $INDICATORS_REFRESH_TOKEN
```

Or run locally: `npm run indicators:refresh`.

## Cold-start seeding (GTM)

`npm run seed:sysarmy` inserts 3 synthetic salary entries per cohort (low/median/high) under a sentinel `profile_id`, tagged `source = 'seed:sysarmy'`. They count toward k-anonymity so visitors immediately see benchmark data; they are clearly aggregated, not user-submitted.

## Out of scope (per spec)

- Direct messaging
- Document upload (e.g. PDF payslips)
- Public profiles or bios
- Markets outside Argentina
- The Grapevine feed UI — the schema is included (`data.grapevine_posts`) for Phase 1.1; no routes/UI yet.

## License

Proprietary - all rights reserved.
