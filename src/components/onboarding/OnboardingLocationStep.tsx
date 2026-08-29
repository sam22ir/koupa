import { StyleSheet, Text, View } from 'react-native';

import { LocationPicker } from '@/src/components/location/LocationPicker';
import { Card, Field } from '@/src/components/ui';
import type { BarberDraft } from '@/src/data/onboarding';
import { t } from '@/src/i18n';
import { colors, space, typography } from '@/src/theme';

export function OnboardingLocationStep({
  draft,
  onChange,
}: {
  readonly draft: BarberDraft;
  readonly onChange: (next: Partial<BarberDraft>) => void;
}) {
  if (draft.workplaceType === 'worker') {
    return (
      <Card style={styles.workerCard}>
        <Text style={styles.workerTitle}>{t('onboarding.workerLocationTitle')}</Text>
        <Text style={styles.workerBody}>{t('onboarding.workerLocationBody')}</Text>
      </Card>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.helperBlock}>
        <Text style={styles.helperTitle}>{t('onboarding.locationTitle')}</Text>
        <Text style={styles.helperBody}>{t('onboarding.locationBody')}</Text>
      </View>
      <LocationPicker
        latitude={draft.latitude}
        longitude={draft.longitude}
        onChange={(next) => onChange({
          latitude: next.latitude,
          longitude: next.longitude,
          mapsUrl: next.mapsUrl,
          city: next.city ?? draft.city,
          neighborhood: next.neighborhood ?? draft.neighborhood,
        })}
      />
      <Field label={t('onboarding.city')} value={draft.city} onChangeText={(city) => onChange({ city })} />
      <Field
        label={t('onboarding.neighborhood')}
        value={draft.neighborhood}
        onChangeText={(neighborhood) => onChange({ neighborhood })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  helperBlock: { gap: space[1], alignItems: 'flex-end' },
  helperTitle: { ...typography.bodyStrong, textAlign: 'right' },
  helperBody: { ...typography.caption, textAlign: 'right' },
  workerCard: { gap: space[2], borderColor: colors.primary, backgroundColor: colors.primarySoft },
  workerTitle: { ...typography.bodyStrong, textAlign: 'right', color: colors.primary },
  workerBody: { ...typography.body, textAlign: 'right' },
});
