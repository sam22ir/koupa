# QR Check-In Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a permanent barber QR workflow that atomically validates a customer's appointment, explains exact failures, supports safe repeat scans and barber undo, and produces a printable QR.

**Architecture:** Keep QR payload parsing local, but make Supabase the sole authority for appointment eligibility. A new migration returns structured JSON results, records immutable attendance events, moves the overdue `Absent` boundary to appointment end, and exposes a barber-only undo RPC. Thin TypeScript service and hook adapters feed dedicated scanner-result and barber-QR UI states.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript, `expo-camera`, `react-native-qrcode-svg`, `react-native-view-shot`, `expo-sharing`, Supabase PostgreSQL RPCs, Jest, React Native Testing Library.

---

## File Map

| File | Responsibility |
|---|---|
| `supabase/migrations/20260729000200_qr_check_in_workflow.sql` | Attendance audit table, structured atomic check-in RPC, undo RPC, corrected overdue transition |
| `supabase/tests/qr_check_in.sql` | Deterministic SQL checks for result codes, boundaries, notifications, and undo |
| `supabase/tests/qr_check_in_concurrency.sh` | Two-session race check proving one transition and one notification pair |
| `src/qr.ts` | Strict QR payload parsing and typed RPC-result decoding |
| `src/services/booking.ts` | Supabase calls for structured check-in and undo |
| `src/hooks/useBooking.ts` | Stable React adapters for check-in and undo |
| `src/i18n/ar.ts` | Arabic scanner, result, sharing, and undo copy |
| `app/scan.tsx` | Permission states, camera lock, validation progress, and result panel |
| `app/(barber)/today.tsx` | Existing real QR display, printable sharing, and undo action |
| `app/(customer)/home.tsx` | Show scan only for `Booked` appointments and pass appointment context |
| `app/appointment/[id].tsx` | Show scan only for `Booked` appointments and pass appointment context |
| `src/types/database.ts` | Regenerated schema and RPC types after the local migration |
| `reference/KOUPA-PRODUCT-SPEC.md` | Persist the approved check-in window, idempotency, and undo decisions |
| `reference/BOOKING-OPERATIONS.md` | Document the new absence boundary and QR operations |

### Task 1: Define and Test the Client QR Contract

**Files:**
- Modify: `src/qr.ts`
- Modify: `__tests__/qr.test.ts`

- [ ] **Step 1: Add failing tests for strict payload origins and structured results**

Extend `__tests__/qr.test.ts` with these cases:

```ts
import {
  buildBarberCheckInPayload,
  parseBarberCheckInPayload,
  parseCheckInResult,
} from '@/src/qr';

it('rejects unrelated web origins and query-only payloads', () => {
  expect(parseBarberCheckInPayload(`https://evil.example/check-in/${barberId}`)).toBeNull();
  expect(parseBarberCheckInPayload(`https://koupa.app/?barberId=${barberId}`)).toBeNull();
});

it('decodes a checked-in response', () => {
  expect(parseCheckInResult({
    code: 'CHECKED_IN',
    appointment_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    barber_name: 'أحمد',
    service_name: 'حلاقة شعر',
    starts_at: '2026-07-29T13:00:00Z',
    ends_at: '2026-07-29T13:30:00Z',
  })).toEqual({
    code: 'CHECKED_IN',
    appointmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    barberName: 'أحمد',
    serviceName: 'حلاقة شعر',
    startsAt: '2026-07-29T13:00:00Z',
    endsAt: '2026-07-29T13:30:00Z',
  });
});

it('rejects unknown result codes', () => {
  expect(() => parseCheckInResult({ code: 'MAYBE' })).toThrow('Invalid QR check-in response');
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --runInBand __tests__/qr.test.ts`

Expected: FAIL because `parseCheckInResult` is not exported and unrelated HTTPS origins are still accepted.

- [ ] **Step 3: Implement the strict parser and result decoder**

Replace the URL branch in `src/qr.ts` and add the result contract:

```ts
const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const uuidRegex = new RegExp(`^${uuidPattern}$`, 'i');
const checkInPathPattern = new RegExp(`^/check-in/(${uuidPattern})/?$`, 'i');

export type CheckInResultCode =
  | 'CHECKED_IN'
  | 'ALREADY_PRESENT'
  | 'WRONG_BARBER'
  | 'TOO_EARLY'
  | 'TOO_LATE'
  | 'CANCELLED'
  | 'NO_ACTIVE_APPOINTMENT';

export interface CheckInResult {
  readonly code: CheckInResultCode;
  readonly appointmentId?: string;
  readonly barberName?: string;
  readonly expectedBarberName?: string;
  readonly serviceName?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly checkInOpensAt?: string;
}

const resultCodes = new Set<CheckInResultCode>([
  'CHECKED_IN', 'ALREADY_PRESENT', 'WRONG_BARBER', 'TOO_EARLY',
  'TOO_LATE', 'CANCELLED', 'NO_ACTIVE_APPOINTMENT',
]);

export function buildBarberCheckInPayload(barberId: string): string {
  return `koupa://check-in/${barberId.toLowerCase()}`;
}

export function parseBarberCheckInPayload(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const allowed = url.protocol === 'koupa:'
      ? url.hostname === 'check-in'
      : url.protocol === 'https:' && url.hostname === 'koupa.app';
    if (!allowed) return null;
    const candidate = url.protocol === 'koupa:'
      ? url.pathname.slice(1)
      : url.pathname.match(checkInPathPattern)?.[1];
    return candidate && uuidRegex.test(candidate) ? candidate.toLowerCase() : null;
  } catch {
    const plain = trimmed.match(new RegExp(`^/check-in/(${uuidPattern})/?$`, 'i'))?.[1];
    return plain?.toLowerCase() ?? null;
  }
}

function stringField(row: Record<string, unknown>, key: string): string | undefined {
  return typeof row[key] === 'string' ? row[key] : undefined;
}

export function parseCheckInResult(value: unknown): CheckInResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid QR check-in response');
  }
  const row = value as Record<string, unknown>;
  if (typeof row.code !== 'string' || !resultCodes.has(row.code as CheckInResultCode)) {
    throw new Error('Invalid QR check-in response');
  }
  return {
    code: row.code as CheckInResultCode,
    appointmentId: stringField(row, 'appointment_id'),
    barberName: stringField(row, 'barber_name'),
    expectedBarberName: stringField(row, 'expected_barber_name'),
    serviceName: stringField(row, 'service_name'),
    startsAt: stringField(row, 'starts_at'),
    endsAt: stringField(row, 'ends_at'),
    checkInOpensAt: stringField(row, 'check_in_opens_at'),
  };
}
```

- [ ] **Step 4: Run the QR tests**

Run: `npm test -- --runInBand __tests__/qr.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the client contract**

```bash
git add src/qr.ts __tests__/qr.test.ts
git commit -m "Define QR check-in result contract"
```

### Task 2: Add the Atomic Database Workflow

**Files:**
- Create: `supabase/migrations/20260729000200_qr_check_in_workflow.sql`

- [ ] **Step 1: Create the attendance audit table**

Start the migration with:

```sql
create table public.appointment_attendance_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  source text not null check (source = 'customer_qr'),
  checked_in_by uuid not null references public.profiles(id) on delete restrict,
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  check ((reversed_at is null) = (reversed_by is null))
);

create index appointment_attendance_events_appointment_idx
  on public.appointment_attendance_events (appointment_id, checked_in_at desc);

alter table public.appointment_attendance_events enable row level security;
revoke all on table public.appointment_attendance_events from anon, authenticated;
```

- [ ] **Step 2: Replace the UUID RPC with a structured atomic RPC**

Append a `drop function` followed by the new function. The implementation must use the existing one-active-appointment index and a conditional update:

```sql
drop function public.check_in_with_barber_qr(uuid);

create function public.check_in_with_barber_qr(target_barber_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_id uuid := auth.uid();
  appointment public.appointments%rowtype;
  changed public.appointments%rowtype;
  barber_name text;
  expected_barber_name text;
  service_name text;
begin
  if customer_id is null or not exists (
    select 1 from public.profiles where id = customer_id and role = 'customer'
  ) then
    raise exception 'Customer authentication is required';
  end if;

  select row_value.* into appointment
  from public.appointments row_value
  where row_value.customer_id = customer_id
    and row_value.status in ('booked', 'present')
  limit 1;

  if appointment.id is not null then
    select name into expected_barber_name from public.profiles where id = appointment.barber_id;
    if appointment.barber_id <> target_barber_id then
      return jsonb_build_object('code', 'WRONG_BARBER', 'expected_barber_name', expected_barber_name);
    end if;

    select profile.name, service.name into barber_name, service_name
    from public.profiles profile
    join public.services service on service.id = appointment.service_id
    where profile.id = appointment.barber_id;

    if appointment.status = 'present' then
      return jsonb_build_object(
        'code', 'ALREADY_PRESENT', 'appointment_id', appointment.id,
        'barber_name', barber_name, 'service_name', service_name,
        'starts_at', appointment.starts_at, 'ends_at', appointment.ends_at
      );
    end if;
    if now() < appointment.starts_at - interval '30 minutes' then
      return jsonb_build_object(
        'code', 'TOO_EARLY', 'appointment_id', appointment.id,
        'check_in_opens_at', appointment.starts_at - interval '30 minutes'
      );
    end if;
    if now() >= appointment.ends_at then
      return jsonb_build_object(
        'code', 'TOO_LATE', 'appointment_id', appointment.id,
        'ends_at', appointment.ends_at
      );
    end if;

    update public.appointments
    set status = 'present', qr_checked_in_at = now(), updated_at = now()
    where id = appointment.id and status = 'booked'
    returning * into changed;

    if changed.id is null then
      select * into changed from public.appointments where id = appointment.id;
      if changed.status = 'present' then
        return jsonb_build_object(
          'code', 'ALREADY_PRESENT', 'appointment_id', changed.id,
          'barber_name', barber_name, 'service_name', service_name,
          'starts_at', changed.starts_at, 'ends_at', changed.ends_at
        );
      end if;
      return jsonb_build_object('code', 'NO_ACTIVE_APPOINTMENT');
    end if;

    insert into public.appointment_attendance_events
      (appointment_id, source, checked_in_by)
    values (changed.id, 'customer_qr', customer_id);
    perform public.insert_booking_notification(
      changed.customer_id, 'تم تأكيد حضورك', 'تم تسجيل حضورك للموعد.', changed.id
    );
    perform public.insert_booking_notification(
      changed.barber_id, 'تم تسجيل حضور عميل', 'قام العميل بمسح رمز الحضور.', changed.id
    );
    return jsonb_build_object(
      'code', 'CHECKED_IN', 'appointment_id', changed.id,
      'barber_name', barber_name, 'service_name', service_name,
      'starts_at', changed.starts_at, 'ends_at', changed.ends_at
    );
  end if;

  select row_value.* into appointment
  from public.appointments row_value
  where row_value.customer_id = customer_id
    and row_value.barber_id = target_barber_id
    and (row_value.starts_at at time zone 'Africa/Algiers')::date =
        (now() at time zone 'Africa/Algiers')::date
  order by row_value.starts_at desc
  limit 1;

  if appointment.status = 'cancelled' then
    return jsonb_build_object('code', 'CANCELLED', 'appointment_id', appointment.id);
  end if;
  if appointment.id is not null and (
    appointment.status in ('completed', 'absent') or appointment.ends_at <= now()
  ) then
    return jsonb_build_object(
      'code', 'TOO_LATE', 'appointment_id', appointment.id, 'ends_at', appointment.ends_at
    );
  end if;
  return jsonb_build_object('code', 'NO_ACTIVE_APPOINTMENT');
end;
$$;
```

- [ ] **Step 3: Add the barber-only undo RPC**

Append:

```sql
create function public.undo_qr_check_in(target_appointment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  changed public.appointments%rowtype;
begin
  update public.appointments
  set status = 'booked', qr_checked_in_at = null, updated_at = now()
  where id = target_appointment_id
    and barber_id = auth.uid()
    and status = 'present'
  returning * into changed;
  if changed.id is null then
    raise exception 'QR check-in cannot be undone';
  end if;

  update public.appointment_attendance_events
  set reversed_at = now(), reversed_by = auth.uid()
  where id = (
    select id from public.appointment_attendance_events
    where appointment_id = changed.id and reversed_at is null
    order by checked_in_at desc limit 1
  );
  perform public.insert_booking_notification(
    changed.customer_id,
    'تم التراجع عن تأكيد الحضور',
    'أعاد الحلاق الموعد إلى حالة محجوز.',
    changed.id
  );
  return changed.id;
end;
$$;
```

- [ ] **Step 4: Correct the overdue boundary and grants**

Append a replacement for `transition_overdue_appointments()` using `ends_at <= now()` for `Booked` appointments. Preserve the existing `Present` to `Completed` branch and notification bodies exactly:

```sql
create or replace function public.transition_overdue_appointments()
returns table (absent_count integer, completed_count integer)
language plpgsql security definer set search_path = public as $$
declare absent_total integer; completed_total integer;
begin
  with changed as (
    update public.appointments set status = 'absent', updated_at = now()
    where status = 'booked' and ends_at <= now()
    returning customer_id, barber_id, id
  ), notices as (
    insert into public.notifications (user_id, title, body, appointment_id)
    select recipient_id, 'تم تسجيل الموعد كغائب', 'انتهى وقت الموعد قبل تأكيد الحضور.', id
    from changed cross join lateral (values (customer_id), (barber_id)) recipients(recipient_id)
    returning 1
  ) select count(*) / 2 into absent_total from notices;

  with changed as (
    update public.appointments set status = 'completed', updated_at = now()
    where status = 'present' and ends_at <= now()
    returning customer_id, barber_id, id
  ), notices as (
    insert into public.notifications (user_id, title, body, appointment_id)
    select recipient_id, 'اكتمل الموعد', 'تم إكمال الموعد بنجاح.', id
    from changed cross join lateral (values (customer_id), (barber_id)) recipients(recipient_id)
    returning 1
  ) select count(*) / 2 into completed_total from notices;
  return query select coalesce(absent_total, 0), coalesce(completed_total, 0);
end;
$$;

revoke all on function public.check_in_with_barber_qr(uuid) from public;
revoke all on function public.undo_qr_check_in(uuid) from public;
grant execute on function public.check_in_with_barber_qr(uuid) to authenticated;
grant execute on function public.undo_qr_check_in(uuid) to authenticated;
```

- [ ] **Step 5: Validate migration formatting**

Run: `npx supabase db lint --local`

Expected: no new SQL lint errors. If the local stack is not running, start it in Task 3 rather than treating this as a pass.

- [ ] **Step 6: Commit the migration**

```bash
git add supabase/migrations/20260729000200_qr_check_in_workflow.sql
git commit -m "Add atomic QR check-in workflow"
```

### Task 3: Add Database Integration and Race Tests

**Files:**
- Create: `supabase/tests/qr_check_in.sql`
- Create: `supabase/tests/qr_check_in_concurrency.sh`
- Modify: `supabase/tests/README.md`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create deterministic local fixtures**

In `supabase/tests/qr_check_in.sql`, begin a transaction, insert three fixed `auth.users`, matching customer/barber profiles, one service, and one appointment. Use IDs ending in `901`, `902`, and `903`, and set the customer session with:

```sql
begin;
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   confirmation_token, recovery_token, email_change_token_new, email_change,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select
  '00000000-0000-0000-0000-000000000000', fixture.id, 'authenticated', 'authenticated',
  fixture.email, crypt('qr-test-password', gen_salt('bf', 10)), now(), '', '', '', '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  '{}'::jsonb, now(), now()
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

insert into public.services
  (id, barber_id, name, price_dzd, duration_minutes, is_active)
values (
  '90000000-0000-4000-8000-000000000904',
  '90000000-0000-4000-8000-000000000902',
  'حلاقة اختبار', 800, 30, true
);

insert into public.appointments
  (id, customer_id, barber_id, service_id, starts_at, ends_at, price_dzd)
values (
  '90000000-0000-4000-8000-000000000905',
  '90000000-0000-4000-8000-000000000901',
  '90000000-0000-4000-8000-000000000902',
  '90000000-0000-4000-8000-000000000904',
  now() + interval '20 minutes', now() + interval '50 minutes', 800
);

create temporary table qr_test_results (sequence integer primary key, result jsonb);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000901', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
```

- [ ] **Step 2: Assert success, idempotency, and notification counts**

Call the RPC twice as the customer, reset to the database owner, and fail unless the first code is `CHECKED_IN`, the second is `ALREADY_PRESENT`, one unreversed attendance event exists, and exactly two QR confirmation notifications exist for the appointment:

```sql
insert into qr_test_results values
  (1, public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')),
  (2, public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902'));
reset role;
do $$
declare first_result jsonb; second_result jsonb;
begin
  select result into first_result from qr_test_results where sequence = 1;
  select result into second_result from qr_test_results where sequence = 2;
  if first_result->>'code' <> 'CHECKED_IN' then raise exception 'expected CHECKED_IN: %', first_result; end if;
  if second_result->>'code' <> 'ALREADY_PRESENT' then raise exception 'expected ALREADY_PRESENT: %', second_result; end if;
  if (select count(*) from public.appointment_attendance_events where appointment_id = '90000000-0000-4000-8000-000000000905') <> 1 then raise exception 'attendance event count mismatch'; end if;
  if (select count(*) from public.notifications where appointment_id = '90000000-0000-4000-8000-000000000905' and title in ('تم تأكيد حضورك', 'تم تسجيل حضور عميل')) <> 2 then raise exception 'notification count mismatch'; end if;
end;
$$;
```

- [ ] **Step 3: Assert all result codes and boundaries**

Reset the fixture between assertions and cover:

```sql
reset role;
update public.appointments
set status = 'booked', qr_checked_in_at = null,
    starts_at = now() + interval '30 minutes 1 second',
    ends_at = now() + interval '60 minutes';
set local role authenticated;
do $$ begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'TOO_EARLY'
  then raise exception 'expected TOO_EARLY'; end if;
end $$;

reset role;
update public.appointments
set status = 'booked', qr_checked_in_at = null,
    starts_at = now() + interval '30 minutes',
    ends_at = now() + interval '60 minutes';
set local role authenticated;
do $$ begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'CHECKED_IN'
  then raise exception 'expected boundary CHECKED_IN'; end if;
end $$;

reset role;
update public.appointments
set status = 'booked', qr_checked_in_at = null,
    starts_at = now() - interval '30 minutes', ends_at = now();
set local role authenticated;
do $$ begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'TOO_LATE'
  then raise exception 'expected TOO_LATE'; end if;
end $$;
```

Continue with explicit state resets for the remaining results and undo:

```sql
reset role;
update public.appointments
set status = 'booked', starts_at = now() + interval '20 minutes',
    ends_at = now() + interval '50 minutes';
set local role authenticated;
do $$ begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000903')->>'code' <> 'WRONG_BARBER'
  then raise exception 'expected WRONG_BARBER'; end if;
end $$;

reset role;
update public.appointments set status = 'cancelled';
set local role authenticated;
do $$ begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'CANCELLED'
  then raise exception 'expected CANCELLED'; end if;
end $$;

reset role;
delete from public.appointments where id = '90000000-0000-4000-8000-000000000905';
set local role authenticated;
do $$ begin
  if public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902')->>'code' <> 'NO_ACTIVE_APPOINTMENT'
  then raise exception 'expected NO_ACTIVE_APPOINTMENT'; end if;
end $$;

reset role;
insert into public.appointments
  (id, customer_id, barber_id, service_id, starts_at, ends_at, price_dzd, status, qr_checked_in_at)
values (
  '90000000-0000-4000-8000-000000000905',
  '90000000-0000-4000-8000-000000000901',
  '90000000-0000-4000-8000-000000000902',
  '90000000-0000-4000-8000-000000000904',
  now() - interval '10 minutes', now() + interval '20 minutes', 800, 'present', now()
);
insert into public.appointment_attendance_events
  (appointment_id, source, checked_in_by)
values (
  '90000000-0000-4000-8000-000000000905', 'customer_qr',
  '90000000-0000-4000-8000-000000000901'
);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000902', true);
set local role authenticated;
select public.undo_qr_check_in('90000000-0000-4000-8000-000000000905');
reset role;
do $$ begin
  if not exists (
    select 1 from public.appointments
    where id = '90000000-0000-4000-8000-000000000905'
      and status = 'booked' and qr_checked_in_at is null
  ) then raise exception 'undo did not restore Booked'; end if;
  if not exists (
    select 1 from public.appointment_attendance_events
    where appointment_id = '90000000-0000-4000-8000-000000000905'
      and reversed_at is not null and reversed_by = '90000000-0000-4000-8000-000000000902'
  ) then raise exception 'undo audit mismatch'; end if;
end $$;
```

Before the final rollback, also assert authorization and lifecycle behavior:

```sql
reset role;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  begin
    perform public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902');
    raise exception 'unauthenticated call unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'unauthenticated call unexpectedly succeeded' then raise; end if;
  end;
end $$;

update public.appointments
set status = 'booked', starts_at = now() - interval '20 minutes',
    ends_at = now() + interval '10 minutes';
select * from public.transition_overdue_appointments();
do $$ begin
  if (select status from public.appointments where id = '90000000-0000-4000-8000-000000000905') <> 'booked'
  then raise exception 'appointment became Absent before its end'; end if;
end $$;

update public.appointments set ends_at = now() - interval '1 second';
select * from public.transition_overdue_appointments();
do $$ begin
  if (select status from public.appointments where id = '90000000-0000-4000-8000-000000000905') <> 'absent'
  then raise exception 'appointment did not become Absent after its end'; end if;
end $$;
```

Add exact rejection assertions for a non-customer caller and terminal-state undo:

```sql
reset role;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000903', true);
do $$ begin
  begin
    perform public.check_in_with_barber_qr('90000000-0000-4000-8000-000000000902');
    raise exception 'barber check-in unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'barber check-in unexpectedly succeeded' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000902', true);
do $$
declare terminal_status public.appointment_status;
begin
  foreach terminal_status in array array['completed', 'absent', 'cancelled']::public.appointment_status[] loop
    update public.appointments
    set status = terminal_status, qr_checked_in_at = null
    where id = '90000000-0000-4000-8000-000000000905';
    begin
      perform public.undo_qr_check_in('90000000-0000-4000-8000-000000000905');
      raise exception 'terminal undo unexpectedly succeeded';
    exception when others then
      if sqlerrm = 'terminal undo unexpectedly succeeded' then raise; end if;
    end;
    if (select status from public.appointments
        where id = '90000000-0000-4000-8000-000000000905') <> terminal_status
    then raise exception 'terminal undo changed status %', terminal_status; end if;
  end loop;
end $$;
rollback;
```

- [ ] **Step 4: Add the two-session race script**

Create `supabase/tests/qr_check_in_concurrency.sh` with `set -euo pipefail`. It must seed one valid appointment, launch two authenticated `psql` calls to `check_in_with_barber_qr` in parallel, wait for both, then assert one attendance event and two confirmation notifications. Read the local URL from `supabase status -o env` and never target the linked hosted project.

Use this executable structure after inserting a fixture with IDs `911` through `915` using the same full column lists as Step 1:

```bash
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
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   confirmation_token, recovery_token, email_change_token_new, email_change,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', fixture.id, 'authenticated',
  'authenticated', fixture.email, crypt('qr-race-password', gen_salt('bf', 10)), now(),
  '', '', '', '', jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  '{}'::jsonb, now(), now()
from (values
  ('90000000-0000-4000-8000-000000000911'::uuid, 'qr-race-customer@koupa.test'),
  ('90000000-0000-4000-8000-000000000912'::uuid, 'qr-race-barber@koupa.test')
) fixture(id, email);
insert into public.profiles (id, role, name, phone, maps_url, is_published) values
  ('90000000-0000-4000-8000-000000000911', 'customer', 'زبون تزامن', '0550000911', null, false),
  ('90000000-0000-4000-8000-000000000912', 'barber', 'حلاق تزامن', '0550000912', 'https://maps.google.com/?q=36.75,3.05', true);
insert into public.services (id, barber_id, name, price_dzd, duration_minutes) values
  ('90000000-0000-4000-8000-000000000914', '90000000-0000-4000-8000-000000000912', 'حلاقة تزامن', 800, 30);
insert into public.appointments
  (id, customer_id, barber_id, service_id, starts_at, ends_at, price_dzd) values
  ('90000000-0000-4000-8000-000000000915', '90000000-0000-4000-8000-000000000911',
   '90000000-0000-4000-8000-000000000912', '90000000-0000-4000-8000-000000000914',
   now() + interval '20 minutes', now() + interval '50 minutes', 800);
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
do $$ begin
  if (select count(*) from public.appointment_attendance_events
      where appointment_id = '90000000-0000-4000-8000-000000000915') <> 1
  then raise exception 'race created duplicate attendance events'; end if;
  if (select count(*) from public.notifications
      where appointment_id = '90000000-0000-4000-8000-000000000915'
        and title in ('تم تأكيد حضورك', 'تم تسجيل حضور عميل')) <> 2
  then raise exception 'race created duplicate notifications'; end if;
end $$;
delete from public.appointments where id = '90000000-0000-4000-8000-000000000915';
delete from public.services where id = '90000000-0000-4000-8000-000000000914';
delete from auth.users where id in (
  '90000000-0000-4000-8000-000000000911',
  '90000000-0000-4000-8000-000000000912'
);
SQL
```

- [ ] **Step 5: Run the local database suite**

Run:

```bash
npx supabase start
npx supabase db reset
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f supabase/tests/qr_check_in.sql
bash supabase/tests/qr_check_in_concurrency.sh
```

Expected: reset succeeds; both test programs exit 0. If Docker is unavailable, record this as an explicit verification blocker and do not run these fixtures against staging or production.

- [ ] **Step 6: Regenerate database types from local Supabase**

Run: `npx supabase gen types typescript --local --schema public > src/types/database.ts`

Expected: `check_in_with_barber_qr.Returns` is `Json`, `undo_qr_check_in` exists, and `appointment_attendance_events` is present.

- [ ] **Step 7: Document and commit the database tests**

Add both commands to `supabase/tests/README.md`, then run `git diff --check` and commit:

```bash
git add supabase/tests src/types/database.ts
git commit -m "Test QR check-in database invariants"
```

### Task 4: Wire Structured Results Through Services and Hooks

**Files:**
- Modify: `src/services/booking.ts`
- Modify: `src/hooks/useBooking.ts`
- Create: `__tests__/bookingService.test.ts`

- [ ] **Step 1: Write failing service tests**

Mock `supabase.rpc` and assert that `checkInWithQr` decodes JSON and `undoQrCheckIn` passes the appointment ID:

```ts
expect(await bookingService.checkInWithQr(barberId)).toEqual({
  code: 'TOO_EARLY',
  appointmentId,
  checkInOpensAt: '2026-07-29T12:30:00Z',
});
expect(mockRpc).toHaveBeenCalledWith('check_in_with_barber_qr', { target_barber_id: barberId });

await bookingService.undoQrCheckIn(appointmentId);
expect(mockRpc).toHaveBeenCalledWith('undo_qr_check_in', { target_appointment_id: appointmentId });
```

- [ ] **Step 2: Run the service test and verify failure**

Run: `npm test -- --runInBand __tests__/bookingService.test.ts`

Expected: FAIL because structured decoding and undo are not implemented.

- [ ] **Step 3: Implement service functions**

In `src/services/booking.ts`:

```ts
import { parseCheckInResult, type CheckInResult } from '@/src/qr';

export async function checkInWithQr(barberId: string): Promise<CheckInResult> {
  const data = await rpcData(() =>
    supabase.rpc('check_in_with_barber_qr', { target_barber_id: barberId }),
  );
  return parseCheckInResult(data);
}

export async function undoQrCheckIn(appointmentId: string): Promise<string> {
  return rpcData(() =>
    supabase.rpc('undo_qr_check_in', { target_appointment_id: appointmentId }),
  );
}
```

In `src/hooks/useBooking.ts`, add a stable action:

```ts
const undoQrCheckIn = useCallback(
  (appointmentId: string) => run(() => bookingService.undoQrCheckIn(appointmentId), mapError),
  [mapError, run],
);
```

Include `undoQrCheckIn` in the memoized action object and dependency list.

- [ ] **Step 4: Run service tests and typecheck**

Run: `npm test -- --runInBand __tests__/bookingService.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the service layer**

```bash
git add src/services/booking.ts src/hooks/useBooking.ts __tests__/bookingService.test.ts
git commit -m "Wire structured QR check-in results"
```

### Task 5: Build the Customer Scanner States

**Files:**
- Modify: `app/scan.tsx`
- Modify: `src/i18n/ar.ts`
- Create: `__tests__/scanScreen.test.tsx`

- [ ] **Step 1: Add complete scanner-state tests**

Mock `expo-camera`, `useLocalSearchParams`, and `useBooking`. Cover permission loading, requestable denial, permanent denial with `Linking.openSettings`, invalid QR, locked loading, all seven RPC result codes, retry, and successful `router.replace('/appointment/<id>')`.

The core success assertion is:

```ts
mockCheckInWithQr.mockResolvedValue({
  code: 'CHECKED_IN', appointmentId: 'appointment-id', barberName: 'أحمد',
  serviceName: 'حلاقة شعر', startsAt: '2026-07-29T13:00:00Z', endsAt: '2026-07-29T13:30:00Z',
});
fireEvent(screen.getByTestId('qr-camera'), 'barcodeScanned', {
  data: 'koupa://check-in/11111111-2222-4333-8444-555555555555',
});
expect(await screen.findByText('تم تأكيد حضورك')).toBeTruthy();
fireEvent.press(screen.getByRole('button', { name: 'عرض الموعد' }));
expect(mockReplace).toHaveBeenCalledWith('/appointment/appointment-id');
```

- [ ] **Step 2: Run the scanner test and verify failure**

Run: `npm test -- --runInBand __tests__/scanScreen.test.tsx`

Expected: FAIL because the scanner currently uses a generic alert and has no structured states.

- [ ] **Step 3: Add Arabic copy**

Extend `scan` in `src/i18n/ar.ts` with explicit keys:

```ts
scan: {
  title: 'مسح رمز الحضور',
  permission: 'نحتاج إذن الكاميرا لتأكيد حضورك',
  grant: 'السماح بالكاميرا',
  openSettings: 'فتح الإعدادات',
  checking: 'جارٍ التحقق من موعدك',
  invalidQr: 'هذا ليس رمز حضور صالحا من كوپا',
  checkedIn: 'تم تأكيد حضورك',
  alreadyPresent: 'تم تأكيد حضورك مسبقا',
  wrongBarber: 'هذا الرمز لحلاق آخر. موعدك مع {name}',
  tooEarly: 'يفتح تسجيل الحضور في {time}',
  tooLate: 'انتهى موعدك في {time}',
  cancelled: 'تم إلغاء هذا الموعد',
  noAppointment: 'ليس لديك موعد محجوز مناسب',
  network: 'تعذر الاتصال. حاول مرة أخرى',
  scanAgain: 'المسح مرة أخرى',
  viewAppointment: 'عرض الموعد',
},
```

Use a small local interpolation helper in `app/scan.tsx` for `{name}` and `{time}`; do not widen the global `t()` API in this task.

- [ ] **Step 4: Replace alerts with an in-app scanner state machine**

Use this explicit state shape:

```ts
type ScanState =
  | { readonly kind: 'scanning' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'result'; readonly result: CheckInResult }
  | { readonly kind: 'network' };
```

Pass `appointmentId`, `barberName`, and `startsAt` through `useLocalSearchParams`. Render the expected barber and formatted appointment time above the camera. Set `onBarcodeScanned` only while `kind === 'scanning'`; invalid payloads become `invalid`, and valid payloads become `checking` before awaiting the RPC. Render an icon, message, and one clear action for every terminal state. Use `CHECKED_IN` and `ALREADY_PRESENT` as success tones and route both to the returned appointment ID.

- [ ] **Step 5: Run scanner tests, QR tests, and typecheck**

Run:

```bash
npm test -- --runInBand __tests__/scanScreen.test.tsx __tests__/qr.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit the scanner experience**

```bash
git add app/scan.tsx src/i18n/ar.ts __tests__/scanScreen.test.tsx
git commit -m "Build guided customer QR scanner"
```

### Task 6: Add Printable Sharing and Barber Undo

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app/(barber)/today.tsx`
- Modify: `src/i18n/ar.ts`
- Modify: `__tests__/barberTodayScreen.test.tsx`

- [ ] **Step 1: Install Expo-compatible sharing dependencies**

Run: `npx expo install expo-sharing react-native-view-shot`

Expected: compatible versions are added to `package.json` and `package-lock.json`.

- [ ] **Step 2: Write failing QR sharing and undo tests**

Mock `captureRef` and `Sharing.shareAsync`. Assert `Save/Share` captures the branded QR surface and invokes the native share sheet. Add a `Present` appointment and assert `Undo attendance` remains behind `Alert.alert`, then invokes `undoQrCheckIn('appointment-id')` and refreshes.

```ts
fireEvent.press(screen.getByRole('button', { name: 'حفظ أو مشاركة الرمز' }));
await waitFor(() => expect(mockCaptureRef).toHaveBeenCalled());
expect(mockShareAsync).toHaveBeenCalledWith(
  'file:///tmp/koupa-qr.png',
  expect.objectContaining({ mimeType: 'image/png' }),
);
```

- [ ] **Step 3: Run the barber screen test and verify failure**

Run: `npm test -- --runInBand __tests__/barberTodayScreen.test.tsx`

Expected: FAIL because sharing and undo controls do not exist.

- [ ] **Step 4: Add the branded share surface**

In `app/(barber)/today.tsx`, import `captureRef`, `expo-sharing`, and a `useRef<View>`. Wrap the white QR, barber name, and instruction in a referenced `View` and share it with:

```ts
const shareQr = async () => {
  if (!qrCardRef.current || !(await Sharing.isAvailableAsync())) return;
  const uri = await captureRef(qrCardRef, { format: 'png', quality: 1, result: 'tmpfile' });
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: t('barber.shareQr'),
    UTI: 'public.png',
  });
};
```

Convert the current centered card into a full-screen QR view with a stable white QR surface and a code size of at least 240 logical pixels on phones. The captured surface must include `profile.name`, a `كوپا` label or approved wordmark, the existing QR component, and `barber.qrInstruction`. Keep the raw URI hidden. Extend the screen test to assert the QR surface is modal, the QR receives the payload, and no raw payload text is rendered.

- [ ] **Step 5: Add barber undo**

Destructure `undoQrCheckIn` from `useBooking`. For `selectedAppointment.status === 'present'`, render a secondary `Undo attendance` button. Confirm with `Alert.alert`; on approval, set `pendingId`, call the RPC, close the detail modal, and refresh.

Add these Arabic keys:

```ts
shareQr: 'حفظ أو مشاركة الرمز',
undoAttendance: 'التراجع عن الحضور',
undoAttendanceConfirm: 'سيعود الموعد إلى حالة محجوز. هل تريد المتابعة؟',
```

- [ ] **Step 6: Run focused UI tests and Expo configuration**

Run:

```bash
npm test -- --runInBand __tests__/barberTodayScreen.test.tsx
npx expo config --type public
npm run typecheck
```

Expected: tests and typecheck pass; Expo resolves both native modules.

- [ ] **Step 7: Commit barber QR operations**

```bash
git add package.json package-lock.json 'app/(barber)/today.tsx' src/i18n/ar.ts __tests__/barberTodayScreen.test.tsx
git commit -m "Add QR sharing and attendance undo"
```

### Task 7: Restrict Customer Entry Points and Pass Context

**Files:**
- Modify: `app/(customer)/home.tsx`
- Modify: `app/appointment/[id].tsx`
- Create: `__tests__/customerQrEntry.test.tsx`

- [ ] **Step 1: Write failing visibility and route tests**

For both customer surfaces, assert the scan action exists only for `status: 'booked'`. Press it and expect an encoded route object containing `appointmentId`, `barberName`, and `startsAt`:

```ts
expect(mockPush).toHaveBeenCalledWith({
  pathname: '/scan',
  params: {
    appointmentId: appointment.id,
    barberName: appointment.barber_name,
    startsAt: appointment.starts_at,
  },
});
```

- [ ] **Step 2: Run the entry-point test and verify failure**

Run: `npm test -- --runInBand __tests__/customerQrEntry.test.tsx`

Expected: FAIL because `Present` currently exposes scan and routes contain no context.

- [ ] **Step 3: Restrict and enrich both links**

Change both conditions to `appointment.status === 'booked'` and use the route object shown in Step 1. Do not pass eligibility decisions or status as trusted scanner inputs; context is display-only.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
npm test -- --runInBand __tests__/customerQrEntry.test.tsx __tests__/scanScreen.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit customer entry points**

```bash
git add 'app/(customer)/home.tsx' 'app/appointment/[id].tsx' __tests__/customerQrEntry.test.tsx
git commit -m "Restrict customer QR entry points"
```

### Task 8: Update Product and Operations Documentation

**Files:**
- Modify: `reference/KOUPA-PRODUCT-SPEC.md`
- Modify: `reference/BOOKING-OPERATIONS.md`

- [ ] **Step 1: Persist the approved product rules**

Update the QR paragraph in `reference/KOUPA-PRODUCT-SPEC.md` to state:

```markdown
Each barber has one permanent QR code that can be displayed in the app or saved/shared for printing. A customer scan is validated against the authenticated customer's appointment on the server. Check-in opens 30 minutes before the appointment and closes at its scheduled end. Valid scans mark the appointment `Present`; repeat scans are successful and idempotent. The barber may undo an incorrect QR check-in back to `Booked`.
```

Update the lifecycle sentence so an unconfirmed `Booked` appointment becomes `Absent` when its scheduled end passes.

- [ ] **Step 2: Document operations and rollback behavior**

In `reference/BOOKING-OPERATIONS.md`, document the structured result codes, attendance audit table, notification idempotency, barber undo, and `ends_at` absence boundary. State that native camera acceptance requires an installed Android build and two authenticated test accounts.

- [ ] **Step 3: Verify and commit documentation**

Run: `rg -n "30 minutes|ALREADY_PRESENT|undo|ends_at" reference/KOUPA-PRODUCT-SPEC.md reference/BOOKING-OPERATIONS.md`

Expected: every approved rule is represented without contradicting the lifecycle section.

```bash
git add reference/KOUPA-PRODUCT-SPEC.md reference/BOOKING-OPERATIONS.md
git commit -m "Document QR attendance operations"
```

### Task 9: Full Verification and Native Acceptance

**Files:**
- Modify only if a verification failure requires a scoped fix.

- [ ] **Step 1: Run the complete static suite**

Run:

```bash
npm run typecheck
npm test -- --runInBand
npx expo lint
npx expo config --type public
git diff --check
```

Expected: all Jest suites, TypeScript, Expo lint, configuration, and whitespace checks pass.

- [ ] **Step 2: Re-run database verification from a clean reset**

Run:

```bash
npx supabase db reset
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f supabase/tests/qr_check_in.sql
bash supabase/tests/qr_check_in_concurrency.sh
```

Expected: all commands exit 0 and generated `src/types/database.ts` remains unchanged.

- [ ] **Step 3: Run Android acceptance with two accounts**

On an installed Android development build:

1. Sign in as a barber and a customer on separate devices.
2. Create a current appointment beginning 20 minutes from now.
3. Deny camera permission once, grant it, then verify permanent-denial recovery through Settings.
4. Scan an invalid code and verify retry.
5. Scan another barber's code and verify the expected-barber message.
6. Scan the correct code and verify both devices show `Present` plus one notification each.
7. Scan again and verify the already-confirmed success without new notifications.
8. Undo from the barber device and verify the customer returns to `Booked` and receives the undo notification.
9. Scan again and verify a second attendance event is created while the first remains reversed.
10. Share/save the barber QR, display or print that image, and scan it successfully.

- [ ] **Step 4: Record acceptance evidence**

Add the tested build identifier, device models/Android versions, environment, appointment ID, and pass/fail outcome to the pull request description. Do not include passwords, tokens, or session URLs.

- [ ] **Step 5: Inspect the final change set**

Run: `git status --short && git log --oneline --max-count=10`

Expected: only intentional changes remain, and the implementation is split into the focused commits above.
