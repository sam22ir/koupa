# Customer Home Booking-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the customer Home route into a booking-first surface with one discovery CTA, derived recent barbers, contextual appointment actions, and honest loading/error states.

**Architecture:** Keep `loadCustomerAppointments()` as the only data source. Add a pure domain helper for deriving recent completed barbers, a focused recent-barber component, and a layout-preserving skeleton. Keep existing Find, public barber profile, appointment details, QR, reschedule, and cancellation routes unchanged.

**Tech Stack:** Expo Router, React Native, TypeScript, existing Teal Stage tokens, Jest, React Native Testing Library.

---

### Task 1: Add the pure recent-barber derivation helper

**Files:**
- Create: `src/customerHome.ts`
- Create: `__tests__/customerHome.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Add deterministic fixtures that assert completed-only filtering, newest-first ordering, one row per barber, and a three-row limit:

```ts
import type { Appointment } from '@/src/booking';
import { deriveRecentBarbers } from '@/src/customerHome';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: overrides.id ?? 'appointment-1',
  barber_id: overrides.barber_id ?? 'barber-1',
  service_id: 'service-1',
  starts_at: overrides.starts_at ?? '2026-07-31T10:00:00.000Z',
  ends_at: '2026-07-31T10:30:00.000Z',
  price_dzd: 800,
  status: overrides.status ?? 'completed',
  service_name: 'حلاقة شعر',
  barber_name: overrides.barber_name ?? 'أحمد',
});

it('returns unique completed barbers, newest visit first, limited to three', () => {
  const result = deriveRecentBarbers([
    appointment({ id: 'old-a', barber_id: 'a', barber_name: 'أحمد', starts_at: '2026-07-20T10:00:00.000Z' }),
    appointment({ id: 'new-a', barber_id: 'a', barber_name: 'أحمد', starts_at: '2026-07-30T10:00:00.000Z' }),
    appointment({ id: 'b', barber_id: 'b', barber_name: 'سمير', starts_at: '2026-07-29T10:00:00.000Z' }),
    appointment({ id: 'c', barber_id: 'c', barber_name: 'عمر', starts_at: '2026-07-28T10:00:00.000Z' }),
    appointment({ id: 'd', barber_id: 'd', barber_name: 'ياسين', starts_at: '2026-07-27T10:00:00.000Z' }),
  ]);

  expect(result).toEqual([
    { barberId: 'a', barberName: 'أحمد', lastVisitedAt: '2026-07-30T10:00:00.000Z' },
    { barberId: 'b', barberName: 'سمير', lastVisitedAt: '2026-07-29T10:00:00.000Z' },
    { barberId: 'c', barberName: 'عمر', lastVisitedAt: '2026-07-28T10:00:00.000Z' },
  ]);
});

it('ignores non-completed appointments and preserves a usable name fallback', () => {
  expect(deriveRecentBarbers([
    appointment({ status: 'booked', barber_id: 'booked-barber' }),
    appointment({ status: 'cancelled', barber_id: 'cancelled-barber' }),
    appointment({ status: 'completed', barber_id: 'completed-barber', barber_name: undefined }),
  ])).toEqual([
    { barberId: 'completed-barber', barberName: 'حلاق', lastVisitedAt: '2026-07-31T10:00:00.000Z' },
  ]);
});
```

- [ ] **Step 2: Run the helper tests and verify they fail**

Run: `npm test -- --runInBand __tests__/customerHome.test.ts`

Expected: FAIL because `src/customerHome.ts` does not exist.

- [ ] **Step 3: Implement the typed pure helper**

Create the result type and a deterministic implementation with no React or Supabase imports:

```ts
import type { Appointment } from '@/src/booking';

export interface RecentBarber {
  readonly barberId: string;
  readonly barberName: string;
  readonly lastVisitedAt: string;
}

export function deriveRecentBarbers(
  appointments: readonly Appointment[],
  limit = 3,
): readonly RecentBarber[] {
  const latestByBarber = new Map<string, RecentBarber>();

  for (const item of appointments) {
    if (item.status !== 'completed' || !item.barber_id) continue;
    const previous = latestByBarber.get(item.barber_id);
    if (previous && new Date(previous.lastVisitedAt).getTime() >= new Date(item.starts_at).getTime()) continue;
    latestByBarber.set(item.barber_id, {
      barberId: item.barber_id,
      barberName: item.barber_name?.trim() || 'حلاق',
      lastVisitedAt: item.starts_at,
    });
  }

  return [...latestByBarber.values()]
    .sort((a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime())
    .slice(0, Math.max(0, limit));
}
```

- [ ] **Step 4: Run the helper tests**

Run: `npm test -- --runInBand __tests__/customerHome.test.ts`

Expected: PASS.

### Task 2: Build the recent-barber list component

**Files:**
- Create: `src/features/customer-home/RecentBarbers.tsx`
- Modify: `src/i18n/ar.ts` under `home`
- Test: `__tests__/customerHomeScreen.test.tsx`

- [ ] **Step 1: Add the failing component navigation test**

Render one derived recent barber, assert its name and last-visit copy, then press the row and assert the selected barber ID is returned through the callback:

```tsx
const onSelect = jest.fn();
const view = await render(
  <RecentBarbers
    items={[{ barberId: 'barber-1', barberName: 'أحمد', lastVisitedAt: '2026-07-30T10:00:00.000Z' }]}
    onSelect={onSelect}
  />,
);

expect(view.getByText('أحمد')).toBeTruthy();
expect(view.getByText(/آخر زيارة/)).toBeTruthy();
await fireEvent.press(view.getByRole('button', { name: /أحمد/ }));
expect(onSelect).toHaveBeenCalledWith('barber-1');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --runInBand __tests__/customerHomeScreen.test.tsx -t "recent barber"`

Expected: FAIL because `RecentBarbers` does not exist.

- [ ] **Step 3: Implement the RTL list**

Use the existing `Card`, `Avatar`, `Icon`, `formatBookingDate`, and theme tokens. The complete row is a 44-pixel minimum `Pressable`, shows initials, name, last visit date, and a chevron, and calls `onSelect(barberId)`. Do not add a direct booking mutation or a favorites icon.

Add Arabic copy:

```ts
recentBarbers: 'حلاقون زرتهم مؤخرا',
lastVisit: 'آخر زيارة',
viewAll: 'عرض الكل',
startBookingSubtitle: 'ابدئي بحجز موعدك القادم.',
upcomingSubtitle: 'نراك في الموعد المحدد.',
retryAppointments: 'إعادة تحميل المواعيد',
```

- [ ] **Step 4: Run the component test**

Run: `npm test -- --runInBand __tests__/customerHomeScreen.test.tsx -t "recent barber"`

Expected: PASS.

### Task 3: Add a layout-preserving Home skeleton

**Files:**
- Create: `src/features/customer-home/CustomerHomeSkeleton.tsx`
- Test: `__tests__/customerHomeScreen.test.tsx`

- [ ] **Step 1: Add the failing skeleton assertion**

When Home is loading, assert that the stage remains rendered and a stable skeleton test ID is present:

```tsx
expect(screen.getByText('مرحبا، سارة')).toBeTruthy();
expect(screen.getByTestId('customer-home-skeleton')).toBeTruthy();
expect(screen.queryByText('اعثر على حلاق')).toBeNull();
```

- [ ] **Step 2: Run the loading test and verify it fails**

Run: `npm test -- --runInBand __tests__/customerHomeScreen.test.tsx -t "loading"`

Expected: FAIL because Home currently replaces the whole route with the `Screen` spinner.

- [ ] **Step 3: Implement the skeleton**

Create a compact body skeleton with a primary-card block and two row blocks, using `colors.surfaceMuted`, `colors.border`, `radii.lg`, and the existing spacing tokens. Give the root `testID="customer-home-skeleton"` and do not add animation dependencies.

- [ ] **Step 4: Run the loading test**

Run: `npm test -- --runInBand __tests__/customerHomeScreen.test.tsx -t "loading"`

Expected: PASS.

### Task 4: Refactor Home around the approved hierarchy and state model

**Files:**
- Modify: `app/(customer)/home.tsx`
- Modify: `src/i18n/ar.ts`
- Test: `__tests__/customerHomeScreen.test.tsx`

- [ ] **Step 1: Add failing empty, upcoming, error, and duplicate-action tests**

Mock `loadCustomerAppointments` and the session exactly as the existing QR tests do. Cover these assertions:

```tsx
it('renders one discovery CTA and recent barbers without duplicate navigation tiles', async () => {
  mockLoadAppointments.mockResolvedValue([
    appointment({ status: 'completed', barber_id: 'barber-1', barber_name: 'أحمد' }),
  ]);
  render(<CustomerHomeScreen />);

  expect(await screen.findByRole('button', { name: 'اعثر على حلاق' })).toBeTruthy();
  expect(screen.getByText('حلاقون زرتهم مؤخرا')).toBeTruthy();
  expect(screen.queryByText('اكتشف حلاق')).toBeNull();
  expect(screen.queryByText('مواعيدي')).toBeNull();
  expect(screen.queryByText('ابحث عن حلاق أو محل')).toBeNull();
});

it('does not show the empty CTA after an initial load error', async () => {
  mockLoadAppointments.mockRejectedValue(new Error('network'));
  render(<CustomerHomeScreen />);

  expect(await screen.findByRole('button', { name: 'إعادة تحميل المواعيد' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'اعثر على حلاق' })).toBeNull();
});
```

Also assert that a booked appointment keeps `إدارة الموعد`, `رمز الحضور`, `إعادة الجدولة`, and `إلغاء الموعد`, while a present appointment hides only the QR action.

- [ ] **Step 2: Run the new Home screen tests and verify the new assertions fail**

Run: `npm test -- --runInBand __tests__/customerHomeScreen.test.tsx`

Expected: FAIL on duplicate controls, loading behavior, and new recent-barber content.

- [ ] **Step 3: Refactor Home state without changing route contracts**

In `CustomerHomeScreen`:

1. Store the full appointment snapshot, not only `upcoming`.
2. Track `hasLoadedSuccessfully` so a first-load error cannot render the empty CTA while a later refresh can preserve stale content.
3. Derive recent barbers with `deriveRecentBarbers(appointments)`.
4. Keep the Teal Stage visible during loading and use `CustomerHomeSkeleton` for the body.
5. On initial error, render `ErrorBanner` and `إعادة تحميل المواعيد` only. On refresh error after a successful load, render the error above the last known content.
6. Replace the no-appointment card copy with `startBookingSubtitle` and one `اعثر على حلاق` action.
7. Render `RecentBarbers` only when `recentBarbers.length > 0`; route selection to `/barber/${barberId}`.
8. Remove the old tiles and search row.
9. Keep the upcoming card and existing QR/reschedule/cancel handlers, then render recent barbers below it when available.

The state flow should be:

```ts
const dataError = error || booking.error;
const showSkeleton = loading;
const showInitialError = !loading && Boolean(dataError) && !hasLoadedSuccessfully;
const showContent = !loading && !showInitialError;
```

- [ ] **Step 4: Run all Home tests**

Run: `npm test -- --runInBand __tests__/customerHome.test.ts __tests__/customerHomeScreen.test.tsx __tests__/customerQrEntry.test.tsx`

Expected: PASS, including existing QR behavior.

### Task 5: Verify responsive and repository behavior

**Files:**
- Modify only files identified by type or test diagnostics from Tasks 1-4.

- [ ] **Step 1: Run type checking**

Run: `npm run typecheck`

Expected: PASS with no new diagnostics.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test -- --runInBand`

Expected: PASS for all existing and new suites.

- [ ] **Step 3: Run lint and isolate unrelated diagnostics**

Run: `npm run lint`

Expected: no new Home-specific errors. Existing unrelated lint failures must be reported without changing unrelated modules.

- [ ] **Step 4: Verify the local route**

Run the Expo web server on port 8081 if it is not already running, open `http://localhost:8081/home`, and verify at 342x646:

- The stage remains visible during loading.
- The empty state has one discovery CTA and no duplicate tiles/search row.
- Recent barbers show only when completed history exists and rows open `/barber/[id]`.
- The upcoming card keeps one filled primary action and contextual secondary actions.
- Long Arabic names wrap without horizontal overflow.
- The bottom tab bar remains reachable after scrolling.

## Self-review

- Every requirement in the approved customer Home spec maps to Tasks 1-5.
- The helper signature and `RecentBarber` field names remain consistent across tests, component props, and Home state.
- No task adds favorites, new Supabase tables, or new booking APIs.
- Initial errors and refresh errors are explicitly distinguished so the empty state cannot masquerade as a failed load.
