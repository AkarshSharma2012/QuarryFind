# Parity: OsintSet vs Opsis

Date: 2026-10-09 · Tools: `parity.py` (features), `imgdiff.py` (layout), manual flow walk-through.

## Scores

| measure | score | note |
| --- | --- | --- |
| **Feature parity** | **98.2 / 100** | 33 features counted; **must-haves 19 / 19 done** |
| Layout, S01 landing (1440×900) | 24.9 "different" | Deliberate. Same macro structure (hero copy left, product panel right, sections below); different proportions, type, colour and content. That keeps us clear of Opsis's trade dress. Not chased. |
| Open bugs | S1 0 · S2 0 | 7 found and fixed in replica-test |

Left out on purpose (not scored): plans, credits and billing (you chose free and unlimited), reverse WHOIS (paid data only), Instagram snapshot and recovery hints, CAPTCHA-solver modules, reset-endpoint email probing, secret scanning of others' code, deleted Reddit comments, FAQ page and suppression form (your call), Opsis's own module library and brand.

## Missing, in build order

1. **[should] Module health in production.** The fixture runner and the daily GitHub Action are written; they go live when the repo secrets are set at deploy.
2. **[could] Guides.** The methodology page exists; the SEO guides (username OSINT, email OSINT, reverse email lookup) aren't written.
3. ~~[could] Status indicator~~: built (footer dot from `/v1/health`).

## Behaviour differences

| flow | Opsis does | OsintSet does | verdict |
| --- | --- | --- | --- |
| F01 first search | Start searching → sign in → **pick a paid plan** → search | Type in the hero box → create free account → results | **Keep.** No paywall, one fewer step |
| F01 sources | 700+ modules, 27 solver-backed premium | 320 sources (59 hand-written + 261 live-verified WhatsMyName) + deep mode | **Gap in breadth**; every source has positive and negative fixtures; no CAPTCHA solving |
| F02 results | Streamed list, profile details | Streamed cards **or table**, category filter, sort, CSV/JSON export, coverage summary, "didn't answer" separated from "no match" | **Keep**, ahead on transparency and export |
| F02 resume | API resumes by run id | Reopening a half-finished search resumes it in the browser; API wait/stream drive their own runs | Keep |
| F04 domain | WHOIS, DNS, reverse WHOIS (premium doc metadata) | WHOIS (RDAP), DNS, mail security (SPF/DMARC), subdomains (CT logs), Wayback, web stack/headers | **Keep**: wider free coverage, no reverse WHOIS |
| F05 saved findings | "Profiles" | "Cases" with notes, export, duplicate guard | Keep |
| F07 tools | GitHub, Reddit, Instagram (some paid AI/deep scans) | 15 free tools, 6 fully in-browser | **Keep**, well ahead |
| F08 API | Pro plan + prepaid credits | Free keys for every account; same contract shape (wait / stream / async), OpenAPI | Keep |
| Errors | Credit / plan errors | Rate-limit message, revoked-session recovery, partial-coverage explanation | Keep |

## Verdict

**Shippable.** All must-haves are done, feature score is 98.2 (needs 80+), and there are no open S1 or S2 bugs. To reach **better than the original**, take the fixes from replica-entrepreneur (next).

## Top five next

1. replica-entrepreneur: read Opsis users' public complaints and turn the real gaps into fixes.
2. More sources: run `wmn-import` periodically and add more API-backed rich modules (biggest gap vs 700+).
3. Guides for SEO (3 articles), original writing.
4. Module health live (repo secrets at deploy).
5. Hosted performance check: measure batch CPU on real Supabase before launch (local runtime cold-compiles every worker).
