# Customer Home Booking-First Design

Date: 2026-07-31
Status: Ready for user review

## Brief And Direction

This is a redesign of the Arabic-first customer Home route in Koupa. The screen should help a customer start or manage a barber booking quickly. It should not duplicate the Find or Appointments tabs, and it should not introduce a second favorites system.

The selected direction is **booking-first**. The visual language remains the existing Teal Stage system: deep teal stage, warm-gold accent, IBM Plex Sans Arabic, RTL layout, initials instead of profile photos, and soft product surfaces.

The approved behavior is:

- With no upcoming appointment, Home presents one prominent `اعثر على حلاق` action.
- The customer can optionally see up to three recent barbers derived from completed appointments.
- Tapping a recent barber opens the public barber profile before service selection.
- With an upcoming appointment, one appointment card owns the next action through `إدارة الموعد`.
- QR attendance, rescheduling, and cancellation remain contextual secondary actions on that card.
- The Appointments and Find bottom tabs remain the only global destinations for those workflows.

## Changes To The Current Screen

### Remove

- Remove the duplicate full-width search row from Home. Search belongs to Find.
- Remove the duplicate `اكتشف حلاق` tile. It repeats the primary empty-state CTA.
- Remove the duplicate `مواعيدي` tile. The bottom tab is the single appointments shortcut.
- Do not add a saved/favorites control in this pass.

### Add

- Add a recent-barbers section when completed appointment history provides entries.
- Add an inline skeleton that preserves the stage and content rhythm during the initial appointment fetch.
- Add a retry action for appointment-load failures without presenting a false no-appointment state.

### Edit

- Change the no-appointment stage subtitle from a repeated status statement to a direct booking invitation.
- Keep the greeting and Teal Stage brand treatment, but reduce the visual weight of the empty state so the primary booking action arrives earlier.
- Keep the current appointment detail, QR, reschedule, and cancel routes. Reorder their visual priority so `إدارة الموعد` is the only filled primary button.

## Information Architecture

### Shared stage

The stage contains the transparent Koupa mark, the tagline, a gold accent bar, the customer's greeting, and a state-specific subtitle:

- No upcoming appointment: `ابدئي بحجز موعدك القادم.`
- Upcoming appointment: `نراك في الموعد المحدد.`

The stage does not contain a search field, appointment list, or secondary action tiles.

### No upcoming appointment

The first body surface is a single booking card containing:

- An appointment/search icon.
- `اعثر على حلاق` heading.
- Short supporting copy about searching by time and location.
- One full-width `اعثر على حلاق` button that opens `/(customer)/find`.

If recent barbers exist, the next section is `حلاقون زرتهم مؤخرا`. Each row contains the barber's initials, name, last completed-appointment date, and a text action that opens `/barber/[id]`. The row does not jump directly into booking because the customer should be able to re-check services, price, location, and availability.

If there are no completed appointments, the recent section is omitted rather than replaced with an additional empty card.

### Upcoming appointment

The body contains one elevated appointment card with:

- Status chip and localized appointment date/time.
- Service name.
- Barber initials and name.
- Existing duration and DZD price chips.
- Filled `إدارة الموعد` button leading to `/appointment/[id]`.
- Secondary links below the button:
  - `رمز الحضور` only while status is `booked`.
  - `إعادة الجدولة` only while status is `booked`, preserving the existing barber and service context.
  - `إلغاء الموعد` as a muted destructive action with confirmation.

The recent-barbers section may follow this card when history exists. It never displaces the appointment card or duplicates its barber as a separate booking tile.

## Data And State Behavior

No database or Supabase RPC changes are required.

`loadCustomerAppointments()` remains the only Home data source. A pure helper derives recent barbers as follows:

1. Keep appointments with `status === 'completed'` and a valid `barber_id`.
2. Sort by `starts_at` descending.
3. Keep one entry per barber, using the newest completed appointment as `lastVisitedAt`.
4. Limit the result to three entries.
5. Preserve the barber ID for profile navigation and use the appointment's barber name when available.

The current upcoming appointment is still selected from `booked` or `present` appointments. It is not added to the recent list until it becomes completed.

### Loading

Do not pass `loading` to `Screen` in a way that replaces the complete page with a spinner. Keep the stage visible and render skeleton blocks for the body card and optional recent rows. This prevents layout jumps and keeps the user oriented.

### Error

Keep the stage visible and show an inline error with `إعادة المحاولة`. If no previous appointment data exists, do not render the no-appointment booking CTA while the load error is active. If a refresh fails after data is already visible, preserve the last known appointment and recent-barber content alongside the error.

### Mutations

After a successful cancellation or reschedule, reload the appointment list before returning the updated Home state. A failed mutation keeps the current card visible and displays the contextual error. Destructive cancellation remains confirmation-gated.

## Component And File Boundaries

- `app/(customer)/home.tsx`: state orchestration, route actions, shared stage, and appointment card composition.
- `src/customerHome.ts`: pure `deriveRecentBarbers` helper and its typed result, with no React or Supabase dependency.
- `src/features/customer-home/RecentBarbers.tsx`: RTL recent-barber list, row accessibility, and profile navigation callback.
- `src/features/customer-home/CustomerHomeSkeleton.tsx`: body skeleton layout used during initial load.
- `src/i18n/ar.ts`: new Home copy for booking invitation, recent barbers, last-visit labels, retry, and loading state.
- `__tests__/customerHome.test.ts`: deterministic helper tests for deduplication, sorting, status filtering, and limit.
- `__tests__/customerHomeScreen.test.tsx`: UI tests for empty, upcoming, recent, loading, error, QR visibility, and navigation behavior.

The existing booking service, appointment detail route, public barber profile route, and bottom navigation remain the integration boundaries. No new backend persistence or favorites table is introduced.

## Visual And Interaction Rules

- Preserve Arabic-first RTL and IBM Plex Sans Arabic.
- Keep one accent family: deep teal for primary actions and warm gold for status emphasis only.
- Use one filled primary button per state. Links and secondary actions must not visually compete with it.
- Keep all interactive targets at least 44 logical pixels and provide Arabic accessibility labels.
- Do not rely on color alone for appointment status or destructive actions.
- Keep long barber and service names wrapped without pushing actions off-screen at 342x646.
- Prefer one elevated appointment surface and one recent list surface over nested cards and repeated tiles.
- Use initials for recent barbers, matching the MVP restriction against uploaded profile photos.

## Testing And Verification

Automated tests must cover:

- Empty Home renders exactly one discovery CTA and no duplicate search/discover/appointments tiles.
- Recent-barber derivation filters non-completed appointments, deduplicates by barber, sorts newest first, and limits to three.
- Recent-barber rows navigate to the public barber profile.
- Upcoming booked appointment shows manage, QR, reschedule, and cancel actions.
- Upcoming present appointment hides QR and keeps the appointment visible.
- Loading preserves the stage and renders skeleton content.
- Initial load errors show retry without the false no-appointment CTA.
- Cancellation confirmation and post-mutation refresh preserve or update visible state correctly.
- Arabic long names, RTL order, accessibility labels, and no horizontal overflow at 342x646.

Runtime verification must cover the local `/home` route at 342x646 and a larger Android viewport, including initial loading, empty history, completed-history recent barbers, booked appointments, present appointments, failed refresh, cancellation confirmation, and navigation into Find, Appointments, and barber profile routes.

## Acceptance Criteria

- Home has one clear primary job: start or manage a barber booking.
- The no-appointment state does not repeat the same Find action in multiple cards or rows.
- Recent barbers are derived from existing completed appointments and never appear as fake favorites.
- Upcoming appointment editing and cancellation remain available without adding competing primary buttons.
- Loading and error states never masquerade as an empty account.
- The design preserves the Teal Stage system, Arabic RTL requirements, and existing route contracts.
