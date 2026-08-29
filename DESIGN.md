# Koupa design

Quiet paper, teal moments.

Koupa is an Arabic-first Android booking app. Working screens sit on off-white paper (`#F3F5F7`) with charcoal text (`#323E4B`). Deep teal (`#1A7A78`) is reserved for a few moments: the Home greeting, Today, scan, and booking confirmation. Warm gold (`#E1A553`) stays a thin accent, never a large fill.

## Surfaces

- **Paper** is the default page header and canvas for Find, Appointments, Schedule, Shop, Profile, and auth interiors.
- **Teal stage** is a moment surface only. It has no decorative orbs, no left-parked logo lockup, and no gold dash under a watermark.
- Cards float on paper because the content needs a surface, not because every screen needs a hero slab.

## Type and layout

- IBM Plex Sans Arabic. RTL. Initials instead of photos.
- One primary action on a first view. Secondary actions sit behind overflow.
- Find is a one-column directory. Nearby is visible. A `0.0` rating is not shown as a score.
- Booking is date (calendar), then slots, then a recap of service, day, time, and price.

## Brand mark

`BrandLogo` is the single source of truth: the full artwork (`assets/brand/logo-512.png`, symbol plus the كوپا wordmark) flattened to teal. Every header uses it untampered. Screens do not re-typeset the brand name next to it, and no screen shows the raw multi-colour artwork.

## Onboarding

Intro, welcome, and role-intro stay on paper. Teal appears only as ink: the lockup, the payoff word, the primary action, and the customer door. The opening statement is stacked display type, not a feature list, because a list invites comparison and a stack invites reading.

The two role doors are deliberately unequal. The customer door carries the weight and shows a real booking preview built from the shipping `Card` and `Chip`; the barber door is a quiet row under one hairline. Two identical cards would read as a feature grid instead of a choice.

No step counters, no `01/02/03` markers, no decorative status dots, and no per-row hairlines. At most one card per screen, and only where it previews real UI. All onboarding copy lives in `src/i18n/ar.ts`, never inline.

## Motion

150–250 ms state changes only. No page-load choreography on operational screens, and none in the funnel after intro: press feedback is opacity, not movement.

**One exception, by decision:** the intro screen's brand lockup. It is the subject of that screen rather than furniture, so it enters once on mount with a 520 ms fade and a scale that overshoots about three percent and settles, and the three beats rise 180 ms behind it as a single group. Nothing else on the screen moves. `src/utils/motion.ts` owns the gate: it never runs under Jest, and it settles to the final frame when the OS requests reduced motion.
