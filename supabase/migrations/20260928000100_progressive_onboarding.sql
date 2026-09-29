-- Progressive onboarding: an account exists as early as possible, and no
-- partial state can strand a user.
--
-- Three shifts:
--   1. Creating a profile no longer requires a confirmed email. Confirmation
--      is enforced where value is actually exchanged: booking a barber's time
--      and publishing a publicly discoverable profile.
--   2. Barbers are created unpublished once identity and location are known,
--      then publish after services and working hours exist. The publish RPC
--      completes an existing unpublished row instead of dead-ending on it.
--   3. is_published becomes server-only, so a client cannot list itself in
--      search without passing the publish checks.

-- 1. Profile creation no longer walls on email confirmation.
-- Consent, role agreement, and current legal acceptance all remain required,
-- and the trigger stays security definer over auth.users so a client cannot
-- forge any of them.
create or replace function public.require_current_legal_acceptance()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  active_count integer;
  accepted_count integer;
  account_metadata jsonb;
begin
  select raw_user_meta_data into account_metadata
  from auth.users
  where id = new.id;
  -- Previously implied by the email-confirmation lookup: never allow a profile
  -- row for an account that no longer exists.
  if not found then
    raise exception 'Authentication is required';
  end if;
  if coalesce(account_metadata ->> 'koupa_signup_consent', 'false') <> 'true' then
    raise exception 'Current terms and privacy acceptance is required';
  end if;
  if account_metadata ->> 'koupa_role' is distinct from new.role::text then
    raise exception 'Profile role must match the selected account role';
  end if;
  select count(*) into active_count from public.legal_documents where is_active;
  select count(*) into accepted_count
  from public.legal_acceptances acceptance
  join public.legal_documents document on document.key = acceptance.document_key
    and document.version = acceptance.document_version
    and document.is_active
  where acceptance.user_id = new.id;
  if active_count <> 2 or accepted_count <> active_count then
    raise exception 'Current terms and privacy acceptance is required';
  end if;
  return new;
end;
$$;

-- 2. Booking reserves a barber's time, so it now proves email ownership.
-- Enforced on the table rather than inside book_appointment so every present
-- and future insert path is covered. Reschedule needs no equivalent: an
-- unconfirmed account can never hold an appointment to reschedule.
create or replace function public.require_confirmed_customer_email()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  confirmed_at timestamptz;
begin
  select email_confirmed_at into confirmed_at
  from auth.users
  where id = new.customer_id;
  if confirmed_at is null then
    raise exception 'A confirmed email is required' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.require_confirmed_customer_email() from public, anon, authenticated;

drop trigger if exists appointments_require_confirmed_email on public.appointments;
create trigger appointments_require_confirmed_email
  before insert on public.appointments
  for each row execute function public.require_confirmed_customer_email();

-- 3. Publication is server-only.
-- Lowering is_published stays open so account deletion and future suspension
-- keep working without needing the trusted-write flag.
create or replace function public.guard_profile_publication()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if coalesce(current_setting('koupa.trusted_publish', true), 'off') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.is_published, false) then
      new.is_published := false;
    end if;
    return new;
  end if;
  if coalesce(new.is_published, false) and not coalesce(old.is_published, false) then
    raise exception 'Profile publication is managed by كوپا' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_publication on public.profiles;
create trigger profiles_guard_publication
  before insert or update on public.profiles
  for each row execute function public.guard_profile_publication();

-- profiles_self was FOR ALL, which let a client write any column on its own
-- row. Split it so intent is explicit; the trigger above is what actually
-- protects is_published.
drop policy if exists profiles_self on public.profiles;

create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_self_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_self_delete on public.profiles
  for delete to authenticated using (id = auth.uid());

-- 4. Phase one of barber setup: identity and location produce a real, private
-- account. No services and no working hours are required to exist yet.
create or replace function public.create_barber_profile(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  existing_role public.app_role;
  workplace_type_value text := coalesce(nullif(trim(payload->>'workplace_type'), ''), 'owner');
  shop_name_value text;
  shop_bio_value text;
  maps_url_value text;
  latitude_value double precision;
  longitude_value double precision;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  select role into existing_role from public.profiles where id = actor_id;
  if found then
    -- Re-entering setup after a retry or a reinstall is not an error.
    if existing_role = 'barber' then
      return;
    end if;
    raise exception 'A customer profile already exists for this account';
  end if;

  if workplace_type_value not in ('owner', 'worker') then
    raise exception 'Invalid workplace type';
  end if;
  if length(trim(coalesce(payload->>'name', ''))) < 2 then
    raise exception 'Invalid barber name';
  end if;
  if length(trim(coalesce(payload->>'phone', ''))) < 5 then
    raise exception 'Invalid barber phone';
  end if;

  maps_url_value := nullif(trim(coalesce(payload->>'maps_url', '')), '');
  latitude_value := nullif(payload->>'latitude', '')::double precision;
  longitude_value := nullif(payload->>'longitude', '')::double precision;

  if workplace_type_value = 'owner' then
    shop_name_value := nullif(trim(coalesce(payload->>'shop_name', '')), '');
    shop_bio_value := nullif(trim(coalesce(payload->>'shop_bio', '')), '');
    if length(coalesce(shop_name_value, '')) < 2 then
      raise exception 'Shop name is required';
    end if;
    -- barber_location_required must already hold at insert time for owners.
    if maps_url_value is null and (latitude_value is null or longitude_value is null) then
      raise exception 'Barber location is required';
    end if;
  end if;

  insert into public.profiles (
    id, role, workplace_type, name, phone, bio,
    city, neighborhood, maps_url, latitude, longitude, is_published
  ) values (
    actor_id,
    'barber',
    workplace_type_value,
    trim(payload->>'name'),
    trim(payload->>'phone'),
    nullif(trim(coalesce(payload->>'bio', '')), ''),
    nullif(trim(coalesce(payload->>'city', '')), ''),
    nullif(trim(coalesce(payload->>'neighborhood', '')), ''),
    maps_url_value,
    latitude_value,
    longitude_value,
    false
  );

  if workplace_type_value = 'owner' then
    insert into public.shops (owner_id, name, bio, maps_url, latitude, longitude)
    values (actor_id, shop_name_value, shop_bio_value, maps_url_value, latitude_value, longitude_value);
  end if;
end;
$$;

revoke all on function public.create_barber_profile(jsonb) from public, anon;
grant execute on function public.create_barber_profile(jsonb) to authenticated;

-- 5. Phase two: publish an existing unpublished barber.
-- Replaces the previous behaviour, which raised
-- 'An incomplete or incompatible profile already exists' for any pre-existing
-- non-published row and left the account unrecoverable.
create or replace function public.publish_barber_profile(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  existing public.profiles%rowtype;
  confirmed_at timestamptz;
  workplace_type_value text;
  shop_name_value text;
  shop_bio_value text;
  item jsonb;
  break_item jsonb;
  schedule_id uuid;
  enabled_schedule_count integer := 0;
  supplied_services boolean;
  starts_at_value time;
  ends_at_value time;
  break_starts time;
  break_ends time;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  -- Publishing makes this profile publicly discoverable and bookable, so it
  -- is the point where email ownership must be proven.
  select email_confirmed_at into confirmed_at from auth.users where id = actor_id;
  if confirmed_at is null then
    raise exception 'A confirmed email is required' using errcode = '42501';
  end if;

  select * into existing from public.profiles where id = actor_id for update;
  if not found then
    raise exception 'Complete your barber profile before publishing';
  end if;
  if existing.role <> 'barber' then
    raise exception 'Profile role must match the selected account role';
  end if;
  if existing.is_published then
    delete from public.onboarding_drafts where user_id = actor_id;
    return;
  end if;

  -- The stored row is authoritative for identity, workplace type and
  -- location; those were validated when the unpublished row was created.
  workplace_type_value := existing.workplace_type;

  if workplace_type_value = 'owner' then
    shop_name_value := nullif(trim(coalesce(payload->>'shop_name', '')), '');
    shop_bio_value := nullif(trim(coalesce(payload->>'shop_bio', '')), '');
    if existing.maps_url is null
      and (existing.latitude is null or existing.longitude is null) then
      raise exception 'Barber location is required';
    end if;
  end if;

  -- Two ways in. A payload carrying services replaces the catalogue and hours
  -- wholesale, which is the one-shot path. An empty payload publishes what the
  -- barber already built from the Schedule tab, which is the normal path once
  -- the profile is created early.
  -- coalesce is required: jsonb_typeof(NULL) is NULL, not 'array', so an empty
  -- payload would leave this NULL and fall through to the one-shot branch.
  supplied_services := coalesce(
    jsonb_typeof(payload->'services') = 'array'
      and jsonb_array_length(payload->'services') > 0,
    false
  );

  if not supplied_services then
    if not exists (
      select 1 from public.services
      where barber_id = actor_id and is_active
    ) then
      raise exception 'At least one service is required';
    end if;
    select count(*) into enabled_schedule_count
    from public.weekly_schedules where barber_id = actor_id;
    if enabled_schedule_count < 1 then
      raise exception 'At least one working day is required';
    end if;
    perform set_config('koupa.trusted_publish', 'on', true);
    update public.profiles
    set is_published = true, updated_at = now()
    where id = actor_id;
    perform set_config('koupa.trusted_publish', 'off', true);
    delete from public.onboarding_drafts where user_id = actor_id;
    return;
  end if;

  if coalesce((payload->>'interval_minutes')::integer, 0) not in (5, 10, 15, 30) then
    raise exception 'Invalid appointment interval';
  end if;

  -- Replace rather than append, so a retry never duplicates rows.
  delete from public.schedule_breaks
  where schedule_id in (select id from public.weekly_schedules where barber_id = actor_id);
  delete from public.weekly_schedules where barber_id = actor_id;
  update public.services set is_active = false where barber_id = actor_id;

  for item in select value from jsonb_array_elements(payload->'services') loop
    if length(trim(coalesce(item->>'name', ''))) < 2
      or coalesce((item->>'price_dzd')::integer, -1) < 0
      or coalesce((item->>'duration_minutes')::integer, 0) not between 5 and 720
      or mod((item->>'duration_minutes')::integer, 5) <> 0 then
      raise exception 'Invalid service';
    end if;

    insert into public.services (barber_id, name, price_dzd, duration_minutes, is_active)
    values (
      actor_id,
      trim(item->>'name'),
      (item->>'price_dzd')::integer,
      (item->>'duration_minutes')::integer,
      true
    );
  end loop;

  if jsonb_typeof(payload->'schedules') = 'array' then
    for item in select value from jsonb_array_elements(payload->'schedules') loop
      if coalesce((item->>'enabled')::boolean, false) then
        starts_at_value := (item->>'starts_at')::time;
        ends_at_value := (item->>'ends_at')::time;
        if starts_at_value >= ends_at_value then
          raise exception 'Invalid schedule hours';
        end if;

        insert into public.weekly_schedules (barber_id, day_of_week, starts_at, ends_at, interval_minutes)
        values (
          actor_id,
          (item->>'day_of_week')::smallint,
          starts_at_value,
          ends_at_value,
          (payload->>'interval_minutes')::integer
        ) returning id into schedule_id;

        enabled_schedule_count := enabled_schedule_count + 1;

        if jsonb_typeof(item->'breaks') = 'array' then
          for break_item in select value from jsonb_array_elements(item->'breaks') loop
            break_starts := (break_item->>'starts_at')::time;
            break_ends := (break_item->>'ends_at')::time;
            if break_starts >= break_ends then
              raise exception 'Invalid schedule break';
            end if;
            insert into public.schedule_breaks (schedule_id, starts_at, ends_at)
            values (schedule_id, break_starts, break_ends);
          end loop;
        end if;
      end if;
    end loop;
  end if;

  if enabled_schedule_count < 1 then
    raise exception 'At least one working day is required';
  end if;

  if workplace_type_value = 'owner'
    and not exists (select 1 from public.shops where owner_id = actor_id) then
    insert into public.shops (owner_id, name, bio, maps_url, latitude, longitude)
    values (
      actor_id,
      shop_name_value,
      shop_bio_value,
      existing.maps_url,
      existing.latitude,
      existing.longitude
    );
  end if;

  -- Last write wins, and the shop insert above fires the owner location sync
  -- trigger, so the publish flag must be set after it.
  perform set_config('koupa.trusted_publish', 'on', true);
  update public.profiles
  set is_published = true,
      bio = coalesce(nullif(trim(coalesce(payload->>'bio', '')), ''), bio),
      updated_at = now()
  where id = actor_id;
  perform set_config('koupa.trusted_publish', 'off', true);

  delete from public.onboarding_drafts where user_id = actor_id;
end;
$$;

revoke all on function public.publish_barber_profile(jsonb) from public, anon;
grant execute on function public.publish_barber_profile(jsonb) to authenticated;

-- 6. Releasing a phone number held by an unverified account.
-- Phone uniqueness is global because phone-alias sign-in resolves a number to
-- exactly one profile. Without this, an unverified signup could permanently
-- lock the real owner of a number out of Koupa.
-- The claimant must have proven their own email first, and the held account
-- must be both unverified and unused.
create or replace function public.claim_unverified_phone(target_phone text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_confirmed_at timestamptz;
  holder_id uuid;
  holder_confirmed_at timestamptz;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  select email_confirmed_at into actor_confirmed_at from auth.users where id = actor_id;
  if actor_confirmed_at is null then
    raise exception 'A confirmed email is required' using errcode = '42501';
  end if;

  select id into holder_id from public.profiles
  where phone = target_phone and id <> actor_id;
  if not found then
    return false;
  end if;

  select email_confirmed_at into holder_confirmed_at from auth.users where id = holder_id;
  if holder_confirmed_at is not null then
    -- A verified account owns this number. Never touch it.
    return false;
  end if;
  if exists (select 1 from public.appointments where customer_id = holder_id or barber_id = holder_id) then
    return false;
  end if;
  if exists (select 1 from public.profiles where id = holder_id and is_published) then
    return false;
  end if;

  delete from auth.users where id = holder_id;
  return true;
end;
$$;

revoke all on function public.claim_unverified_phone(text) from public, anon;
grant execute on function public.claim_unverified_phone(text) to authenticated;
