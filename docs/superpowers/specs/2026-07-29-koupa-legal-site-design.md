# Koupa Legal Site Design

Date: 2026-07-29
Status: Approved

## Purpose

Publish accurate, publicly accessible legal documents for the Koupa Android app and provide the account-deletion information required by Google Play. The content must reflect Koupa's implemented customer, barber, booking, authentication, notification, and account-lifecycle workflows.

The public operator name is `Koupa / كوپا`. The account-deletion contact is `saadisamir20200@gmail.com`.

## Scope

The site is a standalone static website under `website/`. It does not restore or depend on the Expo app frontend. It replaces the current Cloudflare Pages deployment for the existing `koupa-website` project.

The site contains an Arabic default version and a complete English version of:

- Legal index
- Privacy Policy
- Terms of Use
- Account Deletion

## URL Structure

Arabic is served at the shortest, default paths:

- `/`
- `/privacy/`
- `/terms/`
- `/account-deletion/`

English is served from explicit language paths:

- `/en/`
- `/en/privacy/`
- `/en/terms/`
- `/en/account-deletion/`

Every page links to the equivalent page in the other language. These are real static files, not JavaScript-only views, so Google Play and other crawlers can access each document directly.

## Information Architecture

The header contains the `Koupa / كوپا` identity, links to the three legal documents, and a compact language switch. The footer repeats the document links, operator name, contact email, and effective date.

The index provides a concise description of Koupa as an Algeria-first barber-booking service and routes visitors directly to each legal document. It is an index, not a marketing landing page.

## Privacy Policy Content

The Privacy Policy describes the data used by the implemented app:

- Account and authentication data, including email address, phone number, Google identity, confirmation state, account role, and legal acceptance records
- Profile and business data, including name, biography, city, neighborhood, barber/shop location, services, prices, and working schedules
- Booking and operational data, including appointments, status changes, QR check-ins, shop memberships, ratings, notifications, and activity history
- Technical data, including Android push tokens, app environment, security/session records, and ordinary web-server request logs

The policy explains why each category is processed: account creation, authentication and recovery, profile publication, barber discovery, booking enforcement, appointment notifications, shop operations, abuse prevention, support, account deletion, and legal compliance.

Service providers are identified by function:

- Supabase for authentication, hosted database, and server-side operations
- Google for Google sign-in and Firebase Cloud Messaging
- Cloudflare for the public legal website
- External map services only when a user opens a supplied map link

The policy states that Koupa does not sell personal data and does not use it for third-party advertising. It covers access/correction through the app, deletion, security limits, retention, policy updates, and contact details without claiming guarantees that the implementation cannot prove.

## Terms of Use Content

The Terms cover:

- Eligibility and acceptance before account creation
- Permanent Customer or Barber role selection
- Accurate account, profile, shop, schedule, service, and location information
- Customer discovery, booking, cancellation, rescheduling, attendance, QR check-in, and rating rules
- Barber availability, service, appointment, shop-membership, and customer-data responsibilities
- Payment at the shop, with Koupa not processing the MVP payment
- Prohibited misuse, impersonation, interference, fraudulent bookings, and unlawful content
- Public profile and rating behavior
- Account restriction, suspension, deletion, and service changes
- Reasonable availability, warranty, and liability limitations
- Updates to the Terms, Algerian law, and contact details

The wording must not represent Koupa as the barber service provider, payment processor, or guarantor of an appointment outcome.

## Account-Deletion Content

The account-deletion page exposes both supported paths:

1. In the app: open Profile, choose Delete Account, review the warning, and confirm.
2. Without app access: email `saadisamir20200@gmail.com` from the registered email address with the subject `Koupa account deletion request`. Include the registered phone number when the account uses one. Koupa may request reasonable ownership verification before processing the request.

The page describes the actual deletion behavior:

- Upcoming booked appointments are cancelled and affected users are notified.
- Authentication credentials, device push tokens, onboarding drafts, legal acceptance rows, personal notifications, schedules, and schedule exceptions are deleted.
- Owned shop data and remaining shop memberships are removed where applicable.
- Services are deactivated.
- The public profile is unpublished and identifying profile fields are anonymized.
- Historical appointment, rating, and operational-integrity records may remain linked to an anonymized account so past transactions remain internally consistent.

The page avoids promising an unimplemented fixed processing deadline. It says the requester will be contacted if verification or additional information is needed.

## Visual Design

The site uses the approved Koupa palette:

- Deep Teal `#1A7A78`
- Warm Gold `#E1A553` as a limited accent
- Charcoal Blue `#323E4B`
- Soft White `#F3F5F7`

IBM Plex Sans Arabic is self-hosted from the repository font assets. Pages use RTL layout for Arabic and LTR layout for English. Content uses a restrained document layout with a stable header, readable line length, clear section hierarchy, visible focus states, sufficient contrast, and responsive navigation. No analytics, cookies, forms, decorative imagery, or client-side framework is required.

## Implementation

The site uses semantic static HTML and shared CSS. Each route has its own `index.html`. A small shared JavaScript file is permitted only for progressive navigation behavior; legal content and language access cannot depend on it.

Static error handling includes a branded `404.html` with links back to the legal index and account-deletion page. Cloudflare configuration must not rewrite missing paths to the homepage, because the current `/account-deletion/` fallback is misleading and does not satisfy the deletion-page requirement.

## Verification

Before deployment:

- Confirm all eight public document routes and the 404 page exist.
- Scan for the incorrect Arabic brand spelling and placeholder domains.
- Verify all internal links, language counterparts, email links, headings, metadata, canonical URLs, and effective dates.
- Validate responsive layouts at mobile and desktop widths.
- Confirm legal content is readable without JavaScript.

Deployment uses the authenticated Cloudflare Pages project:

```sh
npx wrangler pages deploy website --project-name koupa-website --branch main
```

After deployment:

- Verify HTTP 200 for every Arabic and English route.
- Verify a missing route returns the branded 404 rather than the homepage.
- Inspect page titles, language/direction attributes, account-deletion instructions, and email link in the deployed HTML.
- Report the exact Privacy Policy, Terms of Use, and Account Deletion URLs for Google Play.

Updating Supabase legal-document rows or Google Play Console fields is outside this deployment unless separately requested.
