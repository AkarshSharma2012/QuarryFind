# Recon map: Opsis (web)

Scope: whole product: multi-source email / username / domain search with streamed results, saved Profiles, single-platform lookup tools, plans and credits, and a public API. Per the user: no FAQ page and no suppression ("Remove my data") request system.
For: the user's own product, to sell (commercial).
Date: 2026-10-09

**Clean-room note.** Opsis's Terms say users "may not copy, reproduce, reverse engineer, or create derivative works based on any part of the Service". So this recon used **public pages only**: no account, no sign-in, no network capture, no JS bundles. The clone rebuilds a generic product category (username/email/domain OSINT, as in the open-source Sherlock, Maigret and WhatsMyName) with original code, design and copy.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing home | https://useopsis.com/ | positioning, coverage counts, comparison table, pricing, result-card example |
| 2 | product page | https://useopsis.com/products/osint-platform | 3-step workflow, standard vs premium credits |
| 3 | API reference | https://useopsis.com/docs/api | full data model: runs, results, SSE frames, credits, errors, limits |
| 4 | docs hub | https://useopsis.com/docs | API keys page exists (Pro+) |
| 5 | FAQ | https://useopsis.com/faq | retention: results purged within hours, history 90 days; Profiles |
| 6 | methodology | https://useopsis.com/resources/methodology | hit / absence / inconclusive semantics, positive+negative fixtures |
| 7 | free tools | https://useopsis.com/resources/tools | GitHub, Reddit, Instagram single-platform tools, gating |
| 8 | GitHub / Reddit / Instagram lookup | /github-lookup, /reddit-lookup, /instagram-lookup | input + "Analyze", feature promises |
| 9 | sign-in | https://useopsis.com/sign-in | GitHub, Google, email+password (hosted auth widget) |
| 10 | terms | https://useopsis.com/terms | anti-reverse-engineering clause → public sources only |
| 11 | guides | /resources/guides/* | SEO content: username, email OSINT, reverse email lookup |

## Core loop

Paste an email, username or domain → watch hundreds of source modules resolve live → review verified profile cards (avatar, name, bio, stats, link) and save the useful ones to a Profile. Searches spend monthly credits.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Landing | `/` | pitch, demo result card, coverage, comparison, pricing, tool links | top nav, hero, profile card, stat tiles, comparison table, pricing cards, footer | filled (dark theme) |
| S02 | Product: platform | `/products/osint-platform` | workflow explainer | step list, feature blocks, CTA | filled |
| S03 | Product: API | `/products/osint-api` | API pitch | code block, CTA | inferred |
| S04 | Pricing | `/#pricing` section | 3 plans | pricing card, "most popular" badge | filled |
| S05 | Sign in / Sign up | `/sign-in`, `/sign-up` | auth | OAuth buttons, email+password form | default, redirect_url param |
| S06 | Search (new) | `/search` (auth required) | choose type, enter query, standard/premium toggle | segmented control, input, toggle, credit badge | inferred: empty, validation error, no credits, plan required |
| S07 | Search run / results | `/search/:runId` (guess) | live stream of hits + progress | progress bar, counters, result cards, "checked, no match" list, filter by category, coverage summary | inferred: running, completed, partial coverage, failed, zero hits |
| S08 | Search history | dashboard (guess `/history`) | past runs, 90-day retention | table, status pill | inferred: empty, filled |
| S09 | Profiles list | dashboard | saved investigation folders | list, create button | inferred: empty, filled |
| S10 | Profile detail | dashboard | saved findings, notes, delete | result cards, notes, delete | inferred |
| S11 | Billing / plan | dashboard | plan, credits used/left, period end, Stripe portal | credit meter, plan card | inferred |
| S12 | API keys | dashboard (`/docs` links "Manage your keys") | create / revoke keys, shown once | table, modal with one-time secret | inferred: plan-gated, empty, filled |
| S13 | API settings / top-ups | dashboard | prepaid API credits, subscription fallback toggle, slider | slider, toggle, buy button | inferred |
| S14 | Docs hub | `/docs` | links to reference, keys, support | cards | filled |
| S15 | API reference | `/docs/api` | full reference | headings, tables, code blocks | filled |
| S16 | GitHub lookup | `/github-lookup` | single-platform deep profile | prefixed input (@), Analyze, profile panel, repos, languages, activity heatmap | input state; results inferred |
| S17 | Reddit lookup | `/reddit-lookup` | karma, communities, activity times | prefixed input (u/), stats, community list, hour histogram | input state |
| S18 | Instagram lookup | `/instagram-lookup` | public profile snapshot | prefixed input, profile card | input state, anonymous preview |
| S19 | Resources / guides | `/resources`, `/resources/guides/*`, `/resources/methodology` | SEO content + evidence methodology | article layout | filled |
| S20 | Legal | `/terms`, `/privacy` | legal | article | filled |
| S21 | About | `/about` | company | article | filled |

## Flows

```
F01 Visitor signs up and runs a first username search
    S01 -> S05 -> (choose plan S04 / Stripe checkout) -> S06 -> S07
    happy path clicks: ~6 (CTA, OAuth, plan, pay, type query, search)
    edge: no subscription (multi-source search needs one), OAuth cancel

F02 Subscriber runs an email search and watches results stream
    S06 (type=email) -> S07 running -> S07 completed
    happy path clicks: 2
    edge: invalid email (400), out of credits (402-equivalent), sources blocked/timeouts (inconclusive, not negative), zero hits, run outlives tab (resume by run id)

F03 Premium username search
    S06 (toggle premium, 2 credits) -> S07
    edge: plan below Basic -> plan_required before any charge; premium ignored for email/domain

F04 Domain search
    S06 (type=domain) -> S07 with WHOIS, DNS records, reverse-WHOIS sections
    edge: unregistered domain, WHOIS redacted (privacy proxy)

F05 Save a finding to a Profile
    S07 -> "save" on a result card -> pick/create Profile -> S10
    edge: results auto-purged after hours, so saving is the only way to keep them

F06 Re-open a past search
    S08 -> S07 (if results not yet purged) else "expired, re-run" CTA

F07 Free single-platform lookup
    S16|S17|S18 -> type handle -> Analyze -> profile panel
    edge: not signed in (GitHub/Reddit need a free account; Instagram gives a limited anonymous preview), handle not found, upstream rate limit

F08 Developer gets an API key and runs a search over the API
    S11 (Pro) -> S12 create key (shown once) -> POST /v1/searches stream=true
    edge: lost key -> create new; insufficient API credits -> 402; rate limit 429

F09 Upgrade / manage subscription
    S11 -> Stripe checkout / customer portal -> back to S11
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary (light on dark), secondary (outline), ghost, link | default, hover, focus, disabled, loading | all |
| Top nav | marketing (dropdowns: Products, Resources), app (signed in) | scrolled, mobile drawer | all |
| Badge / pill | info ("700+ sources · real-time"), status (Verified/Match), plan ("Most popular") | | S01, S04, S07 |
| Search type switch | email / username / domain | selected, disabled | S06 |
| Prefixed input | @, u/, none | empty, focus, invalid, loading | S06, S16–S18 |
| Toggle | premium, subscription fallback | on, off, disabled (plan-gated) | S06, S13 |
| Result / profile card | rich (avatar, name, handle, bio, stats), existence-only, derived lead | match, verified, low confidence | S01, S07, S10 |
| Progress bar + counters | modules completed/total, hits | running, done, partial | S07 |
| "Checked, no match" chip list | | | S01, S07 |
| Stat tile | | | S01, S16, S17 |
| Comparison table | | | S01 |
| Pricing card | default, featured | | S04 |
| Credit meter | | low, empty | S06, S11 |
| Data table | history, keys | empty, loading, filled | S08, S12 |
| Modal | one-time secret, confirm delete, save to profile | | S07, S12, S10 |
| Toast | success, error | | app |
| Code block | curl, JSON, copy button | | S03, S15 |
| Accordion | FAQ-style | | S01 (homepage questions; no FAQ page per user) |
| Footer | | status dot "All systems operational" | marketing |

## Inferred data model

```
User         id, email, name, avatar_url, auth_provider, created_at
             evidence: S05 (GitHub, Google, email)   confidence: high

Subscription user_id, tier (free|starter|basic|pro), status, period_start, period_end,
             credits_allowed, credits_used, stripe_customer_id, stripe_subscription_id
             evidence: API /v1/credits, pricing   confidence: high

ApiCredits   user_id, prepaid_balance, use_subscription_fallback (bool)
             evidence: API docs "Credits"   confidence: high

ApiKey       id, user_id, name, prefix, hash, created_at, last_used_at, revoked_at
             evidence: docs "shown once", Bearer opsis_live_...   confidence: high (fields: medium)

SearchRun    id (uuid), user_id, type (email|username|domain), query, premium (bool),
             status (running|completed|failed), credits_charged, modules_total,
             modules_completed, modules_with_hits, modules_failed, created_at, completed_at,
             via (web|api)
             evidence: GET /v1/searches/{run_id}   confidence: high

SearchResult id (sequential per run), run_id, type (account|profile|...), platform, value,
             confidence 0..1, source (module name), metadata jsonb, created_at
             evidence: Result Object   confidence: high
             retention: purged hours after creation (FAQ)

ModuleStatus run_id, module, outcome (hit|absent|inconclusive|error), latency_ms
             evidence: progress frame "named module_status", methodology page   confidence: medium

Module       name, platform, category (social|dev|gaming|crypto|...), search_types[],
             premium (bool), health (ok|degraded|broken), last_fixture_check_at
             evidence: coverage section, methodology fixtures   confidence: medium

Profile      id, user_id, name, notes, created_at
ProfileItem  id, profile_id, snapshot of SearchResult (platform, value, metadata), note, saved_at
             evidence: FAQ "Profiles" persist beyond purge   confidence: medium (it must snapshot, since results get purged)

CreditLedger id, user_id, delta, reason (search|premium_search|refund|topup|reset), run_id, created_at
             evidence: credit behaviour (1 vs 2, refunds not charged on plan_required)   confidence: guess
```

Relationships: User 1-1 Subscription, User 1-1 ApiCredits, User 1-n ApiKey, User 1-n SearchRun, SearchRun 1-n SearchResult, SearchRun 1-n ModuleStatus, Module 1-n ModuleStatus, User 1-n Profile, Profile 1-n ProfileItem.

## Feature matrix

See `features.csv`. Must: 22, should: 14, could: 7, skip: 9.

## Out of scope (cannot or should not be cloned)

- **Opsis's maintained 700+ module library.** The clone ships its own, smaller set of modules written from scratch, using public profile endpoints and official APIs. Open-source lists such as the WhatsMyName dataset (CC BY-SA) can seed username checks, with attribution.
- **"Solver-backed" premium platforms.** These rely on solving CAPTCHAs or browser automation to get past bot protection. The clone will not do that, so "premium" becomes a set of slower checks done through official APIs.
- **Email-to-account checks that abuse sign-up or password-reset endpoints**, and **Instagram "recovery hints"** (partial contact details leaked by the reset flow). These expose private data, and sites forbid using their endpoints this way. Email search sticks to public signals: Gravatar, GitHub commit search, public PGP keyservers, MX/domain checks, and the part of the email before the @ treated as a username candidate.
- **GitHub "secret scanner" for other people's repos.** Collecting other people's leaked keys is out of scope.
- **Reddit "deleted / removed comments".** These came from archives that are no longer publicly available (Pushshift).
- **FAQ page and suppression request system.** Removed at the user's request. Recommended before launch anyway: a GDPR Art. 21 opt-out (see notes in features.csv).
- **"As seen on" listings, the brand, and copy.** These belong to Opsis.

## Size

Screens 21 (about 9 of them app screens), flows 9, entities 10. Hard parts:
1. The module engine: hundreds of concurrent checks, each needing its own logic to tell found / not found / inconclusive, with test fixtures and health tracking.
2. Live streaming (SSE) of results with resumable runs, inside serverless limits (a run takes about 60–90 s and streams are capped at about 180 s).
3. Credits and billing: Stripe subscriptions, a monthly reset, credits charged exactly once, refunds when a run fails, and the API prepaid balance with optional fallback to subscription credits.

Also: purging results after a few hours, rate limits and abuse prevention.
Size: **L**. The core loop with about 50 modules is M; reaching 300+ modules is ongoing maintenance.
