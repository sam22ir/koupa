import type { BarberSettingsDraft } from '../src/barberSettings';
import { emptyBarberSettingsDraft } from '../src/barberSettings';
import {
  cloneWorkspaceDraft,
  copyDaySchedule,
  isWorkspaceDirty,
  removeWorkspaceException,
  updateWorkspaceService,
  upsertWorkspaceException,
  validateWorkspace,
  type BarberScheduleWorkspaceDraft,
} from '../src/features/barber-schedule/model';

function validSettings(): BarberSettingsDraft {
  return {
    ...emptyBarberSettingsDraft,
    intervalMinutes: 15,
    minimumNoticeMinutes: 30,
    services: [
      {
        id: 'service-1',
        name: 'حلاقة شعر',
        priceDzd: '800',
        durationMinutes: '30',
        isActive: true,
      },
    ],
  };
}

function validWorkspace(): BarberScheduleWorkspaceDraft {
  return {
    settings: validSettings(),
    exceptions: [
      {
        id: 'exception-1',
        exceptionDate: '2026-08-01',
        isClosed: true,
        startsAt: '09:00',
        endsAt: '17:00',
        note: '',
      },
    ],
  };
}

describe('barber Schedule workspace model', () => {
  it('clones nested drafts and ignores exception insertion order when checking dirty state', () => {
    const loaded = validWorkspace();
    const clone = cloneWorkspaceDraft(loaded);

    expect(clone).not.toBe(loaded);
    expect(clone.settings.schedules[0]).not.toBe(loaded.settings.schedules[0]);
    expect(isWorkspaceDirty(loaded, clone)).toBe(false);

    const second = {
      exceptionDate: '2026-08-02',
      isClosed: false,
      startsAt: '10:00',
      endsAt: '14:00',
      note: 'ساعات خاصة',
    };
    const ordered = { ...clone, exceptions: [...clone.exceptions, second] };
    const reversed = { ...clone, exceptions: [second, ...clone.exceptions] };
    expect(isWorkspaceDirty(ordered, reversed)).toBe(false);
    expect(
      isWorkspaceDirty(loaded, {
        ...clone,
        settings: { ...clone.settings, intervalMinutes: 30 },
      }),
    ).toBe(true);
  });

  it('accepts a complete valid workspace', () => {
    expect(validateWorkspace(validWorkspace())).toEqual({});
  });

  it('rejects overlapping breaks', () => {
    const workspace = validWorkspace();
    const schedules = workspace.settings.schedules.map((schedule, index) =>
      index === 0
        ? {
            ...schedule,
            enabled: true,
            startsAt: '09:00',
            endsAt: '18:00',
            breaks: [
              { startsAt: '12:00', endsAt: '13:00' },
              { startsAt: '12:30', endsAt: '14:00' },
            ],
          }
        : schedule,
    );

    expect(
      validateWorkspace({
        ...workspace,
        settings: { ...workspace.settings, schedules },
      }),
    ).toMatchObject({ schedule: 'overlappingBreaks' });
  });

  it('rejects breaks outside working hours', () => {
    const workspace = validWorkspace();
    const schedules = workspace.settings.schedules.map((schedule, index) =>
      index === 0
        ? {
            ...schedule,
            enabled: true,
            startsAt: '09:00',
            endsAt: '18:00',
            breaks: [{ startsAt: '08:30', endsAt: '09:30' }],
          }
        : schedule,
    );

    expect(
      validateWorkspace({
        ...workspace,
        settings: { ...workspace.settings, schedules },
      }),
    ).toMatchObject({ schedule: 'breakOutsideHours' });
  });

  it('rejects duplicate exception dates and invalid special hours', () => {
    const workspace = validWorkspace();
    const duplicate = { ...workspace.exceptions[0], id: 'exception-2' };
    expect(validateWorkspace({ ...workspace, exceptions: [...workspace.exceptions, duplicate] })).toMatchObject({
      exceptions: 'duplicateDate',
    });

    const invalidHours = {
      ...workspace.exceptions[0],
      isClosed: false,
      startsAt: '17:00',
      endsAt: '09:00',
    };
    expect(validateWorkspace({ ...workspace, exceptions: [invalidHours] })).toMatchObject({
      exceptions: 'invalidHours',
    });
  });

  it('requires an active valid service and supported booking rules', () => {
    const workspace = validWorkspace();
    expect(
      validateWorkspace({
        ...workspace,
        settings: {
          ...workspace.settings,
          services: workspace.settings.services.map((service) => ({ ...service, isActive: false })),
        },
      }),
    ).toMatchObject({ services: 'activeServiceRequired' });

    expect(
      validateWorkspace({
        ...workspace,
        settings: { ...workspace.settings, intervalMinutes: 20 },
      }),
    ).toMatchObject({ rules: 'invalidInterval' });
  });

  it('copies a day schedule to selected days without sharing break references', () => {
    const schedules = validWorkspace().settings.schedules;
    const source = {
      ...schedules[0],
      enabled: true,
      startsAt: '10:00',
      endsAt: '19:00',
      breaks: [{ startsAt: '14:00', endsAt: '14:30' }],
    };
    const copied = copyDaySchedule(source, [1, 3], schedules);

    expect(copied[1]).toMatchObject({
      dayOfWeek: 1,
      enabled: true,
      startsAt: '10:00',
      endsAt: '19:00',
      breaks: [{ startsAt: '14:00', endsAt: '14:30' }],
    });
    expect(copied[3]).toMatchObject({ startsAt: '10:00' });
    expect(copied[1].breaks).not.toBe(source.breaks);
  });

  it('upserts and removes exceptions and updates services immutably', () => {
    const workspace = validWorkspace();
    const added = upsertWorkspaceException(workspace.exceptions, {
      exceptionDate: '2026-08-03',
      isClosed: true,
      startsAt: '09:00',
      endsAt: '17:00',
      note: '',
    });
    expect(added).toHaveLength(2);

    const edited = upsertWorkspaceException(added, {
      ...added[0],
      note: 'عطلة',
    });
    expect(edited.find((item) => item.id === 'exception-1')?.note).toBe('عطلة');
    expect(removeWorkspaceException(edited, 'exception-1')).toHaveLength(1);

    const services = updateWorkspaceService(workspace.settings.services, 0, { isActive: false });
    expect(services[0].isActive).toBe(false);
    expect(workspace.settings.services[0].isActive).toBe(true);
  });
});
