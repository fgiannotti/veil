# Veil

Argentina's verified, anonymous source of truth for salaries and real purchasing power.

A Next.js 14 monolith with PostgreSQL. Privacy is enforced by schema separation: auth credentials and salary activity live in different Postgres schemas with no foreign keys between them; they are linked only by an opaque `profile_id` UUID.

## Stack

- Next.js 14 (App Router, TypeScript)
- PostgreSQL 16 (Docker)
- Drizzle ORM
- Auth.js (NextAuth v5): JWT sessions, Credentials (bcrypt) + Google OAuth; `auth.users` only (no adapter tables)
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
scripts/            migrate / refresh-indicators / seed-cohort
tests/              Vitest (inflation, benchmark, verification)
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS (18+ works; 20 recommended for Next.js 14)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose)
- `openssl` (to generate `AUTH_SECRET`)

## Local development

1. **Configure env**

   ```bash
   cp .env.example .env
   ```

   Generate a secret and set `AUTH_SECRET` in `.env`:

   ```bash
   openssl rand -base64 32
   ```

   Google OAuth is optional for email/password, but required for “Continue with Google”:

   1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials** → **Create OAuth client ID** (Web application).
   2. **Authorized JavaScript origins:** `http://localhost:3000` (and `https://veil.com.ar` in production).
   3. **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google` (and `https://veil.com.ar/api/auth/callback/google` in production).
   4. Copy **Client ID** (ends with `.apps.googleusercontent.com`) → `AUTH_GOOGLE_ID`. Copy **Client secret** → `AUTH_GOOGLE_SECRET`. Do not put the redirect URI in `AUTH_GOOGLE_ID`.
   5. Set the same values in `.env` or `.env.local` (not only `.env.example`).
   6. If the app is in **Testing**, add your Google account under OAuth consent screen → **Test users**.
   7. Restart `npm run dev` after changing env vars.

2. **Start Postgres and MailHog**

   ```bash
   docker compose up -d
   ```

   Wait until `veil_db` is healthy (`docker compose ps`), then:

3. **Install dependencies and prepare the database**

   ```bash
   npm install
   npm run db:migrate
   npm run indicators:refresh   # requires network; seeds IPC + fetches USD Blue
   ```

   Optional benchmark seed data:

   ```bash
   npm run seed:cohort
   ```

4. **Run the app**

   ```bash
   npm run dev
   ```

   - App: http://localhost:3000
   - MailHog (verification emails): http://localhost:8025  
   - Resend smoke test (production SMTP in `.env`): `npm run mail:test -- you@work.com`

### Troubleshooting

| Issue | Fix |
| --- | --- |
| Docker daemon not running | Start Docker Desktop, then retry `docker compose up -d`. |
| `ECONNREFUSED` on migrate | Ensure `docker compose up -d` finished and `veil_db` is healthy. |
| Port 5432 already allocated | Stop other Postgres or change the published port in `docker-compose.yml` and `DATABASE_URL`. |
| Google sign-in fails | Leave OAuth vars empty and use credentials, or configure a Google OAuth client with redirect `http://localhost:3000/api/auth/callback/google`. |
| `indicators:refresh` fails | Check network access to `USD_BLUE_API_URL` (default: Bluelytics). |

## Production

See [docs/production.md](docs/production.md) for hosting, secrets, cron, security, and launch checklist.

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
| `SMTP_HOST/PORT/USER/PASS/FROM` | SMTP for verification codes. Local defaults match MailHog; production uses [Resend](https://resend.com) (see `docs/production.md` §3). |
| `INDICATORS_REFRESH_TOKEN` | Bearer token required by `POST /api/indicators/refresh`. |
| `USD_BLUE_API_URL` | Defaults to `https://api.bluelytics.com.ar/v2/latest`. |

## Privacy model

- `auth.users` stores credentials (Google or bcrypt) + a `profile_id` UUID generated at signup. Sessions are JWTs (not stored in Postgres).
- `data.*` tables (`company_badges`, `salary_entries`, `economic_indicators`, `grapevine_posts`) never reference `auth.*`. The only key into them is `profile_id`.
- The session JWT carries `profile_id`. API routes read it and query `data.*` directly — `auth.*` is never joined.
- Work-email verification: a 6-digit code is sent to the work email; on confirmation only the **domain** is persisted (as a row in `data.company_badges`). The full email is never written to disk.

## Cohort benchmarking

`GET /api/benchmark?role=...&seniority=...&companySizeBucket=...` returns `avg`/`p25`/`p50`/`p75` only when the cohort has ≥3 entries. All historical entries are inflated to today's pesos with the IPC ratio before percentiles are computed.

## Salaries by company

Logged-in users can browse anonymous entries per company domain at `/companies` or via:

```
GET /api/companies/salaries?domain=globant.com&role=...&seniority=...
```

Returns grouped stats (role, seniority, ranges) with **no profile ids** when the company (or filtered subset) has ≥3 rows. `GET /api/companies` lists the public domains with the most entries (top 12 by count).

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

`npm run seed:cohort` reads `scripts/data/cohort-2026.01.csv` and inserts one salary entry per mapped response under the sentinel `profile_id`, tagged `source = 'seed:cohort'` and `company_domain = '_seed_cohort'`. Expect ~4.8k inserts. The seed also upserts an `economic_indicators` row for `2026-03-06` at USD blue = 1405 so the seeded entries convert to USD at the reference rate for that month.

Per-row mapping rules:

- `trabajo_de` is matched against an explicit table in `scripts/cohort-csv-import.ts`. Unrecognised job titles are skipped and logged after the run — there is no slug fallback.
- `seniority` is one of `Junior`/`Semi-Senior`/`Senior` (→ `junior`/`ssr`/`senior`).
- `cantidad_de_personas_en_tu_organizacion` is binned into the standard Veil buckets (`1-50`, `50-200`, `200-1000`, `1000-5000`, `5000+`).
- `net_ars` uses the `ultimo_salario_..._neto_en_pesos_argentinos` column; when blank we fall back to `_sal * 0.7` (bruto → net heuristic). Values outside 100k–50M ARS are dropped as obvious typos.

Flags:

```
npm run seed:cohort                        # default CSV
SEED_CSV=path/to/other.csv npm run seed:cohort
npm run seed:cohort -- --json              # small per-entry fixture
npm run seed:manual-curated                # import scripts/data/manual-curated-entries.json
```

The script is idempotent — it deletes prior cohort seed rows under the sentinel profile before re-inserting.
Manual curated entries are also idempotent under `source = 'seed:manual-curated'` and are documented in `scripts/data/manual-curated-entries.json`.

## Out of scope (per spec)

- Direct messaging
- Document upload (e.g. PDF payslips)
- Public profiles or bios
- Markets outside Argentina
- The Grapevine feed UI — the schema is included (`data.grapevine_posts`) for Phase 1.1; no routes/UI yet.

## License

Proprietary - all rights reserved.
