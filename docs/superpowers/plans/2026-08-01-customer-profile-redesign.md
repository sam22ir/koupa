# Customer Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or **superpowers:executing-plans** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clear inline customer-name editor and reorganize the customer profile page into grouped, scannable account actions without changing login-phone identity or existing deletion/legal behavior.

**Architecture:** Keep `app/(customer)/profile.tsx` as the screen boundary. Add a small authenticated profile update operation in `src/services/profile.ts`, then refresh the existing session profile through `useAppSession().refreshProfile()` after a successful name update. Reuse `Field`, `Icon`, `Button`, `Card`, `CustomerStageHeader`, `LegalSupportLinks`, and `DeleteAccountButton`; do not introduce a new navigation or settings abstraction.

**Tech Stack:** Expo Router, React Native, Supabase typed client, TypeScript, Jest, React Native Testing Library, existing Koupa RTL theme.

---

### Task 1: Add the profile-name update service

**Files:**
- Modify: `src/services/profile.ts`
- Create: `__tests__/profileService.test.ts`

- [ ] **Step 1: Write service tests for the authenticated name update**

Mock `@/lib/supabase` with an update chain whose `update()` returns an object supporting `.eq()`. Cover the success payload and the Supabase-error conversion:

```ts
it('updates only the authenticated profile name', async () => {
  const eq = jest.fn(async () => ({ error: null }));
  mockUpdate.mockReturnValue({ eq });

  await updateProfileName('user-1', 'ليلى بن عمر');

  expect(mockUpdate).toHaveBeenCalledWith({ name: 'ليلى بن عمر' });
  expect(eq).toHaveBeenCalledWith('id', 'user-1');
});

it('converts update failures to the app error contract', async () => {
  const eq = jest.fn(async () => ({ error: { code: '42501', message: 'denied' } }));
  mockUpdate.mockReturnValue({ eq });

  await expect(updateProfileName('user-1', 'ليلى')).rejects.toMatchObject({ code: expect.any(String) });
});
```

- [ ] **Step 2: Run the focused service test and confirm it fails**

Run: `npm test -- --runInBand __tests__/profileService.test.ts`

Expected: FAIL because `updateProfileName` is not exported yet.

- [ ] **Step 3: Implement the minimal scoped update**

Add this operation beside `loadProfile` in `src/services/profile.ts`:

```ts
export async function updateProfileName(userId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId);
  if (error) throw toAppError(error);
}
```

Do not update `phone`, `role`, `is_published`, or Supabase Auth from this operation.

- [ ] **Step 4: Run the service test and typecheck**

Run: `npm test -- --runInBand __tests__/profileService.test.ts && npm run typecheck`

Expected: the focused service tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit the service boundary**

```bash
git add src/services/profile.ts __tests__/profileService.test.ts
git commit -m "Add customer profile name update"
```

### Task 2: Add profile-screen behavior tests

**Files:**
- Modify: `__tests__/profileLegalLinks.test.tsx` or create `__tests__/customerProfileScreen.test.tsx`

- [ ] **Step 1: Add deterministic customer-profile fixtures and mocks**

Mock `expo-router`, `SessionProvider`, `useAccountLifecycle`, and `profileService.updateProfileName`. The session fixture must expose `refreshProfile`, `profile`, `legalDocuments`, and `signOut`. Render `CustomerProfileScreen` with the existing React Native Testing Library helpers.

- [ ] **Step 2: Write the read-only and edit-state tests**

Cover these exact assertions:

```ts
expect(screen.getByRole('button', { name: 'تعديل الملف الشخصي' })).toBeTruthy();
expect(screen.getByDisplayValue('0555000001')).toBeDisabled();
await fireEvent.press(screen.getByRole('button', { name: 'تعديل الملف الشخصي' }));
expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeTruthy();
expect(screen.getByRole('button', { name: 'إلغاء' })).toBeTruthy();
expect(screen.getByDisplayValue('0555000001')).toBeDisabled();
```

Also assert that cancel restores the read-only name and that an empty trimmed name shows the validation error without calling `updateProfileName`.

- [ ] **Step 3: Add save success and failure tests**

For success, enter `  ليلى الجديدة  `, press save, assert `updateProfileName('user-1', 'ليلى الجديدة')`, `refreshProfile`, success copy, and the return to read-only mode. For failure, reject the mock, assert an inline error, and assert the editor remains open with the entered name.

- [ ] **Step 4: Add grouped-action and regression assertions**

Assert the four section labels, notifications navigation, canonical legal links, logout behavior, delete-account button, and that the login phone is never passed to `updateProfileName`. Keep the existing legal-link assertions intact.

- [ ] **Step 5: Run the new focused screen tests and confirm the expected failures**

Run: `npm test -- --runInBand __tests__/customerProfileScreen.test.tsx __tests__/profileLegalLinks.test.tsx`

Expected: the new edit/grouping assertions fail against the current flat profile screen.

### Task 3: Implement the inline editor and grouped profile screen

**Files:**
- Modify: `app/(customer)/profile.tsx`
- Modify: `src/i18n/ar.ts`
- Modify: `src/components/ui/Field.tsx` only if disabled-field styling needs an existing reusable prop; do not change the shared component unless the profile test demonstrates a concrete gap.

- [ ] **Step 1: Add localized profile copy**

Add copy for the edit action, login-phone label, save/cancel actions, save success, empty-name validation, and the four section labels under `profile` in `src/i18n/ar.ts`. Keep `كوپا` spelling and Arabic RTL copy consistent with the existing dictionary.

- [ ] **Step 2: Add editor state and save handler**

In `CustomerProfileScreen`, read `session` and `refreshProfile` from `useAppSession()`. Add `editing`, `draftName`, `saving`, and a local save feedback/error state. Initialize `draftName` from `profile?.name`, and implement:

```ts
const saveName = async () => {
  const name = draftName.trim();
  if (!name) {
    setError(new Error(t('profile.nameRequired')));
    return;
  }
  if (!session?.user.id) return;
  setSaving(true);
  setError(null);
  try {
    await profileService.updateProfileName(session.user.id, name);
    await refreshProfile();
    setEditing(false);
    setSuccess(t('profile.saved'));
  } catch (caught) {
    setError(caught);
  } finally {
    setSaving(false);
  }
};
```

Cancel must restore `draftName` from the current profile and close the editor without writing data. The phone value remains display-only and disabled.

- [ ] **Step 3: Replace the identity card with read-only/edit variants**

Keep the current `CustomerStageHeader`. In the identity `Card`, render the existing avatar and a read-only name/phone row plus an edit icon/button when `editing` is false. When `editing` is true, render `Field` for the name, a disabled `Field` for the login phone, and an RTL action row with primary save and secondary cancel controls. Keep the card content flexible for long Arabic names.

- [ ] **Step 4: Render grouped action rows**

Create a small local `ActionRow` component in the profile screen for icon, label, chevron, press handler, and pressed state. Render `الحساب`, `المساعدة والخصوصية`, `الجلسة`, and `منطقة حساسة` in that order. Keep `LegalSupportLinks` inside the resources surface, keep notifications routed to `/notifications`, keep logout behavior unchanged, and keep `DeleteAccountButton` at the bottom with danger styling.

- [ ] **Step 5: Run focused tests and fix only behavior/style regressions**

Run: `npm test -- --runInBand __tests__/customerProfileScreen.test.tsx __tests__/profileLegalLinks.test.tsx`

Expected: all profile tests pass, including disabled phone, save/cancel/error/success, grouped actions, legal links, logout, and deletion.

### Task 4: Verify the complete change and local profile route

**Files:**
- Test: `__tests__/customerProfileScreen.test.tsx`, `__tests__/profileLegalLinks.test.tsx`, `__tests__/profileService.test.ts`

- [ ] **Step 1: Run formatting checks, typecheck, and focused lint**

Run:

```bash
npm run typecheck
npx eslint app/'(customer)'/profile.tsx src/services/profile.ts __tests__/customerProfileScreen.test.tsx __tests__/profileLegalLinks.test.tsx __tests__/profileService.test.ts
```

Expected: all commands exit 0.

- [ ] **Step 2: Run the full Jest suite**

Run: `npm test -- --runInBand`

Expected: no regressions in the existing customer, barber, auth, legal, booking, and account tests.

- [ ] **Step 3: Verify the live local route**

Run:

```bash
curl -sS -o /dev/null -w '8081 %{http_code}\n' http://localhost:8081/profile
curl -sS -o /dev/null -w '8082 %{http_code}\n' http://localhost:8082/profile
```

Expected: both routes return `200`.

- [ ] **Step 4: Commit the profile redesign**

```bash
git add app/'(customer)'/profile.tsx src/services/profile.ts src/i18n/ar.ts \
  __tests__/customerProfileScreen.test.tsx __tests__/profileLegalLinks.test.tsx \
  __tests__/profileService.test.ts
git commit -m "Redesign customer profile settings"
```
