# Koupa Backend & Domain Improvement Plan

Living plan for every fix and enhancement identified in the domain/service layer.
Frontend rebuild is owned by another agent — this plan **does not** redesign UI, routes, or design tokens.
It **does** harden the contract the new frontend will consume.

Last successful live CLI verification: **2026-08-18** (CLI `2.110.0`, staging linked).
Migrations, functions, secrets inventory, and cron job queries succeeded on staging and production.

---

## 0. Environment snapshot (last successful CLI audit)

### Supabase CLI

| Item | Value |
|---|---|
| Installed | `2.110.0` (`~/.local/bin`; older `2.90.0` may remain under `/usr/local`) |
| Linked project | **Koupa Staging** `zhdwaizroczkqzwrvfxf` (West EU) |
| Production project | **Koupa Production** `hrcwhswzscfbpbllqkri` (West EU, not currently linked) |
| Local Docker | **Not available** (`docker` missing / daemon inactive) — local `supabase start` blocked |
| Staging migrations | In sync through `20260818000100` (verified 2026-08-18) |
| Production migrations | In sync through `20260818000100` (verified 2026-08-18) |
| Staging functions | `dispatch-notifications` ACTIVE v6 · `sign-in-with-phone` ACTIVE v1 |
| Production functions | `dispatch-notifications` ACTIVE v3 · `sign-in-with-phone` ACTIVE v1 |
| Staging secrets | `APP_ENV`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `NOTIFICATION_DISPATCH_SECRET`, plus platform keys |
| Production secrets | `APP_ENV`, `NOTIFICATION_DISPATCH_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, plus platform keys (SA set 2026-08-18) |
| Staging cron | `koupa-appointment-transitions` + `koupa-notification-dispatch` both active (runs succeeded 2026-08-18) |
| Production cron | `koupa-appointment-transitions` + `koupa-notification-dispatch` both active (runs succeeded 2026-08-18) |
| Current working-tree migrations | Through `20260818000100_phone_sign_in_alias.sql` |
| `config.toml` | `dispatch-notifications` + `sign-in-with-phone` with `verify_jwt = false` |

### Firebase CLI

| Item | Value |
|---|---|
| Installed | `15.24.0` |
| Projects | `koupa-dev`, `koupa-staging`, `koupa-prod` (all present) |
| Android apps | One “Koupa” Android app per project |
| Repo Firebase config | **No** `firebase.json` / `.firebaserc` (client SDK + Edge Function SA only — intentional for MVP) |
| Google services files | `google-services.staging.json`, `google-services.production.json` present locally; no dedicated dev file |

### Product implication of CLI state

1. Staging push worker and both cron jobs are active; appointment-transition runs succeeded on 2026-08-18.
2. Production schema, dispatch function, phone function, cron jobs, and `FIREBASE_SERVICE_ACCOUNT_JSON` are present (SA set 2026-08-18). Remaining gate is a real Android device delivery check.
3. Retired `appointment-transitions` Edge Function was undeployed from staging and production on 2026-08-18 after cron proof; transitions remain DB-only.
4. Without Docker, **local migration dry-runs and local typegen from a local DB are blocked**. Use linked staging for typegen and SQL smoke tests until Docker is restored.

---

## 1. Goals

1. Make the domain/service layer the **stable API** for the frontend rewrite.
2. Eliminate **non-atomic multi-write** client paths.
3. Type the Supabase surface end-to-end.
4. Test **real booking/shop invariants** (not only pure helpers).
5. Finish **release hygiene** (push, legal URLs, OAuth, prod parity).
6. Keep frontend work unblocked: **no breaking hook contracts without a deprecation window**.

### Non-goals

- Redesign screens, tokens, navigation, or assets.
- Rebuild customer/barber shells.
- SMS OTP / multi-country expansion.
- Uploaded profile photos.

---

## 2. Target architecture

```
app/ / components/ / features/     ← frontend agent (out of scope here)
                │
                ▼
src/hooks/*                         ← thin React adapters (loading/error/state)
                │
                ▼
src/services/*                      ← typed Supabase calls, mapping, error codes
                │
                ▼
src/domain/* (or keep src/*.ts)     ← pure helpers (auth, booking dates, validation)
                │
                ▼
lib/supabase.ts  +  src/types/database.ts
                │
                ▼
Supabase RPCs / RLS / pg_cron / Edge Functions / FCM
```

### Public contract for the frontend agent

Stable entrypoints after this plan:

| Area | Hook / service | Notes |
|---|---|---|
| Session / auth | `useSession` → `authService` + `legalService` | Same external fields where possible |
| Booking | `useBooking` + `loadCustomerAppointments` | Add pagination args; keep names |
| Barber settings | `useBarberSettings` | Internally call `replace_barber_settings` RPC |
| Onboarding | `useOnboarding` | Internally call `publish_barber_profile` RPC |
| Shops | split hooks or namespaced return | Prefer additive split |
| Notifications / push / lifecycle | existing hooks | Minor only |

---

## 3. Workstreams overview

| ID | Workstream | Priority | Depends on | Est. effort |
|---|---|---|---|---|
| **W0** | Tooling & environment readiness | P0 | — | 0.5–1 d |
| **W1** | Generated DB types + typed client | P0 | W0 | 0.5–1 d |
| **W2** | Atomic RPCs for multi-write paths | P0 | W1 | 1.5–2 d |
| **W3** | Service layer extraction | P0 | W1 | 1.5–2 d |
| **W4** | Hook thinning & API cleanup | P1 | W2, W3 | 1–1.5 d |
| **W5** | Errors, i18n keys, mappers | P1 | W3 | 0.5–1 d |
| **W6** | Test pyramid (SQL + services) | P0 | W2 | 1.5–2 d |
| **W7** | Search pagination & query API | P2 | W3 | 0.5 d |
| **W8** | Security / RPC audit | P1 | W2 | 0.5–1 d |
| **W9** | Repo hygiene & CI | P1 | W0 | 0.5 d |
| **W10** | Push delivery finish (staging scheduler + prod) | P0 | — | 0.5–1 d |
| **W11** | Auth/legal/release hygiene | P0 | — | 0.5–1 d |
| **W12** | Docs sync + frontend contract note | P1 | W4 | 0.5 d |

**Recommended calendar:** ~8–12 focused engineering days if sequential; ~5–7 days if W10/W11 run parallel with W1–W3.

---

## 4. Detailed plan by workstream

### W0 — Tooling & environment readiness

**Why:** Typegen, migration dry-run, and SQL tests need a reliable path. Staging is already linked; Docker is down.

**Tasks**

1. Upgrade Supabase CLI to latest (`2.110.0+`) so typegen/flags match docs.
2. Decide local DB strategy (pick one and document in `AGENTS.md`):
   - **Preferred:** restore Docker and `supabase start` for local migrations + tests.
   - **Fallback:** use linked staging for `supabase gen types --linked` and restricted SQL smoke queries; never use production for experiments.
3. Add Firebase project aliases without forcing a full Firebase Functions project:
   ```sh
   # optional convenience; only if you want CLI project switching
   firebase use --add   # koupa-staging, koupa-prod, koupa-dev
   ```
   Or skip and always pass `--project koupa-staging|koupa-prod|koupa-dev`.
4. Document production link procedure (do **not** leave prod permanently linked):
   ```sh
   supabase link --project-ref hrcwhswzscfbpbllqkri
   supabase migration list
   supabase link --project-ref zhdwaizroczkqzwrvfxf   # re-link staging
   ```
5. Confirm production migration parity (explicit checklist item in W11).
6. Confirm pg_cron job exists on staging (and later production):
   ```sql
   select jobid, jobname, schedule, active
   from cron.job
   where jobname = 'koupa-appointment-transitions';
   ```
7. Inventory retired `appointment-transitions` Edge Function: after cron verified on both envs, undeploy/disable and update docs.

**Exit criteria**

- [ ] CLI upgraded
- [ ] Written procedure for local vs linked typegen
- [ ] Staging cron verified active
- [ ] Production migration list reviewed

**CLI commands**

```sh
# upgrade path depends on how CLI was installed; example:
# npm i -g supabase@latest   OR reinstall from official binary

supabase --version
supabase projects list
supabase migration list
supabase functions list
supabase secrets list
firebase projects:list
firebase apps:list --project koupa-staging
firebase apps:list --project koupa-prod
```

---

### W1 — Generated database types + typed client

**Why:** Hooks currently force `as never` / `as any` on almost every RPC and join.

**Tasks**

1. Generate types from **linked staging** (schema already in sync):
   ```sh
   supabase gen types typescript --linked --schema public > src/types/database.ts
   ```
2. Wire client:
   ```ts
   // lib/supabase.ts
   import type { Database } from '@/src/types/database';
   export const supabase = createClient<Database>(clientUrl, clientKey, { … });
   ```
3. Add regen script to `package.json`:
   ```json
   "db:types": "supabase gen types typescript --linked --schema public > src/types/database.ts"
   ```
4. Replace RPC `as never` casts in hooks/services with typed calls.
5. Replace join mappers’ `any` with typed row helpers or narrow interfaces.
6. Add `src/types/database.ts` to repo **or** generate in CI; prefer committed generated file for frontend-agent stability, plus regen script.
7. Add CI check option later: fail if generated types differ (optional stretch).

**Files**

- New: `src/types/database.ts`
- Edit: `lib/supabase.ts`, all `src/hooks/*`, later `src/services/*`
- Edit: `package.json`, `tsconfig.json` if needed

**Exit criteria**

- [ ] `npm run typecheck` clean with typed client
- [ ] No `as never` on `supabase.rpc(...)`
- [ ] Documented regen command in `AGENTS.md`

**Risk**

- Generated file is large; avoid hand-edits. Always regen after migrations.

---

### W2 — Atomic RPCs for multi-write paths

**Why:** Client multi-step writes can leave corrupt state.

#### W2.1 `publish_barber_profile`

**Current risk:** `useOnboarding.publishBarber` does:

`profiles.insert` → `services.insert` → `weekly_schedules.insert` → `schedule_breaks.insert` → `onboarding_drafts.delete`

**New RPC (security definer)**

```
publish_barber_profile(payload jsonb) returns void | profile row
```

Server responsibilities:

- `auth.uid()` required
- Enforce existing gates (confirmed email, legal acceptances, provisional role barber)
- Reject if incompatible profile already exists (same rules as current client)
- Insert profile, services, schedules, breaks in **one transaction**
- Delete onboarding draft
- Validate intervals (5/10/15/30), durations (%5), location requirement

**Client change:** `publishBarber` becomes single `supabase.rpc('publish_barber_profile', { payload })`.

#### W2.2 `replace_barber_settings`

**Current risk:** `useBarberSettings.save` deactivates services, mutates services, **deletes all schedules/breaks**, reinserts, then updates profile. Failure mid-way can wipe hours.

**New RPC**

```
replace_barber_settings(settings jsonb) returns void
```

Server responsibilities:

- Caller must own profile (`auth.uid()`) **or** be active shop owner of that barber — prefer two RPCs if ownership rules differ:
  - `replace_barber_settings` (self)
  - Keep / align `shop_owner_update_barber_settings` (already exists) so both paths share a private SQL helper
- Soft-deactivate removed services
- Upsert services
- Replace schedules/breaks atomically
- Update pause / window / notice / interval
- Emit notifications/activity if owner path (already intended)

**Client change:** `useBarberSettings.save` and owner path both call RPC only.

#### W2.3 Optional follow-ups (same pattern)

| Candidate | Why |
|---|---|
| Customer profile create | Small; currently single insert — low urgency |
| Schedule exceptions batch | If UI starts multi-save |

**Migration naming**

```
supabase/migrations/20260729000100_publish_barber_profile.sql
supabase/migrations/20260729000200_replace_barber_settings.sql
```

(Use real timestamps at implementation time.)

**Deploy order**

1. Write migration + SQL tests (W6)
2. Apply to local (if Docker) or staging:
   ```sh
   supabase db push   # against linked staging after review
   ```
3. Switch client to RPC
4. Production only after staging soak + frontend still green

**Exit criteria**

- [ ] No multi-table write loops left in `useOnboarding` / `useBarberSettings`
- [ ] Staging applied; smoke publish + save settings works
- [ ] Partial failure cannot delete schedules without replacement

---

### W3 — Service layer extraction

**Why:** Hooks are 200–400 LOC and mix React state with data access. Frontend rewrite needs mockable, typed services.

**Proposed modules**

```
src/services/
  errors.ts              # AppError, mapPostgrestError, mapRpcMessage
  auth.ts                # sign-in/up, OAuth URL, callback exchange, sign-out
  profile.ts             # load/refresh profile
  legal.ts               # documents + acceptances
  booking.ts             # search, slots, book, cancel, reschedule, rate, today
  appointments.ts        # loadCustomerAppointments mapping
  barberSettings.ts      # load/save settings
  onboarding.ts          # draft CRUD + publish RPC
  shops.ts               # all shop RPCs + membership state load
  notifications.ts
  push.ts
  account.ts             # delete account
  mappers/
    appointment.ts
    shop.ts
    schedule.ts
```

**Rules**

1. Services never call `useState`.
2. Services return `Result<T, AppError>` **or** throw `AppError` consistently — pick one style project-wide (recommend throw `AppError` for less ceremony).
3. Hooks only: bind userId/session, hold UI state, call services.
4. Shared request-id / in-flight handling can stay in a tiny `createAsyncRunner()` helper used by hooks.

**Extraction order**

1. `booking` + `appointments` (already semi-clean in `useBooking`)
2. `barberSettings` + `onboarding` (right after W2 RPCs)
3. `shops` (largest)
4. `auth` / `legal` / `profile` from `useSession`
5. notifications / push / account

**Exit criteria**

- [ ] New logic not added to fat hooks
- [ ] Services importable from tests without React
- [ ] Frontend agent can depend on services **or** hooks

---

### W4 — Hook thinning & API cleanup

**Why:** `useSession` (220) and `useShops` (388) are hard to consume and test.

#### Session split (additive preferred)

| New unit | Responsibility |
|---|---|
| `useSession` | session, profile, loading, signOut, refreshProfile |
| `useAuthActions` | signIn/Up, Google, reset, resend, completeCallback |
| `useLegalAcceptance` | documents, accepted flag, errors |
| module caches | move next to services; clear on signOut **and** user switch |

Keep a compatibility façade temporarily:

```ts
export function useSession() {
  // compose the smaller hooks and return the old shape
}
```

Deprecate façade once frontend agent migrates.

#### Shops split

| New unit | Responsibility |
|---|---|
| `useOwnedShop` | create, delete, members, invites, owner settings |
| `useShopMembership` | request join, leave, respond invitation |
| `useShopDirectory` | search shops/barbers, getShop, activity |

#### Cache hardening (`useSession`)

- Clear `profileCache`, `legalAcceptedCache`, pending keys on sign-out
- Key profile cache by user id only; never serve user A’s profile to user B
- Re-fetch legal docs when acceptance fails or app returns to foreground after long pause (optional)

#### Pagination API

- `searchBarbers(query, city, page = 0)`
- `searchShops(query, page = 0)`
- Return `{ items, page, maybeHasMore }` or keep array and document page size 20

**Exit criteria**

- [ ] Compatibility layer or coordinated frontend cutover
- [ ] Caches cannot leak across users
- [ ] Page args available for Find UI

---

### W5 — Errors, i18n keys, shared mappers

**Why:** Mixed Arabic strings vs opaque codes (`failed`, `validation`) will fight localization.

**Standard**

```ts
// src/services/errors.ts
export type AppErrorCode =
  | 'SLOT_UNAVAILABLE'
  | 'ACTIVE_APPOINTMENT'
  | 'CANCEL_NOT_ALLOWED'
  | 'RESCHEDULE_NOT_ALLOWED'
  | 'CHECKIN_NOT_ALLOWED'
  | 'RATING_NOT_ALLOWED'
  | 'RATING_EDIT_WINDOW'
  | 'VALIDATION'
  | 'LOCATION_REQUIRED'
  | 'INVALID_TIME'
  | 'LEGAL_SAVE_FAILED'
  | 'UNAUTHORIZED'
  | 'NETWORK'
  | 'UNKNOWN';

export class AppError extends Error {
  constructor(readonly code: AppErrorCode, readonly cause?: unknown) {
    super(code);
  }
}
```

**Rules**

1. Services throw/return `AppError` only (no raw PostgREST strings to UI).
2. UI maps `code →` Arabic/English via i18n dictionaries (frontend agent owns dictionaries).
3. Domain validation helpers keep returning simple codes (`validation`, `invalidTime`, …) **or** migrate them to `AppErrorCode` in the same PR.
4. Deduplicate schedule mapping: only `mapSchedulesFromRows` + one owner-payload mapper.

**Exit criteria**

- [ ] No hard-coded Arabic in services (session legal error string moves to UI)
- [ ] Shops/settings/booking share one mapper table for RPC message → code

---

### W6 — Test pyramid

**Current:** pure unit tests only (`__tests__/*` helpers).

**Target layers**

| Layer | Tooling | Coverage |
|---|---|---|
| Pure domain | Jest (existing) | Keep/extend |
| Services | Jest + mocked supabase client | mapping, error codes, happy paths |
| SQL / RPC | Supabase local **or** staging SQL fixtures | booking races, publish, settings replace, membership |
| Smoke | manual / scripted curl for Edge Function | push dispatch auth + dry path |

#### W6.1 SQL integration tests (highest value)

Minimum cases:

1. **Booking**
   - Available slot books
   - Double-book same slot → reject
   - Second active appointment for customer → reject
   - Outside booking window / minimum notice → reject
   - Slot overlapping break → reject
   - Shop-affiliated barber is bookable via `is_bookable_published_barber`
   - Independent search excludes shop-affiliated barbers
2. **Cancel / reschedule**
   - Customer cancel inside 2h → reject (server)
   - Reschedule non-`booked` → reject
3. **Publish barber**
   - Full payload creates profile+services+hours
   - Failure validation rolls back (no orphan services)
4. **Replace settings**
   - Schedule replace is atomic
   - Soft-delete services only
5. **Shops**
   - Cannot own + join
   - Invite expiry
   - One pending/active membership

**Implementation options without Docker**

- Prefer restoring Docker + `supabase test` / `pgTAP` / SQL scripts against local.
- Interim: document a `supabase/tests/*.sql` suite run manually against a **staging branch DB** or local when available; do not run destructive tests on shared staging without seed reset.

Seed already exists: `supabase/seed/staging-demo.sql` + README — use for resettable fixtures.

#### W6.2 Service unit tests

Mock `supabase.from/rpc` and assert:

- argument shapes
- mapper outputs
- error code mapping

#### W6.3 Package scripts

```json
{
  "test": "jest",
  "typecheck": "tsc --noEmit",
  "lint": "expo lint",
  "db:types": "supabase gen types typescript --linked --schema public > src/types/database.ts",
  "test:ci": "npm run typecheck && npm test"
}
```

**Exit criteria**

- [ ] Booking invariant suite exists and is documented
- [ ] Service tests for booking + settings + onboarding
- [ ] `npm run test:ci` is the pre-merge gate

---

### W7 — Search pagination & query API

**Tasks**

1. Plumb `page_number` through services/hooks.
2. Standardize page size (already 20 in SQL) as a shared constant `SEARCH_PAGE_SIZE = 20`.
3. Optional: return `hasMore = items.length === SEARCH_PAGE_SIZE`.
4. Document Find UX expectations for the frontend agent (infinite scroll vs “load more”).

**Exit criteria**

- [ ] Frontend can request page > 0 without new backend work

---

### W8 — Security / RPC audit

**Checklist for every mutative `security definer` RPC**

- [ ] `auth.uid()` present where user-scoped
- [ ] Ownership / membership / role checks before write
- [ ] `set search_path = public`
- [ ] `revoke all … from public` + grant to `authenticated` / `service_role` as appropriate
- [ ] No leaking foreign PII beyond product rules (phone reveal only after confirmed booking, etc.)
- [ ] Errors are intentional (no stack/internal detail to clients)

**Specific audits**

1. All booking RPCs
2. Shop owner settings/update/invite/respond/delete
3. Account deletion
4. `dispatch-notifications` (`verify_jwt = false` → **must** keep shared secret header; rate-limit at scheduler; rotate secret per env)
5. Confirm retired paths cannot be called with weaker auth

**Exit criteria**

- [ ] Written audit note in `reference/` or PR description
- [ ] Any gaps fixed via migration before production push features expand

---

### W9 — Repo hygiene & CI

**Tasks**

1. `.gitignore`
   - `google-services*.json` (or document why committed if EAS needs them — prefer EAS secrets / file env)
   - Keep `.env*.local` ignored (already)
2. Remove empty `constants/` **or** reserve it with a short README once frontend needs tokens (prefer delete while empty).
3. Add scripts: `typecheck`, `test:ci`, `db:types`.
4. GitHub Action (or other CI):
   ```yaml
   - npm ci
   - npm run typecheck
   - npm test
   - npm run lint
   ```
5. Ensure `google-services` files are not tracked if currently untracked; if tracked, migrate to secret store.
6. Pin/document Node version if not already (optional `.nvmrc`).

**Exit criteria**

- [ ] CI green on a sample PR
- [ ] No secrets in git history going forward

---

### W10 — Push delivery finish (Firebase + Supabase)

**CLI truth from the last successful audit (2026-07-28)**

| Env | Function deployed | SA secret | Dispatch secret | APP_ENV | Trusted scheduler |
|---|---|---|---|---|---|
| Staging | Yes v5 (verified 2026-08-04) | Yes (verified 2026-08-04) | Yes (verified 2026-08-04) | Yes (verified 2026-08-04) | Yes, `koupa-notification-dispatch` (historical; SQL recheck pending) |
| Production | **No** | **No** | **No** | **No** | No |

**Tasks — Staging**

1. Verify worker with authenticated curl:
   ```sh
   curl -i -X POST \
     "https://zhdwaizroczkqzwrvfxf.supabase.co/functions/v1/dispatch-notifications" \
     -H "x-notification-dispatch-secret: $NOTIFICATION_DISPATCH_SECRET"
   ```
2. Re-verify the existing **trusted scheduler** (`koupa-notification-dispatch`, once per minute) after Supabase CLI access is restored; do not create a duplicate job.
3. Confirm invalid tokens delete and `push_delivered_at` stamps.
4. Confirm staging prefix `【اختبار】` appears on device builds (not Expo Go).

**Tasks — Production**

1. Create/select Firebase **koupa-prod** service account with FCM permission; store JSON only in Supabase secrets.
2. Deploy function:
   ```sh
   supabase link --project-ref hrcwhswzscfbpbllqkri
   supabase functions deploy dispatch-notifications
   supabase secrets set \
     APP_ENV="production" \
     NOTIFICATION_DISPATCH_SECRET="…" \
     FIREBASE_SERVICE_ACCOUNT_JSON='…'
   supabase link --project-ref zhdwaizroczkqzwrvfxf
   ```
3. Configure production scheduler separately (different secret).
4. Smoke with a real closed-test device build.

**Tasks — Cleanup**

1. After verifying DB cron transitions on staging + production, remove or stop relying on `appointment-transitions` Edge Function (per `BOOKING-OPERATIONS.md`).
2. Update roadmap Stage 7 checkboxes.

**Exit criteria**

- [ ] Staging: scheduled dispatch proven end-to-end
- [ ] Production: function + secrets + scheduler ready before public launch
- [ ] Docs match reality

---

### W11 — Auth / legal / release hygiene

**Tasks**

1. **Legal documents (staging + production)**  
   Staging approved Terms/Privacy rows were verified on 2026-07-28. Re-query
   staging after access is restored, then publish approved rows to production
   (production was historically empty and remains unverified):
   ```sql
   -- pattern from reference/AUTH-SETUP.md; use real URLs/versions
   insert into public.legal_documents (key, version, url, is_active) values
     ('terms', '<version>', 'https://…', true),
     ('privacy', '<version>', 'https://…', true);
   ```
   Never rewrite historical acceptance rows; publish new versions carefully.

2. **Production migration parity**
   ```sh
   supabase link --project-ref hrcwhswzscfbpbllqkri
   supabase migration list
   # apply any missing with reviewed db push / migration up
   supabase link --project-ref zhdwaizroczkqzwrvfxf
   ```

3. **Google OAuth on installed Android build**
   - Supabase Google provider configured with Android + web clients as required
   - Redirect `koupa://callback` allowed
   - EAS build with correct `google-services` for env
   - Test collision path (password account + Google) still unlinks unapproved identity

4. **Env matrix check**

| Variable | Dev | Staging | Prod |
|---|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | development | staging | production |
| Supabase URL/key | local or staging | staging | production |
| Firebase client config | koupa-dev | koupa-staging | koupa-prod |
| Terms/Privacy URLs | approved or staging | approved | approved |

5. Re-verify appointment transition cron on production (SQL in `BOOKING-OPERATIONS.md`).

**Exit criteria**

- [ ] No `example.com` legal URLs in non-dev DBs
- [ ] Prod migrations == repo
- [ ] OAuth path tested on real Android build
- [ ] Roadmap Stage 7–8 updated

---

### W12 — Documentation & frontend contract

**Tasks**

1. Update `reference/ROADMAP.md` statuses as work completes.
2. Add `reference/FRONTEND-CONTRACT.md` (short):
   - hooks/services list
   - error code enum
   - pagination
   - timezone/locale rules
   - independent vs bookable barber distinction for Find tabs
3. Update `reference/BOOKING-OPERATIONS.md` after Edge Function cleanup.
4. Update `reference/PUSH-NOTIFICATIONS.md` with scheduler choice + production steps.
5. Update `AGENTS.md` scripts section (`typecheck`, `db:types`, test policy).
6. Optionally fold completed items from this plan into roadmap stages 9+.

**Exit criteria**

- [ ] Frontend agent can implement against docs without reading SQL
- [ ] Ops docs match CLI reality

---

## 5. Execution order (recommended sequence)

```text
Week A
  W0 tooling
  W10 staging scheduler verify (parallel)
  W11 legal URLs + prod migration audit (parallel)
  W1 db types + typed client
  W2.1 publish_barber_profile migration + client switch
  W2.2 replace_barber_settings (+ share helper with owner RPC)

Week B
  W3 service extraction (booking → settings → shops → auth)
  W6 tests alongside each extraction
  W4 hook thinning with compatibility façade
  W5 error codes + mappers
  W7 pagination plumbing
  W8 RPC audit pass
  W9 CI + gitignore
  W10 production push deploy
  W11 OAuth Android verification
  W12 docs + contract
```

### Parallelization map

| Can run in parallel | Must be serial |
|---|---|
| W10, W11, W0 | W1 → W2 → client switch |
| W9 early scripts | W2 → W6 SQL for those RPCs |
| W8 after W2 | W3 before deep W4 split |
| W7 anytime after W3 booking/shops services | W12 last |

---

## 6. Migration & deploy playbook

### Staging (default linked)

```sh
# 1) review SQL
# 2) optional local apply if Docker restored:
#    supabase start && supabase db reset
# 3) push to staging
supabase db push
supabase gen types typescript --linked --schema public > src/types/database.ts
npm run typecheck
npm test
# 4) deploy functions if changed
supabase functions deploy dispatch-notifications
```

### Production

```sh
supabase link --project-ref hrcwhswzscfbpbllqkri
supabase migration list          # confirm expected pending set
supabase db push                 # only after staging soak
supabase functions deploy dispatch-notifications
supabase secrets set APP_ENV=production NOTIFICATION_DISPATCH_SECRET=… FIREBASE_SERVICE_ACCOUNT_JSON=…
# verify cron + function
supabase link --project-ref zhdwaizroczkqzwrvfxf
```

### Rollback posture

- Prefer **forward fixes** for SQL functions (`create or replace`).
- Client app: keep old multi-write path behind a short flag only if needed; better to ship RPC + client together after staging verification.
- Never `db reset` production.

---

## 7. Acceptance criteria (definition of done for entire plan)

1. **Types:** App compiles with `createClient<Database>`; no RPC `as never`.
2. **Atomicity:** Barber publish + settings save are single RPC transactions.
3. **Architecture:** Services own data access; hooks are thin; caches safe.
4. **Errors:** Stable `AppErrorCode` surface for UI i18n.
5. **Tests:** Domain + service tests green; booking SQL suite documented and runnable.
6. **Search:** Pagination available to frontend.
7. **Security:** Mutative RPC audit completed; push endpoint still secret-gated.
8. **Push:** Staging scheduled delivery works; production function+secrets ready for launch.
9. **Release:** Legal URLs real; prod migrations matched; OAuth tested on Android build.
10. **Docs:** Frontend contract + ops docs updated; roadmap reflects reality.
11. **Frontend isolation:** No requirement that the UI agent waits on design decisions in this repo; only typed hooks/services.

---

## 8. Coordination with the frontend agent

**Safe for them to consume now**

- Pure helpers in `src/*.ts`
- Conceptual flows in product spec
- Existing hook names (until W4 façade removed)

**Will change under this plan**

- Implementation of `publishBarber` / `save` settings (same method names, RPC underneath)
- Prefer error **codes** over Arabic strings from hooks
- Optional hook splits (façade preserves old shape temporarily)
- Pagination arguments on search methods

**Communication rule**

- Any removal of façade fields requires a short note in `reference/FRONTEND-CONTRACT.md` and a coordinated bump.
- Additive fields are always OK.

---

## 9. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| No Docker / no local Supabase | Harder SQL tests & dry-runs | Typegen from staging; restore Docker ASAP; never test destructively on prod |
| Staging is shared | Test data races | Use seed reset windows; prefix test accounts `@koupa.test` |
| Breaking hook shapes mid-UI-rewrite | Frontend thrash | Compatibility façades; contract doc |
| Production push secrets mishandled | Outage / leaked SA | Secrets only via `supabase secrets set`; never commit |
| Large generated `database.ts` conflicts | Merge pain | Regen in dedicated commits; no manual edits |
| Dual transition systems (cron + Edge Function) | Double transitions or confusion | Verify cron; retire Edge Function |
| `verify_jwt = false` on dispatch | Abuse if secret leaks | Rotate secrets; scheduler-only network path; monitor |

---

## 10. Immediate next actions (start here)

1. **W0:** Upgrade Supabase CLI; verify staging cron SQL; document Docker gap.
2. **W1:** `supabase gen types typescript --linked --schema public > src/types/database.ts` and type the client.
3. **W10:** Confirm staging scheduler for `dispatch-notifications` (secret already present).
4. **W11:** Re-verify approved staging legal URLs; audit production migrations via temporary link.
5. **W2:** Design/implement `publish_barber_profile` + `replace_barber_settings` migrations.

---

## 11. Checklist (track progress)

### W0 Tooling
- [x] Supabase CLI upgraded (`2.110.0` via `~/.local/bin`)
- [x] Local Docker strategy decided/documented (fallback: linked staging typegen; no destructive prod tests)
- [x] Staging cron verified (appointment + notification dispatch) on 2026-07-28
- [x] Production migration parity verified (`23/23`, 2026-08-04)
- [ ] Verify staging legal rows and cron runtime after the database SQL tunnel responds

### W1 Types
- [x] `src/types/database.ts` generated
- [x] `createClient<Database>`
- [x] `db:types` script
- [x] RPC casts removed from hooks (services typed)

### W2 Atomic RPCs
- [x] `publish_barber_profile` migration
- [x] `replace_barber_settings` migration (+ shared owner helper)
- [x] Client switched
- [x] Staging applied through `20260803000100` (2026-08-04)
- [ ] Owner-shop onboarding runtime smoke publish verified on staging

### W3 Services
- [x] `src/services/*` skeleton
- [x] booking/appointments
- [x] onboarding/settings
- [x] shops
- [x] legal/profile
- [x] notifications/account
- [x] auth + push + scheduleExceptions services

### W4 Hooks
- [x] Session split + façade (`useAuthActions`, `useLegalAcceptance`)
- [ ] Shops split + façade (optional; already thin over services)
- [x] Cache clear on sign-out/user switch
- [x] Pagination args

### W5 Errors / mappers
- [x] `AppError` + codes
- [x] Message maps centralized
- [x] Schedule mapper deduped (owner path uses shared mapper)
- [x] Arabic removed from services (hooks keep temporary booking Arabic fallbacks)

### W6 Tests
- [x] SQL booking suite (structural)
- [x] SQL publish/settings suite (structural + grants)
- [x] Service unit tests (errors + settings mappers)
- [x] `test:ci` script

### W7 Search
- [x] Page plumbing
- [x] `SEARCH_PAGE_SIZE` constant
- [x] Documented for frontend

### W8 Security
- [x] New RPC grants/revokes in migration
- [x] Full historical RPC audit completed (`reference/RPC-SECURITY-AUDIT.md`)
- [x] Dispatch secret posture reviewed (Vault + header + cron)

### W9 Hygiene / CI
- [x] gitignore `google-services*.json`
- [x] empty `constants/` removed
- [x] CI workflow
- [x] package scripts

### W10 Push
- [x] Staging scheduler live (`koupa-notification-dispatch`) as verified 2026-07-28
- [ ] Staging device E2E
- [ ] Prod function deployed
- [ ] Prod secrets set
- [ ] Prod scheduler live
- [ ] Retire `appointment-transitions` Edge Function after cron proof

### W11 Release hygiene
- [ ] Legal URLs staging re-queried after migration apply (SQL tunnel pending)
- [ ] Legal URLs production
- [x] Prod migrations applied and matched against the current repository set (2026-08-04)
- [ ] Google OAuth Android verified

### W12 Docs
- [x] FRONTEND-CONTRACT.md
- [x] ROADMAP updated
- [x] PUSH/BOOKING/AUTH docs record the last successful CLI audit
- [ ] Re-verify PUSH/BOOKING/AUTH docs against current CLI state after access is restored
- [x] AGENTS.md scripts updated

---

## 12. Out-of-scope reminders

- Frontend visual system, Stitch, routes, components
- iOS
- SMS OTP
- Payments inside the app (pay-at-shop remains)
- Profile photo uploads

When this checklist is complete, the backend/domain side is ready for a stable Android closed test regardless of which frontend revision is mounted on top.
