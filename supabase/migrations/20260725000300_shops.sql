-- Shop-affiliated barbers remain bookable through their shop profile.
create or replace function public.is_bookable_published_barber(target_barber_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = target_barber_id
      and profile.role = 'barber'
      and profile.is_published
      and not profile.is_booking_paused
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
  select * into barber from public.profiles where id = booking_slot_is_available.barber_id;
  select * into service from public.services service_row where service_row.id = booking_slot_is_available.service_id and service_row.barber_id = booking_slot_is_available.barber_id and service_row.is_active;
  if not found or not public.is_bookable_published_barber(booking_slot_is_available.barber_id) then return false; end if;
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
  if service_duration is null or not public.is_bookable_published_barber(available_booking_slots.barber_id) then return; end if;
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

create or replace function public.barber_shop_id(target_barber_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop.id
  from public.shops shop
  where shop.owner_id = target_barber_id
  union all
  select membership.shop_id
  from public.shop_memberships membership
  where membership.barber_id = target_barber_id
    and membership.status = 'active'
  limit 1;
$$;

create or replace function public.book_appointment(barber_id uuid, service_id uuid, starts_at_value timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid := auth.uid();
  service public.services%rowtype;
  appointment_id uuid;
  related_shop_id uuid;
begin
  if v_customer_id is null or not exists (select 1 from public.profiles where id = v_customer_id and role = 'customer') then
    raise exception 'Customer authentication is required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(barber_id::text, 0));
  select * into service from public.services service_row
  where service_row.id = book_appointment.service_id
    and service_row.barber_id = book_appointment.barber_id
    and service_row.is_active;
  if not found or not public.booking_slot_is_available(barber_id, service_id, starts_at_value) then
    raise exception 'Selected slot is unavailable';
  end if;
  if exists (select 1 from public.appointments where customer_id = v_customer_id and status in ('booked', 'present')) then
    raise exception 'An active appointment already exists';
  end if;
  related_shop_id := public.barber_shop_id(barber_id);
  insert into public.appointments (customer_id, barber_id, shop_id, service_id, starts_at, ends_at, price_dzd)
  values (
    v_customer_id,
    barber_id,
    related_shop_id,
    service.id,
    starts_at_value,
    starts_at_value + make_interval(mins => service.duration_minutes),
    service.price_dzd
  )
  returning id into appointment_id;
  perform public.insert_booking_notification(v_customer_id, 'تم تأكيد موعدك', 'تم حجز موعدك بنجاح.', appointment_id);
  perform public.insert_booking_notification(barber_id, 'موعد جديد', 'لديك موعد جديد في جدول اليوم.', appointment_id);
  return appointment_id;
end;
$$;

-- Independent barbers stay searchable as individuals; shop members are discovered via shops.
drop function if exists public.get_public_barber_profile(uuid);

create or replace function public.get_public_barber_profile(barber_id uuid)
returns table (
  id uuid,
  name text,
  bio text,
  city text,
  neighborhood text,
  maps_url text,
  phone text,
  booking_window_days integer,
  average_rating numeric,
  rating_count integer,
  services jsonb,
  weekly_hours jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id,
    profile.name,
    profile.bio,
    profile.city,
    profile.neighborhood,
    profile.maps_url,
    profile.phone,
    profile.booking_window_days,
    coalesce((select round(avg(rating.stars)::numeric, 1) from public.ratings rating where rating.barber_id = profile.id), 0),
    coalesce((select count(*)::integer from public.ratings rating where rating.barber_id = profile.id), 0),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', service.id,
          'name', service.name,
          'price_dzd', service.price_dzd,
          'duration_minutes', service.duration_minutes
        )
        order by service.name
      )
      from public.services service
      where service.barber_id = profile.id and service.is_active
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day_of_week', schedule.day_of_week,
          'starts_at', schedule.starts_at,
          'ends_at', schedule.ends_at
        )
        order by schedule.day_of_week
      )
      from public.weekly_schedules schedule
      where schedule.barber_id = profile.id
    ), '[]'::jsonb)
  from public.profiles profile
  where profile.id = barber_id
    and public.is_bookable_published_barber(profile.id);
$$;

create or replace function public.search_published_shops(search_query text default '', page_number integer default 0)
returns table (
  id uuid,
  name text,
  bio text,
  maps_url text,
  average_rating numeric,
  rating_count integer,
  owner_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    shop.id,
    shop.name,
    shop.bio,
    shop.maps_url,
    shop.average_rating,
    shop.rating_count,
    owner.name
  from public.shops shop
  join public.profiles owner on owner.id = shop.owner_id
  where owner.role = 'barber'
    and owner.is_published
    and (
      coalesce(search_query, '') = ''
      or public.normalize_booking_search(shop.name || ' ' || coalesce(shop.bio, '') || ' ' || owner.name)
         like '%' || public.normalize_booking_search(search_query) || '%'
    )
  order by shop.name
  limit 20 offset greatest(page_number, 0) * 20;
$$;

create or replace function public.get_public_shop_profile(target_shop_id uuid)
returns table (
  id uuid,
  name text,
  bio text,
  maps_url text,
  average_rating numeric,
  rating_count integer,
  owner_name text,
  barbers jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    shop.id,
    shop.name,
    shop.bio,
    shop.maps_url,
    shop.average_rating,
    shop.rating_count,
    owner.name,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', barber.id,
          'name', barber.name,
          'phone', barber.phone,
          'is_owner', barber.id = shop.owner_id
        )
        order by barber.name
      )
      from (
        select owner.id, owner.name, owner.phone
        from public.profiles owner
        where owner.id = shop.owner_id
          and owner.is_published
          and not owner.is_booking_paused
        union
        select member.id, member.name, member.phone
        from public.shop_memberships membership
        join public.profiles member on member.id = membership.barber_id
        where membership.shop_id = shop.id
          and membership.status = 'active'
          and member.is_published
          and not member.is_booking_paused
      ) barber
    ), '[]'::jsonb)
  from public.shops shop
  join public.profiles owner on owner.id = shop.owner_id
  where shop.id = target_shop_id;
$$;

create or replace function public.create_shop(
  shop_name text,
  shop_bio text default null,
  shop_maps_url text default null,
  shop_latitude double precision default null,
  shop_longitude double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  shop_id uuid;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles
    where id = actor_id and role = 'barber' and is_published
  ) then
    raise exception 'Shop cannot be created';
  end if;
  if exists (select 1 from public.shops where owner_id = actor_id) then
    raise exception 'Shop cannot be created';
  end if;
  if exists (
    select 1 from public.shop_memberships
    where barber_id = actor_id and status in ('pending', 'active')
  ) then
    raise exception 'Shop cannot be created';
  end if;
  if shop_maps_url is null and (shop_latitude is null or shop_longitude is null) then
    raise exception 'Shop location is required';
  end if;

  insert into public.shops (owner_id, name, bio, maps_url, latitude, longitude)
  values (actor_id, trim(shop_name), nullif(trim(coalesce(shop_bio, '')), ''), shop_maps_url, shop_latitude, shop_longitude)
  returning id into shop_id;
  return shop_id;
end;
$$;

create or replace function public.request_join_shop(target_shop_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership_id uuid;
  owner_id uuid;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles where id = actor_id and role = 'barber' and is_published
  ) then
    raise exception 'Join request cannot be submitted';
  end if;
  if exists (select 1 from public.shops where owner_id = actor_id) then
    raise exception 'Join request cannot be submitted';
  end if;
  if exists (
    select 1 from public.shop_memberships
    where barber_id = actor_id and status in ('pending', 'active')
  ) then
    raise exception 'Join request cannot be submitted';
  end if;
  select shops.owner_id into owner_id from public.shops where id = target_shop_id;
  if owner_id is null then
    raise exception 'Join request cannot be submitted';
  end if;

  insert into public.shop_memberships (shop_id, barber_id, status)
  values (target_shop_id, actor_id, 'pending')
  returning id into membership_id;

  perform public.insert_booking_notification(owner_id, 'طلب انضمام جديد', 'طلب حلاق الانضمام إلى محلك.', null);
  return membership_id;
end;
$$;

create or replace function public.respond_shop_membership(target_membership_id uuid, accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership public.shop_memberships%rowtype;
begin
  select * into membership from public.shop_memberships where id = target_membership_id;
  if not found then raise exception 'Membership cannot be updated'; end if;
  if actor_id is null or not exists (
    select 1 from public.shops where id = membership.shop_id and owner_id = actor_id
  ) then
    raise exception 'Membership cannot be updated';
  end if;
  if membership.status <> 'pending' then
    raise exception 'Membership cannot be updated';
  end if;

  update public.shop_memberships
  set status = case when accept then 'active'::public.membership_status else 'rejected'::public.membership_status end,
      updated_at = now()
  where id = membership.id;

  perform public.insert_booking_notification(
    membership.barber_id,
    case when accept then 'تم قبول طلب الانضمام' else 'تم رفض طلب الانضمام' end,
    case when accept then 'أصبحت عضواً في المحل.' else 'تم رفض طلب انضمامك إلى المحل.' end,
    null
  );
  return membership.id;
end;
$$;

create or replace function public.leave_shop()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership public.shop_memberships%rowtype;
  appointment_row public.appointments%rowtype;
  owner_id uuid;
begin
  select * into membership
  from public.shop_memberships
  where barber_id = actor_id and status in ('pending', 'active')
  limit 1;
  if not found then raise exception 'Shop membership cannot be left'; end if;
  select shops.owner_id into owner_id from public.shops where id = membership.shop_id;

  if membership.status = 'active' then
    for appointment_row in
      select * from public.appointments
      where barber_id = actor_id
        and shop_id = membership.shop_id
        and status = 'booked'
        and starts_at > now()
    loop
      update public.appointments
      set status = 'cancelled', cancelled_at = now(), updated_at = now()
      where id = appointment_row.id;
      perform public.insert_booking_notification(
        appointment_row.customer_id,
        'تم إلغاء الموعد',
        'تم إلغاء موعدك لأن الحلاق غادر المحل.',
        appointment_row.id
      );
    end loop;
  end if;

  delete from public.shop_memberships where id = membership.id;
  if owner_id is not null then
    perform public.insert_booking_notification(owner_id, 'مغادرة محل', 'غادر أحد الحلاقين المحل.', null);
  end if;
end;
$$;

create or replace function public.delete_owned_shop()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  owned_shop public.shops%rowtype;
  appointment_row public.appointments%rowtype;
begin
  select * into owned_shop from public.shops where owner_id = actor_id;
  if not found then raise exception 'Shop cannot be deleted'; end if;

  for appointment_row in
    select * from public.appointments
    where shop_id = owned_shop.id
      and status = 'booked'
      and starts_at > now()
  loop
    update public.appointments
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = appointment_row.id;
    perform public.insert_booking_notification(
      appointment_row.customer_id,
      'تم إلغاء الموعد',
      'تم إلغاء موعدك لأن المحل أُغلق.',
      appointment_row.id
    );
  end loop;

  delete from public.shop_memberships where shop_id = owned_shop.id;
  delete from public.shops where id = owned_shop.id;
end;
$$;

revoke all on function public.is_bookable_published_barber(uuid) from public;
revoke all on function public.barber_shop_id(uuid) from public;
revoke all on function public.search_published_shops(text, integer) from public;
revoke all on function public.get_public_shop_profile(uuid) from public;
revoke all on function public.create_shop(text, text, text, double precision, double precision) from public;
revoke all on function public.request_join_shop(uuid) from public;
revoke all on function public.respond_shop_membership(uuid, boolean) from public;
revoke all on function public.leave_shop() from public;
revoke all on function public.delete_owned_shop() from public;

grant execute on function public.search_published_shops(text, integer) to authenticated;
grant execute on function public.get_public_shop_profile(uuid) to authenticated;
grant execute on function public.create_shop(text, text, text, double precision, double precision) to authenticated;
grant execute on function public.request_join_shop(uuid) to authenticated;
grant execute on function public.respond_shop_membership(uuid, boolean) to authenticated;
grant execute on function public.leave_shop() to authenticated;
grant execute on function public.delete_owned_shop() to authenticated;
