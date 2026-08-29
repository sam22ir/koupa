# Exception Inline Calendar Design

## Goal

Replace the manual `تاريخ الاستثناء` text field in the schedule-exception sheet with a compact Arabic RTL inline calendar.

## Interaction

- Opening `إضافة استثناء` shows the current Algeria month and selects today by default.
- Users choose a date by tapping a day cell; the editor retains the existing `YYYY-MM-DD` value.
- Past days are visibly disabled and do not respond to taps.
- Previous-month navigation is disabled when the displayed month is the current Algeria month; later months remain available.
- The selected day is teal. Existing exception dates remain selectable so an existing record can still be edited, while duplicate validation stays authoritative at save time.
- `مغلق طوال اليوم`, `ساعات خاصة`, time inputs, notes, delete, cancel, and save behavior remain unchanged.

## Architecture

Create `InlineDateCalendar` under `src/features/barber-schedule/` as a controlled component with `value`, `minimumDate`, and `onChange`. It produces date-only strings using `Africa/Algiers` calendar semantics and never parses or persists local timestamp values. `ExceptionEditor` supplies today as the minimum date and removes the manual `Field` input.

## Verification

- Unit test month-grid generation, disabled past dates, current-month previous navigation, and `YYYY-MM-DD` selection.
- Extend the schedule screen test to open a new exception, select a future date, and save it into the draft.
- Run focused Jest, ESLint, TypeScript, and HTTP preview checks.
