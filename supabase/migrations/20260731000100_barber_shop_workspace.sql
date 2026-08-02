-- Versioned Shop discovery and owner workspace support.
-- Existing Shop RPCs remain available for older callers.

create or replace function public.search_published_shops_v2(
  search_query text default '',
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
  owner_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    shop.id,
    shop.name,
    shop.bio,
    shop.maps_url,
    owner.city,
    owner.neighborhood,
    shop.average_rating,
    shop.rating_count,
    owner.name
  from public.shops shop
  join public.profiles owner on owner.id = shop.owner_id
  where owner.role = 'barber'
    and owner.is_published
    and (
      coalesce(search_query, '') = ''
      or public.normalize_booking_search(
        shop.name || ' ' || coalesce(shop.bio, '') || ' ' || owner.name || ' ' ||
        coalesce(owner.city, '') || ' ' || coalesce(owner.neighborhood, '')
      ) like '%' || public.normalize_booking_search(search_query) || '%'
    )
  order by shop.name, shop.id
  limit 20 offset greatest(page_number, 0) * 20;
$$;

create or replace function public.get_public_shop_profile_v2(target_shop_id uuid)
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
  barbers jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    shop.id,
    shop.name,
    shop.bio,
    shop.maps_url,
    owner.city,
    owner.neighborhood,
    shop.average_rating,
    shop.rating_count,
    owner.name,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', barber.id,
          'name', barber.name,
          'phone', barber.phone,
          'is_owner', barber.id = shop.owner_id
        )
        order by barber.name, barber.id
      )
      from (
        select owner_profile.id, owner_profile.name, owner_profile.phone
        from public.profiles owner_profile
        where owner_profile.id = shop.owner_id
          and owner_profile.is_published
          and not owner_profile.is_booking_paused
        union
        select member.id, member.name, member.phone
        from public.shop_memberships membership
        join public.profiles member on member.id = membership.barber_id
        where membership.shop_id = shop.id
          and membership.status = 'active'
          and member.is_published
          and not member.is_booking_paused
      ) barber
    ), '[]'::jsonb)
  from public.shops shop
  join public.profiles owner on owner.id = shop.owner_id
  where shop.id = target_shop_id
    and owner.role = 'barber'
    and owner.is_published;
$$;

-- Keep archived services in the database while requiring at least one active
-- service in every saved workspace. The explicit is_active field is optional
-- for older self-serve payloads and defaults to true.
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
  active_service_count integer;
  enabled_schedule_count integer := 0;
  starts_at_value time;
  ends_at_value time;
  break_starts time;
  break_ends time;
  service_is_active boolean;
begin
  if jsonb_typeof(settings->'services') is distinct from 'array' then
    raise exception 'At least one service is required';
  end if;

  select count(*)::integer
  into active_service_count
  from jsonb_array_elements(settings->'services') service_item
  where coalesce((service_item->>'is_active')::boolean, true);
  if active_service_count < 1 then
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
    service_is_active := coalesce((item->>'is_active')::boolean, true);
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
        service_is_active
      );
    else
      update public.services
      set name = trim(item->>'name'),
          price_dzd = (item->>'price_dzd')::integer,
          duration_minutes = (item->>'duration_minutes')::integer,
          is_active = service_is_active,
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

create or replace function public.replace_future_barber_schedule_exceptions(
  target_barber_id uuid,
  exceptions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  exception_date_value date;
  starts_at_value time;
  ends_at_value time;
  local_date date := (now() at time zone 'Africa/Algiers')::date;
begin
  if jsonb_typeof(exceptions) is distinct from 'array' then
    raise exception 'Invalid schedule exceptions';
  end if;

  delete from public.schedule_exceptions
  where barber_id = target_barber_id
    and exception_date >= local_date;

  for item in select value from jsonb_array_elements(exceptions) loop
    if coalesce(item->>'exception_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Invalid schedule exception date';
    end if;

    exception_date_value := (item->>'exception_date')::date;
    if exception_date_value < local_date then
      raise exception 'Invalid schedule exception date';
    end if;

    if coalesce((item->>'is_closed')::boolean, true) then
      starts_at_value := null;
      ends_at_value := null;
    else
      starts_at_value := (item->>'starts_at')::time;
      ends_at_value := (item->>'ends_at')::time;
      if starts_at_value >= ends_at_value then
        raise exception 'Invalid schedule exception hours';
      end if;
    end if;

    insert into public.schedule_exceptions (
      barber_id,
      exception_date,
      is_closed,
      starts_at,
      ends_at,
      note
    ) values (
      target_barber_id,
      exception_date_value,
      coalesce((item->>'is_closed')::boolean, true),
      starts_at_value,
      ends_at_value,
      nullif(trim(coalesce(item->>'note', '')), '')
    );
  end loop;
end;
$$;

create or replace function public.replace_barber_workspace_settings(workspace jsonb)
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

  perform public.apply_barber_settings_payload(actor_id, workspace);
  perform public.replace_future_barber_schedule_exceptions(
    actor_id,
    workspace->'exceptions'
  );
end;
$$;

create or replace function public.shop_owner_barber_workspace(target_barber_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.shop_memberships membership
    join public.shops shop on shop.id = membership.shop_id
    where shop.owner_id = auth.uid()
      and membership.barber_id = target_barber_id
      and membership.status = 'active'
  ) then
    raise exception 'Barber is not an active shop member';
  end if;

  select jsonb_build_object(
    'is_booking_paused', profile.is_booking_paused,
    'booking_window_days', profile.booking_window_days,
    'minimum_notice_minutes', profile.minimum_notice_minutes,
    'interval_minutes', coalesce((
      select schedule.interval_minutes
      from public.weekly_schedules schedule
      where schedule.barber_id = profile.id
      order by schedule.day_of_week
      limit 1
    ), 30),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', service.id,
        'name', service.name,
        'price_dzd', service.price_dzd,
        'duration_minutes', service.duration_minutes,
        'is_active', service.is_active
      ) order by service.is_active desc, service.name, service.id)
      from public.services service
      where service.barber_id = profile.id
    ), '[]'::jsonb),
    'schedules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day_of_week', schedule.day_of_week,
        'enabled', true,
        'starts_at', to_char(schedule.starts_at, 'HH24:MI'),
        'ends_at', to_char(schedule.ends_at, 'HH24:MI'),
        'breaks', coalesce((
          select jsonb_agg(jsonb_build_object(
            'starts_at', to_char(break_row.starts_at, 'HH24:MI'),
            'ends_at', to_char(break_row.ends_at, 'HH24:MI')
          ) order by break_row.starts_at)
          from public.schedule_breaks break_row
          where break_row.schedule_id = schedule.id
        ), '[]'::jsonb)
      ) order by schedule.day_of_week)
      from public.weekly_schedules schedule
      where schedule.barber_id = profile.id
    ), '[]'::jsonb),
    'exceptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', exception_row.id,
        'exception_date', exception_row.exception_date,
        'is_closed', exception_row.is_closed,
        'starts_at', exception_row.starts_at,
        'ends_at', exception_row.ends_at,
        'note', exception_row.note
      ) order by exception_row.exception_date)
      from public.schedule_exceptions exception_row
      where exception_row.barber_id = profile.id
        and exception_row.exception_date >= (now() at time zone 'Africa/Algiers')::date
    ), '[]'::jsonb)
  )
  into result
  from public.profiles profile
  where profile.id = target_barber_id;

  return result;
end;
$$;

create or replace function public.shop_owner_replace_barber_workspace(
  target_barber_id uuid,
  workspace jsonb
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
  if jsonb_typeof(workspace->'exceptions') is distinct from 'array' then
    raise exception 'Invalid schedule exceptions';
  end if;

  perform public.apply_barber_settings_payload(target_barber_id, workspace);
  perform public.replace_future_barber_schedule_exceptions(
    target_barber_id,
    workspace->'exceptions'
  );

  insert into public.activity_logs (shop_id, actor_id, affected_barber_id, action, details)
  values (
    target_shop_id,
    actor_id,
    target_barber_id,
    'barber_settings_updated',
    workspace - 'services' - 'schedules' - 'exceptions'
  );
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

create or replace function public.remove_shop_member(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership public.shop_memberships%rowtype;
  target_shop public.shops%rowtype;
  appointment_row public.appointments%rowtype;
  cancelled_count integer := 0;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  select membership_row.*
  into membership
  from public.shop_memberships membership_row
  join public.shops shop on shop.id = membership_row.shop_id and shop.owner_id = actor_id
  where membership_row.id = target_membership_id
    and membership_row.status = 'active';
  if not found then
    raise exception 'Shop member cannot be removed';
  end if;

  select * into target_shop from public.shops where id = membership.shop_id;

  for appointment_row in
    select *
    from public.appointments
    where barber_id = membership.barber_id
      and shop_id = membership.shop_id
      and status = 'booked'
      and starts_at > now()
  loop
    update public.appointments
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = appointment_row.id;
    cancelled_count := cancelled_count + 1;
    perform public.insert_booking_notification(
      appointment_row.customer_id,
      'تم إلغاء الموعد',
      'تم إلغاء موعدك لأن الحلاق لم يعد عضواً في المحل.',
      appointment_row.id
    );
  end loop;

  delete from public.shop_memberships where id = membership.id;

  insert into public.activity_logs (shop_id, actor_id, affected_barber_id, action, details)
  values (
    target_shop.id,
    actor_id,
    membership.barber_id,
    'member_removed',
    jsonb_build_object('cancelled_appointments', cancelled_count)
  );
  perform public.insert_booking_notification(
    membership.barber_id,
    'تمت إزالتك من المحل',
    'أزالك مالك المحل من عضوية المحل.',
    null
  );
end;
$$;

revoke all on function public.search_published_shops_v2(text, integer) from public;
revoke all on function public.search_published_shops_v2(text, integer) from anon;
revoke all on function public.get_public_shop_profile_v2(uuid) from public;
revoke all on function public.get_public_shop_profile_v2(uuid) from anon;
revoke all on function public.remove_shop_member(uuid) from public;
revoke all on function public.remove_shop_member(uuid) from anon;
revoke all on function public.shop_owner_barber_workspace(uuid) from public;
revoke all on function public.shop_owner_barber_workspace(uuid) from anon;
revoke all on function public.shop_owner_replace_barber_workspace(uuid, jsonb) from public;
revoke all on function public.shop_owner_replace_barber_workspace(uuid, jsonb) from anon;
grant execute on function public.search_published_shops_v2(text, integer) to authenticated;
grant execute on function public.get_public_shop_profile_v2(uuid) to authenticated;
grant execute on function public.remove_shop_member(uuid) to authenticated;
grant execute on function public.shop_owner_barber_workspace(uuid) to authenticated;
grant execute on function public.shop_owner_replace_barber_workspace(uuid, jsonb) to authenticated;
