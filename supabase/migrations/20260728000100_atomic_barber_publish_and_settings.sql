-- Atomic barber publish + settings replace.
-- Shared helper keeps self-serve and shop-owner update paths consistent.

create or replace function public.apply_barber_settings_payload(
  target_barber_id uuid,
  settings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  break_item jsonb;
  service_id uuid;
  schedule_id uuid;
  service_count integer;
  enabled_schedule_count integer := 0;
  starts_at_value time;
  ends_at_value time;
  break_starts time;
  break_ends time;
begin
  if jsonb_typeof(settings->'services') is distinct from 'array' then
    raise exception 'At least one service is required';
  end if;

  service_count := jsonb_array_length(settings->'services');
  if service_count < 1 then
    raise exception 'At least one service is required';
  end if;

  if coalesce((settings->>'booking_window_days')::integer, -1) not between 0 and 365 then
    raise exception 'Invalid booking window';
  end if;

  if coalesce((settings->>'minimum_notice_minutes')::integer, -1) < 0 then
    raise exception 'Invalid minimum notice';
  end if;

  if coalesce((settings->>'interval_minutes')::integer, 0) not in (5, 10, 15, 30) then
    raise exception 'Invalid appointment interval';
  end if;

  update public.services
  set is_active = false, updated_at = now()
  where barber_id = target_barber_id;

  for item in select value from jsonb_array_elements(settings->'services') loop
    if length(trim(coalesce(item->>'name', ''))) < 2
      or coalesce((item->>'price_dzd')::integer, -1) < 0
      or coalesce((item->>'duration_minutes')::integer, 0) not between 5 and 720
      or mod((item->>'duration_minutes')::integer, 5) <> 0 then
      raise exception 'Invalid service';
    end if;

    service_id := nullif(item->>'id', '')::uuid;
    if service_id is null then
      insert into public.services (barber_id, name, price_dzd, duration_minutes, is_active)
      values (
        target_barber_id,
        trim(item->>'name'),
        (item->>'price_dzd')::integer,
        (item->>'duration_minutes')::integer,
        true
      );
    else
      update public.services
      set name = trim(item->>'name'),
          price_dzd = (item->>'price_dzd')::integer,
          duration_minutes = (item->>'duration_minutes')::integer,
          is_active = true,
          updated_at = now()
      where id = service_id and barber_id = target_barber_id;
      if not found then
        raise exception 'Invalid service';
      end if;
    end if;
  end loop;

  delete from public.weekly_schedules where barber_id = target_barber_id;

  if jsonb_typeof(settings->'schedules') = 'array' then
    for item in select value from jsonb_array_elements(settings->'schedules') loop
      if coalesce((item->>'enabled')::boolean, false) then
        starts_at_value := (item->>'starts_at')::time;
        ends_at_value := (item->>'ends_at')::time;
        if starts_at_value >= ends_at_value then
          raise exception 'Invalid schedule hours';
        end if;

        insert into public.weekly_schedules (barber_id, day_of_week, starts_at, ends_at, interval_minutes)
        values (
          target_barber_id,
          (item->>'day_of_week')::smallint,
          starts_at_value,
          ends_at_value,
          (settings->>'interval_minutes')::integer
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

  update public.profiles
  set is_booking_paused = coalesce((settings->>'is_booking_paused')::boolean, false),
      booking_window_days = (settings->>'booking_window_days')::integer,
      minimum_notice_minutes = (settings->>'minimum_notice_minutes')::integer,
      updated_at = now()
  where id = target_barber_id;
end;
$$;

create or replace function public.replace_barber_settings(settings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not exists (
    select 1 from public.profiles
    where id = actor_id and role = 'barber'
  ) then
    raise exception 'Barber settings cannot be updated';
  end if;

  perform public.apply_barber_settings_payload(actor_id, settings);
end;
$$;

create or replace function public.shop_owner_update_barber_settings(
  target_barber_id uuid,
  settings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_shop_id uuid;
begin
  select membership.shop_id into target_shop_id
  from public.shop_memberships membership
  join public.shops shop on shop.id = membership.shop_id and shop.owner_id = actor_id
  where membership.barber_id = target_barber_id
    and membership.status = 'active';

  if actor_id is null or target_shop_id is null then
    raise exception 'Barber is not an active shop member';
  end if;

  perform public.apply_barber_settings_payload(target_barber_id, settings);

  insert into public.activity_logs (shop_id, actor_id, affected_barber_id, action, details)
  values (target_shop_id, actor_id, target_barber_id, 'barber_settings_updated', settings - 'services' - 'schedules');
  perform public.insert_booking_notification(
    target_barber_id,
    'تم تعديل إعداداتك',
    'قام مالك المحل بتعديل الخدمات أو أوقات العمل الخاصة بك.',
    null
  );
  perform public.insert_booking_notification(
    actor_id,
    'تم حفظ إعدادات الحلاق',
    'تم تحديث إعدادات الحلاق بنجاح.',
    null
  );
end;
$$;

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
  if maps_url_value is null and (latitude_value is null or longitude_value is null) then
    raise exception 'Barber location is required';
  end if;

  insert into public.profiles (
    id,
    role,
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

revoke all on function public.apply_barber_settings_payload(uuid, jsonb) from public;
revoke all on function public.replace_barber_settings(jsonb) from public;
revoke all on function public.publish_barber_profile(jsonb) from public;
revoke all on function public.shop_owner_update_barber_settings(uuid, jsonb) from public;

grant execute on function public.replace_barber_settings(jsonb) to authenticated;
grant execute on function public.publish_barber_profile(jsonb) to authenticated;
grant execute on function public.shop_owner_update_barber_settings(uuid, jsonb) to authenticated;
