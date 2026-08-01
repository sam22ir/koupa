# Customer Appointments Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the customer Appointments screen into a two-view upcoming/past workflow with chronological ordering, contextual actions, and canceled appointments retained in past history.

**Architecture:** Keep `loadCustomerAppointments()` as the single data source. Add a pure helper in `src/customerAppointments.ts` that filters and sorts the immutable appointment snapshot, then let the screen own selected-tab state and route actions. Reuse the existing full-white `CustomerStageHeader`, `EmptyState`, `Button`, and appointment detail route; no database or RPC changes are needed.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, React Native Testing Library, existing Teal Stage theme.

---

### Task 1: Add deterministic appointment grouping helpers

**Files:**
- Create: `src/customerAppointments.ts`
- Create: `__tests__/customerAppointments.test.ts`

- [ ] **Step 1: Write failing helper tests**

Define fixtures for `booked`, `present`, `completed`, `absent`, and `cancelled` appointments. Assert that `splitAppointments()` returns `upcoming` with booked/present sorted ascending and `past` with completed/absent/cancelled sorted descending.

```ts
const result = splitAppointments([
  appointment({ id: 'late', status: 'booked', starts_at: '2026-08-04T10:00:00.000Z' }),
  appointment({ id: 'early', status: 'present', starts_at: '2026-08-02T10:00:00.000Z' }),
  appointment({ id: 'cancelled', status: 'cancelled', starts_at: '2026-08-01T10:00:00.000Z' }),
  appointment({ id: 'completed', status: 'completed', starts_at: '2026-08-03T10:00:00.000Z' }),
  appointment({ id: 'absent', status: 'absent', starts_at: '2026-07-30T10:00:00.000Z' }),
]);

expect(result.upcoming.map((item) => item.id)).toEqual(['early', 'late']);
expect(result.past.map((item) => item.id)).toEqual(['completed', 'cancelled', 'absent']);
```

- [ ] **Step 2: Run the helper test and verify it fails**

Run: `npm test -- --runInBand __tests__/customerAppointments.test.ts`

Expected: FAIL because `src/customerAppointments.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

Export `AppointmentGroups` and `splitAppointments(appointments)`. Copy the input before sorting so the service snapshot is never mutated. Use explicit status sets and stable timestamp comparisons:

```ts
const upcomingStatuses = new Set<AppointmentStatus>(['booked', 'present']);
const pastStatuses = new Set<AppointmentStatus>(['completed', 'absent', 'cancelled']);
const dateValue = (value: string) => new Date(value).getTime();

export function splitAppointments(appointments: readonly Appointment[]): AppointmentGroups {
  const upcoming = appointments.filter((item) => upcomingStatuses.has(item.status));
  const past = appointments.filter((item) => pastStatuses.has(item.status));
  return {
    upcoming: [...upcoming].sort((a, b) => dateValue(a.starts_at) - dateValue(b.starts_at)),
    past: [...past].sort((a, b) => dateValue(b.starts_at) - dateValue(a.starts_at)),
  };
}
```

Ignore unknown statuses by leaving them out of both groups; this keeps the UI from presenting an unsupported state as actionable.

- [ ] **Step 4: Run the helper tests**

Run: `npm test -- --runInBand __tests__/customerAppointments.test.ts`

Expected: PASS.

### Task 2: Add appointment copy and tab semantics

**Files:**
- Modify: `src/i18n/ar.ts` under `appointments`
- Test: `__tests__/customerAppointmentsScreen.test.tsx`

- [ ] **Step 1: Add the required Arabic strings**

Add these exact keys under `appointments`:

```ts
upcoming: 'القادمة',
past: 'السابقة',
upcomingEmpty: 'لا توجد مواعيد قادمة',
pastEmpty: 'لا توجد مواعيد سابقة',
retry: 'إعادة المحاولة',
openDetails: 'عرض التفاصيل',
```

Keep existing `home.findCta`, `home.manage`, `home.reschedule`, `home.scanQr`, and `home.cancelAppt` for navigation and action labels.

- [ ] **Step 2: Write tab-state tests**

Mock `loadCustomerAppointments()` and `useFocusEffect` like the existing customer Home tests. Render mixed data and assert:

```tsx
expect(view.getByRole('tab', { name: 'القادمة' })).toHaveAccessibilityState({ selected: true });
expect(view.getByText('حلاقة ولحية')).toBeTruthy();
expect(view.queryByText('قصّة شعر')).toBeNull();
await fireEvent.press(view.getByRole('tab', { name: 'السابقة' }));
expect(view.getByRole('tab', { name: 'السابقة' })).toHaveAccessibilityState({ selected: true });
expect(view.getByText('قصّة شعر')).toBeTruthy();
```

- [ ] **Step 3: Run the screen test and verify it fails**

Run: `npm test -- --runInBand __tests__/customerAppointmentsScreen.test.tsx`

Expected: FAIL because the current screen renders one unfiltered list and has no tab roles.

### Task 3: Implement the two-view Appointments screen

**Files:**
- Modify: `app/(customer)/appointments.tsx`
- Do not modify: `src/components/ui/CustomerStageHeader.tsx`; the existing shared header already provides the required logo treatment
- Test: `__tests__/customerAppointmentsScreen.test.tsx`

- [ ] **Step 1: Add selected-tab state and grouped data**

Import `splitAppointments`, add `type AppointmentTab = 'upcoming' | 'past'`, default to `upcoming`, and derive groups with `useMemo`. When a successful refresh returns no upcoming items but has past items, switch to `past` only if the current selection is still the initial default; never override a user-selected tab during refresh.

- [ ] **Step 2: Render accessible tabs**

Add two `Pressable` controls above the list. Each must use `accessibilityRole="tab"`, `accessibilityState={{ selected: tab === value }}`, and a minimum height of 44. Use the existing surface and primary tokens for selected/unselected styling.

- [ ] **Step 3: Render the selected group and empty state**

Pass only `groups[tab]` to `FlatList`. Use distinct empty copy and `icon="calendar-clear-outline"`. The upcoming empty state routes to `/(customer)/find`; the past empty state has no action. Keep `CustomerStageHeader` visible during loading and display the existing inline spinner in the list footer.

- [ ] **Step 4: Make card actions contextual**

Keep the card press navigating to `/appointment/${item.id}`. For upcoming cards, render the filled `إدارة الموعد` button and secondary actions through the existing route contracts: reschedule and QR only for `booked`, cancel only when `canCancelCustomerAppointment(item.starts_at)` is true. For past cards, render only a detail affordance; canceled cards remain visible with `ملغى` and never expose destructive or booking actions.

- [ ] **Step 5: Keep errors honest and retryable**

Render `ErrorBanner` above the selected list. Add a `إعادة المحاولة` button when the initial load fails and no data has been loaded, without rendering a false empty state. Preserve the last successful groups when a later refresh fails.

- [ ] **Step 6: Run focused screen tests**

Run: `npm test -- --runInBand __tests__/customerAppointmentsScreen.test.tsx __tests__/customerAppointments.test.ts`

Expected: PASS, including tab switching, canceled placement, action visibility, empty states, and navigation.

### Task 4: Verify responsive behavior and repository checks

**Files:**
- Modify: `__tests__/customerAppointmentsScreen.test.tsx` only to keep its deterministic fixtures aligned with the final card layout.

- [ ] **Step 1: Add long-content and accessibility assertions**

Assert a long barber/service name remains rendered, both tabs expose selected state, and a canceled card has no `إلغاء الموعد` or `إعادة جدولة` button.

- [ ] **Step 2: Run typecheck and full tests**

Run: `npm run typecheck` and `npm test -- --runInBand`.

Expected: typecheck passes; all suites pass. If the known barber Today timeout recurs only in the full run, rerun that test file alone and report both results.

- [ ] **Step 3: Verify the local route**

Request `http://localhost:8081/appointments` and `http://localhost:8082/appointments` with `curl -I`; both should return HTTP 200. Reload the visible browser tab and inspect the route at mobile width for clipping or overlapping actions.

- [ ] **Step 4: Commit the implementation**

```bash
git add src/customerAppointments.ts __tests__/customerAppointments.test.ts __tests__/customerAppointmentsScreen.test.tsx app/\(customer\)/appointments.tsx src/i18n/ar.ts
git commit -m "Implement customer appointments workflow"
```
