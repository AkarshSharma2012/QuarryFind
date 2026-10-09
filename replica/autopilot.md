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
- Stage reached: 4 replica-build ✅ (build-log.md; core flow runs on local dev API; UI pass with ui-ux-pro-max done)
- Next: 5 replica-backend (Supabase: auth, migrations, edge functions search-start/search-batch/tools/v1/api-keys, Realtime data layer)

## How to run locally
- `npm run dev:api` (port 8787) + `npm --prefix web run dev` (port 3000); or launch.json configs dev-api / web-dev
- Tests: `npx vitest run`; live sources: `npm run fixtures`

## Decisions in force
- Clean-room, public sources only: the Opsis Terms forbid reverse engineering, so no Opsis account is used
- Free stack (Cloudflare, Supabase, Resend, Stripe); ask before any paid line item (e.g. a reverse-WHOIS data source)
- Commit and push after every change
- Skip: CAPTCHA solving, reset-endpoint email checks, IG recovery hints, secret scanning of others' code

## Open questions for user (batch)
- Brand name (stage 9)
- OK to import WhatsMyName site list (CC BY-SA 4.0, ~600 sites) into modules?
- OK to pull Supabase local Docker images (several GB) for backend dev?
- Reverse WHOIS needs a paid source: skip?
