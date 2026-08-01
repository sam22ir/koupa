# Customer Appointment Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended; inline execution was selected) or **superpowers:executing-plans** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the status-first customer appointment detail screen for booked, present, completed, absent, canceled, missing, and loading states.

**Architecture:** Keep `loadCustomerAppointments()` and the existing `appointment/[id]` route as the data boundary. Rebuild only the presentation and state guards around the shared `CustomerStageHeader`, with state-specific action helpers and existing booking/rating services.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, React Native Testing Library, Teal Stage theme.

---

### Task 1: Add focused detail-screen tests

**Files:**
- Create: `__tests__/appointmentDetailScreen.test.tsx`

- [ ] **Step 1: Write tests for state-specific rendering**

Mock `loadCustomerAppointments`, `useBooking`, `useLocalSearchParams`, and router. Render fixtures for `booked`, `present`, `completed`, `absent`, `cancelled`, missing, and a never-resolving load. Assert the shared full-logo stage remains visible, the status/facts render, canceled records show only the return action, booked records show QR/reschedule/cancel when valid, present/absent records hide those actions, completed records show rating controls, and missing data shows an error plus return action.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- --runInBand __tests__/appointmentDetailScreen.test.tsx`

Expected: FAIL because the current detail screen has no explicit loading/not-found state and renders actions without the new status-first structure.

### Task 2: Implement state-first detail presentation

**Files:**
- Modify: `app/appointment/[id].tsx`
- Modify: `src/i18n/ar.ts` under `home` or `appointments` for canceled explanation and return copy

- [ ] **Step 1: Add explicit loading and fetch state**

Track `loading`, `error`, and `item` separately. Use a guarded `refresh` callback keyed by `id`. Keep `CustomerStageHeader` rendered for loading, missing, and loaded states. On missing data after loading, show `ErrorBanner`, `appointments.openDetails`/return action to `/(customer)/appointments`, and no appointment actions.

- [ ] **Step 2: Render the shared header and facts grid**

Use `CustomerStageHeader` with the service name and barber name. Render a status banner with text, then a two-column facts grid for date, time, price, and status. Keep long Arabic names wrapped with `flex: 1` and right alignment.

- [ ] **Step 3: Gate actions by appointment status**

For `booked`, keep manage/detail, QR, reschedule, and cancellation confirmation when `canCancelCustomerAppointment` is true. For `present`, `absent`, and `cancelled`, render no QR/reschedule/cancel actions. For `completed`, retain rating and edit-rating controls. Canceled state shows its explanation and one return button.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --runInBand __tests__/appointmentDetailScreen.test.tsx`

Expected: PASS for all detail states and route actions.

### Task 3: Verify and hand off

**Files:**
- Test: `__tests__/appointmentDetailScreen.test.tsx`

- [ ] **Step 1: Run checks**

Run `npm run typecheck`, focused ESLint on the detail route/test, and `npm test -- --runInBand`.

- [ ] **Step 2: Verify local routes**

Request `http://localhost:8081/appointment/<id>` and `http://localhost:8082/appointment/<id>` with `curl -I`; both should return HTTP 200. Inspect the canceled state at mobile width for clipped facts or empty action space.

- [ ] **Step 3: Commit the implementation**

```bash
git add app/appointment/\[id\].tsx src/i18n/ar.ts __tests__/appointmentDetailScreen.test.tsx docs/superpowers/plans/2026-08-01-appointment-detail.md
git commit -m "Implement customer appointment detail states"
```
