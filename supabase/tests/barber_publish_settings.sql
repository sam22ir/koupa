-- Structural + grant checks for atomic barber publish/settings RPCs.

do $$
begin
  if to_regprocedure('public.apply_barber_settings_payload(uuid,jsonb)') is null then
    raise exception 'missing apply_barber_settings_payload helper';
  end if;
  if to_regprocedure('public.replace_barber_settings(jsonb)') is null then
    raise exception 'missing replace_barber_settings';
  end if;
  if to_regprocedure('public.publish_barber_profile(jsonb)') is null then
    raise exception 'missing publish_barber_profile';
  end if;
  if to_regprocedure('public.shop_owner_update_barber_settings(uuid,jsonb)') is null then
    raise exception 'missing shop_owner_update_barber_settings';
  end if;
end;
$$;

do $$
declare
  function_source text;
  owner_branch_start integer;
  owner_insert_branch_start integer;
  shop_insert_start integer;
begin
  select pg_get_functiondef(
    'public.publish_barber_profile(jsonb)'::regprocedure
  ) into function_source;

  owner_branch_start := position('if workplace_type_value = ''owner'' then' in function_source);
  owner_insert_branch_start := case
    when owner_branch_start = 0 then 0
    else owner_branch_start + coalesce(nullif(position(
      'if workplace_type_value = ''owner'' then'
      in substring(function_source from owner_branch_start + 1)
    ), 0), -owner_branch_start)
  end;
  shop_insert_start := position('insert into public.shops' in function_source);

  if position('shop_name' in function_source) = 0
    or shop_insert_start = 0
    or owner_branch_start = 0
    or owner_insert_branch_start = 0
    or shop_insert_start < owner_insert_branch_start then
    raise exception 'owner publish must create the owned shop from onboarding data';
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege('authenticated', 'public.replace_barber_settings(jsonb)', 'execute') then
    raise exception 'authenticated cannot execute replace_barber_settings';
  end if;
  if not has_function_privilege('authenticated', 'public.publish_barber_profile(jsonb)', 'execute') then
    raise exception 'authenticated cannot execute publish_barber_profile';
  end if;
  if has_function_privilege('anon', 'public.apply_barber_settings_payload(uuid,jsonb)', 'execute') then
    raise exception 'anon must not execute apply_barber_settings_payload';
  end if;
end;
$$;
