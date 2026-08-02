-- Structural checks for append-only legal document versions and acceptances.

do $$
declare
  documents_pk text;
  acceptances_pk text;
  acceptance_fk text;
begin
  select pg_get_constraintdef(oid) into documents_pk
  from pg_constraint
  where conrelid = 'public.legal_documents'::regclass and contype = 'p';

  select pg_get_constraintdef(oid) into acceptances_pk
  from pg_constraint
  where conrelid = 'public.legal_acceptances'::regclass and contype = 'p';

  select pg_get_constraintdef(oid) into acceptance_fk
  from pg_constraint
  where conrelid = 'public.legal_acceptances'::regclass
    and contype = 'f'
    and conkey = array[
      (select attnum from pg_attribute where attrelid = 'public.legal_acceptances'::regclass and attname = 'document_key'),
      (select attnum from pg_attribute where attrelid = 'public.legal_acceptances'::regclass and attname = 'document_version')
    ];

  if documents_pk <> 'PRIMARY KEY (key, version)' then
    raise exception 'legal_documents primary key is not versioned: %', documents_pk;
  end if;
  if acceptances_pk <> 'PRIMARY KEY (user_id, document_key, document_version)' then
    raise exception 'legal_acceptances primary key is not append-only: %', acceptances_pk;
  end if;
  if acceptance_fk not like 'FOREIGN KEY (document_key, document_version) REFERENCES legal_documents(key, version)%' then
    raise exception 'legal acceptance composite foreign key is missing: %', acceptance_fk;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from public.legal_documents
    where key = 'terms' and version = '2026-07-29' and is_active
      and url = 'https://koupa-website.pages.dev/terms/'
  ) then
    raise exception 'approved Terms document is not active';
  end if;
  if not exists (
    select 1 from public.legal_documents
    where key = 'privacy' and version = '2026-07-29' and is_active
      and url = 'https://koupa-website.pages.dev/privacy/'
  ) then
    raise exception 'approved Privacy document is not active';
  end if;
end;
$$;
