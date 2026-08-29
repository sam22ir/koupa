# Exception Inline Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual exception-date typing with a compact RTL inline calendar that only permits today and future dates.

**Architecture:** A controlled `InlineDateCalendar` owns month navigation and date-grid rendering, emitting the existing `YYYY-MM-DD` format. `ExceptionEditor` uses it inside the existing exception sheet; schedule drafts, validation, saving, and Supabase payloads remain unchanged.

**Tech Stack:** Expo React Native, TypeScript, Jest, React Native Testing Library, IBM Plex Sans Arabic theme tokens.

---

### Task 1: Calendar Model and Component

**Files:**
- Create: `src/features/barber-schedule/InlineDateCalendar.tsx`
- Create: `__tests__/inlineDateCalendar.test.tsx`

- [ ] **Step 1: Write failing calendar tests** that assert past days are disabled, the current month cannot move backward, and selecting an enabled day returns `YYYY-MM-DD`.

```tsx
await fireEvent.press(screen.getByRole('button', { name: '15 أغسطس 2026' }));
expect(onChange).toHaveBeenCalledWith('2026-08-15');
expect(screen.getByRole('button', { name: 'السابق' })).toBeDisabled();
```

- [ ] **Step 2: Run** `npm test -- --runInBand __tests__/inlineDateCalendar.test.tsx` and confirm the missing component fails.

- [ ] **Step 3: Implement** a six-row RTL month grid with Arabic weekday labels, teal selected state, disabled past days, and forward-only month navigation from the current Algeria month.

- [ ] **Step 4: Run** `npm test -- --runInBand __tests__/inlineDateCalendar.test.tsx` and confirm it passes.

### Task 2: Exception Sheet Integration

**Files:**
- Modify: `src/features/barber-schedule/ExceptionEditor.tsx`
- Modify: `__tests__/barberScheduleScreen.test.tsx`

- [ ] **Step 1: Write a failing schedule test** that opens `إضافة استثناء`, selects a future calendar date, and saves it through the existing draft callback.

```tsx
await fireEvent.press(screen.getByRole('button', { name: 'إضافة استثناء' }));
await fireEvent.press(screen.getByRole('button', { name: '15 أغسطس 2026' }));
await fireEvent.press(screen.getByRole('button', { name: 'إضافة إلى المسودة' }));
expect(mockSetDraft).toHaveBeenCalledWith(expect.objectContaining({ exceptions: [expect.objectContaining({ exceptionDate: '2026-08-15' })] }));
```

- [ ] **Step 2: Run** `npm test -- --runInBand __tests__/barberScheduleScreen.test.tsx` and confirm it fails because the manual date field remains.

- [ ] **Step 3: Replace** the `Field` date input with `InlineDateCalendar`, derive the minimum date from `Africa/Algiers`, and keep duplicate/save validation unchanged.

- [ ] **Step 4: Run** `npm test -- --runInBand __tests__/barberScheduleScreen.test.tsx` and confirm it passes.

### Task 3: Verification

**Files:**
- Test: `__tests__/inlineDateCalendar.test.tsx`
- Test: `__tests__/barberScheduleScreen.test.tsx`

- [ ] **Step 1: Run** `npm test -- --runInBand __tests__/inlineDateCalendar.test.tsx __tests__/barberScheduleScreen.test.tsx`.
- [ ] **Step 2: Run** `npx eslint src/features/barber-schedule/InlineDateCalendar.tsx src/features/barber-schedule/ExceptionEditor.tsx __tests__/inlineDateCalendar.test.tsx __tests__/barberScheduleScreen.test.tsx`.
- [ ] **Step 3: Run** `npm run typecheck` and `curl -I http://127.0.0.1:8082/schedule`.
