create or replace function public.shop_activity_history(target_shop_id uuid)
returns table (
  id uuid,
  action text,
  actor_name text,
  affected_barber_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (
    select 1 from public.shops shop where shop.id = target_shop_id and shop.owner_id = auth.uid()
  ) and not exists (
    select 1 from public.activity_logs log
    where log.shop_id = target_shop_id and (log.actor_id = auth.uid() or log.affected_barber_id = auth.uid())
  ) then
    raise exception 'Not authorized to view this shop activity';
  end if;

  return query
  select log.id, log.action, actor.name, affected.name, log.created_at
  from public.activity_logs log
  join public.profiles actor on actor.id = log.actor_id
  left join public.profiles affected on affected.id = log.affected_barber_id
  where log.shop_id = target_shop_id
    and (
      exists (select 1 from public.shops shop where shop.id = target_shop_id and shop.owner_id = auth.uid())
      or log.actor_id = auth.uid()
      or log.affected_barber_id = auth.uid()
    )
  order by log.created_at desc
  limit 50;
end;
$$;

revoke all on function public.shop_activity_history(uuid) from public;
grant execute on function public.shop_activity_history(uuid) to authenticated;
