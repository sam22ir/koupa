import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { Icon } from '@/src/components/ui/Icon';
import { t } from '@/src/i18n';
import { shopActivityActionLabel } from '@/src/shops';
import { colors, space, typography } from '@/src/theme';

export interface ShopActivityItem {
  readonly id: string;
  readonly action: string;
  readonly actorName: string | null;
  readonly affectedBarberName: string | null;
  readonly createdAt: string;
}

type Props = { readonly items: readonly ShopActivityItem[] };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export function ShopActivityList({ items }: Props) {
  if (!items.length) return <Text style={styles.empty}>{t('shopWorkspace.noActivity')}</Text>;
  return (
    <Card style={styles.card}>
      {items.map((item, index) => (
        <View key={item.id} style={[styles.row, index > 0 && styles.divider]}>
          <View style={styles.iconWrap}><Icon name="pulse-outline" size={19} color={colors.primary} /></View>
          <View style={styles.copy}>
            <Text style={styles.action}>{shopActivityActionLabel(item.action)}</Text>
            <Text style={styles.meta}>
              {[item.actorName, item.affectedBarberName].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  row: { minHeight: 72, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], padding: space[3] },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'flex-end', gap: space[1] },
  action: { ...typography.bodyStrong, textAlign: 'right' },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  time: { ...typography.caption, color: colors.textMuted, textAlign: 'left', minWidth: 112 },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
});
