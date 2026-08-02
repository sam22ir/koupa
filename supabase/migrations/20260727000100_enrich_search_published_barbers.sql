drop function if exists public.search_published_barbers(text, text, integer);

create function public.search_published_barbers(search_query text default '', city_query text default '', page_number integer default 0)
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
    profile.phone,
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

grant execute on function public.search_published_barbers(text, text, integer) to authenticated;
