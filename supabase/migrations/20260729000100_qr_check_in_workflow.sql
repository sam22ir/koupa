create table public.appointment_attendance_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  source text not null check (source = 'customer_qr'),
  checked_in_by uuid not null references public.profiles(id) on delete restrict,
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  check ((reversed_at is null) = (reversed_by is null))
);

create index appointment_attendance_events_appointment_idx
  on public.appointment_attendance_events (appointment_id, checked_in_at desc);

alter table public.appointment_attendance_events enable row level security;
revoke all on table public.appointment_attendance_events from anon, authenticated;

drop function public.check_in_with_barber_qr(uuid);

create function public.check_in_with_barber_qr(target_barber_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_id uuid := auth.uid();
  appointment public.appointments%rowtype;
  changed public.appointments%rowtype;
  barber_name text;
  expected_barber_name text;
  service_name text;
begin
  if customer_id is null or not exists (
    select 1 from public.profiles where id = customer_id and role = 'customer'
  ) then
    raise exception 'Customer authentication is required';
  end if;

  select appointment_row.*
  into appointment
  from public.appointments appointment_row
  where appointment_row.customer_id = customer_id
    and appointment_row.status in ('booked', 'present')
  limit 1;

  if appointment.id is not null then
    select name into expected_barber_name
    from public.profiles
    where id = appointment.barber_id;

    if appointment.barber_id <> target_barber_id then
      return jsonb_build_object(
        'code', 'WRONG_BARBER',
        'expected_barber_name', expected_barber_name
      );
    end if;

    select barber.name, service.name
    into barber_name, service_name
    from public.profiles barber
    join public.services service on service.id = appointment.service_id
    where barber.id = appointment.barber_id;

    if appointment.status = 'present' then
      return jsonb_build_object(
        'code', 'ALREADY_PRESENT',
        'appointment_id', appointment.id,
        'barber_name', barber_name,
        'service_name', service_name,
        'starts_at', appointment.starts_at,
        'ends_at', appointment.ends_at
      );
    end if;

    if now() < appointment.starts_at - interval '30 minutes' then
      return jsonb_build_object(
        'code', 'TOO_EARLY',
        'appointment_id', appointment.id,
        'check_in_opens_at', appointment.starts_at - interval '30 minutes'
      );
    end if;

    if now() >= appointment.ends_at then
      return jsonb_build_object(
        'code', 'TOO_LATE',
        'appointment_id', appointment.id,
        'ends_at', appointment.ends_at
      );
    end if;

    update public.appointments
    set status = 'present', qr_checked_in_at = now(), updated_at = now()
    where id = appointment.id and status = 'booked'
    returning * into changed;

    if changed.id is null then
      select * into changed
      from public.appointments
      where id = appointment.id;

      if changed.status = 'present' then
        return jsonb_build_object(
          'code', 'ALREADY_PRESENT',
          'appointment_id', changed.id,
          'barber_name', barber_name,
          'service_name', service_name,
          'starts_at', changed.starts_at,
          'ends_at', changed.ends_at
        );
      end if;

      return jsonb_build_object('code', 'NO_ACTIVE_APPOINTMENT');
    end if;

    insert into public.appointment_attendance_events
      (appointment_id, source, checked_in_by)
    values (changed.id, 'customer_qr', customer_id);

    perform public.insert_booking_notification(
      changed.customer_id,
      'تم تأكيد حضورك',
      'تم تسجيل حضورك للموعد.',
      changed.id
    );
    perform public.insert_booking_notification(
      changed.barber_id,
      'تم تسجيل حضور عميل',
      'قام العميل بمسح رمز الحضور.',
      changed.id
    );

    return jsonb_build_object(
      'code', 'CHECKED_IN',
      'appointment_id', changed.id,
      'barber_name', barber_name,
      'service_name', service_name,
      'starts_at', changed.starts_at,
      'ends_at', changed.ends_at
    );
  end if;

  select appointment_row.*
  into appointment
  from public.appointments appointment_row
  where appointment_row.customer_id = customer_id
    and appointment_row.barber_id = target_barber_id
    and (appointment_row.starts_at at time zone 'Africa/Algiers')::date =
        (now() at time zone 'Africa/Algiers')::date
  order by appointment_row.starts_at desc
  limit 1;

  if appointment.status = 'cancelled' then
    return jsonb_build_object(
      'code', 'CANCELLED',
      'appointment_id', appointment.id
    );
  end if;

  if appointment.id is not null and (
    appointment.status in ('completed', 'absent') or appointment.ends_at <= now()
  ) then
    return jsonb_build_object(
      'code', 'TOO_LATE',
      'appointment_id', appointment.id,
      'ends_at', appointment.ends_at
    );
  end if;

  return jsonb_build_object('code', 'NO_ACTIVE_APPOINTMENT');
end;
$$;

create function public.undo_qr_check_in(target_appointment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  attendance_event_id uuid;
  changed public.appointments%rowtype;
begin
  select event.id
  into attendance_event_id
  from public.appointment_attendance_events event
  join public.appointments appointment on appointment.id = event.appointment_id
  where event.appointment_id = target_appointment_id
    and event.reversed_at is null
    and appointment.barber_id = auth.uid()
    and appointment.status = 'present'
  order by event.checked_in_at desc
  limit 1
  for update of event;

  if attendance_event_id is null then
    raise exception 'QR check-in cannot be undone';
  end if;

  update public.appointments
  set status = 'booked', qr_checked_in_at = null, updated_at = now()
  where id = target_appointment_id
    and barber_id = auth.uid()
    and status = 'present'
  returning * into changed;

  if changed.id is null then
    raise exception 'QR check-in cannot be undone';
  end if;

  update public.appointment_attendance_events
  set reversed_at = now(), reversed_by = auth.uid()
  where id = attendance_event_id;

  perform public.insert_booking_notification(
    changed.customer_id,
    'تم التراجع عن تأكيد الحضور',
    'أعاد الحلاق الموعد إلى حالة محجوز.',
    changed.id
  );

  return changed.id;
end;
$$;

drop function public.barber_today_appointments();

create function public.barber_today_appointments()
returns table (
  id uuid,
  customer_name text,
  customer_phone text,
  service_name text,
  price_dzd integer,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  qr_check_in_reversible boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    appointment.id,
    customer.name,
    customer.phone,
    service.name,
    appointment.price_dzd,
    appointment.starts_at,
    appointment.ends_at,
    appointment.status,
    exists (
      select 1
      from public.appointment_attendance_events event
      where event.appointment_id = appointment.id
        and event.reversed_at is null
    )
  from public.appointments appointment
  join public.profiles customer on customer.id = appointment.customer_id
  join public.services service on service.id = appointment.service_id
  where appointment.barber_id = auth.uid()
    and (appointment.starts_at at time zone 'Africa/Algiers')::date =
        (now() at time zone 'Africa/Algiers')::date
  order by appointment.starts_at;
$$;

create or replace function public.transition_overdue_appointments()
returns table (absent_count integer, completed_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  absent_total integer;
  completed_total integer;
begin
  with changed as (
    update public.appointments
    set status = 'absent', updated_at = now()
    where status = 'booked' and ends_at <= now()
    returning customer_id, barber_id, id
  ), notices as (
    insert into public.notifications (user_id, title, body, appointment_id)
    select
      recipient_id,
      'تم تسجيل الموعد كغائب',
      'انتهى وقت الموعد قبل تأكيد الحضور.',
      id
    from changed
    cross join lateral (values (customer_id), (barber_id)) recipients(recipient_id)
    returning 1
  )
  select count(*) / 2 into absent_total from notices;

  with changed as (
    update public.appointments
    set status = 'completed', updated_at = now()
    where status = 'present' and ends_at <= now()
    returning customer_id, barber_id, id
  ), notices as (
    insert into public.notifications (user_id, title, body, appointment_id)
    select
      recipient_id,
      'اكتمل الموعد',
      'تم إكمال الموعد بنجاح.',
      id
    from changed
    cross join lateral (values (customer_id), (barber_id)) recipients(recipient_id)
    returning 1
  )
  select count(*) / 2 into completed_total from notices;

  return query select coalesce(absent_total, 0), coalesce(completed_total, 0);
end;
$$;

revoke all on function public.check_in_with_barber_qr(uuid) from public;
revoke all on function public.undo_qr_check_in(uuid) from public;
revoke all on function public.barber_today_appointments() from public;
grant execute on function public.check_in_with_barber_qr(uuid) to authenticated;
grant execute on function public.undo_qr_check_in(uuid) to authenticated;
grant execute on function public.barber_today_appointments() to authenticated;
