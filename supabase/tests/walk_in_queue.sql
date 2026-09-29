-- Walk-in queue rules. Runs against the resettable demo seed (staging or a local
-- reset) and rolls everything back: the last statement raises, so no data changes.
-- Needs at least one published barber with an active service and two customers
-- with confirmed emails.
--
--   supabase db query --linked -f supabase/tests/walk_in_queue.sql
--   (or: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/walk_in_queue.sql)

do $$
declare
  barber uuid;
  service uuid;
  customer1 uuid;
  customer2 uuid;
  walkin uuid;
  entry1 uuid;
  entry2 uuid;
  info jsonb;
  failed boolean;
  filler integer;

begin
  select profile.id, svc.id into barber, service
  from public.profiles profile
  join public.services svc on svc.barber_id = profile.id and svc.is_active
  where profile.role = 'barber' and profile.is_published
  order by profile.id limit 1;
  select p.id into customer1
  from public.profiles p join auth.users u on u.id = p.id
  where p.role = 'customer' and u.email_confirmed_at is not null order by p.id limit 1;
  select p.id into customer2
  from public.profiles p join auth.users u on u.id = p.id
  where p.role = 'customer' and u.email_confirmed_at is not null and p.id <> customer1 order by p.id limit 1;
  assert barber is not null and service is not null, 'fixture: published barber with a service';
  assert customer1 is not null and customer2 is not null, 'fixture: two confirmed customers';

  delete from public.queue_entries where barber_id = barber or customer_id in (customer1, customer2);

  -- A closed queue accepts neither remote joins nor walk-ins.
  perform set_config('request.jwt.claim.sub', customer1::text, true);
  failed := false;
  begin perform public.join_queue(barber, service); exception when others then failed := sqlerrm = 'Queue is closed'; end;
  assert failed, 'closed queue refuses remote joins';

  -- Barber opens the queue and adds a walk-in.
  perform set_config('request.jwt.claim.sub', barber::text, true);
  failed := false;
  begin perform public.add_walkin('سمير', service); exception when others then failed := sqlerrm = 'Queue is closed'; end;
  assert failed, 'closed queue refuses walk-ins';
  perform public.set_queue_open(true);
  assert (select queue_open from public.profiles where id = barber), 'queue opens';
  walkin := public.add_walkin('  سمير  ', service);
  assert (select guest_name from public.queue_entries where id = walkin) = 'سمير', 'walk-in name is trimmed';
  failed := false;
  begin perform public.add_walkin('   ', service); exception when others then failed := true; end;
  assert failed, 'blank walk-in name is refused';

  -- Customers join behind the walk-in; position and count are derived.
  perform set_config('request.jwt.claim.sub', customer1::text, true);
  entry1 := public.join_queue(barber, service);
  info := public.get_my_queue_entry();
  assert (info->>'position')::int = 2 and (info->>'waiting_count')::int = 2, 'second in line behind the walk-in';
  failed := false;
  begin perform public.join_queue(barber, service); exception when others then failed := sqlerrm = 'You are already in a queue'; end;
  assert failed, 'one active entry per customer';

  perform set_config('request.jwt.claim.sub', customer2::text, true);
  entry2 := public.join_queue(barber, service);
  assert (public.get_my_queue_entry()->>'position')::int = 3, 'third in line';
  assert (select waiting_count from public.get_public_queue_status(barber)) = 3, 'public count';
  assert (select queue_open from public.get_public_queue_status(barber)), 'public open flag';

  -- Only the barber reads the names; a customer cannot drive the queue.
  failed := false;
  begin perform public.update_queue_entry(entry1, 'call'); exception when others then failed := true; end;
  assert failed, 'a customer cannot call entries';
  failed := false;
  begin perform public.get_barber_queue(); exception when others then failed := true; end;
  assert failed, 'a customer cannot read the barber queue';

  -- Serving order and the one-at-a-time rule.
  perform set_config('request.jwt.claim.sub', barber::text, true);
  info := public.get_barber_queue();
  assert jsonb_array_length(info->'entries') = 3, 'three active entries';
  assert (info->'entries'->0->>'id')::uuid = walkin, 'walk-in is first';
  perform public.update_queue_entry(walkin, 'start');
  failed := false;
  begin perform public.update_queue_entry(entry1, 'start'); exception when others then failed := true; end;
  assert failed, 'only one customer in the chair';
  failed := false;
  begin perform public.update_queue_entry(walkin, 'call'); exception when others then failed := true; end;
  assert failed, 'a serving entry cannot be called';

  -- Calling notifies the remote customer and starts the grace timer.
  perform public.update_queue_entry(entry1, 'call');
  assert (select status from public.queue_entries where id = entry1) = 'called', 'called';
  assert exists (
    select 1 from public.notifications
    where user_id = customer1 and title = 'حان دورك' and destination->>'kind' = 'queue'
  ), 'call notification with a queue destination';
  failed := false;
  begin perform public.update_queue_entry(walkin, 'call'); exception when others then failed := true; end;
  assert failed, 'walk-ins are never called';

  -- Called and not arrived: the grace period turns the entry into a no-show.
  update public.queue_entries set called_at = now() - interval '11 minutes' where id = entry1;
  perform public.queue_maintenance(barber);
  assert (select status from public.queue_entries where id = entry1) = 'no_show', 'grace period expires';
  assert exists (
    select 1 from public.notifications where user_id = customer2 and title = 'أنت التالي في الطابور'
  ), 'the next customer is told they are next';
  perform public.update_queue_entry(walkin, 'finish');
  assert (select status from public.queue_entries where id = walkin) = 'done', 'finished';

  -- Leaving, removal, and waiting entries older than 12 hours.
  perform set_config('request.jwt.claim.sub', customer2::text, true);
  perform public.leave_queue(entry2);
  assert (select status from public.queue_entries where id = entry2) = 'left', 'customer leaves';
  assert public.get_my_queue_entry() is null, 'no active entry after leaving';
  failed := false;
  begin perform public.leave_queue(entry2); exception when others then failed := true; end;
  assert failed, 'cannot leave twice';

  perform set_config('request.jwt.claim.sub', customer1::text, true);
  entry1 := public.join_queue(barber, service);
  update public.queue_entries set joined_at = now() - interval '13 hours' where id = entry1;
  perform public.queue_maintenance(barber);
  assert (select status from public.queue_entries where id = entry1) = 'left', 'stale waiting entries expire';

  perform set_config('request.jwt.claim.sub', barber::text, true);
  entry2 := public.add_walkin('علي', service);
  perform public.update_queue_entry(entry2, 'remove');
  assert (select status from public.queue_entries where id = entry2) = 'removed', 'barber removes an entry';

  -- The cap.
  for filler in 1..public.queue_max_active() loop
    insert into public.queue_entries (barber_id, guest_name, service_id, source)
    values (barber, 'زبون ' || filler, service, 'barber');
  end loop;
  failed := false;
  begin perform public.add_walkin('زائد', service); exception when others then failed := sqlerrm = 'The queue is full'; end;
  assert failed, 'walk-ins stop at the cap';
  perform set_config('request.jwt.claim.sub', customer1::text, true);
  failed := false;
  begin perform public.join_queue(barber, service); exception when others then failed := sqlerrm = 'The queue is full'; end;
  assert failed, 'remote joins stop at the cap';

  -- Closing keeps the line but blocks new joins.
  delete from public.queue_entries where barber_id = barber;
  perform set_config('request.jwt.claim.sub', barber::text, true);
  perform public.set_queue_open(false);
  perform set_config('request.jwt.claim.sub', customer1::text, true);
  failed := false;
  begin perform public.join_queue(barber, service); exception when others then failed := sqlerrm = 'Queue is closed'; end;
  assert failed, 'closed again';

  -- Guests may read the public status but nothing else.
  assert has_function_privilege('anon', 'public.get_public_queue_status(uuid)', 'execute'), 'anon sees public status';
  assert not has_function_privilege('anon', 'public.join_queue(uuid, uuid)', 'execute'), 'anon cannot join';
  assert not has_function_privilege('anon', 'public.get_barber_queue()', 'execute'), 'anon cannot read the queue';
  assert not has_function_privilege('anon', 'public.queue_maintenance(uuid)', 'execute'), 'anon cannot run maintenance';
  assert not has_table_privilege('authenticated', 'public.queue_entries', 'select'), 'no direct table reads';

  -- Deleting an account cleans up the queue. A customer in line simply leaves it.
  perform set_config('request.jwt.claim.sub', barber::text, true);
  perform public.set_queue_open(true);
  perform set_config('request.jwt.claim.sub', customer2::text, true);
  entry2 := public.join_queue(barber, service);
  perform public.delete_own_account();
  assert not exists (select 1 from public.queue_entries where customer_id = customer2), 'a deleted customer leaves the queue';

  -- A barber who deletes their account closes the line and tells the waiting customers.
  perform set_config('request.jwt.claim.sub', customer1::text, true);
  entry1 := public.join_queue(barber, service);
  perform set_config('request.jwt.claim.sub', barber::text, true);
  perform public.delete_own_account();
  assert not exists (select 1 from public.queue_entries where barber_id = barber), 'a deleted barber has no queue entries';
  -- The profile is gone (no history) or kept anonymized (history); either way the queue is closed.
  assert not exists (select 1 from public.profiles where id = barber and queue_open), 'a deleted barber has a closed queue';
  assert exists (
    select 1 from public.notifications where user_id = customer1 and title = 'تم إغلاق الطابور'
  ), 'waiting customers are told the queue closed';

  -- Roll everything back.
  raise exception 'WALK-IN QUEUE OK (rolled back)';
end
$$;
