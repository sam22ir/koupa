# First-Install Welcome Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `/welcome` into a first-install introduction that explains Koupa before sending a user into role selection or sign-in.

**Architecture:** Keep `/welcome` as the unauthenticated entry route and keep `/role` as the existing role-and-legal gate. The welcome screen will own only introduction copy, benefit rows, and navigation actions; no role state or signup consent moves into the intro. New Arabic strings live in the existing `auth` localization group.

**Tech Stack:** Expo SDK 57, Expo Router, React Native, TypeScript, Jest, React Native Testing Library, existing theme and icon primitives.

---

### Task 1: Lock the first-install contract with tests

**Files:**
- Modify: `__tests__/welcomeScreen.test.tsx`
- Modify: `__tests__/welcome.test.ts`

- [ ] **Step 1: Add failing expectations for the intro screen**

Assert that the welcome screen renders the new title, explanatory body, three benefits, and `ابدأ الآن`, and no longer renders role radio controls. Keep the existing sign-in route assertion.

- [ ] **Step 2: Run the focused tests and verify the expected failure**

Run: `npm test -- --runInBand __tests__/welcomeScreen.test.tsx __tests__/welcome.test.ts`

Expected: FAIL because the current screen still renders role cards and the old title/action contract.

### Task 2: Add Arabic introduction copy

**Files:**
- Modify: `src/i18n/ar.ts`

- [ ] **Step 1: Add the approved first-install strings**

Add these keys under `auth`:

```ts
welcomeTitle: 'مرحبا بك في كوپا',
welcomeBody: 'اكتشف حلاقين قريبين منك، احجز وقتك، وتابع مواعيدك من مكان واحد.',
welcomeBenefitDiscover: 'اكتشف حلاقين مناسبين لك',
welcomeBenefitDiscoverBody: 'ابحث حسب المكان والوقت والخدمة.',
welcomeBenefitBook: 'احجز دون مكالمات',
welcomeBenefitBookBody: 'اختر خدمتك ووقتك قبل الزيارة.',
welcomeBenefitFollow: 'تابع مواعيدك بسهولة',
welcomeBenefitFollowBody: 'كل حجوزاتك وتفاصيلها في مكان واحد.',
welcomeStart: 'ابدأ الآن',
```

### Task 3: Recompose the welcome screen

**Files:**
- Modify: `app/(auth)/welcome.tsx`

- [ ] **Step 1: Remove role state and role-card rendering**

Delete the `UserRole` state and `WelcomeRoleCards` import. The screen should call `router.push({ pathname: '/(auth)/role', params: {} })` for `welcomeStart` and keep `router.push({ pathname: '/(auth)/sign-in', params: {} })` for the existing-account action.

- [ ] **Step 2: Render the introduction hierarchy**

Keep the free-standing large mark and teal stage, then render the new title, body, and three icon-plus-copy benefit rows using the existing `Icon` and theme tokens. Keep the existing legal notice unchanged.

- [ ] **Step 3: Keep the layout mobile-safe**

Use a single-column scroll view, preserve the 392×646 CTA visibility, and keep all entrance animations limited to opacity/transform with existing cleanup and reduced-motion behavior.

### Task 4: Verify the new flow

**Files:**
- No additional source files.

- [ ] **Step 1: Run focused welcome tests**

Run: `npm test -- --runInBand __tests__/welcomeScreen.test.tsx __tests__/welcome.test.ts`

Expected: all focused tests pass, including intro copy, no role radios, start navigation, and sign-in navigation.

- [ ] **Step 2: Run TypeScript validation**

Run: `npm run typecheck`

Expected: exit code 0 with no diagnostics.

- [ ] **Step 3: Verify the live route**

At `http://127.0.0.1:8081/welcome` in a 392×646 browser viewport, confirm the intro copy and benefits render, role radios are absent, the primary CTA is fully visible, and the sign-in action remains present.

- [ ] **Step 4: Check whitespace and scoped status**

Run: `git diff --check -- 'app/(auth)/welcome.tsx' 'src/i18n/ar.ts' '__tests__/welcomeScreen.test.tsx' '__tests__/welcome.test.ts'`

Expected: no whitespace errors.
