-- Structural and authorization checks for nearby salon search.

do $$
begin
  if to_regprocedure('public.search_nearby_shops(double precision,double precision,text,double precision,integer)') is null then
    raise exception 'missing search_nearby_shops';
  end if;
  if to_regprocedure('public.shop_effective_latitude(double precision,double precision,text,text)') is null
    or to_regprocedure('public.shop_effective_longitude(double precision,double precision,text,text)') is null then
    raise exception 'missing shop coordinate helpers';
  end if;
end;
$$;

do $$
declare
  function_result text;
begin
  select pg_get_function_result(
    'public.search_nearby_shops(double precision,double precision,text,double precision,integer)'::regprocedure
  ) into function_result;

  if position('distance_km numeric' in function_result) = 0
    or position('latitude double precision' in function_result) = 0 then
    raise exception 'search_nearby_shops must return coordinates and distance';
  end if;
end;
$$;

do $$
begin
  if has_function_privilege('anon', 'public.search_nearby_shops(double precision,double precision,text,double precision,integer)', 'execute') then
    raise exception 'anon must not execute search_nearby_shops';
  end if;
  if not has_function_privilege('authenticated', 'public.search_nearby_shops(double precision,double precision,text,double precision,integer)', 'execute') then
    raise exception 'authenticated cannot execute search_nearby_shops';
  end if;
end;
$$;
