# Launch plan

## Before launch

- [ ] Deploy (replica-deploy): Cloudflare Pages + Supabase project. The user creates both accounts (free).
- [ ] Error tracking: Sentry via the GitHub Student Pack (user claims the offer). Add the DSN to the site and functions.
- [ ] Privacy-friendly analytics: Cloudflare Web Analytics (free, no cookies), so no consent banner is needed.
- [ ] Module health Action live (repo secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIXTURES_GITHUB_TOKEN`).
- [ ] Hosted performance check: run 10 username searches on the real Supabase project and record batch CPU and time in `deploy.md`.
- [ ] Waitlist: none needed. It's free, so sign-up *is* the list.
- [ ] Trademark screening for "QuarryFind" (USPTO / EUIPO / WIPO), marked "to run" in `brand.md`.
- [ ] Legal pages reviewed (terms and privacy are drafts); list Supabase, Cloudflare and Resend as processors.

## Where the users are

From the research: people who file false-positive and "not working" issues on Sherlock, Maigret and WhatsMyName, and OSINT communities. Don't post in those projects' issue trackers; that's spam. Instead:
- **Show HN.** "Show HN: QuarryFind – free username/email/domain OSINT where every source is tested daily". Lead with the fixture-checked status page and "why this counts", not the feature list.
- **OSINT communities** where self-promotion is allowed (check each one's rules first): r/OSINT, OSINT newsletters, the OSINT Curious and Trace Labs communities.
- **Directories:** CybersecTools, Cyber Vendor Guide, AlternativeTo (category "OSINT"), and awesome-osint lists via pull request.
- **Contributing back:** WhatsMyName fixes. Our daily fixtures find drifted checks, and sending upstream PRs is honest and earns credibility (CC BY-SA requires share-alike anyway).

## The first 10 users to talk to by hand

Journalists and researchers who teach OSINT, small trust-and-safety teams, and CTF/Trace Labs participants. Ask each one:
1. What do you check first?
2. Where did a tool mislead you?
3. What did you do when a source didn't answer?

## After launch

- Weekly: read the reports per source (`result_reports`) and fix or switch off drifting modules.
- Monthly: check Supabase usage against the free limits (see `pricing.md`).
- Monthly: re-import WhatsMyName (`scripts/wmn-import.ts`); only sources that pass fixtures get in.
