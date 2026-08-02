import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Screen } from '@/src/components/ui/Screen';
import { ShopMemberWorkspace } from '@/src/features/barber-shop/ShopMemberWorkspace';
import { useManagedBarberSettings } from '@/src/hooks/useManagedBarberSettings';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';

export default function ShopMemberScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barberId?: string | string[] }>();
  const barberId = Array.isArray(params.barberId) ? params.barberId[0] : params.barberId;
  const { session } = useAppSession();
  const shops = useShops(session?.user.id);
  const member = shops.state.members.find((item) => item.barber_id === barberId);
  const settings = useManagedBarberSettings({
    barberId: member?.barber_id,
    ownerId: session?.user.id,
  });
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof shops.getActivity>>>([]);

  useEffect(() => {
    if (!shops.ownedShop) return;
    void shops.getActivity(shops.ownedShop.id).then((items) => setActivity(items ?? []));
  }, [shops.ownedShop?.id]);

  if (!member) {
    return (
      <Screen scroll>
        <ErrorBanner error={shops.error || null} />
        <Text>{shops.loading ? t('common.loading') : t('shopWorkspace.noMembers')}</Text>
      </Screen>
    );
  }

  return (
    <ShopMemberWorkspace
      member={member}
      activity={activity ?? []}
      settings={settings}
      onBack={() => router.back()}
      onRemove={async () => {
        if (await shops.removeMember(member.id)) router.replace('/shop' as never);
      }}
    />
  );
}
