import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LocationPicker } from '@/src/components/location/LocationPicker';
import { BackButton } from '@/src/components/ui/BackButton';
import { CustomerStageHeader } from '@/src/components/ui/CustomerStageHeader';
import { Button } from '@/src/components/ui/Button';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Field } from '@/src/components/ui/Field';
import { Screen } from '@/src/components/ui/Screen';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { emptyShopDraft, validateShopDraft, type ShopDraft } from '@/src/shops';
import { layout, space } from '@/src/theme';
import { goBackFromShopScreen, returnToShopTab } from '@/src/navigation/barberShopNavigation';

function validationMessage(error: string): string | null {
  if (error === 'locationRequired') return t('errors.LOCATION_REQUIRED');
  if (error === 'validation') return t('errors.VALIDATION');
  return null;
}

export default function ShopCreateScreen() {
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
    if (await shops.createShop(draft)) returnToShopTab();
  };

  return (
    <Screen scroll padded={false}>
      <CustomerStageHeader
        title={t('shopWorkspace.create')}
        context={t('auth.roleBarber')}
        trailing={<BackButton fallback="/(barber)/shop" onPress={goBackFromShopScreen} />}
      />
      <View style={styles.form}>
        <ErrorBanner error={validationMessage(validation ?? shops.error)} />
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

const styles = StyleSheet.create({
  form: { gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[8] },
});
