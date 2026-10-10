# Test plan

Clone only. Never load-test Opsis. Automated: `npx playwright test` (needs `npx supabase start` + `.env.test.local`), `npx vitest run` (unit + RLS + backend integration).
Every Playwright test fails on any console error or 5xx from our origins, and key screens run an axe scan (WCAG 2.2 AA, serious/critical).

| case | what | how |
| --- | --- | --- |
| **F01 Sign up / sign in / first search** | | |
| F01-H1 | sign in, app nav shows, sign out returns home | e2e/auth |
| F01-H2 | username search across every source finishes; found + no match + unavailable = total | e2e/search |
| F01-E1 | signed-out search → sign-up with `next` keeping the query | e2e/public |
| F01-E2 | invalid input caught client-side | e2e/public |
| F01-E3 | `?next=` honoured after sign-in | e2e/auth |
| F01-E4 | `?next=` can't redirect off-site | e2e/auth |
| F01-N1 | wrong password → error, stays put | e2e/auth |
| F01-M1 | sign-up email confirmation arrives (production SMTP) | manual, at deploy |
| F01-M2 | GitHub / Google OAuth | manual, needs user's OAuth apps |
| **F02 Email search** | | |
| F02-H1 | email search: mail domain record + username lead button | e2e/search |
| F02-H2 | cards/table toggle; CSV export filename | e2e/search |
| F02-E5 | second user can't open first user's run (RLS) | e2e/search + tests/rls |
| F02-E6 | malformed run id → empty state | e2e/search |
| F02-E7 | Realtime drops events; final counts still add up | e2e/search (F01-H2 assertion) |
| F02-E8 | refresh mid-run reattaches and finishes | manual pass (browser) |
| **F03 Deep search** | toggle on → more sources | manual pass |
| **F04 Domain search** | | |
| F04-H1 | URL input normalised to the bare domain; DNS card; progress; axe | e2e/search |
| **F05 Cases** | | |
| F05-H1 | save → new case (accents, emoji, long name), notes autosave survive reload, remove, delete | e2e/cases |
| F05-E1 | saving twice doesn't duplicate | e2e/cases |
| F05-E2 | empty case name can't be created | e2e/cases |
| **F06 History** | | |
| F06-H1 | history lists the search and re-opens it | e2e/search |
| F06-E1 | expired results (purge job) show the expired state | tests: SQL purge + manual |
| **F07 Tools** | | |
| F07-H1 | DNS tool returns records; axe | e2e/keys-and-tools |
| F07-H2 | variations, hash identify, phone parser (browser-only) | e2e/keys-and-tools |
| F07-N1 | IP tool rejects garbage and private ranges | e2e/keys-and-tools |
| F07-E1 | GitHub tool needs an account | e2e/keys-and-tools |
| F07-S1 | headers tool refuses hosts resolving to private IPs (SSRF) | tests/engine |
| **F08 API** | | |
| F08-H1 | create key (shown once, hash-only storage), call /v1/me, revoke → 401 | e2e/keys-and-tools + tests/backend |
| F08-H2 | wait and stream modes | tests/backend |
| F08-N1 | 11th search in a minute → rate limited | tests/rls |
| **F09 Settings** | delete account needs typed confirmation; deletion cascades | e2e + tests/rls |
| **Cross-cutting** | | |
| X-1 | every public page: one h1, axe clean, no horizontal scroll at phone width | e2e/public (desktop + mobile) |
| X-2 | keyboard: skip link focuses main | e2e/public |
| X-3 | 404 page | e2e/public |
| X-4 | CSV export neutralises spreadsheet formulas | tests/client-tools |
| X-5 | bot-challenge pages never count as found | tests/engine |
