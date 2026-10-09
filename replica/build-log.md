# Build log

Data layer: `web/src/lib/data/local.ts` (real engine via `scripts/dev-api.ts`, session/cases/keys in localStorage). replica-backend swaps in Supabase behind the same `DataLayer` interface.

| ID | screen | date | status | missing / notes |
| --- | --- | --- | --- | --- |
| S01 | Landing `/` | 2026-10-09 | done | Spec-sheet layout, real source list from `sources.json`, product shot. No pricing (free). |
| S02 | Product page | 2026-10-09 | merged | Folded into landing + `/how-it-works/`. |
| S03 | API pitch | 2026-10-09 | merged | `/docs/` hub + landing API section. |
| S04 | Pricing | — | skip | Product is free. |
| S05 | Sign in / up | 2026-10-09 | partial | UI done (GitHub, Google, email). Real auth arrives with Supabase. |
| S06 | New search `/search/` | 2026-10-09 | done | Type switch, validation, deep toggle, sign-in gate. |
| S07 | Results `/search/run/?id=` | 2026-10-09 | done | Live stream, progress, coverage, filters, sort, cards/table, save, CSV/JSON, leads, expired state. |
| S08 | History `/history/` | 2026-10-09 | done | Purge relies on backend jobs. |
| S09 | Cases `/cases/` | 2026-10-09 | done | |
| S10 | Case `/cases/view/?id=` | 2026-10-09 | done | Rename, notes (autosave), remove item, export, delete. |
| S11 | Billing | — | skip | Free. Replaced by `/settings/` (account, keys, delete account). |
| S12 | API keys | 2026-10-09 | partial | Key hashing and storage in backend. |
| S13 | API top-ups | — | skip | Free. |
| S14 | Docs hub `/docs/` | 2026-10-09 | done | |
| S15 | API reference `/docs/api/` | 2026-10-09 | done | Documents the v1 contract the backend must implement. |
| S16 | GitHub tool | 2026-10-09 | done | + commit identities, activity chart, timezone guess. |
| S17 | Reddit tool | 2026-10-09 | done | Reddit blocks many datacenter IPs → shows "didn't answer". |
| S18 | Instagram tool | — | not built | No reliable public access without abusing private endpoints. |
| S19 | Methodology `/how-it-works/` | 2026-10-09 | done | Guides not written. |
| S20 | Terms, privacy | 2026-10-09 | done | Drafts, need legal review. |
| S21 | About | 2026-10-09 | done | |
| new | Tools hub + 13 extra tools | 2026-10-09 | done | IP, DNS, WHOIS, subdomains, mail security, wayback, headers, EXIF, variations, dorks, phone, email headers, hashes. |

Harder than expected:
- **Bot walls answer HTTP 200.** Last.fm and PyPI served a "Client Challenge" page for both real and fake users, so every username would look "found". Added global challenge detection: these count as *didn't answer*. Dropped 10 sources that couldn't be checked honestly from here.
- **Cloud egress.** Fixture results are from a home connection; Supabase's datacenter IPs will be blocked more often (Reddit already 403s). The daily health job has to run from the same place as production.
- **Free-tier limits.** Cloudflare Workers Free (10 ms CPU, 50 subrequests) can't run the engine; it moved to Supabase Edge Functions.

Checks: `npx vitest run` 27 passing · `npm run fixtures` 47/49 ok (2 honestly inconclusive) · `next build` 35 static routes · `tsc` + `eslint` clean · no horizontal scroll at 390 px on any page checked.
