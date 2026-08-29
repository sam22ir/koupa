-- Create an owner's shop as part of the atomic barber onboarding publish.

create or replace function public.publish_barber_profile(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  existing_role public.app_role;
  existing_published boolean;
  workplace_type_value text := coalesce(nullif(trim(payload->>'workplace_type'), ''), 'owner');
  shop_name_value text;
  shop_bio_value text;
  maps_url_value text;
  latitude_value double precision;
  longitude_value double precision;
  item jsonb;
  break_item jsonb;
  schedule_id uuid;
  enabled_schedule_count integer := 0;
  starts_at_value time;
  ends_at_value time;
  break_starts time;
  break_ends time;
  service_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  select role, is_published
  into existing_role, existing_published
  from public.profiles
  where id = actor_id;

  if found then
    if existing_role = 'barber' and existing_published then
      delete from public.onboarding_drafts where user_id = actor_id;
      return;
    end if;
    raise exception 'An incomplete or incompatible profile already exists';
  end if;

  if workplace_type_value not in ('owner', 'worker') then
    raise exception 'Invalid workplace type';
  end if;
  if length(trim(coalesce(payload->>'name', ''))) < 2 then
    raise exception 'Invalid barber name';
  end if;
  if length(trim(coalesce(payload->>'phone', ''))) < 5 then
    raise exception 'Invalid barber phone';
  end if;
  if coalesce((payload->>'interval_minutes')::integer, 0) not in (5, 10, 15, 30) then
    raise exception 'Invalid appointment interval';
  end if;
  if jsonb_typeof(payload->'services') is distinct from 'array' then
    raise exception 'At least one service is required';
  end if;

  service_count := jsonb_array_length(payload->'services');
  if service_count < 1 then
    raise exception 'At least one service is required';
  end if;

  maps_url_value := nullif(trim(coalesce(payload->>'maps_url', '')), '');
  latitude_value := nullif(payload->>'latitude', '')::double precision;
  longitude_value := nullif(payload->>'longitude', '')::double precision;
  if workplace_type_value = 'owner' then
    shop_name_value := nullif(trim(coalesce(payload->>'shop_name', '')), '');
    shop_bio_value := nullif(trim(coalesce(payload->>'shop_bio', '')), '');
    if length(coalesce(shop_name_value, '')) < 2 then
      raise exception 'Shop name is required';
    end if;
    if maps_url_value is null and (latitude_value is null or longitude_value is null) then
      raise exception 'Barber location is required';
    end if;
  end if;

  insert into public.profiles (
    id,
    role,
    workplace_type,
    name,
    phone,
    bio,
    city,
    neighborhood,
    maps_url,
    latitude,
    longitude,
    is_published
  ) values (
    actor_id,
    'barber',
    workplace_type_value,
    trim(payload->>'name'),
    trim(payload->>'phone'),
    nullif(trim(coalesce(payload->>'bio', '')), ''),
    nullif(trim(coalesce(payload->>'city', '')), ''),
    nullif(trim(coalesce(payload->>'neighborhood', '')), ''),
    maps_url_value,
    latitude_value,
    longitude_value,
    true
  );

  if workplace_type_value = 'owner' then
    insert into public.shops (owner_id, name, bio, maps_url, latitude, longitude)
    values (actor_id, shop_name_value, shop_bio_value, maps_url_value, latitude_value, longitude_value);
  end if;

  for item in select value from jsonb_array_elements(payload->'services') loop
    if length(trim(coalesce(item->>'name', ''))) < 2
      or coalesce((item->>'price_dzd')::integer, -1) < 0
      or coalesce((item->>'duration_minutes')::integer, 0) not between 5 and 720
      or mod((item->>'duration_minutes')::integer, 5) <> 0 then
      raise exception 'Invalid service';
    end if;

    insert into public.services (barber_id, name, price_dzd, duration_minutes, is_active)
    values (
      actor_id,
      trim(item->>'name'),
      (item->>'price_dzd')::integer,
      (item->>'duration_minutes')::integer,
      true
    );
  end loop;

  if jsonb_typeof(payload->'schedules') = 'array' then
    for item in select value from jsonb_array_elements(payload->'schedules') loop
      if coalesce((item->>'enabled')::boolean, false) then
        starts_at_value := (item->>'starts_at')::time;
        ends_at_value := (item->>'ends_at')::time;
        if starts_at_value >= ends_at_value then
          raise exception 'Invalid schedule hours';
        end if;

        insert into public.weekly_schedules (barber_id, day_of_week, starts_at, ends_at, interval_minutes)
        values (
          actor_id,
          (item->>'day_of_week')::smallint,
          starts_at_value,
          ends_at_value,
          (payload->>'interval_minutes')::integer
        ) returning id into schedule_id;

        enabled_schedule_count := enabled_schedule_count + 1;

        if jsonb_typeof(item->'breaks') = 'array' then
          for break_item in select value from jsonb_array_elements(item->'breaks') loop
            break_starts := (break_item->>'starts_at')::time;
            break_ends := (break_item->>'ends_at')::time;
            if break_starts >= break_ends then
              raise exception 'Invalid schedule break';
            end if;
            insert into public.schedule_breaks (schedule_id, starts_at, ends_at)
            values (schedule_id, break_starts, break_ends);
          end loop;
        end if;
      end if;
    end loop;
  end if;

  if enabled_schedule_count < 1 then
    raise exception 'At least one working day is required';
  end if;

  delete from public.onboarding_drafts where user_id = actor_id;
end;
$$;

revoke all on function public.publish_barber_profile(jsonb) from public;
grant execute on function public.publish_barber_profile(jsonb) to authenticated;
