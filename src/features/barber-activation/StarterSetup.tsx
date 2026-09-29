import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui';
import {
  serviceExamples,
  type DayScheduleDraft,
  type SchedulePreset,
  type ServiceDraft,
} from '@/src/data/onboarding';
import { t } from '@/src/i18n';
import { colors, radii, space, typography } from '@/src/theme';

/**
 * One-tap starting points for a barber who has not saved services or hours yet.
 * Every tap changes the draft, which brings up the Save bar, so accepting a
 * suggestion is never a dead end.
 */
export function StarterSetup({
  needsServices,
  needsHours,
  onAddService,
  onApplyWeek,
}: {
  readonly needsServices: boolean;
  readonly needsHours: boolean;
  readonly onAddService: (example: ServiceDraft) => void;
  readonly onApplyWeek: (preset: Exclude<SchedulePreset, 'default'>) => void;
}) {
  if (!needsServices && !needsHours) return null;

  return (
    <View style={styles.card} testID="starter-setup">
      <Text style={styles.title}>{t('barber.starterTitle')}</Text>
      <Text style={styles.body}>{t('barber.starterBody')}</Text>

      {needsHours ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t('barber.starterHours')}</Text>
          <View style={styles.row}>
            <Button
              testID="starter-week-918"
              label={t('barber.starterWeek918')}
              variant="secondary"
              onPress={() => onApplyWeek('weekdays918')}
              style={styles.flex}
            />
            <Button
              testID="starter-week-921"
              label={t('barber.starterWeek921')}
              variant="secondary"
              onPress={() => onApplyWeek('longDays')}
              style={styles.flex}
            />
          </View>
        </View>
      ) : null}

      {needsServices ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t('barber.starterServices')}</Text>
          <View style={styles.row}>
            {serviceExamples.map((example) => (
              <Button
                key={example.name}
                testID={`starter-service-${example.name}`}
                label={`${example.name} · ${example.priceDzd} ${t('common.dzd')}`}
                variant="secondary"
                onPress={() => onAddService(example)}
                style={styles.flex}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.hint}>{t('barber.starterSaveHint')}</Text>
    </View>
  );
}

/** Convenience for callers that only hold the schedule draft. */
export type StarterWeek = readonly DayScheduleDraft[];

const styles = StyleSheet.create({
  card: {
    gap: space[3],
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    padding: space[4],
  },
  title: { ...typography.bodyStrong, color: colors.primary, textAlign: 'right' },
  body: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  group: { gap: space[2] },
  groupLabel: { ...typography.label, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  flex: { flexGrow: 1, flexBasis: '45%' },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
});
