begin;

do $$
declare
  output_names text[];
begin
  select proargnames
  into output_names
  from pg_proc
  where oid = 'public.get_public_barber_profile(uuid)'::regprocedure;

  if output_names is null or not ('shop' = any(output_names)) then
    raise exception 'get_public_barber_profile must expose the optional shop output';
  end if;
end;
$$;

rollback;
