create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'barber');
create type public.membership_status as enum ('pending', 'active', 'rejected');
create type public.appointment_status as enum ('booked', 'present', 'completed', 'absent', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  name text not null check (length(trim(name)) between 2 and 120),
  phone text not null check (length(trim(phone)) between 5 and 32),
  bio text,
  city text,
  neighborhood text,
  maps_url text,
  latitude double precision,
  longitude double precision,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  is_published boolean not null default false,
  is_booking_paused boolean not null default false,
  booking_window_days integer not null default 7 check (booking_window_days between 0 and 365),
  minimum_notice_minutes integer not null default 0 check (minimum_notice_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barber_location_required check (
    role = 'customer' or (maps_url is not null or (latitude is not null and longitude is not null))
  )
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  bio text,
  maps_url text,
  latitude double precision,
  longitude double precision,
  average_rating numeric(2,1) not null default 0 check (average_rating between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_location_required check (maps_url is not null or (latitude is not null and longitude is not null))
);

create table public.shop_memberships (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  barber_id uuid not null unique references public.profiles(id) on delete cascade,
  status public.membership_status not null default 'pending',
  invited_by uuid references public.profiles(id) on delete set null,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, barber_id)
);

create unique index one_active_shop_membership_per_barber
  on public.shop_memberships (barber_id) where status in ('pending', 'active');

create table public.services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  description text,
  price_dzd integer not null check (price_dzd >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 720 and duration_minutes % 5 = 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  interval_minutes integer not null check (interval_minutes in (5, 10, 15, 30)),
  unique (barber_id, day_of_week),
  check (starts_at < ends_at)
);

create table public.schedule_breaks (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.weekly_schedules(id) on delete cascade,
  starts_at time not null,
  ends_at time not null,
  check (starts_at < ends_at)
);

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles(id) on delete cascade,
  exception_date date not null,
  is_closed boolean not null default true,
  starts_at time,
  ends_at time,
  note text,
  unique (barber_id, exception_date),
  check (is_closed or (starts_at is not null and ends_at is not null and starts_at < ends_at))
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  barber_id uuid not null references public.profiles(id) on delete restrict,
  shop_id uuid references public.shops(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_dzd integer not null check (price_dzd >= 0),
  status public.appointment_status not null default 'booked',
  qr_checked_in_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create unique index one_active_appointment_per_customer
  on public.appointments (customer_id) where status in ('booked', 'present');

create index appointments_barber_schedule_idx on public.appointments (barber_id, starts_at);
create index appointments_customer_history_idx on public.appointments (customer_id, starts_at desc);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  barber_id uuid not null references public.profiles(id) on delete restrict,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  affected_barber_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','shops','shop_memberships','services','appointments','ratings'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.auto_complete_present_appointments()
returns void language sql security definer set search_path = public as $$
  update public.appointments
  set status = 'completed', updated_at = now()
  where status = 'present' and ends_at <= now();
$$;

create or replace function public.mark_expired_bookings_absent()
returns void language sql security definer set search_path = public as $$
  update public.appointments
  set status = 'absent', updated_at = now()
  where status = 'booked' and starts_at <= now();
$$;

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_memberships enable row level security;
alter table public.services enable row level security;
alter table public.weekly_schedules enable row level security;
alter table public.schedule_breaks enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.appointments enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy published_barber_profiles on public.profiles for select using (role = 'barber' and is_published = true);
create policy public_shops on public.shops for select using (true);
create policy shop_owner_manage on public.shops for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy memberships_participants on public.shop_memberships for select using (barber_id = auth.uid() or shop_id in (select id from public.shops where owner_id = auth.uid()));
create policy membership_requests on public.shop_memberships for insert with check (barber_id = auth.uid());
create policy membership_owner_decisions on public.shop_memberships for update using (shop_id in (select id from public.shops where owner_id = auth.uid()));
create policy published_services on public.services for select using (is_active = true and barber_id in (select id from public.profiles where role = 'barber' and is_published = true));
create policy barber_manage_services on public.services for all using (barber_id = auth.uid()) with check (barber_id = auth.uid());
create policy schedule_read on public.weekly_schedules for select using (true);
create policy barber_manage_schedule on public.weekly_schedules for all using (barber_id = auth.uid()) with check (barber_id = auth.uid());
create policy breaks_read on public.schedule_breaks for select using (true);
create policy breaks_manage on public.schedule_breaks for all using (schedule_id in (select id from public.weekly_schedules where barber_id = auth.uid())) with check (schedule_id in (select id from public.weekly_schedules where barber_id = auth.uid()));
create policy exceptions_read on public.schedule_exceptions for select using (true);
create policy barber_manage_exceptions on public.schedule_exceptions for all using (barber_id = auth.uid()) with check (barber_id = auth.uid());
create policy appointment_participants on public.appointments for select using (customer_id = auth.uid() or barber_id = auth.uid());
create policy customer_create_appointment on public.appointments for insert with check (customer_id = auth.uid());
create policy appointment_customer_update on public.appointments for update using (customer_id = auth.uid());
create policy appointment_barber_update on public.appointments for update using (barber_id = auth.uid());
create policy rating_participant_read on public.ratings for select using (customer_id = auth.uid() or barber_id = auth.uid());
create policy customer_create_rating on public.ratings for insert with check (customer_id = auth.uid());
create policy customer_update_rating on public.ratings for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy user_notifications on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy relevant_activity_logs on public.activity_logs for select using (actor_id = auth.uid() or affected_barber_id = auth.uid() or shop_id in (select id from public.shops where owner_id = auth.uid()));
