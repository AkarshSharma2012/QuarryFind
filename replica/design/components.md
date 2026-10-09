# Components

Code: `web/src/components/ui/`. Showcase: `/design`. Icons: Lucide (ISC). Font: Geist + Geist Mono (OFL). No assets from the original.
All colours come from tokens (`bg-surface`, `text-muted`, …). No raw hex in components.

```
Button
  variants  primary (light on dark), secondary (outline), ghost, danger, accent
  sizes     sm 32px, md 40px, lg 48px
  states    default, hover, active, focus-visible (2px focus ring), disabled, loading (spinner + label kept, aria-busy)
  tokens    primary: bg primary / text on-primary; radius md; text sm/500
  a11y      real <button> (or <a> via `href`), visible focus, disabled not focusable
  used on   all

Badge
  variants  neutral, accent, success (match/verified), warning (inconclusive), danger (error), outline
  sizes     sm 20px
  states    static
  tokens    text xs/500, radius pill, tinted bg = colour at 14%
  a11y      text label, never colour alone
  used on   S01, S04, S07, S08, S12

Input
  variants  plain, prefixed (@ / u/), with trailing button
  sizes     md 40px, lg 52px (search hero)
  states    empty, focus, filled, invalid (danger border + message via aria-describedby), disabled
  tokens    bg surface, border border-input, radius md
  a11y      <label> always (visually hidden allowed), error linked by aria-describedby, aria-invalid
  used on   S05, S06, S16–S18, S10

SegmentedControl (search type: email / username / domain)
  states    selected, hover, focus-visible, disabled
  a11y      role=radiogroup, arrow keys move selection, each option role=radio aria-checked
  used on   S06

Switch (premium, subscription fallback)
  states    on, off, disabled (plan-gated with reason in tooltip text below)
  a11y      <button role=switch aria-checked>, label clickable
  used on   S06, S13

Card / Surface
  variants  default (surface + border), raised (surface-2), interactive (hover border)
  tokens    radius lg, shadow card, padding 16/24
  used on   all app screens

ResultCard (a found account)
  variants  rich (avatar, display name, handle, bio, stats), existence-only (platform + link), lead (derived, dashed border)
  states    default, saved (bookmark filled), saving (loading), low-confidence (warning badge)
  parts     platform label, confidence badge, avatar (img with initials fallback), up to 3 stat tiles, "Open source" link (rel=noopener noreferrer, target _blank), Save button
  a11y      <article> with heading = platform + handle, link text says where it goes
  used on   S01, S07, S10

ProgressBar + RunCounters
  states    running (animated), completed, partial (warning text: N sources unavailable), failed
  a11y      role=progressbar aria-valuenow/max, live region announces "N found" at most every 5 s
  used on   S07

CheckedList (no match / unavailable)
  variants  absent (muted), inconclusive (warning dot, tooltip-free text reason)
  used on   S07

StatTile
  parts     value (lg/600), label (xs muted)
  used on   S01, S07, S16, S17, S11

CreditMeter
  states    normal, low (≤ 20%, warning), empty (danger + upgrade CTA)
  a11y      role=meter with aria-valuenow/min/max, text "12 of 75 left"
  used on   app header, S06, S11

PricingCard
  variants  default, featured (accent border + badge)
  used on   S01/S04, S11

DataTable
  states    loading (skeleton rows), empty (message + CTA), filled
  a11y      real <table>, <th scope>, row actions are buttons with labels
  used on   S08, S12

Dialog
  variants  confirm (danger), form (save to case, create key), secret (one-time key with copy)
  a11y      native <dialog> with showModal(): focus trap + Esc + inert background, labelled by its title, focus returns to opener
  used on   S07, S10, S12

Toast
  variants  success, error, info
  a11y      role=status (aria-live polite), error uses role=alert, auto-dismiss 5 s, pause on hover
  used on   app

CodeBlock
  parts     language label, copy button (announces "Copied")
  tokens    font mono, bg surface-2
  used on   S03, S15, S12

EmptyState
  parts     icon, title, one sentence, optional action
  used on   S07 (no hits), S08, S09, S12

Nav
  variants  marketing (logo, links, sign in, primary CTA), app (logo, Search, History, Cases, Tools, credit meter, account menu)
  states    mobile: links collapse to a disclosure menu (button aria-expanded)
  used on   all

Footer
  marketing only; product, resources, company, legal columns
```

Not built (out of scope): FAQ accordion page, suppression form.
