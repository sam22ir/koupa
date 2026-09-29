-- Nearest-first barber search. Mirrors search_nearby_shops: independent published
-- barbers that have coordinates, closest first, within a radius. The barber phone
-- stays blank for signed-out callers, as in search_published_barbers.

create or replace function public.search_nearby_barbers(
  origin_latitude double precision,
  origin_longitude double precision,
  search_query text default '',
  radius_km double precision default 25,
  page_number integer default 0
)
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
  service_count integer,
  latitude double precision,
  longitude double precision,
  distance_km numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_radius double precision := least(greatest(coalesce(radius_km, 25), 1), 100);
begin
  if origin_latitude is null or origin_longitude is null
    or origin_latitude < -90 or origin_latitude > 90
    or origin_longitude < -180 or origin_longitude > 180 then
    raise exception 'location is required';
  end if;

  return query
  with located as (
    select
      profile.id,
      profile.name,
      profile.bio,
      profile.city,
      profile.neighborhood,
      profile.maps_url,
      case when auth.uid() is null then '' else profile.phone end as phone,
      coords.latitude,
      coords.longitude,
      round((
        6371 * acos(
          least(1::double precision, greatest(-1::double precision,
            cos(radians(origin_latitude)) * cos(radians(coords.latitude)) *
            cos(radians(coords.longitude) - radians(origin_longitude)) +
            sin(radians(origin_latitude)) * sin(radians(coords.latitude))
          ))
        )
      )::numeric, 2) as distance_km
    from public.profiles profile
    cross join lateral (
      -- Older barbers only have coordinates inside their Maps link; the shop
      -- helpers already know how to read them.
      select
        public.shop_effective_latitude(null, profile.latitude, null, profile.maps_url) as latitude,
        public.shop_effective_longitude(null, profile.longitude, null, profile.maps_url) as longitude
    ) coords
    where public.is_independent_published_barber(profile.id)
      and coords.latitude is not null
      and coords.longitude is not null
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
    located.bio,
    located.city,
    located.neighborhood,
    located.maps_url,
    located.phone,
    coalesce(round(avg(rating.stars)::numeric, 1), 0) as average_rating,
    count(distinct rating.id)::integer as rating_count,
    coalesce(min(service.price_dzd), 0)::integer as starting_price_dzd,
    count(distinct service.id)::integer as service_count,
    located.latitude,
    located.longitude,
    located.distance_km
  from located
  left join public.ratings rating on rating.barber_id = located.id
  left join public.services service on service.barber_id = located.id and service.is_active
  where located.distance_km <= safe_radius
  group by
    located.id, located.name, located.bio, located.city, located.neighborhood,
    located.maps_url, located.phone, located.latitude, located.longitude, located.distance_km
  order by located.distance_km, located.name
  limit 20 offset greatest(page_number, 0) * 20;
end;
$$;

revoke all on function public.search_nearby_barbers(double precision, double precision, text, double precision, integer) from public, anon;
grant execute on function public.search_nearby_barbers(double precision, double precision, text, double precision, integer) to anon, authenticated;
