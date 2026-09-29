-- Guest browsing: let signed-out visitors read the public barber directory,
-- a barber's public profile, and open booking slots. Every write RPC
-- (book_appointment, reschedule, cancel, ...) stays authenticated-only.
--
-- Guests never receive a barber's phone number: it is returned as an empty
-- string until the caller is signed in.

create or replace function public.search_published_barbers(search_query text default '', city_query text default '', page_number integer default 0)
returns table (
  id uuid,
  name text,
  bio text,
  city text,
  neighborhood text,
  maps_url text,
  phone text,
  average_rating numeric,
  rating_count integer,
  starting_price_dzd integer,
  service_count integer
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
    case when auth.uid() is null then '' else profile.phone end,
    coalesce(round(avg(rating.stars)::numeric, 1), 0) as average_rating,
    count(distinct rating.id)::integer as rating_count,
    coalesce(min(service.price_dzd), 0) as starting_price_dzd,
    count(distinct service.id)::integer as service_count
  from public.profiles profile
  left join public.ratings rating on rating.barber_id = profile.id
  left join public.services service on service.barber_id = profile.id and service.is_active
  where public.is_independent_published_barber(profile.id)
    and (
      coalesce(search_query, '') = ''
      or public.normalize_booking_search(profile.name || ' ' || coalesce(profile.city, '') || ' ' || coalesce(profile.neighborhood, '')) like '%' || public.normalize_booking_search(search_query) || '%'
    )
    and (
      coalesce(city_query, '') = ''
      or public.normalize_booking_search(coalesce(profile.city, '')) = public.normalize_booking_search(city_query)
    )
  group by profile.id
  order by profile.name
  limit 20 offset greatest(page_number, 0) * 20;
$$;

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
  weekly_hours jsonb,
  shop jsonb
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
    case when auth.uid() is null then '' else profile.phone end,
    profile.booking_window_days,
    coalesce((
      select round(avg(rating.stars)::numeric, 1)
      from public.ratings rating
      where rating.barber_id = profile.id
    ), 0),
    coalesce((
      select count(*)::integer
      from public.ratings rating
      where rating.barber_id = profile.id
    ), 0),
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
    ), '[]'::jsonb),
    affiliated.shop
  from public.profiles profile
  left join lateral (
    select jsonb_build_object(
      'id', shop.id,
      'name', shop.name,
      'city', owner_profile.city,
      'neighborhood', owner_profile.neighborhood,
      'maps_url', shop.maps_url,
      'average_rating', shop.average_rating,
      'rating_count', shop.rating_count
    ) as shop
    from public.shops shop
    join public.profiles owner_profile on owner_profile.id = shop.owner_id
    where shop.owner_id = profile.id
      or exists (
        select 1
        from public.shop_memberships membership
        where membership.shop_id = shop.id
          and membership.barber_id = profile.id
          and membership.status = 'active'
      )
    order by (shop.owner_id = profile.id) desc
    limit 1
  ) affiliated on true
  where profile.id = barber_id
    and public.is_bookable_published_barber(profile.id);
$$;

-- Same body as 20260725000300_shops.sql minus the authentication requirement.
create or replace function public.available_booking_slots(barber_id uuid, service_id uuid, local_date date)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare schedule record; service_duration integer; slot_start timestamptz;
begin
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

revoke all on function public.search_published_barbers(text, text, integer) from public;
revoke all on function public.get_public_barber_profile(uuid) from public;
revoke all on function public.available_booking_slots(uuid, uuid, date) from public;
grant execute on function public.search_published_barbers(text, text, integer) to anon, authenticated;
grant execute on function public.get_public_barber_profile(uuid) to anon, authenticated;
grant execute on function public.available_booking_slots(uuid, uuid, date) to anon, authenticated;
