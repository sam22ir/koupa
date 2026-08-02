# Koupa Build Roadmap

Work one category/stage at a time. Mark status as `todo`, `in_progress`, or `done`.

## Stage 0 — Stabilize WIP
Status: `done`

- [x] Customer reschedule screen
- [x] Two-hour customer cancel cutoff helper + tests
- [x] Customer logout via `signOut`
- [x] Android/web back guards for customer and barber shells
- [x] Refresh appointments on focus
- [x] Arabic appointment status labels
- [x] Home upcoming-appointment actions (cancel / reschedule)

## Stage 1 — Customer appointments
Status: `done`

- [x] Home shows next appointment with cancel, reschedule, and details
- [x] Appointments list polish (status, empty, errors)
- [x] Cancel confirmation before destructive action
- [x] Block reschedule when appointment is no longer `booked`

## Stage 2 — Barber shell
Status: `done`

- [x] Barber tabs: Today, Schedule, Shop, Profile
- [x] Barber navigation molecule
- [x] Today refresh on focus + Arabic statuses
- [x] Barber cancel confirmation
- [x] Barber profile + logout
- [x] Schedule and Shop placeholder screens for later stages
- [x] Fix `TodayAppointment` type to match RPC shape

## Stage 3 — Barber schedule management
Status: `done`

- [x] Edit weekly hours and breaks after publish
- [x] Appointment interval, booking window, minimum notice
- [x] Pause booking toggle
- [x] Edit services and prices
- [x] Soft-delete removed services (`is_active = false`)
- [x] Validation helpers + unit tests

## Stage 4 — QR Present flow
Status: `done`

- [x] Permanent barber QR code (`koupa://check-in/<barberId>`)
- [x] Customer scanner with camera permission
- [x] Customer RPC `check_in_with_barber_qr` for current-day booked appointments
- [x] Keep barber manual Present action
- [x] QR parse/build unit tests

## Stage 5 — Ratings
Status: `done`

- [x] Rate completed appointments 1–5 stars
- [x] Edit rating within 24 hours (server + client)
- [x] Show average and count on barber profile
- [x] `rate_appointment` RPC + public profile rating fields
- [x] Rating helper unit tests

## Stage 6 — Shops
Status: `done`

- [x] Create shop / request join / approve-reject / leave / delete
- [x] Shop profile and Find Barbers|Shops tabs
- [x] Book shop-affiliated barbers (bookability fix + shop_id on booking)
- [x] Owner schedule/service edits for affiliated barbers
- [x] Owner invites with 30-day expiry

## Stage 7 — Notifications and account lifecycle
Status: `in_progress`

- [x] Register Expo/Android push tokens into `device_push_tokens`
- [x] Deliver remote FCM fan-out worker implementation and staging deployment
- [x] Configure Firebase service-account secret on staging (`FIREBASE_SERVICE_ACCOUNT_JSON`, `NOTIFICATION_DISPATCH_SECRET`, `APP_ENV`)
- [x] Staging trusted scheduler for `dispatch-notifications` (`pg_cron` + Vault + `pg_net`)
- [ ] Deploy `dispatch-notifications` + secrets + scheduler to production
- [x] In-app notifications list + mark read
- [x] Account deletion RPC + profile actions
- [x] Support email + Terms, Privacy, and account-deletion links on both Profile roles
- [x] Explicit re-consent for newly active legal versions

## Stage 8 — Release hygiene
Status: `in_progress`

- [x] Apply and verify migrations on staging
- [x] Seed staging demo data (idempotent resettable seed)
- [x] Replace staging example legal URLs with approved versioned documents
- [x] Apply and verify approved versioned legal documents on production
- [ ] Google OAuth on installed Android build
- [x] Verify hosted appointment-transition cron (staging + production)
- [x] Production migration parity audit documented (7 migrations behind)

## Stage 9 — Domain hardening (service layer)
Status: `in_progress`

- [x] Generate Supabase `Database` types + typed client
- [x] Atomic `publish_barber_profile` RPC
- [x] Atomic `replace_barber_settings` RPC + shared owner helper
- [x] Extract `src/services/*` and thin hooks
- [x] Split `useSession` façade (`useAuthActions`, `useLegalAcceptance`, `auth` service)
- [x] Central `AppError` codes + mappers
- [x] Search pagination args on booking/shops hooks
- [x] Session cache clear on sign-out
- [x] Frontend contract doc
- [x] SQL structural test scripts under `supabase/tests/`
- [x] RPC security audit note (`reference/RPC-SECURITY-AUDIT.md`)
- [x] CI workflow (`typecheck` + `test`)
- [ ] Restore Docker/local Supabase for full SQL fixture runs
- [ ] Production migration apply + push path
