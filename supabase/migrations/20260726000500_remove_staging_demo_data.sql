-- Remove only the fixed staging demo accounts and everything they own.
-- These UUIDs are unique to the retired seed and do not match real accounts.
with demo_ids(id) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid),
    ('22222222-2222-4222-8222-222222222221'::uuid),
    ('22222222-2222-4222-8222-222222222222'::uuid),
    ('22222222-2222-4222-8222-222222222223'::uuid),
    ('22222222-2222-4222-8222-222222222224'::uuid),
    ('22222222-2222-4222-8222-222222222225'::uuid),
    ('22222222-2222-4222-8222-222222222226'::uuid)
), demo_appointments as (
  select id from public.appointments
  where customer_id in (select id from demo_ids) or barber_id in (select id from demo_ids)
)
delete from public.ratings
where appointment_id in (select id from demo_appointments)
  or customer_id in (select id from demo_ids)
  or barber_id in (select id from demo_ids);

with demo_ids(id) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid),
    ('22222222-2222-4222-8222-222222222221'::uuid),
    ('22222222-2222-4222-8222-222222222222'::uuid),
    ('22222222-2222-4222-8222-222222222223'::uuid),
    ('22222222-2222-4222-8222-222222222224'::uuid),
    ('22222222-2222-4222-8222-222222222225'::uuid),
    ('22222222-2222-4222-8222-222222222226'::uuid)
), demo_appointments as (
  select id from public.appointments
  where customer_id in (select id from demo_ids) or barber_id in (select id from demo_ids)
)
delete from public.notifications
where user_id in (select id from demo_ids) or appointment_id in (select id from demo_appointments);

with demo_ids(id) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid),
    ('22222222-2222-4222-8222-222222222221'::uuid),
    ('22222222-2222-4222-8222-222222222222'::uuid),
    ('22222222-2222-4222-8222-222222222223'::uuid),
    ('22222222-2222-4222-8222-222222222224'::uuid),
    ('22222222-2222-4222-8222-222222222225'::uuid),
    ('22222222-2222-4222-8222-222222222226'::uuid)
)
delete from public.activity_logs
where actor_id in (select id from demo_ids) or affected_barber_id in (select id from demo_ids);

with demo_ids(id) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid),
    ('22222222-2222-4222-8222-222222222221'::uuid),
    ('22222222-2222-4222-8222-222222222222'::uuid),
    ('22222222-2222-4222-8222-222222222223'::uuid),
    ('22222222-2222-4222-8222-222222222224'::uuid),
    ('22222222-2222-4222-8222-222222222225'::uuid),
    ('22222222-2222-4222-8222-222222222226'::uuid)
)
delete from public.appointments
where customer_id in (select id from demo_ids) or barber_id in (select id from demo_ids);

with demo_ids(id) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid),
    ('22222222-2222-4222-8222-222222222221'::uuid),
    ('22222222-2222-4222-8222-222222222222'::uuid),
    ('22222222-2222-4222-8222-222222222223'::uuid),
    ('22222222-2222-4222-8222-222222222224'::uuid),
    ('22222222-2222-4222-8222-222222222225'::uuid),
    ('22222222-2222-4222-8222-222222222226'::uuid)
)
delete from public.shop_memberships
where barber_id in (select id from demo_ids)
  or shop_id in (select id from public.shops where owner_id in (select id from demo_ids));

with demo_ids(id) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid),
    ('22222222-2222-4222-8222-222222222221'::uuid),
    ('22222222-2222-4222-8222-222222222222'::uuid),
    ('22222222-2222-4222-8222-222222222223'::uuid),
    ('22222222-2222-4222-8222-222222222224'::uuid),
    ('22222222-2222-4222-8222-222222222225'::uuid),
    ('22222222-2222-4222-8222-222222222226'::uuid)
)
delete from public.shops where owner_id in (select id from demo_ids);

delete from auth.users
where id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '11111111-1111-4111-8111-111111111112'::uuid,
  '11111111-1111-4111-8111-111111111113'::uuid,
  '22222222-2222-4222-8222-222222222221'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  '22222222-2222-4222-8222-222222222223'::uuid,
  '22222222-2222-4222-8222-222222222224'::uuid,
  '22222222-2222-4222-8222-222222222225'::uuid,
  '22222222-2222-4222-8222-222222222226'::uuid
);
