# Deploy: QuarryFind

Status: **preflight passed; waiting for the user's go and accounts.** Nothing is live yet.

## 1. Preflight (2026-10-09)

| check | result |
| --- | --- |
| Production build (`next build`, static export) | ✅ 40 static routes |
| End-to-end (Playwright, desktop + mobile, axe, console/5xx guard) | ✅ **49 / 49** |
| Unit + RLS + backend integration (Vitest) | ✅ **47 / 47** |
| Parity (`parity.py`) | ✅ **99.4 / 100**, must-haves 19 / 19 |
| Open S1 / S2 bugs | ✅ none (8 found, all fixed; `bugs.md`) |
| Rebrand sweep (`sweep.py`) | ✅ clean |
| Store listing (`listing.py`) | ✅ 0 errors (2 warnings: "OSINT" is an acronym) |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities (root and web; postcss overridden to ^8.5.23) |
| Privacy + terms pages | ✅ live; processors listed; marked draft for legal review |
| Cookie banner | ✅ not needed: no tracking or advertising cookies |
| Account deletion | ✅ works (e2e + `tests/rls.test.ts` cascade) |
| Favicon, titles, OG image | ✅ ours (`icon.svg`, `apple-icon.png`, `opengraph-image.png`) |

Raw output: `replica/preflight.log`.

## 2. What the user creates (free accounts; Claude never signs in or pays)

1. **Supabase** (supabase.com, free plan): create a project named `quarryfind` in the region nearest your users, and keep the database password somewhere safe. Send Claude the **project ref** (in the URL `supabase.com/dashboard/project/<ref>`). Then run `npx supabase login` in a terminal yourself; it opens a browser.
2. **Cloudflare** (free): an account for Pages and DNS.
3. **Domain.** `quarryfind.com` is unregistered (Verisign, 2026-10-09). Buying it costs about $10–15 a year and needs your OK. A free alternative is the GitHub Student Pack's free year of a `.me` (Namecheap) or `.tech` domain; claim it yourself and note the renewal price in year two. A trademark screen before buying is recommended (`brand.md`).
4. **Resend** (free): for sign-up confirmation emails from your domain.
5. Optional: a **GitHub OAuth app** (Settings → Developer settings → OAuth Apps) and **Google OAuth client** for "Continue with GitHub/Google". The callback URL is `https://<ref>.supabase.co/auth/v1/callback`.
6. Optional: **Sentry** via the Student Pack, and a free **UptimeRobot** account.

## 3. What Claude runs once the project is linked

```bash
npx supabase link --project-ref <ref>
```

```bash
npx supabase db push
```

```bash
npx supabase functions deploy
```

```bash
npx supabase secrets set ALLOWED_ORIGINS=https://<domain> INTERNAL_SECRET=<random 48 hex> GITHUB_TOKEN=<optional, no scopes>
```

Then in the Supabase dashboard (the user clicks, Claude gives exact values):
- **Auth → URL configuration:** Site URL `https://<domain>`; redirect URLs `https://<domain>/**`.
- **Auth → SMTP:** Resend host `smtp.resend.com`, port 465, user `resend`, password = Resend API key (the user pastes it).
- **Auth → Providers:** GitHub / Google client id and secret (the user pastes them).
- **Database → Backups:** daily backups are included on the free plan; check they're listed.

## 4. Host: Cloudflare Pages

Connect the GitHub repo `AkarshSharma2012/OsintSet`, production branch `main`. Pull requests get preview URLs.

| setting | value |
| --- | --- |
| Root directory | `web` |
| Build command | `npm ci && npm run build` |
| Output directory | `out` |
| Env: `NODE_VERSION` | `24` |
| Env: `NEXT_PUBLIC_BACKEND` | `supabase` |
| Env: `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| Env: `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon key (public by design) |
| Env: `NEXT_PUBLIC_SITE_URL` | `https://<domain>` |
| Env: `NEXT_PUBLIC_API_BASE` | `https://<ref>.supabase.co/functions/v1` |

Add the custom domain in Pages, using the apex as canonical, with `www` redirecting to it. HTTPS is automatic.

## 5. DNS (domain on Cloudflare)

Point the registrar's nameservers at the two Cloudflare nameservers shown when you add the site.

| type | name | value | why |
| --- | --- | --- | --- |
| CNAME | `@` | `<project>.pages.dev` (Cloudflare flattens it at the apex) | site |
| CNAME | `www` | `<project>.pages.dev` | redirected to apex by a Pages redirect rule |
| MX / TXT / CNAME | as shown in Resend → Domains (usually `send` MX + SPF TXT, and `resend._domainkey` DKIM) | copy exactly | email deliverability |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@<domain>` | start in report-only, then `p=quarantine` after 2–4 weeks of clean reports |

## 6. Repo secrets (daily source health)

Under GitHub → Settings → Secrets → Actions, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (the user pastes it; never commit it)
- `FIXTURES_GITHUB_TOKEN` (optional)

Then run the **Module health** workflow once by hand.

## 7. Watch it

- Uptime: UptimeRobot on `https://<domain>/` and `https://<ref>.supabase.co/functions/v1/v1/health`, alerting your email.
- Analytics: Cloudflare Web Analytics (free, no cookies).
- Errors: Sentry DSN, to wire in after the account exists (not yet in code).
- Smoke test after deploy: sign up, run a domain search and a username search, save to a case, create and revoke an API key, report a result, delete the test account. Claude runs this on the live site; you repeat it on your phone.

## Free-tier limits to remember

- **Supabase free projects pause after 7 days without activity.** Real traffic or the daily health Action prevents that.
- **Edge Functions: 500k invocations a month,** about 22k username searches. The Supabase usage page shows it.
- **Supabase database: 500 MB.** Findings purge at 6 h, so this is far away.
- **Domain:** if it's from the Student Pack, the renewal in year 2 is at the normal price. Perks end when student status does.
- **First hosted check:** measure batch time and CPU on 10 real searches. Locally, workers cold-compile on every request, so hosted should be faster.

## First week

- Daily: check the health Action result and `/sources`, and fix or switch off drifted sources.
- Read `result_reports` (in the Supabase table editor).
- Watch Edge Function invocations and errors in Supabase logs.
