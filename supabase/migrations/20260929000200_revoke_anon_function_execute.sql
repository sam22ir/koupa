-- Supabase grants EXECUTE on new public functions to `anon` by default, and a
-- PUBLIC grant reaches anon too. Signed-out callers could therefore reach
-- internal helpers (insert_notification, maintenance jobs) and read shop barber
-- phone numbers. Close it: anon keeps only the read RPCs that power guest
-- browsing. Every other role keeps exactly the access it has today.

do $$
declare
  fn record;
  auth_had boolean;
  service_had boolean;
begin
  for fn in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      -- Leave extension-owned functions (pg_trgm) alone.
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    -- Record effective access first: a PUBLIC grant may be what authenticated relies on.
    auth_had := has_function_privilege('authenticated', fn.oid, 'execute');
    service_had := has_function_privilege('service_role', fn.oid, 'execute');
    execute format('revoke execute on function %s from public, anon', fn.signature);
    if auth_had then
      execute format('grant execute on function %s to authenticated', fn.signature);
    end if;
    if service_had then
      execute format('grant execute on function %s to service_role', fn.signature);
    end if;
  end loop;
end $$;

grant execute on function public.search_published_barbers(text, text, integer) to anon;
grant execute on function public.get_public_barber_profile(uuid) to anon;
grant execute on function public.available_booking_slots(uuid, uuid, date) to anon;

-- New functions must be opted in to anon explicitly.
alter default privileges for role postgres in schema public revoke execute on functions from anon;
