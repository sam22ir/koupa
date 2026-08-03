# Barber Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the five-step barber onboarding flow with the Guided Teal Stage presentation, an owner/worker branch, owner-only location capture, and server-synchronized worker shop locations.

**Architecture:** Keep `app/onboarding/index.tsx` as the route orchestrator and preserve the existing five-step persistence contract. Add small onboarding presentation components for workplace choice, conditional location, service cards, and review summaries; extend `BarberDraft` and validation with `workplaceType`. Add one Supabase migration that stores workplace type, relaxes location requirements only for workers, and synchronizes profile location on shop membership/create/leave operations.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase SQL RPCs, Jest, React Native Testing Library, IBM Plex Sans Arabic, existing Teal Stage theme primitives.

---

### Task 1: Extend onboarding draft types and validation

**Files:**
- Modify: `src/data/onboarding.ts`
- Modify: `src/onboardingValidation.ts`
- Test: `__tests__/onboardingValidation.test.ts`

- [ ] **Step 1: Write failing owner/worker validation tests**

Add `workplaceType: 'owner' | 'worker'` to the test fixture and cover:

```ts
expect(validateBarberOnboardingStep({ ...validDraft(), workplaceType: 'owner', mapsUrl: '' }, 1)).toBe('location');
expect(validateBarberOnboardingStep({ ...validDraft(), workplaceType: 'worker', mapsUrl: '', city: '', neighborhood: '' }, 1)).toBeNull();
expect(firstInvalidBarberOnboardingStep({ ...validDraft(), workplaceType: 'owner', mapsUrl: '' })).toBe(1);
```

Run `npm test -- --runInBand __tests__/onboardingValidation.test.ts` and confirm the new assertions fail because the draft has no workplace field and location validation is unconditional.

- [ ] **Step 2: Add the draft field and conditional validator**

Update `BarberDraft` and `defaultBarberDraft` with `workplaceType: 'owner' | 'worker'` and default it to `'owner'`. Change step 1 validation to return `null` for workers without location and retain the existing city/neighborhood plus Google Maps URL requirement for owners. Remove coordinate acceptance from the normal owner path; keep coordinate support only in the service payload for existing persisted drafts if needed for backward compatibility.

- [ ] **Step 3: Run validation tests**

Run `npm test -- --runInBand __tests__/onboardingValidation.test.ts` and expect all tests to pass, including the existing Maps URL and schedule/service invariants.

### Task 2: Build the Guided Teal Stage onboarding UI

**Files:**
- Create: `src/components/onboarding/WorkplaceChoice.tsx`
- Create: `src/components/onboarding/OnboardingLocationStep.tsx`
- Create: `src/components/onboarding/OnboardingServiceCard.tsx`
- Create: `src/components/onboarding/OnboardingReview.tsx`
- Modify: `app/onboarding/index.tsx`
- Modify: `src/i18n/ar.ts`
- Test: `__tests__/barberOnboardingScreen.test.tsx`

- [ ] **Step 1: Add screen copy and accessibility labels**

Add Arabic strings for workplace choices, owner location helper/error copy, worker continuation copy, service editor actions, and review summaries in `src/i18n/ar.ts`. Keep all new buttons at least 48dp high and expose `accessibilityRole`, selected state, and readable Arabic labels.

- [ ] **Step 2: Implement focused presentation components**

Use existing `Field`, `Button`, `Card`, `Chip`, `Stage`, `Screen`, and theme tokens. `WorkplaceChoice` renders the owner/worker segmented choice and calls `onChange`. `OnboardingLocationStep` renders owner fields or the worker continuation card based on `workplaceType`; owner UI exposes city, neighborhood, and one URL field only. `OnboardingServiceCard` owns the visual card layout but receives controlled values and callbacks. `OnboardingReview` renders summary sections and edit callbacks without introducing new persistence.

- [ ] **Step 3: Refactor the route to compose the components**

Replace the flat field blocks in `app/onboarding/index.tsx` with the components. Add a Teal Stage header containing the step count, title, and short helper copy. Preserve `useOnboarding`, save-on-next, debounced auto-save, retry actions, back/logout behavior, and the existing publish callback. When workplace changes to `worker`, clear city, neighborhood, maps URL, latitude, and longitude so an old owner location cannot silently reappear if the user later switches back.

- [ ] **Step 4: Add screen behavior tests**

Extend `__tests__/barberOnboardingScreen.test.tsx` to verify:

```ts
expect(screen.getByText('أملك محلا')).toBeTruthy();
expect(screen.getByText('أعمل في محل')).toBeTruthy();
expect(screen.queryByLabelText('رابط Google Maps')).toBeNull(); // worker branch
expect(screen.getByLabelText('رابط Google Maps')).toBeTruthy(); // owner branch
```

Also test service add/remove controls, review edit navigation, saved-step resume, owner location blocking, worker continuation, and publish routing. Run `npm test -- --runInBand __tests__/barberOnboardingScreen.test.tsx`.

### Task 3: Add the server-side workplace and location lifecycle

**Files:**
- Create: `supabase/migrations/20260802000100_barber_workplace_location_sync.sql`
- Modify: `src/services/onboarding.ts`
- Modify: `src/types/database.ts` via `npm run db:types` when the linked Supabase schema is available
- Test: `supabase/tests/barber_workplace_location.sql`

- [ ] **Step 1: Add the schema migration**

Add `profiles.workplace_type text not null default 'owner' check (workplace_type in ('owner','worker'))`, backfill existing rows as `owner`, and replace `barber_location_required` with a constraint that requires location for owners but permits workers to publish without it.

- [ ] **Step 2: Update `publish_barber_profile`**

Read `payload->>'workplace_type'`, reject values outside `owner`/`worker`, require a valid location for owners, and insert the workplace type. Preserve all service, schedule, and phone/name validation. Keep worker coordinates and Maps URL nullable.

- [ ] **Step 3: Synchronize membership and shop operations**

In `respond_shop_membership`, when accepting an active membership, copy the shop `maps_url`, `latitude`, and `longitude` into the worker profile. In `leave_shop`, clear those three profile fields after removing the membership. In `create_shop`, update the owner profile location from the newly created shop so a worker who later creates a shop receives the new location. Keep each update in the same `security definer` transaction as the existing operation.

- [ ] **Step 4: Add SQL regression coverage**

Create `supabase/tests/barber_workplace_location.sql` covering owner publish rejection without location, worker publish success without location, accepted membership copying the shop location, leaving clearing it, and shop creation supplying the owner profile location. Follow the existing versioned SQL test style and run the local Supabase test command documented in `supabase/tests/README.md`.

- [ ] **Step 5: Update the client publish payload**

Include `workplace_type: draft.workplaceType` in `publishBarberProfile`. Regenerate `src/types/database.ts` with `npm run db:types` if the linked database is available; otherwise record the command as an environment-dependent verification gap and keep the migration type-safe with local casts matching existing patterns.

### Task 4: Verify the complete flow locally

**Files:**
- Modify: none unless verification finds a regression

- [ ] **Step 1: Run focused checks**

Run:

```sh
npm test -- --runInBand __tests__/onboardingValidation.test.ts __tests__/barberOnboardingScreen.test.tsx
npm run typecheck
```

Expected result: both Jest suites pass and TypeScript exits with code 0.

- [ ] **Step 2: Start the requested web server**

Run `npm run web -- --port 8081`, using another port only if 8081 is already occupied. Verify an HTTP response from `http://localhost:8081/onboarding` and keep the server running for browser inspection.

- [ ] **Step 3: Inspect all five screens**

At narrow and wide viewports, verify no clipping or overlap, Arabic RTL alignment, the owner/worker branch, URL-only owner location, service add/remove, weekly hours expansion, review edit links, loading/error states, and the final publish CTA. Record any runtime or native-only behavior that cannot be proven on web.

- [ ] **Step 4: Run the broader regression checks**

Run `npm run test:ci` and `npx expo config --type public`. Report any Supabase-linked or Android-device checks that were not available locally.

