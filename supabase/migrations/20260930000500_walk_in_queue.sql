-- Walk-in queue. A barber can keep a live line next to bookings: they add walk-ins
-- by first name, and signed-in customers can join remotely. Bookings keep their
-- times; the queue is a lightweight record and never creates an appointment.
--
-- Position is derived from join order and never stored. Every write goes through
-- the functions below; the table has no client policies.

alter table public.profiles
  add column if not exists queue_open boolean not null default false;

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete cascade,
  guest_name text,
  service_id uuid references public.services(id) on delete set null,
  source text not null check (source in ('barber', 'remote')),
  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'serving', 'done', 'left', 'no_show', 'removed')),
  joined_at timestamptz not null default clock_timestamp(),
  called_at timestamptz,
  serving_at timestamptz,
  finished_at timestamptz,
  next_notified_at timestamptz,
  constraint queue_entry_has_name check (
    customer_id is not null or length(trim(coalesce(guest_name, ''))) between 1 and 60
  ),
  constraint queue_entry_source_matches check (
    (source = 'remote' and customer_id is not null) or (source = 'barber' and customer_id is null)
  )
);

create index if not exists queue_entries_active_idx
  on public.queue_entries (barber_id, joined_at)
  where status in ('waiting', 'called', 'serving');

-- One active entry per customer, across every barber.
create unique index if not exists queue_entries_one_active_per_customer_idx
  on public.queue_entries (customer_id)
  where customer_id is not null and status in ('waiting', 'called', 'serving');

-- One customer in the chair per barber.
create unique index if not exists queue_entries_one_serving_per_barber_idx
  on public.queue_entries (barber_id)
  where status = 'serving';

alter table public.queue_entries enable row level security;
revoke all on table public.queue_entries from anon, authenticated;

-- Limits. Kept here so the client, tests and docs share one source.
create or replace function public.queue_max_active()
returns integer language sql immutable as $$ select 20 $$;

create or replace function public.queue_call_grace_minutes()
returns integer language sql immutable as $$ select 10 $$;

create or replace function public.queue_notify(recipient_id uuid, barber_id_value uuid, title_value text, body_value text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, destination)
  values (recipient_id, title_value, body_value, jsonb_build_object('kind', 'queue', 'barberId', barber_id_value));
$$;

-- Tell the first person in line that they are next, once.
create or replace function public.queue_notify_next(target_barber uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  next_entry record;
  barber_name text;
begin
  select entry.id, entry.customer_id into next_entry
  from public.queue_entries entry
  where entry.barber_id = target_barber
    and entry.status = 'waiting'
  order by entry.joined_at
  limit 1;
  if next_entry.id is null or next_entry.customer_id is null then return; end if;

  update public.queue_entries
  set next_notified_at = now()
  where id = next_entry.id and next_notified_at is null;
  if not found then return; end if;

  select name into barber_name from public.profiles where id = target_barber;
  perform public.queue_notify(
    next_entry.customer_id, target_barber,
    'أنت التالي في الطابور',
    'استعد، حان دورك قريبا عند ' || coalesce(barber_name, 'الحلاق') || '.'
  );
end;
$$;

-- Expire stale entries. Runs from pg_cron and inline from the read functions.
--   * called entries that did not arrive within the grace period become no_show
--   * waiting entries older than 12 hours are treated as left
--   * a serving entry older than 12 hours is closed as done
create or replace function public.queue_maintenance(target_barber uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  affected uuid[];
  barber_value uuid;
begin
  with expired as (
    update public.queue_entries
    set status = 'no_show', finished_at = now()
    where status = 'called'
      and called_at < now() - make_interval(mins => public.queue_call_grace_minutes())
      and (target_barber is null or barber_id = target_barber)
    returning barber_id
  ), stale_waiting as (
    update public.queue_entries
    set status = 'left', finished_at = now()
    where status = 'waiting'
      and joined_at < now() - interval '12 hours'
      and (target_barber is null or barber_id = target_barber)
    returning barber_id
  ), stale_serving as (
    update public.queue_entries
    set status = 'done', finished_at = now()
    where status = 'serving'
      and coalesce(serving_at, joined_at) < now() - interval '12 hours'
      and (target_barber is null or barber_id = target_barber)
    returning barber_id
  )
  select array_agg(distinct barber_id) into affected
  from (
    select barber_id from expired
    union all select barber_id from stale_waiting
    union all select barber_id from stale_serving
  ) changed;

  foreach barber_value in array coalesce(affected, '{}'::uuid[]) loop
    perform public.queue_notify_next(barber_value);
  end loop;
end;
$$;

create or replace function public.set_queue_open(open_value boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if not exists (
    select 1 from public.profiles
    where id = actor_id and role = 'barber' and is_published
  ) then
    raise exception 'A published barber profile is needed to open the queue';
  end if;
  update public.profiles set queue_open = open_value, updated_at = now() where id = actor_id;
end;
$$;

create or replace function public.add_walkin(guest_name_value text, service_id_value uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  actor_id uuid := auth.uid();
  entry_id uuid;
  clean_name text := trim(coalesce(guest_name_value, ''));
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if not exists (
    select 1 from public.profiles
    where id = actor_id and role = 'barber' and is_published and queue_open
  ) then
    raise exception 'Queue is closed';
  end if;
  if length(clean_name) not between 1 and 60 then raise exception 'Invalid walk-in name'; end if;
  if not exists (
    select 1 from public.services
    where id = service_id_value and barber_id = actor_id and is_active
  ) then
    raise exception 'Invalid service';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('queue:' || actor_id::text, 0));
  perform public.queue_maintenance(actor_id);
  if (
    select count(*) from public.queue_entries
    where barber_id = actor_id and status in ('waiting', 'called', 'serving')
  ) >= public.queue_max_active() then
    raise exception 'The queue is full';
  end if;

  insert into public.queue_entries (barber_id, guest_name, service_id, source)
  values (actor_id, clean_name, service_id_value, 'barber')
  returning id into entry_id;
  return entry_id;
end;
$$;

create or replace function public.join_queue(barber_id_value uuid, service_id_value uuid)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  actor_id uuid := auth.uid();
  entry_id uuid;
  confirmed_at timestamptz;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles where id = actor_id and role = 'customer'
  ) then
    raise exception 'Customer authentication is required';
  end if;
  select email_confirmed_at into confirmed_at from auth.users where id = actor_id;
  if confirmed_at is null then
    raise exception 'A confirmed email is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = barber_id_value and role = 'barber' and is_published and queue_open
  ) then
    raise exception 'Queue is closed';
  end if;
  if not exists (
    select 1 from public.services
    where id = service_id_value and barber_id = barber_id_value and is_active
  ) then
    raise exception 'Invalid service';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('queue:' || barber_id_value::text, 0));
  perform public.queue_maintenance(barber_id_value);
  if exists (
    select 1 from public.queue_entries
    where customer_id = actor_id and status in ('waiting', 'called', 'serving')
  ) then
    raise exception 'You are already in a queue';
  end if;
  if (
    select count(*) from public.queue_entries
    where barber_id = barber_id_value and status in ('waiting', 'called', 'serving')
  ) >= public.queue_max_active() then
    raise exception 'The queue is full';
  end if;

  insert into public.queue_entries (barber_id, customer_id, service_id, source)
  values (barber_id_value, actor_id, service_id_value, 'remote')
  returning id into entry_id;

  perform public.queue_notify_next(barber_id_value);
  return entry_id;
end;
$$;

create or replace function public.leave_queue(entry_id_value uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  actor_id uuid := auth.uid();
  entry public.queue_entries%rowtype;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select * into entry from public.queue_entries where id = entry_id_value and customer_id = actor_id for update;
  if not found or entry.status not in ('waiting', 'called') then
    raise exception 'Queue entry cannot be updated';
  end if;
  update public.queue_entries set status = 'left', finished_at = now() where id = entry.id;
  perform public.queue_notify_next(entry.barber_id);
end;
$$;

-- Barber-side transitions. p_action:
--   call    waiting -> called   (remote only; notifies the customer, starts the grace timer)
--   start   waiting|called -> serving   (one at a time)
--   finish  serving -> done
--   no_show waiting|called -> no_show
--   remove  waiting|called -> removed   (notifies a remote customer)
create or replace function public.update_queue_entry(entry_id_value uuid, action_value text)
returns void language plpgsql security definer set search_path = public as $$
declare
  actor_id uuid := auth.uid();
  entry public.queue_entries%rowtype;
  barber_name text;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('queue:' || actor_id::text, 0));
  select * into entry from public.queue_entries where id = entry_id_value and barber_id = actor_id for update;
  if not found then raise exception 'Queue entry cannot be updated'; end if;
  select name into barber_name from public.profiles where id = actor_id;

  if action_value = 'call' then
    if entry.status <> 'waiting' or entry.customer_id is null then
      raise exception 'Queue entry cannot be updated';
    end if;
    update public.queue_entries set status = 'called', called_at = now() where id = entry.id;
    perform public.queue_notify(
      entry.customer_id, actor_id,
      'حان دورك',
      coalesce(barber_name, 'الحلاق') || ' ينتظرك الآن. لديك '
        || public.queue_call_grace_minutes()::text || ' دقائق للوصول.'
    );
  elsif action_value = 'start' then
    if entry.status not in ('waiting', 'called') then raise exception 'Queue entry cannot be updated'; end if;
    if exists (select 1 from public.queue_entries where barber_id = actor_id and status = 'serving') then
      raise exception 'Queue entry cannot be updated';
    end if;
    update public.queue_entries set status = 'serving', serving_at = now() where id = entry.id;
  elsif action_value = 'finish' then
    if entry.status <> 'serving' then raise exception 'Queue entry cannot be updated'; end if;
    update public.queue_entries set status = 'done', finished_at = now() where id = entry.id;
  elsif action_value in ('no_show', 'remove') then
    if entry.status not in ('waiting', 'called') then raise exception 'Queue entry cannot be updated'; end if;
    update public.queue_entries
    set status = case when action_value = 'no_show' then 'no_show' else 'removed' end,
        finished_at = now()
    where id = entry.id;
    if entry.customer_id is not null then
      perform public.queue_notify(
        entry.customer_id, actor_id,
        'تمت إزالتك من الطابور',
        'أزال ' || coalesce(barber_name, 'الحلاق') || ' دورك من الطابور.'
      );
    end if;
  else
    raise exception 'Invalid queue action';
  end if;

  perform public.queue_notify_next(actor_id);
end;
$$;

-- The barber's live queue: settings, the next booking (so walk-ins fill the gap),
-- their active services, and the active entries in serving order.
create or replace function public.get_barber_queue()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  actor_id uuid := auth.uid();
  open_value boolean;
  next_booking timestamptz;
  entries jsonb;
  services_value jsonb;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select queue_open into open_value from public.profiles where id = actor_id and role = 'barber';
  if open_value is null then raise exception 'Barber authentication is required'; end if;

  perform public.queue_maintenance(actor_id);

  select min(starts_at) into next_booking
  from public.appointments
  where barber_id = actor_id and status = 'booked' and starts_at > now();

  select coalesce(jsonb_agg(row_data order by sort_group, joined_at), '[]'::jsonb) into entries
  from (
    select
      case entry.status when 'serving' then 0 when 'called' then 1 else 2 end as sort_group,
      entry.joined_at,
      jsonb_build_object(
        'id', entry.id,
        'name', coalesce(entry.guest_name, customer.name),
        'source', entry.source,
        'status', entry.status,
        'service_name', service.name,
        'joined_at', entry.joined_at,
        'called_at', entry.called_at
      ) as row_data
    from public.queue_entries entry
    left join public.profiles customer on customer.id = entry.customer_id
    left join public.services service on service.id = entry.service_id
    where entry.barber_id = actor_id
      and entry.status in ('waiting', 'called', 'serving')
  ) ordered;

  -- The services a walk-in can be added for.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', service.id,
    'name', service.name,
    'price_dzd', service.price_dzd,
    'duration_minutes', service.duration_minutes
  ) order by service.name), '[]'::jsonb) into services_value
  from public.services service
  where service.barber_id = actor_id and service.is_active;

  return jsonb_build_object(
    'queue_open', open_value,
    'next_booking_at', next_booking,
    'entries', entries,
    'services', services_value
  );
end;
$$;

-- The customer's own place in line, or null.
create or replace function public.get_my_queue_entry()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  actor_id uuid := auth.uid();
  entry public.queue_entries%rowtype;
  position_value integer;
  waiting_value integer;
  barber_name text;
  service_name text;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select * into entry from public.queue_entries
  where customer_id = actor_id and status in ('waiting', 'called', 'serving');
  if not found then return null; end if;

  perform public.queue_maintenance(entry.barber_id);
  select * into entry from public.queue_entries where id = entry.id;
  if entry.status not in ('waiting', 'called', 'serving') then return null; end if;

  select count(*) filter (where status = 'waiting'),
         1 + count(*) filter (where status = 'waiting' and joined_at < entry.joined_at)
  into waiting_value, position_value
  from public.queue_entries where barber_id = entry.barber_id;

  select name into barber_name from public.profiles where id = entry.barber_id;
  select name into service_name from public.services where id = entry.service_id;

  return jsonb_build_object(
    'id', entry.id,
    'barber_id', entry.barber_id,
    'barber_name', barber_name,
    'service_name', service_name,
    'status', entry.status,
    'position', case when entry.status = 'waiting' then position_value else null end,
    'waiting_count', waiting_value,
    'called_at', entry.called_at
  );
end;
$$;

-- Public and guest-safe: whether a barber's queue is open and how many wait. No names.
create or replace function public.get_public_queue_status(barber_id_value uuid)
returns table (queue_open boolean, waiting_count integer)
language sql stable security definer set search_path = public as $$
  select
    profile.queue_open,
    (select count(*)::integer from public.queue_entries entry
      where entry.barber_id = profile.id and entry.status = 'waiting')
  from public.profiles profile
  where profile.id = barber_id_value and profile.role = 'barber' and profile.is_published;
$$;

do $$
begin
  perform cron.schedule('koupa-queue-maintenance', '* * * * *', 'select public.queue_maintenance()');
exception when others then
  raise notice 'pg_cron is unavailable; queue timeouts will only run inline (%).', sqlerrm;
end;
$$;

revoke all on function public.queue_max_active() from public, anon, authenticated;
revoke all on function public.queue_call_grace_minutes() from public, anon, authenticated;
revoke all on function public.queue_notify(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.queue_notify_next(uuid) from public, anon, authenticated;
revoke all on function public.queue_maintenance(uuid) from public, anon, authenticated;
revoke all on function public.set_queue_open(boolean) from public, anon;
revoke all on function public.add_walkin(text, uuid) from public, anon;
revoke all on function public.join_queue(uuid, uuid) from public, anon;
revoke all on function public.leave_queue(uuid) from public, anon;
revoke all on function public.update_queue_entry(uuid, text) from public, anon;
revoke all on function public.get_barber_queue() from public, anon;
revoke all on function public.get_my_queue_entry() from public, anon;
revoke all on function public.get_public_queue_status(uuid) from public;

grant execute on function public.set_queue_open(boolean) to authenticated;
grant execute on function public.add_walkin(text, uuid) to authenticated;
grant execute on function public.join_queue(uuid, uuid) to authenticated;
grant execute on function public.leave_queue(uuid) to authenticated;
grant execute on function public.update_queue_entry(uuid, text) to authenticated;
grant execute on function public.get_barber_queue() to authenticated;
grant execute on function public.get_my_queue_entry() to authenticated;
-- Guests browse profiles, so they may see whether a queue is open and its length.
grant execute on function public.get_public_queue_status(uuid) to anon, authenticated;
