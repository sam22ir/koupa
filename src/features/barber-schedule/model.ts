import {
  bookingWindowOptions,
  minimumNoticeOptions,
  type BarberSettingsDraft,
  type ManagedServiceDraft,
} from '@/src/barberSettings';
import type { DayScheduleDraft } from '@/src/data/onboarding';
import { isValidTime } from '@/src/barberSettings';
import type { ScheduleException } from '@/src/scheduleExceptions';

export const bookingIntervalOptions = [5, 10, 15, 30] as const;

export interface ManagedScheduleExceptionDraft extends Omit<ScheduleException, 'id'> {
  readonly id?: string;
}

export interface BarberScheduleWorkspaceDraft {
  readonly settings: BarberSettingsDraft;
  readonly exceptions: readonly ManagedScheduleExceptionDraft[];
}

export interface WorkspaceValidationErrors {
  readonly schedule?:
    | 'workingDayRequired'
    | 'invalidHours'
    | 'invalidBreak'
    | 'breakOutsideHours'
    | 'overlappingBreaks';
  readonly exceptions?: 'invalidDate' | 'invalidHours' | 'duplicateDate';
  readonly services?: 'activeServiceRequired' | 'invalidService';
  readonly rules?: 'invalidInterval' | 'invalidWindow' | 'invalidNotice';
}

function cloneSchedule(schedule: DayScheduleDraft): DayScheduleDraft {
  return {
    ...schedule,
    breaks: schedule.breaks.map((item) => ({ ...item })),
  };
}

export function cloneWorkspaceDraft(
  workspace: BarberScheduleWorkspaceDraft,
): BarberScheduleWorkspaceDraft {
  return {
    settings: {
      ...workspace.settings,
      schedules: workspace.settings.schedules.map(cloneSchedule),
      services: workspace.settings.services.map((service) => ({ ...service })),
    },
    exceptions: workspace.exceptions.map((item) => ({ ...item })),
  };
}

function comparableWorkspace(workspace: BarberScheduleWorkspaceDraft): BarberScheduleWorkspaceDraft {
  return {
    ...cloneWorkspaceDraft(workspace),
    exceptions: [...workspace.exceptions]
      .map((item) => ({ ...item }))
      .sort((left, right) => left.exceptionDate.localeCompare(right.exceptionDate)),
  };
}

export function isWorkspaceDirty(
  loaded: BarberScheduleWorkspaceDraft,
  draft: BarberScheduleWorkspaceDraft,
): boolean {
  return JSON.stringify(comparableWorkspace(loaded)) !== JSON.stringify(comparableWorkspace(draft));
}

function isValidDate(value: string): boolean {
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function validateSchedules(settings: BarberSettingsDraft): WorkspaceValidationErrors['schedule'] {
  const enabled = settings.schedules.filter((schedule) => schedule.enabled);
  if (!enabled.length) return 'workingDayRequired';

  for (const schedule of enabled) {
    if (
      !isValidTime(schedule.startsAt) ||
      !isValidTime(schedule.endsAt) ||
      schedule.startsAt >= schedule.endsAt
    ) {
      return 'invalidHours';
    }

    const breaks = [...schedule.breaks].sort((left, right) =>
      left.startsAt.localeCompare(right.startsAt),
    );
    for (let index = 0; index < breaks.length; index += 1) {
      const item = breaks[index];
      if (
        !isValidTime(item.startsAt) ||
        !isValidTime(item.endsAt) ||
        item.startsAt >= item.endsAt
      ) {
        return 'invalidBreak';
      }
      if (item.startsAt < schedule.startsAt || item.endsAt > schedule.endsAt) {
        return 'breakOutsideHours';
      }
      if (index > 0 && breaks[index - 1].endsAt > item.startsAt) {
        return 'overlappingBreaks';
      }
    }
  }
  return undefined;
}

function validateExceptions(
  exceptions: readonly ManagedScheduleExceptionDraft[],
): WorkspaceValidationErrors['exceptions'] {
  const dates = new Set<string>();
  for (const item of exceptions) {
    if (!isValidDate(item.exceptionDate)) return 'invalidDate';
    if (dates.has(item.exceptionDate)) return 'duplicateDate';
    dates.add(item.exceptionDate);
    if (
      !item.isClosed &&
      (!isValidTime(item.startsAt) ||
        !isValidTime(item.endsAt) ||
        item.startsAt >= item.endsAt)
    ) {
      return 'invalidHours';
    }
  }
  return undefined;
}

function validateServices(
  services: readonly ManagedServiceDraft[],
): WorkspaceValidationErrors['services'] {
  const active = services.filter((service) => service.isActive !== false);
  if (!active.length) return 'activeServiceRequired';
  if (
    active.some((service) => {
      const price = Number(service.priceDzd);
      const duration = Number(service.durationMinutes);
      return (
        service.name.trim().length < 2 ||
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isInteger(duration) ||
        duration < 5 ||
        duration > 720 ||
        duration % 5 !== 0
      );
    })
  ) {
    return 'invalidService';
  }
  return undefined;
}

function validateRules(settings: BarberSettingsDraft): WorkspaceValidationErrors['rules'] {
  if (!bookingIntervalOptions.includes(settings.intervalMinutes as never)) return 'invalidInterval';
  if (!bookingWindowOptions.includes(Number(settings.bookingWindowDays) as never)) return 'invalidWindow';
  if (!minimumNoticeOptions.includes(settings.minimumNoticeMinutes as never)) return 'invalidNotice';
  return undefined;
}

export function validateWorkspace(
  workspace: BarberScheduleWorkspaceDraft,
): WorkspaceValidationErrors {
  const errors: {
    schedule?: WorkspaceValidationErrors['schedule'];
    exceptions?: WorkspaceValidationErrors['exceptions'];
    services?: WorkspaceValidationErrors['services'];
    rules?: WorkspaceValidationErrors['rules'];
  } = {};
  errors.schedule = validateSchedules(workspace.settings);
  errors.exceptions = validateExceptions(workspace.exceptions);
  errors.services = validateServices(workspace.settings.services);
  errors.rules = validateRules(workspace.settings);
  if (!errors.schedule) delete errors.schedule;
  if (!errors.exceptions) delete errors.exceptions;
  if (!errors.services) delete errors.services;
  if (!errors.rules) delete errors.rules;
  return errors;
}

export function copyDaySchedule(
  source: DayScheduleDraft,
  targetDays: readonly number[],
  schedules: readonly DayScheduleDraft[],
): readonly DayScheduleDraft[] {
  const targets = new Set(targetDays);
  return schedules.map((schedule) =>
    targets.has(schedule.dayOfWeek)
      ? {
          ...schedule,
          enabled: source.enabled,
          startsAt: source.startsAt,
          endsAt: source.endsAt,
          breaks: source.breaks.map((item) => ({ ...item })),
        }
      : schedule,
  );
}

export function upsertWorkspaceException(
  exceptions: readonly ManagedScheduleExceptionDraft[],
  value: ManagedScheduleExceptionDraft,
): readonly ManagedScheduleExceptionDraft[] {
  const matchIndex = exceptions.findIndex((item) =>
    value.id ? item.id === value.id : !item.id && item.exceptionDate === value.exceptionDate,
  );
  if (matchIndex < 0) return [...exceptions, { ...value }];
  return exceptions.map((item, index) => (index === matchIndex ? { ...value } : item));
}

export function removeWorkspaceException(
  exceptions: readonly ManagedScheduleExceptionDraft[],
  idOrDate: string,
): readonly ManagedScheduleExceptionDraft[] {
  return exceptions.filter(
    (item) => item.id !== idOrDate && item.exceptionDate !== idOrDate,
  );
}

export function updateWorkspaceService(
  services: readonly ManagedServiceDraft[],
  index: number,
  patch: Partial<ManagedServiceDraft>,
): readonly ManagedServiceDraft[] {
  return services.map((service, serviceIndex) =>
    serviceIndex === index ? { ...service, ...patch } : service,
  );
}
