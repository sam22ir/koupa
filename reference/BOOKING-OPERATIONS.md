# Booking Operations

The `20260723000100_hardened_booking.sql` migration schedules `public.transition_overdue_appointments()` every minute through Supabase Cron. It changes overdue `booked` appointments to `absent` and elapsed `present` appointments to `completed`; each transition writes immutable in-app notification records in the same transaction.

Verify the scheduled job after staging and production deployment:

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

The job is database-only. Do not configure `APPOINTMENT_CRON_SECRET` or deploy the retired `appointment-transitions` Edge Function. Firebase delivery is intentionally not part of this milestone; the `notifications` table is the source of truth.
