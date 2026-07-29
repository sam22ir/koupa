# QR Check-In Workflow Design

Date: 2026-07-29
Status: Approved product design

## Goal

Give each barber one permanent QR code that customers can scan at arrival. Koupa validates the authenticated customer's appointment on the server, marks a valid appointment `Present`, and explains every rejected scan in clear Arabic.

The workflow must be quick at the barber's station, work from the barber's phone or a printed sign, and remain correct under repeated or simultaneous scans.

## Product Decisions

- Each barber has one permanent QR code.
- The QR payload contains only the barber ID: `koupa://check-in/<barber-id>`.
- A successful scan changes the customer's matching appointment from `Booked` to `Present` immediately.
- Check-in opens exactly 30 minutes before the appointment and closes at its scheduled end.
- A repeated scan of an already-present appointment is a successful, idempotent result.
- The MVP does not require customer location or use a rotating code.
- The barber can undo an incorrect check-in, returning the appointment to `Booked`.
- The QR can be displayed full-screen or saved/shared as a printable image.

## Customer Flow

1. A `Scan attendance QR` action appears only on a `Booked` appointment.
2. The scanner shows the expected barber name and appointment time above the camera.
3. The camera accepts QR codes only. Invalid codes remain on the scanner with a clear explanation and a `Scan again` action.
4. After recognizing a Koupa QR, the scanner locks and shows `Checking your appointment` while the server validates it.
5. A valid result shows the barber, service, appointment time, and an `Attendance confirmed` message.
6. Closing the success result returns to the appointment, refreshed with status `Present`.
7. Repeating the scan shows `Your attendance is already confirmed` and does not create another transition or notification.

The scanner must handle camera permission loading, denial, and permanent denial. Permanent denial provides an `Open settings` action.

## Barber Flow

- The Today screen always provides a prominent `Display attendance QR` action, including when there are no appointments.
- The QR view uses a large, high-contrast, scannable code on a white background.
- It shows the barber's name and a short customer instruction, but never displays the raw URI.
- `Save/Share` creates a clean branded image suitable for printing at the barber's station.
- A `Present` appointment provides `Undo attendance` behind a confirmation prompt.
- Undo returns the appointment to `Booked`, informs the customer, and allows a later valid scan.

## Server Contract

The server is the sole authority for check-in eligibility. The client sends the scanned barber ID and renders the structured result. It does not infer eligibility from locally loaded appointment data.

The check-in RPC returns one of these result codes with any relevant safe metadata:

| Code | Meaning | Client behavior |
|---|---|---|
| `CHECKED_IN` | Appointment transitioned to `Present` | Show confirmation and refresh appointment |
| `ALREADY_PRESENT` | Matching appointment is already `Present` | Show successful already-confirmed state |
| `WRONG_BARBER` | Today's booked appointment belongs to another barber | Name the customer's expected barber |
| `TOO_EARLY` | Check-in window has not opened | Display the exact opening time |
| `TOO_LATE` | Scheduled appointment end has passed | Display the appointment end time |
| `CANCELLED` | Matching appointment was cancelled | Explain that the appointment is cancelled |
| `NO_ACTIVE_APPOINTMENT` | No relevant appointment exists | Explain that no booked appointment is available |

Malformed or non-Koupa QR data is rejected locally as `INVALID_QR`. Network and unexpected server failures remain separate retryable client errors.

The RPC applies this result priority:

1. Reject an unauthenticated caller or a caller whose permanent role is not `customer`.
2. Load the customer's single active `Booked` or `Present` appointment.
3. If an active appointment exists for another barber, return `WRONG_BARBER`.
4. If the matching appointment is `Present`, return `ALREADY_PRESENT`.
5. For a matching `Booked` appointment, check `TOO_EARLY`, then `TOO_LATE`, then attempt the atomic transition.
6. If there is no active appointment, inspect the customer's most recent same-day appointment with the scanned barber. Return `CANCELLED` for a cancelled appointment or `TOO_LATE` for an ended terminal appointment.
7. Otherwise return `NO_ACTIVE_APPOINTMENT`.

Validation uses the authenticated user and `Africa/Algiers` time. The server must verify:

- the caller is an authenticated customer;
- the customer owns the appointment;
- the scanned barber matches the appointment barber;
- the appointment state permits check-in;
- `now()` is greater than or equal to `starts_at - 30 minutes`;
- `now()` is strictly earlier than `ends_at`.

The server must not reveal information about appointments belonging to other customers.

## Atomic State Changes

The `Booked` to `Present` transition must be a single conditional database update. Only the transaction that changes the row may set `qr_checked_in_at`, record the attendance event, and create the customer and barber notifications.

Concurrent requests that lose the transition race must re-read the matching appointment and return `ALREADY_PRESENT`. They must not create duplicate notifications.

The attendance record retains:

- appointment ID;
- check-in timestamp;
- source `customer_qr`;
- actor customer ID;
- nullable reversal timestamp and reversing barber ID, populated together when the barber undoes attendance.

The barber-only undo operation verifies ownership and requires the current status to be `Present`. It returns the appointment to `Booked`, clears the active QR check-in marker, preserves the attendance audit record, and notifies the customer. It cannot reopen `Completed`, `Absent`, or `Cancelled` appointments.

If an undone appointment is not checked in again before its end, the existing overdue transition marks it `Absent`.

## Customer Messages

Arabic copy must communicate the reason and next action. Required meanings are:

- This code belongs to another barber; your appointment is with `<name>`.
- Check-in opens at `<time>`.
- This appointment ended at `<time>`.
- This appointment was cancelled.
- You do not have a booked appointment today.
- This is not a valid Koupa attendance code.
- Your attendance is already confirmed.
- The connection failed; try again.

Result states must use text and icons rather than color alone.

## Boundaries

- Exactly 30 minutes before `starts_at`: valid.
- Earlier than that boundary: `TOO_EARLY`.
- Any time before `ends_at`: valid if all other checks pass.
- At or after `ends_at`: `TOO_LATE`.
- A repeat scan after success: `ALREADY_PRESENT`.
- A wrong barber, invalid QR, cancelled appointment, or unauthenticated call never changes appointment state.
- Undo is allowed only from `Present` and only by the appointment's barber.

## Verification

### Unit tests

- Build and parse the permanent QR payload.
- Reject malformed UUIDs, unrelated URLs, and unsupported QR content.
- Map every server result code to the intended Arabic message.

### Component tests

- Render camera permission loading, denied, permanently denied, and granted states.
- Lock scanning while validation is in flight.
- Render every success and failure result with the correct retry or close action.
- Refresh and navigate after `CHECKED_IN` and `ALREADY_PRESENT`.
- Render a real QR component with the expected payload on the barber screen.
- Hide raw payload text and hide the customer scan action for non-`Booked` appointments.
- Confirm barber undo before invoking it.

### Database integration tests

- Reject unauthenticated users and non-customer callers.
- Reject appointments owned by another customer.
- Cover both timing boundaries exactly.
- Cover wrong-barber, cancelled, absent, completed, and already-present states.
- Prove the transition, timestamp, audit record, and two notifications occur once.
- Issue simultaneous scans and prove there is one transition and one notification pair.
- Verify barber ownership and allowed states for undo.

### Native acceptance

Use installed Android builds and two signed-in devices to verify:

- camera permission grant, denial, and settings recovery;
- a real current-day appointment scan;
- early, wrong-barber, repeated, and invalid-code scans;
- barber undo followed by a second valid scan;
- the saved/printed QR can be decoded by the customer device.

Static tests do not replace this physical camera acceptance check.

## Out of Scope

- Customer proximity or GPS validation.
- Rotating or appointment-specific QR codes.
- Changes to the broader booking lifecycle beyond QR check-in and barber undo.
- Reopening completed, absent, or cancelled appointments.
