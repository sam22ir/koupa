# Barber Shop Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current raw Shop form with a complete state-first barber Shop workflow for creating, searching, joining, invitations, active memberships, owner management, and dedicated member workspaces.

**Architecture:** Keep `useShops` as the thin route facade and move Shop data access into typed services. Add versioned Supabase support for location-aware search, invitation/member state, owner member removal, and transactional owner-managed schedule workspaces. Compose the UI from focused routes and feature components, reusing the existing Teal Stage and Schedule workspace patterns.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native Testing Library, Jest, Supabase RPCs, IBM Plex Sans Arabic, Teal Stage theme.

---

## Scope And File Map

The implementation must stay limited to the approved Shop workflow. Do not add payments, analytics, staff scheduling, service ordering, or recurring membership automation.

Files to create or modify:

- Create `supabase/migrations/20260731000100_barber_shop_workspace.sql`: versioned Shop search/profile RPCs, owner member removal, and owner workspace load/save RPCs.
- Create `supabase/tests/barber_shop_workspace.sql`: RPC existence, grants, state transitions, removal side effects, and transactional rollback checks.
- Modify `src/types/database.ts`: generated declarations for the new functions and result fields.
- Modify `src/shops.ts`: relationship-state types, location fields, invitation/request classification, and pure labels/helpers.
- Modify `src/services/shops.ts`: typed loaders/mappers for all relationship states, versioned search/profile calls, owner member removal, and owner workspace calls.
- Modify `src/hooks/useShops.ts`: expose the expanded relationship state and narrow mutation methods with stable loading/error behavior.
- Create `src/hooks/useManagedBarberSettings.ts`: screen-level draft facade for an owner editing an affiliated barber.
- Create `src/features/barber-shop/ShopHub.tsx`: state-first hub composition.
- Create `src/features/barber-shop/ShopStateCard.tsx`: unaffiliated, pending, invitation, active-member, and owner state surfaces.
- Create `src/features/barber-shop/ShopMemberList.tsx`: owner member rows and request rows.
- Create `src/features/barber-shop/ShopActivityList.tsx`: activity timeline/list.
- Create `src/features/barber-shop/ShopSearchResult.tsx`: searchable shop result row.
- Create `app/(barber)/shop-search.tsx`: search-first joining screen.
- Create `app/(barber)/shop-create.tsx`: focused create-shop form.
- Create `app/(barber)/shop-details/[id].tsx`: shop inspection and request screen.
- Create `app/(barber)/shop-member/[barberId].tsx`: dedicated owner member workspace.
- Modify `app/(barber)/shop.tsx`: route shell and navigation into the focused screens.
- Modify `src/i18n/ar.ts`: complete Shop copy, state labels, confirmations, errors, and accessibility labels.
- Create `__tests__/shopsState.test.ts`: pure relationship and label tests.
- Create `__tests__/shopsService.test.ts`: typed service/RPC mapping tests.
- Create `__tests__/barberShopScreen.test.tsx`: hub state and owner/member interactions.
- Create `__tests__/barberShopSearch.test.tsx`: search, empty, retry, and request flow.
- Create `__tests__/barberShopMember.test.tsx`: owner member workspace and remove-member flow.

### Task 1: Domain State And Pure Helpers

**Files:**
- Modify: `src/shops.ts`
- Test: `__tests__/shopsState.test.ts`

- [ ] **Step 1: Write failing state tests**

Add fixtures for an owned shop, active membership, outgoing request (`pending` with `invited_by: null`), invitation (`pending` with `invited_by`), rejected membership, and expired invitation. Assert:

```ts
expect(classifyShopRelationship(null, null)).toEqual({ kind: 'none' });
expect(classifyShopRelationship(null, outgoingRequest)).toEqual({ kind: 'request', membership: outgoingRequest });
expect(classifyShopRelationship(null, invitation)).toEqual({ kind: 'invitation', membership: invitation });
expect(classifyShopRelationship(null, activeMembership)).toEqual({ kind: 'member', membership: activeMembership });
expect(isInvitationExpired(expiredInvitation, now)).toBe(true);
expect(isInvitationExpired(activeInvitation, now)).toBe(false);
expect(membershipStatusLabel('pending')).toBe('قيد الانتظار');
```

Add tests that shop summaries preserve `city`, `neighborhood`, `average_rating`, and `rating_count`, and that activity actions have stable Arabic labels.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- --runInBand __tests__/shopsState.test.ts`

Expected: FAIL because the relationship helpers and expanded types do not exist.

- [ ] **Step 3: Implement the pure contract**

Extend `ShopSummary` with nullable `city` and `neighborhood`, extend `ShopMembership` with `created_at` and `updated_at`, and add:

```ts
export type ShopRelationship =
  | { readonly kind: 'none' }
  | { readonly kind: 'request'; readonly membership: ShopMembership }
  | { readonly kind: 'invitation'; readonly membership: ShopMembership }
  | { readonly kind: 'member'; readonly membership: ShopMembership };

export function classifyShopRelationship(
  ownedShop: ShopSummary | null,
  membership: ShopMembership | null,
): ShopRelationship {
  if (ownedShop) return { kind: 'none' };
  if (!membership) return { kind: 'none' };
  if (membership.status === 'active') return { kind: 'member', membership };
  return membership.invited_by
    ? { kind: 'invitation', membership }
    : { kind: 'request', membership };
}

export function isInvitationExpired(
  membership: Pick<ShopMembership, 'invitation_expires_at'>,
  now = new Date(),
): boolean {
  return Boolean(
    membership.invitation_expires_at &&
      new Date(membership.invitation_expires_at).getTime() <= now.getTime(),
  );
}
```

Keep `validateShopDraft` unchanged except for explicit URL/coordinate validation messages needed by the create screen.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/shopsState.test.ts __tests__/shops.test.ts`

Expected: all pure Shop tests pass.

- [ ] **Step 5: Commit the domain contract**

```bash
git add src/shops.ts __tests__/shopsState.test.ts __tests__/shops.test.ts
git commit -m "Add barber shop relationship state helpers"
```

### Task 2: Supabase Workspace Support

**Files:**
- Create: `supabase/migrations/20260731000100_barber_shop_workspace.sql`
- Create: `supabase/tests/barber_shop_workspace.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Add failing SQL structure assertions**

Assert that these functions exist and are authenticated-only:

```sql
select to_regprocedure('public.search_published_shops_v2(text,integer)') is not null;
select to_regprocedure('public.get_public_shop_profile_v2(uuid)') is not null;
select to_regprocedure('public.remove_shop_member(uuid)') is not null;
select to_regprocedure('public.shop_owner_barber_workspace(uuid)') is not null;
select to_regprocedure('public.shop_owner_replace_barber_workspace(uuid,jsonb)') is not null;
select has_function_privilege('authenticated', 'public.remove_shop_member(uuid)', 'execute');
select not has_function_privilege('anon', 'public.remove_shop_member(uuid)', 'execute');
```

- [ ] **Step 2: Run SQL tests and record the infrastructure result**

Run: `supabase test db supabase/tests/barber_shop_workspace.sql`

Expected on a working local database: FAIL because the new functions do not exist. If local Postgres is unavailable, record that exact blocker and continue with migration parsing; do not deploy staging automatically.

- [ ] **Step 3: Add versioned search/profile RPCs**

Create `search_published_shops_v2(search_query text, page_number integer)` returning the existing fields plus `city` and `neighborhood` from the published owner profile. Search the shop name, bio, owner name, owner city, and owner neighborhood using `normalize_booking_search`. Create `get_public_shop_profile_v2(target_shop_id uuid)` returning the same location fields and existing barber JSON.

Revoke public/anon execution and grant authenticated execution. Preserve the existing RPCs for existing customer callers.

- [ ] **Step 4: Add owner member removal**

Create `remove_shop_member(target_membership_id uuid)` as a `security definer` function with `search_path = public`. It must verify that `auth.uid()` owns the membership’s shop and that the target is an active member, cancel future booked appointments for that barber in the shop with notifications, delete the membership, write an `activity_logs` row, and notify the affected barber. A failed authorization or invalid status must roll back all work.

- [ ] **Step 5: Add owner workspace load/save RPCs**

Create `shop_owner_barber_workspace(target_barber_id uuid)` and `shop_owner_replace_barber_workspace(target_barber_id uuid, workspace jsonb)`. Both must verify an active membership owned by the caller. The loader returns profile booking settings, all active and archived services, weekly schedules/breaks, and future schedule exceptions. The writer must use one transaction, preserve archived services through an explicit `is_active` field, replace future exceptions atomically, append the existing activity log, and send the existing owner/member notifications.

Refactor the shared settings helper used by `replace_barber_workspace_settings` so active-service validation counts only active services while historical/archived services remain stored. The self-serve and owner-serve RPCs must share the same validation and rollback behavior.

- [ ] **Step 6: Add generated declarations**

Update `Database['public']['Functions']` with the exact signatures for the five new functions and the new result fields. Prefer `npm run db:types` when the linked project is available; otherwise add the declarations to match the migration and mark regeneration for the linked environment.

- [ ] **Step 7: Run structure and rollback checks**

Run: `supabase test db supabase/tests/barber_shop_workspace.sql`

Expected: function existence/grants, successful search/member/workspace behavior, unauthorized removal rejection, and transactional rollback assertions pass when local Postgres is available. Run `supabase db push --linked --dry-run` separately and confirm no staging deployment occurs before local SQL tests pass.

- [ ] **Step 8: Commit the database contract**

```bash
git add supabase/migrations/20260731000100_barber_shop_workspace.sql supabase/tests/barber_shop_workspace.sql src/types/database.ts
git commit -m "Add barber shop workspace RPCs"
```

### Task 3: Typed Shop Services And Hooks

**Files:**
- Modify: `src/services/shops.ts`
- Modify: `src/hooks/useShops.ts`
- Create: `src/hooks/useManagedBarberSettings.ts`
- Test: `__tests__/shopsService.test.ts`

- [ ] **Step 1: Write failing service tests**

Mock Supabase and assert:

```ts
expect(mapShopMembershipRow(invitationRow)).toMatchObject({ invited_by: 'owner-1' });
expect(await loadBarberShopState('barber-1')).toMatchObject({
  relationship: { kind: 'invitation' },
});
expect(await searchShops('central')).toEqual([
  expect.objectContaining({ city: 'Algiers', neighborhood: 'Hydra' }),
]);
expect(mockRpc).toHaveBeenCalledWith('remove_shop_member', {
  target_membership_id: 'membership-1',
});
```

Assert that owner workspace save calls `shop_owner_replace_barber_workspace` once with the typed payload and that service errors map to stable `AppError` codes without clearing prior state.

- [ ] **Step 2: Run focused service tests and verify RED**

Run: `npm test -- --runInBand __tests__/shopsService.test.ts`

Expected: FAIL because the v2 RPC mapping and expanded hook state are absent.

- [ ] **Step 3: Implement typed mappers and service calls**

Add row mappers that normalize nullable shop location fields, membership timestamps, invitation expiry, owner members, and activity actions. Add service functions:

```ts
loadBarberShopState(userId: string): Promise<BarberShopState>;
searchShops(query: string, page?: number): Promise<readonly ShopSummary[]>;
getShop(shopId: string): Promise<ShopProfile | null>;
removeShopMember(membershipId: string): Promise<void>;
loadOwnerBarberWorkspace(barberId: string): Promise<BarberScheduleWorkspaceDraft>;
saveOwnerBarberWorkspace(barberId: string, workspace: BarberScheduleWorkspaceDraft): Promise<void>;
```

Keep existing `createShop`, `requestJoinShop`, invitation response, owner request response, leave, delete, invite, and activity methods typed and reusable.

- [ ] **Step 4: Expand `useShops` without moving Supabase into UI**

Return `relationship`, `ownedShop`, `membership`, `pendingInvitation`, `pendingRequest`, `pendingRequests`, `members`, `loading`, `saving`, `error`, and `message`. Add `removeMember`, `retry`, and `clearMessage`. Every mutation must set `saving`, preserve the current state on failure, and reload only after success.

- [ ] **Step 5: Add the managed-settings hook**

Extract the generic draft/dirty/validation behavior already used by `useBarberSettings` into a reusable hook or a dedicated owner hook. `useManagedBarberSettings({ barberId, ownerId })` must expose:

```ts
{ loaded, draft, setDraft, dirty, errors, loading, saving, error, message, save, reset, reload }
```

It must call the owner workspace service with `barberId`, never the self-serve RPC, and preserve a failed draft for retry.

- [ ] **Step 6: Run service/hook tests and commit**

Run: `npm test -- --runInBand __tests__/shopsService.test.ts __tests__/useBarberSettings.test.tsx`

Expected: all service and existing Schedule hook tests pass.

```bash
git add src/services/shops.ts src/hooks/useShops.ts src/hooks/useManagedBarberSettings.ts __tests__/shopsService.test.ts
git commit -m "Add typed barber shop workflow services"
```

### Task 4: Shared Shop UI Primitives And Arabic Copy

**Files:**
- Create: `src/features/barber-shop/ShopStateCard.tsx`
- Create: `src/features/barber-shop/ShopMemberList.tsx`
- Create: `src/features/barber-shop/ShopActivityList.tsx`
- Create: `src/features/barber-shop/ShopSearchResult.tsx`
- Modify: `src/i18n/ar.ts`

- [ ] **Step 1: Write component accessibility tests**

Add tests for state cards exposing exactly one primary action, member rows exposing stable names/statuses, search results exposing shop name/location/rating, and activity rows exposing actor/action/time.

- [ ] **Step 2: Implement shared primitives**

Use Teal Stage tokens, separators, 48px targets, initials instead of photos, and explicit Arabic labels. State cards must support `none`, `request`, `invitation`, `member`, and `owner` without duplicating state logic in each route.

- [ ] **Step 3: Add Arabic copy**

Add `shopWorkspace` copy for:

```ts
{
  title: 'المحل',
  unaffiliatedSubtitle: 'ابدأ أو انضم إلى محل',
  search: 'البحث عن محل',
  create: 'إنشاء محل',
  invite: 'دعوة حلاق',
  pending: 'قيد الانتظار',
  invitation: 'دعوة للانضمام',
  active: 'عضو نشط',
  owner: 'مالك المحل',
  accept: 'قبول',
  reject: 'رفض',
  leave: 'مغادرة المحل',
  removeMember: 'إزالة من المحل',
  deleteShop: 'حذف المحل',
}
```

Include empty, loading, retry, expired, duplicate-request, permission, and destructive-confirmation messages.

- [ ] **Step 4: Run lint and component tests**

Run: `npx eslint src/features/barber-shop src/i18n/ar.ts && npm test -- --runInBand __tests__/shopsState.test.ts`

Expected: no lint errors and all pure/component contract tests pass.

### Task 5: State-First Shop Hub

**Files:**
- Create: `src/features/barber-shop/ShopHub.tsx`
- Modify: `app/(barber)/shop.tsx`
- Test: `__tests__/barberShopScreen.test.tsx`

- [ ] **Step 1: Write failing hub workflow tests**

Mock `useShops` and assert:

- Unaffiliated state shows `البحث عن محل` as the primary action and `إنشاء محل` as secondary; no raw ID field is shown in the primary view.
- Pending request shows the shop and `قيد الانتظار` without a false cancel action.
- Invitation shows `قبول` and `رفض` with expiry copy.
- Active member shows shop identity and a confirmation-gated `مغادرة المحل` action.
- Owner shows request count, member list, `دعوة حلاق`, activity, and delete in a danger section.
- Loading and failure states do not render an editable empty draft.

- [ ] **Step 2: Run the route test and verify RED**

Run: `npm test -- --runInBand __tests__/barberShopScreen.test.tsx`

Expected: FAIL against the current raw form.

- [ ] **Step 3: Implement the hub shell**

Use `Screen padded={false}`, `Stage decoration="subtle"`, the existing full logo treatment, a scroll surface, and the existing barber tab bar. Delegate all state-specific content to `ShopHub` and shared primitives. Route actions must use `router.push` to the focused create/search/details/member routes.

- [ ] **Step 4: Add guarded mutations**

Use `Alert.alert` for leave/delete/remove. Disable action buttons while `shops.saving` is true. On success, show a brief state-specific confirmation and reload. On failure, preserve the hub state and show the mapped error.

- [ ] **Step 5: Run hub tests and commit**

Run: `npm test -- --runInBand __tests__/barberShopScreen.test.tsx`

Expected: all state variants and confirmation paths pass.

```bash
git add app/'(barber)'/shop.tsx src/features/barber-shop/ShopHub.tsx src/features/barber-shop/ShopStateCard.tsx src/features/barber-shop/ShopMemberList.tsx src/features/barber-shop/ShopActivityList.tsx src/features/barber-shop/ShopSearchResult.tsx src/i18n/ar.ts __tests__/barberShopScreen.test.tsx
git commit -m "Redesign barber shop hub"
```

### Task 6: Create, Search, And Shop Details Routes

**Files:**
- Create: `app/(barber)/shop-create.tsx`
- Create: `app/(barber)/shop-search.tsx`
- Create: `app/(barber)/shop-details/[id].tsx`
- Test: `__tests__/barberShopSearch.test.tsx`

- [ ] **Step 1: Write failing route-flow tests**

Cover:

```ts
fireEvent.press(screen.getByRole('button', { name: 'البحث عن محل' }));
expect(router.push).toHaveBeenCalledWith('/(barber)/shop-search');

fireEvent.changeText(screen.getByLabelText('البحث عن محل'), 'النخبة');
expect(await screen.findByText('صالون النخبة')).toBeTruthy();

fireEvent.press(screen.getByRole('button', { name: 'عرض صالون النخبة' }));
expect(router.push).toHaveBeenCalledWith('/(barber)/shop-details/shop-1');
```

Also cover empty results, retry, create validation, maps URL/coordinates requirement, shop detail member list, and request success/failure states.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --runInBand __tests__/barberShopSearch.test.ts`

Expected: FAIL because the focused routes do not exist.

- [ ] **Step 3: Implement the create route**

Use a focused form with name, optional bio, maps URL, optional coordinate fields, inline validation, keyboard-safe scrolling, and one explicit `إنشاء محل` action. On success, `router.replace('/(barber)/shop')` and preserve the success message in route params or shared state.

- [ ] **Step 4: Implement the search route**

Use a debounced or submit-driven search with `SEARCH_PAGE_SIZE`, a clear query action, stable result rows, empty state, retry state, and pagination when exactly 20 results are returned. Do not issue a request for an empty query until the user explicitly submits or the screen’s initial state requires featured results.

- [ ] **Step 5: Implement the detail route**

Load `getShop(id)`, show location link, rating, owner, affiliated barbers, and one request action. If the current user is already a member/requester, replace the request action with accurate status. On request success, return to the hub and show pending state.

- [ ] **Step 6: Run focused route tests and commit**

Run: `npm test -- --runInBand __tests__/barberShopSearch.test.ts __tests__/barberShopScreen.test.tsx`

Expected: create/search/detail flows pass at the route level.

```bash
git add app/'(barber)'/shop-create.tsx app/'(barber)'/shop-search.tsx app/'(barber)'/shop-details/[id].tsx __tests__/barberShopSearch.test.tsx
git commit -m "Add barber shop discovery workflow"
```

### Task 7: Dedicated Owner Member Workspace

**Files:**
- Create: `app/(barber)/shop-member/[barberId].tsx`
- Create: `src/features/barber-shop/ShopMemberWorkspace.tsx`
- Create: `src/features/barber-shop/ShopMemberSummary.tsx`
- Test: `__tests__/barberShopMember.test.tsx`

- [ ] **Step 1: Write failing member-workspace tests**

Mock owner workspace data and assert:

- Summary shows member name, status, and activity.
- Owner can switch between `الملخص`, `الجدول والخدمات`, and `النشاط`.
- The Schedule editor loads the selected barber’s draft, including archived services and exceptions.
- Save calls the owner-specific RPC once and clears dirty state only after success.
- Failed save preserves the draft.
- `إزالة من المحل` asks for confirmation and calls `removeShopMember` only after confirmation.
- Personal profile fields are not rendered as editable controls.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runInBand __tests__/barberShopMember.test.ts`

Expected: FAIL because the route and managed-settings hook are absent.

- [ ] **Step 3: Implement the summary/activity views**

Use the same Teal Stage header and focused tab treatment as Schedule. Render activity rows with actor, action label, affected barber, and localized timestamp. Keep the dangerous remove action below the operational content.

- [ ] **Step 4: Integrate the managed Schedule workspace**

Reuse the existing Schedule feature components and workspace model. Inject owner-specific load/save callbacks through `useManagedBarberSettings`; do not duplicate schedule validation or create a second service editor. Preserve unsaved-change navigation protection.

- [ ] **Step 5: Implement removal confirmation and refresh**

Explain upcoming appointment cancellation before confirming. Disable duplicate submissions, call `removeShopMember`, then `router.replace('/(barber)/shop')` after success. Failed removal keeps the workspace visible with an error.

- [ ] **Step 6: Run member tests and commit**

Run: `npm test -- --runInBand __tests__/barberShopMember.test.ts __tests__/useBarberSettings.test.tsx`

Expected: member summary, owner schedule editing, activity, and removal tests pass.

```bash
git add app/'(barber)'/shop-member/[barberId].tsx src/features/barber-shop/ShopMemberWorkspace.tsx src/features/barber-shop/ShopMemberSummary.tsx src/hooks/useManagedBarberSettings.ts __tests__/barberShopMember.test.tsx
git commit -m "Add owner barber member workspace"
```

### Task 8: Integration, Product Reference, And Verification

**Files:**
- Modify: `reference/KOUPA-PRODUCT-SPEC.md`
- Modify: `reference/FRONTEND-CONTRACT.md`
- Verify: all Shop files and tests above

- [ ] **Step 1: Record the approved product decisions**

Add concise bullets to the product spec stating that Shop uses a state-first hub, joining is search-first, and owner member operations use a dedicated workspace. Update the frontend contract with the expanded `useShops` relationship state, v2 search/profile RPCs, owner workspace RPCs, and `removeShopMember`.

- [ ] **Step 2: Run static and focused checks**

Run:

```bash
npm run typecheck
npx eslint app/'(barber)'/shop.tsx app/'(barber)'/shop-search.tsx app/'(barber)'/shop-create.tsx app/'(barber)'/shop-details src/features/barber-shop src/hooks/useShops.ts src/hooks/useManagedBarberSettings.ts src/services/shops.ts src/shops.ts __tests__/barberShopScreen.test.tsx __tests__/barberShopSearch.test.tsx __tests__/barberShopMember.test.tsx
npm test -- --runInBand __tests__/shopsState.test.ts __tests__/shopsService.test.ts __tests__/barberShopScreen.test.tsx __tests__/barberShopSearch.test.tsx __tests__/barberShopMember.test.tsx
git diff --check
```

Expected: typecheck, scoped lint, focused tests, and diff check exit 0.

- [ ] **Step 3: Run the full suite and classify baseline failures**

Run: `npm test -- --runInBand`

Report any pre-existing failures separately; do not change unrelated error mappings or user-owned files to force a green suite.

- [ ] **Step 4: Verify the local runtime**

Start or reuse Expo at `http://localhost:8082`, then verify at 342x646 and a larger Android viewport:

- Unaffiliated hub, create route, search, empty results, and shop detail.
- Request pending state, invitation accept/reject, and active member state.
- Owner requests, member list, invite search, activity, delete confirmation.
- Dedicated member workspace, Schedule/Services editing, save failure, and remove-member confirmation.
- Long Arabic labels, keyboard reachability, no horizontal overflow, and bottom navigation.

- [ ] **Step 5: Verify database changes safely**

Run `supabase test db --local` or the focused SQL test. Only after local SQL tests pass, confirm the linked project is staging, run `supabase db push --linked --dry-run`, and deploy the Shop migration without linking production. Restore any test member/shop state after a reversible staging check.

- [ ] **Step 6: Commit documentation and integration changes**

```bash
git add reference/KOUPA-PRODUCT-SPEC.md reference/FRONTEND-CONTRACT.md
git commit -m "Document barber shop workspace workflow"
```

## Plan Self-Review

- Spec coverage: state-first hub, search-first joining, invitations, pending/active membership, owner requests/members/activity/delete, dedicated member workspace, location-aware search, remove-member safety, loading/errors, accessibility, responsive verification, and backend transaction boundaries are covered by Tasks 1-8.
- Placeholder scan: no `TODO`, `TBD`, or unspecified implementation steps are required; every task names concrete files, functions, tests, and commands.
- Type consistency: `ShopRelationship`, `BarberShopState`, v2 RPC names, `useManagedBarberSettings`, and route paths are defined before their consumers.
- Scope check: no payments, analytics, staff scheduling, service ordering, or unrelated auth changes are included.
