# SQL / RPC test suite

These scripts document the booking and publish invariants that should be verified against a local Supabase stack (preferred) or a disposable staging seed reset.

Docker is currently required for `supabase start`. Until Docker is available on the workstation:

1. Prefer restoring Docker and running `supabase db reset`.
2. Do **not** run destructive fixtures against production.
3. Staging may be used only with the resettable demo seed in `supabase/seed/`.

## Files

| File | Focus |
|---|---|
| `booking_invariants.sql` | Slot availability, double-book, active appointment, shop bookability |
| `barber_publish_settings.sql` | Atomic publish + settings replace expectations |
| `qr_check_in.sql` | QR result codes, timing boundaries, notification idempotency, undo, overdue transitions |
| `qr_check_in_concurrency.sh` | Two-session check-in race and duplicate-notification protection |

## Suggested local flow

```sh
supabase start
supabase db reset
psql "$DATABASE_URL" -f supabase/tests/booking_invariants.sql
psql "$DATABASE_URL" -f supabase/tests/barber_publish_settings.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/qr_check_in.sql
POSTGRES_URL="$DATABASE_URL" bash supabase/tests/qr_check_in_concurrency.sh
```

After migrations pass locally, regenerate the checked-in client types with:

```sh
npx supabase gen types typescript --local --schema public > src/types/database.ts
```

Each script uses `DO $$ … $$` blocks with `RAISE EXCEPTION` on failure so a non-zero psql status indicates a regression.
