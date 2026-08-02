-- Staging-only production-like demo data. Never apply this file to production.
-- Demo password for every seeded account: 123456koupa

-- Reset rows owned by these demo users so the seed remains safe to rerun after cron transitions.
with demo_ids(id) as (values
  ('11111111-1111-4111-8111-111111111111'::uuid), ('11111111-1111-4111-8111-111111111112'::uuid), ('11111111-1111-4111-8111-111111111113'::uuid),
  ('22222222-2222-4222-8222-222222222221'::uuid), ('22222222-2222-4222-8222-222222222222'::uuid), ('22222222-2222-4222-8222-222222222223'::uuid),
  ('22222222-2222-4222-8222-222222222224'::uuid), ('22222222-2222-4222-8222-222222222225'::uuid), ('22222222-2222-4222-8222-222222222226'::uuid)
), demo_appointments as (
  select id from public.appointments where customer_id in (select id from demo_ids) or barber_id in (select id from demo_ids)
)
delete from public.ratings where appointment_id in (select id from demo_appointments);

with demo_ids(id) as (values
  ('11111111-1111-4111-8111-111111111111'::uuid), ('11111111-1111-4111-8111-111111111112'::uuid), ('11111111-1111-4111-8111-111111111113'::uuid),
  ('22222222-2222-4222-8222-222222222221'::uuid), ('22222222-2222-4222-8222-222222222222'::uuid), ('22222222-2222-4222-8222-222222222223'::uuid),
  ('22222222-2222-4222-8222-222222222224'::uuid), ('22222222-2222-4222-8222-222222222225'::uuid), ('22222222-2222-4222-8222-222222222226'::uuid)
), demo_appointments as (
  select id from public.appointments where customer_id in (select id from demo_ids) or barber_id in (select id from demo_ids)
)
delete from public.notifications where user_id in (select id from demo_ids) or appointment_id in (select id from demo_appointments);

with demo_ids(id) as (values
  ('11111111-1111-4111-8111-111111111111'::uuid), ('11111111-1111-4111-8111-111111111112'::uuid), ('11111111-1111-4111-8111-111111111113'::uuid),
  ('22222222-2222-4222-8222-222222222221'::uuid), ('22222222-2222-4222-8222-222222222222'::uuid), ('22222222-2222-4222-8222-222222222223'::uuid),
  ('22222222-2222-4222-8222-222222222224'::uuid), ('22222222-2222-4222-8222-222222222225'::uuid), ('22222222-2222-4222-8222-222222222226'::uuid)
)
delete from public.appointments where customer_id in (select id from demo_ids) or barber_id in (select id from demo_ids);

with demo_ids(id) as (values
  ('22222222-2222-4222-8222-222222222221'::uuid), ('22222222-2222-4222-8222-222222222222'::uuid), ('22222222-2222-4222-8222-222222222223'::uuid),
  ('22222222-2222-4222-8222-222222222224'::uuid), ('22222222-2222-4222-8222-222222222225'::uuid), ('22222222-2222-4222-8222-222222222226'::uuid)
)
delete from public.shop_memberships where barber_id in (select id from demo_ids) or shop_id in (select id from public.shops where owner_id in (select id from demo_ids));

with demo_ids(id) as (values
  ('22222222-2222-4222-8222-222222222221'::uuid), ('22222222-2222-4222-8222-222222222222'::uuid), ('22222222-2222-4222-8222-222222222223'::uuid),
  ('22222222-2222-4222-8222-222222222224'::uuid), ('22222222-2222-4222-8222-222222222225'::uuid), ('22222222-2222-4222-8222-222222222226'::uuid)
)
delete from public.shops where owner_id in (select id from demo_ids);

with demo_users(id, email, role) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'demo.customer@koupa.test', 'customer'),
    ('11111111-1111-4111-8111-111111111112'::uuid, 'demo.explorer@koupa.test', 'customer'),
    ('11111111-1111-4111-8111-111111111113'::uuid, 'demo.today@koupa.test', 'customer'),
    ('22222222-2222-4222-8222-222222222221'::uuid, 'demo.barber@koupa.test', 'barber'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'demo.barber2@koupa.test', 'barber'),
    ('22222222-2222-4222-8222-222222222223'::uuid, 'demo.barber3@koupa.test', 'barber'),
    ('22222222-2222-4222-8222-222222222224'::uuid, 'demo.barber4@koupa.test', 'barber'),
    ('22222222-2222-4222-8222-222222222225'::uuid, 'demo.barber5@koupa.test', 'barber'),
    ('22222222-2222-4222-8222-222222222226'::uuid, 'demo.barber6@koupa.test', 'barber')
)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, crypt('123456koupa', gen_salt('bf', 10)), now(), '', '', '', '', jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')), jsonb_build_object('koupa_role', role, 'koupa_signup_consent', true), now(), now()
from demo_users
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select id, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', email, now(), now(), now()
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'demo.customer@koupa.test'),
  ('11111111-1111-4111-8111-111111111112'::uuid, 'demo.explorer@koupa.test'),
  ('11111111-1111-4111-8111-111111111113'::uuid, 'demo.today@koupa.test'),
  ('22222222-2222-4222-8222-222222222221'::uuid, 'demo.barber@koupa.test'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'demo.barber2@koupa.test'),
  ('22222222-2222-4222-8222-222222222223'::uuid, 'demo.barber3@koupa.test'),
  ('22222222-2222-4222-8222-222222222224'::uuid, 'demo.barber4@koupa.test'),
  ('22222222-2222-4222-8222-222222222225'::uuid, 'demo.barber5@koupa.test'),
  ('22222222-2222-4222-8222-222222222226'::uuid, 'demo.barber6@koupa.test')
) as identities(id, email) on conflict do nothing;

insert into public.legal_acceptances (user_id, document_key, document_version)
select user_id, document.key, document.version
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid), ('11111111-1111-4111-8111-111111111112'::uuid), ('11111111-1111-4111-8111-111111111113'::uuid),
  ('22222222-2222-4222-8222-222222222221'::uuid), ('22222222-2222-4222-8222-222222222222'::uuid), ('22222222-2222-4222-8222-222222222223'::uuid),
  ('22222222-2222-4222-8222-222222222224'::uuid), ('22222222-2222-4222-8222-222222222225'::uuid), ('22222222-2222-4222-8222-222222222226'::uuid)
) users(user_id) cross join public.legal_documents document where document.is_active on conflict do nothing;

insert into public.profiles (id, role, name, phone, bio, city, neighborhood, maps_url, is_published, booking_window_days, minimum_notice_minutes)
values
  ('11111111-1111-4111-8111-111111111111', 'customer', 'ليلى بن عمر', '0555000001', null, null, null, null, false, 7, 0),
  ('11111111-1111-4111-8111-111111111112', 'customer', 'سليم مستكشف', '0555000002', null, null, null, null, false, 7, 0),
  ('11111111-1111-4111-8111-111111111113', 'customer', 'مريم عميلة', '0555000003', null, null, null, null, false, 7, 0),
  ('22222222-2222-4222-8222-222222222221', 'barber', 'أمين للرجال', '0555100001', 'حلاقة عصرية وعناية دقيقة بالتفاصيل.', 'الجزائر', 'حيدرة', 'https://maps.google.com/?q=36.7525,3.0420', true, 7, 30),
  ('22222222-2222-4222-8222-222222222222', 'barber', 'يوسف ستايل', '0555100002', 'قصات كلاسيكية وحديثة لجميع الأعمار.', 'الجزائر', 'باب الزوار', 'https://maps.google.com/?q=36.7200,3.1840', true, 7, 30),
  ('22222222-2222-4222-8222-222222222223', 'barber', 'سامي باربر', '0555100003', 'متخصص في التدرج واللحية.', 'وهران', 'المدينة الجديدة', 'https://maps.google.com/?q=35.6971,-0.6308', true, 7, 30),
  ('22222222-2222-4222-8222-222222222224', 'barber', 'ريان كوت', '0555100004', 'موعدك الخاص لإطلالة مرتبة.', 'قسنطينة', 'المنصورة', 'https://maps.google.com/?q=36.3650,6.6147', true, 7, 30),
  ('22222222-2222-4222-8222-222222222225', 'barber', 'مالك هير', '0555100005', 'خدمات شعر ولحية بأسعار واضحة.', 'سطيف', 'الهضاب', 'https://maps.google.com/?q=36.1911,5.4137', true, 7, 30),
  ('22222222-2222-4222-8222-222222222226', 'barber', 'كرم ستوديو', '0555100006', 'حلاق قريب منك مع مواعيد مرنة.', 'عنابة', 'وسط المدينة', 'https://maps.google.com/?q=36.9000,7.7667', true, 7, 30)
on conflict (id) do update set name = excluded.name, phone = excluded.phone, bio = excluded.bio, city = excluded.city, neighborhood = excluded.neighborhood, maps_url = excluded.maps_url, is_published = excluded.is_published, booking_window_days = excluded.booking_window_days, minimum_notice_minutes = excluded.minimum_notice_minutes;

insert into public.shops (id, owner_id, name, bio, maps_url, average_rating, rating_count)
values
  ('88888888-8888-4888-8888-888888888881', '22222222-2222-4222-8222-222222222221', 'صالون حيدرة للرجال', 'فريق متخصص في القصات العصرية والعناية باللحية.', 'https://maps.google.com/?q=36.7525,3.0420', 4.8, 12),
  ('88888888-8888-4888-8888-888888888882', '22222222-2222-4222-8222-222222222223', 'استوديو المدينة الجديدة', 'حلاقة وتصفيف بخدمة مرنة في قلب وهران.', 'https://maps.google.com/?q=35.6971,-0.6308', 4.6, 8)
on conflict (id) do update set
  owner_id = excluded.owner_id,
  name = excluded.name,
  bio = excluded.bio,
  maps_url = excluded.maps_url,
  average_rating = excluded.average_rating,
  rating_count = excluded.rating_count;

insert into public.shop_memberships (id, shop_id, barber_id, status, invited_by)
values
  ('99999999-9999-4999-8999-999999999991', '88888888-8888-4888-8888-888888888881', '22222222-2222-4222-8222-222222222222', 'active', '22222222-2222-4222-8222-222222222221'),
  ('99999999-9999-4999-8999-999999999992', '88888888-8888-4888-8888-888888888881', '22222222-2222-4222-8222-222222222224', 'active', '22222222-2222-4222-8222-222222222221'),
  ('99999999-9999-4999-8999-999999999993', '88888888-8888-4888-8888-888888888882', '22222222-2222-4222-8222-222222222225', 'active', '22222222-2222-4222-8222-222222222223'),
  ('99999999-9999-4999-8999-999999999994', '88888888-8888-4888-8888-888888888882', '22222222-2222-4222-8222-222222222226', 'active', '22222222-2222-4222-8222-222222222223')
on conflict (id) do update set
  shop_id = excluded.shop_id,
  barber_id = excluded.barber_id,
  status = excluded.status,
  invited_by = excluded.invited_by;

insert into public.services (id, barber_id, name, price_dzd, duration_minutes)
values
  ('33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222221', 'حلاقة شعر', 600, 30),
  ('33333333-3333-4333-8333-333333333332', '22222222-2222-4222-8222-222222222221', 'حلاقة ولحية', 900, 45),
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'حلاقة كلاسيكية', 500, 30),
  ('33333333-3333-4333-8333-333333333334', '22222222-2222-4222-8222-222222222222', 'عناية كاملة', 1200, 60),
  ('33333333-3333-4333-8333-333333333335', '22222222-2222-4222-8222-222222222223', 'تدرج احترافي', 800, 45),
  ('33333333-3333-4333-8333-333333333336', '22222222-2222-4222-8222-222222222224', 'قص وتصفيف', 700, 40),
  ('33333333-3333-4333-8333-333333333337', '22222222-2222-4222-8222-222222222225', 'حلاقة سريعة', 450, 20),
  ('33333333-3333-4333-8333-333333333338', '22222222-2222-4222-8222-222222222226', 'حلاقة ولحية مميزة', 1000, 60)
on conflict (id) do update set name = excluded.name, price_dzd = excluded.price_dzd, duration_minutes = excluded.duration_minutes, is_active = true;

insert into public.weekly_schedules (barber_id, day_of_week, starts_at, ends_at, interval_minutes)
select barber_id, day_of_week, time '09:00', time '18:00', 30
from unnest(array['22222222-2222-4222-8222-222222222221'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, '22222222-2222-4222-8222-222222222223'::uuid, '22222222-2222-4222-8222-222222222224'::uuid, '22222222-2222-4222-8222-222222222225'::uuid, '22222222-2222-4222-8222-222222222226'::uuid]) barber(barber_id)
cross join generate_series(0, 6) day(day_of_week)
on conflict (barber_id, day_of_week) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, interval_minutes = excluded.interval_minutes;

insert into public.schedule_breaks (id, schedule_id, starts_at, ends_at)
select '44444444-4444-4444-8444-444444444441', id, time '13:00', time '14:00' from public.weekly_schedules where barber_id = '22222222-2222-4222-8222-222222222221' and day_of_week = 1
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at;

insert into public.appointments (id, customer_id, barber_id, service_id, starts_at, ends_at, price_dzd, status, cancelled_at)
values
  ('55555555-5555-4555-8555-555555555551', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333331', now() + interval '30 minutes', now() + interval '75 minutes', 600, 'booked', null),
  ('55555555-5555-4555-8555-555555555552', '11111111-1111-4111-8111-111111111113', '22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333332', ((now() at time zone 'Africa/Algiers')::date + 1 + time '10:00') at time zone 'Africa/Algiers', ((now() at time zone 'Africa/Algiers')::date + 1 + time '10:45') at time zone 'Africa/Algiers', 900, 'booked', null),
  ('55555555-5555-4555-8555-555555555553', '11111111-1111-4111-8111-111111111112', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', now() - interval '5 days', now() - interval '4 days 23 hours 30 minutes', 500, 'completed', null),
  ('55555555-5555-4555-8555-555555555554', '11111111-1111-4111-8111-111111111112', '22222222-2222-4222-8222-222222222223', '33333333-3333-4333-8333-333333333335', now() - interval '2 days', now() - interval '2 days' + interval '45 minutes', 800, 'cancelled', now() - interval '3 days')
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, price_dzd = excluded.price_dzd, status = excluded.status, cancelled_at = excluded.cancelled_at;

insert into public.ratings (id, appointment_id, customer_id, barber_id, stars)
values ('66666666-6666-4666-8666-666666666661', '55555555-5555-4555-8555-555555555553', '11111111-1111-4111-8111-111111111112', '22222222-2222-4222-8222-222222222222', 5)
on conflict (id) do update set stars = excluded.stars;

insert into public.notifications (id, user_id, title, body, appointment_id)
values
  ('77777777-7777-4777-8777-777777777771', '11111111-1111-4111-8111-111111111111', 'تم تأكيد موعدك', 'موعدك غداً الساعة 10:00.', '55555555-5555-4555-8555-555555555551'),
  ('77777777-7777-4777-8777-777777777772', '22222222-2222-4222-8222-222222222221', 'موعد اليوم', 'لديك عميلة بانتظار تأكيد الحضور.', '55555555-5555-4555-8555-555555555551')
on conflict (id) do update set title = excluded.title, body = excluded.body;
