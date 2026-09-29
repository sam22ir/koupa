import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LocationPicker } from '@/src/components/location/LocationPicker';
import { BackButton } from '@/src/components/ui/BackButton';
import { Button } from '@/src/components/ui/Button';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Field } from '@/src/components/ui/Field';
import { Screen } from '@/src/components/ui/Screen';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { emptyShopDraft, validateShopDraft, type ShopDraft } from '@/src/shops';
import { space } from '@/src/theme';

function validationMessage(error: string): string | null {
  if (error === 'locationRequired') return t('errors.LOCATION_REQUIRED');
  if (error === 'validation') return t('errors.VALIDATION');
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
    if (await shops.createShop(draft)) router.dismissTo('/(barber)/shop');
  };

  return (
    <Screen scroll>
      <BackButton fallback="/(barber)/shop" />
      <ErrorBanner error={validationMessage(validation ?? shops.error)} />
      <View style={styles.form}>
        <Field label={t('shopWorkspace.shopNameField')} value={draft.name} onChangeText={(name) => update({ name })} />
        <Field label={t('shopWorkspace.bioField')} value={draft.bio} onChangeText={(bio) => update({ bio })} multiline />
        <Field
          label={t('shopWorkspace.mapsUrlField')}
          value={draft.mapsUrl}
          onChangeText={(mapsUrl) => update({ mapsUrl })}
          autoCapitalize="none"
          keyboardType="url"
        />
        <LocationPicker
          latitude={draft.latitude}
          longitude={draft.longitude}
          onChange={(next) => update({
            latitude: next.latitude,
            longitude: next.longitude,
            mapsUrl: next.mapsUrl,
          })}
        />
        <Button label={t('shopWorkspace.create')} onPress={() => void create()} loading={shops.saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: space[4] }, });
