-- Atomically replace a barber's booking settings and date-specific exceptions.

create or replace function public.replace_barber_workspace_settings(workspace jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  item jsonb;
  exception_date_value date;
  starts_at_value time;
  ends_at_value time;
begin
  if actor_id is null or not exists (
    select 1
    from public.profiles
    where id = actor_id and role = 'barber'
  ) then
    raise exception 'Barber settings cannot be updated';
  end if;

  if jsonb_typeof(workspace->'exceptions') is distinct from 'array' then
    raise exception 'Invalid schedule exceptions';
  end if;

  perform public.apply_barber_settings_payload(actor_id, workspace);

  delete from public.schedule_exceptions
  where barber_id = actor_id;

  for item in select value from jsonb_array_elements(workspace->'exceptions') loop
    if coalesce(item->>'exception_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Invalid schedule exception date';
    end if;

    exception_date_value := (item->>'exception_date')::date;
    if exception_date_value < (now() at time zone 'Africa/Algiers')::date then
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
      actor_id,
      exception_date_value,
      coalesce((item->>'is_closed')::boolean, true),
      starts_at_value,
      ends_at_value,
      nullif(trim(coalesce(item->>'note', '')), '')
    );
  end loop;
end;
$$;

revoke all on function public.replace_barber_workspace_settings(jsonb) from public;
revoke all on function public.replace_barber_workspace_settings(jsonb) from anon;
grant execute on function public.replace_barber_workspace_settings(jsonb) to authenticated;
