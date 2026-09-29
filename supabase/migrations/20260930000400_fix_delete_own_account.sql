-- delete_own_account failed for every account that had appointments (and for
-- anyone with ratings, activity logs or attendance events): the final
-- `delete from auth.users` cascades to profiles, which those tables reference
-- with ON DELETE RESTRICT. Keep the anonymized profile and disable the login
-- when hard deletion is blocked; still hard-delete accounts with no history.

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

  -- Remove the login. Deleting the Auth user cascades to the profile, which
  -- appointments, ratings, activity logs and attendance events reference with
  -- ON DELETE RESTRICT, so anyone with history cannot be hard-deleted. In that
  -- case the anonymized profile stays for those records and the login is
  -- disabled instead: identities and sessions are removed, the email, phone and
  -- password are cleared, and the account is banned for good.
  begin
    delete from auth.users where id = actor_id;
  exception when foreign_key_violation then
    delete from auth.identities where user_id = actor_id;
    delete from auth.sessions where user_id = actor_id;
    update auth.users
    set
      email = 'deleted-' || actor_id::text || '@deleted.invalid',
      phone = null,
      encrypted_password = null,
      raw_user_meta_data = '{}'::jsonb,
      raw_app_meta_data = '{}'::jsonb,
      banned_until = 'infinity'::timestamptz,
      updated_at = now()
    where id = actor_id;
  end;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
