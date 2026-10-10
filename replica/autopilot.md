# Autopilot checkpoint

## Target (pinned)
- Name: Opsis, an OSINT search platform (email / username / domain). OUR product name: QuarryFind
- Maker: Opsis LLC
- Official URL: https://useopsis.com/ (API: https://api.useopsis.com)
- Store links: none (web only)
- Platform: web
- Scope: whole product, minus FAQ page + suppression system; FREE and UNLIMITED (no plans/credits/Stripe); extra OSINT tools added (user, 2026-10-09)
- Confirmed: user supplied the link; the page names a single product

## Run
- Command: /autopilot fullreplica (through deploy; deploy still needs the user's go)
- Stage reached: 11 replica-deploy: LIVE on GitHub Pages https://akarshsharma2012.github.io/OsintSet/ (user's go 2026-10-09; Pages workflow `.github/workflows/pages.yml`, base path /OsintSet). Preflight: 49/49 e2e, 47/47 vitest, parity 99.4, sweep clean, audit 0.
- Next: backend CONNECTED and verified 2026-10-10 (project manovzhsjhgiexdowhgj). Live smoke workflow (.github/workflows/live-smoke.yml, e2e-live/) 29/29 incl. signed-in search + 3 concurrent users; module health 289/310 ok, 310 rows uploaded. OAuth buttons only show enabled providers. Open: Resend SMTP (built-in mailer rate-limited), Sentry, legal review. Ruled out: `supabase db push` from this network (ports 5432/6543 blocked; use dashboard SQL editor).

## How to run locally
- e2e: `NEXT_DIST_DIR=.next-build npm --prefix web run build` then `npx playwright test` (serves web/.next-build on 4317). Only ONE Playwright run at a time.
- Edge runtime policy is `oneshot` locally (per-request CPU budget like hosted); restart container after adding new files under supabase/functions.
- Supabase: `npx supabase start` (ports 553xx; Studio http://127.0.0.1:55323); keys in web/.env.local, supabase/functions/.env, .env.test.local (all gitignored)
- Integration tests: `set -a; . ./.env.test.local; set +a; npx vitest run`
- `npm run dev:api` (port 8787) + `npm --prefix web run dev` (port 3000); or launch.json configs dev-api / web-dev
- Tests: `npx vitest run`; live sources: `npm run fixtures`

## Decisions in force
- WhatsMyName imported (261 verified sites, CC BY-SA 4.0, attributed) → 320 sources; reverse WHOIS skipped (paid)
- Local Supabase in Docker for backend dev (user OK 2026-10-09)
- Clean-room, public sources only: the Opsis Terms forbid reverse engineering, so no Opsis account is used
- Free stack (Cloudflare, Supabase, Resend, Stripe); ask before any paid line item (e.g. a reverse-WHOIS data source)
- Commit and push after every change
- Skip: CAPTCHA solving, reset-endpoint email checks, IG recovery hints, secret scanning of others' code

## Open questions for user (batch)
