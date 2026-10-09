# Autopilot checkpoint

## Target (pinned)
- Name: Opsis, an OSINT search platform (email / username / domain)
- Maker: Opsis LLC
- Official URL: https://useopsis.com/ (API: https://api.useopsis.com)
- Store links: none (web only)
- Platform: web
- Scope: whole product, minus the FAQ page and the suppression request system (user, 2026-10-09)
- Confirmed: user supplied the link; the page names a single product

## Run
- Command: /autopilot fullreplica (through deploy; deploy still needs the user's go)
- Stage reached: 2 replica-architect ✅ (architecture.md, supabase/migrations/20261009000000_init.sql — SQL not yet run against Postgres)
- Next: 3 replica-design

## Decisions in force
- Clean-room, public sources only: the Opsis Terms forbid reverse engineering, so no Opsis account is used
- Free stack (Cloudflare, Supabase, Resend, Stripe); ask before any paid line item (e.g. a reverse-WHOIS data source)
- Commit and push after every change
- Skip: CAPTCHA solving, reset-endpoint email checks, IG recovery hints, secret scanning of others' code

## Open questions for user (batch)
- Brand name (stage 9)
