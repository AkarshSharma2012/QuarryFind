# Autopilot checkpoint

## Target (pinned)
- Name: Opsis, an OSINT search platform (email / username / domain)
- Maker: Opsis LLC
- Official URL: https://useopsis.com/ (API: https://api.useopsis.com)
- Store links: none (web only)
- Platform: web
- Scope: whole product, minus FAQ page + suppression system; FREE and UNLIMITED (no plans/credits/Stripe); extra OSINT tools added (user, 2026-10-09)
- Confirmed: user supplied the link; the page names a single product

## Run
- Command: /autopilot fullreplica (through deploy; deploy still needs the user's go)
- Stage reached: 7 replica-diff ✅ (parity 98.2/100, must-haves 19/19, verdict shippable)
- Next: 8 replica-entrepreneur

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
- Brand name (stage 9)
