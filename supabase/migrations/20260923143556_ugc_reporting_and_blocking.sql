-- User-generated content reporting and account blocking for public barber/shop content.

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_user_id)
);

create index user_blocks_blocked_user_idx on public.user_blocks (blocked_user_id);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;

create policy user_blocks_read_own on public.user_blocks
  for select to authenticated
  using ((select auth.uid()) = blocker_id);

create policy user_blocks_create_own on public.user_blocks
  for insert to authenticated
  with check (
    (select auth.uid()) = blocker_id
    and blocker_id <> blocked_user_id
    and exists (
      select 1 from public.profiles target
      where target.id = blocked_user_id
        and target.role = 'barber'
        and target.is_published
    )
  );

create policy user_blocks_remove_own on public.user_blocks
  for delete to authenticated
  using ((select auth.uid()) = blocker_id);

create table public.ugc_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_kind text not null check (target_kind in ('profile', 'shop', 'ratings')),
  -- Keep the target UUID after deletion so moderators retain the report context.
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'misleading', 'inappropriate', 'privacy', 'other')),
  details text check (details is null or char_length(trim(details)) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'action_taken', 'closed_no_action')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderator_notes text
);

create index ugc_reports_queue_idx on public.ugc_reports (status, created_at);
create index ugc_reports_target_idx on public.ugc_reports (target_kind, target_id, created_at desc);
create index ugc_reports_reporter_idx on public.ugc_reports (reporter_id, created_at desc);
create unique index ugc_reports_one_open_per_reporter_target
  on public.ugc_reports (reporter_id, target_kind, target_id)
  where reporter_id is not null and status in ('open', 'reviewing');

alter table public.ugc_reports enable row level security;
revoke all on public.ugc_reports from anon, authenticated;
grant select (id, reporter_id, target_kind, target_id, reason, details, status, created_at, moderated_at)
  on public.ugc_reports to authenticated;
grant insert (reporter_id, target_kind, target_id, reason, details)
  on public.ugc_reports to authenticated;

create policy ugc_reports_read_own on public.ugc_reports
  for select to authenticated
  using ((select auth.uid()) = reporter_id);

create policy ugc_reports_create_valid_target on public.ugc_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and moderated_at is null
    and moderator_notes is null
    and (
      (target_kind in ('profile', 'ratings') and exists (
        select 1 from public.profiles target
        where target.id = target_id
          and target.id <> (select auth.uid())
          and target.role = 'barber'
          and target.is_published
      ))
      or (target_kind = 'shop' and exists (
        select 1 from public.shops target
        where target.id = target_id
      ))
    )
  );

-- Only new bookings are blocked. Existing appointments remain available to
-- both participants for schedule changes, check-in, cancellation, and support.
create or replace function public.reject_booking_with_blocked_barber()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.user_blocks block_row
    where block_row.blocker_id = new.customer_id
      and block_row.blocked_user_id = new.barber_id
  ) then
    raise exception 'Booking unavailable for this barber' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_booking_with_blocked_barber() from public, anon, authenticated;
create trigger appointments_reject_blocked_barber
  before insert on public.appointments
  for each row execute function public.reject_booking_with_blocked_barber();

-- Require existing users to review and accept the updated Terms containing
-- the UGC rules and report/block process before returning to the app.
update public.legal_documents
set is_active = false
where key = 'terms' and is_active;

insert into public.legal_documents (key, version, url, is_active, published_at)
values (
  'terms',
  '2026-09-23',
  'https://koupa-website.pages.dev/terms/',
  true,
  '2026-09-23T00:00:00+01:00'::timestamptz
)
on conflict (key, version) do update
set url = excluded.url, is_active = true, published_at = excluded.published_at;
