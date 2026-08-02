# Barber Today Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the barber Today screen with the approved daily dashboard while preserving existing booking mutations, focus refresh, and permanent attendance QR behavior.

**Architecture:** Keep data fetching and mutations in `useBooking`. Add a small pure domain module that sorts Today appointments and derives the three counters, then render the approved header, grouped counters, QR action, timeline, details modal, and empty state in the existing route. Use `react-native-qrcode-svg` to render the permanent payload as a genuinely scannable matrix.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, React Native Testing Library, `react-native-qrcode-svg`, `react-native-svg`.

---

## File Map

- Create `src/barberToday.ts`: pure counter, sorting, duration, and initials helpers.
- Create `__tests__/barberToday.test.ts`: focused unit coverage for dashboard derivation.
- Create `__tests__/barberTodayScreen.test.tsx`: route-level behavior coverage.
- Modify `app/(barber)/today.tsx`: approved dashboard composition and interactions.
- Modify `src/i18n/ar.ts`: Arabic dashboard, QR, empty-state, and action copy.
- Modify `package.json` and `package-lock.json`: add `react-native-qrcode-svg`.

### Task 1: Dashboard Derivation

**Files:**
- Create: `src/barberToday.ts`
- Test: `__tests__/barberToday.test.ts`

- [ ] **Step 1: Write the failing dashboard tests**

```ts
import {
  getCustomerInitials,
  getTodayDashboard,
  getTodayDurationMinutes,
} from '../src/barberToday';
import type { TodayAppointment } from '../src/booking';

const appointment = (
  id: string,
  starts_at: string,
  status: TodayAppointment['status'],
): TodayAppointment => ({
  id,
  starts_at,
  ends_at: new Date(new Date(starts_at).getTime() + 30 * 60_000).toISOString(),
  price_dzd: 800,
  status,
  service_name: 'حلاقة شعر',
  customer_name: 'سمير سعدي',
  customer_phone: '0550000000',
});

it('keeps all counters at zero for an empty day', () => {
  expect(getTodayDashboard([]).counts).toEqual({ upcoming: 0, present: 0, completed: 0 });
});

it('sorts appointments chronologically and excludes inactive states from counters', () => {
  const result = getTodayDashboard([
    appointment('late', '2026-07-29T11:00:00Z', 'completed'),
    appointment('absent', '2026-07-29T09:00:00Z', 'absent'),
    appointment('early', '2026-07-29T08:00:00Z', 'booked'),
    appointment('present', '2026-07-29T10:00:00Z', 'present'),
    appointment('cancelled', '2026-07-29T12:00:00Z', 'cancelled'),
  ]);

  expect(result.counts).toEqual({ upcoming: 1, present: 1, completed: 1 });
  expect(result.appointments.map(({ id }) => id)).toEqual([
    'early', 'absent', 'present', 'late', 'cancelled',
  ]);
});

it('derives appointment duration and customer initials', () => {
  const item = appointment('one', '2026-07-29T08:00:00Z', 'booked');
  expect(getTodayDurationMinutes(item)).toBe(30);
  expect(getCustomerInitials('سمير سعدي')).toBe('سس');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runInBand __tests__/barberToday.test.ts`

Expected: FAIL because `src/barberToday.ts` does not exist.

- [ ] **Step 3: Implement the pure dashboard module**

```ts
import type { TodayAppointment } from '@/src/booking';

export type TodayDashboardCounts = {
  readonly upcoming: number;
  readonly present: number;
  readonly completed: number;
};

export function getTodayDashboard(items: readonly TodayAppointment[]) {
  const counts: TodayDashboardCounts = { upcoming: 0, present: 0, completed: 0 };
  for (const item of items) {
    if (item.status === 'booked') counts.upcoming += 1;
    if (item.status === 'present') counts.present += 1;
    if (item.status === 'completed') counts.completed += 1;
  }
  return {
    counts,
    appointments: [...items].sort(
      (left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
    ),
  };
}

export function getTodayDurationMinutes(item: TodayAppointment): number {
  return Math.max(0, Math.round((new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 60_000));
}

export function getCustomerInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runInBand __tests__/barberToday.test.ts`

Expected: 3 tests pass.

### Task 2: Install QR Rendering Dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the proven QR renderer**

Run: `npm install react-native-qrcode-svg@6.3.21`

Expected: dependency is recorded and npm audit completes without install errors.

- [ ] **Step 2: Verify dependency resolution**

Run: `npm ls react-native-qrcode-svg react-native-svg`

Expected: `react-native-qrcode-svg@6.3.21` resolves against the existing `react-native-svg` dependency.

### Task 3: Today Screen Behavior

**Files:**
- Create: `__tests__/barberTodayScreen.test.tsx`
- Modify: `app/(barber)/today.tsx`
- Modify: `src/i18n/ar.ts`

- [ ] **Step 1: Write failing route-level tests**

Create a React Native Testing Library test that mocks `useBooking`, `useAppSession`, `useFocusEffect`, the router, safe-area insets, and `react-native-qrcode-svg`. Cover these observable behaviors:

```ts
it('keeps zero counters visible and opens Schedule from the empty state', async () => {
  mockToday.mockResolvedValue([]);
  render(<BarberTodayScreen />);
  await screen.findByText('لا مواعيد اليوم');
  expect(screen.getByLabelText('القادمة، 0')).toBeTruthy();
  expect(screen.getByLabelText('حاضر، 0')).toBeTruthy();
  expect(screen.getByLabelText('مكتملة، 0')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'فتح الجدول' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/(barber)/schedule');
});

it('renders appointments chronologically and marks booked customers present', async () => {
  mockToday.mockResolvedValue([lateCompleted, earlyBooked]);
  render(<BarberTodayScreen />);
  await screen.findByText('زبون مبكر');
  const rows = screen.getAllByTestId('today-appointment-row');
  expect(within(rows[0]).getByText('زبون مبكر')).toBeTruthy();
  fireEvent.press(within(rows[0]).getByRole('button', { name: 'تأكيد الحضور' }));
  await waitFor(() => expect(mockMarkPresent).toHaveBeenCalledWith('early'));
});

it('opens a real QR surface without exposing the raw payload', async () => {
  render(<BarberTodayScreen />);
  await screen.findByText('لا مواعيد اليوم');
  fireEvent.press(screen.getByRole('button', { name: 'عرض رمز الحضور' }));
  expect(screen.getByTestId('barber-qr-code')).toHaveProp('value', 'koupa://check-in/barber-id');
  expect(screen.queryByText('koupa://check-in/barber-id')).toBeNull();
});
```

- [ ] **Step 2: Run the route-level test and verify RED**

Run: `npm test -- --runInBand __tests__/barberTodayScreen.test.tsx`

Expected: FAIL because counters, new copy, Schedule action, timeline rows, and QR renderer are absent.

- [ ] **Step 3: Add Arabic Today copy**

Extend `barber` in `src/i18n/ar.ts` with:

```ts
todaySubtitle: 'نظرة سريعة على يوم العمل',
upcoming: 'القادمة',
completed: 'مكتملة',
presentStatus: 'حاضر',
confirmPresent: 'تأكيد الحضور',
showQr: 'عرض رمز الحضور',
qrTitle: 'رمز الحضور',
qrInstruction: 'دع الزبون يمسح الرمز من تطبيق كوپا لتأكيد حضوره.',
todayEmptyBody: 'ستظهر حجوزات اليوم هنا فور تأكيدها.',
openSchedule: 'فتح الجدول',
appointmentDetails: 'تفاصيل الموعد',
durationMinutes: 'دقيقة',
```

- [ ] **Step 4: Implement the approved dashboard route**

In `app/(barber)/today.tsx`:

- derive the localized Algeria date with `Intl.DateTimeFormat('ar-DZ', { timeZone: 'Africa/Algiers', weekday: 'long', day: 'numeric', month: 'long' })`;
- derive stable counters and sorted rows with `getTodayDashboard`;
- keep previously loaded rows visible during focus refresh;
- render a compact Stage with wordmark, date, and QR icon;
- render one grouped `counterRow` with three equal cells and tabular numerals;
- render the slim `عرض رمز الحضور` action;
- render an empty state with only `فتح الجدول`;
- render timeline rows with time, Avatar initials, customer, service, duration, status, and contextual Present action;
- open an in-screen appointment details modal on row press so barber details do not depend on the customer-only appointment route;
- move cancellation into that details modal with the existing confirmation;
- render `QRCode` from `react-native-qrcode-svg` with the permanent payload, a white quiet zone, and no raw payload text;
- expose stable accessibility labels and test IDs from the route-level tests.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/barberToday.test.ts __tests__/barberTodayScreen.test.tsx`

Expected: both suites pass.

- [ ] **Step 6: Run typecheck and lint**

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run lint`

Expected: exit 0, or report only pre-existing warnings separately.

### Task 4: Runtime Verification

**Files:**
- Verify: `app/(barber)/today.tsx`

- [ ] **Step 1: Start or reuse Expo web**

Run: `npm run web -- --port 8082`

Expected: Expo reports the web bundle ready at `http://localhost:8082`.

- [ ] **Step 2: Verify the route at mobile and desktop widths**

Use a real browser at 342x646 and a larger desktop viewport. Check that:

- header, counters, QR row, empty state or timeline, and bottom tabs do not overlap;
- all three zero counters remain visible;
- QR modal renders a nonblank square QR matrix and raw payload text is absent;
- Schedule, Present, details, cancellation confirmation, close, and refresh interactions are reachable;
- Arabic RTL copy and the `كوپا` spelling are correct.

- [ ] **Step 3: Run fresh final verification**

Run: `npm test -- --runInBand __tests__/barberToday.test.ts __tests__/barberTodayScreen.test.tsx && npm run typecheck && npm run lint`

Expected: focused Today tests, typecheck, and lint exit 0. Then run `npm test -- --runInBand` and report the known unrelated `__tests__/errors.test.ts` baseline failures separately if they remain.

- [ ] **Step 4: Review the diff against the design spec**

Run: `git diff --check` and inspect only the changed Today files. Confirm every acceptance criterion in `docs/superpowers/specs/2026-07-29-barber-today-dashboard-design.md` is represented and no unrelated user-owned change is reverted.
