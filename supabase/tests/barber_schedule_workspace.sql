-- Structural and authorization checks for the atomic barber Schedule workspace RPC.

do $$
begin
  if to_regprocedure('public.replace_barber_workspace_settings(jsonb)') is null then
    raise exception 'missing replace_barber_workspace_settings';
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege(
    'authenticated',
    'public.replace_barber_workspace_settings(jsonb)',
    'execute'
  ) then
    raise exception 'authenticated cannot execute replace_barber_workspace_settings';
  end if;

  if has_function_privilege(
    'anon',
    'public.replace_barber_workspace_settings(jsonb)',
    'execute'
  ) then
    raise exception 'anon must not execute replace_barber_workspace_settings';
  end if;
end;
$$;

do $$
declare
  function_source text;
begin
  select pg_get_functiondef('public.replace_barber_workspace_settings(jsonb)'::regprocedure)
  into function_source;

  if position('apply_barber_settings_payload' in function_source) = 0
    or position('schedule_exceptions' in function_source) = 0 then
    raise exception 'workspace RPC must update settings and exceptions together';
  end if;
end;
$$;
