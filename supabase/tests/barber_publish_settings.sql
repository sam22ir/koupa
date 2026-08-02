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
