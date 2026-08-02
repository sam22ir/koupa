# Barber Schedule Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw barber Schedule form with the approved three-tab workspace and save booking policy, weekly availability, services, and date exceptions atomically.

**Architecture:** Extend the existing settings domain with a screen-level workspace draft that owns settings plus exceptions and exposes pure validation/dirty helpers. Add a versioned Supabase RPC that invokes the existing atomic settings helper and replaces exceptions in the same transaction. Keep `useBarberSettings` as the single route facade and split the mobile UI into focused feature components under `src/features/barber-schedule/`.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native Testing Library, Jest, Supabase PostgreSQL/RPC, `@react-native-community/datetimepicker`.

---

## File Map

- Create `src/features/barber-schedule/model.ts`: workspace draft types, cloning, dirty comparison, mutation, and validation.
- Create `src/features/barber-schedule/ScheduleWorkspaceTabs.tsx`: accessible three-option segmented control.
- Create `src/features/barber-schedule/WeeklyScheduleEditor.tsx`: weekly rows, one expanded day, breaks, and copy-to-days modal.
- Create `src/features/barber-schedule/ExceptionEditor.tsx`: exception list and focused add/edit modal.
- Create `src/features/barber-schedule/ServicesEditor.tsx`: active services, focused editor, archive, and restore.
- Create `src/features/barber-schedule/BookingRulesEditor.tsx`: constrained interval, window, and notice controls.
- Create `src/features/barber-schedule/StickySaveBar.tsx`: dirty status and safe-area-aware explicit Save.
- Create `__tests__/barberScheduleWorkspace.test.ts`: pure draft and validation tests.
- Create `__tests__/barberScheduleScreen.test.tsx`: route workflow tests.
- Modify `src/services/mappers/schedule.ts`: workspace RPC payload mapping.
- Modify `src/services/barberSettings.ts`: load archived services and exceptions; call workspace RPC.
- Modify `src/hooks/useBarberSettings.ts`: loaded snapshot, dirty state, unified validation/save/reset.
- Modify `app/(barber)/schedule.tsx`: Teal Stage shell, booking control, tabs, guard, and feature composition.
- Modify `src/i18n/ar.ts`: approved Arabic copy and validation messages.
- Modify `src/types/database.ts`: generated declaration for the new RPC.
- Create `supabase/migrations/20260729000100_barber_schedule_workspace.sql`: transactional workspace RPC.
- Create `supabase/tests/barber_schedule_workspace.sql`: RPC structure, grants, validation, and rollback checks.
- Modify `package.json` and `package-lock.json`: Expo-compatible datetime picker.
- Modify `reference/KOUPA-PRODUCT-SPEC.md`: record the approved archive and atomic workspace decisions.

### Task 1: Workspace Draft Domain

**Files:**
- Create: `src/features/barber-schedule/model.ts`
- Test: `__tests__/barberScheduleWorkspace.test.ts`

- [ ] **Step 1: Write failing workspace model tests**

Create fixtures from `emptyBarberSettingsDraft` and `emptyScheduleException`, then assert:

```ts
expect(isWorkspaceDirty(loaded, cloneWorkspaceDraft(loaded))).toBe(false);
expect(isWorkspaceDirty(loaded, {
  ...cloneWorkspaceDraft(loaded),
  settings: { ...loaded.settings, intervalMinutes: 15 },
})).toBe(true);

expect(validateWorkspace(validWorkspace())).toEqual({});
expect(validateWorkspace(workspaceWithOverlappingBreaks())).toMatchObject({
  schedule: 'overlappingBreaks',
});
expect(validateWorkspace(workspaceWithBreakOutsideHours())).toMatchObject({
  schedule: 'breakOutsideHours',
});
expect(validateWorkspace(workspaceWithDuplicateExceptionDates())).toMatchObject({
  exceptions: 'duplicateDate',
});
expect(validateWorkspace(workspaceWithNoActiveServices())).toMatchObject({
  services: 'activeServiceRequired',
});

expect(copyDaySchedule(sourceDay, [1, 3], schedules)).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ dayOfWeek: 1, startsAt: sourceDay.startsAt, breaks: sourceDay.breaks }),
    expect.objectContaining({ dayOfWeek: 3, startsAt: sourceDay.startsAt, breaks: sourceDay.breaks }),
  ]),
);
```

- [ ] **Step 2: Run the model test and verify RED**

Run: `npm test -- --runInBand __tests__/barberScheduleWorkspace.test.ts`

Expected: FAIL because `src/features/barber-schedule/model.ts` does not exist.

- [ ] **Step 3: Implement the workspace model**

Define the concrete contract:

```ts
export interface ManagedScheduleExceptionDraft
  extends Omit<ScheduleException, 'id'> {
  readonly id?: string;
}

export interface BarberScheduleWorkspaceDraft {
  readonly settings: BarberSettingsDraft;
  readonly exceptions: readonly ManagedScheduleExceptionDraft[];
}

export interface WorkspaceValidationErrors {
  readonly schedule?: 'workingDayRequired' | 'invalidHours' | 'invalidBreak' | 'breakOutsideHours' | 'overlappingBreaks';
  readonly exceptions?: 'invalidDate' | 'invalidHours' | 'duplicateDate';
  readonly services?: 'activeServiceRequired' | 'invalidService';
  readonly rules?: 'invalidInterval' | 'invalidWindow' | 'invalidNotice';
}
```

Implement `cloneWorkspaceDraft`, `isWorkspaceDirty`, `validateWorkspace`, `copyDaySchedule`, `upsertWorkspaceException`, `removeWorkspaceException`, and `updateWorkspaceService`. Use sorted copies for dirty comparison so exception insertion order does not create false changes. Validate breaks after sorting by start time and reject overlaps or values outside the parent day.

- [ ] **Step 4: Run the model test and verify GREEN**

Run: `npm test -- --runInBand __tests__/barberScheduleWorkspace.test.ts`

Expected: all workspace model tests pass.

### Task 2: Transactional Workspace RPC

**Files:**
- Create: `supabase/migrations/20260729000100_barber_schedule_workspace.sql`
- Create: `supabase/tests/barber_schedule_workspace.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Write failing SQL structure and behavior checks**

Add SQL assertions that:

```sql
select to_regprocedure('public.replace_barber_workspace_settings(jsonb)') is not null;
select has_function_privilege(
  'authenticated',
  'public.replace_barber_workspace_settings(jsonb)',
  'execute'
);
select not has_function_privilege(
  'anon',
  'public.replace_barber_workspace_settings(jsonb)',
  'execute'
);
```

Within a transaction using a seeded barber JWT, call the RPC with one active service, one enabled day, and one closed exception; assert all three surfaces update. Then call it with an invalid special-hours exception and assert the service, schedule, profile, and prior exception remain unchanged after the expected exception is caught.

- [ ] **Step 2: Run SQL tests and verify RED**

Run: `supabase test db supabase/tests/barber_schedule_workspace.sql`

Expected: FAIL because the RPC does not exist. If local Docker is unavailable, record that infrastructure blocker and still run migration parsing through the linked CLI before runtime deployment.

- [ ] **Step 3: Implement the versioned RPC**

Create `public.replace_barber_workspace_settings(workspace jsonb)` as `security definer` with `search_path = public`:

```sql
declare
  actor_id uuid := auth.uid();
  item jsonb;
  exception_date_value date;
  starts_at_value time;
  ends_at_value time;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles where id = actor_id and role = 'barber'
  ) then
    raise exception 'Barber settings cannot be updated';
  end if;

  perform public.apply_barber_settings_payload(actor_id, workspace);

  if jsonb_typeof(workspace->'exceptions') is distinct from 'array' then
    raise exception 'Invalid schedule exceptions';
  end if;

  delete from public.schedule_exceptions where barber_id = actor_id;

  for item in select value from jsonb_array_elements(workspace->'exceptions') loop
    exception_date_value := (item->>'exception_date')::date;
    if exception_date_value < (now() at time zone 'Africa/Algiers')::date then
      raise exception 'Invalid schedule exception date';
    end if;

    if coalesce((item->>'is_closed')::boolean, true) then
      starts_at_value := null;
      ends_at_value := null;
    else
      starts_at_value := (item->>'starts_at')::time;
      ends_at_value := (item->>'ends_at')::time;
      if starts_at_value >= ends_at_value then
        raise exception 'Invalid schedule exception hours';
      end if;
    end if;

    insert into public.schedule_exceptions (
      barber_id, exception_date, is_closed, starts_at, ends_at, note
    ) values (
      actor_id,
      exception_date_value,
      coalesce((item->>'is_closed')::boolean, true),
      starts_at_value,
      ends_at_value,
      nullif(trim(coalesce(item->>'note', '')), '')
    );
  end loop;
end;
```

Revoke public and anon execution; grant only authenticated execution. PostgreSQL function execution remains one transaction, so exceptions roll back if `apply_barber_settings_payload` or exception validation fails.

- [ ] **Step 4: Add the generated RPC declaration**

Add:

```ts
replace_barber_workspace_settings: {
  Args: { workspace: Json };
  Returns: undefined;
};
```

to `Database['public']['Functions']`. Regenerate with `npm run db:types` when linked CLI access is available and confirm the generated signature matches.

- [ ] **Step 5: Run SQL tests and verify GREEN**

Run: `supabase test db supabase/tests/barber_schedule_workspace.sql`

Expected: structure, grant, success, and rollback assertions pass.

### Task 3: Typed Service And Hook Facade

**Files:**
- Modify: `src/services/mappers/schedule.ts`
- Modify: `src/services/barberSettings.ts`
- Modify: `src/hooks/useBarberSettings.ts`
- Test: `__tests__/scheduleMapper.test.ts`
- Test: `__tests__/barberSettings.test.ts`

- [ ] **Step 1: Write failing mapper and facade tests**

Assert that inactive service rows remain available to the barber workspace and that the RPC payload excludes inactive services from the existing settings helper while including all desired exceptions:

```ts
expect(mapWorkspaceServices(rows)).toEqual([
  expect.objectContaining({ id: 'active', isActive: true }),
  expect.objectContaining({ id: 'archived', isActive: false }),
]);

expect(toWorkspaceRpcPayload(workspace)).toMatchObject({
  services: [expect.objectContaining({ id: 'active' })],
  exceptions: [
    expect.objectContaining({ exception_date: '2026-08-01', is_closed: true }),
  ],
});
```

Mock Supabase and assert `saveBarberScheduleWorkspace` calls only `replace_barber_workspace_settings` once.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --runInBand __tests__/scheduleMapper.test.ts __tests__/barberSettings.test.ts`

Expected: FAIL because workspace mapping and service methods are absent.

- [ ] **Step 3: Implement service mapping**

Add `mapWorkspaceServices` without filtering `is_active`, and add:

```ts
export interface WorkspaceRpcPayload extends SettingsRpcPayload {
  readonly exceptions: readonly {
    readonly exception_date: string;
    readonly is_closed: boolean;
    readonly starts_at: string | null;
    readonly ends_at: string | null;
    readonly note: string | null;
  }[];
}

export function toWorkspaceRpcPayload(
  workspace: BarberScheduleWorkspaceDraft,
): WorkspaceRpcPayload {
  return {
    ...toSettingsRpcPayload(workspace.settings),
    exceptions: workspace.exceptions.map((item) => ({
      exception_date: item.exceptionDate,
      is_closed: item.isClosed,
      starts_at: item.isClosed ? null : normalizeTime(item.startsAt),
      ends_at: item.isClosed ? null : normalizeTime(item.endsAt),
      note: item.note.trim() || null,
    })),
  };
}
```

Update the barber settings query to retain both active and inactive services. Load future exceptions in the same service with `.gte('exception_date', algeriaDate())`. Add `loadBarberScheduleWorkspace(userId)` and `saveBarberScheduleWorkspace(workspace)`.

- [ ] **Step 4: Implement the unified hook state**

`useBarberSettings` owns:

```ts
loaded: BarberScheduleWorkspaceDraft | null;
draft: BarberScheduleWorkspaceDraft;
errors: WorkspaceValidationErrors;
dirty: boolean;
loading: boolean;
saving: boolean;
save(): Promise<boolean>;
reset(): void;
reload(): Promise<void>;
```

On load, deep-clone one response into `loaded` and `draft`. On save, validate before calling the service; after success, reload and clear errors. `reset` restores a clone of `loaded`. Do not call the independent exception save/delete services.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/scheduleMapper.test.ts __tests__/barberSettings.test.ts`

Expected: mapper, service, and hook-facing domain tests pass.

### Task 4: Shared Schedule Controls

**Files:**
- Create: `src/features/barber-schedule/ScheduleWorkspaceTabs.tsx`
- Create: `src/features/barber-schedule/StickySaveBar.tsx`
- Create: `src/features/barber-schedule/TimeField.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `__tests__/barberScheduleScreen.test.tsx`

- [ ] **Step 1: Install the Expo-compatible time picker**

Run: `npx expo install @react-native-community/datetimepicker`

Expected: Expo selects the SDK-compatible version and updates the package lock.

- [ ] **Step 2: Write failing control tests**

Test that tabs expose `tab` role and selected state, pressing a tab reports its key, the Save bar is disabled for an unchanged draft, and loading does not resize it. Test `TimeField` emits normalized `HH:mm` values on web input and picker changes.

- [ ] **Step 3: Implement controls**

`ScheduleWorkspaceTabs` accepts:

```ts
type WorkspaceTab = 'schedule' | 'services' | 'rules';
type Props = {
  value: WorkspaceTab;
  onChange(value: WorkspaceTab): void;
  errors: Partial<Record<WorkspaceTab, boolean>>;
};
```

Render fixed equal-width segments with Arabic labels and a text-plus-icon error marker. `StickySaveBar` uses safe-area insets and accepts `dirty`, `disabled`, `saving`, and `onSave`. `TimeField` uses `@react-native-community/datetimepicker` on Android/iOS and a validated `HH:mm` `Field` on web.

- [ ] **Step 4: Run control tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/barberScheduleScreen.test.tsx`

Expected: shared control tests pass.

### Task 5: Weekly Hours And Exceptions UI

**Files:**
- Create: `src/features/barber-schedule/WeeklyScheduleEditor.tsx`
- Create: `src/features/barber-schedule/ExceptionEditor.tsx`
- Modify: `src/i18n/ar.ts`
- Test: `__tests__/barberScheduleScreen.test.tsx`

- [ ] **Step 1: Write failing schedule interaction tests**

Cover:

```ts
fireEvent.press(screen.getByRole('button', { name: 'تعديل الأحد' }));
fireEvent.press(screen.getByRole('switch', { name: 'الأحد مفتوح' }));
expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));

fireEvent.press(screen.getByRole('button', { name: 'إضافة استراحة' }));
expect(screen.getByLabelText('بداية الاستراحة')).toBeTruthy();

fireEvent.press(screen.getByRole('button', { name: 'نسخ الأوقات' }));
fireEvent.press(screen.getByRole('checkbox', { name: 'الإثنين' }));
fireEvent.press(screen.getByRole('button', { name: 'تطبيق' }));

fireEvent.press(screen.getByRole('button', { name: 'إضافة استثناء' }));
fireEvent.press(screen.getByRole('radio', { name: 'ساعات خاصة' }));
fireEvent.press(screen.getByRole('button', { name: 'إضافة إلى المسودة' }));
```

- [ ] **Step 2: Run schedule UI tests and verify RED**

Run: `npm test -- --runInBand __tests__/barberScheduleScreen.test.tsx`

Expected: FAIL because weekly and exception editors are absent.

- [ ] **Step 3: Implement weekly schedule editor**

Render Sunday-through-Saturday rows with one expanded editor. Use `Switch`, `TimeField`, icon buttons for break removal, and a modal with day checkboxes for copy-to-days. Preserve hidden times when a day closes. Surface `WorkspaceValidationErrors.schedule` above the affected expanded content.

- [ ] **Step 4: Implement exception editor**

Render future exceptions sorted by date. Use a focused modal with date, closed/special-hours radio controls, optional note, and time fields. Add/edit/remove only updates the draft. Enforce one draft per date before closing the modal.

- [ ] **Step 5: Run schedule UI tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/barberScheduleScreen.test.tsx`

Expected: weekly hours, breaks, copy, and exception interactions pass.

### Task 6: Services And Booking Rules UI

**Files:**
- Create: `src/features/barber-schedule/ServicesEditor.tsx`
- Create: `src/features/barber-schedule/BookingRulesEditor.tsx`
- Modify: `src/i18n/ar.ts`
- Test: `__tests__/barberScheduleScreen.test.tsx`

- [ ] **Step 1: Write failing services and rules tests**

Cover active rows, editor fields, add, archive confirmation, restore, archived-section collapse, and constrained values:

```ts
fireEvent.press(screen.getByRole('button', { name: 'تعديل خدمة حلاقة شعر' }));
fireEvent.press(screen.getByRole('button', { name: 'أرشفة الخدمة' }));
expect(Alert.alert).toHaveBeenCalled();

fireEvent.press(screen.getByRole('button', { name: 'الخدمات المؤرشفة' }));
fireEvent.press(screen.getByRole('button', { name: 'استعادة خدمة حلاقة شعر' }));

fireEvent.press(screen.getByRole('tab', { name: '15 دقيقة' }));
expect(onRulesChange).toHaveBeenCalledWith(expect.objectContaining({ intervalMinutes: 15 }));
```

- [ ] **Step 2: Run services/rules tests and verify RED**

Run: `npm test -- --runInBand __tests__/barberScheduleScreen.test.tsx`

Expected: FAIL because services and rules editors are absent.

- [ ] **Step 3: Implement services editor**

Render active services as list rows with name, DZD price, and duration. The same modal handles add and edit. Archive sets `isActive: false` only after confirmation; restore sets it true. Keep archived services in a collapsed section. Do not add delete or reorder actions.

- [ ] **Step 4: Implement booking rules editor**

Use an equal-width segmented control for `bookingIntervalOptions`. Use accessible option menus or modal radio lists for `bookingWindowOptions` and `minimumNoticeOptions`. Never expose arbitrary numeric entry.

- [ ] **Step 5: Run services/rules tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/barberScheduleScreen.test.tsx`

Expected: services and constrained rule interactions pass.

### Task 7: Route Composition, Save, And Navigation Guard

**Files:**
- Modify: `app/(barber)/schedule.tsx`
- Modify: `src/i18n/ar.ts`
- Modify: `reference/KOUPA-PRODUCT-SPEC.md`
- Test: `__tests__/barberScheduleScreen.test.tsx`

- [ ] **Step 1: Write failing route workflow tests**

Mock `useBarberSettings` and cover:

- Welcome-style full white logo on the physical left.
- Positive `استقبال الحجوزات` inversion and pause confirmation.
- Tabs preserve one shared draft.
- Dirty label and sticky Save visibility.
- Save disabled for unchanged drafts and available to validate dirty drafts.
- Validation switches to the first invalid tab.
- Success clears dirty status.
- Failed Save preserves the draft.
- Navigation guard exposes Save, Discard, and Continue Editing choices.

- [ ] **Step 2: Run route test and verify RED**

Run: `npm test -- --runInBand __tests__/barberScheduleScreen.test.tsx`

Expected: FAIL against the existing long form.

- [ ] **Step 3: Implement the route shell**

Use `Screen padded={false}`, `Stage decoration="subtle"`, full tinted `BrandLogo`, positive booking control, `ScheduleWorkspaceTabs`, selected editor, and `StickySaveBar`. Keep the selected editor inside one responsive scroll surface with bottom padding equal to the Save bar plus tab bar.

Use `usePreventRemove` from React Navigation when `settings.dirty` is true. Save awaits `settings.save()` before dispatching the blocked navigation action; Discard calls `settings.reset()` and then dispatches; Continue Editing dismisses the alert.

- [ ] **Step 4: Record product decisions**

Update `reference/KOUPA-PRODUCT-SPEC.md` with concise bullets stating:

- Schedule uses weekly hours, breaks, date exceptions, services, and booking rules in one workspace.
- Service removal archives rather than deletes.
- Barber workspace saves are explicit and transactional.

- [ ] **Step 5: Run route tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/barberScheduleWorkspace.test.ts __tests__/barberScheduleScreen.test.tsx __tests__/barberSettings.test.ts __tests__/scheduleMapper.test.ts`

Expected: all Schedule workspace suites pass.

### Task 8: Final Verification

**Files:**
- Verify all files above.

- [ ] **Step 1: Run static and focused checks**

Run: `npm run typecheck`

Run: `npx eslint app/'(barber)'/schedule.tsx src/features/barber-schedule src/hooks/useBarberSettings.ts src/services/barberSettings.ts src/services/mappers/schedule.ts __tests__/barberScheduleWorkspace.test.ts __tests__/barberScheduleScreen.test.tsx`

Run: `npm test -- --runInBand __tests__/barberScheduleWorkspace.test.ts __tests__/barberScheduleScreen.test.tsx __tests__/barberSettings.test.ts __tests__/scheduleMapper.test.ts`

Expected: all commands exit 0.

- [ ] **Step 2: Run the full suite and classify baseline failures**

Run: `npm test -- --runInBand`

Expected: no new failures. If the two known `__tests__/errors.test.ts` Arabic-message expectation failures remain, report them separately without modifying unrelated error mapping.

- [ ] **Step 3: Verify web runtime**

Use `http://localhost:8082/schedule` at 342x646 and 412x915. Verify all three tabs, day expansion, break editing, exception modal, service add/edit/archive/restore, constrained rules, sticky Save, keyboard reachability, unsaved guard, success, and failure states. Confirm no horizontal overflow or control overlap.

- [ ] **Step 4: Verify database transaction in staging only after local SQL tests**

Confirm the Supabase CLI is linked to staging `zhdwaizroczkqzwrvfxf`, apply the migration to staging only, regenerate types, and run one reversible settings save with a test barber. Do not link or deploy production. Restore the test barber's original workspace payload afterward.

- [ ] **Step 5: Review scope and diff hygiene**

Run scoped `git diff --check` on changed Schedule files and inspect the diff against `docs/superpowers/specs/2026-07-29-barber-schedule-workspace-design.md`. Confirm no unrelated user-owned changes were reverted or staged.
