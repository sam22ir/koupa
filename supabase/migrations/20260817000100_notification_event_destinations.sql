-- Every notification has a typed event destination. The client maps these
-- allowlisted values to routes; arbitrary hrefs are never stored or executed.
alter table public.notifications
  add column if not exists destination jsonb not null default '{"kind":"notification"}'::jsonb;

alter table public.notifications
  drop constraint if exists notifications_destination_shape;

alter table public.notifications
  add constraint notifications_destination_shape
  check (
    jsonb_typeof(destination) = 'object'
    and jsonb_typeof(destination->'kind') = 'string'
  );

update public.notifications
set destination = jsonb_build_object('kind', 'appointment', 'appointmentId', appointment_id)
where appointment_id is not null
  and destination->>'kind' = 'notification';

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

-- Keep direct writers and the retained appointment helper compatible.
create or replace function public.set_notification_appointment_destination()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.appointment_id is not null and coalesce(new.destination->>'kind', 'notification') = 'notification' then
    new.destination := jsonb_build_object('kind', 'appointment', 'appointmentId', new.appointment_id);
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_appointment_destination on public.notifications;
create trigger notifications_appointment_destination
  before insert on public.notifications
  for each row execute function public.set_notification_appointment_destination();

create or replace function public.insert_notification(
  recipient_id uuid,
  title_value text,
  body_value text,
  destination_value jsonb default '{"kind":"notification"}'::jsonb,
  appointment_id_value uuid default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, title, body, appointment_id, destination)
  values (recipient_id, title_value, body_value, appointment_id_value, destination_value);
$$;

create or replace function public.insert_booking_notification(
  recipient_id uuid,
  title_value text,
  body_value text,
  appointment_id_value uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  select public.insert_notification(
    recipient_id,
    title_value,
    body_value,
    case
      when appointment_id_value is null then '{"kind":"notification"}'::jsonb
      else jsonb_build_object('kind', 'appointment', 'appointmentId', appointment_id_value)
    end,
    appointment_id_value
  );
$$;

-- Notifications only need read-state mutation. The security-definer RPC owns
-- that mutation, so recipients cannot alter an event destination or its copy.
drop policy if exists user_notifications_update on public.notifications;

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

  perform public.insert_notification(
    target_barber_id,
    'دعوة للانضمام إلى محل',
    'تمت دعوتك للانضمام إلى محل حلاقة. تنتهي الدعوة بعد 30 يوماً.',
    jsonb_build_object(
      'kind', 'shop_membership',
      'shopId', target_shop_id,
      'membershipId', membership_id,
      'barberId', target_barber_id,
      'event', 'invitation'
    )
  );
  return membership_id;
exception when unique_violation then
  raise exception 'Invitation cannot be sent';
end;
$$;

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
    select 1 from public.profiles profile
    where profile.id = actor_id and profile.role = 'barber' and profile.is_published
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

  perform public.insert_notification(
    owner_id,
    'طلب انضمام جديد',
    'طلب حلاق الانضمام إلى محلك.',
    jsonb_build_object(
      'kind', 'shop_membership',
      'shopId', target_shop_id,
      'membershipId', membership_id,
      'barberId', actor_id,
      'event', 'join_requested'
    )
  );
  return membership_id;
exception when unique_violation then
  raise exception 'Join request cannot be submitted';
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

  perform public.insert_notification(
    owner_id,
    case when accept then 'تم قبول الدعوة' else 'تم رفض الدعوة' end,
    case when accept then 'قبل الحلاق دعوتك للانضمام إلى المحل.' else 'رفض الحلاق دعوتك للانضمام إلى المحل.' end,
    case
      when accept then jsonb_build_object('kind', 'shop_member', 'shopId', membership.shop_id, 'barberId', membership.barber_id)
      else jsonb_build_object('kind', 'notification', 'event', 'invitation_rejected', 'shopId', membership.shop_id, 'membershipId', membership.id)
    end
  );
  return membership.id;
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
  if not found or actor_id is null or not exists (
    select 1 from public.shops where id = membership.shop_id and owner_id = actor_id
  ) or membership.status <> 'pending' or membership.invited_by is not null then
    raise exception 'Membership cannot be updated';
  end if;
  update public.shop_memberships
  set status = case when accept then 'active'::public.membership_status else 'rejected'::public.membership_status end,
      updated_at = now()
  where id = membership.id;

  perform public.insert_notification(
    membership.barber_id,
    case when accept then 'تم قبول طلب الانضمام' else 'تم رفض طلب الانضمام' end,
    case when accept then 'أصبحت عضواً في المحل.' else 'تم رفض طلب انضمامك إلى المحل.' end,
    case
      when accept then jsonb_build_object('kind', 'shop_membership', 'shopId', membership.shop_id, 'membershipId', membership.id, 'barberId', membership.barber_id, 'event', 'join_accepted')
      else jsonb_build_object('kind', 'notification', 'event', 'join_rejected', 'shopId', membership.shop_id, 'membershipId', membership.id)
    end
  );
  return membership.id;
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
  where membership.barber_id = target_barber_id and membership.status = 'active';
  if actor_id is null or target_shop_id is null then raise exception 'Barber is not an active shop member'; end if;
  if jsonb_typeof(workspace->'exceptions') is distinct from 'array' then raise exception 'Invalid schedule exceptions'; end if;

  perform public.apply_barber_settings_payload(target_barber_id, workspace);
  perform public.replace_future_barber_schedule_exceptions(target_barber_id, workspace->'exceptions');
  insert into public.activity_logs (shop_id, actor_id, affected_barber_id, action, details)
  values (target_shop_id, actor_id, target_barber_id, 'barber_settings_updated', workspace - 'services' - 'schedules' - 'exceptions');

  perform public.insert_notification(
    target_barber_id,
    'تم تعديل إعداداتك',
    'قام مالك المحل بتعديل الخدمات أو أوقات العمل الخاصة بك.',
    jsonb_build_object('kind', 'barber_workspace', 'shopId', target_shop_id, 'barberId', target_barber_id)
  );
  perform public.insert_notification(
    actor_id,
    'تم حفظ إعدادات الحلاق',
    'تم تحديث إعدادات الحلاق بنجاح.',
    jsonb_build_object('kind', 'shop_member', 'shopId', target_shop_id, 'barberId', target_barber_id)
  );
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
  where membership.barber_id = target_barber_id and membership.status = 'active';
  if actor_id is null or target_shop_id is null then raise exception 'Barber is not an active shop member'; end if;

  perform public.apply_barber_settings_payload(target_barber_id, settings);
  insert into public.activity_logs (shop_id, actor_id, affected_barber_id, action, details)
  values (target_shop_id, actor_id, target_barber_id, 'barber_settings_updated', settings - 'services' - 'schedules');

  perform public.insert_notification(
    target_barber_id,
    'تم تعديل إعداداتك',
    'قام مالك المحل بتعديل الخدمات أو أوقات العمل الخاصة بك.',
    jsonb_build_object('kind', 'barber_workspace', 'shopId', target_shop_id, 'barberId', target_barber_id)
  );
  perform public.insert_notification(
    actor_id,
    'تم حفظ إعدادات الحلاق',
    'تم تحديث إعدادات الحلاق بنجاح.',
    jsonb_build_object('kind', 'shop_member', 'shopId', target_shop_id, 'barberId', target_barber_id)
  );
end;
$$;

create or replace function public.barber_appointment_event(target_appointment_id uuid)
returns table (
  id uuid,
  customer_name text,
  customer_phone text,
  service_name text,
  price_dzd integer,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    appointment.id,
    customer.name,
    customer.phone,
    service.name,
    appointment.price_dzd,
    appointment.starts_at,
    appointment.ends_at,
    appointment.status
  from public.appointments appointment
  join public.profiles customer on customer.id = appointment.customer_id
  join public.services service on service.id = appointment.service_id
  where appointment.id = target_appointment_id
    and appointment.barber_id = auth.uid();
$$;

create or replace function public.transition_overdue_appointments()
returns table (absent_count integer, completed_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  absent_total integer;
  completed_total integer;
begin
  with changed as (
    update public.appointments
    set status = 'absent', updated_at = now()
    where status = 'booked' and ends_at <= now()
    returning customer_id, barber_id, id
  ), notices as (
    insert into public.notifications (user_id, title, body, appointment_id, destination)
    select
      recipient_id,
      'تم تسجيل الموعد كغائب',
      'انتهى وقت الموعد قبل تأكيد الحضور.',
      id,
      jsonb_build_object('kind', 'appointment', 'appointmentId', id)
    from changed
    cross join lateral (values (customer_id), (barber_id)) recipients(recipient_id)
    returning 1
  )
  select count(*) / 2 into absent_total from notices;

  with changed as (
    update public.appointments
    set status = 'completed', updated_at = now()
    where status = 'present' and ends_at <= now()
    returning customer_id, barber_id, id
  ), notices as (
    insert into public.notifications (user_id, title, body, appointment_id, destination)
    select
      recipient_id,
      'اكتمل الموعد',
      'تم إكمال الموعد بنجاح.',
      id,
      jsonb_build_object('kind', 'appointment', 'appointmentId', id)
    from changed
    cross join lateral (values (customer_id), (barber_id)) recipients(recipient_id)
    returning 1
  )
  select count(*) / 2 into completed_total from notices;

  return query select coalesce(absent_total, 0), coalesce(completed_total, 0);
end;
$$;

create or replace function public.leave_shop()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership public.shop_memberships%rowtype;
  appointment_row public.appointments%rowtype;
  owner_id uuid;
  activity_id uuid;
begin
  select * into membership from public.shop_memberships where barber_id = actor_id and status in ('pending', 'active') limit 1;
  if not found then raise exception 'Shop membership cannot be left'; end if;
  select shops.owner_id into owner_id from public.shops where id = membership.shop_id;

  if membership.status = 'active' then
    for appointment_row in
      select * from public.appointments
      where barber_id = actor_id and shop_id = membership.shop_id and status = 'booked' and starts_at > now()
    loop
      update public.appointments set status = 'cancelled', cancelled_at = now(), updated_at = now() where id = appointment_row.id;
      perform public.insert_booking_notification(appointment_row.customer_id, 'تم إلغاء الموعد', 'تم إلغاء موعدك لأن الحلاق غادر المحل.', appointment_row.id);
    end loop;
  end if;

  delete from public.shop_memberships where id = membership.id;
  if owner_id is not null then
    insert into public.activity_logs (shop_id, actor_id, affected_barber_id, action, details)
    values (membership.shop_id, actor_id, actor_id, 'member_left', jsonb_build_object('membership_id', membership.id))
    returning id into activity_id;
    perform public.insert_notification(
      owner_id,
      'مغادرة محل',
      'غادر أحد الحلاقين المحل.',
      jsonb_build_object('kind', 'shop_activity', 'shopId', membership.shop_id, 'activityId', activity_id)
    );
  end if;
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
  appointment_row public.appointments%rowtype;
  cancelled_count integer := 0;
  activity_id uuid;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select membership_row.* into membership
  from public.shop_memberships membership_row
  join public.shops shop on shop.id = membership_row.shop_id and shop.owner_id = actor_id
  where membership_row.id = target_membership_id and membership_row.status = 'active';
  if not found then raise exception 'Shop member cannot be removed'; end if;

  for appointment_row in
    select * from public.appointments
    where barber_id = membership.barber_id and shop_id = membership.shop_id and status = 'booked' and starts_at > now()
  loop
    update public.appointments set status = 'cancelled', cancelled_at = now(), updated_at = now() where id = appointment_row.id;
    cancelled_count := cancelled_count + 1;
    perform public.insert_booking_notification(appointment_row.customer_id, 'تم إلغاء الموعد', 'تم إلغاء موعدك لأن الحلاق لم يعد عضواً في المحل.', appointment_row.id);
  end loop;

  delete from public.shop_memberships where id = membership.id;
  insert into public.activity_logs (shop_id, actor_id, affected_barber_id, action, details)
  values (membership.shop_id, actor_id, membership.barber_id, 'member_removed', jsonb_build_object('cancelled_appointments', cancelled_count))
  returning id into activity_id;
  perform public.insert_notification(
    membership.barber_id,
    'تمت إزالتك من المحل',
    'أزالك مالك المحل من عضوية المحل.',
    jsonb_build_object('kind', 'shop_activity', 'shopId', membership.shop_id, 'activityId', activity_id)
  );
end;
$$;

revoke all on function public.insert_notification(uuid, text, text, jsonb, uuid) from public;
revoke all on function public.insert_booking_notification(uuid, text, text, uuid) from public;
revoke all on function public.barber_appointment_event(uuid) from public;
grant execute on function public.invite_barber_to_shop(uuid, uuid), public.respond_shop_invitation(uuid, boolean), public.request_join_shop(uuid), public.respond_shop_membership(uuid, boolean), public.shop_owner_replace_barber_workspace(uuid, jsonb), public.shop_owner_update_barber_settings(uuid, jsonb), public.leave_shop(), public.remove_shop_member(uuid), public.barber_appointment_event(uuid) to authenticated;
