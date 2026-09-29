-- Fix the publish path for the normal case.
--
-- jsonb_typeof(NULL) returns NULL, so an empty payload left supplied_services
-- NULL rather than false, skipped the "publish what is already saved" branch,
-- and every barber publishing from the Today checklist hit
-- 'Invalid appointment interval'. Verified broken against staging.

create or replace function public.publish_barber_profile(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  existing public.profiles%rowtype;
  confirmed_at timestamptz;
  workplace_type_value text;
  shop_name_value text;
  shop_bio_value text;
  item jsonb;
  break_item jsonb;
  schedule_id uuid;
  enabled_schedule_count integer := 0;
  supplied_services boolean;
  starts_at_value time;
  ends_at_value time;
  break_starts time;
  break_ends time;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  -- Publishing makes this profile publicly discoverable and bookable, so it
  -- is the point where email ownership must be proven.
  select email_confirmed_at into confirmed_at from auth.users where id = actor_id;
  if confirmed_at is null then
    raise exception 'A confirmed email is required' using errcode = '42501';
  end if;

  select * into existing from public.profiles where id = actor_id for update;
  if not found then
    raise exception 'Complete your barber profile before publishing';
  end if;
  if existing.role <> 'barber' then
    raise exception 'Profile role must match the selected account role';
  end if;
  if existing.is_published then
    delete from public.onboarding_drafts where user_id = actor_id;
    return;
  end if;

  -- The stored row is authoritative for identity, workplace type and
  -- location; those were validated when the unpublished row was created.
  workplace_type_value := existing.workplace_type;

  if workplace_type_value = 'owner' then
    shop_name_value := nullif(trim(coalesce(payload->>'shop_name', '')), '');
    shop_bio_value := nullif(trim(coalesce(payload->>'shop_bio', '')), '');
    if existing.maps_url is null
      and (existing.latitude is null or existing.longitude is null) then
      raise exception 'Barber location is required';
    end if;
  end if;

  -- Two ways in. A payload carrying services replaces the catalogue and hours
  -- wholesale, which is the one-shot path. An empty payload publishes what the
  -- barber already built from the Schedule tab, which is the normal path once
  -- the profile is created early.
  -- coalesce is required: jsonb_typeof(NULL) is NULL, not 'array', so an empty
  -- payload would leave this NULL and fall through to the one-shot branch.
  supplied_services := coalesce(
    jsonb_typeof(payload->'services') = 'array'
      and jsonb_array_length(payload->'services') > 0,
    false
  );

  if not supplied_services then
    if not exists (
      select 1 from public.services
      where barber_id = actor_id and is_active
    ) then
      raise exception 'At least one service is required';
    end if;
    select count(*) into enabled_schedule_count
    from public.weekly_schedules where barber_id = actor_id;
    if enabled_schedule_count < 1 then
      raise exception 'At least one working day is required';
    end if;
    perform set_config('koupa.trusted_publish', 'on', true);
    update public.profiles
    set is_published = true, updated_at = now()
    where id = actor_id;
    perform set_config('koupa.trusted_publish', 'off', true);
    delete from public.onboarding_drafts where user_id = actor_id;
    return;
  end if;

  if coalesce((payload->>'interval_minutes')::integer, 0) not in (5, 10, 15, 30) then
    raise exception 'Invalid appointment interval';
  end if;

  -- Replace rather than append, so a retry never duplicates rows.
  delete from public.schedule_breaks
  where schedule_id in (select id from public.weekly_schedules where barber_id = actor_id);
  delete from public.weekly_schedules where barber_id = actor_id;
  update public.services set is_active = false where barber_id = actor_id;

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

  if workplace_type_value = 'owner'
    and not exists (select 1 from public.shops where owner_id = actor_id) then
    insert into public.shops (owner_id, name, bio, maps_url, latitude, longitude)
    values (
      actor_id,
      shop_name_value,
      shop_bio_value,
      existing.maps_url,
      existing.latitude,
      existing.longitude
    );
  end if;

  -- Last write wins, and the shop insert above fires the owner location sync
  -- trigger, so the publish flag must be set after it.
  perform set_config('koupa.trusted_publish', 'on', true);
  update public.profiles
  set is_published = true,
      bio = coalesce(nullif(trim(coalesce(payload->>'bio', '')), ''), bio),
      updated_at = now()
  where id = actor_id;
  perform set_config('koupa.trusted_publish', 'off', true);

  delete from public.onboarding_drafts where user_id = actor_id;
end;
$$;

revoke all on function public.publish_barber_profile(jsonb) from public, anon;
grant execute on function public.publish_barber_profile(jsonb) to authenticated;
