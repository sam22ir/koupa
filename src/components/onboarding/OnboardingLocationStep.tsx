import { StyleSheet, Text, View } from 'react-native';

import { Card, Field } from '@/src/components/ui';
import type { BarberDraft } from '@/src/data/onboarding';
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
        <Text style={styles.workerTitle}>نكمل ملفك أولا</Text>
        <Text style={styles.workerBody}>
          لا تحتاج لإضافة موقع الآن. بعد نشر ملفك، ابحث عن محلك واطلب الانضمام إليه من قسم المحل.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.helperBlock}>
        <Text style={styles.helperTitle}>موقع محلك</Text>
        <Text style={styles.helperBody}>ألصق رابط Google Maps لموقع محلك حتى يصل الزبائن إليك بسهولة.</Text>
      </View>
      <Field label="المدينة" value={draft.city} onChangeText={(city) => onChange({ city })} />
      <Field label="الحي" value={draft.neighborhood} onChangeText={(neighborhood) => onChange({ neighborhood })} />
      <Field
        label="رابط Google Maps"
        value={draft.mapsUrl}
        onChangeText={(mapsUrl) => onChange({ mapsUrl })}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://maps.app.goo.gl/..."
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
