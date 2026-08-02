import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { Card } from '@/src/components/ui/Card';
import { Chip } from '@/src/components/ui/Chip';
import { Icon } from '@/src/components/ui/Icon';
import { t } from '@/src/i18n';
import type { ShopSummary } from '@/src/shops';
import { colors, space, typography } from '@/src/theme';

type Props = {
  readonly shop: ShopSummary;
  readonly onPress: (shop: ShopSummary) => void;
};

function initials(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'م';
}

export function ShopSearchResult({ shop, onPress }: Props) {
  const location = [shop.neighborhood, shop.city].filter(Boolean).join('، ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shop.name}
      onPress={() => onPress(shop)}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <Avatar initials={initials(shop.name)} size={48} />
        <View style={styles.copy}>
          <Text style={styles.name}>{shop.name}</Text>
          {location ? (
            <View style={styles.location}><Icon name="location-outline" size={15} color={colors.textMuted} /><Text style={styles.meta}>{location}</Text></View>
          ) : null}
          <Text style={styles.owner}>{shop.owner_name}</Text>
        </View>
        <View style={styles.tail}>
          <Chip label={`${shop.average_rating.toFixed(1)} · ${t('shopWorkspace.rating')}`} tone="accent" />
          <Icon name="chevron-back" size={18} color={colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], padding: space[3] },
  pressed: { opacity: 0.78 },
  copy: { flex: 1, gap: space[1], alignItems: 'flex-end' },
  name: { ...typography.bodyStrong, textAlign: 'right' },
  owner: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  location: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  tail: { alignItems: 'flex-end', gap: space[2] },
});
