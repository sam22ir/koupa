import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Icon } from '@/src/components/ui';
import type { BarberDraft } from '@/src/data/onboarding';
import { colors, space, typography } from '@/src/theme';

export function OnboardingReview({
  draft,
  onEdit,
}: {
  readonly draft: BarberDraft;
  readonly onEdit: (step: 0 | 1 | 2 | 3) => void;
}) {
  const location = draft.workplaceType === 'worker'
    ? 'سيُضاف عند الانضمام إلى محل'
    : [draft.city, draft.neighborhood].filter(Boolean).join(' · ') || 'لم يكتمل بعد';
  const serviceCount = draft.services.filter((service) => service.name.trim()).length;
  const openDays = draft.schedules.filter((day) => day.enabled).length;

  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>راجع معلوماتك قبل أن يراك الزبائن.</Text>
      <Summary label="الملف" value={draft.name || 'لم يكتمل بعد'} onPress={() => onEdit(0)} />
      <Summary label="الموقع" value={location} onPress={() => onEdit(1)} />
      <Summary label="الخدمات" value={`${serviceCount} خدمات`} onPress={() => onEdit(2)} />
      <Summary label="الحجوزات" value={`${openDays} أيام عمل · فاصل ${draft.intervalMinutes} دقيقة`} onPress={() => onEdit(3)} />
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
      <Pressable accessibilityRole="button" accessibilityLabel={`تعديل ${label}`} onPress={onPress} style={styles.edit}>
        <Text style={styles.editText}>تعديل</Text>
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
