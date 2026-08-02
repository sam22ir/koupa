-- Preserve every accepted legal version and publish the first approved public documents.

alter table public.legal_acceptances
  drop constraint legal_acceptances_document_key_fkey;

alter table public.legal_acceptances
  drop constraint legal_acceptances_pkey;

alter table public.legal_documents
  drop constraint legal_documents_pkey;

alter table public.legal_documents
  add constraint legal_documents_pkey primary key (key, version);

alter table public.legal_acceptances
  add constraint legal_acceptances_pkey
  primary key (user_id, document_key, document_version);

alter table public.legal_acceptances
  add constraint legal_acceptances_document_version_fkey
  foreign key (document_key, document_version)
  references public.legal_documents (key, version);

update public.legal_documents
set is_active = false
where key in ('terms', 'privacy') and is_active;

insert into public.legal_documents (key, version, url, is_active, published_at)
values
  (
    'terms',
    '2026-07-29',
    'https://koupa-website.pages.dev/terms/',
    true,
    '2026-07-29T00:00:00+01:00'::timestamptz
  ),
  (
    'privacy',
    '2026-07-29',
    'https://koupa-website.pages.dev/privacy/',
    true,
    '2026-07-29T00:00:00+01:00'::timestamptz
  )
on conflict (key, version) do update
set
  url = excluded.url,
  is_active = true,
  published_at = excluded.published_at;
