# Push notification delivery

Koupa stores native Android FCM tokens in `device_push_tokens`. The `dispatch-notifications` Edge Function delivers pending rows from `notifications` through Firebase Cloud Messaging and marks successful rows with `push_delivered_at`.

## Deploy to staging

From the repository root:

```sh
supabase functions deploy dispatch-notifications
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  NOTIFICATION_DISPATCH_SECRET="..." \
  APP_ENV="staging" \
  FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

Never commit the service-account JSON or the service-role key. Use the `koupa-staging` Firebase service account and keep production secrets separate.

Invoke the worker from a trusted scheduler once per minute:

```sh
curl -X POST "https://zhdwaizroczkqzwrvfxf.supabase.co/functions/v1/dispatch-notifications" \
  -H "x-notification-dispatch-secret: $NOTIFICATION_DISPATCH_SECRET"
```

Use a managed scheduler for this request. The function is intentionally unauthenticated at the Supabase JWT layer and protected by its private dispatch header so the scheduler does not need a user session.

## Android build requirement

`expo-notifications` now registers the native Android token. The installed build must have Firebase Android credentials configured for the staging or production Firebase project before testing delivery. Expo Go is not sufficient for this path.

Staging messages are prefixed as test notifications. Invalid FCM tokens are removed automatically.
