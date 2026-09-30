# Koupa visual design

## Direction

**Koupa Teal.** Every color comes from the logo: the teal `#1A7A78` and its white. Screens are light paper with white cards; a bold teal header opens the few screens that greet the user or run their day. The result should feel modern, calm and quick to scan, made for booking a haircut in a few taps.

Koupa is Arabic-first and designed for Android phones. Keep screens easy to scan, comfortable to tap, and natural to read from right to left.

Tokens live in `src/theme/*` (TypeScript) and `global.css` (HeroUI variables). Change both together. Direction metadata is `designDirection` in `src/theme/index.ts`.

## Color

### Scales

| Step | Teal (brand) | Ink (neutrals, teal-tinted) |
|---|---|---|
| 50 | `#EDF7F6` | `#F4F7F7` |
| 100 | `#D3EEEC` | `#E7EDED` |
| 200 | `#A9DCD9` | `#D6DFDF` |
| 300 | `#74C3BF` | `#B9C5C5` |
| 400 | `#3FA6A2` | `#8D9C9C` |
| 500 | `#238D8A` | `#5F6E6E` |
| 600 | **`#1A7A78` (logo)** | `#4B5959` |
| 700 | `#156563` | `#354242` |
| 800 | `#11504F` | `#232F2F` |
| 900 | `#0D3D3C` | `#152121` |

Amber (`#F2B53A`, soft `#FEF4E2`, text `#8A5605`) is the only warm accent. Green (`#14774A` on `#E8F6EE`) and red (`#B5302A` on `#FDEEEC`) are for status only.

### Roles (`colors.*`)

| Use | Token | Value |
|---|---|---|
| Page background | `background` | Ink 50 `#F4F7F7` |
| Cards, fields, sheets | `surface` | White |
| Main text | `text` | Ink 900 `#152121` |
| Secondary text | `textMuted` | Ink 500 `#5F6E6E` |
| Borders | `border` | Ink 200 `#D6DFDF` |
| Brand, main actions | `primary` | Teal 600 `#1A7A78` |
| Pressed | `primaryPressed` | Teal 700 `#156563` |
| Soft teal fill / its text | `primarySoft` / `primarySoftText` | Teal 50 / Teal 700 |
| Ratings, highlights | `accent`, `accentSoft`, `accentText` | Amber |
| Confirmed / present | `success`, `successSoft` | Green |
| Pending / waiting | `warning`, `warningSoft` | Amber |
| Cancelled / errors | `danger`, `dangerSoft`, `dangerBorder` | Red |
| Modal backdrops | `scrim`, `scrimStrong` | Ink 950 at 48% / 72% |

Rules:

- Status never reuses the brand teal. A "confirmed" badge is green, not teal, so it cannot be mistaken for a button.
- Amber is for star ratings and small "new" or "popular" marks. Never a large fill or a button.
- Every text/background pair must pass WCAG AA (4.5:1). The pairs above do. Do not use color alone to show an error, choice, or status; pair it with a label or icon.
- No hard-coded hex or rgba in screens or components. Add a token instead.

## Type and language

- Use **IBM Plex Sans Arabic** throughout the app.
- Put Arabic content in right-to-left order and align Arabic headings and copy to the right.
- Keep Arabic UI copy in `src/i18n/ar.ts`; do not write it directly inside screen components.
- Always spell the Arabic brand name **كوپا**, using the Persian letter `پ`.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 30 / 42 | Bold | Header greetings |
| `title` | 24 / 34 | Bold | Screen titles |
| `titleSm` | 18 / 28 | SemiBold | Section headings |
| `body` | 15 / 24 | Regular | Running text |
| `bodyStrong` | 15 / 24 | SemiBold | Names, key values |
| `label` | 13 / 20 | Medium | Field labels, small headings |
| `caption` | 12 / 18 | Regular | Supporting details |
| `numeric` | 15 / 22 | Bold, tabular | Times, prices, counts |

Always keep the line height from the token; Arabic marks need the room.

## Shape, depth and spacing

- **Corners (`radii`)**: 14 for buttons, fields and icon buttons (`md`); 18 for cards (`lg`); 24 for sheets and dialogs (`2xl`); 28 for the teal header's bottom corners (`3xl`); pill for chips and badges. Avatars are rounded squares with corners about one third of their size.
- **Depth (`elevation`)**: flat surfaces use a 1px `border`. `card` is the default raised surface. `float` is for content lifted over the teal header, sticky bars and sheets. Shadows are soft and teal-tinted; never stack them.
- **Spacing (`space`)**: 4px steps. Screen padding is 20; card padding is 16 to 18; gaps between sections are 16 to 24.
- Use one main column on phone screens. Do not put a card inside another card without a clear need.
- Use initials instead of profile photos in the MVP.

## Components

| Component | Treatment |
|---|---|
| `Button` | 52px tall, 14px corners, SemiBold label. `primary` solid teal; `secondary` soft teal; `outline` white with hairline; `ghost` text only; `danger` soft red for the first tap; `dangerSolid` for the final confirmation. One primary button per view. |
| `Field` | 52px tall, 14px corners, 1px ink border, teal border on focus, red border and message on error. Label above, optional marked "(اختياري)". |
| `Chip` | Pill, 36px tall. Idle: white with hairline. Selected: solid ink with white text. `accent` tone for amber highlights. |
| Status badge | Pill with a dot and a word: green confirmed, amber pending, red cancelled, soft teal "now". |
| `Card` | White, 18px corners, `card` shadow. |
| `Avatar` | Initials on soft teal (or translucent white on the teal header). |
| `ErrorBanner` | Soft red, red hairline, icon plus message that says how to fix it. |
| `EmptyState` | Soft teal icon tile, short title, one line, at most one action. |
| `Stage` | The bold teal header with 28px bottom corners. |

## Where teal belongs

Paper is the default for Find, Appointments, Schedule, Shop, Profile, and account screens. Teal is used there as brand ink: the logo, selected actions, the active tab, and small icons.

The **bold teal header** opens: the Home greeting, Today, Scan, booking confirmation, the Account screens, Welcome, and every account-entry screen (`AuthShell`: sign in, sign up, password, setup, legal). On Home the next-appointment card floats over the header's lower edge with `float` elevation. Keep headers simple: greeting, one line, search or a summary. A single soft white glow is allowed; no orbs, patterns, parked logos, or gold dashes.

## Main screen patterns

### Welcome and account setup

- Show the intro once on the first app launch, then continue to the role chooser. Returning signed-out users go straight to role choice. Existing users can sign in from the intro or the role chooser.
- Keep the intro choice on the device. Do not let it replace account-confirmation routes or erase a saved booking link; restore that link after sign-in as usual.
- Show customer and barber choices as matching, full-width cards. They must look equally available while idle. Use a brief press or hover response only after interaction.
- Explain the role choice plainly. Do not use warning badges or pretend that one option is already selected.
- Do not invent appointment counts, shop names, prices, or booking times for a preview.
- Use the shared `AuthShell` for sign-up, sign-in and setup screens: teal header with logo, back or step count and title, then the form on one white sheet whose rounded top overlaps the header. Keep forms in one column and add no further cards inside the sheet.
- Keep required Terms and Privacy consent visible. Make email sign-up the main action and Google sign-up secondary.
- Keep customer name and phone prominent during profile setup; make city clearly optional.
- Show the barber setup step count because its five stages need orientation.
- Use one `finish-account` screen for every unfinished-account state (missing role or consent, updated Terms, a failed consent save). Show only what is missing: role cards only when no role was chosen, the checkbox only when consent is needed, and a plain retry when only the save failed.

### Find and booking

- Show Find as a one-column directory. Keep nearby choices easy to find.
- Do not show a `0.0` rating as if it were a meaningful score.
- Booking follows this order: choose a date, choose a time, then review the service, date, time, and price.
- Make the next step clear without showing multiple competing main actions.

### Shop and daily work

- Keep operational screens focused on the task in front of the user.
- Use cards only when they separate useful real information. Avoid decorative counters, status dots, and hairlines on every row.
- Keep secondary actions quiet or behind an overflow menu when they are not needed right away.

### Account (both roles)

- Open with the teal `AccountHeader`: screen name, initials, name, email and phone, and a role badge. Barbers also see whether customers can find them, in words.
- Below it, grouped `SettingsGroup` / `SettingsRow` lists: Account, Help and privacy, Session. Rows have an icon tile, a label, and a chevron (or an external-link mark when they leave the app).
- Customers edit their name in a bottom sheet; the contact phone is shown read-only.
- Barbers get "ملفي كما يراه الزبائن" once published, which opens their public profile and returns to Account.
- Account deletion sits alone in a red-outlined danger card at the end, followed by the logo and app version.

## Brand mark

`BrandLogo` is the single source for the approved scissors / K and KOUPA lockup in `assets/brand/logo-lockup-white.png`. Tint this same logo mask for light and teal backgrounds. Use the approved lockup in app icons, the splash screen, and in-app headers. Do not replace it with a symbol-only mark or separately typed logo.

## Motion and feedback

Timing tokens live in `motion` (`src/theme/motion.ts`).

- Keep normal state changes quick: 120 ms press, 180 to 240 ms for most transitions.
- Pressed buttons and cards scale to 0.98 or dim slightly; do not make controls jump or shift.
- Do not add entrance choreography to operational screens or the account flow.
- Respect the device's reduced-motion setting.
- The splash is a brief brand moment of its own, separate from the intro below: the native splash image hands off to `AnimatedSplash` (`src/startup/AnimatedSplash.tsx`), which pulses the logo once, ripples two rings and fades away in about a second. It never delays a screen users work in, and with reduced motion it only fades.
- The intro logo animation is the one planned exception: a single 520 ms fade with a very small scale settle, followed by the three intro lines as one group. Nothing else on that screen moves.

## Avoid

- Teal headers on screens that are not one of the four approved screens.
- Amber fills, amber buttons, or amber text on white.
- Teal used for success or status.
- Hard-coded colors, radii or shadows in screens.
- Unequal resting styles for customer and barber choices.
- Made-up examples presented as real shop or booking data.
- Decorative counters, `01/02/03` markers, and unnecessary row dividers.
- Extra motion that distracts from choosing a role, finding a barber, or booking an appointment.
