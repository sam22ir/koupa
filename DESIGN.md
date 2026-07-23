# Koupa Official Brand System

## Non-Negotiable Brand Asset

Use the supplied official Koupa logo from `assets/koupa-logo.png` in implementation. It is a teal barber head and scissors mark with a gold accent and the Koupa wordmark. Do not draw, replace, reinterpret, or generate a different logo. Stitch screens reserve a centered brand-mark position on splash and a compact brand-mark position in onboarding headers; Expo uses the exact PNG.

## Exact Palette

- Dark Teal `#1A7A78`: all primary buttons, active selections, focus state, navigation selection, and brand-mark teal.
- Warm Gold `#E1A553`: the only secondary accent; use only for small highlights, selected time/rating emphasis, and brand-mark gold.
- Charcoal Gray `#323E4B`: all primary typography and quiet icons.
- Off-White `#F3F5F7`: main screen canvas.
- White `#FFFFFF`: elevated input and content surfaces.

No substitute palette. No gradients. No purple, blue, neon, pure black, decorative imagery, stock photos, or user photos.

## App Direction

Arabic-first, RTL Android appointment booking for barbers. The experience is calm, precise, and practical. IBM Plex Sans Arabic is used for Arabic and Latin labels. Text hierarchy uses Bold for headings, SemiBold for controls, and Regular for body copy. Arabic uses relaxed line-height and zero negative tracking.

## Components And Layout

- Primary controls: solid Dark Teal, white text, 12px corners, 48dp height.
- Inputs: labels above fields, white/off-white fill, teal focus state, inline errors.
- Role selection: two large panels for Customer and Barber, selected state in Dark Teal.
- Onboarding: compact numbered progress step and clear Arabic title.
- Customer Home empty state: exact logo position, concise prompt, single `Find a Barber` action.
- Use 16-24dp side padding, 44dp minimum touch targets, scrollable safe areas, simple tonal hierarchy, and no nested cards or dense borders.
