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
    profile.phone,
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

revoke all on function public.get_public_barber_profile(uuid) from public;
grant execute on function public.get_public_barber_profile(uuid) to authenticated;
