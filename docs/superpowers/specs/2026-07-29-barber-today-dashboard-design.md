# Koupa Barber Today Dashboard Design

Date: 2026-07-29
Status: Approved visual direction

## Scope

Redesign the barber Today screen as a compact daily operations dashboard. Preserve the existing booking service, focus refresh, appointment actions, permanent barber check-in payload, Arabic-first RTL presentation, and four-tab barber navigation.

This work changes the Today screen's information hierarchy and presentation only. It does not add booking analytics, change appointment rules, or duplicate schedule editing inside Today.

## Direction

Use the selected "Daily dashboard" composition:

- A compact deep-teal header establishes the screen title and current date.
- Three stable counters summarize today's appointment states.
- A slim QR action exposes the permanent attendance code without dominating the screen.
- One chronological timeline remains the primary operational surface.
- An empty day keeps the dashboard structure visible and offers one clear route to Schedule.
- The screen continues the approved Teal Stage language with IBM Plex Sans Arabic, restrained warm-gold accents, and no gradients, illustration, glass effects, or decorative metric cards.

## Header

The header contains:

- The existing English `Koupa` brand mark in its approved high-contrast treatment.
- Title: `مواعيد اليوم`.
- The localized current date, for example `الأربعاء، 29 يوليو`.
- A compact QR icon button with the accessibility label `عرض رمز الحضور`.

The QR button is a 48x48 minimum touch target. It remains a tool action rather than a full-width primary button. The date is generated in Arabic using the `Africa/Algiers` booking timezone and must not be hard-coded.

## Daily Counters

Render one RTL row with three equal-width counters:

1. `القادمة`: appointments with `booked` status.
2. `حاضر`: appointments with `present` status.
3. `مكتملة`: appointments with `completed` status.

The counters remain visible when all values are zero. Their dimensions do not change while data refreshes or counts gain digits. Cancelled and absent appointments do not contribute to these three counters.

The row is one grouped dashboard surface, not three floating cards. Use quiet separators, tabular numerals, and a clear label/value hierarchy. Counter values come from the same fetched Today data as the timeline so the summary cannot disagree with the list.

## Attendance QR

A slim action row below the counters reads `عرض رمز الحضور` and includes the familiar QR icon. Both the header icon and this row open the same modal.

The modal contains:

- Title: `رمز الحضور`.
- A real, scannable QR matrix generated from the permanent barber check-in payload.
- A short instruction telling the barber to let the customer scan it from the كوپا app.
- A close icon button and an explicit `إغلاق` action.

Do not display the raw payload in the default interface. It may remain available only through a development diagnostic path. The modal respects the safe area, closes through Android back and backdrop dismissal, and keeps the QR at a stable square size with sufficient quiet space and contrast.

## Appointment Timeline

Render appointments in one chronological list ordered by start time. Do not split the list into `القادمة`, `حاضر`, and `مكتملة` sections because the counters already provide that overview.

Each appointment row shows:

- Start time as the strongest scanning anchor.
- Customer initials and name.
- Service name and duration.
- A compact localized status indicator.
- The context-appropriate primary action, including `تأكيد الحضور` for a booked appointment.

The whole row, excluding embedded actions, opens appointment details. Secondary destructive actions such as cancellation remain in the details screen or an overflow action with confirmation; they must not compete visually with `تأكيد الحضور` in the timeline.

Rows use separators or a restrained list surface rather than independent elevated cards. Completed, cancelled, and absent rows remain legible but visually quieter than the next actionable appointment. Refreshing data must preserve row height and scroll position where possible.

## Empty Day

When no Today appointments exist, keep the header, all three zero counters, and QR action visible. Replace only the timeline with a compact empty state:

- Title: `لا مواعيد اليوم`.
- Body: `ستظهر حجوزات اليوم هنا فور تأكيدها.`
- Primary action: `فتح الجدول`.

`فتح الجدول` switches to the barber Schedule tab. It is the only empty-state action. Working-hours editing stays inside Schedule so Today remains an operational view rather than a second configuration surface.

## Loading, Refresh, and Error States

- Initial loading uses counter and timeline skeletons that match the final geometry.
- Focus refresh and manual refresh keep stale content visible until fresh data arrives.
- Counters and timeline update from one successful result.
- A recoverable fetch error appears as a compact inline banner with a retry action; it does not remove previously loaded appointments.
- A failed Present action restores the action state and shows a contextual error without silently changing the counter.
- Buttons prevent duplicate submissions while retaining stable dimensions.

## Accessibility

- Maintain readable contrast and 48x48 minimum interactive targets.
- Expose counter labels and values together, such as `القادمة، 2`.
- Expose appointment time, customer, service, and status in a coherent RTL reading order.
- Give QR, retry, details, and appointment actions explicit Arabic accessibility labels.
- Do not communicate appointment state through color alone.
- Support dynamic type without clipping counters, row actions, or the empty-state copy.
- Respect reduced-motion preferences for modal and state transitions.

## Component Boundaries

- Keep Today-specific composition in `app/(barber)/today.tsx`.
- Extract a reusable appointment timeline row only if another barber surface needs the same row behavior.
- Reuse the existing theme, icon, modal, error, and navigation primitives.
- Add a focused counter-row component only if it materially improves testability; do not introduce a general dashboard framework.
- Keep fetching and mutations in `useBooking` and the service layer. The screen derives display counters from the returned Today appointments.

## Testing and Verification

Automated checks:

- Test counter derivation for empty, mixed, cancelled, and absent data.
- Test counters remain rendered at zero.
- Test chronological ordering and status-specific actions.
- Test the empty-state action opens the Schedule tab.
- Test both QR entry points open the same permanent payload.
- Test Present success refreshes the list and Present failure preserves the previous state.
- Run `npm run typecheck`, focused Jest tests, and lint on changed files.

Runtime checks at 340x646 and a larger Android viewport:

- Header, counters, QR action, empty state, and bottom tabs fit without overlap or clipping.
- Multi-digit counts and larger Arabic text do not resize the dashboard unexpectedly.
- Appointment rows remain scannable with long customer and service names.
- The QR code is rendered, high-contrast, and decodes to the expected permanent barber payload.
- Screen focus refresh, manual refresh, errors, Present, details, and Schedule navigation behave as specified.

## Acceptance Criteria

- Today reads as a daily operations dashboard, with the appointment timeline as its primary content.
- The three counters remain visible on empty days and accurately reflect the loaded list.
- Appointments appear in one chronological timeline without category tabs or repeated sections.
- QR access is compact, persistent, and opens a genuinely scannable code.
- The empty state offers only `فتح الجدول`; availability editing remains in Schedule.
- Existing booking and navigation contracts in `reference/KOUPA-PRODUCT-SPEC.md` remain unchanged.
- No unrelated route, backend, theme, or navigation refactor is included.
