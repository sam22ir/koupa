# Koupa Product Reference

## Product

Koupa is an Android-only Expo + React Native app for booking barber appointments. It supports two permanent account roles: Customer and Barber. The app launches in Algeria with Arabic-first RTL support, DZD pricing, Algerian cities, and English-ready localization.

## Authentication and Services

- Supabase Auth handles Google OAuth, email/password, sessions, and password recovery. A required Algerian phone number is stored on the profile for barber/customer calls and can also be entered as a sign-in alias; a server-side function resolves it to the linked Auth email and runs the same email/password check. Supabase phone Auth, SMS, and OTP remain disabled. Firebase handles Cloud Messaging push notifications. Supabase also handles profiles, shops, services, schedules, appointments, ratings, storage, and server-side booking logic.
- New users begin at `إنشاء حساب`, select their permanent Customer or Barber role, and accept the current Terms and Privacy Policy. Email/password signup requires an email, password, and contact phone; Google users provide the contact phone during onboarding. Existing users begin at `لدي حساب بالفعل` and sign in with email/password, the linked phone alias, or Google.
- Email/password accounts confirm their email before onboarding. Password recovery is always sent to the linked account email. Phone sign-in never creates a separate Auth phone identity and never exposes the linked email in the UI.
- Auth callbacks use PKCE and the `koupa://callback` deep link. Confirmation, recovery, expired-link, and provider-error outcomes are handled by the callback route instead of URL-fragment parsing in product screens.
- The selected role and consent are provisional Auth metadata until profile creation. The database requires a confirmed email, current immutable legal acceptances, and a matching provisional role before it allows a profile insert; once created, the profile role cannot change.
- Legal documents and acceptances are append-only by version. Existing users must explicitly accept a newly active Terms or Privacy version before continuing; the app never infers or records that consent automatically.
- Identities are never silently merged. When a Google identity collides with an existing password account, the user must first prove ownership by signing in with the existing password method before any provider linking can be offered.
- Account deletion is available in-app, with a public explanation and email fallback at `https://koupa-website.pages.dev/account-deletion/`. Upcoming appointments are cancelled, affected users are notified, and personal data is deleted or anonymized.

## Frontend Reset

The previous frontend implementation, design system, branded assets, and Stitch references were intentionally removed on 2026-07-28. The replacement frontend must define its own palette, typography, components, assets, navigation, and responsive behavior before implementation. No previous design file, token file, component library, or asset path is normative.

### Brand palette (approved)

| Role | Name | Hex |
|---|---|---|
| Primary | Deep Teal | `#1A7A78` |
| Accent / Secondary | Warm Gold | `#E1A553` |
| Text / Headings | Charcoal Blue | `#323E4B` |
| Background | Soft White / Off White | `#F3F5F7` |

Tokens live in `src/theme/*`.

### Visual direction (locked)

**Teal Stage** (`منصة التركواز`) — locked 2026-07-28.

- Deep teal owns primary stage/hero surfaces (top of key screens).
- Warm gold is accent only (thin bar, status badge, secondary marks) — not large fills.
- Floating white cards may overlap the teal stage with light elevation.
- Soft radii (16–22), chips for time/duration/price, bold primary teal CTAs.
- Arabic-first RTL; **IBM Plex Sans Arabic** typeface; initials only (no profile photos).
- Reference implementation: `src/design-proposals/TealStageHome.tsx`.
- Direction metadata: `designDirection` in `src/theme/index.ts`.

Rejected alternatives kept only as archive under `src/design-proposals/` (`CalmCounterHome`, `ShopLedgerHome`) until the rebuild replaces them.

- Arabic-first RTL, DZD pricing, and English-ready localization remain product requirements.
- MVP uses placeholders/initials only; no uploaded profile photos.

## Customer Experience

Customer tabs are `Home`, `Find`, `Appointments`, and `Profile`.

App-owned Back and Return controls always go to their declared logical destination; Android system Back continues to follow actual navigation history.

Published Barber and Shop profiles may be opened from a shared link before sign-in. Only Customer accounts can enter booking; an anonymous Book action signs in first and restores the selected booking flow, while Barber accounts remain in their own workspace. New bookings and reschedules end in Customer Appointments and do not retain obsolete profile, detail, or booking screens. Notification inbox Back returns to the current role's Profile tab, and a password-recovery link takes precedence over every ordinary account gate until the password is changed or the user signs out.

- Home shows `Find a Barber` without an upcoming appointment; otherwise it shows the next appointment with details, cancel, reschedule, and QR scan actions.
- Find uses separate `Barbers` and `Shops` tabs with partial Arabic/English name matching and basic normalization.
- Barber profiles show services, prices, durations, bio, phone, rating, hours, location, availability, and optional affiliated-shop context. Customers select one active service before the `احجز` action becomes available; public profiles without active services show an explicit empty state.
- Shop profiles show name, bio, location, rating, affiliated barbers, and a `Book` action. Booking from a shop requires choosing a barber.
- Customers pay at the shop. A confirmed booking reveals the customer phone number to the barber.
- Rescheduling keeps the same barber but allows changing the service and time.
- Customers may have only one active upcoming appointment across all barbers. They may book again after `Completed`, `Absent`, or `Cancelled`.

## Barber and Shop Experience

Barber tabs are `Today`, `Schedule`, `Shop`, and `Profile`.

- Barber onboarding: `Basic Information` -> `Location` -> `Services` -> `Working Hours` -> `Review & Publish`.
- A valid Google Maps link or coordinates are required before publishing.
- Services have prices and durations in 5-minute increments.
- Barbers choose a 5, 10, 15, or 30-minute appointment interval. Service durations reserve all required consecutive availability.
- Weekly hours support date-specific exceptions, one or more breaks, a configurable booking window, minimum notice period, and pause-booking toggle.
- Schedule is one three-tab workspace for weekly hours and breaks, date exceptions, services, and constrained booking rules. Changes remain local until the barber uses the explicit `حفظ التغييرات` action, then save transactionally as one workspace update.
- Removing a service from new booking choices archives it instead of deleting it, preserving historical appointment references and allowing the barber to restore it later.
- Today shows appointments and quick actions for `Present`, details, and the permanent QR code. The barber can display the code full-screen or save/share a printable copy.
- The QR scanner is built into the customer app. Server validation opens 30 minutes before the appointment and closes at its scheduled end. A valid scan marks the appointment `Present`; repeat scans are successful and idempotent. The barber may undo a customer QR check-in back to `Booked`.
- Each barber may own one shop or join one shop, never both or more than one. Every barber may create a shop.
- The barber Shop experience uses a state-first hub: unaffiliated barbers start with searchable discovery or shop creation, while pending requests, invitations, active membership, and ownership each expose only their relevant next actions.
- Joining is search-first. Results can be inspected by location, rating, owner, and affiliated barbers before a request is submitted; a raw shop identifier is not the primary workflow.
- Shop owners can invite unaffiliated barbers or approve/reject join requests. Invitations expire after 30 days.
- Owners can edit affiliated barbers' schedules, availability, services, and prices, but not personal profiles. Barbers can edit those settings afterward. Both receive change notifications; the owner and affected barber see activity history.
- Selecting an active member opens a dedicated owner workspace with summary, schedule/services, activity, and removal views. Removal explains upcoming appointment cancellation, notifies the affected barber and customers, and is recorded in shop activity.
- Leaving a shop cancels that barber's upcoming shop appointments and notifies customers. Deleting a shop does the same for its upcoming appointments and removes active membership.

## Appointment Lifecycle and Notifications

The lifecycle is `Booked` -> `Present` -> `Completed`. The barber can cancel but cannot reschedule a customer appointment. If the barber never marks the customer `Present`, the appointment automatically becomes `Absent` when its scheduled end passes. After the service duration, a `Present` appointment automatically becomes `Completed`.

Firebase push notifications are sent for booking updates and every `Present`, `Completed`, and `Absent` status. MVP notification content is Arabic-only. Staging notifications are real but clearly labeled as test notifications.

Every in-app and push notification opens its associated event. Notification rows store a typed event destination, never an arbitrary URL: appointment events open a participant-specific appointment view; shop invitations, join requests, and membership decisions open the Shop hub or member workspace; workspace updates open the affected schedule or owner member workspace; and retained shop activity opens its activity view. If an event's underlying record has been removed or is no longer available, the recipient can still open the stored notification event record.

## Ratings and Support

Customers can submit one 1-5 star rating after `Completed`. Ratings are publicly visible with average and count, including on shop profiles. Ratings can be edited within 24 hours but not deleted. Both Profile roles link the active Terms, Privacy Policy, account-deletion information, and support at `saadisamir20200@gmail.com`. No reporting or blocking tools are included in the MVP.

## Environments and Release

Use local Supabase for development and separate hosted Supabase projects for staging and production. Hosted Supabase projects are `Koupa Staging` (`zhdwaizroczkqzwrvfxf`) and `Koupa Production` (`hrcwhswzscfbpbllqkri`) in `eu-west-1`. Firebase projects are `koupa-dev`, `koupa-staging`, and `koupa-prod`. Staging contains resettable Arabic demo data and supports testers' normal Google accounts. Use local Android builds for development and EAS for production. Release through Google Play closed testing, then production.

- App name: `Koupa`
- Android application ID: `com.koupa.app`
- Legal Terms and Privacy Policy must be accepted before signup, recorded immutably with the active version, server-enforced before profile creation, and remain linked from Profile. Release setup includes publishing the active legal-document versions and URLs in Supabase.
