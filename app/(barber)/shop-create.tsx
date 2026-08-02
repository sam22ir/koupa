import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Field } from '@/src/components/ui/Field';
import { Screen, ScreenTitle } from '@/src/components/ui/Screen';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { emptyShopDraft, validateShopDraft, type ShopDraft } from '@/src/shops';
import { space } from '@/src/theme';

function validationMessage(error: string): string | null {
  if (error === 'locationRequired') return 'الموقع مطلوب';
  if (error === 'validation') return 'راجع اسم المحل وبيانات الموقع';
  return null;
}

export default function ShopCreateScreen() {
  const router = useRouter();
  const { session } = useAppSession();
  const shops = useShops(session?.user.id);
  const [draft, setDraft] = useState<ShopDraft>(emptyShopDraft);
  const [validation, setValidation] = useState<string | null>(null);

  const update = (patch: Partial<ShopDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setValidation(null);
  };

  const create = async () => {
    const error = validateShopDraft(draft);
    if (error) {
      setValidation(error);
      return;
    }
    if (await shops.createShop(draft)) router.replace('/(barber)/shop' as never);
  };

  return (
    <Screen scroll>
      <ScreenTitle title={t('shopWorkspace.create')} subtitle="أنشئ مساحة واضحة لإدارة حلاقينك" />
      <ErrorBanner error={validationMessage(validation ?? shops.error)} />
      <View style={styles.form}>
        <Field label="اسم المحل" value={draft.name} onChangeText={(name) => update({ name })} />
        <Field label="نبذة (اختياري)" value={draft.bio} onChangeText={(bio) => update({ bio })} multiline />
        <Field label="رابط الخرائط" value={draft.mapsUrl} onChangeText={(mapsUrl) => update({ mapsUrl })} autoCapitalize="none" keyboardType="url" />
        <Field label="خط العرض (اختياري)" value={draft.latitude} onChangeText={(latitude) => update({ latitude })} keyboardType="decimal-pad" />
        <Field label="خط الطول (اختياري)" value={draft.longitude} onChangeText={(longitude) => update({ longitude })} keyboardType="decimal-pad" />
        <Button label={t('shopWorkspace.create')} onPress={() => void create()} loading={shops.saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: space[4] }, });
