# Frontend Contract

Stable domain/service surface for the frontend rebuild agent.

## Layers

```
UI screens
  → src/hooks/*          thin React adapters
  → src/services/*       typed Supabase access + mappers
  → src/*.ts             pure helpers (dates, validation, labels)
  → lib/supabase.ts      createClient<Database>
```

## Preferred imports

| Need | Import |
|---|---|
| Session / auth UI state | `useSession` (façade; preferred for screens) |
| Split auth (optional) | `useAuthActions`, `useLegalAcceptance` |
| Booking actions | `useBooking`, `loadCustomerAppointments` |
| Barber settings | `useBarberSettings` |
| Onboarding | `useOnboarding` |
| Shops | `useShops` |
| Managed barber settings | `useManagedBarberSettings` |
| Schedule exceptions | `useScheduleExceptions` |
| Notifications | `useNotifications` |
| Account deletion | `useAccountLifecycle` |
| Push token registration | `usePushRegistration` |
| Pure helpers | `@/src/booking`, `@/src/auth`, `@/src/shops`, … |
| Typed services (non-React) | `@/src/services/*` (`auth`, `booking`, `push`, …) |
| Page size | `SEARCH_PAGE_SIZE` from `@/src/services` |
| Error codes | `AppError`, `AppErrorCode` from `@/src/services/errors` |

## Error handling

Services throw `AppError` with stable codes:

`SLOT_UNAVAILABLE`, `ACTIVE_APPOINTMENT`, `CANCEL_NOT_ALLOWED`, `RESCHEDULE_NOT_ALLOWED`, `CHECKIN_NOT_ALLOWED`, `RATING_NOT_ALLOWED`, `RATING_EDIT_WINDOW`, `VALIDATION`, `LOCATION_REQUIRED`, `INVALID_TIME`, `LEGAL_SAVE_FAILED`, `UNAUTHORIZED`, `NETWORK`, `UNKNOWN`, `FAILED`.

Hooks currently map many of these to legacy UI strings/codes (`failed`, `validation`, `locationRequired`, Arabic booking messages). Prefer switching UI to `AppErrorCode` + i18n dictionaries.

`useSession.legalError` is now the code `LEGAL_SAVE_FAILED` (not Arabic prose).

## Search pagination

- Page size: **20** (`SEARCH_PAGE_SIZE`)
- `useBooking().searchBarbers(query, city?, page?)`
- `useShops().searchShops(query, page?)`
- `useShops().searchBarbers(query, page?)` (invite candidates)
- `useShops().relationship` distinguishes `none`, `request`, `invitation`, and `member`; the facade also exposes `ownedShop`, `membership`, `pendingInvitation`, `pendingRequest`, `pendingRequests`, `members`, `removeMember`, `retry`, and `clearMessage`.
- `useManagedBarberSettings({ barberId, ownerId })` loads and saves the selected member's complete schedule workspace, including archived services and future exceptions, through owner-only RPCs.

`hasMore` heuristic: `items.length === 20`.

## Independent vs bookable barbers

| Surface | Rule |
|---|---|
| Find → Barbers | Independent published barbers only (`is_independent_published_barber`) |
| Find → Shops → barber list / book | Shop-affiliated barbers remain bookable (`is_bookable_published_barber`) |

## Atomic server writes

- Barber publish: `publish_barber_profile` RPC (via `useOnboarding.publishBarber`)
- Barber settings save: `replace_barber_settings` RPC (via `useBarberSettings.save`)
- Shop-owner settings: `shop_owner_update_barber_settings` (shared SQL helper)
- Shop discovery/profile: `search_published_shops_v2`, `get_public_shop_profile_v2`
- Owner member removal: `remove_shop_member`
- Owner workspace: `shop_owner_barber_workspace`, `shop_owner_replace_barber_workspace`

Do not reintroduce multi-table client write loops for these paths.

## Locale / money / time

- Timezone: `Africa/Algiers`
- Currency: DZD integers
- Default UI language: Arabic RTL; English-ready later
- Brand Arabic spelling: `كوپا`

## Out of scope for this contract

Design tokens, routes, components, assets — owned by the frontend rebuild.
