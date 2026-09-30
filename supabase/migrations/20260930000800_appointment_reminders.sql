-- Push reminders for customers: one day and one hour before a booked appointment.
--
-- A reminder is only owed for an appointment that was scheduled far enough ahead:
-- booking (or rescheduling to) a slot that is already inside the 24 h / 1 h window
-- marks that reminder as covered, so nobody is reminded seconds after booking.
-- Each reminder is stamped on the appointment, so it is sent at most once.

alter table public.appointments
  add column if not exists reminder_day_sent_at timestamptz,
  add column if not exists reminder_hour_sent_at timestamptz;

create or replace function public.stamp_appointment_reminders()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.starts_at is distinct from old.starts_at then
    new.reminder_day_sent_at := case
      when new.starts_at - now() <= interval '24 hours' then now() else null end;
    new.reminder_hour_sent_at := case
      when new.starts_at - now() <= interval '1 hour' then now() else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_stamp_reminders on public.appointments;
create trigger appointments_stamp_reminders
  before insert or update of starts_at on public.appointments
  for each row execute function public.stamp_appointment_reminders();

-- Appointments that already exist follow the same rule, so deploying does not
-- send a burst of reminders for bookings made inside the window.
update public.appointments
set reminder_day_sent_at = case when starts_at - now() <= interval '24 hours' then now() end,
    reminder_hour_sent_at = case when starts_at - now() <= interval '1 hour' then now() end
where status = 'booked';

create or replace function public.send_appointment_reminders()
returns table(day_count integer, hour_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  reminder record;
  day_total integer := 0;
  hour_total integer := 0;
begin
  -- One hour before (checked first so an appointment inside both windows gets the closer reminder).
  for reminder in
    select appointment.id, appointment.customer_id, appointment.starts_at,
           coalesce(barber.name, 'الحلاق') as barber_name
    from public.appointments appointment
    join public.profiles barber on barber.id = appointment.barber_id
    where appointment.status = 'booked'
      and appointment.reminder_hour_sent_at is null
      and appointment.starts_at > now()
      and appointment.starts_at <= now() + interval '1 hour'
    for update of appointment skip locked
  loop
    update public.appointments
    set reminder_hour_sent_at = now(),
        reminder_day_sent_at = coalesce(reminder_day_sent_at, now())
    where id = reminder.id;
    perform public.insert_booking_notification(
      reminder.customer_id,
      'موعدك بعد ساعة',
      'موعدك مع ' || reminder.barber_name || ' الساعة '
        || to_char(reminder.starts_at at time zone 'Africa/Algiers', 'HH24:MI') || '. لا تتأخر.',
      reminder.id
    );
    hour_total := hour_total + 1;
  end loop;

  -- One day before.
  for reminder in
    select appointment.id, appointment.customer_id, appointment.starts_at,
           coalesce(barber.name, 'الحلاق') as barber_name
    from public.appointments appointment
    join public.profiles barber on barber.id = appointment.barber_id
    where appointment.status = 'booked'
      and appointment.reminder_day_sent_at is null
      and appointment.starts_at > now()
      and appointment.starts_at <= now() + interval '24 hours'
    for update of appointment skip locked
  loop
    update public.appointments set reminder_day_sent_at = now() where id = reminder.id;
    perform public.insert_booking_notification(
      reminder.customer_id,
      'تذكير بموعدك غدا',
      'موعدك مع ' || reminder.barber_name || ' غدا الساعة '
        || to_char(reminder.starts_at at time zone 'Africa/Algiers', 'HH24:MI') || '.',
      reminder.id
    );
    day_total := day_total + 1;
  end loop;

  return query select day_total, hour_total;
end;
$$;

revoke all on function public.send_appointment_reminders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'koupa-appointment-reminders') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'koupa-appointment-reminders';
  end if;
  perform cron.schedule('koupa-appointment-reminders', '*/5 * * * *', 'select public.send_appointment_reminders()');
end;
$$;
