# Discovery Search System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make customer discovery location-aware, service-aware, availability-first, and easier to trust, then add richer Arabic matching, ranking, recent searches, and shop/barber cross-navigation.

**Architecture:** Replace the current two direct RPC calls in `/find` with a typed discovery service and one thin hook. Phase 1 adds structured filters and result metadata while keeping the existing Barbers/Shops tabs; Phase 2 adds ranked search, typo tolerance, local recent searches, and richer shop profiles. Server-side RPCs remain the source of truth for publication, bookability, availability, and shop membership.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase PostgreSQL RPCs, Postgres `pg_trgm`, existing `useBooking`/`useShops` patterns, AsyncStorage-backed app storage, Jest, and SQL regression scripts.

---

## Product Rules

- Discovery is customer-facing. Barber shop-search/invite flows are unchanged except where shared search contracts are reused.
- Independent published barbers remain discoverable directly.
- Shop-affiliated barbers remain discoverable through shops, not as duplicate direct results.
- No wishlist or favorites are added.
- Customers pay at the shop; discovery must never imply online payment.
- A result is only bookable when the existing server-side booking rules say so.
- Arabic normalization remains enabled for every query path.

## Phase 1: Find A Bookable Place

### Task 1: Define the discovery contract and typed filters

**Files:**
- Create: `src/discovery.ts`
- Modify: `src/services/index.ts`
- Test: `__tests__/discovery.test.ts`

- [ ] **Step 1: Define typed filters and result metadata**

Add:

```ts
export type DiscoveryDirectory = 'barbers' | 'shops';
export type DiscoverySort = 'relevance' | 'earliest' | 'distance' | 'rating' | 'price';
export type DiscoveryFilters = {
  readonly query: string;
  readonly city: string;
  readonly neighborhood: string;
  readonly serviceId?: string;
  readonly date?: string; // YYYY-MM-DD
  readonly timeFrom?: string; // HH:mm
  readonly latitude?: number;
  readonly longitude?: number;
  readonly radiusKm?: number;
  readonly sort: DiscoverySort;
};
```

Result types must include the existing identity/location fields plus `average_rating`, `rating_count`, `starting_price_dzd`, `service_count`, `next_available_at`, and nullable `distance_km` where applicable.

- [ ] **Step 2: Add deterministic client-side filter serialization**

Normalize empty strings to `undefined`, clamp page numbers to zero or greater, and serialize dates/times without local timezone conversion. Add tests for empty filters, Arabic query preservation, and stable pagination.

- [ ] **Step 3: Run the contract tests**

Run `npm test -- --runInBand __tests__/discovery.test.ts`. Expect the new contract tests to fail until the service and UI tasks are complete.

### Task 2: Add Phase 1 database search RPCs

**Files:**
- Create: `supabase/migrations/20260802000200_customer_discovery_phase1.sql`
- Modify: `src/types/database.ts` after migration types are available
- Test: `supabase/tests/customer_discovery_phase1.sql`

- [ ] **Step 1: Add reusable search helpers**

Create immutable helpers for normalized query text and distance calculation. Use the existing `normalize_booking_search` behavior. Return `null` distance when either coordinate is missing; do not invent a location from city text.

- [ ] **Step 2: Add a barber discovery RPC**

Create `search_discovery_barbers(search_query, city_query, neighborhood_query, service_id, target_date, time_from, latitude, longitude, radius_km, sort_by, page_number)` returning one row per independent published barber. Filter by active service when `service_id` is provided. When date/time filters are provided, include only barbers with at least one slot from `available_booking_slots`; expose the earliest matching slot as `next_available_at`.

Apply these rules in order:

1. `is_independent_published_barber(profile.id)`.
2. Normalized text match across name, city, and neighborhood.
3. Exact normalized city/neighborhood filters when supplied.
4. Active service filter when supplied.
5. Date/time availability filter when supplied.
6. Radius filter only when both coordinates and a positive radius are supplied.

Sort `earliest` by `next_available_at nulls last`, `distance` by distance nulls last, `rating` by average rating descending, and `price` by starting price ascending. Always add deterministic name/id tie-breakers.

- [ ] **Step 3: Add a shop discovery RPC**

Create `search_discovery_shops(search_query, city_query, neighborhood_query, service_id, target_date, time_from, latitude, longitude, radius_km, sort_by, page_number)` returning one row per published shop with active bookable barber count and the earliest matching slot across its active members. Search shop name, bio, owner name, city, and neighborhood. Apply service, availability, radius, and sorting rules at shop level.

- [ ] **Step 4: Add RPC privileges and structural SQL tests**

Grant execution to `authenticated`, revoke `anon`, assert the functions exist, verify their return columns, and assert that the function source references independent-barber filtering, active services, availability, and deterministic pagination. Run the SQL script against local Supabase when Postgres is available.

### Task 3: Build the Phase 1 discovery UI

**Files:**
- Create: `src/components/discovery/DiscoveryFilters.tsx`
- Create: `src/components/discovery/DiscoveryResultCard.tsx`
- Create: `src/components/discovery/DiscoveryEmptyState.tsx`
- Create: `src/hooks/useDiscovery.ts`
- Create: `src/services/discovery.ts`
- Modify: `app/(customer)/find.tsx`
- Modify: `src/i18n/ar.ts`
- Test: `__tests__/customerFind.test.tsx`

- [ ] **Step 1: Implement the typed discovery service**

`src/services/discovery.ts` should call the Phase 1 RPCs, map nullable numeric fields, preserve page size, and convert Supabase errors through `toAppError`. It must not duplicate booking validation in the client.

- [ ] **Step 2: Implement the discovery hook**

`useDiscovery` owns directory, filters, results, page, loading, refresh, error, and `hasMore`. Changing directory or submitting filters resets page 0. `onEndReached` appends only when a page is full and no request is active. Changing a filter cancels stale result application using a request id/ref.

- [ ] **Step 3: Replace the current search header**

Keep the existing Barbers/Shops segmented control. Add a location filter row, service picker, date/time availability controls, and sort menu. The primary customer workflow should be:

1. Enter a barber/shop or area.
2. Optionally choose service and date/time.
3. Submit search.
4. Scan results showing the next available appointment.

Do not add a map SDK in Phase 1. Use city/neighborhood text and an optional “near me” permission path only when coordinates are already available.

- [ ] **Step 4: Redesign result cards**

Barber cards show initials, name, location, rating/count, starting price, service count, distance when known, and the earliest available slot. Shop cards show initials, name, location, rating/count, active barber count, and earliest matching slot. Preserve 48dp touch targets and Arabic RTL layout.

- [ ] **Step 5: Add loading, empty, and failure states**

Empty states must distinguish “no text matches” from “no availability matches” and provide a clear reset-filters action. Preserve retry behavior and never hide a network error behind an empty list.

- [ ] **Step 6: Update tests**

Cover directory switching, filter submission, pagination, stale-request protection, empty availability results, result metadata, and navigation to barber/shop details. Run:

```sh
npm test -- --runInBand __tests__/customerFind.test.tsx __tests__/discovery.test.ts
npm run typecheck
```

### Task 4: Verify Phase 1 end to end

**Files:**
- Modify: none unless verification finds a regression

- [ ] **Step 1: Reset local Supabase and run SQL tests**

Run `supabase start`, `supabase db reset`, then execute `supabase/tests/customer_discovery_phase1.sql` with the local `DATABASE_URL`. Do not run destructive fixtures against production or staging.

- [ ] **Step 2: Run the full client suite**

Run `npm run test:ci` and `npx expo config --type public`.

- [ ] **Step 3: Inspect `/find` at mobile widths**

Verify filter controls do not clip, Arabic labels remain readable, result cards do not overlap, pagination does not duplicate rows, and the empty state explains how to recover.

## Phase 2: Search Quality And Trust

### Task 5: Add ranked Arabic matching and ranking explanations

**Files:**
- Create: `supabase/migrations/20260802000300_customer_discovery_phase2.sql`
- Modify: `src/services/discovery.ts`
- Modify: `src/discovery.ts`
- Test: `supabase/tests/customer_discovery_phase2.sql`
- Test: `__tests__/discovery.test.ts`

- [ ] **Step 1: Enable trigram matching for discovery fields**

Use `pg_trgm` indexes on normalized barber, shop, bio, city, and neighborhood text. Keep exact normalized matching as the first path and use trigram similarity only for non-exact queries. Do not expose raw similarity scores to customers.

- [ ] **Step 2: Add controlled typo tolerance**

Use a documented similarity threshold and deterministic fallback ordering. Queries shorter than three meaningful characters should use exact substring matching only to avoid noisy results. Add SQL tests for Arabic letter variants, spacing differences, and one-character typos.

- [ ] **Step 3: Add relevance ranking**

Rank matches using a documented order: exact name match, prefix name match, area match, service/availability match, rating, then stable name/id. Keep explicit user sort choices authoritative over the default relevance score.

- [ ] **Step 4: Return a small reason code**

Return machine-readable result hints such as `exact_name`, `area_match`, `earliest_available`, or `nearby`. Map them to short Arabic labels in the UI so customers understand why a result appeared without seeing implementation scores.

### Task 6: Add recent searches and richer cross-navigation

**Files:**
- Create: `src/services/discoveryHistory.ts`
- Create: `src/components/discovery/RecentSearches.tsx`
- Modify: `lib/storage.ts` only if the existing wrapper lacks a needed typed helper
- Modify: `app/(customer)/find.tsx`
- Modify: `app/shop/[id].tsx`
- Modify: `app/barber/[id].tsx`
- Modify: `src/i18n/ar.ts`
- Test: `__tests__/customerFind.test.tsx`
- Test: `__tests__/barberShopDetails.test.tsx`

- [ ] **Step 1: Store bounded recent searches locally**

Store at most five entries containing directory, query, city, service id, and sort. Deduplicate by normalized serialized filters, keep newest first, and expose a clear-all action. Do not store appointment data or credentials.

- [ ] **Step 2: Add recent-search UI**

Show recent searches only before a new result set is submitted. Selecting one restores its filters and runs the search. Empty storage must render nothing, not an empty card.

- [ ] **Step 3: Improve barber/shop cross-navigation**

Shop profiles should expose each active barber as a tappable row with rating, service count, and next available time. Barber profiles should expose the affiliated shop when one exists, linking to the shop profile. Preserve owner/member labels and never show inactive or paused members as bookable.

- [ ] **Step 4: Test persistence and navigation**

Cover bounded history, deduplication, clear-all, shop-to-barber navigation, barber-to-shop navigation, and paused/inactive member exclusion.

### Task 7: Add Phase 2 verification and rollout safeguards

**Files:**
- Modify: `reference/IMPROVEMENT-PLAN.md` if the product team wants the roadmap recorded
- Test: existing Phase 1 and Phase 2 suites

- [ ] **Step 1: Run the complete test and type checks**

Run `npm run test:ci`, the full Jest suite, and `npx expo config --type public`.

- [ ] **Step 2: Run SQL regression scripts locally**

Reset local Supabase and execute both discovery SQL scripts. Confirm `authenticated` access and `anon` denial.

- [ ] **Step 3: Validate performance on realistic data**

Use a staging-sized local seed to check query plans and response time for empty query, common area query, service/date filter, and typo-tolerant query. Add or adjust indexes only from measured plans.

- [ ] **Step 4: Roll out behind a server/UI compatibility boundary**

Keep the existing RPC fallback only while the new RPCs are unavailable. Once the new RPCs are deployed and checked, remove fallback code in a separate cleanup change. Do not publish a UI that sends Phase 2 arguments to an older database schema.

## Out Of Scope

- Wishlist/favorites.
- Online payments.
- Map SDK or map rendering in the first release of discovery.
- Customer review submission changes.
- Changes to barber onboarding or barber shop membership rules.
