# Customer Appointments Workflow Design

Date: 2026-08-01
Status: Approved direction, implementation pending

## Goal

Make `مواعيدي` a clear appointment workflow for Arabic-first customers. The page should prioritize upcoming bookings, keep past history useful, and avoid repeating destructive or unavailable actions.

## Information Architecture

- Use two views: `القادمة` and `السابقة`.
- `القادمة` contains `booked` and `present` appointments, sorted by start time ascending.
- `السابقة` contains `completed`, `absent`, and `cancelled` appointments, sorted newest first.
- Canceled appointments remain in `السابقة`; their `ملغى` status is visible and they do not expose booking, reschedule, QR, or cancellation actions.
- The default view is `القادمة` when at least one upcoming appointment exists; otherwise select `السابقة` when history exists, otherwise keep `القادمة` with its empty state.

## Appointment Cards

Each card shows the service, barber, localized date/time, and status. Upcoming cards have one filled `إدارة الموعد` action. Secondary actions are contextual:

- `إعادة الجدولة` only for `booked` appointments.
- `مسح رمز الحضور` only for `booked` appointments.
- `إلغاء الموعد` only while the cancellation window is open.

Past cards expose the appointment detail route. Completed cards keep rating through the detail screen. Canceled and absent cards are read-only apart from opening details.

## Empty And Loading States

- Keep the full white Koupa logo and gold accent in the shared customer stage header.
- Show a distinct empty message for each tab.
- Keep the header visible while appointments load and use an inline list indicator.
- If loading fails, show the error and retry action without pretending the account has no appointments.

## Data And Boundaries

Use `loadCustomerAppointments()` as the single source. Filtering and sorting stay pure and local to the screen or a small helper; no schema or RPC changes are required. Existing appointment detail, booking, QR, rating, and cancellation services remain the route boundaries.

## Remove And Add Decisions

Remove the current undifferentiated flat list presentation and its repeated canceled cards in the primary view. Add the two-tab model, contextual actions, status-specific empty states, and chronological sorting. Do not delete appointment history from storage; canceled records remain available under `السابقة`.

## Accessibility And Responsive Rules

- Tabs expose selected state and remain at least 44 logical pixels tall.
- Cards and actions expose Arabic accessibility labels.
- Long barber/service names wrap without pushing actions off-screen at 342x646.
- Status is represented with text as well as color.

## Verification

Cover upcoming/past filtering, chronological ordering, canceled placement in `السابقة`, contextual action visibility, tab selection, empty states, retry behavior, and navigation to appointment details with focused Jest tests. Verify the route at mobile and larger web viewports.
