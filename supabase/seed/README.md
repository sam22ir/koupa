# Staging Demo Data

Run `staging-demo.sql` only against Koupa Staging. It is idempotent and creates production-like independent barber listings, schedules, breaks, appointments, ratings, and notifications.

Use any seeded account with password `KoupaDemo2026!`:

- `demo.explorer@koupa.test`: customer with appointment history and no active booking, for Find and booking.
- `demo.customer@koupa.test`: customer with a confirmed upcoming appointment, for Customer Home and Appointments.
- `demo.barber@koupa.test`: published barber with a live Today appointment.

These accounts and rows are strictly staging data. Do not apply this file to production.
