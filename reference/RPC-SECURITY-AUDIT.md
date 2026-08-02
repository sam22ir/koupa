# RPC Security Audit

Date: 2026-07-28  
Scope: public SQL functions created by repo migrations, grants, and dispatch posture.

## Method

1. Inventory `create or replace function` / `create function` in `supabase/migrations/`.
2. Confirm each user-callable RPC ends with `revoke all … from public` + `grant execute … to authenticated` (or remains internal).
3. Spot-check ownership / `auth.uid()` guards on write paths.
4. Review push dispatch secret handling.

## Callable by authenticated clients

| Function | Guards | Grants |
|---|---|---|
| `search_published_barbers` | Independent published filter | authenticated |
| `get_public_barber_profile` | Bookable published barber | authenticated |
| `available_booking_slots` | Bookable + schedule math | authenticated |
| `book_appointment` | Customer role, active appointment, slot availability | authenticated |
| `reschedule_appointment` | Customer owns appointment, status booked | authenticated |
| `cancel_customer_appointment` | Customer owns appointment | authenticated |
| `cancel_barber_appointment` | Barber owns appointment | authenticated |
| `mark_appointment_present` | Barber owns appointment | authenticated |
| `barber_today_appointments` | Barber session | authenticated |
| `check_in_with_barber_qr` | Customer + time window | authenticated |
| `rate_appointment` | Customer completed appointment + edit window | authenticated |
| `search_published_shops` / `get_public_shop_profile` | Public shop data | authenticated |
| `create_shop` / `request_join_shop` / `respond_shop_membership` / `leave_shop` / `delete_owned_shop` | Barber + membership rules | authenticated |
| `shop_owner_members` / `shop_owner_barber_settings` / `shop_owner_update_barber_settings` | Shop owner of target | authenticated |
| `invite_barber_to_shop` / `respond_shop_invitation` | Owner / invitee | authenticated |
| `shop_activity_history` | Owner or active member | authenticated |
| `mark_notifications_read` | `auth.uid()` recipient | authenticated |
| `delete_own_account` | `auth.uid()` only | authenticated |
| `publish_barber_profile` | Confirmed email + legal + provisional barber | authenticated |
| `replace_barber_settings` | Profile owner | authenticated |

## Internal / not granted to authenticated

| Function | Notes |
|---|---|
| `apply_barber_settings_payload` | Helper only; `revoke all from public` |
| `booking_slot_is_available` | Internal helper; revoked from public |
| `insert_booking_notification` | Internal helper; revoked from public |
| `transition_overdue_appointments` | Invoked by `pg_cron` only; revoked from public |
| `is_independent_published_barber` / `is_bookable_published_barber` / `barber_shop_id` | Helpers; revoked from public |
| `require_current_legal_acceptance` | Trigger helper |
| `prevent_profile_role_change` / `set_updated_at` | Triggers |

## Search path

Recent write RPCs set `search_path = public`. Historical functions should keep this pattern on future edits.

## Dispatch secret posture (staging)

- Edge Function `dispatch-notifications` uses `verify_jwt = false` and checks header `x-notification-dispatch-secret`.
- Staging `pg_cron` job `koupa-notification-dispatch` calls the function via `net.http_post` every minute.
- Secret is stored in **Vault** as `koupa_notification_dispatch_secret` (not only as a function env var).
- Function env also has `NOTIFICATION_DISPATCH_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `APP_ENV=staging`.
- Production still lacks function + push secrets + vault/cron dispatch job.

## Findings / residual risk

1. **Production schema lag** — missing migrations from `20260726000100` through `20260728000100` (shops owner controls, push columns, activity history, demo cleanup, search enrich, atomic publish/settings). Apply only after review.
2. **Legal documents** — staging and production serve approved active version `2026-07-29`; staging placeholder versions are inactive and historical acceptances remain append-only.
3. **Retired Edge Function** — `appointment-transitions` remains ACTIVE on staging v4 and production v1 while DB cron already runs `transition_overdue_appointments`. Safe to undeploy after ops confirmation; not required for correctness if unused.
4. **No SQL grant drift found** on newly added atomic RPCs; helper `apply_barber_settings_payload` is not executable by `authenticated`/`anon` (verified by structural SQL tests).

## Recommended follow-ups

- [ ] Production `db push` of missing migrations (explicit approval)
- [ ] Production deploy `dispatch-notifications` + vault secret + cron job (mirror staging)
- [ ] Undeploy `appointment-transitions` on both envs after final cron run proof
- [x] Replace staging legal documents with approved active versions
- [x] Apply and verify approved legal versions on production
