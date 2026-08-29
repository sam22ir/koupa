-- Nearby salon search by stored shop/owner coordinates. No Maps API key required.

create or replace function public.search_nearby_shops(
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
  maps_url text,
  city text,
  neighborhood text,
  average_rating numeric,
  rating_count integer,
  owner_name text,
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
  select
    ranked.id,
    ranked.name,
    ranked.bio,
    ranked.maps_url,
    ranked.city,
    ranked.neighborhood,
    ranked.average_rating,
    ranked.rating_count,
    ranked.owner_name,
    ranked.latitude,
    ranked.longitude,
    ranked.distance_km
  from (
    select
      shop.id,
      shop.name,
      shop.bio,
      shop.maps_url,
      owner.city,
      owner.neighborhood,
      shop.average_rating,
      shop.rating_count,
      owner.name as owner_name,
      coalesce(shop.latitude, owner.latitude) as latitude,
      coalesce(shop.longitude, owner.longitude) as longitude,
      round((
        6371 * acos(
          least(1::double precision, greatest(-1::double precision,
            cos(radians(origin_latitude)) * cos(radians(coalesce(shop.latitude, owner.latitude))) *
            cos(radians(coalesce(shop.longitude, owner.longitude)) - radians(origin_longitude)) +
            sin(radians(origin_latitude)) * sin(radians(coalesce(shop.latitude, owner.latitude)))
          ))
        )
      )::numeric, 2) as distance_km
    from public.shops shop
    join public.profiles owner on owner.id = shop.owner_id
    where owner.role = 'barber'
      and owner.is_published
      and coalesce(shop.latitude, owner.latitude) is not null
      and coalesce(shop.longitude, owner.longitude) is not null
      and (
        coalesce(search_query, '') = ''
        or public.normalize_booking_search(
          shop.name || ' ' || coalesce(shop.bio, '') || ' ' || owner.name || ' ' ||
          coalesce(owner.city, '') || ' ' || coalesce(owner.neighborhood, '')
        ) like '%' || public.normalize_booking_search(search_query) || '%'
      )
  ) ranked
  where ranked.distance_km <= safe_radius
  order by ranked.distance_km, ranked.name, ranked.id
  limit 20 offset greatest(page_number, 0) * 20;
end;
$$;

revoke all on function public.search_nearby_shops(double precision, double precision, text, double precision, integer) from public;
revoke all on function public.search_nearby_shops(double precision, double precision, text, double precision, integer) from anon;
grant execute on function public.search_nearby_shops(double precision, double precision, text, double precision, integer) to authenticated;
