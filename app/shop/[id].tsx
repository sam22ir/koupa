import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ShopProfile } from '@/src/shops';
import { Avatar, CustomerStageHeader, EmptyState, ErrorBanner, Screen } from '@/src/components/ui';
import { useShops } from '@/src/hooks/useShops';
import { t } from '@/src/i18n';
import { colors, radii, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

export default function ShopProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shops = useShops();
  const [shop, setShop] = useState<ShopProfile | null>(null);

  useEffect(() => {
    if (!id) return;
    void shops.getShop(id).then(setShop);
  }, [id, shops]);

  return (
    <Screen padded={false} scroll>
      <CustomerStageHeader title={shop?.name ?? t('find.shops')} subtitle={shop?.owner_name} />
      <View style={styles.body}>
      <ErrorBanner error={shops.error || null} />
      {shop ? (
        <>
          {shop.bio ? <Text style={styles.bio}>{shop.bio}</Text> : null}
          <Text style={styles.section}>{t('booking.chooseBarber')}</Text>
          {shop.barbers.length === 0 ? <EmptyState title={t('find.empty')} /> : null}
          {shop.barbers.map((barber) => (
            <Pressable
              key={barber.id}
              style={styles.row}
              onPress={() => router.push(`/book/${barber.id}`)}
            >
              <Avatar initials={initialsFromName(barber.name)} />
              <View style={styles.copy}>
                <Text style={styles.name}>{barber.name}</Text>
                <Text style={styles.meta}>{t('booking.book')}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space[5],
    gap: space[3],
  },
  bio: {
    ...typography.body,
    textAlign: 'right',
    color: colors.textMuted,
  },
  section: {
    ...typography.titleSm,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    gap: space[3],
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space[4],
    marginBottom: space[3],
  },
  copy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  name: {
    ...typography.bodyStrong,
  },
  meta: {
    ...typography.caption,
    color: colors.primary,
  },
});
