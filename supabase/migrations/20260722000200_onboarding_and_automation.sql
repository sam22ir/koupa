create table public.onboarding_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  step smallint not null default 1 check (step between 1 and 5),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android')),
  environment text not null check (environment in ('development', 'staging', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token, environment)
);

alter table public.onboarding_drafts enable row level security;
alter table public.device_push_tokens enable row level security;

create policy onboarding_drafts_self on public.onboarding_drafts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy device_tokens_self on public.device_push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger onboarding_drafts_updated_at before update on public.onboarding_drafts
  for each row execute function public.set_updated_at();
create trigger device_push_tokens_updated_at before update on public.device_push_tokens
  for each row execute function public.set_updated_at();

create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.role is distinct from new.role then
    raise exception 'Profile role is permanent';
  end if;
  return new;
end;
$$;

create trigger profiles_role_is_permanent before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

create or replace function public.transition_overdue_appointments()
returns table (absent_count integer, completed_count integer)
language plpgsql security definer set search_path = public as $$
declare absent_total integer := 0; completed_total integer := 0;
begin
  with changed as (
    update public.appointments set status = 'absent', updated_at = now()
    where status = 'booked' and starts_at <= now()
    returning customer_id, id
  ), notifications as (
    insert into public.notifications (user_id, title, body, appointment_id)
    select customer_id, 'تم تسجيل الموعد كغائب', 'انتهى وقت الموعد قبل تأكيد حضورك.', id from changed
    returning 1
  ) select count(*) into absent_total from notifications;
  with changed as (
    update public.appointments set status = 'completed', updated_at = now()
    where status = 'present' and ends_at <= now()
    returning customer_id, barber_id, id
  ), notifications as (
    insert into public.notifications (user_id, title, body, appointment_id)
    select user_id, 'اكتمل الموعد', 'تم إكمال موعدك بنجاح.', id
    from changed cross join lateral (values (customer_id), (barber_id)) as recipients(user_id)
    returning 1
  ) select count(*) / 2 into completed_total from notifications;
  return query select absent_total, completed_total;
end;
$$;

revoke all on function public.transition_overdue_appointments() from public;
