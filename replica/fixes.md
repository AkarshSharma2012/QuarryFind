# Fixes and positioning

## Sample, read this first

- **Opsis itself has no public user reviews.** Checked 2026-10-09: Hacker News (Algolia API) has no mentions; trustpilot.com/review/useopsis.com doesn't exist; the [CybersecTools listing](https://cybersectools.com/tools/opsis-osint) invites its first review; a web search found no Reddit threads; the [Cyber Vendor Guide listing](https://www.cybervendorguide.com/tools/opsis-osint) is an editorial write-up with no user reviews and no cons. Reddit can't be opened from this environment.
- So this is **category evidence**: public user feedback on the tools Opsis itself compares against (Sherlock, Maigret, WhatsMyName), plus a few Hacker News comments. In total **104 items from 4 sources**, all verbatim and linked in `reviews.csv`, collected through the official GitHub search API and the HN Algolia API.
- **Bias:** the GitHub queries searched for "false positive", "not working", "feature" and "error", so complaint themes are over-represented by construction. Counts show *that* a problem recurs, not *how common* it is among all users. No star ratings exist in this sample.

## 1. What they hate

1. **False positives: "found" when the account doesn't exist.** 41 items, 3 sources (Sherlock, Maigret, WhatsMyName). For example "[MANYVIDS False Positive.](https://github.com/WebBreacher/WhatsMyName/issues/892)", and "[It has false positive apparently they changed the url to view users and the user format changed.](https://github.com/WebBreacher/WhatsMyName/issues/946)"
2. **Install trouble, errors, crashes.** 13 items, 2 sources. For example "[Issue in Installing (Fix From Ticket #2534 Did Not Work).](https://github.com/soxoj/maigret/issues/2657)", and "[data.json returns a 404 error.](https://github.com/sherlock-project/sherlock/issues/2479)"
3. **Checks go stale and sites break.** 10 items, 3 sources. For example "[Out of 729, 276 returned an "expected" result, 409 failed somehow and 47 timed out.](https://github.com/WebBreacher/WhatsMyName/issues/1017)", and "[Instagram not working.](https://github.com/sherlock-project/sherlock/issues/2755)"
4. **Rate limits and proxies.** 4 items, 2 sources (thin-ish). For example "[--proxy: socks5:// and socks5h:// each break one of the two HTTP clients.](https://github.com/soxoj/maigret/issues/2955)"
5. **Can't tell "skipped/timed out" from "not found".** 4 items, 3 sources. For example "[The consumer cannot distinguish "site was skipped because of protocol mismatch" from "site timed out"](https://github.com/soxoj/maigret/issues/2667)"
6. *(thin)* **Misses real accounts.** 2 items, 1 source. For example "[Username for Facebook shows not found although it exists.](https://github.com/sherlock-project/sherlock/issues/725)"

## 2. What's missing

1. **Search by email and other identifiers.** 7 items, 4 sources. For example "[Feature Request: Search by Email Address.](https://github.com/sherlock-project/sherlock/issues/2359)", and "[Adding a phone number search feature would be great, especially for dating apps.](https://github.com/soxoj/maigret/issues/2709)". *We have email; phone stays parse-only (no owner lookup) on purpose.*
2. **A hosted / REST interface.** "[Feature Request: REST API Interface for OSINT Searches.](https://github.com/soxoj/maigret/issues/2968)". *We have it.*
3. *(thin)* **Sort by how much data a result has.** "[Feature Request: sort by number of data points.](https://github.com/soxoj/maigret/issues/105)"
4. *(thin)* **Non-Latin names.** "[it would be great if Maigret could support Vietnamese names.](https://github.com/soxoj/maigret/issues/2872)"

## 3. What's unsolved (positioning)

1. *(thin: 3 comments, 1 source)* **Auditing your own footprint.** People use these tools on themselves to find forgotten accounts. For example "[Worth running on your own usernames as an easy account inventory](https://news.ycombinator.com/item?id=42509983)", and "[I didn't even remember most of these accounts. Can get rid of them if I want now.](https://news.ycombinator.com/item?id=26215811)". No tool is built for this job.
2. **Non-technical investigators.** CLI-only tools plus install errors (13 items) shut out journalists, HR and trust-and-safety people who can't run Python. Opsis solves this, but only behind a paywall from $14.99/month ([its pricing](https://useopsis.com/#pricing)).
3. **Trust in results.** Every tool in the sample is accused of false positives and stale checks; nobody shows users *why* a result counts as found.

## Fix plan

| # | fix | evidence | size | skill |
| --- | --- | --- | --- | --- |
| 1 | **"Why this counts" on every result.** Show the signal that matched (official API, profile marker, status code) and the confidence | false positives (41/3); can't tell skipped from absent (4/3) | S | replica-build |
| 2 | **Report a wrong result** button per finding. It feeds `module_health`, and a source with repeated reports is flagged for re-testing | false positives (41/3); stale checks (10/3) | M | replica-build + backend |
| 3 | **Public source status page** listing every source, its last fixture result and the date. Broken sources are shown as off, not silently wrong | stale checks (10/3); "409 failed somehow" | M | replica-build |
| 4 | **"Check my own accounts" mode.** A footprint-audit flow with a checklist of found accounts, mark "mine / not mine / deleted", and export | unsolved #1 (thin) | M | replica-build |
| 5 | **Sort by "most details"** | sort by data points (thin) | S | replica-build |
| 6 | **Batch: search several variations at once** (from the variations tool, up to 5) | wants identity regardless of exact username ([HN](https://news.ycombinator.com/item?id=42515400)) | M | replica-build + backend |

Pricing and paywall complaints go to replica-launch. We're free; that's the price story.

## Angle

1. **Trust.** For investigators who are tired of username tools that say "found" when nothing is there, OsintSet checks every source daily against a known account and a made-up one, and shows why each result counts. Evidence: false positives 41 items / 3 sources; stale checks 10 / 3.
2. **Access.** For people who can't run Python tools and won't pay $15+/month to search, OsintSet is hosted, has no install and is free, with the same engine via a free API. Evidence: install and errors 13 / 2; CLI-only; Opsis pricing.
3. **Self-audit.** For anyone who wants to find and close their own forgotten accounts, OsintSet is a footprint check you run on yourself. Evidence: thin, 3 comments / 1 source.

**Recommended: 1 + 2 combined. "Verified, free, no install."** It's grounded in the two strongest themes, it's true of the product today, and it doesn't depend on naming Opsis or Sherlock anywhere. Self-audit (3) becomes a secondary landing section and an ethical on-ramp, not the headline.
