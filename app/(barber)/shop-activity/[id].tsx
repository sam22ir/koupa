import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/src/components/ui/Button';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Screen, ScreenTitle } from '@/src/components/ui/Screen';
import { ShopActivityList, type ShopActivityItem } from '@/src/features/barber-shop/ShopActivityList';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';

export default function ShopActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const shopId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAppSession();
  const { error, getActivity } = useShops(session?.user.id);
  const [items, setItems] = useState<readonly ShopActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    void getActivity(shopId).then((result) => {
      if (!active) return;
      setItems(result ?? []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [getActivity, shopId]);

  return (
    <Screen scroll loading={Boolean(shopId) && loading}>
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      <ScreenTitle title={t('shopWorkspace.activity')} />
      <ErrorBanner error={error || null} />
      <ShopActivityList items={items} />
    </Screen>
  );
}
