# Koupa Frontend Rebuild Plan

Status: `implemented_mvp` (2026-07-28) — full route tree + Teal Stage UI + hooks wiring; polish remaining  
Visual direction: **Teal Stage** (locked)  
Domain contract: [`FRONTEND-CONTRACT.md`](./FRONTEND-CONTRACT.md)  
Product rules: [`KOUPA-PRODUCT-SPEC.md`](./KOUPA-PRODUCT-SPEC.md)

## Goal

Ship a full Expo Router frontend on top of the existing hooks/services layer: Arabic-first RTL, Teal Stage UI, auth gates, customer + barber shells, booking, and account lifecycle. Design tokens and components are owned here; domain logic stays in `src/hooks/*` / `src/services/*`.

## Architecture

```
app/                         Expo Router routes (UI only)
  _layout.tsx                providers, RTL, session gate shell
  (auth)/*                   welcome, role, legal, sign-in/up, confirm, recovery
  (customer)/*               Home | Find | Appointments | Profile tabs
  (barber)/*                 Today | Schedule | Shop | Profile tabs
  onboarding/*               barber publish wizard
  barber/[id], shop/[id]     public profiles
  book/*, appointment/*      booking + appointment detail/reschedule
  scan, notifications, callback

src/components/ui/*          Teal Stage primitives
src/components/*             feature molecules
src/i18n/*                   Arabic dictionary (+ English keys ready)
src/theme/*                  tokens (done)
src/hooks/*                  thin adapters (existing)
src/services/*               Supabase (existing)
```

## Stages

| ID | Stage | Deliverable | Status |
|---|---|---|---|
| F0 | Tooling | expo-router, safe-area, screens, gesture-handler, path alias, scripts | **done** |
| F1 | Design system | Stage, Button, Card, Chip, Avatar, Field, Screen, Empty, Error | **done** (MVP primitives) |
| F2 | i18n + RTL | `t()`, `ar` dictionary, RTL force | **done** (some hard-coded AR labels remain in onboarding/schedule) |
| F3 | Session routing | Gate: loading → auth → confirm → setup/onboarding → role shell | **done** + unit tests |
| F4 | Auth screens | Welcome, role+legal, sign-in/up, confirm, forgot, Google, callback | **done** (collision UX = error banner; dedicated screen polish later) |
| F5 | Customer shell | Tabs + Home / Find / Appointments / Profile | **done** |
| F6 | Booking surfaces | Barber/shop profile, book/reschedule, rate, scan | **done** |
| F7 | Barber shell | Today / Schedule / Shop / Profile | **done** (schedule hours UI simplified; full day editor later) |
| F8 | Barber onboarding | 5-step wizard → publish | **done** |
| F9 | Cross-cutting | Notifications, delete account, support, push bootstrap | **done** |
| F10 | Hardening | typecheck + tests green; design-proposal boot removed | **done** MVP; device QA remaining |

## Screen inventory

### Auth
- Welcome (`إنشاء حساب` / `لدي حساب بالفعل`)
- Role select + Terms/Privacy acceptance (provisional metadata)
- Sign up: Google / email+password / phone+password (+ recovery email for phone)
- Sign in: same methods
- Confirm email / pending confirmation
- Forgot password → recovery email
- Auth callback route (PKCE outcomes)
- Google collision: must sign in with password first (no silent merge)

### Customer
- Home: next appointment **or** find CTA; actions cancel / reschedule / details / scan
- Find: Barbers | Shops search, pagination page size 20
- Barber profile: services, prices, hours, rating, book
- Shop profile: barbers list → book requires barber choice
- Book: service → date → slot → confirm
- Appointments list + detail
- Reschedule (same barber; service+time)
- Rate completed (1–5, edit 24h)
- QR scan check-in
- Profile: legal, support email, notifications, logout, delete account

### Barber
- Onboarding: Basic → Location → Services → Hours → Review & Publish
- Today: list, Present, cancel, permanent QR
- Schedule: hours, breaks, interval, window, notice, pause, services, exceptions entry
- Shop: create / join / invites / leave / delete; owner edits affiliated settings
- Profile: logout, legal, support, delete

## Gap review (pre-implementation)

| Gap | Risk | Mitigation |
|---|---|---|
| No router / nav deps | Cannot structure app | F0 install expo-router + peers |
| TS `@/*` may not resolve in Metro | Bundle failures on hooks | Enable Expo tsconfig paths / babel resolver; smoke import |
| Hooks return mixed error shapes (legacy strings vs codes) | Inconsistent UI | Map via small `formatError` helper; prefer codes in new UI |
| Profile creation path after signup | Auth without profile | Explicit create-profile step for customers; barber → onboarding |
| One active appointment | Confusing book failures | Surface `ACTIVE_APPOINTMENT` in Arabic on Home/Book |
| Independent vs shop barber search rules | Wrong Find results | Use contract: Find barbers = independent only; shop book = bookable |
| QR needs camera permission | Crash / blocked | `expo-camera` + permission empty state; manual Present remains for barber |
| Shop owner flows are large | Scope blow-up | Ship Shop hub MVP (status + create/join/leave); deep invite/edit in follow-up if time |
| Schedule exceptions complexity | Incomplete editor | List + add/remove MVP; full polish later |
| Push registration Android-only | Web noise | Call `usePushRegistration` only when device + session |
| Legal URLs may be staging placeholders | Broken links | Open `legalDocuments` URLs; show disabled if missing |
| English-ready | Future i18n | Keys in dictionaries now; default `ar` |
| Design proposals still in tree | Confusion | Stop booting them; delete after F1 parity |
| Android back on nested stacks | Traps | Router back + tab reset rules |
| No integration tests for UI | Regressions | Keep domain tests; add one gate unit test for route decision |
| Web is preview-only | Product is Android | Build mobile-first; web for design review |
| Auth identity collision UX | Account lock confusion | Dedicated message + password sign-in path |
| Barber unpublished after signup | Empty barber tabs | Force onboarding until published profile fields complete |
| DZD / Africa/Algiers formatting | Wrong times | Reuse `src/booking` formatters only |
| Brand spelling `كوپا` | Inconsistent copy | i18n brand key only |

### Explicit non-goals (this rebuild pass)
- New backend RPCs
- Uploaded photos
- SMS OTP
- Full English UI translation pass (keys only)
- Marketing site
- Redesigning domain hooks

## Implementation order (execute)

1. F0 tooling + plan doc  
2. F1–F2 theme components + i18n  
3. F3–F4 session gate + auth  
4. F5–F6 customer + booking  
5. F7–F8 barber + onboarding  
6. F9–F10 notifications/account/hardening  

## Verification

```sh
npm run typecheck
npm test
npx expo start --web   # visual smoke
```

Manual: sign-in path, find → book, home upcoming actions, barber today, publish onboarding (against staging env).

## Decision log

- Navigation: **Expo Router** (`app/`)
- UI direction: **Teal Stage**
- Data: existing hooks only
- Default locale: **ar** RTL
