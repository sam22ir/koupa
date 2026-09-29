-- Barbers inside a map viewport, for the Find tab's map view. Independent
-- published barbers only (shops keep their own directory). Coordinates come from
-- the profile, or from the Maps link for older barbers. Capped so a zoomed-out map
-- never returns an unbounded list; closest to the viewport centre first. The phone
-- is never returned: the map needs a name, rating, price and position only.

create or replace function public.search_barbers_in_bounds(
  min_latitude double precision,
  min_longitude double precision,
  max_latitude double precision,
  max_longitude double precision,
  search_query text default ''
)
returns table (
  id uuid,
  name text,
  city text,
  neighborhood text,
  average_rating numeric,
  rating_count integer,
  starting_price_dzd integer,
  latitude double precision,
  longitude double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  centre_latitude double precision;
  centre_longitude double precision;
begin
  if min_latitude is null or min_longitude is null or max_latitude is null or max_longitude is null
    or min_latitude < -90 or max_latitude > 90
    or min_longitude < -180 or max_longitude > 180
    or min_latitude > max_latitude or min_longitude > max_longitude then
    raise exception 'Invalid map area';
  end if;

  centre_latitude := (min_latitude + max_latitude) / 2;
  centre_longitude := (min_longitude + max_longitude) / 2;

  return query
  with located as (
    select
      profile.id,
      profile.name,
      profile.city,
      profile.neighborhood,
      coords.latitude,
      coords.longitude
    from public.profiles profile
    cross join lateral (
      select
        public.shop_effective_latitude(null, profile.latitude, null, profile.maps_url) as latitude,
        public.shop_effective_longitude(null, profile.longitude, null, profile.maps_url) as longitude
    ) coords
    where public.is_independent_published_barber(profile.id)
      and coords.latitude between min_latitude and max_latitude
      and coords.longitude between min_longitude and max_longitude
      and (
        coalesce(search_query, '') = ''
        or public.normalize_booking_search(
          profile.name || ' ' || coalesce(profile.city, '') || ' ' || coalesce(profile.neighborhood, '')
        ) like '%' || public.normalize_booking_search(search_query) || '%'
      )
  )
  select
    located.id,
    located.name,
    located.city,
    located.neighborhood,
    coalesce(round(avg(rating.stars)::numeric, 1), 0) as average_rating,
    count(distinct rating.id)::integer as rating_count,
    coalesce(min(service.price_dzd), 0)::integer as starting_price_dzd,
    located.latitude,
    located.longitude
  from located
  left join public.ratings rating on rating.barber_id = located.id
  left join public.services service on service.barber_id = located.id and service.is_active
  group by located.id, located.name, located.city, located.neighborhood, located.latitude, located.longitude
  order by
    abs(located.latitude - centre_latitude) + abs(located.longitude - centre_longitude),
    located.name
  limit 100;
end;
$$;

revoke all on function public.search_barbers_in_bounds(double precision, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.search_barbers_in_bounds(double precision, double precision, double precision, double precision, text) to anon, authenticated;
