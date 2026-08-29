-- Structural checks for typed event destinations. Run after `supabase db reset`.
do $$
declare
  notification_columns text;
  helper_source text;
begin
  select string_agg(column_name, ',') into notification_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name in ('appointment_id', 'destination');

  if notification_columns <> 'appointment_id,destination' and notification_columns <> 'destination,appointment_id' then
    raise exception 'notifications must retain appointment_id and add destination';
  end if;

  select pg_get_functiondef('public.insert_booking_notification(uuid,text,text,uuid)'::regprocedure)
  into helper_source;
  if position('insert_notification' in helper_source) = 0
    or position('appointmentId' in helper_source) = 0 then
    raise exception 'appointment helper must persist a typed destination';
  end if;
end;
$$;

do $$
declare
  function_source text;
begin
  select pg_get_functiondef('public.transition_overdue_appointments()'::regprocedure)
  into function_source;
  if position('destination' in function_source) = 0 then
    raise exception 'overdue transitions must retain an appointment event destination';
  end if;

  select pg_get_functiondef('public.invite_barber_to_shop(uuid,uuid)'::regprocedure)
  into function_source;
  if position('shop_membership' in function_source) = 0
    or position('membershipId' in function_source) = 0 then
    raise exception 'shop invitations must persist their membership event';
  end if;

  select pg_get_functiondef('public.remove_shop_member(uuid)'::regprocedure)
  into function_source;
  if position('shop_activity' in function_source) = 0
    or position('activityId' in function_source) = 0 then
    raise exception 'member removal must persist its activity event';
  end if;
end;
$$;
