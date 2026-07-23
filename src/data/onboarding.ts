export type UserRole = 'customer' | 'barber';
export interface ServiceDraft { readonly name: string; readonly priceDzd: string; readonly durationMinutes: string; }
export interface BreakDraft { readonly startsAt: string; readonly endsAt: string; }
export interface DayScheduleDraft { readonly dayOfWeek: number; readonly enabled: boolean; readonly startsAt: string; readonly endsAt: string; readonly breaks: readonly BreakDraft[]; }
export interface BarberDraft { readonly name: string; readonly phone: string; readonly bio: string; readonly city: string; readonly neighborhood: string; readonly mapsUrl: string; readonly latitude: string; readonly longitude: string; readonly services: readonly ServiceDraft[]; readonly schedules: readonly DayScheduleDraft[]; readonly intervalMinutes: number; }
export const defaultSchedules: readonly DayScheduleDraft[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, enabled: dayOfWeek < 6, startsAt: '09:00', endsAt: '18:00', breaks: [] }));
export const defaultBarberDraft: BarberDraft = { name: '', phone: '', bio: '', city: '', neighborhood: '', mapsUrl: '', latitude: '', longitude: '', services: [{ name: '', priceDzd: '', durationMinutes: '30' }], schedules: defaultSchedules, intervalMinutes: 30 };
