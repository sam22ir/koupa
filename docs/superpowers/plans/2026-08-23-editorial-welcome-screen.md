# Editorial Welcome Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the approved warm editorial concept to Koupa's Arabic RTL welcome screen without changing role-selection or navigation behavior.

**Architecture:** Keep the existing `WelcomeScreen` and `WelcomeRoleCards` boundaries. The screen owns the editorial teal header, amber geometric accent, hierarchy, and action spacing; the role-card component owns the new stacked selection rows. Existing theme tokens, bundled logo, fonts, and button primitives remain the source of truth.

**Tech Stack:** Expo SDK 57, Expo Router, React Native, TypeScript, Jest, React Native Testing Library, Expo web.

---

### Task 1: Lock the visual contract with a focused test

**Files:**
- Modify: `__tests__/welcomeScreen.test.tsx`
- Read: `src/theme/colors.ts`, `src/i18n/ar.ts`

- [ ] **Step 1: Add a failing editorial hierarchy assertion**

Assert that the screen exposes the editorial stage and eyebrow copy, and that the role selector uses a vertical layout:

```tsx
it('renders the approved editorial welcome hierarchy', async () => {
  const view = await render(<WelcomeScreen />);

  expect(view.getByTestId('welcome-editorial-stage')).toBeTruthy();
  expect(view.getByTestId('welcome-eyebrow')).toHaveTextContent('احجز وقتك بوضوح');
  expect(view.getByTestId('welcome-role-cards')).toHaveStyle({ flexDirection: 'column' });
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing visual contract**

Run: `npm test -- --runInBand __tests__/welcomeScreen.test.tsx`

Expected: FAIL because the new test IDs and vertical role-card style do not exist yet; existing navigation and copy tests should remain green.

### Task 2: Implement the editorial welcome composition

**Files:**
- Modify: `app/(auth)/welcome.tsx`
- Modify: `src/components/welcome/WelcomeRoleCards.tsx`

- [ ] **Step 1: Add the editorial header contract**

Add `testID="welcome-editorial-stage"`, the existing `brandTagline` as an eyebrow, and the approved stage geometry. Keep the existing `openRole` callback and animation values unchanged.

- [ ] **Step 2: Replace the horizontal role grid with stacked editorial rows**

Keep the same `customer`/`barber` order, `radio` accessibility roles, test IDs, and `onChange` callback. Render each option as a full-width horizontal row with the icon, copy, and selected check indicator.

- [ ] **Step 3: Rework the sheet hierarchy and action spacing**

Use the existing theme tokens for the warm off-white canvas, compact editorial intro, stacked cards, and full-width actions. Remove the rounded sheet overlap so the header-to-canvas transition matches the approved concept without changing button labels or route behavior.

### Task 3: Verify behavior and rendered output

**Files:**
- No additional source files.

- [ ] **Step 1: Run the focused welcome tests**

Run: `npm test -- --runInBand __tests__/welcomeScreen.test.tsx __tests__/welcome.test.ts`

Expected: all tests pass, including role preselection and both navigation paths.

- [ ] **Step 2: Run static validation**

Run: `npm run typecheck`

Expected: TypeScript exits 0 with no diagnostics.

- [ ] **Step 3: Verify the live Expo web route**

With the existing server on port 8081, request `http://127.0.0.1:8081/welcome` and inspect a 390×844 browser screenshot. Confirm the Arabic text fits, role rows do not overlap, the CTA remains visible, and the stage geometry is clipped inside the header.

- [ ] **Step 4: Review the diff**

Run: `git diff --check -- app/(auth)/welcome.tsx src/components/welcome/WelcomeRoleCards.tsx __tests__/welcomeScreen.test.tsx`

Expected: no whitespace errors and no unrelated file edits from this task.
