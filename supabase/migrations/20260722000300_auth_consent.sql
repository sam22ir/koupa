create table public.legal_documents (
  key text primary key check (key in ('terms', 'privacy')),
  version text not null,
  url text not null,
  is_active boolean not null default true,
  published_at timestamptz not null default now()
);

create unique index one_active_legal_document_per_key
  on public.legal_documents (key) where is_active;

create table public.legal_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  document_key text not null references public.legal_documents(key),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, document_key)
);

alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;

create policy active_legal_documents_are_public on public.legal_documents
  for select using (is_active);
create policy legal_acceptances_are_self_readable on public.legal_acceptances
  for select using (user_id = auth.uid());
create policy legal_acceptances_are_self_insertable on public.legal_acceptances
  for insert with check (user_id = auth.uid());

create or replace function public.require_current_legal_acceptance()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  active_count integer;
  accepted_count integer;
  account_email_confirmed_at timestamptz;
  account_metadata jsonb;
begin
  select email_confirmed_at, raw_user_meta_data
  into account_email_confirmed_at, account_metadata
  from auth.users
  where id = new.id;
  if account_email_confirmed_at is null then
    raise exception 'A confirmed email is required before creating a profile';
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

create trigger profiles_require_current_legal_acceptance
  before insert on public.profiles
  for each row execute function public.require_current_legal_acceptance();
