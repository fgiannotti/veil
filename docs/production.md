# Production launch guide

Checklist and runbook for putting Bench on the public internet.

## 1. Hosting options

Recommended for a first launch:

- **App:** [Vercel](https://vercel.com) (Next.js 14) or a single Node VPS (`npm run build && npm start`)
- **DB:** Managed Postgres (Neon, Supabase, Railway, RDS) with SSL (`?sslmode=require`)
- **SMTP:** [Resend](https://resend.com) (or any transactional SMTP)
- **Cron:** external cron / Vercel Cron calling `POST /api/indicators/refresh`

There is no required Docker image for the app; local `docker-compose.yml` is for Postgres + MailHog only.

## 2. Secrets (do this first)

Generate and set on the host (never commit real values):

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # INDICATORS_REFRESH_TOKEN
```

Required in production (`NODE_ENV=production`):

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres URL with SSL |
| `AUTH_SECRET` | Long random; also used to HMAC work-email hashes |
| `AUTH_URL` | Public `https://` origin, e.g. `https://bench.com.ar` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM` | Not localhost |
| `SMTP_USER` / `SMTP_PASS` | Required for Resend |
| `INDICATORS_REFRESH_TOKEN` | Bearer for indicators cron |

Optional:

| Var | Notes |
| --- | --- |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth; leave empty to disable |
| `ADMIN_EMAIL` | Exact login email allowed to use `/admin/reviews` |
| `USD_BLUE_API_URL` | Defaults to Bluelytics |

The app **refuses to start** in production if secrets are missing or still set to placeholder values.

If you previously committed a Google client secret in `.env.example`, **rotate it** in Google Cloud Console.

## 3. Google OAuth (optional)

1. Create a Web OAuth client.
2. Authorized origins: `https://your-domain`
3. Redirect URI: `https://your-domain/api/auth/callback/google`
4. Set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` on the host.

Accounts that signed up with email/password cannot be taken over via Google (same email).

## 4. Email (Resend)

1. Verify your sending domain in Resend.
2. Set SMTP vars as in `.env.example` (production block).
3. Smoke test: `npm run mail:test -- you@yourcompany.com` with production SMTP in `.env`.

## 5. Database

```bash
npm run db:migrate
npm run indicators:refresh
```

Optional cold-start seed (only if you have the cohort scripts/data):

```bash
npm run seed:sysarmy
```

## 6. Cron — economic indicators

Daily (or more often):

```bash
curl -X POST https://your-domain/api/indicators/refresh \
  -H "Authorization: Bearer $INDICATORS_REFRESH_TOKEN"
```

## 7. Security notes

- Rate limits (in-memory, per process): verify, signup, salaries, report-domain, login.
  Multi-instance deploys should swap `src/server/rate-limit.ts` for Redis/Upstash.
- Middleware protects `/dashboard`, `/verify`, `/salaries`, `/benchmark`, `/companies`, `/admin`.
- Benchmark requires at least one **published** salary entry.
- Company pages filter by **company domain** (k-anonymity ≥ 3).
- Security headers are set in `next.config.mjs`.
- Admin: set `ADMIN_EMAIL`; without it, admin APIs deny everyone.

## 8. Launch checklist

- [ ] Secrets rotated; `.env` / host env only (not git)
- [ ] `AUTH_URL` is the live HTTPS origin
- [ ] Google redirect URIs match production (if enabled)
- [ ] Resend domain verified; `mail:test` works
- [ ] Migrations applied; indicators refreshed
- [ ] Cron for indicators configured
- [ ] `ADMIN_EMAIL` set if you need review queue
- [ ] Smoke: signup → verify work email → save salary → dashboard wage history → benchmark
- [ ] Smoke: companies → “ver sueldos” filters that company
- [ ] Confirm personal emails and unknown domains are rejected; report-domain works

## 9. Known limitations

- In-memory rate limits are per Node process.
- No admin UI for `domain_requests` yet (rows are stored for manual review).
- Grapevine feed is schema-only (Phase 1.1).
