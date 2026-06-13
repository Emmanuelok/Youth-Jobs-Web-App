# Ghana Youth Jobs, Apprenticeships & Skills Marketplace

A mobile-first, low-data, trust-focused web app helping young Ghanaians find verified jobs, apprenticeships, internships, gigs, and training, while helping employers, artisans, training providers, and NGOs find and screen trustworthy candidates.

## What's in this repo

This branch (`claude/ghana-job-marketplace-S2JLW`) contains the complete product blueprint and 90-day MVP plan in [`BLUEPRINT.md`](./BLUEPRINT.md). It covers:

- Problem analysis and Ghana-specific context
- Product vision (long-term + MVP)
- 15 user personas
- 40+ jobs-to-be-done
- Full feature set (phased: MVP / V1 / V2 / Later)
- User flows, information architecture, UX/UI brief and wireframes
- Data model, API design, matching algorithm
- Trust, safety, and youth protection system
- Ethical monetization
- Admin and operations playbook
- Technical architecture (fast MVP stack vs scalable production stack)
- Security and privacy plan
- Analytics and KPIs
- Go-to-market plan for Ghana
- Risk register
- Phased roadmap
- 60+ MVP development tickets
- Testing plan
- Final recommendation

## Important

The blueprint repeatedly flags items that **must be verified with official Ghanaian sources or qualified Ghanaian professionals** before launch — particularly:

- Ghana Labour Act 2003 (Act 651) and its current regulations
- Children's Act 1998 (Act 560) and the Hazardous Child Labour Activity Framework
- Apprenticeship rules under the TVET Act (Act 1023, 2020) and CTVET regulations
- Data Protection Act 2012 (Act 843) and DPC registration obligations
- Recruitment licensing and the "no-fee-from-job-seekers" principle
- Tax (GRA), SSNIT, and minimum wage at time of launch

Do not treat any legal statement in the blueprint as legal advice. Verify with the Ministry of Employment and Labour Relations, Ghana Data Protection Commission, CTVET, Department of Social Welfare, and a qualified Ghanaian lawyer before going live.

## Status

Engine implemented. Next.js 16 + React 19 + Drizzle + Neon Postgres. 26 routes, 14 tables. Phone-OTP auth, candidate/employer/admin flows, AI CV generator, daily SMS digest cron, in-app messaging with scam screening, guardian-consent flow for under-18s, account export and deletion, terms and privacy notice.

## Operations

### First-time setup

1. Provision Postgres (Vercel → Storage → Neon Postgres). Set `DATABASE_URL`.
2. Generate a session secret: `openssl rand -base64 48` → set `SESSION_SECRET`.
3. Create Upstash Redis (https://console.upstash.com) → set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
4. (Recommended) Create a Sentry project → set `SENTRY_DSN`.
5. (Optional) Set `ANTHROPIC_API_KEY` for AI CV generation, `ARKESEL_API_KEY` + `ARKESEL_SENDER_ID` + `SMS_PROVIDER=arkesel` for real SMS, `CRON_SECRET` for the daily-digest cron, `ADMIN_PHONES` (comma-separated E.164) for first admin sign-in.
6. From your local machine, with `DATABASE_URL` in `.env.local`:
   ```bash
   npm install
   npm run db:migrate
   ```
7. Redeploy.

### Schema changes

We use drizzle-kit migrations (not `db:push`). When you change `db/schema.ts`:

```bash
npm run db:generate          # writes drizzle/NNNN_*.sql
git add drizzle/ && commit
npm run db:migrate           # applies against $DATABASE_URL
```

`db:push` is still available for throwaway dev databases but should never run against production — it can drop columns silently.

### Health

`GET /api/health` returns `{ ok, db, durationMs, commit, region }`. Returns 200 when DB is reachable, 503 otherwise. Point your uptime monitor here.

### Localization (i18n)

UI locales live in `lib/i18n/`. English (`en`) is the source of truth — its dictionary shape *is* the `Messages` type, so every other locale must provide every key or the build fails. Locale resolves from the `gyj_locale` cookie, then `Accept-Language`, then English. A no-JS language switcher (server action + cookie) is in the header and landing footer.

> ⚠️ **Twi (`tw`) is a DRAFT translation and must be reviewed by a native Akan speaker before launch** — especially the `safety.*` strings, where a mistranslation is worse than English. Ga, Ewe, Dagbani, and Hausa are typed-ready but intentionally not in `SELECTABLE_LOCALES` until QA'd. Adding a locale: create `lib/i18n/dictionaries/<code>.ts` satisfying `Messages`, register it in `lib/i18n/index.ts` + `locales.ts`.

### PWA / offline

`app/manifest.ts` makes the app installable. `public/sw.js` caches only immutable build assets and serves `/offline` when navigation fails — it never caches authenticated/PII pages. Bump `CACHE_VERSION` in `sw.js` to invalidate on deploy.

### Rate limits (Upstash)

| Surface | Limit |
| --- | --- |
| `apply` | 10 / hour per candidate |
| `message_send` | 30 / hour per user |
| `conversation_start` | 20 / hour per employer |
| `scam_report` | 5 / hour per user (or per job for anon) |
| `job_post` | 10 / hour per employer |
| `guardian_request` | 3 / hour per candidate |
| `cv_generate` | 5 / hour per candidate |

If Upstash credentials are absent, rate limiting falls open with a one-time warning. On Upstash errors, also falls open so transient outages don't lock users out.
