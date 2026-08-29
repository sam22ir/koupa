export type UserRole = 'customer' | 'barber';
export interface ServiceDraft { readonly name: string; readonly priceDzd: string; readonly durationMinutes: string; }
export interface BreakDraft { readonly startsAt: string; readonly endsAt: string; }
export interface DayScheduleDraft { readonly dayOfWeek: number; readonly enabled: boolean; readonly startsAt: string; readonly endsAt: string; readonly breaks: readonly BreakDraft[]; }
export interface BarberDraft { readonly name: string; readonly phone: string; readonly bio: string; readonly workplaceType: 'owner' | 'worker'; readonly shopName: string; readonly shopBio: string; readonly city: string; readonly neighborhood: string; readonly mapsUrl: string; readonly latitude: string; readonly longitude: string; readonly services: readonly ServiceDraft[]; readonly schedules: readonly DayScheduleDraft[]; readonly intervalMinutes: number; }

export type SchedulePreset = 'weekdays918' | 'longDays' | 'default';

/** Sunday-start week: 0=الأحد … 6=السبت */
export const defaultSchedules: readonly DayScheduleDraft[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  enabled: dayOfWeek < 6,
  startsAt: '09:00',
  endsAt: '18:00',
  breaks: [],
}));

export const defaultBarberDraft: BarberDraft = {
  name: '',
  phone: '',
  bio: '',
  workplaceType: 'owner',
  shopName: '',
  shopBio: '',
  city: '',
  neighborhood: '',
  mapsUrl: '',
  latitude: '',
  longitude: '',
  services: [{ name: '', priceDzd: '', durationMinutes: '30' }],
  schedules: defaultSchedules,
  intervalMinutes: 30,
};

export const serviceExamples = [
  { name: 'حلاقة شعر', priceDzd: '500', durationMinutes: '30' },
  { name: 'ذقن', priceDzd: '300', durationMinutes: '15' },
] as const satisfies readonly ServiceDraft[];

function buildOpenDays(openDays: ReadonlySet<number>, startsAt: string, endsAt: string): readonly DayScheduleDraft[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    enabled: openDays.has(dayOfWeek),
    startsAt,
    endsAt,
    breaks: [],
  }));
}

/** Sun–Thu open; Fri/Sat closed. */
const weekdaySet = new Set([0, 1, 2, 3, 4]);

export function applySchedulePreset(kind: SchedulePreset): readonly DayScheduleDraft[] {
  switch (kind) {
    case 'weekdays918':
      return buildOpenDays(weekdaySet, '09:00', '18:00');
    case 'longDays':
      return buildOpenDays(weekdaySet, '09:00', '21:00');
    case 'default':
      return defaultSchedules;
  }
}

export function applyServiceExample(
  services: readonly ServiceDraft[],
  example: ServiceDraft,
): readonly ServiceDraft[] {
  if (services.length === 0) return [example];
  const [first, ...rest] = services;
  if (first.name.trim() || first.priceDzd.trim()) {
    return [...services, example];
  }
  return [example, ...rest];
}
