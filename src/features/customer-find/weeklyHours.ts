export interface WeeklyHoursInput {
  readonly day_of_week: number;
  readonly starts_at: string;
  readonly ends_at: string;
}

export interface WeeklyHoursRow {
  readonly day: number;
  /** "09:00 - 18:00", or null when the barber does not work that day. */
  readonly open: string | null;
}

const hhmm = (value: string) => value.slice(0, 5);

/** Seven Sunday-first rows; days without a schedule row are closed. */
export function weeklyHoursRows(hours: readonly WeeklyHoursInput[]): WeeklyHoursRow[] {
  return Array.from({ length: 7 }, (_, day) => {
    const spans = hours
      .filter((item) => item.day_of_week === day)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((item) => `${hhmm(item.starts_at)} - ${hhmm(item.ends_at)}`);
    return { day, open: spans.length ? spans.join('، ') : null };
  });
}
