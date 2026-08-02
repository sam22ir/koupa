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

In-app list still reads `notifications` directly; push is fan-out only.

## Staging (verified 2026-07-28)

| Piece | Status |
|---|---|
| Function | `dispatch-notifications` ACTIVE v5 |
| Secrets | `APP_ENV`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `NOTIFICATION_DISPATCH_SECRET` |
| Vault | `koupa_notification_dispatch_secret` |
| Scheduler | `pg_cron` job `koupa-notification-dispatch` `* * * * *` **active** |
| Appointment transitions | DB cron `koupa-appointment-transitions` **active** (not the Edge Function) |

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

## Production (still open)

Project `hrcwhswzscfbpbllqkri` currently has:

- `appointment-transitions` Edge Function v1 only
- **no** `dispatch-notifications`
- **no** push secrets (`APP_ENV`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `NOTIFICATION_DISPATCH_SECRET`)
- appointment DB cron **is** active
- schema lag: missing migrations `20260726000100` … `20260728000100`

### Production cutover checklist

1. Apply missing migrations after review (`supabase db push` while temporarily linked).
2. Deploy worker:
   ```sh
   supabase link --project-ref hrcwhswzscfbpbllqkri
   supabase functions deploy dispatch-notifications
   supabase secrets set \
     APP_ENV="production" \
     NOTIFICATION_DISPATCH_SECRET="…" \
     FIREBASE_SERVICE_ACCOUNT_JSON='…koupa-prod service account…'
   ```
3. Store the same dispatch secret in Vault as `koupa_notification_dispatch_secret`.
4. Schedule (mirror staging):
   ```sql
   select cron.schedule(
     'koupa-notification-dispatch',
     '* * * * *',
     $$select net.http_post(
       url := 'https://hrcwhswzscfbpbllqkri.supabase.co/functions/v1/dispatch-notifications',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-notification-dispatch-secret',
         (select decrypted_secret from vault.decrypted_secrets where name = 'koupa_notification_dispatch_secret' limit 1)
       ),
       body := '{}'::jsonb,
       timeout_milliseconds := 10000
     )$$
   );
   ```
5. Re-link staging:
   ```sh
   supabase link --project-ref zhdwaizroczkqzwrvfxf
   ```

Never commit service-account JSON or dispatch secrets. Use `koupa-prod` Firebase SA for production only.

## Client registration

- Hook: `usePushRegistration(userId)`
- Service: `src/services/push.ts` → upserts `device_push_tokens`
- Platform: Android device builds only (not Expo Go)
- Staging FCM titles/bodies are prefixed with `【اختبار】` / `【إشعار تجريبي】` inside the Edge Function

## Cleanup

After production cron proof, undeploy retired `appointment-transitions` Edge Function on both projects. Transitions are DB-only per `BOOKING-OPERATIONS.md`.
