# Koupa Product Reference

## Product

Koupa is an Android-only Expo + React Native app for booking barber appointments. It supports two permanent account roles: Customer and Barber. The app launches in Algeria with Arabic-first RTL support, DZD pricing, Algerian cities, and English-ready localization.

## Authentication and Services

- Supabase Auth handles Google OAuth, email/password, password-based phone sign-in, sessions, and password recovery. Firebase handles Cloud Messaging push notifications. Supabase also handles profiles, shops, services, schedules, appointments, ratings, storage, and server-side booking logic.
- New users begin at `إنشاء حساب`, select their permanent Customer or Barber role, accept the current Terms and Privacy Policy, then use Google, email/password, or phone/password. Existing users begin at `لدي حساب بالفعل` and sign in directly with the same supported methods.
- Email/password accounts confirm their email before onboarding. Phone/password accounts do not use SMS or OTP; they provide a recovery email that is attached and confirmed in Supabase Auth before onboarding. Password recovery is always sent to that confirmed Auth email.
- Auth callbacks use PKCE and the `koupa://callback` deep link. Confirmation, recovery, expired-link, and provider-error outcomes are handled by the callback route instead of URL-fragment parsing in product screens.
- The selected role and consent are provisional Auth metadata until profile creation. The database requires a confirmed email, current immutable legal acceptances, and a matching provisional role before it allows a profile insert; once created, the profile role cannot change.
- Identities are never silently merged. When a Google identity collides with an existing password account, the user must first prove ownership by signing in with the existing password method before any provider linking can be offered.
- Account deletion is available in-app. Upcoming appointments are cancelled, affected users are notified, and personal data is deleted or anonymized.

## Design System

- Dark Teal: `#1A7A78`
- Warm Gold: `#E1A553`
- Charcoal Gray: `#323E4B`
- Off-White: `#F3F5F7`
- Typeface: IBM Plex Sans Arabic from `IBM_Plex_Sans_Arabic.zip`, using Regular, Medium, SemiBold, and Bold weights.
- MVP uses placeholders/initials only; no uploaded profile photos.
- Official logo asset: `assets/koupa-logo.png`.
- Use the official logo for the Expo Android app icon once `app.json` or `app.config.*` is added. Preserve the original asset and add platform-specific adaptive icon variants only if Android requires them.

## Customer Experience

Customer tabs are `Home`, `Find`, `Appointments`, and `Profile`.

- Home shows `Find a Barber` without an upcoming appointment; otherwise it shows the next appointment with details, cancel, reschedule, and QR scan actions.
- Find uses separate `Barbers` and `Shops` tabs with partial Arabic/English name matching and basic normalization.
- Barber profiles show services, prices, durations, bio, phone, rating, hours, location, and availability.
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
- Today shows appointments and quick actions for `Present`, details, and the permanent QR code.
- The QR scanner is built into the customer app. A valid current-day appointment scan marks the customer `Present`.
- Each barber may own one shop or join one shop, never both or more than one. Every barber may create a shop.
- Shop owners can invite unaffiliated barbers or approve/reject join requests. Invitations expire after 30 days.
- Owners can edit affiliated barbers' schedules, availability, services, and prices, but not personal profiles. Barbers can edit those settings afterward. Both receive change notifications; the owner and affected barber see activity history.
- Leaving a shop cancels that barber's upcoming shop appointments and notifies customers. Deleting a shop does the same for its upcoming appointments and removes active membership.

## Appointment Lifecycle and Notifications

The lifecycle is `Booked` -> `Present` -> `Completed`. The barber can cancel but cannot reschedule a customer appointment. If the barber never marks the customer `Present`, the appointment automatically becomes `Absent` when its scheduled time passes. After the service duration, a `Present` appointment automatically becomes `Completed`.

Firebase push notifications are sent for booking updates and every `Present`, `Completed`, and `Absent` status. MVP notification content is Arabic-only. Staging notifications are real but clearly labeled as test notifications.

## Ratings and Support

Customers can submit one 1-5 star rating after `Completed`. Ratings are publicly visible with average and count, including on shop profiles. Ratings can be edited within 24 hours but not deleted. Support is provided through a support-email link in Profile. No reporting or blocking tools are included in the MVP.

## Environments and Release

Use local Supabase for development and separate hosted Supabase projects for staging and production. Hosted Supabase projects are `Koupa Staging` (`zhdwaizroczkqzwrvfxf`) and `Koupa Production` (`hrcwhswzscfbpbllqkri`) in `eu-west-1`. Firebase projects are `koupa-dev`, `koupa-staging`, and `koupa-prod`. Staging contains resettable Arabic demo data and supports testers' normal Google accounts. Use local Android builds for development and EAS for production. Release through Google Play closed testing, then production.

- App name: `Koupa`
- Android application ID: `com.koupa.app`
- Legal Terms and Privacy Policy must be accepted before signup, recorded immutably with the active version, server-enforced before profile creation, and remain linked from Profile. Release setup includes publishing the active legal-document versions and URLs in Supabase.
