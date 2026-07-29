-- Local-only QR check-in integration checks. Run after `supabase db reset`.
begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  fixture.id,
  'authenticated',
  'authenticated',
  fixture.email,
  crypt('qr-test-password', gen_salt('bf', 10)),
  now(),
  '',
  '',
  '',
  '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  '{}'::jsonb,
  now(),
  now()
from (values
  ('90000000-0000-4000-8000-000000000901'::uuid, 'qr-customer@koupa.test'),
  ('90000000-0000-4000-8000-000000000902'::uuid, 'qr-barber@koupa.test'),
  ('90000000-0000-4000-8000-000000000903'::uuid, 'qr-other-barber@koupa.test')
) fixture(id, email);

insert into public.profiles (id, role, name, phone, maps_url, is_published)
values
  ('90000000-0000-4000-8000-000000000901', 'customer', 'زبون اختبار', '0550000901', null, false),
  ('90000000-0000-4000-8000-000000000902', 'barber', 'حلاق اختبار', '0550000902', 'https://maps.google.com/?q=36.75,3.05', true),
  ('90000000-0000-4000-8000-000000000903', 'barber', 'حلاق آخر', '0550000903', 'https://maps.google.com/?q=36.76,3.06', true);

insert into public.services (id, barber_id, name, price_dzd, duration_minutes, is_active)
values (
  '90000000-0000-4000-8000-000000000904',
  '90000000-0000-4000-8000-000000000902',
  'حلاقة اختبار',
  800,
  30,
  true
);

insert into public.appointments (
  id,
  customer_id,
  barber_id,
  service_id,
  starts_at,
  ends_at,
  price_dzd
)
values (
  '90000000-0000-4000-8000-000000000905',
  '90000000-0000-4000-8000-000000000901',
  '90000000-0000-4000-8000-000000000902',
  '90000000-0000-4000-8000-000000000904',
  now() + interval '20 minutes',
  now() + interval '50 minutes',
  800
);

create temporary table qr_test_results (
  sequence integer primary key,
  result jsonb
);
grant all on qr_test_results to authenticated;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000901', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
insert into qr_test_results values
  (1, public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')),
  (2, public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902'));
reset role;

do $$
declare
  first_result jsonb;
  second_result jsonb;
begin
  select result into first_result from qr_test_results where sequence = 1;
  select result into second_result from qr_test_results where sequence = 2;
  if first_result->>'code' <> 'CHECKED_IN' then
    raise exception 'expected CHECKED_IN: %', first_result;
  end if;
  if second_result->>'code' <> 'ALREADY_PRESENT' then
    raise exception 'expected ALREADY_PRESENT: %', second_result;
  end if;
  if (
    select count(*) from public.appointment_attendance_events
    where appointment_id = '90000000-0000-4000-8000-000000000905'
  ) <> 1 then
    raise exception 'attendance event count mismatch';
  end if;
  if (
    select count(*) from public.notifications
    where appointment_id = '90000000-0000-4000-8000-000000000905'
      and title in ('تم تأكيد حضورك', 'تم تسجيل حضور عميل')
  ) <> 2 then
    raise exception 'notification count mismatch';
  end if;
end;
$$;

update public.appointments
set status = 'booked', qr_checked_in_at = null,
    starts_at = now() + interval '30 minutes 1 second',
    ends_at = now() + interval '60 minutes';
set local role authenticated;
do $$
begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'TOO_EARLY' then
    raise exception 'expected TOO_EARLY';
  end if;
end;
$$;
reset role;

update public.appointments
set status = 'booked', qr_checked_in_at = null,
    starts_at = now() + interval '30 minutes',
    ends_at = now() + interval '60 minutes';
set local role authenticated;
do $$
begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'CHECKED_IN' then
    raise exception 'expected boundary CHECKED_IN';
  end if;
end;
$$;
reset role;

update public.appointments
set status = 'booked', qr_checked_in_at = null,
    starts_at = now() - interval '30 minutes',
    ends_at = now();
set local role authenticated;
do $$
begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'TOO_LATE' then
    raise exception 'expected TOO_LATE';
  end if;
end;
$$;
reset role;

update public.appointments
set status = 'booked', starts_at = now() + interval '20 minutes',
    ends_at = now() + interval '50 minutes';
set local role authenticated;
do $$
begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000903')->>'code' <> 'WRONG_BARBER' then
    raise exception 'expected WRONG_BARBER';
  end if;
end;
$$;
reset role;

update public.appointments set status = 'cancelled';
set local role authenticated;
do $$
begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'CANCELLED' then
    raise exception 'expected CANCELLED';
  end if;
end;
$$;
reset role;

delete from public.appointments
where id = '90000000-0000-4000-8000-000000000905';
set local role authenticated;
do $$
begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'NO_ACTIVE_APPOINTMENT' then
    raise exception 'expected NO_ACTIVE_APPOINTMENT';
  end if;
end;
$$;
reset role;

insert into public.appointments (
  id,
  customer_id,
  barber_id,
  service_id,
  starts_at,
  ends_at,
  price_dzd,
  status,
  qr_checked_in_at
)
values (
  '90000000-0000-4000-8000-000000000905',
  '90000000-0000-4000-8000-000000000901',
  '90000000-0000-4000-8000-000000000902',
  '90000000-0000-4000-8000-000000000904',
  now() - interval '10 minutes',
  now() + interval '20 minutes',
  800,
  'present',
  now()
);
insert into public.appointment_attendance_events (appointment_id, source, checked_in_by)
values (
  '90000000-0000-4000-8000-000000000905',
  'customer_qr',
  '90000000-0000-4000-8000-000000000901'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000902', true);
set local role authenticated;
select public.undo_qr_check_in('90000000-0000-4000-8000-000000000905');
reset role;

do $$
begin
  if not exists (
    select 1 from public.appointments
    where id = '90000000-0000-4000-8000-000000000905'
      and status = 'booked'
      and qr_checked_in_at is null
  ) then
    raise exception 'undo did not restore Booked';
  end if;
  if not exists (
    select 1 from public.appointment_attendance_events
    where appointment_id = '90000000-0000-4000-8000-000000000905'
      and reversed_at is not null
      and reversed_by = '90000000-0000-4000-8000-000000000902'
  ) then
    raise exception 'undo audit mismatch';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  begin
    perform public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902');
    raise exception 'unauthenticated call unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'unauthenticated call unexpectedly succeeded' then
      raise;
    end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000903', true);
do $$
begin
  begin
    perform public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902');
    raise exception 'barber check-in unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'barber check-in unexpectedly succeeded' then
      raise;
    end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000902', true);
do $$
declare
  terminal_status public.appointment_status;
begin
  foreach terminal_status in array array['completed', 'absent', 'cancelled']::public.appointment_status[] loop
    update public.appointments
    set status = terminal_status, qr_checked_in_at = null
    where id = '90000000-0000-4000-8000-000000000905';
    begin
      perform public.undo_qr_check_in('90000000-0000-4000-8000-000000000905');
      raise exception 'terminal undo unexpectedly succeeded';
    exception when others then
      if sqlerrm = 'terminal undo unexpectedly succeeded' then
        raise;
      end if;
    end;
    if (
      select status from public.appointments
      where id = '90000000-0000-4000-8000-000000000905'
    ) <> terminal_status then
      raise exception 'terminal undo changed status %', terminal_status;
    end if;
  end loop;
end;
$$;

update public.appointments
set status = 'booked', starts_at = now() - interval '20 minutes',
    ends_at = now() + interval '10 minutes';
select * from public.transition_overdue_appointments();
do $$
begin
  if (
    select status from public.appointments
    where id = '90000000-0000-4000-8000-000000000905'
  ) <> 'booked' then
    raise exception 'appointment became Absent before its end';
  end if;
end;
$$;

update public.appointments set ends_at = now() - interval '1 second';
select * from public.transition_overdue_appointments();
do $$
begin
  if (
    select status from public.appointments
    where id = '90000000-0000-4000-8000-000000000905'
  ) <> 'absent' then
    raise exception 'appointment did not become Absent after its end';
  end if;
end;
$$;

rollback;
