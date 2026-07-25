create or replace function public.rate_appointment(target_appointment_id uuid, stars_value smallint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment public.appointments%rowtype;
  existing public.ratings%rowtype;
  rating_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Rating cannot be submitted';
  end if;
  if stars_value < 1 or stars_value > 5 then
    raise exception 'Rating cannot be submitted';
  end if;

  select *
  into appointment
  from public.appointments
  where id = target_appointment_id;

  if not found
    or appointment.customer_id <> auth.uid()
    or appointment.status <> 'completed' then
    raise exception 'Rating cannot be submitted';
  end if;

  select *
  into existing
  from public.ratings
  where appointment_id = appointment.id;

  if found then
    if existing.created_at < now() - interval '24 hours' then
      raise exception 'Rating cannot be edited';
    end if;
    update public.ratings
    set stars = stars_value, updated_at = now()
    where id = existing.id
    returning id into rating_id;
  else
    insert into public.ratings (appointment_id, customer_id, barber_id, stars)
    values (appointment.id, appointment.customer_id, appointment.barber_id, stars_value)
    returning id into rating_id;
  end if;

  return rating_id;
end;
$$;

drop function if exists public.get_public_barber_profile(uuid);

create or replace function public.get_public_barber_profile(barber_id uuid)
returns table (
  id uuid,
  name text,
  bio text,
  city text,
  neighborhood text,
  maps_url text,
  phone text,
  booking_window_days integer,
  average_rating numeric,
  rating_count integer,
  services jsonb,
  weekly_hours jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id,
    profile.name,
    profile.bio,
    profile.city,
    profile.neighborhood,
    profile.maps_url,
    profile.phone,
    profile.booking_window_days,
    coalesce((
      select round(avg(rating.stars)::numeric, 1)
      from public.ratings rating
      where rating.barber_id = profile.id
    ), 0),
    coalesce((
      select count(*)::integer
      from public.ratings rating
      where rating.barber_id = profile.id
    ), 0),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', service.id,
          'name', service.name,
          'price_dzd', service.price_dzd,
          'duration_minutes', service.duration_minutes
        )
        order by service.name
      )
      from public.services service
      where service.barber_id = profile.id and service.is_active
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day_of_week', schedule.day_of_week,
          'starts_at', schedule.starts_at,
          'ends_at', schedule.ends_at
        )
        order by schedule.day_of_week
      )
      from public.weekly_schedules schedule
      where schedule.barber_id = profile.id
    ), '[]'::jsonb)
  from public.profiles profile
  where profile.id = barber_id
    and public.is_independent_published_barber(profile.id);
$$;

revoke all on function public.rate_appointment(uuid, smallint) from public;
grant execute on function public.rate_appointment(uuid, smallint) to authenticated;
grant execute on function public.get_public_barber_profile(uuid) to authenticated;
