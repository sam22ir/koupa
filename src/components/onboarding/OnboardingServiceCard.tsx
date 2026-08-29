import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Field, Icon } from '@/src/components/ui';
import type { ServiceDraft } from '@/src/data/onboarding';
import { t } from '@/src/i18n';
import { colors, space, typography } from '@/src/theme';

export function OnboardingServiceCard({
  service,
  canRemove,
  onChange,
  onRemove,
}: {
  readonly service: ServiceDraft;
  readonly canRemove: boolean;
  readonly onChange: (next: ServiceDraft) => void;
  readonly onRemove: () => void;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{service.name || t('onboarding.newService')}</Text>
        {canRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.removeService')}
            onPress={onRemove}
            style={styles.removeButton}
          >
            <Icon name="trash-outline" size={19} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>
      <Field
        label={t('onboarding.serviceName')}
        value={service.name}
        onChangeText={(name) => onChange({ ...service, name })}
      />
      <View style={styles.row}>
        <Field
          label={t('onboarding.servicePrice')}
          value={service.priceDzd}
          keyboardType="number-pad"
          onChangeText={(priceDzd) => onChange({ ...service, priceDzd })}
          style={styles.compactInput}
        />
        <Field
          label={t('onboarding.serviceDuration')}
          value={service.durationMinutes}
          keyboardType="number-pad"
          onChangeText={(durationMinutes) => onChange({ ...service, durationMinutes })}
          style={styles.compactInput}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...typography.bodyStrong, textAlign: 'right' },
  removeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row-reverse', gap: space[2] },
  compactInput: { fontSize: 14 },
});
