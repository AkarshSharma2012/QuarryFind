# Architecture: OsintSet (a rebuild of Opsis's core features)

Working name "OsintSet" until replica-brand picks the real one.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js 15 (App Router) + TypeScript, **static export** (`output: 'export'`) | Marketing pages prerender for SEO, and the app is client components talking to Supabase. A static export runs on Cloudflare's free tier with no 10 ms CPU limit and no OpenNext |
| styling | Tailwind CSS v4 with tokens from replica-design | |
| database | Postgres on Supabase (free) | One database. RLS for access. pg_cron handles jobs. Realtime streams results |
| auth | Supabase Auth: GitHub, Google, email + password | Same three options as the original. Free |
| search engine | **Supabase Edge Functions (Deno)** | Workers Free allows 10 ms CPU, 50 subrequests and 6 connections per request (checked on developers.cloudflare.com, 2026-10-09), so it can't run hundreds of checks. Edge Functions give 150 s wall clock and 2 s CPU per call, enough for a batch of about 60 checks |
| live results | Supabase Realtime (`postgres_changes` on `search_results`, `search_runs`) | Rows arrive the moment a module resolves. RLS applies |
| public API | Edge Function `v1`, served at `api.<domain>` through a thin Cloudflare Worker proxy | SSE stream by tailing the DB, capped at 140 s with a `reconnect` frame |
| payments | Stripe Checkout + Billing + Customer Portal | No monthly fee. The webhook goes to an Edge Function |
| email | Supabase Auth over Resend SMTP (free tier) | Supabase's built-in SMTP is limited to a few emails an hour |
| jobs | pg_cron (purge, reap stuck runs). GitHub Actions scheduled workflow (module health fixtures, daily) | Both free |
| hosting | Cloudflare Pages (web), Supabase (data + functions), Cloudflare DNS | Free, and commercial use is allowed |
| tests | Vitest (engine + unit), Playwright (e2e) | |

Repo layout:

```
web/                         Next.js app (static export)
supabase/migrations/         SQL (first: 20261009000000_init.sql)
supabase/functions/_shared/  engine (pure TS + fetch; also runs under Node for tests), auth, cors
supabase/functions/search-start   POST: validate, charge, create run, fan out batches
supabase/functions/search-batch   internal: run N modules, record_module() each
supabase/functions/v1             public API
supabase/functions/lookup         single-platform tools (github, reddit)
supabase/functions/billing        checkout + portal sessions
supabase/functions/stripe-webhook
modules/                     module definitions (data JSON + custom TS) and fixtures
tests/                       vitest + playwright
```

## Search engine design

- **Module** = `{ name, platform, category, types: ['username'|'email'|'domain'], premium, check(query, ctx) → Outcome }`.
  - *Data modules* (most username checks): URL template, plus found and not-found signals (status code and/or body string). The format follows the public WhatsMyName schema. If we seed from that dataset (CC BY-SA 4.0), the derived module data stays CC BY-SA, with attribution. Code is separate and stays ours.
  - *Rich modules*: official or public JSON APIs that return profile fields (GitHub, GitLab, Reddit `about.json`, Hacker News, dev.to, Keybase, Gravatar, Chess.com, Lichess, Mastodon WebFinger, …). `metadata` = `{ avatar, display_name, bio, followers, joined, url, … }`.
  - *Domain modules*: RDAP (WHOIS), DNS over HTTPS (A, AAAA, MX, NS, TXT, CNAME), MX→mail provider.
  - *Email modules*: Gravatar profile, GitHub commit/user search by email, PGP keyserver (keys.openpgp.org), MX/disposable check. The part before the @ is emitted as a **derived lead** (`type: 'lead'`, low confidence) with a one-click username search.
- **Outcome** = `hit` (with results) | `absent` (a recognised not-found signal) | `inconclusive` (blocked, captcha, timeout, unparseable) | `error`. A blocked or timed-out source is never counted as absent.
- **Fan-out:** `search-start` charges via `start_search()`, sets `modules_total`, splits modules into batches of about 60, and fires one `search-batch` call per batch (fire-and-forget fetch with a service token). Each batch runs checks at concurrency 16 with an 8 s timeout per check and calls `record_module()` per module. When the last module is recorded, the run is completed by `finish_run`. If every batch errors, the run fails and the credits are refunded. The cron reaper refunds any run stuck past 10 min.
- **Premium:** extra username modules that are slower (multi-step official APIs, longer timeouts). No CAPTCHA solving, no browser automation.
- **Health:** each module has a positive fixture (a known account) and a negative one (a random string). A daily GitHub Action runs them and writes to `module_health`. Modules marked `broken` are skipped and listed as excluded from coverage.

## Schema

Tables: 13 (`users, plans, billing_accounts, credit_ledger, stripe_events, api_keys, search_runs, search_results, module_statuses, module_health, cases, case_items, rate_limits`). Access rules: **RLS**. Users can select their own rows and write only `cases` / `case_items`. Everything that touches credits or results goes through security definer functions (`start_search`, `finish_run`, `record_module`, `hit_rate_limit`) that only the service role can execute.

The original's "Profiles" are called **Cases** here. A Case is a folder of saved findings. "Profile" stays the word for a found account, so the two don't get mixed up.

See `supabase/migrations/20261009000000_init.sql`. Hard constraints:
- Credits are charged under a `for update` row lock in `start_search`. Two tabs searching at once can't overspend.
- A duplicate batch delivery can't double-record. `module_statuses (run_id, module)` is the PK, and `record_module` returns early on conflict.
- A refund can happen only once. `finish_run` only changes runs that are still `running`.
- Stripe webhooks are idempotent: `stripe_events.id` PK, and `credit_ledger.stripe_event_id` unique.
- No duplicate saves. Unique index on `(case_id, source, value)`.

## API

### Web app (browser → Supabase directly, RLS)

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `select search_runs` | history list | owner | limit, cursor | runs | F06 |
| `select search_results where run_id` + realtime subscribe | results, live | owner | run_id | rows | F02 |
| `select/insert/update/delete cases, case_items` | Cases | owner | | | F05 |
| `select billing_accounts, plans` | credit meter, plan | owner | | | F09 |
| `select api_keys` | key list | owner | | | F08 |

### Edge Functions

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| POST `/functions/v1/search-start` | validate, rate-limit, charge, create run, fan out | signed-in (JWT) | `{type, query, premium}` | `{run_id}` / 400 invalid_request / 402 insufficient_credits / 403 plan_required / 429 | F01–F04 |
| POST `/functions/v1/search-batch` | run a batch of modules | internal (service token) | `{run_id, modules[]}` | 202 | F02 |
| POST `/functions/v1/lookup` | single-platform tool | signed-in (free account) | `{platform: github\|reddit, handle}` | profile JSON | F07 |
| POST `/functions/v1/billing/checkout` | Stripe Checkout session | signed-in | `{plan}` | `{url}` | F01, F09 |
| POST `/functions/v1/billing/portal` | Customer Portal session | signed-in | | `{url}` | F09 |
| POST `/functions/v1/api-keys` | create key (returned once) | signed-in, Pro | `{name}` | `{key, prefix}` | F08 |
| DELETE `/functions/v1/api-keys/:id` | revoke | owner | | 204 | F08 |
| POST `/functions/v1/stripe-webhook` | subscription + payment events | Stripe (signature) | event | 200 | F09 |

### Public API (`api.<domain>/v1`, Bearer or X-API-Key, Pro)

| method path | does | input | output |
| --- | --- | --- | --- |
| POST `/v1/searches` | start; `wait` (≤30 s inline), `stream` (SSE) | `{type, query, premium?, wait?, stream?}` | `{run_id,status}` / inline results / SSE |
| GET `/v1/searches/:id` | status + results + progress | | run object |
| GET `/v1/searches/:id/stream` | SSE tail; replays if terminal | | SSE |
| GET `/v1/searches?limit=` | recent runs (metadata) | limit 1–100 | list |
| GET `/v1/credits` | balances | | credits object |
| GET `/v1/me` | key check, plan, limits | | me object |
| GET `/v1/health` | liveness + DB ping (public) | | health |
| GET `/v1/capabilities` | machine-readable contract (public) | | capabilities |
| GET `/openapi.json` | OpenAPI 3 | | spec |

SSE frames: `run`, `result`, `progress`, `done`, `reconnect` (deadline only; the run continues), `error`. Errors: `{error, message}` with 400/401/402/403/429.

Webhooks in: Stripe `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid` (→ reset `credits_used = 0`, set period, `credits_allowed = plan.monthly_credits`), `invoice.payment_failed` (→ past_due). Top-up payments: `checkout.session.completed` with `mode=payment` → `api_credits += n`.
Webhooks out: none.
Jobs: `purge-results` hourly (findings older than 6 h). `purge-history` daily (runs older than 90 d, old rate-limit windows). `reap-stuck-runs` every 5 min (fail + refund after 10 min). `module-health` daily as a GitHub Action.

Only official/public endpoints of the platforms being checked, with our own keys (GitHub token, Reddit app). Never Opsis's endpoints.

## The parts that bite

- **Time zones:** everything is stored in UTC. The UI shows local time. The credit period comes from Stripe's `current_period_*`, not computed by us.
- **Idempotency:** Stripe sends events twice, so `stripe_events` PK is the guard. Batches can retry, so `record_module` is guarded by the PK. `finish_run` only changes a run once.
- **Races:** two concurrent searches against the last credit are serialised by the `for update` lock. Completing a run when the last module lands: the `record_module` row lock serialises it, and the batch that sees `modules_completed = modules_total` calls `finish_run`.
- **Rate limits (ours):** 120 searches/min per API key and 10/min per web user, via `hit_rate_limit`.
- **Rate limits (theirs):** platforms throttle cloud IPs, and Supabase's egress IPs are shared. These show up as `inconclusive`, never `absent`. GitHub and Reddit use authenticated official APIs with our tokens. Back off per host and spread checks across hosts.
- **Serverless limits:** about 60 modules per batch keeps each call well under 2 s CPU and 150 s wall clock. The SSE endpoint closes at 140 s with a `reconnect` frame.
- **Realtime limits (free):** 200 concurrent connections and 2M messages/mo. One channel per open results page, unsubscribed on leave.
- **Abuse:** a person-search tool can be misused. Terms require lawful, authorised use. Account required. Per-user rate limits. No private data: no CAPTCHA bypass, no reset-endpoint probing. Searches are logged for 90 days.
- **GDPR:** no suppression form (user decision, 2026-10-09). Findings auto-purge at 6 h. Account deletion cascades through `users`. A simple opt-out is recommended before public launch.
- **Free-tier pausing:** Supabase pauses free projects after a week of inactivity. Noted for `deploy.md`.

## Build order

1. **Vertical slice:** S05 sign-in → S06 username search → S07 live results with about 20 rich + data modules. Tables `users, billing_accounts, plans, search_runs, search_results, module_statuses`. Functions `search-start`, `search-batch`. During the slice, plan checks are bypassed for a seeded dev user with credits.
2. **Must-haves:** email + domain modules, coverage summary, no-match list, history (S08), purge jobs, Cases (S09, S10), plans + Stripe + credit states (S04, S11), landing page (S01).
3. **Should-haves:** premium modules, filters, health fixtures + Action, API keys (S12), public API v1 + OpenAPI + reference (S15), GitHub/Reddit tools (S16, S17), legal pages, product pages, docs hub.
4. **Could-haves:** API top-ups + fallback (S13), Instagram snapshot, timezone inference, AI analysis, guides, status dot, CSV/JSON export.
5. **Fixes from replica-entrepreneur:** after stage 8.
