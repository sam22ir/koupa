# Push Notifications

Koupa stores native Android FCM tokens in `device_push_tokens`. The `dispatch-notifications` Edge Function delivers pending rows from `notifications` through Firebase Cloud Messaging and marks successful rows with `push_delivered_at`.

## Architecture

```
notifications row inserted (booking/shop/lifecycle)
        │
        ▼
pg_cron job koupa-notification-dispatch (* * * * *)
        │  net.http_post + Vault secret header
        ▼
Edge Function dispatch-notifications (verify_jwt = false)
        │  FIREBASE_SERVICE_ACCOUNT_JSON
        ▼
FCM HTTP v1 → device_push_tokens for that user/environment
```

In-app list still reads `notifications` directly; push is fan-out only. Each FCM
payload includes `notification_id`, legacy `appointment_id`, and serialized typed
`destination` metadata. The Android client resolves that destination through the same
allowlisted event router used by the in-app inbox; it never accepts a route string from
the payload.

## Staging (CLI verified 2026-08-18)

| Piece | Status |
|---|---|
| Function | `dispatch-notifications` ACTIVE **v6** (redeployed 2026-08-18; destination-aware) |
| Phone alias | `sign-in-with-phone` ACTIVE v1 |
| Secrets | `APP_ENV`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `NOTIFICATION_DISPATCH_SECRET` |
| Vault | `koupa_notification_dispatch_secret` (historical name; cron active) |
| Scheduler | `pg_cron` job `koupa-notification-dispatch` `* * * * *` **active** |
| Appointment transitions | DB cron `koupa-appointment-transitions` **active** (recent runs succeeded) |
| Schema | Through `20260818000100` (notification destinations + phone unique index) |

Manual invoke (optional):

```sh
curl -X POST "https://zhdwaizroczkqzwrvfxf.supabase.co/functions/v1/dispatch-notifications" \
  -H "x-notification-dispatch-secret: $NOTIFICATION_DISPATCH_SECRET"
```

Deploy / refresh staging worker:

```sh
supabase link --project-ref zhdwaizroczkqzwrvfxf
supabase functions deploy dispatch-notifications
# secrets already present; only set when rotating
```

## Production (CLI verified 2026-08-18)

Project `hrcwhswzscfbpbllqkri`:

| Piece | Status |
|---|---|
| Function | `dispatch-notifications` ACTIVE **v3** (redeployed 2026-08-18) |
| Phone alias | `sign-in-with-phone` ACTIVE v1 (deployed 2026-08-18) |
| Secrets | `APP_ENV`, `NOTIFICATION_DISPATCH_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON` present (SA set 2026-08-18) |
| Scheduler | `koupa-notification-dispatch` **active** · `koupa-appointment-transitions` **active** |
| Schema | Through `20260818000100` |

Push delivery on production still fails closed until the Firebase service-account secret is set. Function + cron already exist.

### Where to get `FIREBASE_SERVICE_ACCOUNT_JSON` (`koupa-prod`)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **`koupa-prod`**.
2. Gear icon → **Project settings** → **Service accounts**.
3. Confirm **Firebase Admin SDK** is selected.
4. Click **Generate new private key** → confirm → download the JSON file.
5. That file is the value for `FIREBASE_SERVICE_ACCOUNT_JSON` (minify to one line when setting via CLI).

Do **not** use `koupa-dev` or `koupa-staging` keys on production. Never commit the JSON.

Set it:

```sh
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$(cat /path/to/koupa-prod-sa.json)" \
  --project-ref hrcwhswzscfbpbllqkri
```

Do **not** rotate `NOTIFICATION_DISPATCH_SECRET` unless you also update Vault to the same value (cron reads Vault).

Smoke after setting:

```sh
curl -X POST "https://hrcwhswzscfbpbllqkri.supabase.co/functions/v1/dispatch-notifications" \
  -H "x-notification-dispatch-secret: $NOTIFICATION_DISPATCH_SECRET"
```

Expect HTTP 200 with `processed` / `delivered` / `failed`, not `Notification worker is not configured`.

Then re-link staging:

```sh
supabase link --project-ref zhdwaizroczkqzwrvfxf
```

## Client registration

- Hook: `usePushRegistration(userId)`
- Service: `src/services/push.ts` → upserts `device_push_tokens`
- Platform: Android device builds only (not Expo Go)
- Staging FCM titles/bodies are prefixed with `【اختبار】` / `【إشعار تجريبي】` inside the Edge Function

## Cleanup

Retired `appointment-transitions` Edge Function was undeployed from staging and production on 2026-08-18 after cron run proof. Transitions remain DB-only per `BOOKING-OPERATIONS.md`.

## Setting up an environment (staging or production)

The dispatch job only works when all four of these exist in the same project. The cron job and the vault secret are created by hand, not by a migration, so check them whenever a project is created or restored.

1. **`pg_net` extension** — installed by migration `20260930000300_enable_pg_net.sql`. Without it the job fails every minute with `schema "net" does not exist`.
2. **Edge secret `NOTIFICATION_DISPATCH_SECRET`** and **vault secret `koupa_notification_dispatch_secret`** — the two must hold the *same* value. Generate one random value per environment and set both. Never reuse it across environments, and never commit it.
3. **The cron job** `koupa-notification-dispatch` (`* * * * *`) that calls `net.http_post` on `<project-url>/functions/v1/dispatch-notifications` with the `x-notification-dispatch-secret` header read from the vault.
4. **The deployed function** `dispatch-notifications`.

The function reads the secret once when it starts, so after changing it the job may get `401` for a minute or two until a fresh worker starts.

Verify (run against the project you changed):

```sql
select status, return_message, start_time
from cron.job_run_details d join cron.job j using (jobid)
where j.jobname = 'koupa-notification-dispatch'
order by start_time desc limit 5;

select status_code, content, created from net._http_response order by created desc limit 5;
```

Healthy output is `succeeded` runs and HTTP `200` with `{"processed":…,"delivered":…,"failed":…}`. A `401` means the two secrets differ; `schema "net" does not exist` means step 1 is missing.
