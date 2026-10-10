# Bugs

Severity: S1 data loss / security / core flow blocked · S2 feature broken, no workaround · S3 broken with workaround or visibly wrong · S4 cosmetic.

### BUG-001: Rate-limited sign-in says "Email or password is wrong"

- Severity: S3
- Flow / case: F01 / F01-N1
- Screen: S05
- Build: 18e08c0  Browser / device: Chromium (Playwright), 1440px

Steps
1. Sign in successfully many times in a few minutes (local Auth limit: 30 per 5 min per IP).
2. Sign in again with the correct password.

Expected: a message that says to wait, because it's a rate limit.
Actual: "Email or password is wrong." The user would assume the wrong password and might reset it for nothing.
Evidence: e2e run 1: F05/F08 sign-ins stayed on /sign-in/; GoTrue returned 429.
Suspected cause: `supabase.ts` mapped every sign-in error that wasn't about confirmation to "wrong password".
Status: fixed in 6381f5b (`signInMessage()`, tests/auth-errors.test.ts)

### BUG-002: Inline links only distinguishable by colour

- Severity: S3 (accessibility, WCAG 1.4.1)
- Flow / case: F08 / F08-H1 (axe `link-in-text-block`)
- Screen: S12 API keys (also any `<p>` with an inline link)
- Build: 18e08c0  Browser / device: Chromium, 1440px

Steps
1. Open /settings/api-keys/.
2. Run axe.

Expected: links inside text are underlined (or otherwise not colour-only).
Actual: "API reference" link only differs by colour, so axe flags it as serious.
Evidence: e2e run 1, keys spec: `link-in-text-block: .hover\:underline`
Status: fixed in 6381f5b (global underline rule for links inside running text)

### BUG-003: Realtime drops events during a burst; final counts didn't add up

- Severity: S2 (results silently incomplete)
- Flow / case: F02 / F02-E7
- Screen: S07
- Build: 8187637  Browser / device: Chromium, 1440px

Steps
1. Run a username search (302 sources) and watch it live.

Expected: found + no match + unavailable = sources checked.
Actual: 15 + 212 + 5 = 232 of 302; 70 events never arrived (reloading showed 24 / 272 / 6).
Evidence: browser check during the backend stage; the database had all 302 rows.
Status: fixed in c76c03d (re-sync from the database every 5 s while running and on completion); guarded by e2e F01-H2

## Test-design issues found (not product bugs)

- One test user ran more than 10 searches a minute and hit the product's own rate limit. Now each spec uses its own user.
- Signing in through the form in every test tripped Auth's rate limit. Now there's one API sign-in per user in global setup, stored as Playwright storage state.
- Running against `next dev` aborted navigations on hot reload. Tests now run against the static production build.
- With a custom `distDir`, Next writes the static export into that directory, not `out/`. The e2e server now serves `web/.next-build`.

## To check (not reproduced)

- Supabase Kong answered a CORS preflight with `access-control-allow-origin: *` locally. Confirm production sends only the configured origins.
