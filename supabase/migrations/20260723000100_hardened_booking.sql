create extension if not exists pg_trgm;
create extension if not exists pg_cron;

create or replace function public.normalize_booking_search(value text)
returns text language sql immutable strict set search_path = public as $$
  select regexp_replace(
    translate(lower(value), 'إأآٱىئـ', 'اااايي'),
    '[[:space:]\u064B-\u065F\u0670]+', '', 'g'
  );
$$;

create index if not exists profiles_booking_search_idx on public.profiles
  using gin (public.normalize_booking_search(coalesce(name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(neighborhood, '')) gin_trgm_ops)
  where role = 'barber' and is_published;

create or replace function public.is_independent_published_barber(barber_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = barber_id
      and profile.role = 'barber'
      and profile.is_published
      and not profile.is_booking_paused
      and not exists (
        select 1 from public.shop_memberships membership
        where membership.barber_id = profile.id
          and membership.status in ('pending', 'active')
      )
  );
$$;

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
  select * into barber from public.profiles where id = barber_id;
  select * into service from public.services service_row where service_row.id = booking_slot_is_available.service_id and service_row.barber_id = booking_slot_is_available.barber_id and service_row.is_active;
  if not found or not public.is_independent_published_barber(barber_id) then return false; end if;
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
    where appointment.barber_id = barber_id
      and appointment.status in ('booked', 'present')
      and appointment.id is distinct from excluded_appointment_id
      and appointment.starts_at < starts_at_value + make_interval(mins => service.duration_minutes)
      and starts_at_value < appointment.ends_at
  );
end;
$$;

create or replace function public.search_published_barbers(search_query text default '', city_query text default '', page_number integer default 0)
returns table (id uuid, name text, bio text, city text, neighborhood text, maps_url text, phone text)
language sql stable security definer set search_path = public as $$
  select profile.id, profile.name, profile.bio, profile.city, profile.neighborhood, profile.maps_url, profile.phone
  from public.profiles profile
  where public.is_independent_published_barber(profile.id)
    and (coalesce(search_query, '') = '' or public.normalize_booking_search(profile.name || ' ' || coalesce(profile.city, '') || ' ' || coalesce(profile.neighborhood, '')) like '%' || public.normalize_booking_search(search_query) || '%')
    and (coalesce(city_query, '') = '' or public.normalize_booking_search(coalesce(profile.city, '')) = public.normalize_booking_search(city_query))
  order by profile.name
  limit 20 offset greatest(page_number, 0) * 20;
$$;

create or replace function public.get_public_barber_profile(barber_id uuid)
returns table (id uuid, name text, bio text, city text, neighborhood text, maps_url text, phone text, booking_window_days integer, services jsonb, weekly_hours jsonb)
language sql stable security definer set search_path = public as $$
  select profile.id, profile.name, profile.bio, profile.city, profile.neighborhood, profile.maps_url, profile.phone, profile.booking_window_days,
    coalesce((select jsonb_agg(jsonb_build_object('id', service.id, 'name', service.name, 'price_dzd', service.price_dzd, 'duration_minutes', service.duration_minutes) order by service.name) from public.services service where service.barber_id = profile.id and service.is_active), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('day_of_week', schedule.day_of_week, 'starts_at', schedule.starts_at, 'ends_at', schedule.ends_at) order by schedule.day_of_week) from public.weekly_schedules schedule where schedule.barber_id = profile.id), '[]'::jsonb)
  from public.profiles profile where profile.id = barber_id and public.is_independent_published_barber(profile.id);
$$;

create or replace function public.available_booking_slots(barber_id uuid, service_id uuid, local_date date)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare schedule record; service_duration integer; slot_start timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select service_row.duration_minutes into service_duration from public.services service_row where service_row.id = available_booking_slots.service_id and service_row.barber_id = available_booking_slots.barber_id and service_row.is_active;
  if service_duration is null or not public.is_independent_published_barber(barber_id) then return; end if;
  select coalesce(exception.starts_at, weekly.starts_at) as starts_at, coalesce(exception.ends_at, weekly.ends_at) as ends_at, weekly.interval_minutes
  into schedule from public.weekly_schedules weekly
  left join public.schedule_exceptions exception on exception.barber_id = weekly.barber_id and exception.exception_date = local_date
  where weekly.barber_id = available_booking_slots.barber_id and weekly.day_of_week = extract(dow from local_date)::smallint and coalesce(exception.is_closed, false) = false;
  if schedule.starts_at is null then return; end if;
  for slot_start in select generate_series((local_date + schedule.starts_at) at time zone 'Africa/Algiers', (local_date + schedule.ends_at - make_interval(mins => service_duration)) at time zone 'Africa/Algiers', make_interval(mins => schedule.interval_minutes)) loop
    if public.booking_slot_is_available(barber_id, service_id, slot_start) then starts_at := slot_start; ends_at := slot_start + make_interval(mins => service_duration); return next; end if;
  end loop;
end;
$$;

create or replace function public.insert_booking_notification(recipient_id uuid, title_value text, body_value text, appointment_id_value uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, appointment_id) values (recipient_id, title_value, body_value, appointment_id_value);
$$;

create or replace function public.book_appointment(barber_id uuid, service_id uuid, starts_at_value timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_customer_id uuid := auth.uid(); service public.services%rowtype; appointment_id uuid;
begin
  if v_customer_id is null or not exists (select 1 from public.profiles where id = v_customer_id and role = 'customer') then raise exception 'Customer authentication is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(barber_id::text, 0));
  select * into service from public.services service_row where service_row.id = book_appointment.service_id and service_row.barber_id = book_appointment.barber_id and service_row.is_active;
  if not found or not public.booking_slot_is_available(barber_id, service_id, starts_at_value) then raise exception 'Selected slot is unavailable'; end if;
  if exists (select 1 from public.appointments where customer_id = v_customer_id and status in ('booked', 'present')) then raise exception 'An active appointment already exists'; end if;
  insert into public.appointments (customer_id, barber_id, service_id, starts_at, ends_at, price_dzd)
  values (v_customer_id, barber_id, service.id, starts_at_value, starts_at_value + make_interval(mins => service.duration_minutes), service.price_dzd)
  returning id into appointment_id;
  perform public.insert_booking_notification(v_customer_id, 'تم تأكيد موعدك', 'تم حجز موعدك بنجاح.', appointment_id);
  perform public.insert_booking_notification(barber_id, 'موعد جديد', 'لديك موعد جديد في جدول اليوم.', appointment_id);
  return appointment_id;
end;
$$;

create or replace function public.reschedule_appointment(appointment_id uuid, service_id uuid, starts_at_value timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare customer_id uuid := auth.uid(); appointment public.appointments%rowtype; service public.services%rowtype;
begin
  select * into appointment from public.appointments where id = appointment_id;
  if customer_id is null or not found or appointment.customer_id <> customer_id or appointment.status <> 'booked' or appointment.starts_at <= now() then raise exception 'Appointment cannot be rescheduled'; end if;
  perform pg_advisory_xact_lock(hashtextextended(appointment.barber_id::text, 0));
  select * into service from public.services service_row where service_row.id = reschedule_appointment.service_id and service_row.barber_id = appointment.barber_id and service_row.is_active;
  if not found or not public.booking_slot_is_available(appointment.barber_id, service_id, starts_at_value, appointment_id) then raise exception 'Selected slot is unavailable'; end if;
  update public.appointments set service_id = service.id, starts_at = starts_at_value, ends_at = starts_at_value + make_interval(mins => service.duration_minutes), price_dzd = service.price_dzd where id = appointment_id;
  perform public.insert_booking_notification(appointment.barber_id, 'تم تعديل موعد', 'قام العميل بتعديل موعده.', appointment_id);
  return appointment_id;
end;
$$;

create or replace function public.cancel_customer_appointment(appointment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare appointment public.appointments%rowtype;
begin
  select * into appointment from public.appointments where id = appointment_id;
  if auth.uid() is null or not found or appointment.customer_id <> auth.uid() or appointment.status <> 'booked' or appointment.starts_at < now() + interval '2 hours' then raise exception 'Appointment cannot be cancelled'; end if;
  update public.appointments set status = 'cancelled', cancelled_at = now() where id = appointment_id;
  perform public.insert_booking_notification(appointment.barber_id, 'تم إلغاء موعد', 'قام العميل بإلغاء موعده.', appointment_id);
end;
$$;

create or replace function public.cancel_barber_appointment(appointment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare appointment public.appointments%rowtype;
begin
  select * into appointment from public.appointments where id = appointment_id;
  if auth.uid() is null or not found or appointment.barber_id <> auth.uid() or appointment.status <> 'booked' then raise exception 'Appointment cannot be cancelled'; end if;
  update public.appointments set status = 'cancelled', cancelled_at = now() where id = appointment_id;
  perform public.insert_booking_notification(appointment.customer_id, 'تم إلغاء الموعد', 'قام الحلاق بإلغاء موعدك.', appointment_id);
end;
$$;

create or replace function public.mark_appointment_present(appointment_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare appointment public.appointments%rowtype;
begin
  select * into appointment from public.appointments where id = appointment_id;
  if auth.uid() is null or not found or appointment.barber_id <> auth.uid() or appointment.status <> 'booked' or appointment.ends_at <= now() then raise exception 'Appointment cannot be checked in'; end if;
  update public.appointments set status = 'present', qr_checked_in_at = now() where id = appointment_id;
  perform public.insert_booking_notification(appointment.customer_id, 'تم تأكيد حضورك', 'تم تسجيل حضورك للموعد.', appointment_id);
  return appointment_id;
end;
$$;

create or replace function public.barber_today_appointments()
returns table (id uuid, customer_name text, customer_phone text, service_name text, price_dzd integer, starts_at timestamptz, ends_at timestamptz, status public.appointment_status)
language sql stable security definer set search_path = public as $$
  select appointment.id, customer.name, customer.phone, service.name, appointment.price_dzd, appointment.starts_at, appointment.ends_at, appointment.status
  from public.appointments appointment
  join public.profiles customer on customer.id = appointment.customer_id
  join public.services service on service.id = appointment.service_id
  where appointment.barber_id = auth.uid()
    and (appointment.starts_at at time zone 'Africa/Algiers')::date = (now() at time zone 'Africa/Algiers')::date
  order by appointment.starts_at;
$$;

drop policy if exists customer_create_appointment on public.appointments;
drop policy if exists appointment_customer_update on public.appointments;
drop policy if exists appointment_barber_update on public.appointments;
drop policy if exists user_notifications on public.notifications;
create policy user_notifications_read on public.notifications for select using (user_id = auth.uid());

create or replace function public.transition_overdue_appointments()
returns table (absent_count integer, completed_count integer)
language plpgsql security definer set search_path = public as $$
declare absent_total integer; completed_total integer;
begin
  with changed as (update public.appointments set status = 'absent', updated_at = now() where status = 'booked' and starts_at <= now() returning customer_id, barber_id, id), notices as (
    insert into public.notifications (user_id, title, body, appointment_id)
    select recipient_id, 'تم تسجيل الموعد كغائب', 'انتهى وقت الموعد قبل تأكيد الحضور.', id from changed cross join lateral (values (customer_id), (barber_id)) recipients(recipient_id) returning 1
  ) select count(*) / 2 into absent_total from notices;
  with changed as (update public.appointments set status = 'completed', updated_at = now() where status = 'present' and ends_at <= now() returning customer_id, barber_id, id), notices as (
    insert into public.notifications (user_id, title, body, appointment_id)
    select recipient_id, 'اكتمل الموعد', 'تم إكمال الموعد بنجاح.', id from changed cross join lateral (values (customer_id), (barber_id)) recipients(recipient_id) returning 1
  ) select count(*) / 2 into completed_total from notices;
  return query select coalesce(absent_total, 0), coalesce(completed_total, 0);
end;
$$;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'koupa-appointment-transitions') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'koupa-appointment-transitions';
  end if;
  perform cron.schedule('koupa-appointment-transitions', '* * * * *', 'select public.transition_overdue_appointments()');
end $$;

revoke all on function public.is_independent_published_barber(uuid) from public;
revoke all on function public.booking_slot_is_available(uuid, uuid, timestamptz, uuid) from public;
revoke all on function public.insert_booking_notification(uuid, text, text, uuid) from public;
revoke all on function public.transition_overdue_appointments() from public;
grant execute on function public.search_published_barbers(text, text, integer), public.get_public_barber_profile(uuid), public.available_booking_slots(uuid, uuid, date), public.book_appointment(uuid, uuid, timestamptz), public.reschedule_appointment(uuid, uuid, timestamptz), public.cancel_customer_appointment(uuid), public.cancel_barber_appointment(uuid), public.mark_appointment_present(uuid), public.barber_today_appointments() to authenticated;
