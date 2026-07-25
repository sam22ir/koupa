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
- [ ] Owner schedule/service edits for affiliated barbers (deferred)
- [ ] Owner invites with 30-day expiry (deferred; join requests covered)

## Stage 7 — Notifications and account lifecycle
Status: `todo`

- [ ] Register Firebase push tokens
- [ ] Deliver Arabic booking status pushes
- [ ] In-app notifications list
- [ ] Account deletion
- [ ] Support email + legal links on Profile

## Stage 8 — Release hygiene
Status: `todo`

- [ ] Apply and verify migrations on staging
- [ ] Seed staging demo data
- [ ] Active legal document rows
- [ ] Google OAuth on installed Android build
- [ ] Verify hosted appointment-transition cron
