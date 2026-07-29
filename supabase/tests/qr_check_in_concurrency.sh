#!/usr/bin/env bash
set -euo pipefail

DB_URL="${POSTGRES_URL:-$(npx supabase status -o env | sed -n 's/^DB_URL="\(.*\)"$/\1/p')}"
test -n "$DB_URL"

psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
delete from public.appointments where id = '90000000-0000-4000-8000-000000000915';
delete from public.services where id = '90000000-0000-4000-8000-000000000914';
delete from auth.users where id in (
  '90000000-0000-4000-8000-000000000911',
  '90000000-0000-4000-8000-000000000912'
);
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', fixture.id, 'authenticated',
  'authenticated', fixture.email, crypt('qr-race-password', gen_salt('bf', 10)),
  now(), '', '', '', '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  '{}'::jsonb, now(), now()
from (values
  ('90000000-0000-4000-8000-000000000911'::uuid, 'qr-race-customer@koupa.test'),
  ('90000000-0000-4000-8000-000000000912'::uuid, 'qr-race-barber@koupa.test')
) fixture(id, email);
insert into public.profiles (id, role, name, phone, maps_url, is_published)
values
  ('90000000-0000-4000-8000-000000000911', 'customer', 'زبون تزامن', '0550000911', null, false),
  ('90000000-0000-4000-8000-000000000912', 'barber', 'حلاق تزامن', '0550000912', 'https://maps.google.com/?q=36.75,3.05', true);
insert into public.services (id, barber_id, name, price_dzd, duration_minutes)
values (
  '90000000-0000-4000-8000-000000000914',
  '90000000-0000-4000-8000-000000000912',
  'حلاقة تزامن', 800, 30
);
insert into public.appointments (
  id, customer_id, barber_id, service_id, starts_at, ends_at, price_dzd
)
values (
  '90000000-0000-4000-8000-000000000915',
  '90000000-0000-4000-8000-000000000911',
  '90000000-0000-4000-8000-000000000912',
  '90000000-0000-4000-8000-000000000914',
  now() + interval '20 minutes', now() + interval '50 minutes', 800
);
SQL

run_scan() {
  psql "$DB_URL" -qAt -v ON_ERROR_STOP=1 <<'SQL'
begin;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000911', true);
set local role authenticated;
select public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000912')->>'code';
commit;
SQL
}

first_output=$(mktemp)
second_output=$(mktemp)
trap 'rm -f "$first_output" "$second_output"' EXIT
run_scan >"$first_output" & first_pid=$!
run_scan >"$second_output" & second_pid=$!
wait "$first_pid"
wait "$second_pid"

results=$(cat "$first_output" "$second_output" | grep -E 'CHECKED_IN|ALREADY_PRESENT' | sort)
test "$results" = $'ALREADY_PRESENT\nCHECKED_IN'

psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
do $$
begin
  if (
    select count(*) from public.appointment_attendance_events
    where appointment_id = '90000000-0000-4000-8000-000000000915'
  ) <> 1 then
    raise exception 'race created duplicate attendance events';
  end if;
  if (
    select count(*) from public.notifications
    where appointment_id = '90000000-0000-4000-8000-000000000915'
      and title in ('تم تأكيد حضورك', 'تم تسجيل حضور عميل')
  ) <> 2 then
    raise exception 'race created duplicate notifications';
  end if;
end;
$$;
delete from public.appointments where id = '90000000-0000-4000-8000-000000000915';
delete from public.services where id = '90000000-0000-4000-8000-000000000914';
delete from auth.users where id in (
  '90000000-0000-4000-8000-000000000911',
  '90000000-0000-4000-8000-000000000912'
);
SQL
