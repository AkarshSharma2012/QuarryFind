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

### BUG-004: Result card's "+N more" was a lone `<dd>` (invalid definition list)

- Severity: S4 (accessibility markup)
- Flow / case: F05 / F05-H1 (axe `definition-list`)
- Screen: S07, S10
- Build: bb09500  Browser / device: Chromium, 1440px

Steps
1. Run a domain search whose DNS record has more than 8 rows; open the card (or save it to a case and open the case).
2. Run axe.

Expected: valid `<dl>` (only dt/dd groups).
Actual: a `<dd>` without a `<dt>` ("+N more in export"); axe flags it as serious.
Status: fixed in 6d4bc2a (moved out of the list into a `<p>`)

### BUG-005: Session revoked elsewhere: app still looks signed in, every action fails

- Severity: S3
- Flow / case: F01 / F01-E5
- Screen: S06 (any app screen)
- Build: bb09500  Browser / device: Chromium, 1440px

Steps
1. Sign in on two devices (or tabs with separate storage).
2. On one, sign out (Supabase signs out every session by default).
3. On the other, start a search.

Expected: you're told the session ended and see the sign-in prompt.
Actual: the nav still shows your email; the search fails with "Sign in to search." and there's no way back except signing out manually.
Evidence: e2e F04-H1 failure screenshot (signed-in nav + "Sign in to search.").
Status: fixed in 6d4bc2a (a 401 from an Edge Function clears the local session); guarded by e2e F01-E5 (written first and seen failing)

### BUG-006: Searches hang when a batch is killed by the Edge Function CPU limit

- Severity: S2 (core flow incomplete; the run sat at "Checking sources…" until a 10-minute reaper)
- Flow / case: F01 / F01-H2
- Screen: S07
- Build: 6d4bc2a  Browser / device: Chromium, 1440px; local Supabase edge runtime

Steps
1. Run a username search (302 sources, batches of 60).

Expected: the run completes; every source is counted.
Actual: stuck at 269/302. The edge-runtime log shows "CPU time hard limit reached" and "early termination", so the killed batches never recorded their remaining modules.
Evidence: e2e F01-H2 screenshot; `docker logs supabase_edge_runtime_osintset`.
Suspected cause: 60 modules per invocation, each reading up to 500 KB of HTML, exceeds the 2 s CPU limit (production has the same limit).
Status: fixed in 54fc50c:
1. `sweep_stuck_runs()` (pg_cron every minute) closes runs older than 3 minutes. Unreported sources count as "didn't answer". Test written first (tests/rls.test.ts) and seen failing.
2. Batches of 25.
3. Body reads are streamed and stop as soon as the marker is found (cap 600 KB). All 310 module fixtures were re-run: 305 ok; the rest are site drift or timeouts, which the health job handles.

**BUG-006 follow-up (root cause).** The sweep and smaller batches weren't enough. `search-start` held every batch request open, so its own termination cancelled them; background `waitUntil` work also doesn't run in one-request-per-worker mode. Final design in 3e1c2b0..HEAD:
1. **Client-driven batches.** The results page calls `search-batch` for each slice (4 in parallel, 15 sources each). Each batch is an ordinary request with its own 2 s CPU budget and answers when done.
2. **Retry and resume.** The page retries failed batches with backoff, then asks for "remaining" sources until none are left. Reopening a half-finished search resumes it.
3. **The API drives its own runs** in wait/stream mode.
4. **Light imports.** `search-start` and `v1` load only a small manifest, not the engine.

Verified: torvalds, 302/302 in 62 s with 9 sources that didn't answer; e2e F01-H2 green.

### BUG-007: Scrollable code blocks not reachable by keyboard

- Severity: S4 (accessibility, axe `scrollable-region-focusable`)
- Flow / case: X-1 (mobile)
- Screen: S01, S15
- Build: 54fc50c  Browser / device: Pixel 7 emulation

Steps
1. Open / or /docs/api/ at phone width.
2. Tab through the page.

Expected: horizontally scrollable code blocks can be focused and scrolled with the keyboard.
Actual: `<pre>` overflowed but couldn't take focus.
Status: fixed (tabIndex=0 + aria-label on scrollable `<pre>`); X-1 green on desktop and mobile

### BUG-008: Scrollable tables not keyboard-reachable on phones

- Severity: S4 (axe `scrollable-region-focusable`), found by mobile X-1 on /sources/
- Status: fixed (every horizontally scrolling table container is a focusable, labelled region)

## Test-design issues found (not product bugs)

- Concurrent Playwright runs (an earlier background run still going) shared users and output folders and clobbered each other. Only one run at a time from now on.
- The auth spec's "sign out" revoked every session of the user the search spec reused. Each role now has its own user.

- One test user ran more than 10 searches a minute and hit the product's own rate limit. Now each spec uses its own user.
- Signing in through the form in every test tripped Auth's rate limit. Now there's one API sign-in per user in global setup, stored as Playwright storage state.
- Running against `next dev` aborted navigations on hot reload. Tests now run against the static production build.
- With a custom `distDir`, Next writes the static export into that directory, not `out/`. The e2e server now serves `web/.next-build`.

## To check (not reproduced)

- Supabase Kong answered a CORS preflight with `access-control-allow-origin: *` locally. Confirm production sends only the configured origins.

## Summary (2026-10-09)

- Playwright: **46/46 passing** (desktop + mobile), with a console/5xx guard and axe on every screen.
- Vitest: unit 33 + RLS 8 + backend integration 6, all passing.
- Bugs: 7 found. S1: 0 · S2: 2 (BUG-003, BUG-006) · S3: 3 (BUG-001, BUG-002, BUG-005) · S4: 2 (BUG-004, BUG-007). **All fixed; no open S1/S2.**
- Manual still to do at deploy: confirmation email delivery (production SMTP), GitHub/Google OAuth with your OAuth apps, hosted-runtime timing.
