# Customer Appointment Detail Design

Date: 2026-08-01
Status: Approved direction, implementation pending

## Goal

Make the customer appointment detail screen immediately explain the appointment state, show the important facts compactly, and expose only actions that are valid for that state.

## Shared Layout

- Keep the full white `كوپا` logo and gold accent in the Teal Stage header.
- Show the service name and barber/shop identity directly below the logo.
- Use a prominent status banner before the facts so `محجوز`, `حاضر`, `مكتمل`, `غائب`, and `ملغى` are understandable without relying on color alone.
- Present date, time, price, and status in a compact two-column facts grid that wraps long Arabic names safely.

## State-Specific Behavior

### Canceled

Show `ملغى` with a short explanation that the appointment is no longer editable. Hide reschedule, cancellation, QR, and rating actions. Provide one `العودة إلى مواعيدي` action.

### Booked

Keep `إدارة الموعد` as the primary route-safe action. Show QR and reschedule only for booked appointments. Show cancellation only while `canCancelCustomerAppointment(starts_at)` is true and keep the existing confirmation dialog.

### Present

Keep the record and management route visible. Hide QR rescan, reschedule, and cancellation; the barber attendance state is already active.

### Completed

Keep the read-only facts and expose the existing rating control. If a rating exists, retain the edit-rating path.

### Absent

Keep the record read-only with no booking, QR, or destructive actions.

## Data And Boundaries

Continue loading the appointment through `loadCustomerAppointments()` and selecting by route `id`. Keep `appointment/[id]` as the detail boundary. Reuse existing booking cancellation, reschedule, QR, and rating services; no Supabase or schema changes are required.

If the appointment is missing, keep the stage visible and show an error plus a return action instead of a blank shell. Preserve loading and fetch errors explicitly.

## Remove And Add Decisions

Remove the current undifferentiated detail card and unavailable actions from canceled/present/absent states. Add the status banner, facts grid, explanatory canceled state, explicit return action, and state-specific action visibility. Do not delete historical appointments.

## Verification

Add focused tests for booked, present, completed, absent, canceled, missing, and loading states. Assert that long service/barber names render, canceled records expose no destructive actions, completed records retain rating, and the return action navigates to Appointments. Verify the route at mobile width and HTTP reachability on the local Expo server.
