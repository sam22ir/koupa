# Google Play submission pack

Draft store copy, assets, and declaration notes for Koupa. The Arabic listing
text has been corrected and saved as a Play Console draft. Store category
(`Beauty`), public support email, and website are also saved. Play Console shows
10 of 11 app setup tasks complete; the remaining task is uploading the listing
icon, feature graphic, and phone screenshots.

## Readiness and known gates

- Android package: `com.koupa.app`.
- Current app config has version `1.0.0`; EAS remote versioning assigned
  version code `7` to production AAB build `c7719091-9411-4b46-95e5-c75235af688e`.
  That build was still queued at the last check. The completed preview build is
  an APK and is not the upload bundle.
- New Play submissions now need Android 16 (API 36) or higher. Confirm the
  finished AAB's target API before upload.
- The production Google Services file is ignored by Git. EAS warned that this
  file will not be included in the remote build archive. Ensure it is supplied
  through an EAS file environment variable and confirm the build log shows it
  was available before treating the AAB as usable.
- Play Console currently reports zero closed-test opt-ins. Its dashboard
  requires 12 testers to remain opted in continuously for 14 days before
  production access can be requested.
- Arabic and English Privacy, Terms, and Account Deletion URLs all returned
  HTTP 200 on 2026-09-23:
  - Arabic: `https://koupa-website.pages.dev/privacy/`,
    `https://koupa-website.pages.dev/terms/`,
    `https://koupa-website.pages.dev/account-deletion/`
  - English: `https://koupa-website.pages.dev/en/privacy/`,
    `https://koupa-website.pages.dev/en/terms/`,
    `https://koupa-website.pages.dev/en/account-deletion/`
- Listing icon and feature-graphic assets are in `assets/play-store/`; the icon
  and in-graphic brand mark use the approved welcome-screen logo lockup.
- The user supplied 17 Arabic Android screenshots at 1158 × 2560. Original files
  and cleaned crops are preserved under `assets/play-store/source/phone-screens/`.
  The eight selected listing images in `assets/play-store/screenshots-ar/` are
  1367 × 2430 JPEGs with the status strip removed, no app content cropped, and a
  9:16 portrait canvas. Verify the selected screens against the final Android
  release candidate before upload; create a separate English set if an English
  listing will be offered.
- **Policy gate: public user-generated content.** The working tree now adds
  in-app report and block controls and a moderation queue. The migration
  `20260923143556_ugc_reporting_and_blocking.sql` is not yet verified on the
  release backend, and the flows have not been checked against the production
  bundle. Apply the migration to the intended production project and confirm
  the report/block flows before submission.
- Privacy-text review: the published policy covers QR attendance and location,
  but not the QR scanner's camera permission. Proposed disclosure, pending
  approval and publication under a new privacy version:
  - English: “When you scan a barber's appointment QR code, Koupa uses your
    device camera to read the code and validate check-in. The camera feed is
    processed for this scan; Koupa does not upload or store photos or video
    from the scan.”
  - Arabic: “عند مسح رمز QR الخاص بموعد الحلاقة، يستخدم كوپا كاميرا جهازك لقراءة
    الرمز والتحقق من الحضور. تُعالج صورة الكاميرا لإتمام عملية المسح فقط، ولا
    يرفع كوپا الصور أو مقاطع الفيديو الناتجة عن المسح أو يخزنها.”
- The production Google OAuth, production push dispatch secrets, and production
  backend parity must be verified against the current environment. The last
  repo audit is dated 2026-08-04, so its status may have changed.

## Main store listing

Google Play limits the app title to 30 characters, the short description to 80,
and the full description to 4,000. The proposed copy below stays within those
limits and describes the current Arabic-first product.

### Arabic (ar)

**App name**

`كوپا: حجز مواعيد الحلاقة`

**Short description**

`اعثر على حلاق قريب، واختر الخدمة والموعد المناسبين بسهولة.`

**Full description**

كوپا يساعدك على تنظيم موعد الحلاقة، سواء كنت تبحث عن حلاق أو تدير جدول عملك.

للزبائن:

- تصفح ملفات الحلاقين والمحلات.
- تعرّف على الخدمات والأسعار ومددها ومواعيد العمل.
- اختر الخدمة والوقت المتاحين، وتابع حجزك من مكان واحد.
- أكّد حضورك برمز QR عند الوصول.

للحلاقين:

- أنشئ ملفاً مهنياً لخدماتك وأسعارك وموقعك.
- نظّم ساعات العمل والاستراحات والمواعيد المتاحة.
- تابع حجوزات اليوم وحالة حضور الزبائن.
- أنشئ محلاً أو انضم إلى محل ونظّم جدول العمل.

يتم الدفع مباشرة في المحل. كوپا تطبيق عربي لحجز مواعيد الحلاقة في الجزائر.

### English (en)

**App name**

`Koupa: Barber Appointments`

**Short description**

`Find nearby barbers, choose a service and time, and manage your appointments.`

**Full description**

Koupa helps customers book barber appointments and helps barbers manage their
work schedules. The app is Arabic-first and built for barber bookings in
Algeria.

For customers:

- Browse barber and shop profiles.
- Review services, prices, durations, and working hours.
- Choose an available service and time, then keep track of the appointment.
- Confirm arrival with a QR code at the shop.

For barbers:

- Create a professional profile with services, prices, and location.
- Manage working hours, breaks, and appointment availability.
- Keep up with today's bookings and customer attendance.
- Create a shop or join one and coordinate the work schedule.

Payment takes place at the shop. Koupa helps customers find a barber and book
an appointment.

### Listing contact and policy links

- Support: `saadisamir20200@gmail.com`
- Privacy policy (Arabic): `https://koupa-website.pages.dev/privacy/`
- Privacy policy (English): `https://koupa-website.pages.dev/en/privacy/`
- Account deletion (Arabic): `https://koupa-website.pages.dev/account-deletion/`
- Account deletion (English): `https://koupa-website.pages.dev/en/account-deletion/`
- Terms (Arabic): `https://koupa-website.pages.dev/terms/`
- Terms (English): `https://koupa-website.pages.dev/en/terms/`

## Store artwork

- `assets/play-store/store-icon-512.png` — 512 × 512 RGBA PNG, derived from the
  approved welcome-screen lockup on the app's teal background.
- `assets/play-store/feature-graphic-ar.png` — 1024 × 500 Arabic graphic.
- `assets/play-store/feature-graphic-en.png` — 1024 × 500 English graphic.
- The Arabic and English feature graphics share a barbershop campaign photo
  with localized copy; they are marketing artwork, not screenshots of the app.
- `assets/play-store/screenshots-ar/` contains eight Arabic screenshots that
  introduce both roles, customer discovery and booking, and barber Today,
  Schedule, and activity workflows. The high-resolution source captures and
  cleaned set are preserved under `assets/play-store/source/phone-screens/`.
- `assets/play-store/story-ar/` contains six additional Arabic 1080 × 1920
  designed story graphics, with a contact sheet at
  `assets/play-store/story-ar-overview.jpg`. These were generated in portrait
  from matching app-capture and barbershop-photo references. The model integrated
  the app display, photo, and Arabic headline in each card. They show onboarding,
  customer discovery and booking, booking notifications, and barber
  availability. They are AI-generated marketing compositions, not pixel-exact
  screenshots; retain the clean capture set as the standard screenshots and
  compare every generated screen and claim with the release before publishing.
  Play Console now asks for AI-generated assets to be declared individually.
  Declare each story graphic if it is uploaded. These are not the default
  screenshot set.

## Play Console declaration worksheet

The following are drafts to check in Play Console. The final answers must match
the release AAB, all bundled SDKs, backend behavior, and the developer's policy
choices.

| Console section | Draft / action |
|---|---|
| Ads | Completed in Play Console; verify no ads are introduced before release. |
| App access | Completed in Play Console with sign-in details. The developer created separate customer and barber test accounts; keep their reusable test-only credentials valid through review. |
| Target audience | Completed in Play Console as teenagers and adults (13+); child groups remain excluded. |
| Content rating | Completed in Play Console from the current declared product behavior. Revisit if the shipped experience changes. |
| Data safety | Completed in Play Console. Reconcile it against production SDK/backend collection before release. |
| Account deletion | Declare in-app deletion and the external request page. The page must continue to allow a request without reinstalling the app. |
| Permissions | Explain foreground location for nearby discovery and camera for scanning the barber's appointment QR. No background location use is intended. |
| Category / countries | Category `Beauty` and support contact are saved. Confirm initial distribution countries and pricing in Console. |

As checked in Play Console on 2026-09-23, privacy policy, sign-in details, ads,
content rating, 13+ target audience, Data safety, government apps, financial
features, health, category, and contact details are complete. The app category
is Beauty; public contact email is `saadisamir20200@gmail.com`; website is
`https://koupa-website.pages.dev`. The visual store listing remains incomplete
until its image assets are uploaded.

### Reviewer access instructions (template; fill in after creating accounts)

1. Install Koupa and choose **Sign in**.
2. Customer review account: email `[create test-only customer account]`,
   password `[set reusable password]`. Use Find to inspect a barber/shop and
   test a booking with seeded test availability.
3. Barber review account: email `[create test-only barber account]`,
   password `[set reusable password]`. Review Today, Schedule, services, and
   shop profile using a completed test profile.
4. Test accounts must be confirmed, usable worldwide, not require email/SMS
   verification during review, and retain appropriate demo records. Supply any
   other steps required for Google sign-in or QR flows in Play Console.

Do not submit with these placeholders. Play review sign-in details need to be
valid, reusable, and sufficient to reach the app's restricted features.

## Before sending a release for review

- Deploy and verify the in-app UGC reporting/blocking implementation and its
  database migration in the release environment.
- Include and verify the Android Google OAuth handoff fix in the release
  candidate; this source change is not yet in the previously built APK.
- Verify production Google OAuth, callback allowlist, production Supabase
  schema/legal rows, Firebase project and push dispatch, and production data
  deletion end to end.
- Publish an approved, versioned privacy-policy update if the camera-scanner
  disclosure is amended; activate the same version in the production legal
  documents table so app consent and public policy stay aligned.
- Enter the already-created reviewer account credentials in Play Console and
  verify both roles can sign in and complete representative flows from a clean
  install.
- Upload the production AAB, check Play Console's generated device artifacts,
  pre-launch report, policy warnings, and release dashboard before rollout.
- If this is a personal developer account created after 2023-11-13, plan the
  required closed test with 12 continuously opted-in testers for 14 days before
  requesting production access.
