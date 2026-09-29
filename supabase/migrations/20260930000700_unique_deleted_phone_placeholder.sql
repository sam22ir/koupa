-- delete_own_account anonymizes a deleted profile that has to be kept (because
-- appointments and ratings still reference it) by setting phone = 'deleted'.
-- Phone numbers are unique, so the SECOND account deleted this way failed with
-- "duplicate key value violates unique constraint profiles_phone_unique", which
-- the app reported as "phone linked to another account" and deletion never
-- finished. Give every kept profile its own placeholder instead. It stays inside
-- the profiles_phone_check length limit (5..32): 'deleted-' + 20 hex chars = 28.
--
-- The function is patched in place from its current definition, so this applies
-- correctly on top of whichever earlier version an environment has.

do $$
declare
  definition text;
  patched text;
begin
  select pg_get_functiondef('public.delete_own_account()'::regprocedure) into definition;

  if position('phone = ''deleted-''' in definition) > 0 then
    return; -- already patched
  end if;

  patched := replace(
    definition,
    'phone = ''deleted'',',
    'phone = ''deleted-'' || substr(replace(actor_id::text, ''-'', ''''), 1, 20),'
  );

  if patched = definition then
    raise exception 'delete_own_account no longer contains the phone = ''deleted'' placeholder';
  end if;

  execute patched;
end $$;
