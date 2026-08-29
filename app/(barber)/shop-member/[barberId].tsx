import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { BackButton } from '@/src/components/ui/BackButton';
import { Screen } from '@/src/components/ui/Screen';
import { ShopMemberWorkspace } from '@/src/features/barber-shop/ShopMemberWorkspace';
import { useManagedBarberSettings } from '@/src/hooks/useManagedBarberSettings';
import { useUnsavedWorkspaceLeaveGuard } from '@/src/hooks/useUnsavedWorkspaceLeaveGuard';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';

export default function ShopMemberScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barberId?: string | string[] }>();
  const barberId = Array.isArray(params.barberId) ? params.barberId[0] : params.barberId;
  const { session } = useAppSession();
  const shops = useShops(session?.user.id);
  const { getActivity, ownedShop } = shops;
  const ownedShopId = ownedShop?.id;
  const member = shops.state.members.find((item) => item.barber_id === barberId);
  const settings = useManagedBarberSettings({
    barberId: member?.barber_id,
    ownerId: session?.user.id,
  });
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof shops.getActivity>>>([]);
  const { requestLeave, requestAction } = useUnsavedWorkspaceLeaveGuard({
    dirty: settings.dirty,
    reset: settings.reset,
    save: settings.save,
  });

  useEffect(() => {
    if (!ownedShopId) return;
    void getActivity(ownedShopId).then((items) => setActivity(items ?? []));
  }, [getActivity, ownedShopId]);

  if (!member) {
    return (
      <Screen scroll>
        <BackButton fallback="/(barber)/shop" />
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
      onBack={() => requestLeave(() => router.dismissTo('/(barber)/shop'))}
      onRemove={() => requestAction(() => {
        void shops.removeMember(member.id).then((removed) => {
          if (removed) router.dismissTo('/(barber)/shop');
        });
      })}
    />
  );
}
