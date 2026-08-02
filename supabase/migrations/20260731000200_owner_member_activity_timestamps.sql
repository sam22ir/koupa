-- Expose membership timestamps to the owner roster so the UI can show
-- membership activity without exposing unrelated profile fields.
drop function if exists public.shop_owner_members(uuid);

create or replace function public.shop_owner_members(target_shop_id uuid)
returns table (
  id uuid,
  barber_id uuid,
  barber_name text,
  barber_phone text,
  status public.membership_status,
  invited_by uuid,
  invitation_expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
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
    membership.invitation_expires_at,
    membership.created_at,
    membership.updated_at
  from public.shop_memberships membership
  join public.shops shop on shop.id = membership.shop_id and shop.owner_id = auth.uid()
  join public.profiles barber on barber.id = membership.barber_id
  where membership.shop_id = target_shop_id
  order by barber.name;
$$;

revoke all on function public.shop_owner_members(uuid) from public;
revoke all on function public.shop_owner_members(uuid) from anon;
grant execute on function public.shop_owner_members(uuid) to authenticated;
