import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Icon } from '@/src/components/ui';
import type { BarberDraft } from '@/src/data/onboarding';
import { colors, space, typography } from '@/src/theme';
import { t } from '@/src/i18n';

export function OnboardingReview({
  draft,
  onEdit,
}: {
  readonly draft: BarberDraft;
  readonly onEdit: (step: 0 | 1 | 2 | 3) => void;
}) {
  const location = draft.workplaceType === 'worker'
    ? t('onboarding.addedWhenJoining')
    : [draft.city, draft.neighborhood].filter(Boolean).join(' · ') || t('onboarding.notComplete');
  const serviceCount = draft.services.filter((service) => service.name.trim()).length;
  const openDays = draft.schedules.filter((day) => day.enabled).length;

  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>{t('onboarding.reviewIntro')}</Text>
      <Summary label={t('onboarding.profileSummary')} value={draft.name || t('onboarding.notComplete')} onPress={() => onEdit(0)} />
      {draft.workplaceType === 'owner' ? (
        <Summary label={t('onboarding.shopName')} value={draft.shopName || t('onboarding.notComplete')} onPress={() => onEdit(0)} />
      ) : null}
      <Summary label={t('onboarding.locationSummary')} value={location} onPress={() => onEdit(1)} />
      <Summary label={t('onboarding.servicesSummary')} value={`${serviceCount} ${t('onboarding.servicesCount')}`} onPress={() => onEdit(2)} />
      <Summary label={t('onboarding.appointmentsSummary')} value={`${openDays} ${t('onboarding.workDays')} · ${t('onboarding.interval')} ${draft.intervalMinutes} ${t('common.minutes')}`} onPress={() => onEdit(3)} />
    </View>
  );
}

function Summary({ label, value, onPress }: { readonly label: string; readonly value: string; readonly onPress: () => void }) {
  return (
    <Card style={styles.summary}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t('onboarding.edit')} ${label}`} onPress={onPress} style={styles.edit}>
        <Text style={styles.editText}>{t('onboarding.edit')}</Text>
        <Icon name="chevron-back" size={16} color={colors.primary} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  intro: { ...typography.caption, textAlign: 'right' },
  summary: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  copy: { flex: 1, gap: space[1], alignItems: 'flex-end' },
  label: { ...typography.caption, textAlign: 'right' },
  value: { ...typography.bodyStrong, textAlign: 'right' },
  edit: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  editText: { ...typography.label, color: colors.primary },
});
