# Backend

Supabase (Postgres + Auth + Realtime + Edge Functions + pg_cron). No payments: the product is free.

## Pieces

| piece | where | status |
| --- | --- | --- |
| Schema, RLS, jobs | `supabase/migrations/2026100900*.sql` | written; **not yet applied** (Docker engine not running) |
| search-start / search-batch | `supabase/functions/search-*` | written |
| tools (server tools, 30/min per IP) | `supabase/functions/tools` | written |
| api-keys (sha256-hashed, shown once, max 10) | `supabase/functions/api-keys` | written |
| account deletion (cascades from auth.users) | `supabase/functions/account` | written |
| Public API v1 + OpenAPI | `supabase/functions/v1` | written |
| Web data layer | `web/src/lib/data/supabase.ts` (`NEXT_PUBLIC_BACKEND=supabase`) | written, typechecks |
| RLS second-user test | `tests/rls.test.ts` | written; runs once Supabase is up |
| Module health job | GitHub Action (daily `npm run fixtures` → `module_health`) | to do |

## Auth

- Email + password with confirmation (production SMTP via Resend), password reset via Supabase.
- GitHub and Google OAuth: **you** create the OAuth apps (GitHub → Settings → Developer settings → OAuth Apps; Google Cloud → Credentials) and paste the client id/secret into Supabase. Google sign-in only needs the basic `openid email profile` scopes, so there's no long verification process.
- Sessions: Supabase JS stores the session in localStorage (static site, no server cookies). PKCE flow. "Sign out everywhere" = `signOut({ scope: "global" })` (to add in settings).
- Account deletion deletes the auth user; every table cascades. Tested in `tests/rls.test.ts`.

## Jobs (pg_cron, UTC)

- `purge-results` hourly at :07: findings older than 6 h.
- `purge-history` daily at 03:17: runs older than 90 days, old rate-limit rows.
- `reap-stuck-runs` every 5 min: runs stuck in `running` for over 10 min are marked failed.

## Security checklist

- [x] secrets only in env vars; `.env*` ignored (`.env.example` committed, no values)
- [x] input validated on the server: `normalise()` per type, tool input checks, JSON body guards
- [x] authorisation: RLS on every table; engine functions revoked from anon/authenticated; second-user test written
- [x] rate limits: 10 searches/min web, 60/min API, 3 concurrent, 30 tool calls/min (abuse protection, not paywall)
- [ ] rate limits on auth sign-up: Supabase built-in limits; review in dashboard before launch
- [x] webhooks: none (no payments)
- [x] uploads: none server-side (EXIF tool runs in the browser)
- [x] SSRF: headers tool resolves the host and refuses private ranges (redirects still followed; Supabase's network has no internal services of ours)
- [x] no user data in URLs: queries go in POST bodies; run ids in URLs are random UUIDs
- [ ] `npm audit`: run before launch
- [x] privacy policy lists processing; add Supabase, Cloudflare, Resend by name before launch
