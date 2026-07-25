-- Qualify owner_id in the join-request function so schema lint and runtime resolve it deterministically.
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
  perform public.insert_booking_notification(owner_id, 'طلب انضمام جديد', 'طلب حلاق الانضمام إلى محلك.', null);
  return membership_id;
exception when unique_violation then
  raise exception 'Join request cannot be submitted';
end;
$$;
