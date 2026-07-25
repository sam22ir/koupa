-- Allow users to mark their own notifications as read.
drop policy if exists user_notifications_update on public.notifications;
create policy user_notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.mark_notifications_read(notification_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and read_at is null
    and (notification_ids is null or id = any(notification_ids));

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  appointment_row public.appointments%rowtype;
  owned_shop_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  -- Cancel upcoming bookings where this user is the customer.
  for appointment_row in
    select * from public.appointments
    where customer_id = actor_id
      and status = 'booked'
      and starts_at > now()
  loop
    update public.appointments
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = appointment_row.id;
    perform public.insert_booking_notification(
      appointment_row.barber_id,
      'تم إلغاء موعد',
      'أُلغي الموعد لأن العميل حذف حسابه.',
      appointment_row.id
    );
  end loop;

  -- Cancel upcoming bookings where this user is the barber.
  for appointment_row in
    select * from public.appointments
    where barber_id = actor_id
      and status = 'booked'
      and starts_at > now()
  loop
    update public.appointments
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = appointment_row.id;
    perform public.insert_booking_notification(
      appointment_row.customer_id,
      'تم إلغاء الموعد',
      'أُلغي الموعد لأن الحلاق حذف حسابه.',
      appointment_row.id
    );
  end loop;

  -- Close owned shop if present.
  select id into owned_shop_id from public.shops where owner_id = actor_id;
  if owned_shop_id is not null then
    for appointment_row in
      select * from public.appointments
      where shop_id = owned_shop_id
        and status = 'booked'
        and starts_at > now()
    loop
      update public.appointments
      set status = 'cancelled', cancelled_at = now(), updated_at = now()
      where id = appointment_row.id;
      perform public.insert_booking_notification(
        appointment_row.customer_id,
        'تم إلغاء الموعد',
        'تم إلغاء موعدك لأن المحل أُغلق.',
        appointment_row.id
      );
    end loop;
    delete from public.shop_memberships where shop_id = owned_shop_id;
    delete from public.shops where id = owned_shop_id;
  end if;

  -- Leave any remaining memberships.
  delete from public.shop_memberships where barber_id = actor_id;

  delete from public.device_push_tokens where user_id = actor_id;
  delete from public.onboarding_drafts where user_id = actor_id;
  delete from public.legal_acceptances where user_id = actor_id;
  delete from public.notifications where user_id = actor_id;

  -- Anonymize historical profile data while preserving appointment FKs.
  -- Keep a placeholder maps_url so barber location constraints still hold.
  update public.profiles
  set
    name = 'حساب محذوف',
    phone = 'deleted',
    bio = null,
    city = null,
    neighborhood = null,
    maps_url = case when role = 'barber' then 'deleted' else null end,
    latitude = null,
    longitude = null,
    is_published = false,
    is_booking_paused = true,
    updated_at = now()
  where id = actor_id;

  update public.services
  set is_active = false, updated_at = now()
  where barber_id = actor_id;

  delete from public.schedule_breaks
  where schedule_id in (select id from public.weekly_schedules where barber_id = actor_id);
  delete from public.weekly_schedules where barber_id = actor_id;
  delete from public.schedule_exceptions where barber_id = actor_id;

  delete from auth.users where id = actor_id;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public;
revoke all on function public.delete_own_account() from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.delete_own_account() to authenticated;
