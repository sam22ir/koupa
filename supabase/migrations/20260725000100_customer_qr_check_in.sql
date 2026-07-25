create or replace function public.check_in_with_barber_qr(target_barber_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment public.appointments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Appointment cannot be checked in';
  end if;

  select appointment_row.*
  into appointment
  from public.appointments as appointment_row
  where appointment_row.customer_id = auth.uid()
    and appointment_row.barber_id = target_barber_id
    and appointment_row.status = 'booked'
    and (appointment_row.starts_at at time zone 'Africa/Algiers')::date = (now() at time zone 'Africa/Algiers')::date
    and appointment_row.ends_at > now()
  order by appointment_row.starts_at
  limit 1;

  if not found then
    raise exception 'Appointment cannot be checked in';
  end if;

  update public.appointments
  set status = 'present', qr_checked_in_at = now(), updated_at = now()
  where id = appointment.id;

  perform public.insert_booking_notification(
    appointment.customer_id,
    'تم تأكيد حضورك',
    'تم تسجيل حضورك للموعد.',
    appointment.id
  );
  perform public.insert_booking_notification(
    appointment.barber_id,
    'تم تسجيل حضور عميل',
    'قام العميل بمسح رمز الحضور.',
    appointment.id
  );

  return appointment.id;
end;
$$;

revoke all on function public.check_in_with_barber_qr(uuid) from public;
grant execute on function public.check_in_with_barber_qr(uuid) to authenticated;
