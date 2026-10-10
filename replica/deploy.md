# Deploy: QuarryFind

Status: **site live on GitHub Pages** at https://akarshsharma2012.github.io/OsintSet/ (user's go: "launch it on a github.io domain", 2026-10-09). The in-browser tools work now; search and accounts switch on once the Supabase project exists (§2–3).

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
2. **Hosting:** GitHub Pages, already on (no account needed). A custom domain is optional later; `quarryfind.com` was unregistered on 2026-10-09 and buying one needs your OK.
3. **Resend** (free, optional until you have a domain): for branded sign-up emails. Without it Supabase's built-in mailer works but is rate-limited to a few emails an hour.
4. Optional: a **GitHub OAuth app** (Settings → Developer settings → OAuth Apps) and **Google OAuth client** for "Continue with GitHub/Google". The callback URL is `https://<ref>.supabase.co/auth/v1/callback`.
5. Optional: **Sentry** via the Student Pack, and a free **UptimeRobot** account.

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
npx supabase secrets set ALLOWED_ORIGINS=https://akarshsharma2012.github.io INTERNAL_SECRET=<random 48 hex> GITHUB_TOKEN=<optional, no scopes>
```

Then in the Supabase dashboard (the user clicks, Claude gives exact values):
- **Auth → URL configuration:** Site URL `https://akarshsharma2012.github.io/OsintSet/`; redirect URLs `https://akarshsharma2012.github.io/OsintSet/**`.
- **Auth → SMTP:** Resend host `smtp.resend.com`, port 465, user `resend`, password = Resend API key (the user pastes it).
- **Auth → Providers:** GitHub / Google client id and secret (the user pastes them).
- **Database → Backups:** daily backups are included on the free plan; check they're listed.

## 4. Host: GitHub Pages

`.github/workflows/pages.yml` builds `web` on every push to `main` that touches `web/**`, with `NEXT_PUBLIC_BASE_PATH=/OsintSet`, and deploys `web/out`. Pages is enabled with `build_type: workflow`.

To connect the backend, add these **repository variables** (Settings → Secrets and variables → Actions → Variables; they are public by design, not secrets), then re-run the workflow:

| variable | value |
| --- | --- |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | the project's anon key |

The workflow derives `NEXT_PUBLIC_BACKEND=supabase` and `NEXT_PUBLIC_API_BASE` from them. Without them the site says search isn't connected yet, and the in-browser tools still work.

## 5. Domain (later, optional)

Add a `CNAME` record for the domain pointing at `akarshsharma2012.github.io`, set the custom domain under Settings → Pages, then change `NEXT_PUBLIC_BASE_PATH` to empty in the workflow and update `ALLOWED_ORIGINS` and the Supabase Auth URLs.

## 6. Repo secrets (daily source health)

Under GitHub → Settings → Secrets → Actions, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (the user pastes it; never commit it)
- `FIXTURES_GITHUB_TOKEN` (optional)

Then run the **Module health** workflow once by hand.

## 7. Watch it

- Uptime: UptimeRobot on `https://akarshsharma2012.github.io/OsintSet/` and `https://<ref>.supabase.co/functions/v1/v1/health`, alerting your email.
- Analytics: none yet (GitHub Pages has no built-in analytics; a cookie-free one can be added later).
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
