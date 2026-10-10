# Brand: QuarryFind

Chosen by the user on 2026-10-09 from a screened shortlist. Angle (from `fixes.md`): **verified, free, no install.**

## Name

"Quarry" is the thing you're tracking down, and "Find" is the job. It doesn't share sound, look or meaning with the original. Sight and vision words were avoided on purpose, because the original's name means "sight".

| check | result | date |
| --- | --- | --- |
| quarryfind.com | **unregistered** (Verisign .com RDAP: 404) | 2026-10-09 |
| GitHub handle `quarryfind` | **free** (GitHub API: 404) | 2026-10-09 |
| web, "QuarryFind" / "Quarry Find" + software or OSINT | no product found | 2026-10-09 |
| US trademark (USPTO, classes 9 and 42) | **to run** | — |
| EU trademark (EUIPO / TMview) | **to run** | — |
| Canada (CIPO) | **to run** | — |
| WIPO Global Brand Database | **to run** | — |
| App Store / Google Play | **to run** (web app for now) | — |
| X, Instagram, TikTok handles | **to run** | — |

These are screening checks, not legal clearance. Have a trademark lawyer search before spending money on the name.

Rejected along the way: ClearTrail (an existing surveillance-tech company), Traceproof (close to TracePro, an optics software brand), SourceTally (shares "Tally" with established brands). Every `.com` on the first shortlist was taken.

## Palette

Same token roles as replica-design. Only values changed (`replica/design/tokens.json`, then `node scripts/tokens.mjs`):

| role | value | note |
| --- | --- | --- |
| accent / focus | `#4fd1c5` mineral teal | was periwinkle `#8ea2ff`, too close to the original's blue accent |
| on-accent | `#0b1413` | |
| success | `#9bd65c` leaf green | moved away from teal so "strong" and "likely" never look alike |
| everything else | unchanged neutral dark scale | |

Contrast: `contrast.py`, 20 pairs, **0 AA failures**.

## Logo brief

- **Idea:** a pickaxe whose head forms a check mark. You dig, and what you find is verified.
- **Mark:** a symbol plus the wordmark "QuarryFind" in Geist SemiBold, tight tracking. The symbol must stand alone as the icon.
- **Must work at:** 16px favicon (two strokes, no fine detail) and a 1024px app icon.
- **Deliverables:** SVG (symbol, wordmark, lockup), 1024×1024 app icon with no transparency, favicon set (16/32/180/192/512), 1200×630 social image.
- **Must not resemble the original's mark** (a rounded square with an eye-like glyph). No eye, lens or radar shapes, and no white-on-black rounded square. Check side by side.
- **Interim:** Lucide `Pickaxe` icon in teal (`web/src/components/shell.tsx`) until the real mark exists.

## Voice

Three words, and what each doesn't mean:
- **Plain**, not dumbed down.
- **Exact**, not legalistic.
- **Calm**, not cold.

| do | don't |
| --- | --- |
| "Didn't answer" | "Error!!" or "Not found" for a timeout |
| "A match is a lead, not proof" | "Uncover anyone's secrets" |
| "Free. No plans, no credits." | "Unlimited power!" |
| "Keep this page open until it finishes." | "Please do not navigate away from this page." |
| Say what happened and what to do next | Blame the user |

The most-seen strings are already in this voice: sign-up ("Create your free account / No card, no trial. Every feature is free."), the search button ("Search"), progress ("Checking sources…"), completion ("Search complete" with partial-coverage text), errors ("Too many sign-in attempts. Wait a few minutes and try again."), empty states ("No searches yet / Run a search and it shows up here for 90 days."), save ("Saved to case"), report ("Thanks. The source will be re-checked."), and the revoked session ("Your session ended. Sign in again to continue.").

## Sweep

`sweep.py . --config replica/brand.json`: **clean** (2026-10-09). The original's name and domains don't appear anywhere outside `replica/`. Page titles, the footer and the README were checked by eye after the rename.
