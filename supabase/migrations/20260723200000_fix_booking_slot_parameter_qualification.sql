create or replace function public.booking_slot_is_available(
  barber_id uuid,
  service_id uuid,
  starts_at_value timestamptz,
  excluded_appointment_id uuid default null
)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  barber public.profiles%rowtype;
  service public.services%rowtype;
  local_start timestamp;
  local_end timestamp;
  local_date date;
  open_start time;
  open_end time;
  interval_value integer;
begin
  select * into barber from public.profiles where id = booking_slot_is_available.barber_id;
  select * into service from public.services service_row where service_row.id = booking_slot_is_available.service_id and service_row.barber_id = booking_slot_is_available.barber_id and service_row.is_active;
  if not found or not public.is_independent_published_barber(booking_slot_is_available.barber_id) then return false; end if;
  local_start := starts_at_value at time zone 'Africa/Algiers';
  local_end := local_start + make_interval(mins => service.duration_minutes);
  local_date := local_start::date;
  if local_end::date <> local_date
    or local_date < (now() at time zone 'Africa/Algiers')::date
    or local_date > (now() at time zone 'Africa/Algiers')::date + barber.booking_window_days
    or starts_at_value < now() + make_interval(mins => barber.minimum_notice_minutes) then return false; end if;
  select coalesce(exception.starts_at, schedule.starts_at), coalesce(exception.ends_at, schedule.ends_at), schedule.interval_minutes
  into open_start, open_end, interval_value
  from public.weekly_schedules schedule
  left join public.schedule_exceptions exception on exception.barber_id = schedule.barber_id and exception.exception_date = local_date
  where schedule.barber_id = booking_slot_is_available.barber_id
    and schedule.day_of_week = extract(dow from local_date)::smallint
    and coalesce(exception.is_closed, false) = false;
  if open_start is null
    or local_start::time < open_start
    or local_end::time > open_end
    or mod(extract(epoch from (local_start::time - open_start))::integer, interval_value * 60) <> 0 then return false; end if;
  if exists (
    select 1 from public.schedule_breaks breaks
    join public.weekly_schedules schedule on schedule.id = breaks.schedule_id
    where schedule.barber_id = booking_slot_is_available.barber_id
      and schedule.day_of_week = extract(dow from local_date)::smallint
      and starts_at_value < ((local_date + breaks.ends_at) at time zone 'Africa/Algiers')
      and ((local_date + breaks.starts_at) at time zone 'Africa/Algiers') < (starts_at_value + make_interval(mins => service.duration_minutes))
  ) then return false; end if;
  return not exists (
    select 1 from public.appointments appointment
    where appointment.barber_id = booking_slot_is_available.barber_id
      and appointment.status in ('booked', 'present')
      and appointment.id is distinct from excluded_appointment_id
      and appointment.starts_at < starts_at_value + make_interval(mins => service.duration_minutes)
      and starts_at_value < appointment.ends_at
  );
end;
$$;

create or replace function public.available_booking_slots(barber_id uuid, service_id uuid, local_date date)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare schedule record; service_duration integer; slot_start timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select service_row.duration_minutes into service_duration from public.services service_row where service_row.id = available_booking_slots.service_id and service_row.barber_id = available_booking_slots.barber_id and service_row.is_active;
  if service_duration is null or not public.is_independent_published_barber(available_booking_slots.barber_id) then return; end if;
  select coalesce(exception.starts_at, weekly.starts_at) as starts_at, coalesce(exception.ends_at, weekly.ends_at) as ends_at, weekly.interval_minutes
  into schedule from public.weekly_schedules weekly
  left join public.schedule_exceptions exception on exception.barber_id = weekly.barber_id and exception.exception_date = local_date
  where weekly.barber_id = available_booking_slots.barber_id and weekly.day_of_week = extract(dow from local_date)::smallint and coalesce(exception.is_closed, false) = false;
  if schedule.starts_at is null then return; end if;
  for slot_start in select generate_series((local_date + schedule.starts_at) at time zone 'Africa/Algiers', (local_date + schedule.ends_at - make_interval(mins => service_duration)) at time zone 'Africa/Algiers', make_interval(mins => schedule.interval_minutes)) loop
    if public.booking_slot_is_available(available_booking_slots.barber_id, available_booking_slots.service_id, slot_start) then starts_at := slot_start; ends_at := slot_start + make_interval(mins => service_duration); return next; end if;
  end loop;
end;
$$;

create or replace function public.book_appointment(barber_id uuid, service_id uuid, starts_at_value timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_customer_id uuid := auth.uid(); service public.services%rowtype; appointment_id uuid;
begin
  if v_customer_id is null or not exists (select 1 from public.profiles where id = v_customer_id and role = 'customer') then raise exception 'Customer authentication is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(book_appointment.barber_id::text, 0));
  select * into service from public.services service_row where service_row.id = book_appointment.service_id and service_row.barber_id = book_appointment.barber_id and service_row.is_active;
  if not found or not public.booking_slot_is_available(book_appointment.barber_id, book_appointment.service_id, starts_at_value) then raise exception 'Selected slot is unavailable'; end if;
  if exists (select 1 from public.appointments where customer_id = v_customer_id and status in ('booked', 'present')) then raise exception 'An active appointment already exists'; end if;
  insert into public.appointments (customer_id, barber_id, service_id, starts_at, ends_at, price_dzd)
  values (v_customer_id, book_appointment.barber_id, service.id, starts_at_value, starts_at_value + make_interval(mins => service.duration_minutes), service.price_dzd)
  returning id into appointment_id;
  perform public.insert_booking_notification(v_customer_id, 'تم تأكيد موعدك', 'تم حجز موعدك بنجاح.', appointment_id);
  perform public.insert_booking_notification(book_appointment.barber_id, 'موعد جديد', 'لديك موعد جديد في جدول اليوم.', appointment_id);
  return appointment_id;
end;
$$;

create or replace function public.reschedule_appointment(appointment_id uuid, service_id uuid, starts_at_value timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare customer_id uuid := auth.uid(); appointment public.appointments%rowtype; service public.services%rowtype;
begin
  select * into appointment from public.appointments appointment_row where appointment_row.id = reschedule_appointment.appointment_id;
  if customer_id is null or not found or appointment.customer_id <> customer_id or appointment.status <> 'booked' or appointment.starts_at <= now() then raise exception 'Appointment cannot be rescheduled'; end if;
  perform pg_advisory_xact_lock(hashtextextended(appointment.barber_id::text, 0));
  select * into service from public.services service_row where service_row.id = reschedule_appointment.service_id and service_row.barber_id = appointment.barber_id and service_row.is_active;
  if not found or not public.booking_slot_is_available(appointment.barber_id, reschedule_appointment.service_id, starts_at_value, reschedule_appointment.appointment_id) then raise exception 'Selected slot is unavailable'; end if;
  update public.appointments set service_id = service.id, starts_at = starts_at_value, ends_at = starts_at_value + make_interval(mins => service.duration_minutes), price_dzd = service.price_dzd where id = reschedule_appointment.appointment_id;
  perform public.insert_booking_notification(appointment.barber_id, 'تم تعديل موعد', 'قام العميل بتعديل موعده.', reschedule_appointment.appointment_id);
  return reschedule_appointment.appointment_id;
end;
$$;
