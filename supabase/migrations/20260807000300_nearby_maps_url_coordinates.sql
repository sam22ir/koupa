-- Recover coordinates from explicit Maps URLs for legacy shops that predate
-- the coordinate fields. Short links remain excluded when they cannot be
-- resolved without a Maps API call.

create or replace function public.shop_effective_latitude(
  explicit_shop_latitude double precision,
  owner_latitude double precision,
  shop_maps_url text,
  owner_maps_url text
)
returns double precision
language sql
immutable
as $$
  select coalesce(
    explicit_shop_latitude,
    owner_latitude,
    nullif(substring(coalesce(shop_maps_url, '') from '[?&][a-z]+=(-?[0-9]+[.]?[0-9]*),'), '')::double precision,
    nullif(substring(coalesce(shop_maps_url, '') from '/search/(-?[0-9]+[.]?[0-9]*),'), '')::double precision,
    nullif(substring(coalesce(shop_maps_url, '') from '@(-?[0-9]+[.]?[0-9]*),'), '')::double precision,
    nullif(substring(coalesce(owner_maps_url, '') from '[?&][a-z]+=(-?[0-9]+[.]?[0-9]*),'), '')::double precision,
    nullif(substring(coalesce(owner_maps_url, '') from '/search/(-?[0-9]+[.]?[0-9]*),'), '')::double precision,
    nullif(substring(coalesce(owner_maps_url, '') from '@(-?[0-9]+[.]?[0-9]*),'), '')::double precision
  );
$$;

create or replace function public.shop_effective_longitude(
  explicit_shop_longitude double precision,
  owner_longitude double precision,
  shop_maps_url text,
  owner_maps_url text
)
returns double precision
language sql
immutable
as $$
  select coalesce(
    explicit_shop_longitude,
    owner_longitude,
    nullif(substring(coalesce(shop_maps_url, '') from '[?&][a-z]+=-?[0-9]+[.]?[0-9]*,(-?[0-9]+[.]?[0-9]*)'), '')::double precision,
    nullif(substring(coalesce(shop_maps_url, '') from '/search/-?[0-9]+[.]?[0-9]*,(-?[0-9]+[.]?[0-9]*)'), '')::double precision,
    nullif(substring(coalesce(shop_maps_url, '') from '@-?[0-9]+[.]?[0-9]*,(-?[0-9]+[.]?[0-9]*)'), '')::double precision,
    nullif(substring(coalesce(owner_maps_url, '') from '[?&][a-z]+=-?[0-9]+[.]?[0-9]*,(-?[0-9]+[.]?[0-9]*)'), '')::double precision,
    nullif(substring(coalesce(owner_maps_url, '') from '/search/-?[0-9]+[.]?[0-9]*,(-?[0-9]+[.]?[0-9]*)'), '')::double precision,
    nullif(substring(coalesce(owner_maps_url, '') from '@-?[0-9]+[.]?[0-9]*,(-?[0-9]+[.]?[0-9]*)'), '')::double precision
  );
$$;

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
  with located_shops as (
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
      public.shop_effective_latitude(shop.latitude, owner.latitude, shop.maps_url, owner.maps_url) as latitude,
      public.shop_effective_longitude(shop.longitude, owner.longitude, shop.maps_url, owner.maps_url) as longitude
    from public.shops shop
    join public.profiles owner on owner.id = shop.owner_id
    where owner.role = 'barber'
      and owner.is_published
  ),
  ranked as (
    select
      located.id,
      located.name,
      located.bio,
      located.maps_url,
      located.city,
      located.neighborhood,
      located.average_rating,
      located.rating_count,
      located.owner_name,
      located.latitude,
      located.longitude,
      round((
        6371 * acos(
          least(1::double precision, greatest(-1::double precision,
            cos(radians(origin_latitude)) * cos(radians(located.latitude)) *
            cos(radians(located.longitude) - radians(origin_longitude)) +
            sin(radians(origin_latitude)) * sin(radians(located.latitude))
          ))
        )
      )::numeric, 2) as distance_km
    from located_shops located
    where located.latitude is not null
      and located.longitude is not null
      and (
        coalesce(search_query, '') = ''
        or public.normalize_booking_search(
          located.name || ' ' || coalesce(located.bio, '') || ' ' || located.owner_name || ' ' ||
          coalesce(located.city, '') || ' ' || coalesce(located.neighborhood, '')
        ) like '%' || public.normalize_booking_search(search_query) || '%'
      )
  )
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
  from ranked
  where ranked.distance_km <= safe_radius
  order by ranked.distance_km, ranked.name, ranked.id
  limit 20 offset greatest(page_number, 0) * 20;
end;
$$;

revoke all on function public.shop_effective_latitude(double precision, double precision, text, text) from public;
revoke all on function public.shop_effective_longitude(double precision, double precision, text, text) from public;
revoke all on function public.shop_effective_latitude(double precision, double precision, text, text) from anon;
revoke all on function public.shop_effective_longitude(double precision, double precision, text, text) from anon;
grant execute on function public.shop_effective_latitude(double precision, double precision, text, text) to authenticated;
grant execute on function public.shop_effective_longitude(double precision, double precision, text, text) to authenticated;
revoke all on function public.search_nearby_shops(double precision, double precision, text, double precision, integer) from public;
revoke all on function public.search_nearby_shops(double precision, double precision, text, double precision, integer) from anon;
grant execute on function public.search_nearby_shops(double precision, double precision, text, double precision, integer) to authenticated;

select pg_notify('pgrst', 'reload schema');
