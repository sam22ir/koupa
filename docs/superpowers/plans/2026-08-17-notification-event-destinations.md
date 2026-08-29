# Notification Event Destinations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Koupa notification open the specific appointment, shop, membership, workspace, activity, or retained event it represents.

**Architecture:** Persist a typed JSON event destination on each notification row rather than storing executable routes or inferring behavior from Arabic copy. The client resolves only allowlisted destination kinds; stale or legacy events open a recipient-scoped notification detail fallback. Appointment events use separate customer and barber participant routes.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase Postgres/RLS, Supabase Edge Functions, Jest.

---

### Task 1: Client Destination Resolver

**Files:**
- Create: `src/notificationDestination.ts`
- Modify: `src/notifications.ts`
- Modify: `src/services/notifications.ts`
- Modify: `app/notifications.tsx`
- Test: `__tests__/notificationDestination.test.ts`

- [ ] **Step 1: Write failing resolver tests** for appointment, shop membership, owner workspace, shop member, shop activity, legacy appointment, and unknown-event fallback.
- [ ] **Step 2: Run** `npm test -- --runInBand __tests__/notificationDestination.test.ts` and confirm the missing resolver fails.
- [ ] **Step 3: Implement** an allowlisted `notificationDestinationHref` that accepts only typed destination objects and never navigates a stored URL.
- [ ] **Step 4: Update** notification loading and each inbox row so every row marks read and opens the resolved event.
- [ ] **Step 5: Run** `npm test -- --runInBand __tests__/notificationDestination.test.ts __tests__/notificationsScreen.test.tsx`.

### Task 2: Role-Safe Appointment Events

**Files:**
- Create: `app/barber-appointment/[id].tsx`
- Modify: `src/services/booking.ts`
- Modify: `src/hooks/useBooking.ts`
- Modify: `src/navigation/routeGuard.ts`
- Modify: `app/_layout.tsx`
- Test: `__tests__/barberAppointmentEventScreen.test.tsx`

- [ ] **Step 1: Write a failing barber appointment event screen test** that expects the customer, service, and status from a barber-owned notification event.
- [ ] **Step 2: Run** `npm test -- --runInBand __tests__/barberAppointmentEventScreen.test.tsx` and confirm the missing route fails.
- [ ] **Step 3: Add** a barber-only appointment projection and event route; retain the existing customer detail route and its customer-only actions.
- [ ] **Step 4: Classify** `/barber-appointment/:id` as barber-only in the route guard.
- [ ] **Step 5: Run** `npm test -- --runInBand __tests__/barberAppointmentEventScreen.test.tsx __tests__/routeGuard.test.ts`.

### Task 3: Database Event Contract

**Files:**
- Create: `supabase/migrations/20260817000100_notification_event_destinations.sql`
- Create: `supabase/tests/notification_event_destinations.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Add a structural SQL test** requiring the destination column and typed appointment, invitation, and member-removal writers.
- [ ] **Step 2: Add a migration** that adds a checked JSON destination, backfills appointment rows, indexes the inbox, and makes the existing appointment helper persist an appointment destination.
- [ ] **Step 3: Override active shop membership and workspace producers** to write typed destinations with durable resource identifiers; use activity events where membership deletion makes a membership target stale.
- [ ] **Step 4: Keep RLS recipient-scoped** and remove direct recipient update permission so only `mark_notifications_read` changes read state.
- [ ] **Step 5: Regenerate or update** the typed database surface and run the SQL structural test against a local or resettable staging database.

### Task 4: Push Metadata

**Files:**
- Modify: `supabase/functions/dispatch-notifications/index.ts`
- Test: static TypeScript/typecheck coverage

- [ ] **Step 1: Extend** the worker notification query and FCM data payload with serialized destination metadata.
- [ ] **Step 2: Keep title/body behavior and delivery bookkeeping unchanged.**
- [ ] **Step 3: Run** `npm run typecheck` and review the worker diff for client-safe metadata only.

### Task 5: Verification

**Files:**
- Test: `__tests__/notificationDestination.test.ts`
- Test: `__tests__/notificationsScreen.test.tsx`
- Test: `__tests__/barberAppointmentEventScreen.test.tsx`
- Test: `__tests__/routeGuard.test.ts`

- [ ] **Step 1: Run focused Jest tests.**
- [ ] **Step 2: Run** `npm run typecheck`.
- [ ] **Step 3: Start Expo web and verify in the Codex in-app browser** that a barber notification opens the barber event route.
- [ ] **Step 4: Report SQL validation separately if local Supabase is unavailable.**
