import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckRow } from '@/src/components/atoms/CheckRow';
import { ChoiceChip } from '@/src/components/atoms/ChoiceChip';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { BarberNavigation } from '@/src/components/molecules/BarberNavigation';
import { ScheduleDayEditor } from '@/src/components/molecules/ScheduleDayEditor';
import { ServiceEditor } from '@/src/components/molecules/ServiceEditor';
import { Screen } from '@/src/components/organisms/Screen';
import { bookingWindowOptions, minimumNoticeOptions, type ManagedServiceDraft } from '@/src/barberSettings';
import { appointmentIntervals, copy } from '@/src/data/copy';
import type { DayScheduleDraft } from '@/src/data/onboarding';
import { useBarberSettings } from '@/src/hooks/useBarberSettings';
import { useSession } from '@/src/hooks/useSession';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function BarberSchedule() {
  const { session } = useSession();
  const { draft, setDraft, loading, saving, error, message, save } = useBarberSettings({ userId: session?.user.id });

  const updateSchedule = (index: number, schedule: DayScheduleDraft) => {
    setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => (itemIndex === index ? schedule : item)) });
  };

  const changeService = (index: number, service: ManagedServiceDraft) => {
    setDraft({ ...draft, services: draft.services.map((item, itemIndex) => (itemIndex === index ? service : item)) });
  };

  const addService = () => {
    setDraft({ ...draft, services: [...draft.services, { name: '', priceDzd: '', durationMinutes: '30', isActive: true }] });
  };

  const removeService = (index: number) => {
    setDraft({ ...draft, services: draft.services.filter((_, itemIndex) => itemIndex !== index) });
  };

  const errorText =
    error === 'invalidTime'
      ? copy.common.invalidTime
      : error === 'validation'
        ? copy.common.validation
        : error
          ? copy.auth.failed
          : '';

  return (
    <Screen footer={<BarberNavigation active="الجدول" />}>
      <Text style={styles.title}>{copy.barber.scheduleTitle}</Text>
      {loading ? (
        <Text style={styles.muted}>{copy.barber.loading}</Text>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{copy.barber.scheduleSettings}</Text>
            <CheckRow
              label={copy.barber.pauseBooking}
              checked={draft.isBookingPaused}
              onChange={(isBookingPaused) => setDraft({ ...draft, isBookingPaused })}
            />
            <Text style={styles.label}>{copy.barber.bookingWindow}</Text>
            <View style={styles.choices}>
              {bookingWindowOptions.map((days) => (
                <ChoiceChip
                  key={days}
                  label={`${days}`}
                  selected={draft.bookingWindowDays === String(days)}
                  onPress={() => setDraft({ ...draft, bookingWindowDays: String(days) })}
                />
              ))}
            </View>
            <Text style={styles.label}>{copy.barber.minimumNotice}</Text>
            <View style={styles.choices}>
              {minimumNoticeOptions.map((minutes) => (
                <ChoiceChip
                  key={minutes}
                  label={`${minutes} ${copy.barber.schedule.minutes}`}
                  selected={draft.minimumNoticeMinutes === minutes}
                  onPress={() => setDraft({ ...draft, minimumNoticeMinutes: minutes })}
                />
              ))}
            </View>
            <Text style={styles.label}>{copy.barber.schedule.interval}</Text>
            <View style={styles.choices}>
              {appointmentIntervals.map((interval) => (
                <ChoiceChip
                  key={interval}
                  label={`${interval} ${copy.barber.schedule.minutes}`}
                  selected={draft.intervalMinutes === interval}
                  onPress={() => setDraft({ ...draft, intervalMinutes: interval })}
                />
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>{copy.barber.schedule.title}</Text>
          {draft.schedules.map((schedule, index) => (
            <ScheduleDayEditor key={schedule.dayOfWeek} schedule={schedule} onChange={(next) => updateSchedule(index, next)} />
          ))}

          <Text style={styles.sectionTitle}>{copy.barber.services.title}</Text>
          {draft.services.map((service, index) => (
            <ServiceEditor
              key={service.id ?? `new-${index}`}
              service={service}
              index={index}
              removable={draft.services.length > 1}
              onChange={(next) => changeService(index, next)}
              onRemove={() => removeService(index)}
            />
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel={copy.barber.services.add} onPress={addService} style={styles.add}>
            <Text style={styles.addText}>{copy.barber.services.add}</Text>
          </Pressable>

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
          {message === 'saved' ? <Text style={styles.success}>{copy.barber.settingsSaved}</Text> : null}
          <PrimaryButton label={copy.barber.saveSettings} onPress={() => void save()} loading={saving} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.charcoal,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.label,
    textAlign: 'right',
  },
  label: { color: colors.charcoal, fontFamily: typography.fontFamily.medium, fontSize: typography.size.body, textAlign: 'right' },
  choices: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  add: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.sm,
  },
  addText: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, textAlign: 'right' },
  success: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
});
