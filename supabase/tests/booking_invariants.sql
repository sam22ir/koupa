-- Manual/local SQL smoke tests for booking invariants.
-- Requires seeded auth users + profiles. Adapt UUIDs when running against local seed.

-- Expected helpers already exist after migrations:
--   public.is_bookable_published_barber
--   public.is_independent_published_barber
--   public.booking_slot_is_available
--   public.book_appointment

do $$
begin
  if to_regprocedure('public.is_bookable_published_barber(uuid)') is null then
    raise exception 'missing is_bookable_published_barber';
  end if;
  if to_regprocedure('public.is_independent_published_barber(uuid)') is null then
    raise exception 'missing is_independent_published_barber';
  end if;
  if to_regprocedure('public.booking_slot_is_available(uuid,uuid,timestamptz,uuid)') is null then
    raise exception 'missing booking_slot_is_available';
  end if;
  if to_regprocedure('public.book_appointment(uuid,uuid,timestamptz)') is null then
    raise exception 'missing book_appointment';
  end if;
  if to_regprocedure('public.publish_barber_profile(jsonb)') is null then
    raise exception 'missing publish_barber_profile';
  end if;
  if to_regprocedure('public.replace_barber_settings(jsonb)') is null then
    raise exception 'missing replace_barber_settings';
  end if;
end;
$$;

-- Structural checks for unique active appointment and membership indexes.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'one_active_appointment_per_customer'
  ) then
    raise exception 'missing one_active_appointment_per_customer index';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'one_active_shop_membership_per_barber'
  ) then
    raise exception 'missing one_active_shop_membership_per_barber index';
  end if;
end;
$$;
