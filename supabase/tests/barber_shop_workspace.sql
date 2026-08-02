-- Structural and authorization checks for the barber Shop workspace RPCs.

do $$
begin
  if to_regprocedure('public.search_published_shops_v2(text,integer)') is null then
    raise exception 'missing search_published_shops_v2';
  end if;
  if to_regprocedure('public.shop_owner_members(uuid)') is null then
    raise exception 'missing shop_owner_members';
  end if;
  if to_regprocedure('public.get_public_shop_profile_v2(uuid)') is null then
    raise exception 'missing get_public_shop_profile_v2';
  end if;
  if to_regprocedure('public.remove_shop_member(uuid)') is null then
    raise exception 'missing remove_shop_member';
  end if;
  if to_regprocedure('public.shop_owner_barber_workspace(uuid)') is null then
    raise exception 'missing shop_owner_barber_workspace';
  end if;
  if to_regprocedure('public.shop_owner_replace_barber_workspace(uuid,jsonb)') is null then
    raise exception 'missing shop_owner_replace_barber_workspace';
  end if;
end;
$$;

do $$
declare
  function_result text;
begin
  select pg_get_function_result(
    'public.shop_owner_members(uuid)'::regprocedure
  ) into function_result;

  if position('created_at timestamp with time zone' in function_result) = 0
    or position('updated_at timestamp with time zone' in function_result) = 0 then
    raise exception 'shop_owner_members must return membership timestamps';
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege(
    'authenticated',
    'public.search_published_shops_v2(text,integer)',
    'execute'
  ) then
    raise exception 'authenticated cannot execute search_published_shops_v2';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.get_public_shop_profile_v2(uuid)',
    'execute'
  ) then
    raise exception 'authenticated cannot execute get_public_shop_profile_v2';
  end if;
  if not has_function_privilege('authenticated', 'public.remove_shop_member(uuid)', 'execute') then
    raise exception 'authenticated cannot execute remove_shop_member';
  end if;
  if not has_function_privilege('authenticated', 'public.shop_owner_barber_workspace(uuid)', 'execute') then
    raise exception 'authenticated cannot execute shop_owner_barber_workspace';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.shop_owner_replace_barber_workspace(uuid,jsonb)',
    'execute'
  ) then
    raise exception 'authenticated cannot execute shop_owner_replace_barber_workspace';
  end if;
  if has_function_privilege('anon', 'public.remove_shop_member(uuid)', 'execute') then
    raise exception 'anon must not execute remove_shop_member';
  end if;
  if has_function_privilege('anon', 'public.shop_owner_replace_barber_workspace(uuid,jsonb)', 'execute') then
    raise exception 'anon must not execute shop_owner_replace_barber_workspace';
  end if;
end;
$$;

do $$
declare
  function_source text;
begin
  select pg_get_functiondef(
    'public.shop_owner_replace_barber_workspace(uuid,jsonb)'::regprocedure
  ) into function_source;

  if position('apply_barber_workspace_payload' in function_source) = 0
    or position('schedule_exceptions' in function_source) = 0
    or position('activity_logs' in function_source) = 0 then
    raise exception 'owner workspace RPC must save settings, exceptions, and activity together';
  end if;
end;
$$;
