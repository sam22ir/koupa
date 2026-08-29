# Booking Operations

## Appointment transitions (database cron)

The `20260723000100_hardened_booking.sql` migration schedules `public.transition_overdue_appointments()` every minute through Supabase Cron. Migration `20260729000200_qr_check_in_workflow.sql` keeps that schedule but changes the `Booked` to `Absent` boundary to `ends_at`, preserving the approved QR check-in window through the appointment end. Elapsed `Present` appointments still become `Completed`; each transition writes immutable in-app notification records in the same transaction.

### Last runtime verification 2026-08-18

| Environment | Job | Schedule | Active | Recent runs |
|---|---|---|---|---|
| Staging `zhdwaizroczkqzwrvfxf` | `koupa-appointment-transitions` | `* * * * *` | yes | succeeded (sampled) |
| Staging `zhdwaizroczkqzwrvfxf` | `koupa-notification-dispatch` | `* * * * *` | yes | present |
| Production `hrcwhswzscfbpbllqkri` | `koupa-appointment-transitions` | `* * * * *` | yes | present |
| Production `hrcwhswzscfbpbllqkri` | `koupa-notification-dispatch` | `* * * * *` | yes | present |

Command on both: `select public.transition_overdue_appointments()`

Verify after deploys:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'koupa-appointment-transitions';

select status, start_time, end_time, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'koupa-appointment-transitions')
order by start_time desc
limit 20;
```

The appointment transition job is **database-only**. Do not configure `APPOINTMENT_CRON_SECRET` or rely on the retired `appointment-transitions` Edge Function (still listed ACTIVE historically; safe to undeploy once ops confirms no external callers).

Remote Firebase delivery is handled separately by `dispatch-notifications` (see `PUSH-NOTIFICATIONS.md`). The `notifications` table remains the source of truth; delivery metadata is stored on each row.

## QR attendance operations

Each barber has one permanent `koupa://check-in/<barber-id>` payload. The client parses the code, but `check_in_with_barber_qr(uuid)` is the only authority for eligibility. It returns one of `CHECKED_IN`, `ALREADY_PRESENT`, `WRONG_BARBER`, `TOO_EARLY`, `TOO_LATE`, `CANCELLED`, or `NO_ACTIVE_APPOINTMENT`.

The `Booked` to `Present` update is conditional and atomic. Only the winning request records an `appointment_attendance_events` row and creates the customer/barber notification pair. Repeat or concurrent scans return `ALREADY_PRESENT` without duplicate notifications.

`undo_qr_check_in(uuid)` is barber-owned and works only when the appointment is still `Present` and has an unreversed customer-QR attendance event. It returns the appointment to `Booked`, records who reversed the event, and notifies the customer. Manual barber Present actions are not QR-reversible.

Run the local-only verification after a clean reset:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/qr_check_in.sql
POSTGRES_URL="$DATABASE_URL" bash supabase/tests/qr_check_in_concurrency.sh
```

Native acceptance requires an installed Android build, a barber account, a customer account with a current appointment, and a real camera scan. Static tests do not prove camera permission recovery or printed-code decoding.

## Atomic barber write paths

| Client path | RPC | Notes |
|---|---|---|
| Barber onboarding publish | `publish_barber_profile(jsonb)` | Profile + services + schedules + breaks + draft delete |
| Barber settings save | `replace_barber_settings(jsonb)` | Soft-deactivate services, replace hours atomically |
| Shop owner edits member settings | `shop_owner_update_barber_settings(uuid, jsonb)` | Shared helper `apply_barber_settings_payload` |

Do not reintroduce multi-table client write loops for these paths.

## Production schema parity

Production and staging migration lists matched through
`20260818000100_phone_sign_in_alias.sql` on 2026-08-18 (includes nearby search,
notification destinations, and phone uniqueness). Production push secrets including
`FIREBASE_SERVICE_ACCOUNT_JSON` for `koupa-prod` were set on 2026-08-18.
