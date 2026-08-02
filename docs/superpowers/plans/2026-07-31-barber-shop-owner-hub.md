# Barber Shop Owner Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved A3/R2 owner Shop hub so the first viewport prioritizes the member roster, shows membership status and recent membership activity, and keeps requests and destructive actions secondary.

**Architecture:** Keep `useShops` as the route facade and keep Supabase access in `src/services/shops.ts`. Extend the existing owner-members RPC contract with membership timestamps, map those timestamps into `ShopMembership`, and render a compact owner summary followed by a roster-first list. Reuse the existing dedicated member workspace and its explicit schedule/services save behavior; do not create a second owner-management flow.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase SQL migrations/RPCs, Jest, React Native Testing Library.

---

### Task 1: Extend the owner member data contract with membership activity timestamps

**Files:**
- Create: `supabase/migrations/20260731000200_owner_member_activity_timestamps.sql`
- Modify: `src/services/shops.ts:11-74`
- Modify: `src/types/database.ts` only if generated RPC types require the new return shape
- Test: `__tests__/shopsService.test.ts`
- Test: `supabase/tests/barber_shop_workspace.sql`

- [ ] **Step 1: Write the failing mapper test**

Add an owner-member row containing `created_at` and `updated_at`, then assert both values survive `mapShopMembershipRow`:

```ts
it('maps membership timestamps returned by the owner-members RPC', () => {
  const membership = mapShopMembershipRow({
    id: 'membership-1',
    shop_id: 'shop-1',
    barber_id: 'barber-1',
    status: 'active',
    barber_name: 'عمر',
    barber_phone: null,
    invited_by: null,
    invitation_expires_at: null,
    created_at: '2026-07-20T08:00:00.000Z',
    updated_at: '2026-07-31T08:00:00.000Z',
  });

  expect(membership.created_at).toBe('2026-07-20T08:00:00.000Z');
  expect(membership.updated_at).toBe('2026-07-31T08:00:00.000Z');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --runInBand __tests__/shopsService.test.ts -t "membership timestamps"`

Expected: FAIL because the test fixture type and owner-RPC mapping do not yet include the timestamp fields.

- [ ] **Step 3: Add a replacement RPC migration**

Create a migration that replaces `public.shop_owner_members(uuid)` with the same authorization and ordering, adding `membership.created_at` and `membership.updated_at` to the returned table definition and `select` list. Grant execution to `authenticated` and keep anonymous execution revoked:

```sql
create or replace function public.shop_owner_members(target_shop_id uuid)
returns table (
  id uuid,
  barber_id uuid,
  barber_name text,
  barber_phone text,
  status public.membership_status,
  invited_by uuid,
  invitation_expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select membership.id,
    membership.barber_id,
    barber.name,
    barber.phone,
    membership.status,
    membership.invited_by,
    membership.invitation_expires_at,
    membership.created_at,
    membership.updated_at
  from public.shop_memberships membership
  join public.shops shop on shop.id = membership.shop_id and shop.owner_id = auth.uid()
  join public.profiles barber on barber.id = membership.barber_id
  where membership.shop_id = target_shop_id
  order by barber.name;
$$;

revoke all on function public.shop_owner_members(uuid) from public;
revoke all on function public.shop_owner_members(uuid) from anon;
grant execute on function public.shop_owner_members(uuid) to authenticated;
```

- [ ] **Step 4: Map the fields in the service layer**

Add `created_at` and `updated_at` to the owner-RPC item mapping in `loadBarberShopState`, reusing the existing optional fields on `ShopMembership`:

```ts
created_at: item.created_at,
updated_at: item.updated_at,
```

- [ ] **Step 5: Add a structural SQL assertion**

Extend `supabase/tests/barber_shop_workspace.sql` to inspect `pg_get_function_result('public.shop_owner_members(uuid)')` and fail unless `created_at` and `updated_at` are present.

- [ ] **Step 6: Run the mapper and SQL checks**

Run: `npm test -- --runInBand __tests__/shopsService.test.ts -t "membership timestamps"`

Expected: PASS. Run the Supabase SQL test through the repository's configured Supabase test command when a linked database is available; otherwise record that only the static migration assertion was verified locally.

### Task 2: Add a single Arabic relative membership-activity formatter

**Files:**
- Modify: `src/shops.ts` after `membershipStatusLabel`
- Test: `__tests__/barberShopComponents.test.tsx` or a focused `__tests__/shops.test.ts`

- [ ] **Step 1: Write the failing formatter tests**

Cover missing timestamps, a recent update, and an older update using an injected `now` value:

```ts
expect(formatMembershipActivity({ updated_at: null }, now)).toBe('لا يوجد نشاط مسجل');
expect(formatMembershipActivity({ updated_at: '2026-07-31T07:30:00.000Z' }, now)).toBe('آخر تحديث اليوم');
expect(formatMembershipActivity({ updated_at: '2026-07-28T07:30:00.000Z' }, now)).toBe('آخر تحديث منذ 3 أيام');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --runInBand __tests__/shops.test.ts -t "membership activity"`

Expected: FAIL because no formatter exists.

- [ ] **Step 3: Implement the formatter with deterministic date math**

Export `formatMembershipActivity(membership, now = new Date())`. Prefer `updated_at`, fall back to `created_at`, return `لا يوجد نشاط مسجل` when neither is valid, and use Arabic labels for today, yesterday, and day counts. Clamp future timestamps to today so clock skew does not render a negative age.

- [ ] **Step 4: Run the focused formatter tests**

Run: `npm test -- --runInBand __tests__/shops.test.ts -t "membership activity"`

Expected: PASS.

### Task 3: Refine the owner hub to the approved A3/R2 hierarchy

**Files:**
- Modify: `src/features/barber-shop/ShopHub.tsx`
- Modify: `src/features/barber-shop/ShopMemberList.tsx`
- Modify: `src/features/barber-shop/ShopStateCard.tsx` if the compact owner summary needs a focused prop instead of a generic state card
- Modify: `src/i18n/ar.ts` under `shopWorkspace`
- Test: `__tests__/barberShopComponents.test.tsx`
- Test: `__tests__/barberShopScreen.test.tsx`

- [ ] **Step 1: Add failing owner-hub assertions**

Extend the owner test fixture with timestamps and assert the first viewport content order and row metadata:

```ts
expect(screen.getByText('نظرة سريعة على المحل')).toBeTruthy();
expect(screen.getByText('آخر تحديث اليوم')).toBeTruthy();
expect(screen.getByText('نشط')).toBeTruthy();
expect(screen.getByText('دعوة حلاق')).toBeTruthy();
expect(screen.getByText('طلبات الانضمام')).toBeTruthy();
```

The test must also verify that an empty member roster still shows the invite action and a useful empty state, while pending requests remain below the roster.

- [ ] **Step 2: Run the focused UI tests and verify the new assertions fail**

Run: `npm test -- --runInBand __tests__/barberShopComponents.test.tsx __tests__/barberShopScreen.test.tsx`

Expected: FAIL on the new summary/activity assertions.

- [ ] **Step 3: Implement the roster-first owner composition**

For the `ownedShop` branch in `ShopHub`:

1. Keep the existing error/message surfaces at the top.
2. Render a compact owner summary with shop name, location, member count, pending-request count, and active status.
3. Render active members immediately after the summary. Pass each row's membership timestamp to `formatMembershipActivity` and show status plus activity in the row.
4. Keep `دعوة حلاق` attached to the roster section as its primary action.
5. Render pending requests after the active roster with direct accept/reject actions.
6. Keep activity history and the danger/delete section after operational content.

Do not add a raw shop-ID field, duplicate member lists, or a second schedule editor. Preserve 44/48 logical-pixel press targets, RTL order, and the existing Teal Stage theme.

- [ ] **Step 4: Implement row states and accessibility labels**

Use status text plus the activity text, not color alone. Keep member rows tappable only when `onMemberPress` exists, label them with the barber name, and make the invite/accept/reject controls announce their Arabic action labels. Ensure long names use `flexShrink` and do not push the status chip off-screen.

- [ ] **Step 5: Add the required translations**

Add concise Arabic strings for the compact summary and activity fallback, for example:

```ts
shopSummary: 'نظرة سريعة على المحل',
memberCount: 'الحلاقون',
pendingCount: 'طلبات معلقة',
activeStatus: 'المحل نشط',
noMembershipActivity: 'لا يوجد نشاط مسجل',
updatedToday: 'آخر تحديث اليوم',
updatedYesterday: 'آخر تحديث أمس',
updatedDaysAgo: 'آخر تحديث منذ {count} أيام',
```

- [ ] **Step 6: Run the focused UI tests**

Run: `npm test -- --runInBand __tests__/barberShopComponents.test.tsx __tests__/barberShopScreen.test.tsx`

Expected: PASS, including unaffiliated, pending, owner, and member-row interactions.

### Task 4: Keep the dedicated member workspace aligned with the hub

**Files:**
- Modify: `src/features/barber-shop/ShopMemberSummary.tsx`
- Modify: `src/features/barber-shop/ShopMemberWorkspace.tsx` only if the summary needs the membership activity line
- Test: `__tests__/barberShopMember.test.tsx`

- [ ] **Step 1: Add a failing summary assertion**

Pass timestamps in the member fixture and assert the summary displays the same membership activity label used by the hub:

```ts
expect(screen.getByText('آخر تحديث اليوم')).toBeTruthy();
```

- [ ] **Step 2: Run the focused member test and verify it fails**

Run: `npm test -- --runInBand __tests__/barberShopMember.test.tsx -t "summary"`

Expected: FAIL because the summary currently only shows status and contact information.

- [ ] **Step 3: Render membership activity in the summary**

Use `formatMembershipActivity(member)` below the status row. Keep schedule/services activity in the existing `الجدول والخدمات` and `النشاط` tabs; do not duplicate operational history on the hub row or summary.

- [ ] **Step 4: Run member workspace tests**

Run: `npm test -- --runInBand __tests__/barberShopMember.test.tsx`

Expected: PASS, including save semantics and remove confirmation.

### Task 5: Verify the complete owner Shop surface

**Files:**
- Modify only files identified by failing tests or TypeScript diagnostics from Tasks 1-4.

- [ ] **Step 1: Run all Shop tests**

Run: `npm test -- --runInBand __tests__/barberShopComponents.test.tsx __tests__/barberShopScreen.test.tsx __tests__/barberShopMember.test.tsx __tests__/shopsService.test.ts`

Expected: PASS.

- [ ] **Step 2: Run type checking**

Run: `npm run typecheck`

Expected: PASS with no new diagnostics.

- [ ] **Step 3: Run the full preserved suite**

Run: `npm test -- --runInBand`

Expected: PASS. If a pre-existing unrelated test fails, report its file and failure separately rather than changing unrelated code.

- [ ] **Step 4: Verify the mobile owner route**

Run the local Expo web app on an available port, open `/shop`, and verify at 342x646 that the header, compact summary, roster, invite action, and pending-request section have no horizontal overflow. Verify that tapping a member reaches `/shop-member/[barberId]`, that `الجدول والخدمات` retains the sticky `حفظ التغييرات` action, and that loading/error states do not look like an empty shop.

## Self-review

- The plan covers the approved owner hierarchy, membership activity contract, pending requests, member workspace consistency, accessibility, and verification.
- No task introduces a second data facade or a second schedule editor.
- Timestamp field names remain `created_at` and `updated_at` across SQL, service mapping, domain types, and UI.
- All user-visible copy stays Arabic-first and uses the existing `كوپا` brand spelling.
