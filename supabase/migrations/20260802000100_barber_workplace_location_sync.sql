-- Allow worker barbers to publish a personal profile before joining a shop.
-- Their effective location is synchronized transactionally by the triggers below.

alter table public.profiles
  add column if not exists workplace_type text not null default 'owner';

alter table public.profiles
  drop constraint if exists profiles_workplace_type_check;

alter table public.profiles
  add constraint profiles_workplace_type_check
  check (workplace_type in ('owner', 'worker'));

alter table public.profiles
  drop constraint if exists barber_location_required;

alter table public.profiles
  add constraint barber_location_required check (
    role = 'customer'
    or workplace_type = 'worker'
    or maps_url is not null
    or (latitude is not null and longitude is not null)
  );

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
  if workplace_type_value = 'owner'
    and maps_url_value is null
    and (latitude_value is null or longitude_value is null) then
    raise exception 'Barber location is required';
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

create or replace function public.sync_worker_location_from_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shop_location record;
  barber_id_value uuid := case when tg_op = 'DELETE' then old.barber_id else new.barber_id end;
begin
  if tg_op = 'DELETE'
    or (tg_op = 'UPDATE' and old.status = 'active' and new.status <> 'active') then
    update public.profiles
    set city = null,
        neighborhood = null,
        maps_url = null,
        latitude = null,
        longitude = null,
        updated_at = now()
    where id = barber_id_value and workplace_type = 'worker';
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if new.status = 'active' then
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status is distinct from 'active') then
      select maps_url, latitude, longitude
      into shop_location
      from public.shops
      where id = new.shop_id;

      update public.profiles
      set maps_url = shop_location.maps_url,
          latitude = shop_location.latitude,
          longitude = shop_location.longitude,
          updated_at = now()
      where id = new.barber_id and workplace_type = 'worker';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.sync_owner_location_from_shop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set workplace_type = 'owner',
      maps_url = new.maps_url,
      latitude = new.latitude,
      longitude = new.longitude,
      updated_at = now()
  where id = new.owner_id;
  return new;
end;
$$;

drop trigger if exists sync_worker_location_after_membership on public.shop_memberships;
create trigger sync_worker_location_after_membership
after insert or update of status or delete on public.shop_memberships
for each row execute function public.sync_worker_location_from_membership();

drop trigger if exists sync_owner_location_after_shop on public.shops;
create trigger sync_owner_location_after_shop
after insert on public.shops
for each row execute function public.sync_owner_location_from_shop();

revoke all on function public.publish_barber_profile(jsonb) from public;
grant execute on function public.publish_barber_profile(jsonb) to authenticated;
