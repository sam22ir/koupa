# Staging Demo Data

Run `staging-demo.sql` only against Koupa Staging. It is idempotent and creates published barber listings, shops with active members, schedules, breaks, appointments, ratings, and notifications.

Use any seeded account with password `123456koupa`:

- `demo.explorer@koupa.test`: customer with appointment history and no active booking, for Find and booking.
- `demo.customer@koupa.test`: customer with a confirmed upcoming appointment, for Customer Home and Appointments.
- `demo.barber@koupa.test`: published barber with a live Today appointment.

These accounts and rows are strictly staging data. Do not apply this file to production.
