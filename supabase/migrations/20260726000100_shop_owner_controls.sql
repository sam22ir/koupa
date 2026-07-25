-- Shop owners can invite barbers and manage affiliated barbers' availability.
alter table public.shop_memberships
  add column if not exists invitation_expires_at timestamptz;

create index if not exists shop_memberships_invitation_expiry_idx
  on public.shop_memberships (invitation_expires_at)
  where status = 'pending' and invitation_expires_at is not null;

create or replace function public.shop_owner_members(target_shop_id uuid)
returns table (
  id uuid,
  barber_id uuid,
  barber_name text,
  barber_phone text,
  status public.membership_status,
  invited_by uuid,
  invitation_expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select membership.id,
    membership.barber_id,
    barber.name,
    barber.phone,
    membership.status,
    membership.invited_by,
    membership.invitation_expires_at
  from public.shop_memberships membership
  join public.shops shop on shop.id = membership.shop_id and shop.owner_id = auth.uid()
  join public.profiles barber on barber.id = membership.barber_id
  where membership.shop_id = target_shop_id
  order by barber.name;
$$;

create or replace function public.shop_owner_barber_settings(target_barber_id uuid)
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
      ) order by service.name)
      from public.services service
      where service.barber_id = profile.id and service.is_active
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
    ), '[]'::jsonb)
  ) into result
  from public.profiles profile
  where profile.id = target_barber_id;

  return result;
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
  item jsonb;
  break_item jsonb;
  service_id uuid;
  schedule_id uuid;
  service_count integer;
begin
  select membership.shop_id into target_shop_id
  from public.shop_memberships membership
  join public.shops shop on shop.id = membership.shop_id and shop.owner_id = actor_id
  where membership.barber_id = target_barber_id
    and membership.status = 'active';

  if actor_id is null or target_shop_id is null then
    raise exception 'Barber is not an active shop member';
  end if;
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
      values (target_barber_id, trim(item->>'name'), (item->>'price_dzd')::integer, (item->>'duration_minutes')::integer, true);
    else
      update public.services
      set name = trim(item->>'name'),
          price_dzd = (item->>'price_dzd')::integer,
          duration_minutes = (item->>'duration_minutes')::integer,
          is_active = true,
          updated_at = now()
      where id = service_id and barber_id = target_barber_id;
      if not found then raise exception 'Invalid service'; end if;
    end if;
  end loop;

  delete from public.weekly_schedules where barber_id = target_barber_id;

  if jsonb_typeof(settings->'schedules') = 'array' then
    for item in select value from jsonb_array_elements(settings->'schedules') loop
      if coalesce((item->>'enabled')::boolean, false) then
        insert into public.weekly_schedules (barber_id, day_of_week, starts_at, ends_at, interval_minutes)
        values (
          target_barber_id,
          (item->>'day_of_week')::smallint,
          (item->>'starts_at')::time,
          (item->>'ends_at')::time,
          (settings->>'interval_minutes')::integer
        ) returning id into schedule_id;

        if jsonb_typeof(item->'breaks') = 'array' then
          for break_item in select value from jsonb_array_elements(item->'breaks') loop
            insert into public.schedule_breaks (schedule_id, starts_at, ends_at)
            values (schedule_id, (break_item->>'starts_at')::time, (break_item->>'ends_at')::time);
          end loop;
        end if;
      end if;
    end loop;
  end if;

  update public.profiles
  set is_booking_paused = coalesce((settings->>'is_booking_paused')::boolean, false),
      booking_window_days = (settings->>'booking_window_days')::integer,
      minimum_notice_minutes = (settings->>'minimum_notice_minutes')::integer,
      updated_at = now()
  where id = target_barber_id;

  insert into public.activity_logs (shop_id, actor_id, affected_barber_id, action, details)
  values (target_shop_id, actor_id, target_barber_id, 'barber_settings_updated', settings - 'services' - 'schedules');
  perform public.insert_booking_notification(target_barber_id, 'تم تعديل إعداداتك', 'قام مالك المحل بتعديل الخدمات أو أوقات العمل الخاصة بك.', null);
  perform public.insert_booking_notification(actor_id, 'تم حفظ إعدادات الحلاق', 'تم تحديث إعدادات الحلاق بنجاح.', null);
end;
$$;

create or replace function public.invite_barber_to_shop(target_shop_id uuid, target_barber_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership_id uuid;
begin
  if not exists (select 1 from public.shops where id = target_shop_id and owner_id = actor_id)
    or target_barber_id = actor_id
    or not exists (select 1 from public.profiles where id = target_barber_id and role = 'barber' and is_published) then
    raise exception 'Invitation cannot be sent';
  end if;
  if exists (select 1 from public.shops where owner_id = target_barber_id)
    or exists (select 1 from public.shop_memberships where barber_id = target_barber_id and status in ('pending', 'active')) then
    raise exception 'Invitation cannot be sent';
  end if;

  insert into public.shop_memberships (shop_id, barber_id, status, invited_by, invitation_expires_at)
  values (target_shop_id, target_barber_id, 'pending', actor_id, now() + interval '30 days')
  returning id into membership_id;
  perform public.insert_booking_notification(target_barber_id, 'دعوة للانضمام إلى محل', 'تمت دعوتك للانضمام إلى محل حلاقة. تنتهي الدعوة بعد 30 يوماً.', null);
  return membership_id;
exception when unique_violation then
  raise exception 'Invitation cannot be sent';
end;
$$;

create or replace function public.respond_shop_invitation(target_membership_id uuid, accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership public.shop_memberships%rowtype;
  owner_id uuid;
begin
  select * into membership
  from public.shop_memberships
  where id = target_membership_id and barber_id = actor_id and invited_by is not null;
  if not found or membership.status <> 'pending' then raise exception 'Invitation cannot be updated'; end if;
  if membership.invitation_expires_at is not null and membership.invitation_expires_at <= now() then
    update public.shop_memberships set status = 'rejected', updated_at = now() where id = membership.id;
    raise exception 'Invitation has expired';
  end if;
  select shop.owner_id into owner_id from public.shops shop where shop.id = membership.shop_id;
  update public.shop_memberships
  set status = case when accept then 'active'::public.membership_status else 'rejected'::public.membership_status end,
      invitation_expires_at = null,
      updated_at = now()
  where id = membership.id;
  perform public.insert_booking_notification(
    owner_id,
    case when accept then 'تم قبول الدعوة' else 'تم رفض الدعوة' end,
    case when accept then 'قبل الحلاق دعوتك للانضمام إلى المحل.' else 'رفض الحلاق دعوتك للانضمام إلى المحل.' end,
    null
  );
  return membership.id;
end;
$$;

revoke all on function public.shop_owner_members(uuid) from public;
revoke all on function public.shop_owner_barber_settings(uuid) from public;
revoke all on function public.shop_owner_update_barber_settings(uuid, jsonb) from public;
revoke all on function public.invite_barber_to_shop(uuid, uuid) from public;
revoke all on function public.respond_shop_invitation(uuid, boolean) from public;
grant execute on function public.shop_owner_members(uuid), public.shop_owner_barber_settings(uuid), public.shop_owner_update_barber_settings(uuid, jsonb), public.invite_barber_to_shop(uuid, uuid), public.respond_shop_invitation(uuid, boolean) to authenticated;

-- Join requests are not invitations and have no expiry.
create or replace function public.request_join_shop(target_shop_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership_id uuid;
  owner_id uuid;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles where id = actor_id and role = 'barber' and is_published
  ) then raise exception 'Join request cannot be submitted'; end if;
  if exists (select 1 from public.shops shop where shop.owner_id = actor_id)
    or exists (select 1 from public.shop_memberships membership where membership.barber_id = actor_id and membership.status in ('pending', 'active')) then
    raise exception 'Join request cannot be submitted';
  end if;
  select shop.owner_id into owner_id from public.shops shop where shop.id = target_shop_id;
  if owner_id is null then raise exception 'Join request cannot be submitted'; end if;
  insert into public.shop_memberships (shop_id, barber_id, status, invited_by, invitation_expires_at)
  values (target_shop_id, actor_id, 'pending', null, null)
  returning id into membership_id;
  perform public.insert_booking_notification(owner_id, 'طلب انضمام جديد', 'طلب حلاق الانضمام إلى محلك.', null);
  return membership_id;
exception when unique_violation then
  raise exception 'Join request cannot be submitted';
end;
$$;

create or replace function public.respond_shop_membership(target_membership_id uuid, accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership public.shop_memberships%rowtype;
begin
  select * into membership from public.shop_memberships where id = target_membership_id;
  if not found or actor_id is null or not exists (select 1 from public.shops where id = membership.shop_id and owner_id = actor_id) or membership.status <> 'pending' or membership.invited_by is not null then
    raise exception 'Membership cannot be updated';
  end if;
  update public.shop_memberships
  set status = case when accept then 'active'::public.membership_status else 'rejected'::public.membership_status end,
      updated_at = now()
  where id = membership.id;
  perform public.insert_booking_notification(membership.barber_id, case when accept then 'تم قبول طلب الانضمام' else 'تم رفض طلب الانضمام' end, case when accept then 'أصبحت عضواً في المحل.' else 'تم رفض طلب انضمامك إلى المحل.' end, null);
  return membership.id;
end;
$$;
