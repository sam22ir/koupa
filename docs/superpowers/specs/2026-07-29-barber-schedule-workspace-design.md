# Koupa Barber Schedule Workspace Design

Date: 2026-07-29
Status: Approved visual direction

## Scope

Redesign the barber Schedule tab as a complete mobile workspace for booking availability. The screen covers global booking status, weekly working hours, breaks, date-specific exceptions, services, prices, durations, appointment interval, booking window, and minimum notice.

The redesign preserves the existing barber navigation, Arabic-first RTL presentation, Algeria timezone, Supabase ownership rules, and Teal Stage visual language. It does not add service ordering, analytics, capacity management, staff scheduling, or recurring exceptions.

## Direction

Use the selected **Tabbed workspace** composition:

- A compact teal header provides brand, title, subtitle, and dirty-state feedback.
- A positive global booking-status control sits above the workspace tabs.
- Three stable tabs organize `الجدول`, `الخدمات`, and `الإعدادات`.
- Only the selected tab's editor is rendered, avoiding one long form.
- One sticky `حفظ التغييرات` action saves the complete draft.
- Individual settings use constrained controls instead of raw numeric fields wherever the product defines valid options.

The page must feel like an operational settings tool rather than a collection of unrelated form fields. Use restrained list surfaces and separators; do not put cards inside cards or create a metric dashboard.

## Header And Booking Status

The header follows the approved barber Today treatment:

- Full transparent English `Koupa` logo in white on the physical left.
- Title: `الجدول والخدمات`.
- Subtitle: `إدارة أوقات العمل والحجوزات`.
- When the draft differs from the loaded state, show `تغييرات غير محفوظة` as a quiet status indicator.

Replace the negative `إيقاف الحجز` switch with a positive `استقبال الحجوزات` control. Its UI value is the inverse of `isBookingPaused`:

- On: customers can create bookings.
- Off: bookings are paused and the workspace shows `الحجوزات متوقفة`.

Turning the control off requires confirmation because it affects customer booking immediately after Save. Turning it back on does not require confirmation. The control only changes the local draft until the shared Save succeeds.

## Workspace Tabs

Render a three-option segmented control below booking status:

1. `الجدول`
2. `الخدمات`
3. `الإعدادات`

The active tab is visually distinct and exposed through selected accessibility state. Tabs do not navigate to new routes, discard state, or trigger a save. A tab with invalid draft data displays a small error indicator after validation.

## Schedule Tab

### Weekly hours

Render all seven days from Sunday through Saturday, matching the existing `day_of_week` mapping without changing stored values. Each compact row shows:

- Arabic day name.
- Open or closed state.
- Start and end time when open.
- A disclosure action that expands the day editor.

Only one day editor is expanded at a time. The editor contains:

- Open/closed switch.
- Platform-appropriate start and end time controls.
- Zero or more break rows, each with start, end, and remove actions.
- `إضافة استراحة`.
- `نسخ الأوقات` to apply that day's open state, hours, and breaks to selected days.

Changing a day or break updates the shared local draft only. Closing a day retains its previous times in memory so reopening it does not require re-entry, but closed-day times are not submitted as active availability.

### Date-specific exceptions

Place exceptions below weekly hours as dated rows. Each row shows the localized date, optional note, and either `مغلق طوال اليوم` or its special hours.

`إضافة استثناء` opens a focused editor with:

- One calendar date in the `Africa/Algiers` booking timezone.
- Mode: closed all day or special hours.
- Start and end time for special hours.
- Optional private note.

An exception can be edited or marked for removal before Save. Only one exception may exist per barber and date. Exceptions override weekly hours for that date. Recurring holidays and multi-day ranges are outside this scope.

## Services Tab

Show active services as compact rows with name, DZD price, and duration. Tapping a row opens a focused service editor. `إضافة خدمة` opens the same editor with an empty draft.

The editor contains:

- Service name.
- Positive DZD price.
- Positive duration in minutes.
- `أرشفة الخدمة` for an existing active service.

Archiving requires confirmation. It sets `isActive` to false after Save, removes the service from new booking choices, and preserves historical appointment references. It is not a hard delete.

Archived services live in a collapsed `الخدمات المؤرشفة` section. Each archived row shows the same identifying information and an `استعادة` action that returns it to the active draft. Manual service reordering is not included.

## Booking Settings Tab

Replace free-text controls with the options already defined by the domain:

- `فاصل المواعيد`: segmented `5`, `10`, `15`, or `30` minutes.
- `نافذة الحجز`: menu values `1`, `3`, `7`, `14`, or `30` days.
- `الحد الأدنى للإشعار`: `بدون`, `30 دقيقة`, `ساعة`, or `ساعتان`.

Controls expose their selected value and do not allow arbitrary numeric entry. The global booking-status control is not repeated inside this tab.

## Draft And Save Model

Load settings, active and archived services, weekly schedules, breaks, and future exceptions into one screen-level draft. Keep an immutable loaded snapshot for dirty comparison.

The sticky `حفظ التغييرات` action:

- Remains visible above the barber tab bar and safe area on every workspace tab.
- Is disabled while loading, saving, unchanged, or invalid.
- Uses stable dimensions while showing progress.
- Validates the complete draft before any network mutation.
- Saves booking policy, weekly hours, breaks, service archive state, and exception upserts/removals in one database transaction.
- Replaces the loaded snapshot only after the server confirms success.

Add a new `replace_barber_workspace_settings` RPC that accepts exceptions, exception removals, and active or inactive services in the same transaction. Preserve `replace_barber_settings` for existing callers during migration, but route this workspace exclusively through the new RPC. The old immediate exception upsert/delete behavior must not be used from this workspace.

On success, show a brief `تم حفظ التغييرات` confirmation and clear dirty state. On failure, retain the complete draft, show a contextual error, and leave the loaded snapshot unchanged.

Attempting to leave the route with unsaved changes prompts:

- `حفظ`: validate and save, then continue navigation after success.
- `تجاهل`: restore the loaded snapshot and continue.
- `متابعة التعديل`: remain on the page.

## Validation

Validation runs at field level during editing and across the full draft on Save:

- At least one active service is required.
- Active services require a non-empty name, positive price, and positive duration.
- At least one weekly day must be open.
- Open-day start time must precede end time.
- Breaks must be valid, contained within working hours, and non-overlapping.
- Special exception start time must precede end time.
- Exception dates must be valid and unique.
- Booking interval, window, and notice must be one of the supported options.

Invalid fields show inline Arabic errors. The owning workspace tab receives an error indicator, and Save focuses or switches to the first invalid section.

## Loading And Error States

- Initial loading uses stable header, tab, and row skeletons instead of replacing the page with a centered spinner.
- Reload failure shows a retry surface and does not present an editable empty draft as real settings.
- Save failure keeps all edits visible.
- Archive, restore, and exception removal are draft operations and therefore cannot fail independently before Save.
- Duplicate submissions and conflicting editor actions are disabled while saving.

## Accessibility And Responsive Behavior

- Maintain Arabic RTL visual and reading order.
- All interactive targets are at least 48x48 logical pixels.
- Tabs expose selected state; switches expose checked state and positive labels.
- Time controls, menus, service actions, break actions, and archive confirmations have explicit Arabic accessibility labels.
- Status is never communicated through color alone.
- Long service names and larger text wrap without overlapping price, duration, actions, or the sticky Save area.
- At 342x646, the header, tabs, selected editor, sticky Save, and barber tab bar remain reachable without horizontal scrolling.

## Component And Data Boundaries

- Keep route composition and shared draft ownership in `app/(barber)/schedule.tsx`.
- Extract focused feature components under `src/features/barber-schedule/` for the workspace tabs, day editor, exception editor, service editor, booking controls, and sticky Save bar.
- Keep pure draft mutation, dirty comparison, and validation helpers outside React for deterministic tests.
- Keep `useBarberSettings` as the thin screen facade over typed settings services.
- Consolidate exception loading and saving into the settings service contract; do not coordinate independent saves from the route.
- Extend generated Supabase types after the transactional RPC migration.

## Testing And Verification

Automated coverage must include:

- Positive booking-status inversion and pause confirmation.
- Tab switching without draft loss.
- Weekly day editing, closing/reopening, breaks, and copy-to-days.
- Break containment and overlap validation.
- Closed and special-hours exception creation, editing, uniqueness, and removal.
- Service creation, editing, archive, restore, and at-least-one-active validation.
- Constrained interval, window, and notice options.
- Dirty-state detection, unchanged Save disablement, tab error indicators, and navigation guard choices.
- One transactional payload containing settings, services, schedules, breaks, and exceptions.
- Server-side rollback when any part of the payload is invalid or fails.

Runtime verification at 342x646 and a larger Android viewport must cover all three tabs, editor overlays, keyboard reachability, sticky Save placement, long Arabic content, loading, validation, success, failure, and unsaved-navigation states.

## Acceptance Criteria

- The Schedule tab exposes the complete MVP scheduling workflow instead of only booking numbers and service fields.
- The selected tabbed workspace keeps weekly hours, services, and booking rules distinct and easy to scan.
- Date-specific exceptions and multiple breaks are editable.
- Service removal uses archive/restore and preserves history.
- Booking values use constrained product options rather than arbitrary numeric input.
- One explicit sticky Save commits the complete valid draft atomically.
- Failed saves cannot partially replace schedules, services, booking rules, or exceptions.
- The page follows the approved Teal Stage brand language and remains usable at 342px width.
