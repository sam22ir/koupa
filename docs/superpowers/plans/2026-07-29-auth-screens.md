# Koupa Auth Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild sign-in and permanent-role selection with the approved compact Teal Stage and focused floating-card design while preserving auth and legal behavior.

**Architecture:** Add one reusable `AuthShell` for safe-area, compact header, back navigation, scrolling, and overlapping card composition. Keep credential and role behavior screen-local, enhance shared `Field` and `Button` primitives only for approved capabilities, and cover interactions with React Native Testing Library.

**Tech Stack:** Expo Router, React Native 0.86, React 19, TypeScript, Jest Expo, `@testing-library/react-native`, `test-renderer`.

**Dirty-worktree rule:** The target auth and shared UI files already contain the approved frontend reset as uncommitted work. Do not create implementation commits that would claim those pre-existing changes; edit narrowly, keep unrelated changes intact, and verify the scoped diff instead.

---

## File Map

- Create `src/components/ui/AuthShell.tsx`: shared compact Teal Stage and floating card.
- Modify `src/components/ui/index.ts`: export `AuthShell`.
- Modify `src/components/ui/Field.tsx`: focus styling, accessibility defaults, and optional trailing accessory.
- Modify `src/components/ui/Button.tsx`: stable accessibility state and pressed feedback.
- Modify `src/i18n/ar.ts`: approved auth subtitles, descriptions, and control labels.
- Modify `app/(auth)/sign-in.tsx`: approved sign-in hierarchy and interactions.
- Modify `app/(auth)/role.tsx`: approved role hierarchy and legal states.
- Create `__tests__/authScreens.test.tsx`: interaction coverage.
- Modify `package.json` and `package-lock.json`: UI-test dependencies.

### Task 1: Install the UI Test Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `__tests__/authScreens.test.tsx`

- [ ] **Step 1: Install compatible dependencies**

```bash
npm install --save-dev @testing-library/react-native@14.0.1 test-renderer@1.2.0
```

Expected: npm exits 0 and both packages appear in `devDependencies`.

- [ ] **Step 2: Write the failing shell test**

Create `__tests__/authScreens.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

const replace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

import { AuthShell } from '../src/components/ui/AuthShell';

it('renders the auth stage and returns to welcome', () => {
  const screen = render(
    <AuthShell title="تسجيل الدخول" subtitle="ادخل إلى حسابك لإدارة مواعيدك.">
      <Text>form content</Text>
    </AuthShell>,
  );
  expect(screen.getByText('form content')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
  expect(replace).toHaveBeenCalledWith('/(auth)/welcome');
});
```

- [ ] **Step 3: Verify RED**

```bash
npm test -- --runInBand __tests__/authScreens.test.tsx
```

Expected: FAIL because `AuthShell.tsx` does not exist.

### Task 2: Build Shared Auth Presentation

**Files:**
- Create: `src/components/ui/AuthShell.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `src/components/ui/Field.tsx`
- Modify: `src/components/ui/Button.tsx`
- Test: `__tests__/authScreens.test.tsx`

- [ ] **Step 1: Implement and export `AuthShell`**

Use this exact public API:

```tsx
type Props = {
  readonly title: string;
  readonly subtitle?: string;
  readonly backHref?: '/(auth)/welcome';
  readonly children: ReactNode;
};
```

Render a `ScrollView` with safe-area padding, teal header, light-tinted `BrandLogo`, 48x48 `arrow-forward` back button calling `router.replace(backHref)`, gold rule, RTL title/subtitle, and elevated `Card`. Use `marginTop: -space[7]`, `marginHorizontal: layout.screenPaddingX`, and `keyboardShouldPersistTaps="handled"`. Export it from `src/components/ui/index.ts`.

- [ ] **Step 2: Verify shell GREEN**

Run the focused test. Expected: PASS.

- [ ] **Step 3: Write failing shared-control test**

```tsx
it('exposes field and disabled button state', () => {
  const screen = render(
    <>
      <Field label="كلمة المرور" accessory={<Text>عرض</Text>} />
      <Button label="متابعة" disabled />
    </>,
  );
  expect(screen.getByLabelText('كلمة المرور')).toBeTruthy();
  expect(screen.getByText('عرض')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'متابعة' })).toBeDisabled();
});
```

Expected: FAIL because `Field` lacks `accessory` and `Button` lacks explicit accessibility state.

- [ ] **Step 4: Enhance shared controls**

Add `accessory?: ReactNode` to `Field`, wrap input and accessory in one bordered row, default `accessibilityLabel` to `label`, track focus for a teal border, and retain inline errors. Set Button accessibility state to `{ disabled: Boolean(isDisabled), busy: Boolean(loading) }` and pressed style to `transform: [{ scale: 0.98 }]`.

- [ ] **Step 5: Verify shared-control GREEN**

Run the focused test. Expected: PASS.

### Task 3: Redesign Sign-In

**Files:**
- Modify: `src/i18n/ar.ts`
- Modify: `app/(auth)/sign-in.tsx`
- Test: `__tests__/authScreens.test.tsx`

- [ ] **Step 1: Write failing sign-in interaction tests**

Mock `useAppSession` and `useLocalSearchParams`, render `SignInScreen`, then verify:

```tsx
expect(screen.getByText('ادخل إلى حسابك لإدارة مواعيدك.')).toBeTruthy();
fireEvent.press(screen.getByRole('tab', { name: 'هاتف' }));
expect(screen.getByLabelText('رقم الهاتف')).toBeTruthy();
fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
fireEvent.press(screen.getByRole('button', { name: 'إظهار كلمة المرور' }));
expect(screen.getByLabelText('كلمة المرور').props.secureTextEntry).toBe(false);
fireEvent.press(screen.getByText('إنشاء حساب'));
expect(push).toHaveBeenCalledWith('/(auth)/role');
```

Expected: FAIL against the current screen.

- [ ] **Step 2: Add approved translations**

```ts
signInSubtitle: 'ادخل إلى حسابك لإدارة مواعيدك.',
noAccount: 'ليس لديك حساب؟',
showPassword: 'إظهار كلمة المرور',
hidePassword: 'إخفاء كلمة المرور',
roleHint: 'اختيارك دائم ولا يمكن تغييره لاحقاً.',
roleCustomerDescription: 'احجز مواعيدك وتابعها من مكان واحد.',
roleBarberDescription: 'أدر خدماتك وجدولك ومواعيد زبائنك.',
```

- [ ] **Step 3: Implement sign-in**

Use `AuthShell`. Add `passwordVisible`, `identifierError`, and `passwordError`. Render method controls as tabs with selected state, clear identifier and its error when switching method, pass local errors to `Field`, add a 48x48 password visibility accessory using `eye-outline`/`eye-off-outline`, and keep provider errors in `ErrorBanner` above the primary action. Preserve current submit, Google, recovery, collision, and success routes. Add the quiet `إنشاء حساب` link to `/(auth)/role`.

- [ ] **Step 4: Verify sign-in GREEN**

Run the focused test. Expected: PASS.

### Task 4: Redesign Role Selection

**Files:**
- Modify: `app/(auth)/role.tsx`
- Test: `__tests__/authScreens.test.tsx`

- [ ] **Step 1: Write failing role interaction tests**

Mock active Terms and Privacy documents, render `RoleScreen`, wait for content, and verify:

```tsx
expect(screen.getByText('اختيارك دائم ولا يمكن تغييره لاحقاً.')).toBeTruthy();
expect(screen.getByRole('radio', { name: /زبون/ })).toBeChecked();
expect(screen.getByRole('button', { name: 'متابعة' })).toBeDisabled();
fireEvent.press(screen.getByRole('radio', { name: /حلاق/ }));
fireEvent.press(screen.getByRole('checkbox', { name: 'أوافق على الشروط وسياسة الخصوصية' }));
expect(screen.getByRole('button', { name: 'متابعة' })).toBeEnabled();
```

Also assert Terms opens its URL without changing checkbox state. Expected: FAIL against the current screen.

- [ ] **Step 2: Implement role selection**

Use `AuthShell`. While legal documents load, render fixed-height skeleton blocks inside the card. Render two vertical role Pressables with `accessibilityRole="radio"`, selected state, title, and description. Render a separate 48px checkbox target with checked state and separate Terms/Privacy links so links never toggle consent. Set `canContinue = accepted && legalReady && !busy`; preserve `setPendingRole(role)` and navigation to `/(auth)/sign-up` with role params.

- [ ] **Step 3: Verify role GREEN**

Run the focused test. Expected: PASS.

### Task 5: Verify the Implementation

**Files:**
- Verify all files listed above.

- [ ] **Step 1: Run static and focused checks**

```bash
npm run typecheck
npm test -- --runInBand __tests__/authScreens.test.tsx __tests__/welcome.test.ts __tests__/auth.test.ts
npx eslint 'app/(auth)/sign-in.tsx' 'app/(auth)/role.tsx' src/components/ui/AuthShell.tsx src/components/ui/Field.tsx src/components/ui/Button.tsx src/i18n/ar.ts __tests__/authScreens.test.tsx
```

Expected: all commands exit 0.

- [ ] **Step 2: Run repository tests**

```bash
npm test -- --runInBand
```

Expected: new tests pass; report pre-existing failures without changing unrelated modules.

- [ ] **Step 3: Verify browser acceptance**

At `340x646` and `412x915`, inspect `/sign-in` and `/role`. Confirm no clipping, reachable scrolling, continuity with `/welcome`, password visibility, method switching, role selection, consent enablement, legal links, and existing destinations.

- [ ] **Step 4: Review the diff**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and no unrelated user changes reverted or staged.
