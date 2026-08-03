-- Structural and source-level checks for worker publication and location sync.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'workplace_type'
  ) then
    raise exception 'profiles.workplace_type is missing';
  end if;

  if to_regprocedure('public.publish_barber_profile(jsonb)') is null then
    raise exception 'publish_barber_profile is missing';
  end if;

  if to_regprocedure('public.sync_worker_location_from_membership()') is null then
    raise exception 'worker membership location trigger function is missing';
  end if;
end;
$$;

do $$
declare
  function_source text;
begin
  select pg_get_functiondef('public.publish_barber_profile(jsonb)'::regprocedure)
  into function_source;
  if position('workplace_type_value' in function_source) = 0
    or position('workplace_type_value = ''owner''' in function_source) = 0
    or position('workplace_type_value = ''worker''' in function_source) = 0 then
    raise exception 'publish RPC must branch location validation by workplace type';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'sync_worker_location_after_membership'
      and tgrelid = 'public.shop_memberships'::regclass
  ) then
    raise exception 'membership location sync trigger is missing';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'sync_owner_location_after_shop'
      and tgrelid = 'public.shops'::regclass
  ) then
    raise exception 'shop location sync trigger is missing';
  end if;
end;
$$;
