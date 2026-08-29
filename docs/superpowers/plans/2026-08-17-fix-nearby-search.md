# Nearby Search Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the customer-facing nearby-shop search request foreground location only on an explicit tap, return staging results from the deployed RPC, and show their server-calculated distances.

**Architecture:** Keep the existing `useDeviceLocation` and `searchNearbyShops` boundaries. `app/(customer)/find.tsx` will own the opt-in state and select ordinary versus nearby shop search; the service calls the typed Supabase RPC and has a coordinate-aware public-row fallback only for a stale PostgREST schema cache. The nearby migrations are deployed to staging while the unrelated notification migration remains untouched.

**Tech Stack:** Expo Router, React Native, Expo Location, TypeScript, Supabase PostgreSQL RPCs, Jest.

---

### Task 1: Capture the Customer Contract

**Files:**
- Modify: `__tests__/customerFind.test.tsx`
- Modify: `__tests__/shopsService.test.ts`

- [x] **Step 1: Add a failing customer-screen test for explicit nearby search**

Mock `useDeviceLocation` with coordinates, expose `searchNearbyShops` from the shop hook mock, press the `find.nearMe` control, and assert the screen switches to shops while the nearby RPC adapter receives the coordinates, query, and page zero.

- [x] **Step 2: Run the screen test and confirm it fails because the nearby control is absent**

Run: `npm test -- --runInBand __tests__/customerFind.test.tsx`

Expected: FAIL while searching for the nearby action.

- [x] **Step 3: Add a service success-path test for mapped nearby distance**

Return one `search_nearby_shops` row with `distance_km: 1.4`, then assert `searchNearbyShops` preserves it.

- [x] **Step 4: Run the service test and confirm the nearby response contract**

Run: `npm test -- --runInBand __tests__/shopsService.test.ts`

Expected: FAIL until the assertion matches the contract.

### Task 2: Wire Opt-in Nearby Search

**Files:**
- Modify: `app/(customer)/find.tsx`
- Modify: `src/i18n/ar.ts`

- [x] **Step 1: Add Arabic UI copy**

Add `find.nearMe`, `find.nearMeActive`, `find.nearMeResults`, and `find.nearMeUnavailable` translations. The active label communicates that searches are ranked within the 25 km radius without exposing coordinates.

- [x] **Step 2: Add the location toggle to the existing search header**

Import `useDeviceLocation`, `formatDistanceKm`, and the existing `Button` component. Render one secondary button below the search field. On press, request foreground coordinates; if granted, store them for later searches and immediately run a nearby shop search. If denied or unavailable, retain the ordinary directory and display the translated message.

- [x] **Step 3: Route shop requests through nearby search only while coordinates are active**

Extend `runSearch` so the `shops` branch calls `searchNearbyShops(coords.latitude, coords.longitude, query, page)` when coordinates exist, otherwise retains `searchShops(query, page)`. Preserve request-id stale-response protection and pagination, and clear stale rows on a failed refresh.

- [x] **Step 4: Show the returned distance on shop rows**

Append `formatDistanceKm(item.distance_km)` only when the response has a non-null finite distance. Ordinary search cards remain unchanged.

- [x] **Step 5: Run focused screen and service tests**

Run: `npm test -- --runInBand __tests__/customerFind.test.tsx __tests__/shopsService.test.ts`

Expected: PASS.

### Task 3: Validate Native Configuration and Deploy the Backend

**Files:**
- Modify: `app.config.js`
- Existing deployment input: `supabase/migrations/20260807000100_search_nearby_shops.sql`
- Create: `supabase/migrations/20260807000200_reload_postgrest_schema.sql`
- Create: `supabase/migrations/20260807000300_nearby_maps_url_coordinates.sql`
- Existing SQL check: `supabase/tests/search_nearby_shops.sql`

- [x] **Step 1: Configure Expo Location for a clear foreground permission prompt**

Add `['expo-location', { locationWhenInUsePermission: 'اسمح لتطبيق كوپا باستخدام موقعك لعرض المحلات القريبة.' }]` to `app.config.js`. Do not add background or foreground-service location permissions.

- [x] **Step 2: Verify public Expo config**

Run: `npx expo config --type public`

Expected: the output includes the `expo-location` plugin and Android coarse/fine location permissions.

- [x] **Step 3: Deploy only the nearby migration to linked staging**

Relink the CLI to staging `zhdwaizroczkqzwrvfxf`, use `/tmp/koupa-nearby-deploy-20260817` as the temporary Supabase workdir with the unrelated `20260817000100` migration excluded, and run `supabase db push --linked --yes --workdir /tmp/koupa-nearby-deploy-20260817`. Confirm that only `20260807000100`, `20260807000200`, and `20260807000300` are applied to staging.

- [x] **Step 4: Run the structural SQL check against staging and verify the privilege boundary**

Run `supabase db query --linked --file supabase/tests/search_nearby_shops.sql`, then query `to_regprocedure`, `has_function_privilege('anon', ...)`, and `has_function_privilege('authenticated', ...)`. Expect the function and URL-coordinate helpers to exist, anonymous execution to be false, and authenticated execution to be true. Authenticate with the documented staging demo customer and call the REST RPC; expect HTTP 200 with nearby rows from coordinate-bearing Maps URLs.

### Task 4: Final Verification

**Files:**
- Verify only

- [x] **Step 1: Run all checks relevant to this change**

Run: `npm run typecheck`

Run: `npm test -- --runInBand __tests__/customerFind.test.tsx __tests__/shopsService.test.ts`

Run: `npx expo config --type public`

- [x] **Step 2: Review the nearby-focused diff**

Run: `git diff -- 'app/(customer)/find.tsx' src/i18n/ar.ts app.config.js __tests__/customerFind.test.tsx __tests__/shopsService.test.ts supabase/migrations/20260807000100_search_nearby_shops.sql`

Expected: only opt-in customer wiring, copy, test coverage, native config, and the existing migration are in scope.
