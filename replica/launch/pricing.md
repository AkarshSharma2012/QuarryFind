# Pricing

**Decision (user, 2026-10-09): free and unlimited.** No plans, no credits, no paywalls. Rate limits exist only for abuse protection: 10 searches/min on the web, 60/min on the API, 3 running at once, 30 tool calls/min.

## The market

| product | price | what you get | source, date read |
| --- | --- | --- | --- |
| The original (hosted OSINT search) | $14.99 / $24.99 / $49.99 per month | 25 / 75 / 150 searches a month; deep search from the middle tier; API only on the top tier, plus prepaid API credits from $20 for 50 | its public pricing section, 2026-10-09 |
| Epieos | €29.99 / month | 30 full-access requests a month | [ShadowDragon guide](https://shadowdragon.io/?p=8054) (secondary source), 2026-10-09; check the vendor before quoting |
| Sherlock, Maigret, WhatsMyName (open source) | free | CLI or self-hosted; install and maintenance are yours | project repositories |
| **QuarryFind** | **free** | every search type, deep search, API, all tools | — |

## What the evidence says about price

`feedback.md` has no price complaints, because the sample is open-source tool users (0 price-themed items). The case for free is positioning, not reviews: the hosted competitor starts at $14.99 for 25 searches, and the open-source tools are free but need an install (13 install/error items, 2 sources).

## How free stays free

On the free tiers:
- **Cloudflare Pages:** static site, unlimited requests.
- **Supabase Free:** Postgres 500 MB. Findings are purged after 6 h and history after 90 days, so the database stays small.
- **Edge Functions:** 500k invocations a month. One username search is about 21 batches plus start, so roughly 22 calls; that's about **22,000 searches a month** before the limit.
- **Realtime:** 2M messages and 200 concurrent connections.

Watch the Supabase usage page monthly. The first limit hit will be Edge Function invocations. Options then:
1. Bigger batches, once hosted CPU is measured.
2. Supabase Pro ($25/month). **Ask the user before spending.**
3. Donations or sponsorship (GitHub Sponsors is free to set up).

The free tier pauses projects after a week of inactivity, which won't happen with real traffic. Noted in `deploy.md`.

## Billing complaints to design out

None apply: there's no billing. Account deletion is one click in Settings and deletes everything.

## Stripe

Not used. No products or prices to create.
