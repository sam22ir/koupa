import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Icon } from '@/src/components/ui/Icon';
import { colors, radii, space, typography } from '@/src/theme';

const weekdays = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] as const;
const algeriaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Algiers',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const monthFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: 'Africa/Algiers',
  month: 'long',
  year: 'numeric',
});
const dayFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: 'Africa/Algiers',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

export function calendarToday(now = new Date()): string {
  const parts = algeriaDateFormatter.formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function calendarMonthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function addCalendarMonths(monthStart: string, amount: number): string {
  const date = parseDate(monthStart);
  date.setUTCMonth(date.getUTCMonth() + amount, 1);
  return date.toISOString().slice(0, 10);
}

export function isCalendarDateDisabled(date: string, minimumDate: string): boolean {
  return date < minimumDate;
}

function monthDays(monthStart: string): readonly string[] {
  const start = parseDate(monthStart);
  const offset = start.getUTCDay();
  const first = new Date(start);
  first.setUTCDate(first.getUTCDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(first.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function InlineDateCalendar({
  value,
  minimumDate,
  onChange,
}: {
  readonly value: string;
  readonly minimumDate: string;
  readonly onChange: (value: string) => void;
}) {
  const rawSelectedDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  // A stale value from an existing exception may already be in the past;
  // surface the first selectable day instead of a permanently disabled one.
  const selectedDate = rawSelectedDate && !isCalendarDateDisabled(rawSelectedDate, minimumDate)
    ? rawSelectedDate
    : minimumDate;
  const [month, setMonth] = useState(calendarMonthStart(selectedDate));
  const days = monthDays(month);
  const canGoBack = month > calendarMonthStart(minimumDate);

  return (
    <View testID="exception-inline-calendar" style={styles.calendar} accessibilityRole="none">
      <View style={styles.monthHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الشهر السابق"
          accessibilityState={{ disabled: !canGoBack }}
          disabled={!canGoBack}
          onPress={() => setMonth(addCalendarMonths(month, -1))}
          style={[styles.monthAction, !canGoBack && styles.monthActionDisabled]}
        >
          <Icon name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthFormatter.format(parseDate(month))}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الشهر التالي"
          onPress={() => setMonth(addCalendarMonths(month, 1))}
          style={styles.monthAction}
        >
          <Icon name="chevron-back" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
      </View>

      <View style={styles.grid}>
        {days.map((date) => {
          const inMonth = date.slice(0, 7) === month.slice(0, 7);
          const disabled = !inMonth || isCalendarDateDisabled(date, minimumDate);
          const selected = date === selectedDate;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={dayFormatter.format(parseDate(date))}
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              onPress={() => onChange(date)}
              style={[styles.day, selected && styles.daySelected, disabled && styles.dayDisabled]}
            >
              <Text style={[styles.dayText, selected && styles.dayTextSelected, disabled && styles.dayTextDisabled]}>
                {parseDate(date).getUTCDate().toLocaleString('ar-DZ')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { gap: space[2], borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: space[3] },
  monthHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { ...typography.label, textAlign: 'center' },
  monthAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.primarySoft },
  monthActionDisabled: { opacity: 0.45, backgroundColor: colors.surfaceMuted },
  weekdays: { flexDirection: 'row-reverse' },
  weekday: { flex: 1, ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  day: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
  daySelected: { backgroundColor: colors.primary },
  dayDisabled: { opacity: 0.28 },
  dayText: { ...typography.label, textAlign: 'center' },
  dayTextSelected: { color: colors.onPrimary },
  dayTextDisabled: { color: colors.textMuted },
});
